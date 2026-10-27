/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";

/** 支付配置（普通商户模式，每种支付类型全局一份） */
export interface PayConfigVO {
  id?: string;
  /** 1 微信支付；2 支付宝 */
  type: string;
  /** 2 普通商户模式 */
  model: string;
  appId?: string;
  mchId?: string;
  /** 微信：APIv2 商户密钥；支付宝：应用私钥 */
  mchKey?: string;
  /** 微信：apiclient_cert.p12；支付宝：支付宝根证书 */
  keyPath?: string;
  /** 微信：apiclient_key.pem；支付宝：支付宝公钥证书 */
  privateKeyPath?: string;
  /** 微信：apiclient_cert.pem；支付宝：应用公钥证书 */
  privateCertPath?: string;
  /** 微信：APIv3 证书序列号 */
  certSerialNo?: string;
  /** 微信：APIv3 密钥 */
  apiV3Key?: string;
  [key: string]: any;
}

function addObj(obj: PayConfigVO) {
  return http.request<any>("post", "/pay/payconfig", { data: obj });
}
function putObj(obj: PayConfigVO) {
  return http.request<any>("put", "/pay/payconfig", { data: obj });
}
function getByType(type: string) {
  return http.request<any>("get", "/pay/payconfig/bytype/" + type);
}
export { addObj, putObj, getByType };
