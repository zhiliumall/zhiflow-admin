/**
 * 尺寸枚举（与 src/style/overlay.scss 的 --overlay-w-* 一一对应）
 *
 * 单独一个文件是为了避免循环依赖：AppDrawer.vue 只需要尺寸常量，
 * 从 overlay/index.ts 取会连带拉进 confirm.ts → 又 import 回 components/。
 *
 * 抽屉 480 / 800；弹窗 s|m|l|xl = 420/560/800/1040。
 * 页面里禁止再写 px 字面量。
 */
export const DRAWER_SIZE = 480;
export const DRAWER_SIZE_LG = 800;

export const DIALOG_WIDTH = {
  s: 420,
  m: 560,
  l: 800,
  xl: 1040,
} as const;

export const CONFIRM_WIDTH = 416;
export const GATE_WIDTH = 460;
