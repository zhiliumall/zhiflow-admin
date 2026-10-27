/**
 * DC 外壳组件 —— 公共类型
 * 页面声明的字段：{ kind, metric, qPh, grid, cols, filters, tools, note }
 */

/** 表格列声明（cols[] 一项） */
export interface DcTableCol {
  /** 列唯一键；同时决定作用域插槽名 `col-<key>` 与 CSV 取值字段 */
  key: string;
  /** 表头文案 */
  t: string;
  /** 对齐；缺省左对齐（一般只有操作列用 'right'） */
  al?: "left" | "center" | "right";
  /** 是否可排序 → 表头出上下三角 */
  sort?: boolean;
  /** 是否允许在「列设置」里隐藏；默认 true。操作列建议 false */
  hideable?: boolean;
  /** 默认隐藏（列设置里默认不勾） */
  defaultHidden?: boolean;
  /**
   * 取值函数：既用于导出 CSV，也用于**未提供 `col-<key>` 插槽时**的默认单元格文本。
   * 缺省取 row[key]；空值统一渲染成「—」。
   */
  exportValue?: (row: any) => string | number | null | undefined;
}

/** 排序事件载荷；order=null 表示回到未排序态 */
export interface DcSortPayload {
  key: string;
  order: "asc" | "desc" | null;
}

export type DcDensity = "comfortable" | "compact";

/**
 * 生效筛选条件 tag（DcTableShell 的 `activeFilters` 一项）。
 * 渲染在「共 N 条」右侧的品牌蓝 tag，
 * 点 ✕ 移除单条，末尾一条「清除全部」由壳自己出（走 @reset）。
 */
export interface DcActiveFilter {
  /** 唯一标识，一般用筛选字段名 */
  key: string;
  /** tag 文案；格式是 `字段名: 值`，例：`状态: 启用` */
  label: string;
  /** 点 ✕：页面清掉该字段并重查（壳不代劳，也不改页面状态） */
  onRemove: () => void;
}

/**
 * 行操作（DcOverflowActions 的一项）。
 * 可见项 > 3 个时折叠成「前 2 个 + ··· 溢出菜单」。
 */
export interface DcRowAction {
  /** 唯一键；不传则用 t 做 key（同一行内 t 必须唯一） */
  key?: string;
  /** 操作文案 */
  t: string;
  /** 点击回调 */
  on?: () => void;
  /** 危险项（红色，如「删除」） */
  danger?: boolean;
  /** 灰掉且不可点（仍占位，用于「当前状态不允许」的语义） */
  disabled?: boolean;
  /** 无权限等原因**整条不出现**；折叠计数在剔除 hidden 之后才算 */
  hidden?: boolean;
}

/** 状态 Tab（DcTabs 一项）；count 省略 = 不出计数章 */
export interface DcTab {
  key: string | number;
  /** Tab 文案 */
  name: string;
  count?: number | null;
}

/** 卡片网格条目（DcCardGridShell 一项） */
export interface DcCardItem {
  id?: string | number;
  title?: string;
  /** 摘要（grid 变体两行截断） */
  digest?: string;
  /** 封面图 URL；为空自动走渐变兜底块 */
  img?: string;
  /** 兜底块上的文字 */
  coverText?: string;
  /** 自定义兜底渐变；不传按索引轮换 */
  grad?: string;
  /** 左上角状态章（grid）/ 头部状态章（list），如「草稿」「已发布」 */
  badge?: string;
  /** grid：底部一行小字；list：头部左侧文字（如「发布于 YYYY-MM-DD」） */
  meta?: string;
  /** list：头部次要文字（如「3 篇图文」） */
  sub?: string;
  /** list：正文里的圆点子条目 */
  subs?: string[];
  /** list：右侧大号指标 */
  statValue?: string | number;
  statLabel?: string;
  /** 卡片操作：grid = 底部等分条，list = 头部右侧链 */
  actions?: DcCardAction[];
}

export interface DcCardAction {
  key?: string;
  t: string;
  on?: () => void;
  /** 危险项（红） */
  danger?: boolean;
  /** 强调项（品牌色 + 500，如草稿卡的「发布」） */
  accent?: boolean;
}

/** 媒体库类目（DcMediaShell）；微信素材共 4 类 */
export type DcMediaKind = "image" | "voice" | "video" | "news";

export interface DcMediaCat {
  key: DcMediaKind;
  /** 胶囊文案 */
  name: string;
  count?: number | null;
}

export interface DcMediaItem {
  id?: string | number;
  name?: string;
  /** 图片/视频 URL；图片为空走渐变兜底块 */
  url?: string;
  coverText?: string;
  grad?: string;
  /** 图片：文件大小文案（如「128 KB」） */
  size?: string;
  /** 语音/视频：时长文案（如「00:32」） */
  duration?: string;
  /** 时间文案 */
  time?: string;
  /** 视频简介（两行截断） */
  intro?: string;
}

/** 看板区间胶囊（DcStatsShell） */
export interface DcStatRange {
  key: string | number;
  name: string;
}

/** 看板指标卡（DcStatsShell） */
export interface DcStatCard {
  name: string;
  value: string | number;
  /** 色点（与对应 series 同色） */
  dot?: string;
  /** 环比文案，如「+12.4%」；空则不出这一行 */
  delta?: string;
  /** 环比方向：true 绿 ↑ / false 红 ↓ */
  up?: boolean;
  /** 环比后缀，缺省「vs 上一周期」 */
  deltaLabel?: string;
}

/** 图表数据列（DcStatChart） */
export interface DcStatSeries {
  /** 图例文案 */
  name: string;
  /** 柱/线颜色 */
  color: string;
  data: number[];
  /** 仅 line：面积填充色，缺省 rgba(60,110,240,.09) */
  area?: string;
}

/** 配置页 provider 卡片（cfgProviders[] 一项） */
export interface DcProvider {
  /** 取值（写回表单的字段值，如字典 value） */
  value: string | number;
  /** 卡片主标题 */
  name: string;
  /** 卡片副描述（一行小字，可缺省） */
  desc?: string;
  /** 右上「推荐」角标 */
  rec?: boolean;
  /** 禁用（不可选） */
  disabled?: boolean;
}

/**
 * DcPageHeader 右侧统计卡（metrics[*]）
 * ⚠ value 必须来自真实数据（page.total 等）；没有真实聚合数据时不要传 metrics，
 *   更不要写死 mock 数字。
 */
export interface DcPageMetric {
  /** 左侧灰色小标签，如「共计」 */
  label: string;
  /** 右侧数值（真实数据） */
  value: string | number;
  /** 数值颜色，缺省 var(--dc-text-1) */
  color?: string;
}
