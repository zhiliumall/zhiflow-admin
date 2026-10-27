/**
 * 危险操作确认组件闸门逻辑
 * - 未输入指定名称 → 确认按钮 disabled
 * - 输入错误名称 → 仍 disabled
 * - 逐字输入正确名称 → enabled → 点击触发 confirm 回调（携带 typedName/impact/ts）
 * - 取消 → 触发 cancel，安全退出，不触发 confirm
 */
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import DangerConfirm from "./src/index.vue";

const REQUIRED = "批量下架";

/** el-dialog 内容在 onMounted 后一个 tick 才渲染（jsdom 同理），mount 后必须等一拍 */
async function mountDialog(extraProps: Record<string, unknown> = {}) {
  const wrapper = mount(DangerConfirm, {
    props: {
      modelValue: true,
      title: "危险操作确认",
      actionName: "批量下架商品",
      impact: "将下架 12 件商品，操作立即影响前台展示，不可撤销",
      requireTypedName: REQUIRED,
      ...extraProps,
    },
    attachTo: document.body,
  });
  await nextTick();
  return wrapper;
}

function confirmBtn(wrapper: Awaited<ReturnType<typeof mountDialog>>) {
  const btn = wrapper.find(".danger-confirm__confirm-btn");
  expect(btn.exists()).toBe(true);
  return btn;
}

describe("DangerConfirm", () => {
  it("展示操作名与影响面描述", async () => {
    const wrapper = await mountDialog();
    expect(wrapper.find(".danger-confirm__action").text()).toContain(
      "批量下架商品"
    );
    expect(wrapper.find(".danger-confirm__impact").text()).toContain(
      "不可撤销"
    );
    wrapper.unmount();
  });

  it("未输入指定名称时确认按钮 disabled", async () => {
    const wrapper = await mountDialog();
    expect(confirmBtn(wrapper).attributes("disabled")).toBeDefined();
    wrapper.unmount();
  });

  it("输入错误名称时仍 disabled，且不触发 confirm", async () => {
    const wrapper = await mountDialog();
    const input = wrapper.find(".danger-confirm__input input");
    expect(input.exists()).toBe(true);
    await input.setValue("SO9999999999999");
    expect(confirmBtn(wrapper).attributes("disabled")).toBeDefined();
    await confirmBtn(wrapper).trigger("click");
    expect(wrapper.emitted("confirm")).toBeUndefined();
    wrapper.unmount();
  });

  it("逐字输入正确名称后 enabled，点击触发 confirm 并携带 typedName/impact/ts", async () => {
    const wrapper = await mountDialog();
    const input = wrapper.find(".danger-confirm__input input");
    await input.setValue(REQUIRED);
    expect(confirmBtn(wrapper).attributes("disabled")).toBeUndefined();
    await confirmBtn(wrapper).trigger("click");
    const emitted = wrapper.emitted("confirm");
    expect(emitted).toHaveLength(1);
    const payload = emitted![0][0] as {
      typedName: string;
      impact: string;
      ts: number;
    };
    expect(payload.typedName).toBe(REQUIRED);
    expect(payload.impact).toContain("不可撤销");
    expect(typeof payload.ts).toBe("number");
    // 确认后弹窗应请求关闭
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([false]);
    wrapper.unmount();
  });

  it("requireTypedName 为空串时闸门保持关闭（防御：空匹配不得放行）", async () => {
    const wrapper = await mountDialog({ requireTypedName: "" });
    expect(confirmBtn(wrapper).attributes("disabled")).toBeDefined();
    wrapper.unmount();
  });

  it("取消触发 cancel 且不触发 confirm", async () => {
    const wrapper = await mountDialog();
    const cancel = wrapper.find(".danger-confirm__cancel-btn");
    expect(cancel.exists()).toBe(true);
    await cancel.trigger("click");
    expect(wrapper.emitted("cancel")).toHaveLength(1);
    expect(wrapper.emitted("confirm")).toBeUndefined();
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([false]);
    wrapper.unmount();
  });
});
