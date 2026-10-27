import { http } from "@/utils/http";

// 商城系统参数（mall_config 键值配置）接口

/**
 * 分页查询
 * @param params 查询参数
 * @returns
 */
export const fetchList = (params?: any) => {
  return http.request("get", "/mall/mallsystemconfig/page", { params });
};

/**
 * 获取所有配置项
 * @returns
 */
export const getAllConfigs = () => {
  return http.request("get", "/mall/mallsystemconfig/all");
};

/**
 * 通过id查询
 * @param id
 * @returns
 */
export const getObj = (id: string) => {
  return http.request("get", "/mall/mallsystemconfig/" + id);
};

/**
 * 新增配置
 * @param obj
 * @returns
 */
export const addObj = (obj: any) => {
  return http.request("post", "/mall/mallsystemconfig", { data: obj });
};

/**
 * 修改配置
 * @param obj
 * @returns
 */
export const putObj = (obj: any) => {
  return http.request("put", "/mall/mallsystemconfig", { data: obj });
};

/**
 * 批量更新配置
 * @param configs
 * @returns
 */
export const updateBatch = (configs: Record<string, string>) => {
  return http.request("put", "/mall/mallsystemconfig/batch", { data: configs });
};

/**
 * 删除配置
 * @param id
 * @returns
 */
export const delObj = (id: string) => {
  return http.request("delete", "/mall/mallsystemconfig/" + id);
};

/**
 * 刷新配置缓存
 * @returns
 */
export const refreshCache = () => {
  return http.request("post", "/mall/mallsystemconfig/refresh");
};
