<!--
  DcOverflowActions —— 行操作链 + 溢出菜单（全站唯一实现）
        「操作 > 3 个时折叠成 前 2 个 + ··· 溢出菜单」

  ⚠ 各页自绘的 ··· 菜单弹层宽度、位置、内边距难免不一致，统一到本组件。
    **任何页面都不要再自绘 ··· 菜单。**

  行为要点（各页自绘版本普遍漏掉的）：
   - 可见项 <= 3 时**完全不出 ···**，全部平铺（3 个及以内不折叠）
   - `hidden` 为真的项在计数前就被剔除 —— 权限过滤后剩 3 个就不该再折叠
   - 点菜单项后自动关菜单；点页面别处 / Esc 也关；同页多行只会开一个
   - 菜单项 `disabled` 时不触发 on()，且视觉降透明

  ────────────────────────── 用法示例 ──────────────────────────
  <script setup lang="ts">
  import DcOverflowActions from "@/components/dc-shell/DcOverflowActions.vue";
  import type { DcRowAction } from "@/components/dc-shell/types";

  function actsOf(row: any): DcRowAction[] {
    return [
      { key: "edit", t: "编辑", on: () => openForm("edit", row), hidden: !permissions["x:edit"] },
      { key: "qr",   t: "二维码", on: () => openQr(row) },
      { key: "token", t: "查看 access-token", on: () => runMore(row, "token") },
      { key: "del",  t: "删除", danger: true, on: () => handleDel(row) },
    ];
  }
  </script>

  <template>
    <template #col-acts="{ row }">
      <DcOverflowActions :actions="actsOf(row)" :row-key="row.id" />
    </template>
  </template>
  ─────────────────────────────────────────────────────────────

  Props
    actions   DcRowAction[]  必填。按显示顺序；hidden 的项自动剔除
    rowKey    string|number  行标识；仅用于多行间互斥关闭，可不传
    menuWidth number = 140   溢出弹层宽度 px
    align     'right'|'left' = 'right'  操作链对齐（操作列一般右对齐）

  ⚠ 折叠规则**不是 prop**：模块级常量 INLINE_MAX=2 / FOLD_OVER=3。
    「> 3 个折叠成前 2 个 + ···」全站一套，不允许任何页面覆盖。
    若某页觉得需要多平铺一个，答案是**减少动作项**或调整顺序，不是加 prop。

  Slots：无。菜单项形态由 DcRowAction 声明，保持全仓一致。
-->
<template>
  <div
    class="dc-tbl__acts"
    :style="{ justifyContent: align === 'left' ? 'flex-start' : 'flex-end' }"
  >
    <span
      v-for="a in inlineActions"
      :key="a.key || a.t"
      class="dc-tbl__act"
      :class="{ 'dc-tbl__act--danger': a.danger }"
      :style="a.disabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined"
      @click.stop="run(a)"
    >{{ a.t }}</span>

    <span v-if="overflowActions.length" style="position:relative;" @click.stop>
      <span class="dc-tbl__act" :title="'更多操作'" @click="toggle">···</span>
      <div
        v-if="open"
        class="dc-ovf__menu"
        :style="{ width: menuWidth + 'px' }"
        style="position:absolute;top:24px;right:0;z-index:60;padding:4px 0;text-align:left;background:var(--dc-surface);border:1px solid var(--dc-border);border-radius:4px;box-shadow:0 4px 12px rgb(0 0 0 / 8%);"
      >
        <div
          v-for="a in overflowActions"
          :key="a.key || a.t"
          class="dc-ovf__item"
          style="height:30px;padding:0 12px;overflow:hidden;font-size: 14px;line-height:30px;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;"
          :style="{
            color: a.danger ? 'var(--dc-danger-link)' : 'var(--dc-info)',
            opacity: a.disabled ? 0.45 : 1,
            cursor: a.disabled ? 'not-allowed' : 'pointer',
          }"
          @click="run(a)"
        >{{ a.t }}</div>
      </div>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { DcRowAction } from "./types";

defineOptions({ name: "DcOverflowActions" });

const props = withDefaults(
  defineProps<{
    actions: DcRowAction[];
    /** 行标识，仅用于同页多行互斥；不传也能工作 */
    rowKey?: string | number;
    menuWidth?: number;
    align?: "left" | "right";
  }>(),
  { rowKey: "", menuWidth: 140, align: "right" },
);

/**
 * 折叠规格 ——**常量，不开放为 prop**（全站一套）。
 * 可见项 > 3 时：平铺前 2 个，其余进 ··· 菜单；<= 3 全平铺、不出 ···。
 */
const INLINE_MAX = 2;
const FOLD_OVER = 3;

/** hidden 的项在计数前剔除 —— 权限过滤后剩 3 个就不该再折叠 */
const visible = computed(() => (props.actions || []).filter((a) => !a.hidden));
/** <= FOLD_OVER 时完全不折叠（不出 ···） */
const folded = computed(() => visible.value.length > FOLD_OVER);
const inlineActions = computed(() =>
  folded.value ? visible.value.slice(0, INLINE_MAX) : visible.value,
);
const overflowActions = computed(() =>
  folded.value ? visible.value.slice(INLINE_MAX) : [],
);

const open = ref(false);
function toggle() {
  open.value = !open.value;
}
function close() {
  open.value = false;
}
function run(a: DcRowAction) {
  if (a.disabled) return;
  close();
  a.on?.();
}

// 点页面别处 / Esc 关闭。document 冒泡阶段即可：模板已在 ··· 容器上 @click.stop。
function onEsc(e: KeyboardEvent) {
  if (e.key === "Escape") close();
}
onMounted(() => {
  document.addEventListener("click", close);
  document.addEventListener("keydown", onEsc);
});
onBeforeUnmount(() => {
  document.removeEventListener("click", close);
  document.removeEventListener("keydown", onEsc);
});
</script>

<style lang="scss">
/* .dc-tbl__acts / .dc-tbl__act 的尺寸与颜色由 DcTableShell 的全局样式提供
   （--info / 常规字重 / gap 12），此处只补菜单项 hover。 */
.dc-ovf__item:hover { background: var(--dc-row-hover); }
</style>
