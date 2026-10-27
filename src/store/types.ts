import type { RouteRecordName } from "vue-router";
import type { ObjVO as SysUserType } from "@/api/upms/user";
export type cacheType = {
  mode: string;
  name?: RouteRecordName;
};

export type positionType = {
  startIndex?: number;
  length?: number;
};

export type appType = {
  sidebar: {
    opened: boolean;
    withoutAnimation: boolean;
    // 判断是否手动点击Collapse
    isClickCollapse: boolean;
  };
  layout: string;
  // 侧栏二级栏紧凑图标栏模式（true=紧凑，false=展开）
  sidebarCompact: boolean;
  device: string;
  viewportSize: { width: number; height: number };
  sortSwap?: any;
  // 左侧二级菜单当前"预览中"的项（点击带子菜单的一级图标只切预览、不跳转时用它记录）
  sidebarPreviewPath: string | null;
};

export type multiType = {
  path: string;
  name: string;
  meta: any;
  query?: object;
  params?: object;
};

export type setType = {
  title: string;
  fixedHeader: boolean;
  hiddenSideBar: boolean;
  enableSuspense?: boolean;
};

export type userType = {
  avatar?: string;
  username?: string;
  nickname?: string;
  roles?: Array<string>;
  isRemembered?: boolean;
  loginDay?: number;
};

// 重命名一下
export type userInfo = SysUserType;
export type userInfoType = {
  username?: string;
  roles?: Array<string>;
  sysUser?: SysUserType;
  userInfo?: userInfo;
  permissions?: Array<string>;
};

export type logsList = {
  type: any;
  url: string;
  message: any;
  stack: any;
  time: any;
};
