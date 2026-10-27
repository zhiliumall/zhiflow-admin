/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from "@/utils/http";
function getPage(query) {
  return http.request<any>("get", "/upms/dict/page", { params: query });
}
function addObj(obj) {
  return http.request<any>("post", "/upms/dict/", { data: obj });
}
function getObj(id) {
  return http.request<any>("get", "/upms/dict/" + id);
}
function delObj(row) {
  return http.request<any>("delete", "/upms/dict/" + row.id);
}
function putObj(obj) {
  return http.request<any>("put", "/upms/dict/", { data: obj });
}
function getPage2(query) {
  return http.request<any>("get", "/upms/dict/item/page", { params: query });
}
function addObj2(obj) {
  return http.request<any>("post", "/upms/dict/item", { data: obj });
}
function getObj2(id) {
  return http.request<any>("get", "/upms/dict/item/" + id);
}
function delObj2(id) {
  return http.request<any>("delete", "/upms/dict/item/" + id);
}
function putObj2(obj) {
  return http.request<any>("put", "/upms/dict/item", { data: obj });
}
/**
 * 按字典类型拉取字典项（裸 HTTP，不走缓存）。
 * ⚠ 只应由 dict store 的 fetchDict 调用；业务代码请用下面的 remote()（带缓存）。
 * 之前这个函数在重构中丢失，导致 store.fetchDict 反过来调 remote()、
 * remote() 又调 fetchDict()，形成自委派：第二次进入命中 loadingDicts 分支，
 * 轮询 5s 超时后 resolve([])，全站字典静默为空。
 */
function fetchDictType(type: string) {
  return http.request<any>("get", "/upms/dict/type/" + type);
}

/**
 * 获取字典数据（带缓存）
 * @param type 字典类型
 * @param forceRefresh 是否强制刷新
 */
async function remote(type: string, forceRefresh = false) {
  // 动态导入 Store，避免循环依赖
  const { useDictStoreHook } = await import("@/store/modules/dict");
  const dictStore = useDictStoreHook();
  
  // 使用 Store 的缓存机制
  const dictData = await dictStore.fetchDict(type, forceRefresh);
  
  // 返回与原有接口兼容的格式
  return {
    data: dictData,
  };
}
export {
  getPage,
  addObj,
  getObj,
  delObj,
  putObj,
  getPage2,
  addObj2,
  getObj2,
  delObj2,
  putObj2,
  fetchDictType,
  remote,
};
/**
 * 对象字段说明
 */
export interface ObjVO {
  /** 编号 */
  id?: string;
  /** 类型 */
  type?: string;
  /** 描述 */
  description?: string;
  /** 备注信息 */
  remarks?: string;
  /** 预留其他字段 */
  [key: string]: any;
}
