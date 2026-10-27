/**
 * 图标库字形清单：判断一个图标名能不能渲染出来（菜单图标、图标选择器共用）。
 */
import icGlyphs from "@/assets/iconfont-ic/glyphs.json";
import menuGlyphs from "@/assets/iconfont-menu/glyphs.json";
import { OFFLINE_ICON_NAMES } from "./offlineIcon";

/** 通用线性图标（`ic_` 前缀） */
export const IC_GLYPHS: readonly string[] = icGlyphs;
/** 商城业务图标（`icon-` 前缀） */
export const MENU_GLYPHS: readonly string[] = menuGlyphs;

const SPRITE_SET = new Set<string>([...IC_GLYPHS, ...MENU_GLYPHS]);

/** 图标库里有这个 SVG symbol */
export function hasSpriteGlyph(name: string): boolean {
  return SPRITE_SET.has(name);
}

/** 这个 iconify 图标名已在本地注册 */
export function isOfflineIconRegistered(name: string): boolean {
  return OFFLINE_ICON_NAMES.has(name);
}
