<script setup lang="ts">
import { useTags } from "@/layout/hooks/useTag";
import { useI18n } from "@/locales/setupI18n";
import { emitter } from "@/utils/mitt";
import { useGlobal } from "@pureadmin/utils";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
// biome-ignore lint/correctness/noUnusedImports: 内容有被使用
import backTop from "@/assets/svg/back_top.svg?component";
// biome-ignore lint/correctness/noUnusedImports: 内容有被使用
import { usePermissionStoreHook } from "@/store/modules/permission";

import { useSettingStoreHook } from "@/store/modules/settings";

const props = defineProps({
  fixedHeader: Boolean,
});

const { $t } = useI18n();
const { showModel } = useTags();

const { $storage, $config } = useGlobal<GlobalPropertiesApi>();

const keepAlive = computed(() => {
  return $config?.KeepAlive;
});

const enableSuspense = computed(() => {
  return useSettingStoreHook().enableSuspense;
});

const transitions = computed(() => {
  return (route) => {
    return route.meta.transition;
  };
});

const hideTabs = computed(() => {
  return $storage?.configure.hideTabs;
});

// 用于控制 el-backtop 的显示，避免在 SSR 或模板中直接访问 document
const showBackTop = ref(false);

/**
 * 内容区横向溢出时，让横向滚动条常显。
 *
 * 背景：列表页的 *-dc.scss 写死了 min-width（1080–1530px），
 * 窗口窄于该宽度时内容必然横向溢出 —— 这是布局的既定前提，不是 bug。
 * 但 el-scrollbar 的滚动条默认只在鼠标移入时淡入（bar 用 v-show 控制，平时是
 * inline display:none），于是用户看到的是「右边内容被切掉、且没有任何可滚提示」。
 * 内容其实可以横向滚动，只是无从得知。
 *
 * 这里只在**确实溢出**时挂 class 放出横向条；不溢出时行为完全不变，
 * 纵向条也不受影响（避免全局开 always 改变既有观感）。
 */
const hasXOverflow = ref(false);
let xObserver: ResizeObserver | undefined;
/** 上一次的容器可视宽度，用来区分「窗口变了」和「内容变了」 */
let lastWrapWidth = 0;

function syncXOverflow() {
  const wrap = document.querySelector<HTMLElement>(
    ".app-main-scrollbar > .el-scrollbar__wrap",
  );
  if (!wrap) return;
  hasXOverflow.value = wrap.scrollWidth - wrap.clientWidth > 1;

  /**
   * 容器宽度变化（窗口 resize / 开关 DevTools / 侧栏收展）时把横向滚动位置归零。
   *
   * ⚠ 这是「开 F12 再关掉，内容就错位」的真因：浏览器只在可滚距离归零时才自动重置
   * scrollLeft。而这些页面写死了 min-width（1080–1530px），当窗口宽度处于
   * 「比 DevTools 打开时宽、但仍不足以容纳 侧栏 + min-width」的区间时（约 1280~1500），
   * 变宽后内容**依然溢出**，于是窄屏时留下的 scrollLeft 被原样保留 ——
   * 整块内容向左偏移，表现为 banner 左边缘被切、二级菜单文字被切掉左半。
   *
   * 只在宽度真的变了时归零：内容自身变化（换页、展开筛选）不重置，
   * 否则会打断用户正在进行的横向浏览。
   */
  if (wrap.clientWidth !== lastWrapWidth) {
    lastWrapWidth = wrap.clientWidth;
    if (wrap.scrollLeft !== 0) wrap.scrollLeft = 0;
  }
}

onMounted(() => {
  showBackTop.value = !!document?.querySelector?.(
    ".app-main .el-scrollbar__wrap",
  );
  emitter.on("tagViewsShowModel", (key) => {
    showModel.value = key;
  });

  // 容器（窗口 resize）和内容（换页/展开筛选）两侧都要盯，任一变化都会改变溢出与否
  const wrap = document.querySelector<HTMLElement>(
    ".app-main-scrollbar > .el-scrollbar__wrap",
  );
  const view = wrap?.querySelector<HTMLElement>(".el-scrollbar__view");
  if (wrap && typeof ResizeObserver !== "undefined") {
    xObserver = new ResizeObserver(() => syncXOverflow());
    xObserver.observe(wrap);
    if (view) xObserver.observe(view);
  }
  syncXOverflow();
});

onBeforeUnmount(() => {
  emitter.off("tagViewsShowModel");
  xObserver?.disconnect();
  xObserver = undefined;
});

const getMenuName = (key: any) => {
  let title = $t(key);
  // 如果title是 menus. 表示没有国际化,开头的就截取后面的值
  if (title.startsWith("menus.")) {
    title = title.substring(6);
  }
  return title;
};
</script>

