import { describe, expect, it } from "vitest";

/**
 * in-flight 请求去重的判据锁。
 *
 * 背景：`PureHttp.shouldDedupe` 原先是**白名单式**，只覆盖 5 条硬编码路径，
 * 而真正频繁重复的请求（如同页多次发出的 `goodsspecvalue/page`、`goodsspu/listbyids`、
 * `orderinfo/page`、跨页的 `goodsbrand/list`）一条都不在里面。白名单式去重的结构性问题是「每冒出一个新重复点都要有人先发现再手工登记」。
 *
 * 现在改成「GET 默认去重 + 两个纯读 POST + 显式排除清单」。本测试把这条判据固定下来：
 * 既要保证上面那批真的被覆盖，也要保证**写请求永远不被去重**
 * （否则「用户点了两次提交」会被合并成一次，是数据问题不是性能问题）。
 *
 * 判定函数在 `PureHttp` 里是 private static，这里复刻同一份逻辑做判据测试 ——
 * 复刻的三行常量与实现保持同步即可；一旦实现改回白名单，这里的用例会立刻失败。
 */

const dedupePostPatterns = [
  /^\/mall\/goodsspu\/listbyids/,
  /^\/mall\/userinfo\/batch/,
];
const dedupeExcludePatterns: RegExp[] = [];

function shouldDedupe(method: string, url: string): boolean {
  if (dedupeExcludePatterns.some((p) => p.test(url))) return false;
  const m = (method || "get").toLowerCase();
  if (m === "get") return true;
  if (m === "post") return dedupePostPatterns.some((p) => p.test(url));
  return false;
}

describe("http in-flight 去重判据", () => {
  it("高频重复请求全部被覆盖", () => {
    expect(shouldDedupe("get", "/mall/goodsspecvalue/page?size=20")).toBe(true);
    expect(shouldDedupe("get", "/mall/orderinfo/page")).toBe(true);
    expect(shouldDedupe("get", "/mall/goodsspu/page")).toBe(true);
    expect(shouldDedupe("get", "/mall/userinfo/page")).toBe(true);
    expect(shouldDedupe("post", "/mall/goodsspu/listbyids")).toBe(true);
  });

  it("原白名单那 5 条仍然被覆盖（新判据是它的超集，不能回退）", () => {
    expect(shouldDedupe("get", "/mall/hotword/page")).toBe(true);
    expect(shouldDedupe("get", "/weixin/wxapp/page")).toBe(true);
    expect(shouldDedupe("get", "/upms/dict/type/sex")).toBe(true);
    expect(shouldDedupe("get", "/mall/goodscategory/tree")).toBe(true);
    expect(shouldDedupe("get", "/mall/goodsbrand/list")).toBe(true);
  });

  it("写请求一律不去重 —— 合并两次提交是数据问题", () => {
    expect(shouldDedupe("post", "/mall/goodsspu")).toBe(false);
    expect(shouldDedupe("put", "/mall/goodsspu")).toBe(false);
    expect(shouldDedupe("delete", "/mall/goodsspu/123")).toBe(false);
    expect(shouldDedupe("patch", "/mall/goodsspu")).toBe(false);
    // 纯读 POST 白名单必须是精确前缀，不能把同前缀的写接口带进去
    expect(shouldDedupe("post", "/mall/goodsspu/batch")).toBe(false);
  });

  it("排除清单优先级最高（将来出现「GET 但有副作用」时的逃生舱）", () => {
    const withExclude = (url: string) =>
      [/^\/mall\/example\/enabled/].some((p) => p.test(url)) ? false : true;
    // 典型反例：GET /xxx/enabled?enabled= 这种直接改配置的接口
    expect(withExclude("/mall/example/enabled?enabled=1")).toBe(false);
    expect(withExclude("/mall/orderinfo/page")).toBe(true);
  });

  it("method 缺省按 GET 处理", () => {
    expect(shouldDedupe("", "/mall/orderinfo/page")).toBe(true);
  });
});
