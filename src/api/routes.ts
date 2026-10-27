/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";

export const getAsyncRoutes = () => {
  return http.request<any>("get", "/upms/menu");
};
