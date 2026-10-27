/**
 * 侧栏菜单图标兜底：菜单在后端种子里没有图标、或图标名在图标库里找不到时，按菜单标题取一个本地线性图标。
 * 线条规格：24×24 viewBox，stroke=currentColor，round linecap/linejoin；颜色由外层 CSS 的 color 决定。
 */

/** 本表支持的图标名（新增图标 = 在 LUCIDE_PATHS 里加一条，类型自动扩展） */
export type LucideIconName = keyof typeof LUCIDE_PATHS;

/** 线性图标路径库（24×24 viewBox），每项是一组 `<path d>` */
export const LUCIDE_PATHS = {
  "circle-dot": [
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
    "M13.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0",
  ],
  "layers": [
    "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",
    "M2 12.5l9.17 4.17a2 2 0 0 0 1.66 0L22 12.5",
    "M2 17.5l9.17 4.17a2 2 0 0 0 1.66 0L22 17.5",
  ],
  "reference-alert": [
    "M12 3 2 21h20ZM12 10v5M12 18h.01",
  ],
  "reference-article": [
    "M5 4h14v16H5ZM8 8h8M8 12h8M8 16h5",
  ],
  "reference-bag": [
    "M5 7h14l1 14H4ZM8.5 7a3.5 3.5 0 0 1 7 0",
  ],
  "reference-book": [
    "M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4ZM20 4h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7Z",
  ],
  "reference-card": [
    "M3 5.5h18v13H3ZM3 10h18M6.5 15h4",
  ],
  "reference-cloud": [
    "M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11 2 3 3 0 0 1 0 6Z",
  ],
  "reference-doc": [
    "M6 3h10l4 4v14H6ZM16 3v5h5M9 12h8M9 16h8",
  ],
  "reference-home": [
    "M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4Z",
  ],
  "reference-image": [
    "M4 5h16v14H4ZM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM4 17l5-5 4 4 3-3 4 4",
  ],
  "reference-layers": [
    "M4 6h16M8 12h12M12 18h8",
  ],
  "reference-list": [
    "M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01",
  ],
  "reference-login": [
    "M10 17l5-5-5-5M15 12H3M12 3h7v18h-7",
  ],
  "reference-medal": [
    "M12 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM8.5 13 7 21l5-2.5L17 21l-1.5-8",
  ],
  "reference-menu": [
    "M4 6h16M4 12h16M4 18h16",
  ],
  "reference-message": [
    "M4 5h16v11H9.5L4 20Z",
  ],
  "reference-order": [
    "M8 5H5v16h14V5h-3M8 3h8v4H8ZM8 12h8M8 16h5",
  ],
  "reference-ruler": [
    "M3 17 17 3l4 4L7 21ZM8 12l2 2M11 9l2 2M14 6l2 2",
  ],
  "reference-settings": [
    "m9 3-1 3-3 1-2 4 2 3v4l4 2 3-1 3 1 4-2v-4l2-3-2-4-3-1-1-3ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  ],
  "reference-shop": [
    "M4 9h16l-1.5-5h-13ZM5 9v11h14V9M10 20v-6h4v6",
  ],
  "reference-sliders": [
    "M4 7h9M17 7h3M4 17h5M13 17h7M15 4v6M9 14v6",
  ],
  "reference-trending": [
    "M3 17l6-6 4 4 8-8M15 7h6v6",
  ],
  "reference-truck": [
    "M2 6h12v10H2ZM14 10h4l3 3v3h-7M6.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  ],
  "reference-user": [
    "M16 7.5a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2",
  ],
  "reference-users": [
    "M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3 20v-1.5A4.5 4.5 0 0 1 7.5 14h4a4.5 4.5 0 0 1 4.5 4.5V20M16 4.3a3.5 3.5 0 0 1 0 6.4M21 20v-1.5a4.5 4.5 0 0 0-3-4.2",
  ],
} as const satisfies Record<string, readonly string[]>;

/** 统一默认线性图标：映射取不到时用它，保证不会有条目没图标 */
export const DEFAULT_MENU_ICON: LucideIconName = "reference-doc";

/** 菜单标题 → 图标名 */
export const MENU_ICON_BY_KEY: Record<string, LucideIconName> = {
  商城: "reference-shop",
  商城首页: "reference-home",
  商品管理: "reference-bag",
  全部商品: "reference-bag",
  商品详情: "reference-doc",
  商品分类: "reference-layers",
  规格管理: "reference-sliders",
  商品品牌: "reference-medal",
  商品参数: "reference-ruler",
  素材库: "reference-image",
  订单管理: "reference-order",
  商城订单: "reference-order",
  待发货订单: "reference-truck",
  差错池: "reference-alert",
  会员: "reference-user",
  会员列表: "reference-users",
  内容: "reference-article",
  轮播图: "reference-image",
  热搜: "reference-trending",
  协议管理: "reference-doc",
  系统管理: "reference-settings",
  管理员: "reference-user",
  角色: "reference-users",
  菜单: "reference-menu",
  字典: "reference-book",
  操作日志: "reference-list",
  登录日志: "reference-login",
  系统参数: "reference-sliders",
  商城设置: "reference-shop",
  支付配置: "reference-card",
  文件存储配置: "reference-cloud",
  微信网页授权配置: "reference-message",
};

/** 取图标的 path 数组；未知名字回落到默认图标（绝不返回空数组） */
export function lucidePaths(name: string | undefined | null): readonly string[] {
  const key = (name || "") as LucideIconName;
  return LUCIDE_PATHS[key] || LUCIDE_PATHS[DEFAULT_MENU_ICON];
}

/** 该图标名是否在本库里 */
export function hasLucideIcon(name: string | undefined | null): boolean {
  return !!name && name in LUCIDE_PATHS;
}

/** 按菜单标题解析图标；未命中返回 undefined */
export function resolveMenuIcon(menuKey: string | undefined | null): LucideIconName | undefined {
  if (!menuKey) return undefined;
  return MENU_ICON_BY_KEY[menuKey.replace(/^menus\./, "")];
}

/** 批量按标题解析，未命中用默认图标 */
export function resolveSiblingMenuIcons(menuKeys: readonly string[]): LucideIconName[] {
  return menuKeys.map((key) => resolveMenuIcon(key) || DEFAULT_MENU_ICON);
}
