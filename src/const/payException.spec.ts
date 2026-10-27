import { describe, expect, it } from "vitest";
import {
  PAY_EXCEPTION_STATUSES,
  PAY_EXCEPTION_TYPES,
  formatDateTime,
  formatMinorAmount,
  formatMinorAmountWithCurrency,
  payChannelLabel,
  payExceptionResolutionLabel,
  payExceptionStatusLabel,
  payExceptionStatusTone,
  payExceptionTypeLabel,
} from "./payException";

describe("差错类型 / 状态文案", () => {
  it("三类差错，与后端 PayExceptionType 枚举名一致", () => {
    expect(PAY_EXCEPTION_TYPES.map((x) => x.value)).toEqual(["LATE_PAID", "DUP_PAY", "AMOUNT_MISMATCH"]);
    expect(payExceptionTypeLabel("LATE_PAID")).toBe("取消后才到账");
    expect(payExceptionTypeLabel("DUP_PAY")).toBe("同一订单重复付款");
    expect(payExceptionTypeLabel("AMOUNT_MISMATCH")).toBe("到账金额与订单不符");
  });

  it("两种状态：待处理 / 已处理（后端只做 OPEN → RESOLVED）", () => {
    expect(PAY_EXCEPTION_STATUSES.map((x) => x.value)).toEqual(["OPEN", "RESOLVED"]);
    expect(payExceptionStatusLabel("OPEN")).toBe("待处理");
    expect(payExceptionStatusLabel("RESOLVED")).toBe("已处理");
  });

  it("未知值原样显示，空值给占位，不吞成空白", () => {
    expect(payExceptionTypeLabel("ORPHAN_PAID")).toBe("ORPHAN_PAID");
    expect(payExceptionStatusLabel("")).toBe("—");
    expect(payExceptionTypeLabel(null)).toBe("—");
    expect(payExceptionResolutionLabel("MANUAL_HANDLED")).toBe("人工在渠道后台处理");
    expect(payExceptionResolutionLabel("SOMETHING")).toBe("SOMETHING");
    expect(payExceptionResolutionLabel(undefined)).toBe("—");
  });

  it("状态色：待处理不用红（红只留给失败/删除），未知落灰", () => {
    expect(payExceptionStatusTone("OPEN")).toBe("warning");
    expect(payExceptionStatusTone("RESOLVED")).toBe("success");
    expect(payExceptionStatusTone("???")).toBe("info");
  });
});

describe("渠道名", () => {
  it("按 pay_config.type 翻译，未知码带原码", () => {
    expect(payChannelLabel("1")).toBe("微信支付");
    expect(payChannelLabel(2)).toBe("支付宝");
    expect(payChannelLabel("99")).toBe("渠道 99");
    expect(payChannelLabel(null)).toBe("—");
  });
});

describe("最小单位金额", () => {
  it("分 → 两位小数，number 与字符串同结果", () => {
    expect(formatMinorAmount(128000)).toBe("1280.00");
    expect(formatMinorAmount("128000")).toBe("1280.00");
    expect(formatMinorAmount(1)).toBe("0.01");
    expect(formatMinorAmount(10)).toBe("0.10");
    expect(formatMinorAmount(0)).toBe("0.00");
    expect(formatMinorAmount(1005)).toBe("10.05");
  });

  it("负数与前导零", () => {
    expect(formatMinorAmount(-150)).toBe("-1.50");
    expect(formatMinorAmount("-5")).toBe("-0.05");
    expect(formatMinorAmount("-0")).toBe("0.00");
    expect(formatMinorAmount("000123")).toBe("1.23");
  });

  it("超过 2^53 的字符串也不丢精度", () => {
    expect(formatMinorAmount("90071992547409931")).toBe("900719925474099.31");
  });

  it("空值给占位，脏数据原样返回", () => {
    expect(formatMinorAmount(null)).toBe("—");
    expect(formatMinorAmount("")).toBe("—");
    expect(formatMinorAmount("12.5")).toBe("12.5");
  });

  it("金额 + 币种", () => {
    expect(formatMinorAmountWithCurrency(128000, "CNY")).toBe("1280.00 CNY");
    expect(formatMinorAmountWithCurrency(99, "cny")).toBe("0.99 CNY");
    expect(formatMinorAmountWithCurrency(99, null)).toBe("0.99");
    expect(formatMinorAmountWithCurrency(null, "CNY")).toBe("—");
  });
});

describe("时间格式化", () => {
  const SHAPE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

  it("带偏移的 ISO 串（含微秒）/ UTC Z / 纪元秒 / 毫秒 落到同一个本地时刻", () => {
    const a = formatDateTime("2026-09-26T10:15:30+08:00");
    expect(a).toMatch(SHAPE);
    expect(formatDateTime("2026-09-26T10:15:30.123456+08:00")).toBe(a);
    expect(formatDateTime("2026-09-26T02:15:30Z")).toBe(a);
    const epochSeconds = Date.UTC(2026, 8, 26, 2, 15, 30) / 1000;
    expect(formatDateTime(epochSeconds)).toBe(a);
    expect(formatDateTime(epochSeconds * 1000)).toBe(a);
  });

  it("空值给占位，解析不了原样返回", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("")).toBe("—");
    expect(formatDateTime("not-a-date")).toBe("not-a-date");
  });
});
