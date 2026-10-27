/**
 * 首页轮播图（内容 › 轮播图）
 * 后端：mall-admin BannerController（/mall/banner）
 */
import { http } from "@/utils/http";

/** 分页：current / size；筛选 title（模糊）、enable（1 启用 / 0 停用，空 = 全部）。后端固定按 sort 升序、创建时间倒序 */
function getPage(query: BannerQuery) {
  return http.request<any>("get", "/mall/banner/page", {
    params: query,
  });
}
function getObj(id: string) {
  return http.request<any>("get", "/mall/banner/" + id);
}
function addObj(obj: BannerVO) {
  return http.request<any>("post", "/mall/banner", {
    data: obj,
  });
}
/** 修改：后端整条校验（标题、图片必填），只改一个字段也要带上整条 */
function putObj(obj: BannerVO) {
  return http.request<any>("put", "/mall/banner", {
    data: obj,
  });
}
function delObj(id: string) {
  return http.request<any>("delete", "/mall/banner/" + id);
}
export { getPage, getObj, addObj, putObj, delObj };

export interface BannerQuery {
  current: number;
  size: number;
  title?: string;
  enable?: string;
}

/** 轮播图对象（与后端 Banner 实体一致） */
export interface BannerVO {
  id?: string;
  /** 标题：后台识别用，H5 不展示；必填，最多 64 字 */
  title: string;
  /** 图片地址；必填 */
  imageUrl: string;
  /** 点击跳转地址：站内路由（以 / 开头）或 http(s) 地址；空 = 不跳转 */
  linkUrl?: string | null;
  /** 排序，小的在前；不填按 0 */
  sort?: number;
  /** 1 启用 / 0 停用；不填按启用 */
  enable?: string;
  createTime?: string;
  updateTime?: string;
}
