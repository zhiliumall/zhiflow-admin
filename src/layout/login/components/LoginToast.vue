<!-- 顶部结果 toast。
     fixed top 26px 顶部居中，白卡 + 20px 状态圆点，2.6s 自动消失（计时在父级）。 -->
<template>
  <div v-if="on" class="hl-toastwrap">
    <div class="hl-toast">
      <span
        class="hl-toast-icon"
        :style="{ background: type === 'ok' ? '#16a34a' : '#dc2626' }"
      >
        {{ type === "ok" ? "✓" : "!" }}
      </span>
      <span class="hl-toast-msg">{{ msg }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "LoginToast" });

defineProps<{
  on: boolean;
  type: "ok" | "err";
  msg: string;
}>();
</script>
