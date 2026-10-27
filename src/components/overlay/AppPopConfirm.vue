<!-- L1 · 行内轻确认气泡（锚定触发元素）
     「三级摩擦」L1 —— 最轻的一级确认
     适用：行内轻操作（取消收藏 / 移出常用 等可逆、无资金、无前台可见性影响）。
     阴影 --shadow-pop；点击外部 / ESC = 取消。
     由 overlay/mount.ts 命令式挂载，onResolve / onReject 回传。 -->
<template>
  <div class="app-pop" :style="pos">
    <div class="app-pop__title">
      <span class="app-pop__mark">!</span>
      <span>{{ title }}</span>
    </div>
    <div class="app-pop__btns">
      <button type="button" class="app-pop__btn" @click="cancel">{{ cancelText }}</button>
      <button type="button" class="app-pop__btn app-pop__btn--primary" @click="ok">
        {{ verb }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

const props = defineProps<{
  anchor: HTMLElement;
  title: string;
  verb: string;
  cancelText: string;
  onResolve: () => void;
  onReject: (reason?: unknown) => void;
}>();

const POP_W = 232;
const GAP = 8;
const pos = ref<Record<string, string>>({});

/** 锚点下方居中；下方放不下则翻到上方（气泡跟随触发元素） */
function place(): void {
  const r = props.anchor.getBoundingClientRect();
  const left = Math.min(
    Math.max(8, r.left + r.width / 2 - POP_W / 2 + window.scrollX),
    window.scrollX + document.documentElement.clientWidth - POP_W - 8,
  );
  const below = window.innerHeight - r.bottom > 140;
  pos.value = below
    ? { left: `${left}px`, top: `${r.bottom + GAP + window.scrollY}px` }
    : { left: `${left}px`, top: `${r.top - GAP + window.scrollY}px`, transform: "translateY(-100%)" };
}

function ok(): void {
  props.onResolve();
}

function cancel(): void {
  props.onReject("cancel");
}

function onDocClick(e: MouseEvent): void {
  const t = e.target as Node;
  if (props.anchor.contains(t)) return;
  const root = document.querySelector(".app-pop");
  if (root && root.contains(t)) return;
  cancel();
}

function onKey(e: KeyboardEvent): void {
  if (e.key === "Escape") cancel();
}

onMounted(() => {
  place();
  // 延后一帧再挂，避免触发本次点击的冒泡立刻关掉气泡
  setTimeout(() => document.addEventListener("click", onDocClick), 0);
  document.addEventListener("keydown", onKey);
  window.addEventListener("resize", place);
  window.addEventListener("scroll", place, true);
});

onUnmounted(() => {
  document.removeEventListener("click", onDocClick);
  document.removeEventListener("keydown", onKey);
  window.removeEventListener("resize", place);
  window.removeEventListener("scroll", place, true);
});
</script>

<style scoped>
/* L1 轻确认气泡。组件定位与样式都以 232px 宽度为基准，确保中文标题可读且锚点对齐。
   色板、圆角、阴影和动效令牌统一来自 src/style/overlay.scss。 */
.app-pop {
  position: absolute;
  z-index: var(--z-confirm);
  box-sizing: border-box;
  width: 232px;
  padding: 10px 12px;
  background: var(--overlay-surface);
  border: 1px solid #e7ecf3;
  border-radius: 8px;
  box-shadow: var(--shadow-pop);
  animation: overlay-pop-in var(--motion-confirm) var(--overlay-ease) both;
}

.app-pop__title {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--overlay-ink-strong);
}

.app-pop__mark {
  flex: none;
  font-weight: 700;
  color: var(--overlay-warn);
}

.app-pop__btns {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.app-pop__btn {
  padding: 3px 8px;
  font-size: 14px;
  color: var(--overlay-ink-2);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--btn-radius);
}

.app-pop__btn:hover {
  color: var(--overlay-ink-strong);
  background: var(--overlay-divider);
}

.app-pop__btn--primary {
  padding: 3px 10px;
  color: #fff;
  background: var(--overlay-primary);
}

.app-pop__btn--primary:hover {
  color: #fff;
  background: var(--overlay-primary-hover);
}
</style>
