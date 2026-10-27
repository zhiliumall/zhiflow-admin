/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";
function GetMenu() {
  return http.request<any>("get", "/upms/menu");
}
function fetchAllMenuTree(query?: any) {
  return http.request<any>("get", "/upms/menu/all/tree", { params: query });
}
function fetchMenuTree(query?) {
  return http.request<any>("get", "/upms/menu/tree", { params: query });
}
function addObj(obj) {
  return http.request<any>("post", "/upms/menu", { data: obj });
}
function getObj(id) {
  return http.request<any>("get", "/upms/menu/" + id);
}
function delObj(id) {
  return http.request<any>("delete", "/upms/menu/" + id);
}
function putObj(obj) {
  return http.request<any>("put", "/upms/menu", { data: obj });
}
export {
  GetMenu,
  fetchAllMenuTree,
  fetchMenuTree,
  addObj,
  getObj,
  delObj,
  putObj,
};
