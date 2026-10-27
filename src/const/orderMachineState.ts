/**
 * 订单状态机状态的展示口径与「人工处理」弹窗的纯逻辑。
 *
 * 后端 `GET /mall/orderinfo/{id}` 在 `data.machineState` 里给出枚举名（后端 OrderState）。其中 LEGACY_INVALID 表示
 * 库里的 status / is_pay 拼出了一个状态机里不存在的组合，只能人工改到下面 5 个合法状态之一
 * （`PUT /mall/orderinfo/{id}/manual-fix`）。其余 5 个状态都不出「人工处理」入口。
 */

export interface MachineStateOption {
  value: string;
  label: string;
}

export const LEGACY_INVALID = "LEGACY_INVALID";

/** 人工处理可选的目标状态（顺序即下拉顺序，按订单生命周期排） */
export const MANUAL_FIX_TARGET_STATES: readonly MachineStateOption[] = [
  { value: "PENDING_PAY", label: "待付款" },
  { value: "PENDING_SHIP", label: "待发货" },
  { value: "PENDING_RECEIVE", label: "待收货" },
  { value: "COMPLETED", label: "已完成" },
  { value: "CANCELLED", label: "已取消" },
];

export const LEGACY_INVALID_LABEL = "状态异常";

/** 只有 LEGACY_INVALID 才出「状态异常」标记与「人工处理」入口；缺值 / 其它状态一律不出 */
export function isLegacyInvalid(machineState: unknown): boolean {
  return machineState === LEGACY_INVALID;
}

/** 是否是可以作为人工处理目标的合法状态（LEGACY_INVALID 与未知值都不是） */
export function isManualFixTarget(value: unknown): boolean {
  return MANUAL_FIX_TARGET_STATES.some((x) => x.value === value);
}

/** 状态机状态中文；未知值原样返回，空值给占位 */
export function orderMachineStateLabel(
  state: string | null | undefined,
): string {
  if (state === null || state === undefined || String(state).trim() === "")
    return "—";
  if (state === LEGACY_INVALID) return LEGACY_INVALID_LABEL;
  return (
    MANUAL_FIX_TARGET_STATES.find((x) => x.value === state)?.label ??
    String(state)
  );
}

/** 目标状态校验：返回错误文案，合法返回空串 */
export function validateManualFixTarget(value: unknown): string {
  if (value === null || value === undefined || value === "")
    return "请选择改后的状态";
  return isManualFixTarget(value) ? "" : "目标状态不合法";
}

/** 原因校验：必填、不能全是空白（后端同样拒绝空原因） */
export function validateManualFixReason(reason: unknown): string {
  return typeof reason === "string" && reason.trim() !== ""
    ? ""
    : "请填写处理原因";
}

/**
 * 从请求失败里取后端原话。
 * 拦截器对 `code === 1` 以 msg 字符串 reject，对 4xx/5xx 以响应对象（`data.msg`）reject；
 * 万一 resolve 了但 code != 0，调用方把整个响应体传进来也能取到 msg。
 * Error 实例（断网 / 超时，message 是 `Network Error` 这类英文技术串）不直出，回落兜底文案。
 */
export function manualFixErrorMessage(
  error: unknown,
  fallback = "人工处理失败，请稍后重试",
): string {
  let msg: unknown;
  if (typeof error === "string") {
    msg = error;
  } else if (error && typeof error === "object" && !(error instanceof Error)) {
    const e = error as { msg?: unknown; data?: { msg?: unknown } | null };
    msg = e.data?.msg ?? e.msg;
  }
  return typeof msg === "string" && msg.trim() !== "" ? msg.trim() : fallback;
}
