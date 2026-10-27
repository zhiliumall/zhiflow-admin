<!-- 结果反馈弹窗（登录失败 / 账号锁定 / 重置成功 / 重置失败）。
     400px 卡 / 52px 状态圆 / 17px 标题 / 13.5px 描述 /
     按钮行居中，文案与按钮组合由父级 dlgVals 决定，本组件只负责渲染。 -->
<template>
  <div v-if="open" class="hl-mask hl-mask--dlg">
    <div class="hl-dialog hl-result">
      <span class="hl-result-icon" :style="{ background: iconBg }">{{ icon }}</span>
      <div class="hl-result-title">{{ title }}</div>
      <div class="hl-result-desc">{{ desc }}</div>
      <div class="hl-result-acts">
        <button
          v-if="secondary"
          class="hl-btn-secondary"
          @click="emit('secondary')"
        >
          {{ secondary }}
        </button>
        <button class="hl-btn-primary" @click="emit('primary')">
          {{ primary }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "LoginResultDialog" });

defineProps<{
  open: boolean;
  icon: string;
  iconBg: string;
  title: string;
  desc: string;
  primary: string;
  secondary: string;
}>();

const emit = defineEmits<{
  (e: "primary"): void;
  (e: "secondary"): void;
}>();
</script>
