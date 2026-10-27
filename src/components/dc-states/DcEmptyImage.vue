<template>
  <img
    class="dc-empty-image"
    :class="`dc-empty-image--${size}`"
    :src="src"
    :alt="alt"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    src: string;
    alt: string;
    size?: "page" | "panel" | "compact";
  }>(),
  { size: "page" },
);
</script>

<style scoped>
.dc-empty-image {
  display: block;
  max-width: 100%;
  height: auto;
  object-fit: contain;
}

.dc-empty-image--page {
  width: clamp(160px, 18vw, 200px);
}

.dc-empty-image--panel {
  width: clamp(128px, 14vw, 160px);
}

.dc-empty-image--compact {
  width: clamp(96px, 10vw, 120px);
}
</style>
