/**
 * 按钮 / 页签级的权限码可见性判断（只决定显不显示，不是权限边界 —— 后端接口各自独立鉴权）。
 *
 * 先读 pinia 的权限 store；刷新早期 store 还没回填时，回退读持久化的 userInfo.permissions。
 */
import { usePermissionStoreHook } from "@/store/modules/permission";
import { getUserInfo } from "@/utils/auth";

/** 任一权限码命中即 true。 */
export function hasAnyPermission(codes: readonly string[]): boolean {
  const perms = usePermissionStoreHook().permissions ?? {};
  if (codes.some((c) => perms[c])) return true;
  const persisted = getUserInfo();
  return Array.isArray(persisted?.permissions) && codes.some((c) => persisted.permissions.includes(c));
}
