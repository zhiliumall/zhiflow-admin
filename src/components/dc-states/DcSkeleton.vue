<template>
  <div class="dc-skeleton">
    <div v-if="toolbar" class="dc-skeleton__toolbar">
      <span class="dc-skeleton__block" style="width: 180px" />
      <span class="dc-skeleton__block" />
      <span class="dc-skeleton__block" />
    </div>
    <div v-for="(w, i) in rowWidths" :key="i" class="dc-skeleton__row">
      <span class="dc-skeleton__thumb" />
      <span class="dc-skeleton__lines">
        <span class="dc-skeleton__line" :style="{ width: w[0] }" />
        <span class="dc-skeleton__line" :style="{ width: w[1], height: '11px' }" />
      </span>
      <span class="dc-skeleton__line" style="flex: 1" />
      <span class="dc-skeleton__pill" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{ rows?: number; toolbar?: boolean }>(), {
  rows: 6,
  toolbar: true,
});

// 行内两条文本骨架的宽度组合，错落排列避免整齐划一
const WIDTHS: Array<[string, string]> = [
  ["46%", "30%"], ["58%", "24%"], ["40%", "34%"], ["52%", "22%"], ["44%", "28%"],
  ["60%", "26%"], ["38%", "30%"], ["50%", "24%"], ["42%", "32%"], ["56%", "20%"],
];

const rowWidths = computed(() => WIDTHS.slice(0, Math.max(3, Math.min(10, props.rows))));
</script>
