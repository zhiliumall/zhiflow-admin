/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";

function getPage(query: any) {
  return http.request<any>("get", "/upms/role/page", { params: query });
}

function getList(query) {
  return http.request<any>("get", "/upms/role/list", { params: query });
}
function getObj(id) {
  return http.request<any>("get", "/upms/role/" + id);
}
function addObj(obj) {
  return http.request<any>("post", "/upms/role", { data: obj });
}
function putObj(obj) {
  return http.request<any>("put", "/upms/role", { data: obj });
}
function delObj(id) {
  return http.request<any>("delete", "/upms/role/" + id);
}
function permissionUpd(obj) {
  return http.request<any>("put", "/upms/role/menu", { data: obj });
}
function fetchRoleTree(roleId) {
  return http.request<any>("get", "/upms/menu/tree/" + roleId);
}
export {
  getPage,
  getList,
  getObj,
  addObj,
  putObj,
  delObj,
  permissionUpd,
  fetchRoleTree,
};
