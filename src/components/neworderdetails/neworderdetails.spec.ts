/**
 * 订单详情面板挂载冒烟 + 「人工处理」接线：真实 neworderdetails / OrderManualFix / ElementPlus，只桩接口与权限。
 * 抓的是「漏 import / setup 抛错 ⇒ 详情抽屉白屏」以及「machineState 没接到顶栏 / 成功后不通知宿主页重拉」。
 */
import { flushPromises, mount } from "@vue/test-utils";
import ElementPlus from "element-plus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fixMock } = vi.hoisted(() => ({ fixMock: vi.fn() }));

vi.mock("@/api/mall/orderinfo", () => ({
  putaddress: vi.fn(),
  orderCancel: vi.fn(),
  delivery: vi.fn(),
  manualFixOrderState: fixMock,
}));
vi.mock("@/api/upms/dict", () => ({
  remote: vi.fn(() => Promise.resolve({ data: [] })),
}));
vi.mock("@/utils/permission", () => ({
  hasAnyPermission: (codes: readonly string[]) =>
    codes.includes("mall:orderinfo:edit"),
}));

// eslint-disable-next-line import/first
import NewOrderDetails from "./neworderdetails.vue";

const baseOrder = {
  id: "1000000000000000001",
  orderNo: "1000000000000000002",
  status: "1",
  statusDesc: "待发货",
  isPay: "1",
  deliveryWay: "1",
  listOrderItem: [],
  listOrderRecord: [],
};

function mountDetails(infpData: Record<string, unknown>) {
  return mount(NewOrderDetails, {
    attachTo: document.body,
    props: { infpData },
    global: { plugins: [ElementPlus] },
  });
}

const topbar = (wrapper: ReturnType<typeof mountDetails>) =>
  wrapper.find(".odd-dc__topbar");

beforeEach(() => {
  fixMock.mockReset();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("订单详情面板 · 人工处理接线", () => {
  it("machineState 为合法状态（对照）：顶栏照常渲染，没有异常标记与人工处理", () => {
    const wrapper = mountDetails({
      ...baseOrder,
      machineState: "PENDING_SHIP",
    });
    expect(topbar(wrapper).text()).toContain("订单详情");
    expect(topbar(wrapper).text()).toContain("待发货");
    expect(wrapper.find(".omf-tag").exists()).toBe(false);
    expect(wrapper.find(".omf-btn").exists()).toBe(false);
    wrapper.unmount();
  });

  it("宿主页没挂 machineState：同样不出入口", () => {
    const wrapper = mountDetails({ ...baseOrder });
    expect(topbar(wrapper).text()).toContain("订单详情");
    expect(wrapper.find(".omf-btn").exists()).toBe(false);
    wrapper.unmount();
  });

  it("LEGACY_INVALID：顶栏出标记与按钮；成功后标记立刻消失并 emit reload(订单 id)", async () => {
    fixMock.mockResolvedValueOnce({
      code: 0,
      data: { from: "LEGACY_INVALID", to: "CANCELLED", logId: "77" },
    });
    const wrapper = mountDetails({
      ...baseOrder,
      machineState: "LEGACY_INVALID",
    });
    expect(topbar(wrapper).find(".omf-tag").text()).toBe("状态异常");

    await topbar(wrapper).find(".omf-btn").trigger("click");
    await flushPromises();
    Array.from(
      document.body.querySelectorAll<HTMLElement>(".el-select-dropdown__item"),
    )
      .find((el) => el.textContent?.includes("已取消"))!
      .click();
    await flushPromises();
    const textarea = document.body.querySelector<HTMLTextAreaElement>(
      ".omf-reason textarea",
    )!;
    textarea.value = "核对后应为已取消";
    textarea.dispatchEvent(new Event("input"));
    await flushPromises();
    document.body.querySelector<HTMLElement>(".omf-submit")!.click();
    await flushPromises();

    expect(fixMock).toHaveBeenCalledWith(baseOrder.id, {
      targetState: "CANCELLED",
      reason: "核对后应为已取消",
    });
    expect(wrapper.emitted("reload")).toEqual([[baseOrder.id]]);
    expect(wrapper.find(".omf-tag").exists()).toBe(false);
    expect(wrapper.find(".omf-btn").exists()).toBe(false);

    // 宿主页重拉后带回新状态：以宿主页为准
    await wrapper.setProps({
      infpData: {
        ...baseOrder,
        status: "5",
        statusDesc: "已取消",
        machineState: "CANCELLED",
      },
    });
    expect(topbar(wrapper).text()).toContain("已取消");
    expect(wrapper.find(".omf-tag").exists()).toBe(false);
    wrapper.unmount();
  });

  it("换一张单时清掉上一单的本地覆盖：新单若仍是 LEGACY_INVALID 要照常出入口", async () => {
    fixMock.mockResolvedValueOnce({
      code: 0,
      data: { from: "LEGACY_INVALID", to: "COMPLETED", logId: "78" },
    });
    const wrapper = mountDetails({
      ...baseOrder,
      machineState: "LEGACY_INVALID",
    });
    await wrapper.find(".omf-btn").trigger("click");
    await flushPromises();
    Array.from(
      document.body.querySelectorAll<HTMLElement>(".el-select-dropdown__item"),
    )
      .find((el) => el.textContent?.includes("已完成"))!
      .click();
    const textarea = document.body.querySelector<HTMLTextAreaElement>(
      ".omf-reason textarea",
    )!;
    textarea.value = "核对后已签收";
    textarea.dispatchEvent(new Event("input"));
    await flushPromises();
    document.body.querySelector<HTMLElement>(".omf-submit")!.click();
    await flushPromises();
    expect(wrapper.find(".omf-tag").exists()).toBe(false);

    await wrapper.setProps({
      infpData: {
        ...baseOrder,
        id: "2000000000000000001",
        machineState: "LEGACY_INVALID",
      },
    });
    expect(wrapper.find(".omf-tag").exists()).toBe(true);
    expect(wrapper.find(".omf-btn").exists()).toBe(true);
    wrapper.unmount();
  });
});

describe("订单详情面板 · 顶栏操作", () => {
  const buttons = (wrapper: ReturnType<typeof mountDetails>) =>
    topbar(wrapper).findAll("button").map((b) => b.text());

  it("待发货：出「去发货」，不出「取消订单」", () => {
    const wrapper = mountDetails({ ...baseOrder });
    expect(buttons(wrapper)).toContain("去发货");
    expect(buttons(wrapper)).not.toContain("取消订单");
    wrapper.unmount();
  });

  it("待付款（is_pay=0 且 status 为空）：出「取消订单」，不出「去发货」", () => {
    const wrapper = mountDetails({ ...baseOrder, status: null, statusDesc: "待付款", isPay: "0" });
    expect(buttons(wrapper)).toContain("取消订单");
    expect(buttons(wrapper)).not.toContain("去发货");
    wrapper.unmount();
  });

  it("已完成：两个都不出", () => {
    const wrapper = mountDetails({ ...baseOrder, status: "3", statusDesc: "已完成" });
    expect(buttons(wrapper)).not.toContain("取消订单");
    expect(buttons(wrapper)).not.toContain("去发货");
    wrapper.unmount();
  });
});
