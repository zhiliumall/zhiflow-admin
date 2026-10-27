/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";

/** 商城设置（单店铺，id 固定为 DEFAULT_SHOP_ID） */
function getObj(id) {
  return http.request<any>("get", "/mall/shopinfo/" + id);
}
/** 只改名称、logo、客服电话 */
function putObj(obj: { id: string; name: string; phone: string; imgUrl: string }) {
  return http.request<any>("put", "/mall/shopinfo", { data: obj });
}
export { getObj, putObj };
