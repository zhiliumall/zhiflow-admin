<script setup lang="ts">
import { useNav } from "@/layout/hooks/useNav";
import { ref, watch } from "vue";

const screenIcon = ref();
const { toggle, isFullscreen, Fullscreen, ExitFullscreen } = useNav();

isFullscreen.value = !!(
  document.fullscreenElement ||
  document.webkitFullscreenElement ||
  document.mozFullScreenElement ||
  document.msFullscreenElement
);

watch(
  isFullscreen,
  (full) => {
    screenIcon.value = full ? ExitFullscreen : Fullscreen;
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <span class="fullscreen-icon" :title="isFullscreen ? '退出全屏' : '全屏'" @click="toggle">
    <!-- 全屏/退出全屏 inline SVG，跟随 currentColor -->
    <svg v-if="!isFullscreen" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <path d="M21 16v3a2 2 0 0 1-2 2h-3" /><path d="M8 21H5a2 2 0 0 1-2-2v-3" />
    </svg>
    <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" />
    </svg>
  </span>
</template>

<style lang="scss" scoped>
/* 34×34 图标按钮 */
.fullscreen-icon {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  color: var(--dc-text-2);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;

  &:hover {
    color: var(--dc-brand);
    background: var(--dc-bg-page); // #F5F6FA
  }
}
</style>
