/**
 * usePagerClamp 单测
 *
 * 与 DcPager.spec.ts 守的是同一条契约，只是这份服务于自绘分页器的页面：
 * 「删空当前页 / 筛窄结果后停在越界页」必须自愈，且不能在空列表态乱动页码。
 */
import { nextTick, reactive } from "vue";
import { describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";

import { usePagerClamp } from "./usePagerClamp";

/** watch 需要活跃的 effect scope（真实用法是在 setup 里调用） */
function inScope(fn: () => void) {
  const scope = effectScope();
  scope.run(fn);
  return scope;
}

function setup(init: { total: number; currentPage: number; pageSize: number }) {
  const page = reactive({ ...init });
  const go = vi.fn((p: number) => {
    page.currentPage = p;
  });
  inScope(() =>
    usePagerClamp(() => page.total, () => page.currentPage, () => page.pageSize, go),
  );
  return { page, go };
}

describe("usePagerClamp", () => {
  it("末页删掉最后一行后回退一页", async () => {
    const { page, go } = setup({ total: 21, currentPage: 2, pageSize: 20 });
    page.total = 20; // 删掉一行
    await nextTick();
    expect(go).toHaveBeenCalledWith(1);
    expect(page.currentPage).toBe(1);
  });

  it("越界多页时回新末页，不是无脑回第 1 页", async () => {
    const { page, go } = setup({ total: 200, currentPage: 10, pageSize: 20 });
    page.total = 60;
    await nextTick();
    expect(go).toHaveBeenCalledWith(3);
  });

  it("total 归 0（空列表 / 加载失败）时不动页码", async () => {
    const { page, go } = setup({ total: 100, currentPage: 4, pageSize: 20 });
    page.total = 0;
    await nextTick();
    expect(go).not.toHaveBeenCalled();
    expect(page.currentPage).toBe(4);
  });

  it("页码仍在范围内时不动", async () => {
    const { page, go } = setup({ total: 100, currentPage: 3, pageSize: 20 });
    page.total = 80;
    await nextTick();
    expect(go).not.toHaveBeenCalled();
  });

  it("换每页条数导致越界也自愈", async () => {
    const { page, go } = setup({ total: 100, currentPage: 5, pageSize: 20 });
    page.pageSize = 50;
    await nextTick();
    expect(go).toHaveBeenCalledWith(2);
  });

  it("pageSize 还没初始化（0）时不算总页数，避免除零后把页码打到 1", async () => {
    const { page, go } = setup({ total: 100, currentPage: 5, pageSize: 0 });
    page.total = 120;
    await nextTick();
    expect(go).not.toHaveBeenCalled();
  });

  it("自愈只发生一次，不会反复回调（回到末页后就稳定了）", async () => {
    const { page, go } = setup({ total: 200, currentPage: 10, pageSize: 20 });
    page.total = 60;
    await nextTick();
    await nextTick();
    expect(go).toHaveBeenCalledTimes(1);
  });
});
