/**
 * 商品规格命名标准（唯一定义处）
 *
 * 常见误用是把**规格值**当成**规格名**填进字典：`500g`、`红色 XL`、`2 件装`…
 * 而 `goods_spec` 是全店共用的词表，每填错一次，所有商品的「添加规格」下拉里就多一条永久噪音。
 *
 * 数据模型：
 *   goods_spec        规格名 = 轴名          全店词表
 *   goods_spec_value  规格值 = 轴下的具体值  全店词表
 *   goods_spu_spec    (spu_id, spec_id)      商品用了哪几根轴
 *   goods_sku         spu_id + 价格/库存/编码/图片   ← 价格在这，绑商品
 *   goods_sku_spec_value (sku_id, spec_value_id)   这条 SKU 是哪几个值的组合
 *
 * 所以规格名/规格值只是**标签**，共用不会串价：同一个「500g」在不同商品下的售价各算各的。
 */

/** 推荐轴名 */
export const RECOMMENDED_SPEC_NAMES = [
  "规格",
  "包装",
  "口味",
  "颜色",
  "尺码",
];

/** 数量单位——出现「数字 + 单位」基本可以断定这是个规格值而不是轴名 */
const UNIT_PATTERN =
  /\d\s*(mg|g|kg|ml|l|片|粒|盒|支|袋|瓶|包|条|枚|件|克|毫升|升|斤|袋装|盒装)/i;

/** 「500g × 2袋」「250ml*4」这类带乘号的组合写法 */
const COMBO_PATTERN = /\d\s*[×*x]\s*\d/i;

/** 纯数字，如「100」 */
const PURE_NUMBER_PATTERN = /^[\d.]+$/;

/**
 * 这个名字看起来像「规格值」而不是「规格名」吗？
 *
 * 只做提示不做硬拦截：可能真有叫「20支」的轴，硬拦会挡住正当用法；
 * 但默认动作是引导用户改，避免再往词表里塞值。
 */
export function looksLikeSpecValue(name: string): boolean {
  const s = String(name || "").trim();
  if (!s) return false;
  return (
    PURE_NUMBER_PATTERN.test(s) || UNIT_PATTERN.test(s) || COMBO_PATTERN.test(s)
  );
}

/** 推荐轴名的展示串，如「规格 / 包装 / 口味」 */
export function recommendedSpecNameText(): string {
  return RECOMMENDED_SPEC_NAMES.slice(0, 3).join(" / ");
}

/** 二次确认的文案，两处入口（规格管理 / 商品向导）共用，交给 appConfirm 渲染 */
export function specNamingWarning(name: string) {
  return {
    intent: "confirm" as const,
    title: "确认新建规格",
    body:
      `「${name}」看起来是规格值，不是规格名。规格名是全店共用的「轴」，` +
      `建议填 ${recommendedSpecNameText()}；这种具体的值应该加在该规格下面。`,
    verb: "仍要新建",
    cancelText: "我改一下",
  };
}
