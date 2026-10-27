/** hasAnyPermission：按钮 / 页签级权限码可见性判断 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const permState: { permissions: Record<string, boolean> } = { permissions: {} };
let persisted: { permissions?: string[] } | null = null;

vi.mock("@/store/modules/permission", () => ({
  usePermissionStoreHook: () => permState,
}));
vi.mock("@/utils/auth", () => ({
  getUserInfo: () => persisted,
}));

import { hasAnyPermission } from "./permission";

describe("hasAnyPermission", () => {
  beforeEach(() => {
    permState.permissions = {};
    persisted = null;
  });

  it("都没有 → false", () => {
    expect(hasAnyPermission(["mall:goodsspu:add"])).toBe(false);
  });

  it("pinia 里命中任一 → true", () => {
    permState.permissions = { "mall:goodsspu:add": true };
    expect(hasAnyPermission(["mall:goodsspu:index", "mall:goodsspu:add"])).toBe(true);
  });

  it("刷新早期 pinia 未回填 → 回退读持久化 userInfo", () => {
    persisted = { permissions: ["mall:goodsspu:add"] };
    expect(hasAnyPermission(["mall:goodsspu:add"])).toBe(true);
  });

  it("对照样本：别的权限码不能顶替", () => {
    permState.permissions = { "mall:orderinfo:index": true };
    persisted = { permissions: ["mall:orderinfo:get"] };
    expect(hasAnyPermission(["mall:goodsspu:add"])).toBe(false);
  });
});
