<template>
  <transition name="dc-batch">
    <div v-if="count > 0" class="dc-batch-bar">
      <span class="dc-batch-bar__count">已选 <b>{{ count }}</b> 项</span>
      <slot />
    </div>
  </transition>
</template>

<script setup lang="ts">
defineProps<{ count: number }>();
</script>
