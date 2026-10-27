/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";

function getSkuListBySpuId(spuId) {
  return http.request<any>("get", "/mall/goodssku/list/" + spuId);
}

function updateSku(obj) {
  return http.request<any>("put", "/mall/goodssku", { data: obj });
}

export { getSkuListBySpuId, updateSku };
