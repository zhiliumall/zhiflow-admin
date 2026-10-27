/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";

/** 微信网页授权配置（wx_app，公众号 appType=2，全局一份） */
function getPage(query) {
  return http.request<any>("get", "/weixin/wxapp/page", { params: query });
}
function addObj(obj) {
  return http.request<any>("post", "/weixin/wxapp", { data: obj });
}
/** secret 不传则保留原值 */
function putObj(obj) {
  return http.request<any>("put", "/weixin/wxapp", { data: obj });
}
export { getPage, addObj, putObj };
