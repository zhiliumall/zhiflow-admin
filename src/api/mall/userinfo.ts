/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";

export function getPage(query) {
  return http.request<any>("get", "/mall/userinfo/page", { params: query });
}
export function getCount(query) {
  return http.request<any>("get", "/mall/userinfo/count", { params: query });
}
export function addObj(obj) {
  return http.request<any>("post", "/mall/userinfo", { data: obj });
}
export function getObj(id) {
  return http.request<any>("get", "/mall/userinfo/" + id);
}
export function putObj(obj) {
  return http.request<any>("put", "/mall/userinfo", { data: obj });
}
/**
 * 拉黑 / 恢复会员
 * @param obj.id 会员 id
 * @param obj.blackFlag '1' 拉黑，'0' 恢复正常
 */
export function putBlackFlag(obj: { id: string; blackFlag: "0" | "1" }) {
  return http.request<any>("put", "/mall/userinfo/black", { data: obj });
}
/** 会员数统计：countTotal / countToday / yesterdayCount / countMonth */
export function getStatistics(query?) {
  return http.request<any>("get", "/mall/userinfo/statistics", {
    params: query,
  });
}
