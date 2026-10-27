import Cookies from "js-cookie";
import { storageLocal } from "@pureadmin/utils";
import { useUserStoreHook } from "@/store/modules/user";
import type { userInfoType, userInfo } from "@/store/types";
import { usePermissionStoreHook } from "@/store/modules/permission";
import { resetRefreshFailedCount } from "@/utils/http";
import { CACHE_KEY, TOKEN_KEY } from "@/utils/storageKeys";

export { CACHE_KEY };
export interface LoginInfo {
  /** token */
  access_token: string;
  /** `access_token`的过期时间（时间戳） */
  expires_in: number;
  /** 用于调用刷新access_token的接口时所需的token */
  refresh_token: string;
  license?: string;
  scope: string;
  token_type: string;
  user_id: string;
  /** 用户名 */
  username: string;
  user_info?: {
    id: string;
    name: string;
    username: string;
  };
}

/** 获取`token` */
export function getToken(): LoginInfo {
  // 此处与`TOKEN_KEY`相同，此写法解决初始化时`Cookies`中不存在`CACHE_KEY.TOKEN`报错
  return Cookies.get(TOKEN_KEY)
    ? JSON.parse(Cookies.get(TOKEN_KEY))
    : storageLocal().getItem(CACHE_KEY.SESSION);
}

/**
 * @description 设置`token`以及一些必要信息并采用无感刷新`token`方案
 * 无感刷新：后端返回`access_token`（访问接口使用的`token`）、`refresh_token`（用于调用刷新`access_token`的接口时所需的`token`，`refresh_token`的过期时间（比如30天）应大于`access_token`的过期时间（比如2小时））、`expires_in`（`access_token`的过期时间）
 * 将`access_token`、`expires_in`这两条信息放在key值为authorized-token的cookie里（过期自动销毁）
 * 将`username`、`roles`、`refresh_token`、`expires_in`这四条信息放在key值为`user-info`的sessionStorage里（浏览器关闭自动销毁）
 */
export function setToken(data: LoginInfo) {
  const { access_token, refresh_token } = data;
  // expires_in 单位是秒
  const expires_in = data.expires_in * 1000 + Date.now();
  const cookieString = JSON.stringify({
    access_token,
    expires_in,
    refresh_token,
  });
  if (expires_in > 0) {
    Cookies.set(TOKEN_KEY, cookieString, {
      expires: expires_in,
    });
  } else {
    Cookies.set(TOKEN_KEY, cookieString);
  }

  Cookies.set(CACHE_KEY.MULTIPLE_TABS_KEY, "true");

  function setSessionKey(username: string) {
    useUserStoreHook().SET_USERNAME(username);
    storageLocal().setItem(CACHE_KEY.SESSION, {
      refresh_token,
      expires_in,
      username,
    });
  }

  if (data.username) {
    const { username } = data;
    setSessionKey(username);
  } else {
    const username =
      storageLocal().getItem<LoginInfo>(CACHE_KEY.SESSION)?.username ?? "";
    setSessionKey(username);
  }

  // 重置刷新token失败计数，允许新会话正常刷新token
  resetRefreshFailedCount();
}

/** 获取`userInfo`包括角色role，权限permissions，username用户账号 */
export function getUserInfo(): userInfoType {
  // 此处与`CACHE_KEY.TOKEN`相同，此写法解决初始化时`Cookies`中不存在`CACHE_KEY.TOKEN`报错
  return Cookies.get(CACHE_KEY.USERINFO)
    ? JSON.parse(Cookies.get(CACHE_KEY.USERINFO))
    : storageLocal().getItem(CACHE_KEY.USERINFO);
}
export function setUserInfo(data: userInfoType) {
  function setSessionKey(
    sysUser: userInfo,
    roles: Array<string>,
    permissions: Array<string>,
  ) {
    useUserStoreHook().SET_USERNAME(sysUser.username);
    useUserStoreHook().SET_USERINFO(sysUser);
    useUserStoreHook().SET_ROLES(roles);
    usePermissionStoreHook().SET_PERMISSIONS(permissions);
    storageLocal().setItem(CACHE_KEY.USERINFO, {
      sysUser,
      roles,
      permissions,
    });
  }
  if (data && data.sysUser && data.roles) {
    const { sysUser, roles, permissions } = data;
    setSessionKey(sysUser, roles, permissions);
  } else {
    const userInfo = storageLocal().getItem<userInfoType>(CACHE_KEY.USERINFO);
    if (userInfo)
      setSessionKey(userInfo.sysUser, userInfo.roles, userInfo.permissions);
  }
}
// removeToken();
/** 删除`token`以及key值为`user-info`的session信息 */
export function removeToken() {
  Cookies.remove(TOKEN_KEY);
  Cookies.remove(CACHE_KEY.MULTIPLE_TABS_KEY);
  storageLocal().removeItem(CACHE_KEY.USERINFO);
  storageLocal().removeItem(CACHE_KEY.SESSION);
  storageLocal().removeItem(CACHE_KEY.MENUS);
}

/** 格式化token（jwt格式） */
export const formatToken = (token: string): string => {
  return "Bearer " + token;
};
