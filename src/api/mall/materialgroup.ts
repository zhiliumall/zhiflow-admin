/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";

export function getPage(query) {
  return http.request<any>("get", "/mall/materialgroup/page", {
    params: query,
  });
}
export const addObj = (obj) => {
  return http.request<any>("post", "/mall/materialgroup", {
    data: obj,
  });
};

export const getObj = (id) => {
  return http.request<any>("get", "/mall/materialgroup/" + id);
};

export const delObj = (id) => {
  return http.request<any>("delete", "/mall/materialgroup/" + id);
};

export const putObj = (obj) => {
  return http.request<any>("put", "/mall/materialgroup", {
    data: obj,
  });
};
