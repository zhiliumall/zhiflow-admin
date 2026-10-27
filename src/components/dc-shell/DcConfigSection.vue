<!--
  DcConfigSection —— 配置页里的一张「分组卡」
  卡头 = 3×13 品牌色竖条 + 13px/600 标题 + 11px/text-4 副标题；
  卡体默认两列栅格（column-gap/row-gap 14px），字段自己用 `grid-column:span 2` 占整宽。

  用法：
  <DcConfigSection title="短信服务商" sub="仅影响验证码与通知短信">
    <div style="display:flex;flex-direction:column;gap:6px;min-width:0;">…半宽字段…</div>
    <div style="grid-column:span 2;">…整宽字段…</div>
  </DcConfigSection>
-->
<template>
  <div
    style="padding:16px 18px;background:var(--dc-surface);border:1px solid var(--dc-border);border-radius:8px;box-shadow:0 1px 2px rgb(0 0 0 / 4%);"
  >
    <div style="display:flex;gap:7px;align-items:center;">
      <span style="width:3px;height:13px;background:var(--dc-brand);border-radius:2px;" />
      <span style="font-size: 14px;font-weight:600;color:var(--dc-text-1);">{{ title }}</span>
      <span v-if="sub" style="font-size: 14px;color:var(--dc-text-3);">{{ sub }}</span>
      <div style="flex:1;" />
      <slot name="head-extra" />
    </div>
    <div
      style="display:grid;gap:14px;margin-top:14px;"
      :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "DcConfigSection" });

withDefaults(
  defineProps<{
    /** 卡头标题 */
    title: string;
    /** 卡头副标题（11px 灰字） */
    sub?: string;
    /** 栅格列数；配置页一般为 2，子项开关卡为 3 */
    columns?: number;
  }>(),
  { sub: "", columns: 2 },
);
</script>
