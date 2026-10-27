<!--
  DcPager —— 全仓统一分页条
        共 N 条 → flex:1 → 「N 条/页」→ 上一页 / 页码 / 下一页 → 跳至 [__] 页

  ## 为什么要统一
  页面各自内联分页条或直接用 `el-pagination` 时，el-pagination 渲染的是 Element Plus
  默认皮肤，没有「跳至 [__] 页」，页宽/圆角/字号也全不一致。故作为共享原语，新页一律用它。

  ## 页容量选择器
  两种形态，用 `:page-sizes` 切换：
    静态文字「N 条/页」（不传 page-sizes 时的默认形态）
    可选下拉，选项文案是「每页 N 条」（传 page-sizes 即启用）
  ⚠ 下拉选项文案是「每页 {{ n }} 条」，不是「{{ n }} 条/页」，别改写。
-->
<template>
  <div
    v-if="total > 0"
    style="display:flex;align-items:center;padding:10px 16px;margin-top:-1px;background:var(--dc-surface);border:1px solid var(--dc-border);border-top:1px solid var(--dc-divider);border-radius:0 0 8px 8px;"
  >
    <span style="font-size: 14px;color:var(--text-tertiary, #667085);">共 {{ total }} 条</span>
    <div style="flex:1;" />
    <!-- 页容量：传了 page-sizes 就是下拉，否则是静态文字 -->
    <!-- 规格（26px/12px/radius5）在 style/dc/element-plus.scss 的 .el-select.dc-pager__size，
         不再内联：el-select 的高度由内部 .el-select__wrapper 承载，根节点设 height 无效。 -->
    <el-select
      v-if="pageSizes.length"
      class="dc-pager__size dc-nsel"
      :model-value="pageSize"
      @change="onSize"
    >
      <el-option v-for="n in pageSizes" :key="n" :value="n" :label="`每页 ${n} 条`" />
    </el-select>
    <span v-else style="margin-right:10px;font-size: 14px;color:var(--text-tertiary, #667085);">{{ pageSize }} 条/页</span>
    <div style="display:flex;gap:6px;align-items:center;">
      <span
        class="dc-pager__btn"
        style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border:1px solid var(--dc-border);border-radius:5px;"
        :style="{
          color: current <= 1 ? 'var(--text-disabled, #7c8797)' : 'var(--text-secondary, #3f4a59)',
          cursor: current <= 1 ? 'not-allowed' : 'pointer',
        }"
        @click="current > 1 && go(current - 1)"
      >
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
        ><path d="M15 6l-6 6 6 6" /></svg>
      </span>

      <span
        v-for="(p, i) in pageList"
        :key="'p' + i"
        class="dc-pager__btn"
        style="display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;padding:0 4px;font-size: 14px;border-radius:5px;"
        :style="p === current
          ? { border: '1px solid var(--dc-brand)', background: 'var(--dc-brand)', color: '#fff', fontWeight: 600, cursor: 'pointer' }
          : typeof p === 'number'
            ? { border: '1px solid var(--dc-border)', background: 'var(--dc-surface)', color: 'var(--dc-text-2)', fontWeight: 400, cursor: 'pointer' }
            : { border: '1px solid transparent', background: 'transparent', color: 'var(--text-disabled, #7c8797)', fontWeight: 400, cursor: 'default' }"
        @click="typeof p === 'number' && go(p as number)"
      >{{ p }}</span>

      <span
        class="dc-pager__btn"
        style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border:1px solid var(--dc-border);border-radius:5px;"
        :style="{
          color: current >= totalPages ? 'var(--text-disabled, #7c8797)' : 'var(--text-secondary, #3f4a59)',
          cursor: current >= totalPages ? 'not-allowed' : 'pointer',
        }"
        @click="current < totalPages && go(current + 1)"
      >
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
        ><path d="M9 6l6 6-6 6" /></svg>
      </span>

      <span style="margin-left:6px;font-size: 14px;color:var(--text-tertiary, #667085);">跳至</span>
      <input
        v-model="jump"
        style="width:38px;height:26px;padding:0;font-family:inherit;font-size: 14px;color:var(--dc-text-2);text-align:center;background:var(--dc-surface);border:1px solid var(--dc-border);border-radius:5px;outline:none;"
        @keyup.enter="onJump"
        @blur="onJump"
      >
      <span style="font-size: 14px;color:var(--text-tertiary, #667085);">页</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

defineOptions({ name: "DcPager" });

const props = withDefaults(
  defineProps<{
    total: number;
    current: number;
    pageSize: number;
    /** 传了才出页容量下拉；留空 = 静态文字「N 条/页」（见组件头注释的两种形态） */
    pageSizes?: number[];
  }>(),
  { total: 0, current: 1, pageSize: 20, pageSizes: () => [] },
);
const emit = defineEmits<{
  "update:current": [v: number];
  change: [v: number];
  "update:pageSize": [v: number];
  "size-change": [v: number];
}>();

/**
 * el-select 的 change 直接给值（不再是原生 Event），但仍收窄成数字后再 emit。
 *
 * 这里**只**抛新的页容量，不代管页码：传了 page-sizes 的调用方都在自己的
 * size 处理里把页码归了 1，本组件再 emit 一次 current=1
 * 会让它们重复发一次请求。页码越界的兜底走下面那个 watch。
 */
function onSize(raw: string | number) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n === props.pageSize) return;
  emit("update:pageSize", n);
  emit("size-change", n);
}

const jump = ref("");
const totalPages = computed(() => Math.max(1, Math.ceil(props.total / (props.pageSize || 20))));

/**
 * 页码越界自愈：`current` 超出总页数就拉回末页并通知调用方重拉。
 *
 * 触发场景（带删除的分页页面一般不会自己做这个兜底）：
 * 共 21 条 / 20 条每页，在第 2 页删掉唯一那一行 —— 删除后各页都是原地 `getPageF(page)`，
 * 页码不动，于是 total 变 20、总页数变 1，而 current 还是 2 → 列表空白、页脚照写
 * 「共 20 条」，高亮的页码 2 连页码条里都没有了，运营只能自己点回第 1 页。
 * 服务端筛选把结果缩小时同理（原来在第 5 页，筛完只剩 2 页）。
 *
 * 只在 total > 0 时纠正：total=0 是空列表/加载失败态，组件本身 v-if 不渲染，
 * 此时改页码只会把调用方的分页态冲掉。
 */
watch([() => props.current, totalPages], ([cur, tp]) => {
  if (props.total > 0 && cur > tp) go(tp);
});

/** 页码序列：首尾常驻 + 当前页 ±1，其余折叠成「…」 */
const pageList = computed<(number | string)[]>(() => {
  const tp = totalPages.value;
  const cur = props.current;
  if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1);
  const out: (number | string)[] = [1];
  const from = Math.max(2, cur - 1);
  const to = Math.min(tp - 1, cur + 1);
  if (from > 2) out.push("…");
  for (let i = from; i <= to; i++) out.push(i);
  if (to < tp - 1) out.push("…");
  out.push(tp);
  return out;
});

function go(p: number) {
  if (p === props.current) return;
  emit("update:current", p);
  emit("change", p);
}
function onJump() {
  const n = Number(jump.value);
  jump.value = "";
  if (!Number.isFinite(n) || n < 1) return;
  go(Math.min(totalPages.value, Math.floor(n)));
}
</script>

<style lang="scss">
.dc-pager__btn:hover { border-color: var(--dc-brand) !important; }

.dc-pager__size:focus { border-color: var(--dc-brand); }
</style>
