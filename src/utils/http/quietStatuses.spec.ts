import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 新接口在老后端上 404 时不弹全局错误（调用方自己降级）。
 * 源码契约：错误拦截器里 quietStatuses 的判断必须在通用「弹错误提示」之前，且只对调用方声明的状态码生效。
 */
const src = readFileSync(resolve(process.cwd(), "src/utils/http/index.ts"), "utf8");

describe("http quietStatuses", () => {
  it("声明在请求配置类型上", () => {
    const types = readFileSync(resolve(process.cwd(), "src/utils/http/types.d.ts"), "utf8");
    expect(types).toMatch(/quietStatuses\?: number\[\]/);
  });

  it("错误拦截器先判 quietStatuses 再弹通用错误提示", () => {
    const errorHandler = src.slice(src.indexOf("(error: PureHttpError) => {"));
    const quiet = errorHandler.indexOf("quietStatuses?.includes(status)");
    const genericToast = errorHandler.indexOf("if (msg && (status !== 200 || data?.code === 1))");
    expect(quiet).toBeGreaterThan(0);
    expect(genericToast).toBeGreaterThan(quiet);
    // 命中时 reject 带 status 的 response，调用方能用 isEndpointMissing 判出来
    expect(errorHandler.slice(quiet, quiet + 120)).toContain("Promise.reject(response ?? $error)");
  });
});
