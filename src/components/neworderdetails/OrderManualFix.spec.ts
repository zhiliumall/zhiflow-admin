/**
 * 订单详情「人工处理」入口：真实 ElementPlus 挂载，只桩接口、权限与 toast。
 * 覆盖：只有 LEGACY_INVALID 出标记与入口、无 mall:orderinfo:edit 不出按钮、
 * 必填没填不发请求、成功 emit('fixed') 并关窗、后端拒绝时原话留在弹窗里（弹窗不关）。
 */
import { flushPromises, mount } from "@vue/test-utils";
import ElementPlus from "element-plus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fixMock, permState, toast } = vi.hoisted(() => ({
  fixMock: vi.fn(),
  permState: { canEdit: true },
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock("@/api/mall/orderinfo", () => ({
  manualFixOrderState: fixMock,
}));

vi.mock("@/utils/permission", () => ({
  hasAnyPermission: (codes: readonly string[]) =>
    permState.canEdit && codes.includes("mall:orderinfo:edit"),
}));

vi.mock("@/components/overlay", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/overlay")>()),
  message: toast,
}));

// eslint-disable-next-line import/first
import OrderManualFix from "./OrderManualFix.vue";

const ORDER_ID = "1000000000000000001";

function mountFix(machineState: string | null | undefined) {
  return mount(OrderManualFix, {
    attachTo: document.body,
    props: { orderId: ORDER_ID, machineState },
    global: { plugins: [ElementPlus] },
  });
}

const dialog = () =>
  Array.from(document.body.querySelectorAll<HTMLElement>(".el-dialog")).find(
    (el) => el.textContent?.includes("人工处理订单状态"),
  ) ?? null;
const isDialogShown = () => {
  const d = dialog();
  return (
    !!d &&
    (d.closest(".el-overlay") as HTMLElement | null)?.style.display !== "none"
  );
};

async function openDialog(wrapper: ReturnType<typeof mountFix>) {
  await wrapper.find(".omf-btn").trigger("click");
  await flushPromises();
  expect(isDialogShown()).toBe(true);
}

async function chooseTarget(label: string) {
  const option = Array.from(
    document.body.querySelectorAll<HTMLElement>(".el-select-dropdown__item"),
  ).find((el) => el.textContent?.includes(label));
  expect(option, `下拉里应有「${label}」`).toBeTruthy();
  option!.click();
  await flushPromises();
}

async function typeReason(text: string) {
  const textarea = dialog()!.querySelector<HTMLTextAreaElement>(
    ".omf-reason textarea",
  )!;
  textarea.value = text;
  textarea.dispatchEvent(new Event("input"));
  await flushPromises();
}

async function submit() {
  dialog()!.querySelector<HTMLElement>(".omf-submit")!.click();
  await flushPromises();
}

/**
 * 字段下方的错误文案。EP 2.14 的 el-form-item 把 validateState 做了 100ms 防抖（refDebounced）
 * 才渲染 `.el-form-item__error`，所以要等过这 100ms 再读。
 * 只读 `.el-form-item__error`，不读整个弹窗文本——「请选择改后的状态」同时也是下拉的 placeholder。
 */
async function fieldErrors(): Promise<string[]> {
  await new Promise((r) => setTimeout(r, 150));
  await flushPromises();
  return Array.from(dialog()!.querySelectorAll(".el-form-item__error")).map(
    (el) => el.textContent?.trim() ?? "",
  );
}

