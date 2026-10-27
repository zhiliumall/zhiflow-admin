/** 通用图标库字形前缀（src/assets/iconfont-ic） */
export const ICON_GLYPH_PREFIX = "ic_";
/** 商城业务图标库字形前缀（src/assets/iconfont-menu） */
export const MENU_GLYPH_PREFIX = "icon-";

/** 是否为图标库里的 SVG symbol（按 `<use href="#名字">` 渲染） */
export function isSpriteIcon(name: string | undefined | null): boolean {
  return (
    typeof name === "string" &&
    (name.startsWith(ICON_GLYPH_PREFIX) || name.startsWith(MENU_GLYPH_PREFIX))
  );
}

/** 规范化图标名：去掉首尾空白 */
export function normalizeIconName<T extends string | undefined | null>(name: T): T {
  return (typeof name === "string" ? name.trim() : name) as T;
}
