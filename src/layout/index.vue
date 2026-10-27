<script setup lang="ts">
import "@/components/re-icon/src/offlineIcon";
import { useDataThemeChange } from "@/layout/hooks/useDataThemeChange";
import { useAppStoreHook } from "@/store/modules/app";
import { useSettingStoreHook } from "@/store/modules/settings";
import {
  deviceDetection,
  useDark,
  useGlobal,
  useResizeObserver,
} from "@pureadmin/utils";
import "animate.css";
import {
  computed,
  defineComponent,
  h,
  onBeforeMount,
  onMounted,
  reactive,
  ref,
} from "vue";
import { useRoute } from "vue-router";
import { useLayout } from "./hooks/useLayout";
import { setType } from "./types";

import backTop from "@/assets/svg/back_top.svg?component";
import appMain from "./components/appMain.vue";
import navbar from "./components/navbar.vue";
import setting from "./components/setting/index.vue";
import Vertical from "./components/sidebar/vertical.vue";
import tag from "./components/tag/index.vue";

const appWrapperRef = ref();
const { isDark } = useDark();
const { layout } = useLayout();
const route = useRoute();
const isMobile = deviceDetection();
const pureSetting = useSettingStoreHook();
const { $storage } = useGlobal<GlobalPropertiesApi>();

const set: setType = reactive({
  sidebar: computed(() => {
    return useAppStoreHook().sidebar;
  }),

  device: computed(() => {
    return useAppStoreHook().device;
  }),

  fixedHeader: computed(() => {
    return pureSetting.fixedHeader;
  }),

  classes: computed(() => {
    return {
      hideSidebar: !set.sidebar.opened,
      openSidebar: set.sidebar.opened,
      withoutAnimation: set.sidebar.withoutAnimation,
      mobile: set.device === "mobile",
    };
  }),

  hideTabs: computed(() => {
    return $storage?.configure.hideTabs;
  }),
});

/** 全局左侧菜单栏是否让位：系统设置的 hiddenSideBar 开关，或路由 meta.hideSidebar 声明 */
const hideSidebar = computed(
  () => pureSetting.hiddenSideBar || route.meta?.hideSidebar === true,
);

function setTheme (layoutModel: string) {
  window.document.body.setAttribute("layout", layoutModel);
  $storage.layout = {
    layout: `${layoutModel}`,
    theme: $storage.layout?.theme,
    darkMode: $storage.layout?.darkMode,
    sidebarStatus: $storage.layout?.sidebarStatus,
    sidebarCompact: $storage.layout?.sidebarCompact,
    epThemeColor: $storage.layout?.epThemeColor,
    themeColor: $storage.layout?.themeColor,
    overallStyle: $storage.layout?.overallStyle,
  };
}

function toggle (device: string, bool: boolean) {
  useAppStoreHook().toggleDevice(device);
  useAppStoreHook().toggleSideBar(bool, "resize");
}

// 判断是否可自动关闭菜单栏
let isAutoCloseSidebar = true;

useResizeObserver(appWrapperRef, (entries) => {
  if (isMobile) return;
  const entry = entries[0];
  const [{ inlineSize: width, blockSize: height }] = entry.borderBoxSize;
  useAppStoreHook().setViewportSize({ width, height });

  // 强制保持 mix 布局，不自动切换为 vertical
  setTheme("mix");

  /** width app-wrapper类容器宽度
   * 侧边栏始终保持收缩状态，不再根据宽度自动展开/折叠
   *
   * 断点 760 → 640：进 mobile 态后 mixNav 整块 v-if 掉（顶栏连菜单带工具条全没），
   * 侧栏也被 sidebar.scss 的 .mobile.hideSidebar translate 到屏外，只剩一个汉堡。
   * 1280 屏开 175% 缩放 = 731px 就会撞上这条，表现就是「菜单不显示」。
   * 顶栏窄屏降级梯队（style/shell-mw.scss）已能撑到 640，这里跟着放宽。
   */
  if (width > 0 && width <= 640) {
    toggle("mobile", false);
    isAutoCloseSidebar = true;
  } else {
    toggle("desktop", false);
    isAutoCloseSidebar = false;
  }
});

onMounted(() => {
  if (isMobile) {
    toggle("mobile", false);
  }
});

onBeforeMount(() => {
  useDataThemeChange().dataThemeChange($storage.layout?.overallStyle);
});

const layoutHeader = defineComponent({
  render () {
    return h(
      "div",
      {
        class: { "fixed-header": set.fixedHeader },
        style: [
          set.hideTabs && layout.value.includes("horizontal")
            ? isDark.value
              ? "box-shadow: 0 1px 4px #0d0d0d"
              : "box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08)"
            : "",
        ],
      },
      {
        default: () => [
          !pureSetting.hiddenSideBar ? h(navbar) : null,
          h(
            "div",
            { class: "main-tags-view-container" },
            [h(tag)]
          ),
        ],
      },
    );
  },
});
</script>

<template>
  <div ref="appWrapperRef" :class="['app-wrapper', set.classes]">
    <div v-show="set.device === 'mobile' &&
      set.sidebar.opened &&
      layout.includes('mix')
      " class="app-mask" @click="useAppStoreHook().toggleSideBar()" />

    <!-- 顶部通栏 Header -->
    <layout-header />

    <!-- 下方左右布局容器 -->
    <div class="main-content-wrapper">
      <!-- 左侧 Sidebar（自带侧栏的整页壳用 meta.hideSidebar 让位，见上方 hideSidebar 说明） -->
      <Vertical v-if="!hideSidebar" />

      <!-- 右侧 Content -->
      <div :class="[
        'main-container',
        hideSidebar ? 'main-hidden' : '',
      ]">
        <div v-if="set.fixedHeader">
          <!-- 主体内容 -->
          <app-main :fixed-header="set.fixedHeader" />
        </div>
        <el-scrollbar v-else>
          <el-backtop :bottom="80"
            :title="$t('buttons.pureBackTop')" target=".main-container .el-scrollbar__wrap">
            <backTop />
          </el-backtop>
          <!-- 主体内容 -->
          <app-main :fixed-header="set.fixedHeader" />
        </el-scrollbar>
      </div>
    </div>

    <!-- 系统设置 -->
    <setting />
  </div>
</template>

<style lang="scss" scoped>
.app-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #f1f2f5;

  &::after {
    display: table;
    clear: both;
    content: "";
  }

  &.mobile.openSidebar {
    position: fixed;
    top: 0;
  }
}

.main-content-wrapper {
  position: relative;
  position: sticky;

  /* 顶栏高度统一取 --zf-header-h，定义在 style/shell-mw.scss（默认 56px） */
  top: var(--zf-header-h, 56px);
  display: flex;
  height: calc(100% - var(--zf-header-h, 56px));

  /* 减去 header 高度 */
  margin-top: var(--zf-header-h, 56px);
  overflow: hidden;
}

.app-mask {
  position: absolute;
  top: 0;
  z-index: 999;
  width: 100%;
  height: 100%;
  background: #000;
  opacity: 0.3;
}

.re-screen {
  margin-top: 12px;
}
</style>
