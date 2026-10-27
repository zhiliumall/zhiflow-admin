/**
 * ProTable 组件族类型定义
 *
 * 独立分离式组件族：
 * - ProSearchForm: 搜索表单
 * - ProActionBar: 工具栏
 * - ProTable: 数据表格 + 分页器
 */

// ========================
// ProSearchForm 类型
// ========================

/** 搜索表单支持的字段组件类型 */
export type SearchComponentType = 'input' | 'select' | 'date-picker' | 'cascader'

/** 搜索字段配置 */
export interface SearchField {
  /** 字段名，对应 modelValue 的 key */
  prop: string
  /** 字段标签 */
  label: string
  /** 渲染的组件类型 */
  component: SearchComponentType
  /** 透传给组件的 props */
  componentProps?: Record<string, any>
  /** el-select / el-cascader 的选项 */
  options?: Array<{ label: string; value: any }>
  /** 占位文本（默认根据 component 自动设置） */
  placeholder?: string
  /** 初始值 / 重置目标值 */
  defaultValue?: any
  /** 跨列数，默认 1（如设为 2 则该字段占 2 列宽度） */
  span?: number
}

/** ProSearchForm Props */
export interface ProSearchFormProps {
  /** 字段配置 */
  fields: SearchField[]
  /** v-model: 搜索参数对象 */
  modelValue?: Record<string, any>
  /** 每行字段数，默认 5 */
  columns?: number
  /** 折叠阈值，超过此数自动折叠，默认 5 */
  foldCount?: number
  /** label 宽度，默认 '80px' */
  labelWidth?: string
  /** 是否去除卡片容器包裹 */
  noCard?: boolean
}

/** ProSearchForm Emits */
export interface ProSearchFormEmits {
  (e: 'update:modelValue', value: Record<string, any>): void
  (e: 'search', params: Record<string, any>): void
  (e: 'reset'): void
}

/** ProSearchForm Instance */
export interface ProSearchFormInstance {
  resetFields(): void
  getParams(): Record<string, any>
}

// ========================
// ProActionBar 类型
// ========================

/** ProActionBar Props */
export interface ProActionBarProps {
  /** 右侧统计文本 */
  statText?: string
  /** 是否显示导出按钮，默认 false */
  showExport?: boolean
  /** 是否显示刷新按钮，默认 true */
  showRefresh?: boolean
}

/** ProActionBar Emits */
export interface ProActionBarEmits {
  (e: 'export'): void
  (e: 'refresh'): void
}

// ========================
// ProTable 列配置类型
// ========================

/** 预设列类型 */
export type ColumnType = 'index' | 'selection' | 'expand' | 'image' | 'multi-line' | 'tag'

/** 图片列专属配置 */
export interface ImageColumnProps {
  width?: number
  height?: number
  fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  borderRadius?: number
}

/** 多行文本列的字段项 */
export interface MultiLineFieldItem {
  /** 数据字段名 */
  prop: string
  /** 前缀标签文字 */
  label?: string
  /** 文字颜色，如 '#333', '#999' */
  color?: string
  /** 字号，如 12, 13, 14 */
  fontSize?: number
  /** 最大行数（超出省略） */
  maxLines?: number
}

/** 标签状态映射项 */
export interface TagMapItem {
  text: string
  type?: '' | 'success' | 'warning' | 'danger' | 'info'
}

/** 标签列配置 */
export interface TagColumnConfig {
  map: Record<string | number, TagMapItem>
  defaultText?: string
}

/** 表格列配置 */
export interface ProColumn {
  /** 数据字段名（selection/index/expand 类型时可选） */
  prop?: string
  /** 列标题（selection/index/expand 类型时可选） */
  label?: string
  /** 列宽 */
  width?: number | string
  /** 最小列宽 */
  minWidth?: number | string
  /** 固定列 */
  fixed?: 'left' | 'right' | boolean
  /** 是否可排序 */
  sortable?: boolean | 'custom'
  /** 预设列类型 */
  type?: ColumnType
  /** 自定义渲染插槽名（优先级最高） */
  slot?: string
  /** 文本格式化函数 */
  formatter?: (row: any, column: any, cellValue: any) => string
  /** image 类型专属 */
  imageProps?: ImageColumnProps
  /** multi-line 类型专属 */
  lineFields?: MultiLineFieldItem[]
  /** tag 类型专属 */
  tagConfig?: TagColumnConfig
  /** 列对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 表头对齐方式 */
  headerAlign?: 'left' | 'center' | 'right'
  /** 是否隐藏列 */
  hide?: boolean
}

// ========================
// ProTable Props/Emits/Instance
// ========================

/** 分页器配置 */
export interface PaginationConfig {
  /** 当前页码 v-model:page */
  page: number
  /** 每页条数 v-model:pageSize */
  pageSize: number
  /** 总数 */
  total: number
  /** 每页条数选项 */
  pageSizes?: number[]
  /** 是否显示跳转 */
  showJumper?: boolean
}

/** ProTable Props */
export interface ProTableProps {
  /** 列配置 */
  columns: ProColumn[]
  /** 表格数据 */
  data: any[]
  /** 是否显示分页器，默认 true */
  showPagination?: boolean
  /** 加载状态 */
  loading?: boolean
  /** 表格高度 */
  height?: string | number
  /** 最大高度 */
  maxHeight?: string | number
  /** 是否显示边框 */
  border?: boolean
  /** 斑马纹 */
  stripe?: boolean
  /** 行 key 名 */
  rowKey?: string | ((row: any) => string)
  /** 空数据提示 */
  emptyText?: string
  /** 分页器配置（与 showPagination 配合） */
  pagination?: Partial<PaginationConfig>
}

/** ProTable Emits */
export interface ProTableEmits {
  (e: 'update:page', page: number): void
  (e: 'update:pageSize', size: number): void
  (e: 'page-change', page: number): void
  (e: 'size-change', size: number): void
  (e: 'sort-change', params: { prop: string; order: string | null }): void
  (e: 'selection-change', rows: any[]): void
  (e: 'row-click', row: any, column: any, event: Event): void
  (e: 'row-dblclick', row: any, column: any, event: Event): void
  (e: 'current-change', currentPage: number): void
}

/** ProTable Instance — 通过 ref 调用 */
export interface ProTableInstance {
  /** 刷新表格（重新触发父组件加载数据） */
  refresh: () => void
  /** 获取当前选中行数组 */
  getSelection: () => any[]
  /** 清空选中状态 */
  clearSelection: () => void
  /** 设置加载状态 */
  setLoading: (loading: boolean) => void
  /** 获取 el-table 实例 */
  getTableRef: () => any
}
