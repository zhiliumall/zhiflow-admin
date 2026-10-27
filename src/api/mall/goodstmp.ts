import { http } from "@/utils/http";

function getPage(query) {
  return http.request<any>("get", "/mall/goodsparametertemplate/page", {
    params: query,
  });
}

function getList(query) {
  return http.request<any>("get", "/mall/goodsparametertemplate/list", {
    params: query,
  });
}

function addObj(obj) {
  return http.request<any>("post", "/mall/goodsparametertemplate", {
    data: obj,
  });
}

function getObj(id) {
  return http.request<any>("get", "/mall/goodsparametertemplate/" + id);
}

function delObj(id) {
  return http.request<any>("delete", "/mall/goodsparametertemplate/" + id);
}

function putObj(obj) {
  return http.request<any>("put", "/mall/goodsparametertemplate", {
    data: obj,
  });
}

function addTemObj(obj) {
  return http.request<any>("post", "/mall/goodsparameter", {
    data: obj,
  });
}

function getTemList(id) {
  return http.request<any>(
    "get",
    "/mall/goodsparameter/list?parameterTemplateId=" + id,
  );
}

function delTemObj(id) {
  return http.request<any>("delete", "/mall/goodsparameter/" + id);
}

function putTemObj(obj) {
  return http.request<any>("put", "/mall/goodsparameter", {
    data: obj,
  });
}

export {
  getPage,
  getList,
  addObj,
  getObj,
  delObj,
  putObj,
  addTemObj,
  getTemList,
  delTemObj,
  putTemObj,
};
