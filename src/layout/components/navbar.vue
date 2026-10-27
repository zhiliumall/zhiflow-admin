<script setup lang="ts">
import { useNav } from "@/layout/hooks/useNav";
import { computed } from "vue";

import { useI18n } from "@/locales/setupI18n";
import {
  findRouteByPath,
  getParentPaths,
} from "@/router/utils";
import { usePermissionStoreHook } from "@/store/modules/permission";
import Setting from "@iconify-icons/ri/settings-3-line";
import SidebarExpand from "@iconify-icons/ep/expand";
import SidebarFold from "@iconify-icons/ep/fold";
import { isAllEmpty } from "@pureadmin/utils";
import path from "path";
import { useRoute, useRouter } from "vue-router";
import Search from "./search/index.vue";
import Breadcrumb from "./sidebar/breadCrumb.vue";
import FullScreen from "./sidebar/fullScreen.vue";
import Logo from "./sidebar/logo.vue";
import mixNav from "./sidebar/mixNav.vue";
import topCollapse from "./sidebar/topCollapse.vue";
import TopUser from "./user/index.vue";

const route = useRoute();
const router = useRouter();
const { $t } = useI18n();

const {
  layout,
  device,
  onPanel,
  pureApp,
  toggleSideBar,
  resolvePath: navResolvePath,
} = useNav();
// ========== Elegant 模式：顶部一级菜单导航 ==========
function unwrapRoot(menus: any[]): any[] {
  if (!menus || menus.length === 0) return [];
  if (
    menus.length === 1 &&
    menus[0]?.children?.length > 0
  ) {
    return menus[0].children;
  }
  return menus;
}

/** 过滤隐藏项 */
function filterMenuByDelFlag(menus: any[]): any[] {
  if (!menus) return [];
  return menus
    .filter((item) => item?.delFlag !== "1")
    .map((item) => ({
      ...item,
      children: item.children
        ? filterMenuByDelFlag(item.children)
        : undefined,
    }));
}

const rawMenus = computed(() =>
  usePermissionStoreHook().wholeMenus,
);

/** 解包后的一级菜单（顶部导航 tab 列表） */
const topLevelMenus = computed(() =>
  filterMenuByDelFlag(unwrapRoot(rawMenus.value)),
);

/** 当前激活的一级菜单路径 */
const activeTopMenu = computed(() => {
  const activePath = !isAllEmpty(route.meta?.activePath)
    ? route.meta.activePath
    : route.path;
  const parentPaths = getParentPaths(activePath, rawMenus.value);
  if (parentPaths.length > 0) {
    const found = findRouteByPath(
      parentPaths[0],
      topLevelMenus.value,
    );
    if (found) return found.path;
  }
  // 直接匹配
  const direct = findRouteByPath(activePath, topLevelMenus.value);
  if (direct) return direct.path;
  // 兜底第一个
  return topLevelMenus.value[0]?.path || "";
});

function resolveTopMenuPath(menu: any): string {
  // 有子菜单 → 取第一个子路由
  if (menu?.children?.length) {
    const firstChild = menu.children.find(
      (c: any) =>
        c.meta?.showLink !== false && c.type !== 1,
    );
    if (firstChild) {
      return path.posix.resolve(menu.path || "", firstChild.path);
    }
    return menu.redirect || menu.path;
  }
  return menu.path || "";
}

function onTopMenuClick(menu: any) {
  const targetPath = resolveTopMenuPath(menu);
  router.push(targetPath).then(() => {
    useNav().menuSelect(targetPath);
  });
}

</script>

<template>
  <div :class="['navbar', { 'is-elegant': layout === 'elegant' && device !== 'mobile' }]">
    <!-- ====== Elegant 模式：Logo + 顶部一级导航标签栏 ====== -->
    <template v-if="layout === 'elegant' && device !== 'mobile'">
      <!-- 左侧：Logo + 导航标签 -->
      <div class="elegant-header-left">
        <Logo :collapse="false" />


        <nav class="top-nav-tabs">
          <div v-for="menu in topLevelMenus" :key="menu.path" :class="[
            'nav-tab-item',
            { 'is-active': activeTopMenu === resolveTopMenuPath(menu) },
          ]" @click="onTopMenuClick(menu)">
            {{ $t(menu.meta?.title) }}
          </div>
        </nav>
      </div>

      <!-- 右侧：工具栏 -->
      <div class="elegant-header-right">
        <span class="set-icon navbar-bg-hover"
          :title="pureApp.getSidebarCompact ? '侧栏切换为展开' : '侧栏切换为紧凑'"
          @click="pureApp.toggleSidebarCompact()">
          <IconifyIconOffline :icon="pureApp.getSidebarCompact ? SidebarExpand : SidebarFold"
            :style="{ fontSize: '20px' }" />
        </span>
        <Search id="header-search" />
        <FullScreen id="full-screen" />
        <TopUser />
        <span class="set-icon navbar-bg-hover" :title="$t('buttons.pureOpenSystemSet')" @click="onPanel">
          <IconifyIconOffline :icon="Setting" :style="{ fontSize: '20px' }" />
        </span>
      </div>
    </template>

    <!-- ====== 其他模式：原有逻辑 ====== -->
    <template v-else>
      <topCollapse v-if="device === 'mobile'" class="hamburger-container" :is-active="pureApp.sidebar.opened"
        @toggleClick="toggleSideBar" />

      <div v-if="layout !== 'mix' && device !== 'mobile'" class="flex items-center float-left">

        <Breadcrumb class="breadcrumb-container" />
      </div>

      <mixNav v-if="layout === 'mix'" />

      <div v-if="layout === 'vertical'" class="vertical-header-right">
        <span class="set-icon navbar-bg-hover"
          :title="pureApp.getSidebarCompact ? '侧栏切换为展开' : '侧栏切换为紧凑'"
          @click="pureApp.toggleSidebarCompact()">
          <IconifyIconOffline :icon="pureApp.getSidebarCompact ? SidebarExpand : SidebarFold"
            :style="{ fontSize: '20px' }" />
        </span>
        <Search id="header-search" />
        <FullScreen id="full-screen" />
        <TopUser />
        <span class="set-icon navbar-bg-hover" :title="$t('buttons.pureOpenSystemSet')" @click="onPanel">
          <IconifyIconOffline :icon="Setting" :style="{ fontSize: '20px' }" />
        </span>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
