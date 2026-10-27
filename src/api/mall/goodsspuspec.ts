/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";
function getPage(query) {
  return http.request<any>("get", "/mall/goodsspuspec/page", { params: query });
}
function fetchTree(query) {
  return http.request<any>("get", "/mall/goodsspuspec/tree", { params: query });
}
function addObj(obj) {
  return http.request<any>("post", "/mall/goodsspuspec", { data: obj });
}
function getObj(id) {
  return http.request<any>("get", "/mall/goodsspuspec/" + id);
}
function delObj(id) {
  return http.request<any>("delete", "/mall/goodsspuspec/" + id);
}
function putObj(obj) {
  return http.request<any>("put", "/mall/goodsspuspec", { data: obj });
}
export { getPage, fetchTree, addObj, getObj, delObj, putObj };
