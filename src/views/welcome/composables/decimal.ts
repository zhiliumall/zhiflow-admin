import type { DecimalString } from "@/api/mall/largescreen";

/** Formats an exact server decimal without converting it to a JS floating-point number. */
export function formatMoney(value: DecimalString): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return value;

  const [, sign, whole, fraction = ""] = match;
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${groupedWhole}.${fraction.padEnd(2, "0")}`;
}
