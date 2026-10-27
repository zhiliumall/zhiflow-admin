import { http } from "@/utils/http";

/**
 * 路径参数 id 的兜底校验。
 *
 * 为什么必须在传输层拦：`getObj` / `delObj` 拼的是 `"/mall/goodsspu/" + id`，
 * id 为空/undefined 时会打到**裸路径** `/mall/goodsspu/`。该路径匹配到类级
 * `@RequestMapping("/goodsspu")`，而那上面只有 POST 与 PUT ⇒ Spring 抛
 * `HttpRequestMethodNotSupportedException`，返回 HTTP 500「服务异常」。
 * 用户看到的是一个查不出所以然的系统错误，而真实原因只是「没带 id」。
 *
 * 传 `"undefined"` / `"null"` 字符串同样拦掉 —— 那是模板串拼接的典型产物，
 * 后端会当成一个不存在的 id 老实查一遍库，白跑一次查询。
 */
function requireId(id: unknown, api: string): string | null {
  const s = id === null || id === undefined ? "" : String(id).trim();
  if (!s || s === "undefined" || s === "null" || s === "NaN") {
    console.error(`[${api}] 缺少 id，已拦截（避免打到裸路径导致 500）`, id);
    return null;
  }
  return s;
}


export function getPage(query: unknown) {
  return http.request<any>("get", "/mall/goodsspu/page", { params: query });
}

/** 获取全部 spu（只含 id、名称） */
export function getSpuData(query: unknown) {
  return http.request<any>("get", "/mall/goodsspu/list", { params: query });
}

export function getCount(query: unknown) {
  return http.request<any>("get", "/mall/goodsspu/count", { params: query });
}
export function addObj(obj: unknown) {
  return http.request<any>("post", "/mall/goodsspu", { data: obj });
}
export function getObj(id: string | number) {
  const safe = requireId(id, "goodsspu.getObj");
  if (!safe) return Promise.reject(new Error("缺少商品 id"));
  return http.request<any>("get", "/mall/goodsspu/" + safe);
}
export function delObj(id: string | number) {
  const safe = requireId(id, "goodsspu.delObj");
  if (!safe) return Promise.reject(new Error("缺少商品 id"));
  return http.request<any>("delete", "/mall/goodsspu/" + safe);
}
export function putObj(obj: unknown) {
  return http.request<any>("put", "/mall/goodsspu", { data: obj });
}
export function putObjShelf(obj: unknown) {
  return http.request<any>("put", "/mall/goodsspu/shelf", { params: obj });
}
export function getStatistics(query?: unknown) {
  return http.request<any>("get", "/mall/goodsspu/statistics", { params: query });
}
export function getListByIds(ids: unknown[]) {
  return ids.length > 0
    ? http.request<any>("post", "/mall/goodsspu/listbyids", { data: ids })
    : Promise.resolve({ data: { data: [] } });
}
export function goodsspuBatchAdd(data: unknown) {
  return http.request<any>("post", "/mall/goodsspu/batch", { data });
}
export function goodscategoryTree() {
  return http.request<any>("get", "/mall/goodscategory/tree");
}
export function updateGoodsInfo(obj: unknown) {
  return http.request<any>("put", "/mall/goodsspu/update", { data: obj });
}
export function meiliSearchSync() {
  return http.request<any>("post", "/mall/goodsspu/meilisearch-sync");
}
