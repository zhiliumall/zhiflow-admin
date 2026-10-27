/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";
function getPage(query) {
  return http.request<any>("get", "/mall/goodsspecvalue/page", {
    params: query,
  });
}
function getList(query) {
  return http.request<any>("get", "/mall/goodsspecvalue/list", {
    params: query,
  });
}
function addObj(obj) {
  return http.request<any>("post", "/mall/goodsspecvalue", { data: obj });
}
function getObj(id) {
  return http.request<any>("get", "/mall/goodsspecvalue/" + id);
}
function delObj(id) {
  return http.request<any>("delete", "/mall/goodsspecvalue/" + id);
}
function putObj(obj) {
  return http.request<any>("put", "/mall/goodsspecvalue", { data: obj });
}
export { getPage, getList, addObj, getObj, delObj, putObj };
