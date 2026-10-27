/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
/**
 * 商城客户端类型（订单 / 会员的 appType 字段，与后端 PortalConstants.CLIENT_TYPE_* 一致）。
 */

export type clientType = "H5-WX" | "H5" | "H5-PC";

/** 客户端类型取值 */
export const clientTypesValue = {
  H5WX: "H5-WX",
  H5: "H5",
  H5PC: "H5-PC",
};

/** 订单来源描述 */
export const clientTypesOrder = {
  "H5-WX": "微信内 H5",
  H5: "H5",
  "H5-PC": "PC 端 H5",
};

/** 会员来源描述 */
export const clientTypes = {
  ...clientTypesOrder,
};
