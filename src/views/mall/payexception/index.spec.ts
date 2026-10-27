/**
 * 差错池页挂载冒烟：真实 DcTableShell / AppDrawer / ElementPlus，只桩接口与路由。
 * 抓的是「漏 import / setup 抛错 ⇒ 白屏」这一类（tsc 与 build 都拦不住）。
 * 待处理的差错在详情抽屉里只有一个按钮「标记已处理」，只给 mall:orderinfo:edit；
 * 必填备注（appConfirm 带输入），成功后重拉详情与列表。系统不自动退、不恢复订单、不销记。
 */
import { flushPromises, mount } from "@vue/test-utils";
import ElementPlus from "element-plus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reactive } from "vue";
import type { PayException } from "@/api/mall/payexception";

const { pageMock, getMock, pushMock, resolveMock, confirmMock, permState } = vi.hoisted(() => ({
  pageMock: vi.fn(),
  getMock: vi.fn(),
  pushMock: vi.fn(),
  resolveMock: vi.fn(),
  confirmMock: vi.fn(),
  permState: { canEdit: true },
}));

vi.mock("@/utils/permission", () => ({
  hasAnyPermission: (codes: string[]) => permState.canEdit && codes.includes("mall:orderinfo:edit"),
}));

vi.mock("@/components/overlay", async (orig) => {
  const real = await orig<typeof import("@/components/overlay")>();
  return {
    ...real,
    appConfirm: confirmMock,
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  };
});

vi.mock("@/api/mall/payexception", () => ({
  getPayExceptionPage: pageMock,
  getPayException: getMock,
  resolvePayException: resolveMock,
  // 真实实现的等价桩：拦截器对非 200 reject 的是带 status 的响应对象
  isPayExceptionEndpointMissing: (e: unknown) =>
    (e as { status?: number } | null)?.status === 404,
}));

const routeState = reactive<{ path: string; query: Record<string, string> }>({
  path: "/mall/payexception",
  query: {},
});
vi.mock("vue-router", () => ({
  useRoute: () => routeState,
  useRouter: () => ({ push: pushMock }),
}));

// eslint-disable-next-line import/first
import PayExceptionPage from "./index.vue";

const ROW: PayException = {
  id: "1970000000000000001",
  type: "LATE_PAID",
  status: "OPEN",
  orderId: "o-1",
  orderNo: "NO20260926001",
  channel: "1",
  channelTxnId: "WX-TXN-778899",
  amountMinor: 128000,
  currency: "CNY",
  dedupeKey: "LATE_PAID:1:WX-TXN-778899",
  detail:
    "订单已取消后才确认到账；订单不复活、库存权益不重扣。发现路径=CALLBACK",
  createTime: "2026-09-26T10:15:30.123456+08:00",
  updateTime: "2026-09-26T10:15:30.123456+08:00",
};

const pageOf = (records: PayException[]) => ({
  code: 0,
  data: { records, total: records.length, size: 20, current: 1 },
});

function mountPage() {
  return mount(PayExceptionPage, {
    attachTo: document.body,
    global: { plugins: [ElementPlus] },
  });
}

