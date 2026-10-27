/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";
function getPage(query) {
  return http.request<any>("get", "/mall/goodscategory/page", {
    params: query,
  });
}
function fetchTree(query?) {
  return http.request<any>("get", "/mall/goodscategory/tree", {
    params: query,
  });
}
function addObj(obj) {
  return http.request<any>("post", "/mall/goodscategory", { data: obj });
}
function getObj(id) {
  return http.request<any>("get", "/mall/goodscategory/" + id);
}
function delObj(id) {
  return http.request<any>("delete", "/mall/goodscategory/" + id);
}
function putObj(obj) {
  return http.request<any>("put", "/mall/goodscategory", { data: obj });
}
export { getPage, fetchTree, addObj, getObj, delObj, putObj };
