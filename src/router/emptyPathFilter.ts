/**
 * 剔除 `path` 为空/null 的菜单节点（连同其子树）。
 *
 * 必须跑在 `formatPath` 之前：`formatPath` 用模板字符串拼子路径
 * ``const mergedPath = `${ele.path}/${child.path}` ``，`child.path` 为 `null` 时
 * JS 会把它拼成字符串 `"null"`，得到 `/mall/goods/goodsspu/null`。
 * 多个空 path 的兄弟节点因此拿到同一个 path，并抢占同名父路由，表现为点菜单 404；
 * 后续 `formatMenuData` 里的 `item.path.replace(...)` 对 null 也会抛 TypeError。
 * 本模块是渲染层兜底：菜单数据里混进空 path 的目录 / 菜单也不会 404。
 *
 * ⚠️ 不能一刀切按 path 剔除：按钮节点（`type === 1`）的 path 本就是空的。
 * 按钮不生成路由，且按钮权限走 `/upms/user/info` 的 `permissions` 数组
 * （见 permission store 的 `SET_PERMISSIONS`），与菜单树无关，故按钮节点一律放行。
 */

/** 该菜单节点是否会生成路由却没有可用的 path */
export function hasUsablePath(item: any, pathKey = "path"): boolean {
  // 按钮节点不生成路由，放行
  if (item?.type === 1) return true;
  const path = item?.[pathKey];
  return typeof path === "string" && path.trim() !== "";
}

/** 递归剔除 path 为空的菜单节点（连同其子树） */
export function filterEmptyPathRoutes(
  menus: any[],
  pathKey = "path",
  labelKey = "label",
): any[] {
  if (!Array.isArray(menus) || menus.length === 0) return [];
  return menus
    .filter((item) => {
      if (hasUsablePath(item, pathKey)) return true;
      console.warn(
        `[router] 菜单「${item?.[labelKey] ?? "?"}」(id=${item?.id}) 的 path 为空，` +
          `已跳过以免生成 /xxx/null 路由抢占父路由。请在后台补全该菜单的路由地址。`,
      );
      return false;
    })
    .map((item) => {
      if (item.children?.length) {
        item.children = filterEmptyPathRoutes(item.children, pathKey, labelKey);
      }
      return item;
    });
}
