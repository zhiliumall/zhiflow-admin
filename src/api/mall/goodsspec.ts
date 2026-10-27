/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";
function getPage(query) {
  return http.request<any>("get", "/mall/goodsspec/page", { params: query });
}
function getList(query?) {
  return http.request<any>("get", "/mall/goodsspec/list", { params: query });
}
function addObj(obj) {
  return http.request<any>("post", "/mall/goodsspec", { data: obj });
}
function getObj(id) {
  return http.request<any>("get", "/mall/goodsspec/" + id);
}
function delObj(id) {
  return http.request<any>("delete", "/mall/goodsspec/" + id);
}
function putObj(obj) {
  return http.request<any>("put", "/mall/goodsspec", { data: obj });
}
export { getPage, getList, addObj, getObj, delObj, putObj };
