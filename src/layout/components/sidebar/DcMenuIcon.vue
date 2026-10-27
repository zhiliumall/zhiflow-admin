<!--
  DcMenuIcon —— 侧栏菜单图标。

  优先用菜单自己的图标（后端 sys_menu.icon）：
    - `ic_*` / `icon-*`：图标库里的 SVG symbol（src/assets/iconfont-ic、iconfont-menu），按 `<use href>` 渲染；
    - `xx:yy`：已在 re-icon/src/offlineIcon.ts 本地注册的 iconify 图标；
  图标名为空或在图标库里找不到时，回落到按菜单标题选的本地线性图标（./menu-icons.ts）。
  颜色恒为 currentColor，由外层 CSS 的 color 决定。

  Props:
    icon?: string  —— 菜单图标名（sys_menu.icon）
    name?: string  —— 兜底线性图标名（见 menu-icons.ts 的 LUCIDE_PATHS）
    size?: number  —— 边长 px，默认 14
    stroke?: number—— 兜底线性图标的线宽，默认 1.7
-->
<template>
  <svg
    v-if="spriteIcon"
    class="dc-menu-icon-sprite"
    :width="size"
    :height="size"
    aria-hidden="true"
    focusable="false"
  >
    <use :href="`#${spriteIcon}`" />
  </svg>
  <IconifyIconOffline
    v-else-if="iconifyIcon"
    :icon="iconifyIcon"
    :style="{ fontSize: `${size}px`, width: `${size}px`, height: `${size}px` }"
    aria-hidden="true"
  />
  <svg
    v-else
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="stroke"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    style="display: block; flex: none"
  >
    <path v-for="(d, i) in paths" :key="i" :d="d" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { hasSpriteGlyph, isOfflineIconRegistered } from "@/components/re-icon/src/glyphs";
import { lucidePaths } from "./menu-icons";

defineOptions({ name: "DcMenuIcon" });

const props = withDefaults(
  defineProps<{
    icon?: string | null;
    name?: string | null;
    size?: number;
    stroke?: number;
  }>(),
  { icon: "", name: "", size: 14, stroke: 1.7 },
);

const spriteIcon = computed(() => {
  const icon = props.icon?.trim();
  return icon && hasSpriteGlyph(icon) ? icon : "";
});
const iconifyIcon = computed(() => {
  const icon = props.icon?.trim();
  return icon && icon.includes(":") && isOfflineIconRegistered(icon) ? icon : "";
});
const paths = computed(() => lucidePaths(props.name));
</script>

<style scoped lang="scss">
.dc-menu-icon-sprite {
  display: block;
  flex: none;
  color: currentColor;
  fill: currentColor;
}
</style>
