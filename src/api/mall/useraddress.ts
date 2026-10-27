/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";

/** 收货地址分页（只读），按 userId 过滤 */
export function getPage(query) {
  return http.request<any>("get", "/mall/useraddress/page", { params: query });
}
export function getObj(id) {
  return http.request<any>("get", "/mall/useraddress/" + id);
}
