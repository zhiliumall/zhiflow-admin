/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";

function getPage(query: any) {
  return http.request<any>("get", "/upms/log/page", { params: query });
}
function delObj(id) {
  return http.request<any>("delete", "/upms/log/" + id);
}
export { getPage, delObj };
