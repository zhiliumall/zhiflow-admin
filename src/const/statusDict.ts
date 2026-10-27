import { useI18n } from "@/locales/setupI18n";

const { $t } = useI18n();

/**
 * 统一状态字典
 * 铁律：同一状态枚举全后台同一颜色——状态→颜色只允许经过本文件，
 * 禁止任何页面自建状态色表。
 *
 * 颜色语义：
 *   进行中/待处理 → warning（--zf-status-warning 橙）
 *   完成/成功     → success（--zf-status-success 品牌绿）
 *   关闭/取消/中性 → info（--zf-status-info 灰）
 *   失败          → danger（--zf-status-danger 红，红只用于失败/删除）
 */

export type StatusTagType = "success" | "warning" | "danger" | "info" | "primary";

export interface StatusEntry {
  i18nKey: string;
  tagType: StatusTagType;
}

/** tagType → CSS 变量（彩点/彩字场景用，禁止另写 hex） */
export const STATUS_TAG_COLOR: Record<StatusTagType, string> = {
  success: "var(--zf-status-success)",
  warning: "var(--zf-status-warning)",
  danger: "var(--zf-status-danger)",
  info: "var(--zf-status-info)",
  primary: "var(--zf-green)",
};

const UNKNOWN_ENTRY: StatusEntry = { i18nKey: "statusDict.unknown", tagType: "info" };

/**
 * domain 说明：
 *   order  商城订单（后端 OrderInfoEnum：0 待付款 / 1 待发货 / 2 待收货 / 3 已完成 / 5 已取消）
 */
const STATUS_DICT: Record<"order", Record<string, StatusEntry>> = {
  order: {
    "0": { i18nKey: "statusDict.order.unpaid", tagType: "warning" },
    "1": { i18nKey: "statusDict.order.toShip", tagType: "warning" },
    "2": { i18nKey: "statusDict.order.toReceive", tagType: "warning" },
    "3": { i18nKey: "statusDict.order.completed", tagType: "success" },
    "5": { i18nKey: "statusDict.order.cancelled", tagType: "info" },
  },
};

export type StatusDomain = keyof typeof STATUS_DICT;

export function getStatusEntry(
  domain: StatusDomain,
  code: string | number | null | undefined,
): StatusEntry {
  if (code === null || code === undefined || code === "") return UNKNOWN_ENTRY;
  return STATUS_DICT[domain][String(code)] ?? UNKNOWN_ENTRY;
}

/** 统一出口：状态 → { label（已翻译）, tagType（el-tag 用）, color（彩点/彩字用） } */
export function getStatusTag(
  domain: StatusDomain,
  code: string | number | null | undefined,
): { label: string; tagType: StatusTagType; color: string } {
  const entry = getStatusEntry(domain, code);
  return {
    label: $t(entry.i18nKey),
    tagType: entry.tagType,
    color: STATUS_TAG_COLOR[entry.tagType],
  };
}