<template>
  <section :class="[props.fixedHeader ? 'app-main' : 'app-main-nofixed-header']">
    <router-view>
      <template #default="{ Component, route }">
        <div class="app-main-container">
          <div class="app-main-card">
            <el-scrollbar
              v-if="props.fixedHeader"
              class="app-main-scrollbar"
              :class="{ 'has-x-overflow': hasXOverflow }"
            >
              <!-- 设计师要求删除，防止后续加回来，所以注释掉 -->
              <!-- <div v-if="showModel === 'single'" class="tags-view compact-tags-view">
                <div class="page-title-button single-title">
                  {{ getMenuName(route.meta.title) }}
                </div>
                <div id="compact-tags-extra" class="compact-tags-extra"></div>
              </div> -->
              <el-backtop v-if="showBackTop" :bottom="80" :title="$t('layout.backToTop')" target=".app-main .el-scrollbar__wrap">
                <backTop />
              </el-backtop>
              <template v-if="enableSuspense">
                <!-- keep-alive 内不使用 :key，避免强制销毁缓存组件导致 __vnode 错误 -->
                <keep-alive v-if="keepAlive" :include="usePermissionStoreHook().cachePageList">
                  <component :is="Component" class="main-content" />
                </keep-alive>
                <Suspense v-else>
                  <template #default>
                    <component :is="Component" :key="route.fullPath" class="main-content" />
                  </template>
                  <template #fallback>
                    <div class="main-content" v-loading="true" style="height: 100%"></div>
                  </template>
                </Suspense>
              </template>
              <template v-else>
                <!-- keep-alive 内不使用 :key，避免强制销毁缓存组件导致 __vnode 错误 -->
                <keep-alive v-if="keepAlive" :include="usePermissionStoreHook().cachePageList">
                  <component :is="Component" class="main-content" />
                </keep-alive>
                <component :is="Component" v-else :key="route.fullPath" class="main-content" />
              </template>
            </el-scrollbar>
            <div v-else>
              <template v-if="enableSuspense">
                <!-- keep-alive 内不使用 :key，避免强制销毁缓存组件导致 __vnode 错误 -->
                <keep-alive v-if="keepAlive" :include="usePermissionStoreHook().cachePageList">
                  <component :is="Component" class="main-content" />
                </keep-alive>
                <Suspense v-else>
                  <template #default>
                    <component :is="Component" :key="route.fullPath" class="main-content" />
                  </template>
                  <template #fallback>
                    <div class="main-content" v-loading="true" style="height: 100%"></div>
                  </template>
                </Suspense>
              </template>
              <template v-else>
                <!-- keep-alive 内不使用 :key，避免强制销毁缓存组件导致 __vnode 错误 -->
                <keep-alive v-if="keepAlive" :include="usePermissionStoreHook().cachePageList">
                  <component :is="Component" class="main-content" />
                </keep-alive>
                <component :is="Component" v-else :key="route.fullPath" class="main-content" />
              </template>
            </div>
          </div>
        </div>
      </template>
    </router-view>
  </section>
</template>

<style scoped lang="scss">
/* 三层高度都减「顶栏高度」——顶栏高度统一取 --zf-header-h（style/shell-mw.scss）。
   原先写死的 50px / 80px 是标签页栏还在时留下的旧值（标签页已在模板里注释掉），
   顶栏从 88 收到 56 后这份旧值会在页面底部露出一条灰边，故一并对齐到同一变量。 */
.app-main {
  position: relative;
  width: 100%;
  height: calc(100vh - var(--zf-header-h, 56px));
  overflow-x: hidden;
  background-color: #f1f2f8;
  border-radius: 0 0 15px 15px;
}

/* 内容横向溢出时放出横向滚动条（见 script 里 hasXOverflow 的说明）。
   el-scrollbar 的 bar 是 v-show 控制的内联 display:none，只有 !important 压得住；
   常显是刻意的 —— 这条滚动条的作用就是告诉用户「右边还有内容，可以横滚」。
   不溢出时本 class 不挂，纵向条与原来完全一致。 */
.app-main-scrollbar.has-x-overflow :deep(.el-scrollbar__bar.is-horizontal) {
  display: block !important;
  opacity: 1;
}

.app-main-container {
  // padding: 0 20px 0 0;
  position: relative;
  width: 100%;
  height: calc(100vh - var(--zf-header-h, 56px));
}

.app-main-card {
  // border-radius: 20px;
  position: relative;
  width: 100%;
  height: calc(100vh - var(--zf-header-h, 56px));
  background-color: #fff;
}

.app-main-nofixed-header {
  position: relative;
  width: 100%;
  min-height: 100vh;
}

.main-content {
  min-height: 100%;
  padding: var(--main-content-padding, 8px);
  background-color: #f5f6fa; /* 内容区底色（卡片为白，画布为浅灰） */
  border-radius: 8px;
}

:deep(.basic-container) {
  border-radius: 8px;
}

.compact-tags-view {
  display: flex !important;
  align-items: center;
  width: 100% !important;
  height: auto;
  padding: 12px 0 10px 10px;
  // background: var(--el-bg-color-page, #f5f7fa);
  box-shadow: none !important;
}

/* 单标签展示样式（showModel === 'single'） */
.compact-tags-view .page-title-button.single-title {
  display: inline-flex;
  align-items: center;
  height: inherit;
  margin: 0;
  font-size: 20px;
  font-weight: 900;
  color: var(--dc-text-1);
  background: transparent;
  border-radius: 0;
  box-shadow: none;
}

.compact-tags-extra {
  display: flex;
  align-items: center;
}
</style>
