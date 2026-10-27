/**
 * 手机号脱敏工具 —— 订单列表 / 待发货 / 售后等多页面共用。
 *
 * 脱敏规则：
 *   `phone.slice(0, 3) + '****' + phone.slice(-4)`（如 138****0013）。
 * 默认脱敏展示，点击眼形图标切换明文/脱敏，明文查看属于隐私合规动作，
 * 调用方如需审计记录请自行在 toggle 回调里补埋点，本工具只管展示态。
 */

/** 手机号脱敏：138****0013。非常规长度（测试号/占位号）原样返回，避免裁剪出乱码。 */
export function maskPhone(phone: string | null | undefined): string {
  const raw = String(phone ?? "").trim();
  if (!raw || raw.length < 7) return raw;
  return `${raw.slice(0, 3)}****${raw.slice(-4)}`;
}
