<script setup lang="ts">
import { useNav } from "@/layout/hooks/useNav";
import { useI18n } from "@/locales/setupI18n";
import { findRouteByPath, getParentPaths } from "@/router/utils";
import { usePermissionStoreHook } from "@/store/modules/permission";
import { useAppStoreHook } from "@/store/modules/app";
import { isAllEmpty } from "@pureadmin/utils";
import path from "path";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

// 图标渲染
import DcMenuIcon from "./DcMenuIcon.vue";
import { resolveSiblingMenuIcons } from "./menu-icons";

const route = useRoute();
const router = useRouter();
const { $t } = useI18n();

const { menuSelect } = useNav();

/** 容器 DOM 引用，用于直接设置内联 width */
const containerRef = ref<HTMLElement | null>(null);

// ========== 当前选中的二级菜单（菜单分组） ==========
const selectedLevel2 = ref<any>(null);

// ========== 菜单数据源 ==========
const rawMenus = computed(() => usePermissionStoreHook().wholeMenus);

/**
 * 解包根节点：
 * wholeMenus 可能是 [{ path: "/", children: [商城, 系统管理, ...] }]
 * 单根包装结构，需要展开 children 作为真正的一级菜单。
 */
function unwrapRoot(menus: any[]): any[] {
  if (!menus || menus.length === 0) return [];
  if (menus.length === 1 && menus[0]?.children?.length > 0) {
    return menus[0].children;
  }
  return menus;
}

/** 解包后的一级菜单（= 顶部导航的 tab 列表：商城、系统管理、微信模块...） */
const level1Menus = computed(() =>
  filterMenuByDelFlag(unwrapRoot(rawMenus.value)),
);

/** 当前激活的一级菜单（根据路由定位） */
const activeLevel1 = computed(() => {
  const activePath = !isAllEmpty(route.meta?.activePath)
    ? route.meta.activePath
    : route.path;
  const parentPaths = getParentPaths(activePath, rawMenus.value);
  if (parentPaths.length > 0) {
    const found = findRouteByPath(parentPaths[0], level1Menus.value);
    if (found) return found;
  }
  const direct = findRouteByPath(activePath, level1Menus.value);
  if (direct) return direct;
  return (
    level1Menus.value.find((m: any) => m.children?.length) ||
    level1Menus.value[0] ||
    null
  );
});

/** 菜单：当前一级菜单下的二级子菜单 */
const leftPanelMenus = computed(() => {
  if (!activeLevel1.value?.children) return [];
  return activeLevel1.value.children.filter(
    (item: any) =>
      item.meta?.showLink !== false && item.type !== 1 && item.delFlag !== "1",
  );
});

const parentIcons = computed(() =>
  resolveSiblingMenuIcons(
    leftPanelMenus.value.map((menu) => menu.meta?.title || ""),
  ),
);

/** 当前展开分组下的子菜单及分组标题。 */
const childMenus = computed(() => {
  if (!selectedLevel2.value?.children?.length) return [];
  return flattenMenuChildren(selectedLevel2.value.children);
});

/** 当前分组是否存在可展示的子菜单。 */
const hasChildMenus = computed(() => childMenus.value.length > 0);

// ========== 过滤函数 ==========
function filterMenuByDelFlag(menus: any[]): any[] {
  if (!menus) return [];
  return menus
    .filter((item) => item?.delFlag !== "1")
    .map((item) => ({
      ...item,
      children: item.children ? filterMenuByDelFlag(item.children) : undefined,
    }));
}

// ========== 扁平化子菜单 ==========
function flattenMenuChildren(menus: any[]): any[] {
  const result: any[] = [];

  function walk(items: any[]) {
    const visible = items.filter(
      (item) => item.meta?.showLink !== false && item.type !== 1,
    );
    const icons = resolveSiblingMenuIcons(
      visible.map((item) => item.meta?.title || ""),
    );
    visible.forEach((item, index) => {
      if (item.children?.length) {
        result.push({ ...item, isGroupTitle: true });
        walk(item.children);
      } else {
        result.push({ ...item, menuIcon: icons[index] });
      }
    });
  }

  walk(menus);
  return result;
}

// ========== 国际化标题 ==========
function getMenuName(key: any): string {
  let title = $t(key);
  if (title.startsWith("menus.")) {
    title = title.substring(6);
  }
  return title;
}

