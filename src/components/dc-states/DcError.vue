<template>
  <div class="dc-state" :class="{ 'dc-state--static': !absolute }">
    <div class="dc-error-art">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F2270C" stroke-width="1.8" stroke-linecap="round">
        <path d="M12 7v6" />
        <circle cx="12" cy="16.6" r="0.6" fill="#F2270C" stroke="none" />
        <circle cx="12" cy="12" r="9.2" />
      </svg>
    </div>
    <div class="dc-state__title">{{ title }}</div>
    <div class="dc-state__desc">{{ description }}</div>
    <div class="dc-state__action">
      <div class="dc-outline-btn" @click="handleRetry">
        <span v-if="loading" class="dc-spinner" />
        {{ loading ? "重试中…" : "重新加载" }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    loading?: boolean;
    absolute?: boolean;
  }>(),
  {
    title: "加载失败",
    description: "网络异常或服务暂不可用，请稍后重试",
    loading: false,
    absolute: true,
  },
);

const emit = defineEmits<{ retry: [] }>();

function handleRetry() {
  if (props.loading) return;
  emit("retry");
}
</script>
