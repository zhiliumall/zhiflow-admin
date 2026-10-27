/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";
function getPage(query) {
  return http.request<any>("get", "/mall/material/page", { params: query });
}
function addObj(obj) {
  return http.request<any>("post", "/mall/material", { data: obj });
}
function getObj(id) {
  return http.request<any>("get", "/mall/material/" + id);
}
function delObj(id) {
  return http.request<any>("delete", "/mall/material/" + id);
}
function putObj(obj) {
  return http.request<any>("put", "/mall/material", { data: obj });
}
export { getPage, addObj, getObj, delObj, putObj };
