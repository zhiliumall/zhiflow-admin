import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  user: { id: "admin" } as Record<string, unknown>,
}));

vi.mock("@/api/mall/largescreen", () => ({ getHomepageOverview: mocks.request }));
vi.mock("@/store/modules/user", () => ({ useUserStoreHook: () => ({ userInfo: mocks.user }) }));

const period = (gross: string) => ({ startAt: "", endAt: "", paidOrderCount: 1, grossPaidCashflow: gross, netSales: gross });
const overview = (gross = "10.00") => ({
  data: {
    timeZone: "Asia/Shanghai",
    generatedAt: "2026-01-01T00:00:00",
    today: period(gross),
    month: period(gross),
    cumulative: period(gross),
    users: { available: true, todayNewUserCount: 0, monthNewUserCount: 0, totalUserCount: 3 },
    dailyMetrics: [],
  },
});

describe("useHomepageOverview", () => {
  beforeEach(() => { vi.resetModules(); mocks.request.mockReset(); Object.assign(mocks.user, { id: "admin" }); });

  it("deduplicates concurrent requests and preserves an explicit error", async () => {
    let reject!: (reason: Error) => void;
    mocks.request.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
    const { useHomepageOverview } = await import("./useHomepageOverview");
    const state = useHomepageOverview();
    const first = state.load(); const duplicate = state.refresh();
    expect(mocks.request).toHaveBeenCalledTimes(1);
    reject(new Error("network")); await Promise.all([first, duplicate]);
    expect(state.error.value).toBeInstanceOf(Error);
    expect(state.data.value).toBeNull();
  });

  it("suppresses a stale response when the signed-in user changes", async () => {
    let resolveOld!: (value: ReturnType<typeof overview>) => void;
    mocks.request.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
    mocks.request.mockResolvedValueOnce(overview("22.00"));
    const { useHomepageOverview } = await import("./useHomepageOverview");
    const state = useHomepageOverview();
    const oldRequest = state.load();
    mocks.user.id = "other-admin";
    await state.load();
    resolveOld(overview("11.00")); await oldRequest;
    expect(state.data.value?.today.grossPaidCashflow).toBe("22.00");
    expect(state.data.value?.users.totalUserCount).toBe(3);
    expect(mocks.request).toHaveBeenCalledTimes(2);
  });
});
