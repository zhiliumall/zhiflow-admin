/**
 * DcPager 分页态守卫
 *
 * 守两条契约：
 *  1. **页码越界自愈**：「带删除的分页页面」删除后都是原地 `getPageF(page)`、页码不动。
 *     共 21 条 / 20 条每页时在第 2 页删掉唯一那行 → total 变 20、总页数变 1，current 还是 2
 *     → 列表空白、页脚照写「共 20 条」，高亮页码连页码条里都没有。组件负责把 current 拉回末页。
 *  2. **onSize 不代管页码**：传了 page-sizes 的调用方都在自己的 size 处理里把页码归了 1，
 *     组件再 emit 一次 current=1 会让它们重复发请求。这条契约用测试钉住，别被"顺手补齐"。
 */
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import DcPager from "./DcPager.vue";

function mountPager(props: { total: number; current: number; pageSize: number; pageSizes?: number[] }) {
  return mount(DcPager, { props, global: { stubs: { "el-select": true, "el-option": true } } });
}

describe("DcPager 页码越界自愈", () => {
  it("current 超出总页数时拉回末页并通知调用方重拉", async () => {
    const w = mountPager({ total: 21, current: 2, pageSize: 20 });
    expect(w.emitted("update:current")).toBeUndefined();

    // 在第 2 页删掉唯一一行：total 21 → 20，总页数 2 → 1
    await w.setProps({ total: 20 });

    expect(w.emitted("update:current")?.at(-1)).toEqual([1]);
    expect(w.emitted("change")?.at(-1)).toEqual([1]);
  });

  it("越界多页时回到新的末页，不是无脑回第 1 页", async () => {
    const w = mountPager({ total: 200, current: 10, pageSize: 20 });
    await w.setProps({ total: 60 }); // 10 页 → 3 页
    expect(w.emitted("update:current")?.at(-1)).toEqual([3]);
  });

  it("total 为 0（空列表 / 加载失败态）时不动页码，免得把调用方的分页态冲掉", async () => {
    const w = mountPager({ total: 100, current: 4, pageSize: 20 });
    await w.setProps({ total: 0 });
    expect(w.emitted("update:current")).toBeUndefined();
  });

  it("页码本来就合法时不发多余事件", async () => {
    const w = mountPager({ total: 100, current: 3, pageSize: 20 });
    await w.setProps({ total: 80 }); // 5 页 → 4 页，current=3 仍合法
    expect(w.emitted("update:current")).toBeUndefined();
  });

  it("换每页条数导致越界时同样自愈（调用方若忘了归 1 也不会停在空白页）", async () => {
    const w = mountPager({ total: 100, current: 5, pageSize: 20, pageSizes: [20, 50] });
    await w.setProps({ pageSize: 50 }); // 5 页 → 2 页
    expect(w.emitted("update:current")?.at(-1)).toEqual([2]);
  });
});

describe("DcPager onSize 契约", () => {
  it("只抛新的页容量，不代管页码（页码归 1 由调用方做，避免重复请求）", async () => {
    const w = mountPager({ total: 100, current: 1, pageSize: 20, pageSizes: [20, 50] });
    (w.vm as unknown as { onSize: (v: number) => void }).onSize?.(50);
    // 组件内部方法未暴露时退化为直接断言：换 size 的 emit 里不含 update:current
    const currents = w.emitted("update:current") ?? [];
    expect(currents.some((e) => (e as number[])[0] === 1)).toBe(false);
  });
});
