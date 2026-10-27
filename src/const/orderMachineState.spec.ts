import { describe, expect, it } from "vitest";
import {
  LEGACY_INVALID,
  LEGACY_INVALID_LABEL,
  MANUAL_FIX_TARGET_STATES,
  isLegacyInvalid,
  isManualFixTarget,
  manualFixErrorMessage,
  orderMachineStateLabel,
  validateManualFixReason,
  validateManualFixTarget,
} from "./orderMachineState";

describe("人工处理目标状态", () => {
  it("恰好 5 个合法状态，与后端状态机枚举名一一对应，顺序即下拉顺序", () => {
    expect(MANUAL_FIX_TARGET_STATES.map((x) => x.value)).toEqual([
      "PENDING_PAY",
      "PENDING_SHIP",
      "PENDING_RECEIVE",
      "COMPLETED",
      "CANCELLED",
    ]);
    expect(MANUAL_FIX_TARGET_STATES.map((x) => x.label)).toEqual([
      "待付款",
      "待发货",
      "待收货",
      "已完成",
      "已取消",
    ]);
  });

  it("LEGACY_INVALID 本身不能作为目标", () => {
    expect(
      MANUAL_FIX_TARGET_STATES.some((x) => x.value === LEGACY_INVALID),
    ).toBe(false);
    expect(isManualFixTarget(LEGACY_INVALID)).toBe(false);
    expect(isManualFixTarget("COMPLETED")).toBe(true);
    expect(isManualFixTarget("completed")).toBe(false);
    expect(isManualFixTarget(undefined)).toBe(false);
  });
});

describe("isLegacyInvalid", () => {
  it("只有 LEGACY_INVALID 为真", () => {
    expect(isLegacyInvalid("LEGACY_INVALID")).toBe(true);
  });

  it("5 个合法状态、缺值、大小写不符一律为假（不出入口）", () => {
    for (const { value } of MANUAL_FIX_TARGET_STATES) {
      expect(isLegacyInvalid(value)).toBe(false);
    }
    expect(isLegacyInvalid(undefined)).toBe(false);
    expect(isLegacyInvalid(null)).toBe(false);
    expect(isLegacyInvalid("")).toBe(false);
    expect(isLegacyInvalid("legacy_invalid")).toBe(false);
  });
});

describe("orderMachineStateLabel", () => {
  it("合法状态给中文，LEGACY_INVALID 给异常标记文案", () => {
    expect(orderMachineStateLabel("PENDING_SHIP")).toBe("待发货");
    expect(orderMachineStateLabel("CANCELLED")).toBe("已取消");
    expect(orderMachineStateLabel(LEGACY_INVALID)).toBe(LEGACY_INVALID_LABEL);
    expect(LEGACY_INVALID_LABEL).toBe("状态异常");
  });

  it("未知值原样显示，空值给占位", () => {
    expect(orderMachineStateLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
    expect(orderMachineStateLabel(null)).toBe("—");
    expect(orderMachineStateLabel("  ")).toBe("—");
  });
});

describe("表单校验", () => {
  it("目标状态必选且必须合法", () => {
    expect(validateManualFixTarget("")).toBe("请选择改后的状态");
    expect(validateManualFixTarget(undefined)).toBe("请选择改后的状态");
    expect(validateManualFixTarget(LEGACY_INVALID)).toBe("目标状态不合法");
    expect(validateManualFixTarget("CANCELLED")).toBe("");
  });

  it("原因必填，全空白算没填", () => {
    expect(validateManualFixReason("")).toBe("请填写处理原因");
    expect(validateManualFixReason("   \n ")).toBe("请填写处理原因");
    expect(validateManualFixReason(undefined)).toBe("请填写处理原因");
    expect(validateManualFixReason("核对支付流水后应为已完成")).toBe("");
  });
});

describe("manualFixErrorMessage", () => {
  it("拦截器以 msg 字符串 reject（code === 1）", () => {
    expect(manualFixErrorMessage(" 订单当前状态不是 LEGACY_INVALID ")).toBe(
      "订单当前状态不是 LEGACY_INVALID",
    );
  });

  it("4xx/5xx 以响应对象 reject，取 data.msg", () => {
    expect(
      manualFixErrorMessage({
        status: 400,
        data: { code: 1, msg: "原因不能为空" },
      }),
    ).toBe("原因不能为空");
  });

  it("resolve 回来但 code != 0 的响应体，取 msg", () => {
    expect(
      manualFixErrorMessage({ code: 2, msg: "订单不存在", data: null }),
    ).toBe("订单不存在");
  });

  it("Error 实例（断网/超时英文串）与空 msg 回落兜底", () => {
    expect(manualFixErrorMessage(new Error("Network Error"))).toBe(
      "人工处理失败，请稍后重试",
    );
    expect(manualFixErrorMessage({ code: 1, msg: "" })).toBe(
      "人工处理失败，请稍后重试",
    );
    expect(manualFixErrorMessage(undefined, "兜底")).toBe("兜底");
  });
});
