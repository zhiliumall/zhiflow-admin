/**
 * 搜索页热搜词（内容 › 热搜）
 * 后端：mall-admin HotWordController（/mall/hotword）。C 端按热度（totalCount）取前 10。
 */
import { http } from "@/utils/http";

/** 分页：current / size；筛选 word（模糊）。后端固定按热度倒序、创建时间倒序 */
function getPage(query: HotWordQuery) {
  return http.request<any>("get", "/mall/hotword/page", { params: query });
}
function getObj(id: string) {
  return http.request<any>("get", "/mall/hotword/" + id);
}
function addObj(obj: HotWordVO) {
  return http.request<any>("post", "/mall/hotword", {
    data: obj,
  });
}
/** 修改：热度不传会被后端按 0 写回，只改热词也要带上原热度 */
function putObj(obj: HotWordVO) {
  return http.request<any>("put", "/mall/hotword", {
    data: obj,
  });
}
function delObj(id: string) {
  return http.request<any>("delete", "/mall/hotword/" + id);
}
export { getPage, getObj, addObj, putObj, delObj };

export interface HotWordQuery {
  current: number;
  size: number;
  word?: string;
}

/** 热搜词对象（与后端 GlobalHotWord 实体一致） */
export interface HotWordVO {
  /** 主键：后端按字符串下发（19 位雪花 id 超出 JS 安全整数），一律按字符串处理 */
  id?: string;
  /** 热词：必填，去首尾空格后最多 50 字，不能重复 */
  word: string;
  /** 热度（总搜索次数）：越大越靠前，不填按 0，不能为负 */
  totalCount?: number;
  createTime?: string;
  updateTime?: string;
}
