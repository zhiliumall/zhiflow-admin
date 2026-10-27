import { watch } from "vue";

/**
 * 页码越界自愈：当前页超出总页数时拉回末页并触发重取。
 *
 * 为什么需要：带删除的分页页面删除后通常是原地
 * `getPageF(page)`、页码不动。共 21 条 / 20 条每页时在第 2 页删掉唯一那一行 →
 * total 变 20、总页数变 1，而 currentPage 还是 2 → 列表空白、页脚照写「共 20 条」，
 * 高亮的页码 2 连页码条里都没有了，运营只能自己点回第 1 页。服务端筛选把结果缩小时同理
 * （原来停在第 5 页，筛完只剩 2 页）。
 *
 * 共享分页组件 `DcPager` 已内建同款兜底；
 * 本 hook 给**自绘分页器**的页面用 —— 它们没有共享组件可挂，逐个接这一行。
 *
 * 传 getter 而不是 ref，是因为各页的分页态形状不统一（`data.page` / `page` / `page.value`
 * / 独立 ref / `pagination`），字段名也有 `currentPage` 与 `current`、`pageSize` 与 `size`
 * 两套。getter 让调用方按自己的形状写，hook 不做任何假设。
 *
 * @param getTotal    总条数（服务端 total）
 * @param getCurrent  当前页码（1 起）
 * @param getPageSize 每页条数
 * @param goToPage    跳到指定页（通常就是页面现成的 onPageChange，内部会重新取数）
 *
 * @example
 * const totalPages = computed(() => Math.max(1, Math.ceil(data.page.total / data.page.pageSize)));
 * usePagerClamp(() => data.page.total, () => data.page.currentPage, () => data.page.pageSize, onPageChange);
 */
export function usePagerClamp(
  getTotal: () => number,
  getCurrent: () => number,
  getPageSize: () => number,
  goToPage: (page: number) => void,
): void {
  watch([getTotal, getCurrent, getPageSize], ([total, current, pageSize]) => {
    // total 为 0 是空列表 / 加载失败态，此时改页码只会把页面的分页态冲掉；
    // pageSize 非正说明分页态还没初始化完，别拿它算总页数。
    if (!(total > 0) || !(pageSize > 0)) return;
    const last = Math.max(1, Math.ceil(total / pageSize));
    if (current > last) goToPage(last);
  });
}
