/**
 * 「弹窗里再开素材库」层级兜底回归测试。
 *
 * 场景：新建商品品牌弹窗（自绘遮罩 z-index 2200）里点「上传图片」，
 * 素材库 el-dialog 拿到的是 EP 自增的 ~2050，开在遮罩下面点不到。
 * 盯死：打开前 liftAbove(触发点) 之后，EP 下一次 nextZIndex() 必须高于宿主遮罩。
 */
import { useZIndex } from "element-plus";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { fixedAncestorZIndex, useLiftAboveHost } from "./lift-z";

function fixedHost(z: number) {
  const mask = document.createElement("div");
  mask.style.position = "fixed";
  mask.style.zIndex = String(z);
  const inner = document.createElement("div");
  inner.style.position = "relative";
  inner.style.zIndex = "99999"; // 非 fixed 的局部层级不算
  const anchor = document.createElement("span");
  inner.appendChild(anchor);
  mask.appendChild(inner);
  document.body.appendChild(mask);
  return { mask, anchor };
}

describe("lift-z", () => {
  it("只取 position:fixed 祖先的 z-index", () => {
    const { mask, anchor } = fixedHost(2200);
    expect(fixedAncestorZIndex(anchor)).toBe(2200);
    mask.remove();
    const loose = document.createElement("div");
    document.body.appendChild(loose);
    expect(fixedAncestorZIndex(loose)).toBe(0);
    loose.remove();
  });

  it("liftAbove 之后 EP 下一个弹窗层级高于宿主遮罩；不在遮罩里则不动计数器", () => {
    const { mask, anchor } = fixedHost(2200);
    let api: { liftAbove: (el: Element | null) => void } | null = null;
    let zi: ReturnType<typeof useZIndex> | null = null;
    mount(
      defineComponent({
        setup() {
          api = useLiftAboveHost();
          zi = useZIndex();
          return () => h("div");
        },
      }),
    );
    api!.liftAbove(anchor);
    expect(zi!.nextZIndex()).toBeGreaterThan(2200);

    const before = zi!.currentZIndex.value;
    const loose = document.createElement("div");
    document.body.appendChild(loose);
    api!.liftAbove(loose);
    expect(zi!.currentZIndex.value).toBe(before);
    loose.remove();
    mask.remove();
  });
});
