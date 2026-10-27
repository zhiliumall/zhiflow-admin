import { describe, expect, it } from "vitest";
import { formatMoney } from "./decimal";

describe("formatMoney", () => {
  it("formats exact decimal strings without floating point conversion", () => {
    expect(formatMoney("12345678901234567890.50")).toBe("12,345,678,901,234,567,890.50");
    expect(formatMoney("-0.25")).toBe("-0.25");
    expect(formatMoney("0")).toBe("0.00");
  });
});
