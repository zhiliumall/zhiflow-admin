/**
 * 差错池的展示口径：类型 / 状态 / 处置结果文案、渠道名、金额与时间格式化。
 *
 * 与后端枚举一一对应（mall-common `trade/payexception/PayExceptionType`、`PayExceptionStatus`）。
 * 未知值一律原样显示，不吞成空白：后端加了新类型、前端还没跟上时，至少看得见代码。
 */
import dayjs from "dayjs";
import type { StatusTagType } from "@/const/statusDict";

export interface CodeLabel {
  value: string;
  label: string;
}

/** 差错类型（顺序即筛选下拉顺序） */
export const PAY_EXCEPTION_TYPES: readonly CodeLabel[] = [
  { value: "LATE_PAID", label: "取消后才到账" },
  { value: "DUP_PAY", label: "同一订单重复付款" },
  { value: "AMOUNT_MISMATCH", label: "到账金额与订单不符" },
];

/**
 * 处置状态。颜色语义沿用 statusDict 的口径（待处理=warning、完成=success、中性=info），
 * 红色只留给失败/删除，所以「待处理」不用红。
 */
export const PAY_EXCEPTION_STATUSES: readonly (CodeLabel & {
  tone: StatusTagType;
})[] = [
  { value: "OPEN", label: "待处理", tone: "warning" },
  { value: "RESOLVED", label: "已处理", tone: "success" },
];

/** 处理结果（resolution 列） */
const RESOLUTION_LABELS: Record<string, string> = {
  MANUAL_HANDLED: "人工在渠道后台处理",
};

/** 渠道码 = pay_config.type（与「支付配置」页同一套码） */
const CHANNEL_LABELS: Record<string, string> = {
  "1": "微信支付",
  "2": "支付宝",
};

const EMPTY = "—";

function isBlank(v: unknown): boolean {
  return v === null || v === undefined || String(v).trim() === "";
}

function labelOf(
  list: readonly CodeLabel[],
  code: string | null | undefined,
): string {
  if (isBlank(code)) return EMPTY;
  return list.find((x) => x.value === code)?.label ?? String(code);
}

export function payExceptionTypeLabel(type: string | null | undefined): string {
  return labelOf(PAY_EXCEPTION_TYPES, type);
}

export function payExceptionStatusLabel(
  status: string | null | undefined,
): string {
  return labelOf(PAY_EXCEPTION_STATUSES, status);
}

/** 未知状态落 info（灰），不猜成 warning */
export function payExceptionStatusTone(
  status: string | null | undefined,
): StatusTagType {
  return PAY_EXCEPTION_STATUSES.find((x) => x.value === status)?.tone ?? "info";
}

export function payExceptionResolutionLabel(
  resolution: string | null | undefined,
): string {
  if (isBlank(resolution)) return EMPTY;
  return RESOLUTION_LABELS[String(resolution)] ?? String(resolution);
}

export function payChannelLabel(
  channel: string | number | null | undefined,
): string {
  if (isBlank(channel)) return EMPTY;
  const code = String(channel).trim();
  return CHANNEL_LABELS[code] ?? `渠道 ${code}`;
}

/**
 * 最小单位金额 → 两位小数字符串（分/仙 → 元）。
 *
 * 走字符串拼接而不是 `/100`：amountMinor 是后端 Long，既可能是 number 也可能被序列化成字符串，
 * 字符串路径天然不丢精度；与后端 `BigDecimal.valueOf(minor, 2).toPlainString()` 同一写法（不加千分位）。
 * 非整数（脏数据）原样返回，不硬凑成金额。
 */
export function formatMinorAmount(
  amountMinor: number | string | null | undefined,
): string {
  if (isBlank(amountMinor)) return EMPTY;
  const raw = String(amountMinor).trim();
  if (!/^-?\d+$/.test(raw)) return raw;
  const negative = raw.startsWith("-");
  const digits = (negative ? raw.slice(1) : raw)
    .replace(/^0+(?=\d)/, "")
    .padStart(3, "0");
  const text = `${digits.slice(0, -2)}.${digits.slice(-2)}`;
  return negative && text !== "0.00" ? `-${text}` : text;
}

/** 金额 + 币种，如 `1280.00 CNY`；币种缺失时只给金额 */
export function formatMinorAmountWithCurrency(
  amountMinor: number | string | null | undefined,
  currency: string | null | undefined,
): string {
  const amount = formatMinorAmount(amountMinor);
  if (amount === EMPTY || isBlank(currency)) return amount;
  return `${amount} ${String(currency).trim().toUpperCase()}`;
}

/**
 * 时间列统一格式化成本地 `YYYY-MM-DD HH:mm:ss`。
 *
 * 差错池的时间列是 timestamptz（后端 OffsetDateTime），出参可能是带偏移的 ISO 串
 * （含微秒，如 `2026-09-26T10:15:30.123456+08:00` / `...Z`），也可能在序列化配置变化时变成
 * 纪元秒（小数）或毫秒数字；三种都按同一时刻落到浏览器本地时区。解析失败原样返回。
 */
export function formatDateTime(
  value: string | number | null | undefined,
): string {
  if (isBlank(value)) return EMPTY;
  let parsed: dayjs.Dayjs;
  if (typeof value === "number") {
    // < 1e11 视为秒（到 5138 年都成立），否则视为毫秒
    parsed = dayjs(value < 1e11 ? value * 1000 : value);
  } else {
    parsed = dayjs(value);
  }
  return parsed.isValid()
    ? parsed.format("YYYY-MM-DD HH:mm:ss")
    : String(value);
}
