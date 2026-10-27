/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";

function getPage(query: PageVO) {
  return http.request<PageRespVO>("get", "/mall/goodsbrand/page", {
    params: query,
  });
}
function addObj(obj: ObjVO) {
  return http.request<RespVO>("post", "/mall/goodsbrand", {
    data: obj,
  });
}
function getObj(id: string) {
  return http.request<ObjVO>("get", "/mall/goodsbrand/" + id);
}
function delObj(id: string) {
  return http.request<RespVO>("delete", "/mall/goodsbrand/" + id);
}
function putObj(obj: ObjVO) {
  return http.request<RespVO>("put", "/mall/goodsbrand", {
    data: obj,
  });
}
function getList(query?) {
  return http.request<any>("get", "/mall/goodsbrand/list", { params: query });
}
export { getPage, addObj, getObj, delObj, putObj, getList };
/**
 * 商品品牌对象类型声明
 */
export interface ObjVO {
  /** PK */
  id?: string;
  /** 排序字段 */
  sort?: number;
  /** （1：开启；0：关闭） */
  enable?: string;
  /** 品牌名称 */
  brandName?: string;
  /** 品牌图片 */
  picUrl?: string;
  /** 预留其他字段 */
  [key: string]: any;
}