beforeEach(() => {
  pageMock.mockReset();
  getMock.mockReset();
  pushMock.mockReset();
  resolveMock.mockReset();
  confirmMock.mockReset();
  permState.canEdit = true;
  routeState.path = "/mall/payexception";
  routeState.query = {};
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("差错池页", () => {
  it("渲染列表：类型 / 状态 / 渠道 / 金额按口径翻译，顶部有阶段提示", async () => {
    pageMock.mockResolvedValue(pageOf([ROW]));
    const wrapper = mountPage();
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain("差错池");
    expect(text).toContain("标记已处理");
    expect(text).toContain("取消后才到账");
    expect(text).toContain("待处理");
    expect(text).toContain("微信支付");
    expect(text).toContain("1280.00 CNY");
    expect(text).toContain("NO20260926001");
    expect(pageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        current: 1,
        size: 20,
        type: "",
        status: "",
        orderNo: "",
      }),
    );
    wrapper.unmount();
  });

  it("列表不出写操作：没有主按钮，行操作只有「详情」（处置都在详情抽屉里，先看清再动）", async () => {
    pageMock.mockResolvedValue(pageOf([ROW]));
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.findAll(".dc-tbl__tool-btn")).toHaveLength(0);
    expect(wrapper.findAll(".dc-tbl__act").map((a) => a.text())).toEqual([
      "详情",
    ]);
    wrapper.unmount();
  });

  it("按订单号查询：去空格后带上，翻页沿用已生效条件", async () => {
    pageMock.mockResolvedValue(pageOf([ROW]));
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.find("input.dc-tbl__q").setValue("  NO20260926001 ");
    await wrapper.find(".dc-tbl__btn-search").trigger("click");
    await flushPromises();
    expect(pageMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ current: 1, orderNo: "NO20260926001" }),
    );
    wrapper.unmount();
  });

  it("端点 404：显示「暂不可用」而不是「暂无」", async () => {
    pageMock.mockRejectedValue({ status: 404, data: { msg: "资源不存在" } });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("暂不可用（差错池尚未在当前环境开放）");
    expect(wrapper.text()).not.toContain("暂无资金差错");
    wrapper.unmount();
  });

  it("对照：空列表显示「暂无资金差错」", async () => {
    pageMock.mockResolvedValue(pageOf([]));
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("暂无资金差错");
    wrapper.unmount();
  });

  it("深链 ?id=：进页即按 id 拉详情并打开抽屉，可跳订单", async () => {
    pageMock.mockResolvedValue(pageOf([ROW]));
    getMock.mockResolvedValue({ code: 0, data: ROW });
    routeState.query = { id: ROW.id };
    const wrapper = mountPage();
    await flushPromises();

    expect(getMock).toHaveBeenCalledWith(ROW.id);
    const drawer = document.body.querySelector(".el-drawer");
    expect(drawer?.textContent).toContain("差错详情");
    expect(drawer?.textContent).toContain("发现路径=CALLBACK");
    expect(drawer?.textContent).toContain("LATE_PAID:1:WX-TXN-778899");

    const link = Array.from(
      drawer?.querySelectorAll(".payexc-link") ?? [],
    ).find((el) => el.textContent === "查看订单") as HTMLElement | undefined;
    link?.click();
    expect(pushMock).toHaveBeenCalledWith({
      path: "/mall/order/orderinfo",
      query: { orderId: "o-1" },
    });
    wrapper.unmount();
  });

  it("keep-alive 下别的页面带 ?id= 不会顶出本页抽屉", async () => {
    pageMock.mockResolvedValue(pageOf([ROW]));
    const wrapper = mountPage();
    await flushPromises();

    routeState.path = "/mall/order/orderinfo";
    routeState.query = { id: "other-page-id" };
    await flushPromises();
    expect(getMock).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  async function openDrawerFor(row: PayException) {
    pageMock.mockResolvedValue(pageOf([row]));
    getMock.mockResolvedValue({ code: 0, data: row });
    routeState.query = { id: row.id };
    const wrapper = mountPage();
    await flushPromises();
    const drawer = document.body.querySelector(".el-drawer") as HTMLElement;
    const buttons = () =>
      Array.from(drawer.querySelectorAll(".payexc-actions__btn")).map((b) => b.textContent?.trim());
    const click = (label: string) =>
      (Array.from(drawer.querySelectorAll(".payexc-actions__btn")).find(
        (b) => b.textContent?.trim() === label,
      ) as HTMLElement).click();
    return { wrapper, drawer, buttons, click };
  }

  it("待处理的差错（各类型都一样）只有「标记已处理」一个按钮，没有退款 / 恢复订单 / 销记", async () => {
    const late = await openDrawerFor(ROW);
    expect(late.buttons()).toEqual(["标记已处理"]);
    late.wrapper.unmount();
    document.body.innerHTML = "";

    const dup = await openDrawerFor({ ...ROW, type: "DUP_PAY" });
    expect(dup.buttons()).toEqual(["标记已处理"]);
    dup.wrapper.unmount();
    document.body.innerHTML = "";

    const mismatch = await openDrawerFor({ ...ROW, type: "AMOUNT_MISMATCH" });
    expect(mismatch.buttons()).toEqual(["标记已处理"]);
    mismatch.wrapper.unmount();
  });

  it("没有 mall:orderinfo:edit、或已处理的差错：不出按钮", async () => {
    permState.canEdit = false;
    const noPerm = await openDrawerFor(ROW);
    expect(noPerm.buttons()).toEqual([]);
    noPerm.wrapper.unmount();
    document.body.innerHTML = "";

    permState.canEdit = true;
    const done = await openDrawerFor({ ...ROW, status: "RESOLVED", resolution: "MANUAL_HANDLED", resolveReason: "已在微信商户后台退款" });
    expect(done.buttons()).toEqual([]);
    expect(done.drawer.textContent).toContain("人工在渠道后台处理");
    expect(done.drawer.textContent).toContain("已在微信商户后台退款");
    done.wrapper.unmount();
  });

  it("标记已处理：备注必填（取消弹窗不调接口），填了去空格后调接口，成功后重拉详情与列表", async () => {
    const d = await openDrawerFor(ROW);
    confirmMock.mockRejectedValueOnce("cancel");
    d.click("标记已处理");
    await flushPromises();
    expect(resolveMock).not.toHaveBeenCalled();

    confirmMock.mockResolvedValueOnce({ value: "  已在微信商户后台原路退款 R123  " });
    resolveMock.mockResolvedValueOnce({ code: 0, data: true });
    const listCalls = pageMock.mock.calls.length;
    d.click("标记已处理");
    await flushPromises();
    expect(resolveMock).toHaveBeenCalledWith(ROW.id, "已在微信商户后台原路退款 R123");
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(pageMock.mock.calls.length).toBeGreaterThan(listCalls);
    d.wrapper.unmount();
  });
});
