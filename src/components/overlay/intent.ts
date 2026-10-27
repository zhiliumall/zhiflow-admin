/**
 * 全站 · 确认弹窗四意图定义
 *
 * 四张标准件：delete / danger / confirm / discard —— 图标 path 是固定形状，勿凭印象换。
 *
 * 意图由**调用方显式声明**，组件不做关键词猜测。
 * 配色在 src/style/overlay.scss 的 .app-confirm--{intent}，此处只管形状与按钮类名。
 */

export type AppIntent = "delete" | "danger" | "confirm" | "discard";

/** 选级规则（写死在这里，避免各页各判一套） */
export const INTENT_RULE: Record<AppIntent, string> = {
  delete: "物理删除 / 数据不可恢复",
  danger: "高风险可逆：停用 / 停业 / 结束 / 作废 / 资金流出",
  confirm: "普通业务确认：审核通过 / 导入 / 发布 / 提交",
  discard: "放弃未保存的编辑（主次反转）",
};

/** 24×24 viewBox 的 stroke path，fill:none · stroke-width:2 · linecap/linejoin:round */
export const INTENT_ICON_PATHS: Record<AppIntent, string[]> = {
  // 垃圾桶
  delete: ["M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"],
  // 电源（停用 / 结束）
  danger: ["M12 2v10", "M18.4 6.6a9 9 0 1 1-12.8 0"],
  // 导入 / 下载
  confirm: ["M12 3v12M7 10l5 5 5-5M4 21h16"],
  // 铅笔（未保存的编辑）
  discard: ["M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"],
};

/** 主按钮类名。皮肤见 src/style/overlay.scss 的 .app-confirm__ok--{intent} */
export const INTENT_OK_CLASS: Record<AppIntent, string> = {
  delete: "app-confirm__ok app-confirm__ok--delete",
  danger: "app-confirm__ok app-confirm__ok--danger",
  confirm: "app-confirm__ok app-confirm__ok--confirm",
  discard: "app-confirm__ok app-confirm__ok--discard",
};

/** delete 意图的主按钮文案固定「删除」（硬性规则，不接受调用方改写） */
export const FIXED_VERB: Partial<Record<AppIntent, string>> = {
  delete: "删除",
};
