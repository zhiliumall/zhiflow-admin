/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";

/** 服务端返回的精确金额字符串，如 "1234.50" */
export type DecimalString = string;

export interface HomepageOverview {
  timeZone: string;
  generatedAt: string;
  today: HomepagePeriod;
  month: HomepagePeriod;
  cumulative: HomepagePeriod;
  users: HomepageUsers;
  /** 近 30 天逐日数据（按日期升序，最后一项为今天，无数据日补 0） */
  dailyMetrics: HomepageDailyMetric[];
}
export interface HomepagePeriod {
  startAt: string;
  endAt: string;
  paidOrderCount: number;
  grossPaidCashflow: DecimalString;
  netSales: DecimalString;
}
export interface HomepageUsers {
  available: boolean;
  todayNewUserCount: number | null;
  monthNewUserCount: number | null;
  totalUserCount: number | null;
}
export interface HomepageDailyMetric {
  date: string;
  paidOrderCount: number;
  grossPaidCashflow: DecimalString;
  netSales: DecimalString;
  newUserCount: number | null;
}

/** 首页经营概览（今日 / 本月 / 累计 + 近 30 天逐日），时间窗由服务端决定 */
export function getHomepageOverview() {
  return http.request<{ code: number; msg?: string; data: HomepageOverview }>(
    "get",
    "/mall/largescreen/homepage-overview",
  );
}