/* ========== 基础 navbar 样式 ========== */
.navbar {
  --el-menu-item-font-size: 15px;

  width: 100%;
  height: fit-content;
  overflow: hidden;

  /* Elegant 模式覆盖：高度、背景（几何与 mix 顶栏同源，见 style/shell-mw.scss） */
  &.is-elegant {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--zf-header-h, 56px);
    padding: 0 20px 0 16px;
    background: #fff;
    border-bottom: 1px solid var(--dc-line, #ebeef2);
  }

  .hamburger-container {
    float: left;
    height: 100%;
    line-height: 48px;
    cursor: pointer;
  }

  .vertical-header-right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-width: 280px;
    height: 48px;
    color: var(--dc-text-1);

    :deep(#header-search),
    :deep(.search-container),
    :deep(.dropdown-badge),
    :deep(.globalization),
    :deep(#full-screen),
    :deep(.el-badge),
    :deep(.el-badge__wrapper),
    :deep(.el-badge__content),
    :deep(.el-dropdown-link) {
      color: var(--pure-theme-topbar-text, #fff) !important;
    }

    .el-dropdown-link {
      display: flex;
      align-items: center;
      justify-content: space-around;
      height: 48px;
      padding: 10px;
      color: var(--dc-text-1);
      cursor: pointer;

      p {
        font-size: 14px;
      }

      img {
        width: 22px;
        height: 22px;
        border-radius: 50%;
      }
    }
  }

  .breadcrumb-container {
    float: left;
    margin-left: 16px;
  }
}

.translation {
  :deep(.el-dropdown-menu__item) {
    padding: 5px 40px;
  }

  .check-zh {
    position: absolute;
    left: 20px;
  }

  .check-en {
    position: absolute;
    left: 20px;
  }
}

.logout {
  width: 120px;

  :deep(.el-dropdown-menu__item) {
    display: inline-flex;
    flex-wrap: wrap;
    min-width: 100%;
  }
}

/* ========== Elegant 模式：顶部导航子元素样式 ========== */
.elegant-header-left {
  display: flex;
  flex: 1;
  gap: 24px;
  align-items: center;
  min-width: 0;
}

.elegant-header-right {
  display: flex;
  flex-shrink: 0;
  gap: 14px;
  align-items: center;
  color: var(--dc-text-3);

  :deep(svg),
  :deep(i),
  :deep(.iconify),
  :deep(.iconfont) {
    color: var(--dc-text-3) !important;
    fill: #666 !important;
  }

  :deep(#header-search),
  :deep(.search-container),
  :deep(.el-badge),
  :deep(.el-dropdown-link) {
    color: var(--dc-text-3) !important;
  }
}

/* 顶部导航标签 */
.top-nav-tabs {
  display: flex;
  align-items: center;
  height: var(--zf-header-h, 56px);
}

.nav-tab-item {
  position: relative;
  height: var(--zf-header-h, 56px);
  padding: 0 15px;
  font-size: 14px;
  line-height: var(--zf-header-h, 56px);
  color: var(--dc-text-2, var(--dc-text-1));
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.2s ease;

  &.is-active {
    font-weight: 600;
    color: var(--dc-text-1);

    /* 品牌色底部指示线（2px，左右缩进 15px） */
    &::after {
      position: absolute;
      right: 15px;
      bottom: 0;
      left: 15px;
      height: 2px;
      content: "";
      background-color: var(--dc-brand);
      border-radius: 2px 2px 0 0;
    }
  }

  /* hover 压过 active：active 项 hover 同样变主色，故置于 is-active 之后 */
  &:hover {
    color: var(--dc-brand);
  }
}

/* Elegant 模式下 navbar 内的 Logo 尺寸适配（覆盖 sidebar-logo-container-elegant 的 100px 高度） */
.elegant-header-left {
  :deep(.sidebar-logo-container-elegant) {
    height: var(--zf-header-h, 56px) !important;

    .sidebar-logo-link {
      display: flex;
      align-items: center;
    }
  }
}

</style>
