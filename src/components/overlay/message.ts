/**
 * 全站 · 消息提示单通道
 *
 * message() 单通道 · 去重默认开 · success 2s / warning 3s / error 4s
 *
 * 替代页面里直接调 ElMessage / $message：调用签名与 ElMessage.<level>(text) 完全一致，
 * 迁移是纯机械改写，不动任何业务文案与调用时机。
 *
 * ⚠️ ElMessage 挂 body 且无作用域，样式只能靠 customClass 下发（见 .app-toast），
 *    禁止为它写全局覆盖 —— 会外溢到所有页面。
 * 去重用 EP 原生 grouping：同 type + 同文案合并成一条并带 ×N 计数，不自研。
 */
import {
  ElMessage,
  type MessageHandler,
  type MessageOptions,
} from "element-plus";

export type AppMessageLevel = "success" | "info" | "warning" | "error";

/** 时长按级别固定，不再各页各写 2000/3000/5000 */
const DURATION: Record<AppMessageLevel, number> = {
  success: 2000,
  info: 2000,
  warning: 3000,
  error: 4000,
};

type AppMessageOptions = Partial<Omit<MessageOptions, "type" | "message">>;

function show(
  type: AppMessageLevel,
  text: string,
  opts: AppMessageOptions = {},
): MessageHandler {
  return ElMessage({
    type,
    message: text,
    duration: DURATION[type],
    grouping: true,
    customClass: "app-toast",
    ...opts,
  });
}

export const message = {
  success: (text: string, opts?: AppMessageOptions) =>
    show("success", text, opts),
  info: (text: string, opts?: AppMessageOptions) => show("info", text, opts),
  warning: (text: string, opts?: AppMessageOptions) =>
    show("warning", text, opts),
  error: (text: string, opts?: AppMessageOptions) => show("error", text, opts),
};

/**
 * 错误文案兜底：拦截英文技术错误与状态码拼接
 * （`Network Error` / `timeout of 10000ms exceeded` / `424登录已过期` 这类不能直出给用户）。
 * 后端返回的中文业务错误原样放行，其余一律回落调用方给的中文兜底。
 *
 * 注：更彻底的做法是在请求层做白名单映射，这里只做页面级的最后一道拦截。
 */
export function errText(raw: unknown, fallback: string): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return fallback;
  return /[一-龥]/.test(s) && !/^\d{3}/.test(s) ? s : fallback;
}
