<template>
  <div class="dc-state" :class="{ 'dc-state--static': !absolute }">
    <slot name="illustration">
      <div class="dc-empty-art">
        <div class="dc-empty-art__back" />
        <div class="dc-empty-art__front" />
        <div class="dc-empty-art__bar" />
        <div class="dc-empty-art__dot" />
      </div>
    </slot>
    <div class="dc-state__title">{{ title }}</div>
    <div v-if="description" class="dc-state__desc">{{ description }}</div>
    <div v-if="actionText || $slots.action" class="dc-state__action">
      <slot name="action">
        <el-button type="primary" @click="emit('action')">{{ actionText }}</el-button>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    actionText?: string;
    absolute?: boolean;
  }>(),
  { title: "暂无数据", description: "", actionText: "", absolute: true },
);

const emit = defineEmits<{ action: [] }>();
</script>
