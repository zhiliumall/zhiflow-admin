/**
 * 弹窗与反馈体系 · 全站统一出口
 *
 * 视觉：src/style/overlay.scss（令牌 + 全站换皮，main.ts 末尾全局引入）
 *
 * 五件套：
 *   appConfirm           二次确认 L2（416 × 四意图，含带输入变体）
 *   appDangerConfirm     危险闸门 L3（460 逐字解锁，返回审计 payload）
 *   appPopConfirm        行内轻确认 L1（气泡）
 *   message              toast 单通道（固定时长 + grouping 去重）
 *   AppDrawer            列表编辑 / 详情抽屉（480 / 800 两档）
 *   useOptimisticToggle  开关契约
 *
 * ⚠️ 组件不做关键词猜测：intent 必须由调用方显式声明。未声明 → console.warn
 *    并回落原生 ElMessageBox（宁可样式旧，不可语义错）。
 */
export { default as AppDrawer } from "./AppDrawer.vue";
export {
  appConfirm,
  appDangerConfirm,
  appPopConfirm,
  type AppConfirmInput,
  type AppConfirmOptions,
  type AppGateOptions,
  type AppGateResult,
  type AppPopOptions,
} from "./confirm";
export { INTENT_RULE, type AppIntent } from "./intent";
export { errText, message, type AppMessageLevel } from "./message";
export {
  CONFIRM_WIDTH,
  DIALOG_WIDTH,
  DRAWER_SIZE,
  DRAWER_SIZE_LG,
  GATE_WIDTH,
} from "./sizes";
export {
  useOptimisticToggle,
  type OptimisticToggleOptions,
} from "./use-optimistic-toggle";
