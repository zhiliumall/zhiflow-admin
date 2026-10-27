/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { http } from "@/utils/http";

function getPage(query) {
  return http.request<any>("get", "/upms/agreementconfig/page", {
    params: query,
  });
}

function addObj(obj) {
  return http.request<any>("post", "/upms/agreementconfig", {
    data: obj,
  });
}

function getObj(id) {
  return http.request<any>("get", "/upms/agreementconfig/" + id);
}

function delObj(id) {
  return http.request<any>("delete", "/upms/agreementconfig/" + id);
}

function putObj(obj) {
  return http.request<any>("put", "/upms/agreementconfig", {
    data: obj,
  });
}
/**
 * 根据类型获取协议内容
 * @param type 字典 agreement_type：3 用户协议；4 隐私政策
 * @returns
 */
function getObjByType(agreementType: string) {
  return http.request<any>(
    "get",
    "/upms/agreementconfig/type/" + agreementType,
  );
}

export {
  getPage,
  addObj,
  getObj,
  delObj,
  putObj,
  getObjByType,
};
