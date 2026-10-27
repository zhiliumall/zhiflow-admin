import { AxiosHeaders } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ensureTraceparent,
  getLastTraceId,
  newTraceparent,
  readResponseHeader,
  rememberFailedTrace,
  resolveTraceId,
  traceIdOfTraceparent,
} from "./traceparent";

/**
 * W3C traceparent 请求头。
 * 格式 00-<32hex>-<16hex>-01、每个请求一条新 trace、不产出全 0；已带的原样保留；
 * 响应头 X-Trace-Id 优先。axios 1.x 拦截器里拿到的是 AxiosHeaders，普通对象也要兼容。
 */
const FORMAT = /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("traceparent", () => {
  it("格式合法、每次不同", () => {
    const a = newTraceparent();
    expect(a.traceparent).toMatch(FORMAT);
    expect(a.traceparent).not.toBe(newTraceparent().traceparent);
    expect(traceIdOfTraceparent(a.traceparent)).toBe(a.traceId);
  });

  it("随机源全 0 时也不产出全 0", () => {
    vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(
      (arr) => arr,
    );
    const { traceparent, traceId } = newTraceparent();
    expect(traceparent).toMatch(FORMAT);
    expect(traceId).not.toMatch(/^0+$/);
  });

  it("AxiosHeaders：缺则补，已有（大小写不敏感）则保留", () => {
    const headers = new AxiosHeaders({ "x-request-from": "admin" });
    const traceId = ensureTraceparent(headers);
    expect(String(headers.get("traceparent"))).toMatch(FORMAT);
    expect(traceIdOfTraceparent(headers.get("traceparent"))).toBe(traceId);

    const given = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01";
    const withGiven = new AxiosHeaders({ Traceparent: given });
    expect(ensureTraceparent(withGiven)).toBe("0af7651916cd43dd8448eb211c80319c");
    expect(withGiven.get("traceparent")).toBe(given);
  });

  it("普通对象同样处理；undefined 不抛", () => {
    const plain: Record<string, unknown> = {};
    expect(ensureTraceparent(plain)).toMatch(/^[0-9a-f]{32}$/);
    expect(String(plain.traceparent)).toMatch(FORMAT);
    expect(ensureTraceparent(undefined)).toBe("");
  });

  it("响应头 X-Trace-Id 优先，否则取请求头里发出去的那个", () => {
    const req = new AxiosHeaders();
    const sent = ensureTraceparent(req);
    const server = "0af7651916cd43dd8448eb211c80319c";
    expect(resolveTraceId(new AxiosHeaders({ "x-trace-id": server }), req)).toBe(server);
    expect(resolveTraceId({ "X-Trace-Id": server.toUpperCase() }, req)).toBe(server);
    expect(resolveTraceId({}, req)).toBe(sent);
    expect(resolveTraceId(undefined, req)).toBe(sent);
    expect(readResponseHeader({ "x-error-code": "BIZ-COMMON-001" }, "X-Error-Code")).toBe(
      "BIZ-COMMON-001",
    );
  });

  it("记下最近一次失败的 trace id", () => {
    expect(rememberFailedTrace("0af7651916cd43dd8448eb211c80319c")).toBe(
      "0af7651916cd43dd8448eb211c80319c",
    );
    rememberFailedTrace("");
    expect(getLastTraceId()).toBe("0af7651916cd43dd8448eb211c80319c");
  });
});
