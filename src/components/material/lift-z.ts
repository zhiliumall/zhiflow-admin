import { useZIndex } from "element-plus";

/**
 * 「弹窗里再开素材库」的层级兜底。
 *
 * 不少页面的新建/编辑弹窗是自绘的（Teleport 到 body 的 position:fixed 遮罩，z-index 写死 2200 / 3000…），
 * 而素材库选择弹窗、删除确认框、富文本的「图」弹窗走 Element Plus 的全局自增 z-index（从 2000 起）。
 * 前者高于后者时，素材库开在遮罩下面——看得见点不到，点遮罩还会把两层一起关掉
 * （例如在新建商品品牌弹窗里选 Logo）。
 *
 * 做法：打开前量一下触发点所在的 position:fixed 祖先里最高的 z-index，
 * 把 EP 的自增计数器推到它之上；随后打开的 el-dialog / el-drawer / MessageBox / 下拉
 * 都从更高的值继续自增，层级天然正确，不需要逐个页面改写死值。
 *
 * 必须在 setup 里调用：useZIndex 要拿到和 EP 组件同一份计数器注入。
 */
export function fixedAncestorZIndex(el: Element | null | undefined): number {
  let max = 0;
  let cur: Element | null = el instanceof Element ? el : null;
  while (cur && cur !== document.body && cur !== document.documentElement) {
    const cs = getComputedStyle(cur);
    if (cs.position === "fixed") {
      const z = Number.parseInt(cs.zIndex, 10);
      if (Number.isFinite(z) && z > max) max = z;
    }
    cur = cur.parentElement;
  }
  return max;
}

export function useLiftAboveHost() {
  const { currentZIndex, nextZIndex } = useZIndex();
  /** 让下一次 nextZIndex() 一定大于锚点所在固定层；锚点不在固定层里时什么都不做。 */
  function liftAbove(anchor: Element | null | undefined) {
    const need = fixedAncestorZIndex(anchor);
    let guard = 0;
    while (currentZIndex.value < need && guard++ < 100000) nextZIndex();
  }
  return { liftAbove };
}
