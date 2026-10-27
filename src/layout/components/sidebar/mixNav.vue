<script setup lang="ts">
import { HEADER_MENU_POPPER_OPTIONS } from "@/layout/components/header-menu";
import { useNav } from "@/layout/hooks/useNav";
import { useI18n } from "@/locales/setupI18n";
import { getParentPaths } from "@/router/utils";
import { usePermissionStoreHook } from "@/store/modules/permission";
import { useAppStoreHook } from "@/store/modules/app";
import { useRoute, useRouter } from "vue-router";
import { computed } from "vue";
import Search from "../search/index.vue";
import TopUser from "../user/index.vue";
import DcMenuIcon from "./DcMenuIcon.vue";
import Logo from "./logo.vue"; // 引入 Logo 组件

const route = useRoute();
const router = useRouter();
const { device, onPanel, resolvePath, menuSelect, toggle, isFullscreen } =
  useNav();
const { $t } = useI18n();

// Five primary destinations; overflow stays accessible through the labeled dropdown.
const topMenus = computed(() =>
  usePermissionStoreHook().wholeMenus.filter(
    (menu) =>
      menu.meta?.showLink !== false && menu.delFlag !== "1" && menu.type !== 1,
  ),
);
const visibleCount = computed(() => {
  const width = useAppStoreHook().getViewportWidth;
  if (width <= 860) return 1;
  if (width <= 1050) return 2;
  if (width <= 1190) return 3;
  return 5;
});
const visibleMenus = computed(() =>
  topMenus.value.slice(0, visibleCount.value),
);
const moreMenus = computed(() => topMenus.value.slice(visibleCount.value));
const activeRootPath = computed(() => {
  const activePath = route.meta?.activePath || route.path;
  return (
    getParentPaths(activePath, usePermissionStoreHook().wholeMenus)[0] ||
    activePath
  );
});
const activeMoreMenu = computed(() =>
  moreMenus.value.find((menu) => menu.path === activeRootPath.value),
);

function menuTitle(title: string) {
  return $t(title || "").replace(/^menus\./, "");
}

function openTopMenu(menu: (typeof topMenus.value)[number]) {
  const target = resolvePath(menu) || menu.redirect || menu.path;
  router.push(target).then(() => menuSelect(target));
}
</script>

<template>
  <div
    v-if="device !== 'mobile'"
    v-loading="usePermissionStoreHook().wholeMenus.length === 0"
    class="horizontal-header"
    :class="{ 'has-overflow-active': activeMoreMenu }"
  >
    <div class="horizontal-header-left">
      <Logo :collapse="false" />
    </div>

    <nav class="header-primary-nav" aria-label="顶部菜单">
      <button
        v-for="menu in visibleMenus"
        :key="menu.path"
        type="button"
        :class="[
          'header-nav-item',
          { 'is-active': menu.path === activeRootPath },
        ]"
        :aria-current="menu.path === activeRootPath ? 'page' : undefined"
        @click="openTopMenu(menu)"
      >
        {{ menuTitle(menu.meta?.title) }}
      </button>
      <el-dropdown
        v-if="moreMenus.length"
        trigger="click"
        popper-class="header-menu-popper header-more-popper"
        placement="bottom-start"
        :popper-options="HEADER_MENU_POPPER_OPTIONS"
        :show-arrow="false"
      >
        <button
          type="button"
          :class="[
            'header-nav-item',
            'header-nav-more',
            { 'is-active': activeMoreMenu },
          ]"
          aria-label="更多顶部菜单"
        >
          {{ activeMoreMenu ? menuTitle(activeMoreMenu.meta?.title) : "更多" }}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="menu in moreMenus"
              :key="menu.path"
              :class="{ 'is-active': menu.path === activeRootPath }"
              @click="openTopMenu(menu)"
            >
              {{ menuTitle(menu.meta?.title) }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </nav>
    <div
      class="horizontal-header-right text-white"
      style="color: var(--pure-theme-topbar-text, #fff)"
    >
      <Search id="header-search" title="搜索菜单 ⌘K">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </Search>
      <!-- 全屏 -->
      <button
        id="full-screen"
        class="header-tool-button"
        type="button"
        :title="isFullscreen ? '退出全屏' : '全屏'"
        @click="toggle"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path
            :d="
              isFullscreen
                ? 'M9 4v5H4M15 4v5h5M4 15h5v5M15 20v-5h5'
                : 'M4 9V4h5M15 4h5v5M4 15v5h5M15 20h5v-5'
            "
          />
        </svg>
      </button>
      <button
        type="button"
        class="header-tool-button"
        :title="$t('buttons.pureOpenSystemSet')"
        @click="onPanel"
      >
        <DcMenuIcon name="reference-settings" :size="20" :stroke="1.8" />
      </button>

      <!-- 头像与前面的功能区之间一道 1px 竖线 -->
      <span class="topbar-divider" />

      <!-- 退出登录 -->
      <TopUser />
    </div>
  </div>
</template>

<style lang="scss" scoped>
:deep(.el-loading-mask) {
  opacity: 0.45;
}

.horizontal-header {
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  backdrop-filter: saturate(50%) blur(4px);
  box-shadow: 0 0 12px rgb(0 0 0 / 10%);
}

.horizontal-header-right {
  :deep(.el-icon),
  :deep(svg),
  :deep(i),
  :deep(.iconify),
  :deep(.iconfont) {
    color: var(--dc-text-3) !important;
    fill: none;
  }

  :deep(#header-search),
  :deep(.search-container),
  :deep(.dropdown-badge),
  :deep(.globalization),
  :deep(#full-screen),
  :deep(.el-dropdown-link) {
    color: var(--dc-text-3) !important;
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

.topbar-divider {
  flex: none;
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: rgb(28 31 35 / 10%);
}

</style>
