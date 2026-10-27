import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 订单「人工处理」接口形状：PUT /mall/orderinfo/{id}/manual-fix，body = { targetState, reason }。
 * 与后端 manual-fix 端点的契约对齐，后端改路径或字段名时这里要同步改。
 */

const request = vi.hoisted(() => vi.fn());
vi.mock("@/utils/http", () => ({ http: { request } }));

const { manualFixOrderState, getObj, exportOrders, downloadBatchDeliveryTemplate, batchDelivery } = await import("./orderinfo");

describe("manualFixOrderState", () => {
  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue({
      code: 0,
      data: { from: "LEGACY_INVALID", to: "COMPLETED", logId: "9001" },
    });
  });

  it("PUT 到 /mall/orderinfo/{id}/manual-fix，body 原样带 targetState 与 reason", async () => {
    const res = await manualFixOrderState("1000000000000000001", {
      targetState: "COMPLETED",
      reason: "核对物流后已签收",
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      "put",
      "/mall/orderinfo/1000000000000000001/manual-fix",
      { data: { targetState: "COMPLETED", reason: "核对物流后已签收" } },
    );
    expect(res.data).toEqual({
      from: "LEGACY_INVALID",
      to: "COMPLETED",
      logId: "9001",
    });
  });

  it("id 走路径段编码，不会拼出别的路径", async () => {
    await manualFixOrderState("a/b", { targetState: "CANCELLED", reason: "x" });
    expect(request.mock.calls[0][1]).toBe("/mall/orderinfo/a%2Fb/manual-fix");
  });

  it("详情接口是 GET /mall/orderinfo/{id}（machineState 从它的 data 里取）", async () => {
    await getObj("42");
    expect(request).toHaveBeenCalledWith("get", "/mall/orderinfo/42");
  });
});

describe("下载 / 上传接口", () => {
  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue(new Blob());
  });

  it("导出：GET /mall/orderinfo/export，带列表同款查询参数，按 blob 收", async () => {
    await exportOrders({ status: "1", orderNo: "NO1" });
    expect(request).toHaveBeenCalledWith("get", "/mall/orderinfo/export", {
      params: { status: "1", orderNo: "NO1" },
      responseType: "blob",
    });
  });

  it("批量发货模板：GET /mall/orderinfo/batch-delivery/template，按 blob 收", async () => {
    await downloadBatchDeliveryTemplate();
    expect(request).toHaveBeenCalledWith("get", "/mall/orderinfo/batch-delivery/template", {
      responseType: "blob",
    });
  });

  it("批量发货：POST multipart，文件字段名为 file", async () => {
    const file = new File(["x"], "delivery.xlsx");
    await batchDelivery(file);
    const [method, url, config] = request.mock.calls[0];
    expect(method).toBe("post");
    expect(url).toBe("/mall/orderinfo/batch-delivery");
    expect((config.data as FormData).get("file")).toBe(file);
    expect(config.headers).toEqual({ "Content-Type": "multipart/form-data" });
  });
});
