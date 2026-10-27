/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";

function getPage(query: any) {
  return http.request<any>("get", "/upms/user/page", { params: query });
}
function getCount(query) {
  return http.request<any>("get", "/upms/user/count", { params: query });
}
function addObj(obj) {
  return http.request<any>("post", "/upms/user", { data: obj });
}
function getObj(id) {
  return http.request<any>("get", "/upms/user/" + id);
}
function delObj(id) {
  return http.request<any>("delete", "/upms/user/" + id);
}
function putObj(obj) {
  return http.request<any>("put", "/upms/user", { data: obj });
}
/** 管理员重置他人密码；该用户下次登录须先改密 */
function editPassword(obj) {
  return http.request<any>("put", "/upms/user/password", { data: obj });
}
/** 修改个人资料 / 本人密码（带 password + newpassword1） */
function editObj(obj) {
  return http.request<any>("put", "/upms/user/edit", { data: obj });
}
/** 首次登录 / 管理员重置后修改密码（免登录，凭原口令） */
function changeExpiredPassword(obj: { username: string; password: string; newPassword: string }) {
  return http.request<any>("put", "/upms/user/password/expired", { data: obj });
}

export {
  getPage,
  getCount,
  addObj,
  getObj,
  delObj,
  putObj,
  editPassword,
  editObj,
  changeExpiredPassword,
};

/**
 * 用户表对象类型声明
 */
export interface ObjVO {
  /** 主键ID */
  id?: string;
  /** 用户名 */
  username?: string;
  /** 邮箱 */
  email?: string;
  /** 密码 */
  password?: string;
  /** 手机号 */
  phone?: string;
  /** 头像 */
  avatar?: string;
  /** 0-正常，9-锁定 */
  lockFlag?: string;
  /** 下次登录前必须修改密码：1 是 0 否 */
  passwordChangeRequired?: string;
  /** 昵称 */
  nickName?: string;
  /** 角色ID列表 */
  roleIds?: string[];
  /** 预留其他字段 */
  [key: string]: any;
}
