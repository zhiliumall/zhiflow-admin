<template>
  <span v-if="phone" class="phone-mask">
    <span class="phone-mask__text">{{ displayText }}</span>
    <span
      class="phone-mask__eye"
      :title="revealed ? '点击隐藏手机号' : eyeTitle"
      @click.stop="toggle"
    >
      <!-- 睁眼（当前脱敏，点击可查看明文） -->
      <svg v-if="!revealed" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <ellipse cx="12" cy="12" rx="9" ry="5.5" />
        <circle cx="12" cy="12" r="2.4" />
      </svg>
      <!-- 闭眼（当前明文，点击可重新脱敏） -->
      <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12s3.6-5.5 9-5.5 9 5.5 9 5.5-3.6 5.5-9 5.5-9-5.5-9-5.5z" />
        <line x1="4" y1="19" x2="20" y2="5" />
      </svg>
    </span>
  </span>
</template>

<script setup lang="ts">
/**
 * 手机号脱敏展示组件 —— 订单列表 / 待发货等页面共用。
 * 默认脱敏（138****0013），点击眼形图标切换明文/脱敏；不做接口调用或审计埋点，
 * 纯展示层，调用方如需记录「明文查看」操作请自行监听 @reveal。
 */
import { computed, ref } from "vue";
import { maskPhone } from "@/utils/phoneMask";

const props = withDefaults(
  defineProps<{
    phone?: string | null;
    /** 未查看明文时图标的 title 文案，按权限查看场景可自定义提示（如「操作将被记录」） */
    eyeTitle?: string;
  }>(),
  { phone: "", eyeTitle: "查看完整手机号" },
);

const emit = defineEmits<{ (e: "reveal", revealed: boolean): void }>();

const revealed = ref(false);
const displayText = computed(() => (revealed.value ? String(props.phone ?? "") : maskPhone(props.phone)));

function toggle() {
  revealed.value = !revealed.value;
  emit("reveal", revealed.value);
}
</script>

<style scoped lang="scss">
.phone-mask {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-variant-numeric: tabular-nums;
}

.phone-mask__eye {
  display: inline-flex;
  flex: none;
  align-items: center;
  color: var(--dc-text-3);
  cursor: pointer;
  transition: color var(--dc-dur-micro);

  &:hover {
    color: var(--dc-brand);
  }
}
</style>
