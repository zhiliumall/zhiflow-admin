/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";

function getObj2() {
  return http.request<any>("get", "/upms/configstorage");
}
function putObj(obj: ObjVO) {
  return http.request<any>("put", "/upms/configstorage", {
    data: obj,
  });
}
export { putObj, getObj2 };
/**
 * 对象类型声明
 */
export interface ObjVO {
  /** PK */
  id?: string;
  /** 是否自配服务（单店铺固定为 1） */
  isSelf?: string;
  /** 存储类型：0 本地；3 MinIO */
  storageType?: string;
  /** 地域节点 */
  endpoint?: string;
  /** access_key */
  accessKeyId?: string;
  /** access_secret */
  accessKeySecret?: string;
  /** Bucket */
  bucket?: string;
  /** 图片水印内容 */
  waterMarkContent?: string;
}
