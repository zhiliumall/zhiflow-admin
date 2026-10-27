/**
 * avue-crud 表单弹窗的尺寸阶梯
 *
 * 与 `src/style/overlay.scss` 的 `--overlay-w-*` 同源。avue 把 dialogWidth 写成元素内联
 * `--el-dialog-width`，样式表压不过，所以宽度只能在 crud 配置里声明 —— 这里是唯一取值来源，
 * 各配置写 `dialogWidth: DIALOG_W.l`，不要再手写字面量。
 *
 * ⚠️ 值必须是**数字**，不能写 "800px"：avue 的 `setPx()` 是
 * `if (val.indexOf('%') === -1) val = val + 'px'` —— 无条件补 px，
 * "800px" 会变成 `--el-dialog-width: 800pxpx`，CSS 非法后弹窗掉到
 * `.avue-dialog` 的 `max-width: calc(100% - 100px)`，1920 屏上是 1820px，比 60% 默认值还宽。
 * 百分比字符串（"88%"）安全，px 字符串是陷阱。
 *
 * 选档（N = 新增态 / 编辑态字段数的较大者）：
 *   s  —— N ≤ 2 的单列小窗（原 goodstagsgroup 手写的 "30%" 就是这个档，
 *         1440 屏上 432px；改成定值免得跟着屏宽漂）
 *   m  —— N ≤ 4 **且列上没写 span**，同时给 option 加 `span: 24` 走单列
 *   l  —— 常规两列表单（avue 列默认 span:12）
 *   xl —— 含重控件（上传 / 富文本 / 动态子表）、分组 / tabs、N > 14，
 *         或列级 span ≤ 8（三列布局，800 里每格只剩 253px）
 *
 * ⚠️ 列级 `span` 压过 option 级：avue 的 `getItemParams` 顺序是
 * `column.span ?? group.span ?? option.span ?? 12`。所以只要列上写了 `span: 11/12/13`，
 * option 上的 `span: 24` 就是死配置，m 档「单列整宽」的前提不成立 —— 560 会挤成
 * 两列 238px。这类配置应直接选 l 档。
 *
 * ⚠️ 这套枚举只管**表单弹窗**。多栏工作区（三栏壳之类）别往枚举上套，
 * 按自己的内容定宽。
 *
 * 不写 dialogWidth 会落到 avue 内部常量 '60%'：1920 屏上是 1152px 的空壳。
 */
export const DIALOG_W = {
  s: 440,
  m: 560,
  l: 800,
  xl: 1040,
} as const;
