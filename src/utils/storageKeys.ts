/**
 * 浏览器存储键名（cookie / localStorage / sessionStorage），统一放在 `zhiflow` 命名空间下。
 */
const NAMESPACE = "zhiflow";

const keyOf = (name: string) => `${NAMESPACE}-${name}`;

/** cookie：令牌（access_token / expires_in / refresh_token） */
export const TOKEN_KEY = keyOf("authorized-token");
/** localStorage / cookie 键 */
export const CACHE_KEY = {
  SESSION: keyOf("session"), // 登录信息
  USERINFO: keyOf("user-info"), // 用户信息
  MENUS: keyOf("user-menus"), // 菜单权限信息
  MULTIPLE_TABS_KEY: keyOf("multiple-tabs-key"), // 标签
};
/** sessionStorage：动态 chunk 加载失败后自动刷新的时间戳 */
export const CHUNK_RELOAD_KEY = keyOf("chunk-reload-at");
