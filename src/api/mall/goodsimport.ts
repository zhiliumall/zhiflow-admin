import { http } from "@/utils/http";

/**
 * 商品批量导入。对应后端 mall-admin GoodsImportController（/mall/goodsimport/**）。
 * 状态码、重复策略、失败归类三套字符串常量由后端 GoodsImportConstants 定义，前端不得自造。
 */

/** 任务状态：0草稿 1导入中 2部分成功 3全部成功 4已终止 5执行异常 */
export const IMPORT_STATUS = {
  draft: "0",
  running: "1",
  partial: "2",
  success: "3",
  aborted: "4",
  failed: "5",
} as const;

/** 重复编码策略 */
export const DUP_STRATEGY = {
  skip: "skip",
  overwrite: "overwrite",
  abort: "abort",
} as const;

/** 失败原因归类，对应结果页的筛选 chips */
export const ISSUE_TYPE = {
  duplicate: "duplicate",
  required: "required",
  format: "format",
  other: "other",
} as const;

export interface GoodsImportIssue {
  rowNo: number;
  name?: string | null;
  header?: string | null;
  reason?: string | null;
  type?: string | null;
}

export interface GoodsImportPreview {
  taskId: string;
  fileName: string;
  fileSize: number;
  total: number;
  validCount: number;
  invalidCount: number;
  issues: GoodsImportIssue[];
}

export interface GoodsImportTask {
  id: string;
  status: string;
  templateType?: string;
  fileName?: string | null;
  categoryName?: string | null;
  operatorName?: string | null;
  totalCount?: number | null;
  processedCount?: number | null;
  successCount?: number | null;
  failCount?: number | null;
  percent?: number | null;
  errorMsg?: string | null;
  createTime?: string | null;
  startTime?: string | null;
  finishTime?: string | null;
  durationMs?: number | null;
  failures?: GoodsImportIssue[];
  failRowValues?: Record<string, Record<string, string>>;
}

export interface GoodsImportStartOptions {
  dupStrategy: string;
  /** "1" 忽略异常行只导入通过行；"0" 有异常就不让开始 */
  skipInvalid: string;
  forceOffShelf: string;
  zeroStock: string;
  syncPrice: string;
}

/** 模板字段说明，用于渲染「含 N 个字段」与字段清单 */
export interface GoodsImportColumnMeta {
  header: string;
  field: string;
  scope: string;
  type: string;
  required: boolean;
  note: string;
  options: string[];
}

export function getTemplateColumns(type: string) {
  return http.request<any>("get", "/mall/goodsimport/template/columns", {
    params: { type },
  });
}

/** 模板下载走 blob；文件名后端已在 Content-Disposition 里给了，这里另存时兜个中文名 */
export function downloadTemplate(type: string) {
  return http.request<any>("get", "/mall/goodsimport/template", {
    params: { type },
    responseType: "blob",
  });
}

/**
 * 导出现有商品，格式 = 增量更新模板，改完可原样传回「批量导入」。
 *
 * 后端上限 500 行（与导入同一个 MAX_ROWS），超出按商品边界截断并在文件首行的
 * 「参考·备注」列写明还剩多少个商品没导——所以列表筛出几百件时要提示分批导。
 *
 * @param query 与商品列表 /goodsspu/page 完全相同的筛选条件，导出即「列表筛出什么导什么」
 * @param ids   勾选导出的商品 ID（逗号分隔）；传了就忽略 query
 */
export function exportGoods(query: Record<string, any>, ids?: string) {
  return http.request<any>("get", "/mall/goodsimport/export", {
    params: ids ? { ids } : query,
    responseType: "blob",
  });
}

/**
 * 上传预校验。类目随 form-data 一起提交，后端整批统一落到每个商品上（店铺固定为默认店铺）。
 */
export function precheck(payload: {
  file: File;
  templateType: string;
  categoryFirst?: string;
  categorySecond?: string;
  categoryThird?: string;
  categoryName?: string;
}) {
  const form = new FormData();
  form.append("file", payload.file);
  Object.entries(payload).forEach(([key, value]) => {
    if (key !== "file" && value !== undefined && value !== null && value !== "") {
      form.append(key, String(value));
    }
  });
  return http.request<any>("post", "/mall/goodsimport/precheck", {
    data: form,
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export function startTask(taskId: string, options: GoodsImportStartOptions) {
  return http.request<any>("post", `/mall/goodsimport/task/${taskId}/start`, {
    data: options,
  });
}

export function getTask(taskId: string) {
  return http.request<any>("get", `/mall/goodsimport/task/${taskId}`);
}

export function abortTask(taskId: string) {
  return http.request<any>("post", `/mall/goodsimport/task/${taskId}/abort`);
}

export function getTaskPage(query: {
  current: number;
  size: number;
  status?: string;
  days?: number;
}) {
  return http.request<any>("get", "/mall/goodsimport/task/page", {
    params: query,
  });
}

/** 商品列表工具栏角标：进行中的导入任务 */
export function getRunningTasks() {
  return http.request<any>("get", "/mall/goodsimport/task/running");
}

export function downloadFailData(taskId: string) {
  return http.request<any>(
    "get",
    `/mall/goodsimport/task/${taskId}/fail-export`,
    { responseType: "blob" },
  );
}

/** 失败行修正后重导；rows 的 values 用后端字段名做 key（如 name / salesPrice） */
export function retryRows(
  taskId: string,
  rows: Array<{ rowNo: number; values: Record<string, string> }>,
) {
  return http.request<any>("post", `/mall/goodsimport/task/${taskId}/retry`, {
    data: { rows },
  });
}

/**
 * 把 blob 响应存成文件。
 *
 * 响应拦截器（utils/http/index.ts）只在 `response.data` 上有 `data` 字段时才解包，
 * 而 Blob 上没有——于是 responseType:"blob" 的调用拿到的是整个 AxiosResponse，
 * 不是 Blob 本身。这里两种形状都收，免得下出来一个 `[object Object]` 的空文件。
 */
export function saveBlob(res: any, fileName: string) {
  const raw = res instanceof Blob ? res : res?.data;
  const data =
    raw instanceof Blob
      ? raw
      : new Blob([raw], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