// ========== 路径解析 ==========
function resolvePath(routePath: string, basePath?: string): string {
  const httpReg = /^http(s?):\/\//;
  if (httpReg.test(routePath) || httpReg.test(basePath || "")) {
    return routePath || basePath || "";
  }
  return path.posix.resolve(basePath || "", routePath);
}

// ========== 菜单选中状态判断 ==========
function isActiveLeftItem(menu: any): boolean {
  if (!selectedLevel2.value) return false;
  return selectedLevel2.value.path === menu.path;
}

// ========== 子菜单激活状态判断 ==========
function isChildItemActive(item: any): boolean {
  const activePath = !isAllEmpty(route.meta?.activePath)
    ? route.meta.activePath
    : route.path;
  const itemPath = resolvePath(item.path, selectedLevel2.value?.path);
  return activePath === itemPath;
}

// ========== 默认选中逻辑 ==========
function resolveSelectedLevel2() {
  if (leftPanelMenus.value.length === 0) {
    selectedLevel2.value = null;

    return;
  }

  const activePath = !isAllEmpty(route.meta?.activePath)
    ? route.meta.activePath
    : route.path;

  // 策略1（优先）：在菜单分组的 children 中查找 → 选中有子菜单的父级（展示子菜单）
  for (const menu of leftPanelMenus.value) {
    if (!menu.children) continue;
    const foundInChildren = findRouteByPath(activePath, menu.children);
    if (foundInChildren) {
      selectedLevel2.value = menu;

      return;
    }
  }

  // 策略2：直接匹配当前路由对应的二级菜单（可能是叶子节点）
  const directMatch = findRouteByPath(activePath, leftPanelMenus.value);
  if (directMatch) {
    selectedLevel2.value = directMatch;

    return;
  }

  // 兜底：优先取第一个有 children 的二级菜单（确保子菜单展开），否则取第一个
  const firstWithChildren = leftPanelMenus.value.find(
    (m: any) => m.children?.length,
  );
  selectedLevel2.value = firstWithChildren || leftPanelMenus.value[0] || null;
}

// ========== 点击交互 ==========

/** 菜单点击（二级菜单） */
function onLeftMenuClick(menu: any) {
  if (flattenMenuChildren(menu.children || []).length) {
    // 同一分组再次点击可收起；只切换菜单预览，不修改当前页面。
    selectedLevel2.value = isActiveLeftItem(menu) ? null : menu;
  } else {
    // 叶子节点：直接跳转
    selectedLevel2.value = menu;
    const navPath = resolvePath(menu.path, activeLevel1.value?.path);
    router.push(navPath).then(() => {
      menuSelect(navPath);
    });
  }
}

/** 子菜单点击（三级/叶子菜单） */
function onChildMenuClick(item: any) {
  if (item.isGroupTitle) return;

  const navPath = resolvePath(
    item.path,
    selectedLevel2.value?.path || activeLevel1.value?.path,
  );
  router.push(navPath).then(() => {
    menuSelect(navPath);
  });
}

// ========== 监听路由变化 ==========
watch(
  () => [route.path, usePermissionStoreHook().wholeMenus],
  () => {
    if (route.path.includes("/redirect")) return;
    resolveSelectedLevel2();
    menuSelect(route.path);
  },
);

// 把"预览中"的二级菜单项同步到 app store：点击带子菜单的一级图标只切预览、不跳转
// （onLeftMenuClick），路由并未真的变化。自带内部子菜单 UI 的页面可以
// 靠它判断"admin 侧栏是不是已经预览到别的分组了"，从而隐藏自己已经过期的内部子菜单，
// 避免和 admin 刚切过去的子菜单同时出现、看起来像两套菜单。
watch(
  selectedLevel2,
  (menu) => useAppStoreHook().setSidebarPreviewPath(menu?.path ?? null),
  { immediate: true },
);

onMounted(() => {
  resolveSelectedLevel2();
  // DOM 挂载后补设宽度（watch immediate 可能在 ref 就绪前触发）
  nextTick(() => applySidebarWidth());
});

function applySidebarWidth() {
  // A single column with children expanded below their parent.
  const w = "240px";
  if (containerRef.value) {
    // sidebar.scss 的 merge-style 和 .hideSidebar 分支都用 !important 钉死了 width
    // （mix 下 = 140px），因此以 important 内联值保持 240px 单列宽度。
    containerRef.value.style.setProperty("width", w, "important");
    containerRef.value.style.setProperty("min-width", w, "important");
  }
}