beforeEach(() => {
  fixMock.mockReset();
  Object.values(toast).forEach((fn) => fn.mockReset());
  permState.canEdit = true;
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("人工处理入口可见性", () => {
  it.each(["COMPLETED", "PENDING_SHIP", "CANCELLED", "", null, undefined])(
    "machineState=%s：不出标记也不出按钮",
    (state) => {
      const wrapper = mountFix(state);
      expect(wrapper.find(".omf-tag").exists()).toBe(false);
      expect(wrapper.find(".omf-btn").exists()).toBe(false);
      wrapper.unmount();
    },
  );

  it("LEGACY_INVALID：出「状态异常」标记与「人工处理」按钮", () => {
    const wrapper = mountFix("LEGACY_INVALID");
    expect(wrapper.find(".omf-tag").text()).toBe("状态异常");
    expect(wrapper.find(".omf-btn").text()).toBe("人工处理");
    wrapper.unmount();
  });

  it("没有 mall:orderinfo:edit：只出标记，不出按钮", () => {
    permState.canEdit = false;
    const wrapper = mountFix("LEGACY_INVALID");
    expect(wrapper.find(".omf-tag").exists()).toBe(true);
    expect(wrapper.find(".omf-btn").exists()).toBe(false);
    wrapper.unmount();
  });
});

describe("人工处理弹窗", () => {
  it("下拉恰好 5 个合法目标状态（中文 + 枚举名），不含 LEGACY_INVALID", async () => {
    const wrapper = mountFix("LEGACY_INVALID");
    await openDialog(wrapper);
    const items = Array.from(
      document.body.querySelectorAll<HTMLElement>(".el-select-dropdown__item"),
    ).map((el) => el.textContent?.replace(/\s+/g, ""));
    expect(items).toEqual([
      "待付款PENDING_PAY",
      "待发货PENDING_SHIP",
      "待收货PENDING_RECEIVE",
      "已完成COMPLETED",
      "已取消CANCELLED",
    ]);
    wrapper.unmount();
  });

  it("必填没填不发请求，两处都提示", async () => {
    const wrapper = mountFix("LEGACY_INVALID");
    await openDialog(wrapper);
    // 对照：提交前没有任何字段错误
    expect(await fieldErrors()).toEqual([]);
    await submit();
    expect(fixMock).not.toHaveBeenCalled();
    expect(await fieldErrors()).toEqual([
      "请选择改后的状态",
      "请填写处理原因",
    ]);

    // 选了状态、原因全是空白：只剩原因报错，仍不发请求
    await chooseTarget("已完成");
    await typeReason("   ");
    await submit();
    expect(fixMock).not.toHaveBeenCalled();
    expect(await fieldErrors()).toEqual(["请填写处理原因"]);
    wrapper.unmount();
  });

  it("成功：按契约发请求（原因去首尾空白）、提示、关窗并 emit fixed", async () => {
    fixMock.mockResolvedValueOnce({
      code: 0,
      data: { from: "LEGACY_INVALID", to: "COMPLETED", logId: "9001" },
    });
    const wrapper = mountFix("LEGACY_INVALID");
    await openDialog(wrapper);
    await chooseTarget("已完成");
    await typeReason("  核对物流后已签收  ");
    await submit();

    expect(fixMock).toHaveBeenCalledTimes(1);
    expect(fixMock).toHaveBeenCalledWith(ORDER_ID, {
      targetState: "COMPLETED",
      reason: "核对物流后已签收",
    });
    expect(toast.success).toHaveBeenCalledWith("已人工处理为「已完成」");
    expect(wrapper.emitted("fixed")).toEqual([
      [{ from: "LEGACY_INVALID", to: "COMPLETED", logId: "9001" }],
    ]);
    expect(isDialogShown()).toBe(false);
    wrapper.unmount();
  });

  it("后端拒绝（拦截器以 msg reject）：原话留在弹窗里、弹窗不关、不 emit", async () => {
    const refusal = "订单当前状态不是 LEGACY_INVALID，不能人工处理";
    fixMock.mockRejectedValueOnce(refusal);
    const wrapper = mountFix("LEGACY_INVALID");
    await openDialog(wrapper);
    await chooseTarget("已取消");
    await typeReason("核对后应为已取消");
    await submit();

    expect(fixMock).toHaveBeenCalledWith(ORDER_ID, {
      targetState: "CANCELLED",
      reason: "核对后应为已取消",
    });
    expect(dialog()!.querySelector(".omf-server-error")?.textContent).toBe(
      refusal,
    );
    expect(isDialogShown()).toBe(true);
    expect(wrapper.emitted("fixed")).toBeUndefined();
    wrapper.unmount();
  });

  it("resolve 回来但 code != 0：同样当失败，toast 并留原话", async () => {
    fixMock.mockResolvedValueOnce({ code: 2, msg: "原因不能为空", data: null });
    const wrapper = mountFix("LEGACY_INVALID");
    await openDialog(wrapper);
    await chooseTarget("待发货");
    await typeReason("核对后应为待发货");
    await submit();

    expect(toast.error).toHaveBeenCalledWith("原因不能为空");
    expect(dialog()!.querySelector(".omf-server-error")?.textContent).toBe(
      "原因不能为空",
    );
    expect(isDialogShown()).toBe(true);
    expect(wrapper.emitted("fixed")).toBeUndefined();
    wrapper.unmount();
  });
});