// Keep the fixed reference width when the sidebar mounts.
watch(hasChildMenus, () => applySidebarWidth(), {
  immediate: true,
});
</script>

<template>
  <div
    ref="containerRef"
    v-loading="rawMenus.length === 0"
    :class="['sidebar-container', 'reference-sidebar']"
  >
    <el-scrollbar class="sidebar-scroll">
      <nav class="sidebar-menu" aria-label="侧边菜单">
        <div
          v-for="(menu, menuIndex) in leftPanelMenus"
          :key="menu.path"
          class="sidebar-section"
        >
          <button
            type="button"
            :title="getMenuName(menu.meta?.title)"
            :class="[
              'sidebar-menu-item',
              { 'is-active': isActiveLeftItem(menu) },
            ]"
            :aria-expanded="
              menu.children?.length ? isActiveLeftItem(menu) : undefined
            "
            :aria-current="
              !menu.children?.length && isActiveLeftItem(menu)
                ? 'page'
                : undefined
            "
            @click="onLeftMenuClick(menu)"
          >
            <DcMenuIcon
              :icon="menu.meta?.icon"
              :name="parentIcons[menuIndex]"
              :size="20"
              :stroke="1.8"
            />
            <span class="menu-label">{{ getMenuName(menu.meta?.title) }}</span>
            <span
              v-if="menu.children?.length"
              class="menu-caret"
              aria-hidden="true"
            >
              {{ isActiveLeftItem(menu) ? "︿" : "﹀" }}
            </span>
          </button>
          <div
            v-if="isActiveLeftItem(menu) && hasChildMenus"
            class="sidebar-children"
          >
            <template v-for="item in childMenus" :key="item.path">
              <div v-if="item.isGroupTitle" class="submenu-group-title">
                {{ getMenuName(item.meta?.title) }}
              </div>
              <button
                v-else
                type="button"
                :title="getMenuName(item.meta?.title)"
                :class="[
                  'sidebar-child-item',
                  { 'is-active': isChildItemActive(item) },
                ]"
                :aria-current="isChildItemActive(item) ? 'page' : undefined"
                @click="onChildMenuClick(item)"
              >
                <DcMenuIcon
                  :icon="item.meta?.icon"
                  :name="item.menuIcon"
                  :size="16"
                  :stroke="1.8"
                />
                <span class="menu-label">{{
                  getMenuName(item.meta?.title)
                }}</span>
              </button>
            </template>
          </div>
        </div>
      </nav>
    </el-scrollbar>
  </div>
</template>

<style scoped lang="scss">
.reference-sidebar {
  flex: none;
  height: 100%;
  background: #fff;
  transition:
    width 0.2s ease,
    min-width 0.2s ease;
}

.sidebar-scroll {
  height: 100%;
}

.sidebar-scroll :deep(.el-scrollbar__view) {
  min-height: 100%;
}

.sidebar-section,
.sidebar-children {
  display: contents;
}

.sidebar-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 100%;
  padding: 12px;
}

// Expanding a group must push following rows down, never shrink existing rows.
.sidebar-menu-item,
.sidebar-child-item {
  position: relative;
  display: flex;
  flex: none;
  gap: 12px;
  align-items: center;
  width: 100%;
  height: 40px;
  min-height: 22px;
  padding: 0 12px;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: normal;
  color: var(--zf-menu-ink, #1c1f23);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 8px;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: rgb(46 50 56 / 5%);
  }

  &:active {
    background: rgb(46 50 56 / 9%);
  }

  &:focus-visible {
    outline: 2px solid var(--zf-menu-brand, #0064fa);
    outline-offset: -2px;
  }

  &.is-active {
    font-weight: 600;
    color: var(--zf-menu-active, #0062d6);
  }
}

.sidebar-menu-item.is-active::before {
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 0;
  width: 3px;
  content: "";
  background: var(--zf-menu-brand, #0064fa);
  border-radius: 3px;
}

.menu-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-caret {
  flex: none;
  font-size: 10px;
  line-height: 1;
  color: var(--zf-menu-placeholder, #8a8f99);
}

.sidebar-child-item {
  gap: 10px;
  height: 36px;
  padding-left: 44px;
  font-weight: 400;
  color: #4b5058;

  &.is-active {
    background: var(--zf-menu-tint, #e6effd);
  }
}

.submenu-group-title {
  padding: 10px 12px 6px 44px;
  font-size: 12px;
  color: #8a8f99;
}
</style>
