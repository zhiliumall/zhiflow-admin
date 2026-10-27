<!-- L3 · 危险闸门（460 逐字输入解锁）
     「三级摩擦」L3 —— 460px 逐字输入名称解锁，
     返回审计 payload { typedName, impact, ts } 供调用方随请求落日志。
     触发规则：不可逆 / 资金 / 批量 ≥20 / 影响前台可见性。

     不走 ElMessageBox 的原因：闸门要求「输入不匹配前主按钮 disabled」，
     MessageBox 的按钮态不可控。皮肤复用 .app-confirm + .app-gate（宽度 460）。
     由 overlay/mount.ts 命令式挂载，通过 onResolve / onReject 回传。 -->
<template>
  <div class="app-gate-mask app-confirm-mask" @click.self="cancel">
    <div
      :class="['app-confirm', `app-confirm--${intent}`, 'app-gate', 'el-message-box']"
      role="dialog"
    >
      <div class="app-gate__close" @click="cancel">✕</div>

      <div class="app-confirm__headline">
        <div class="app-confirm__icon">
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path v-for="d in INTENT_ICON_PATHS[intent]" :key="d" :d="d" />
          </svg>
        </div>

        <div class="app-confirm__title">{{ title }}</div>
      </div>

      <div class="app-confirm__impact">{{ impact }}</div>

      <div class="app-gate__hint">
        请输入 <span class="app-gate__name">{{ name }}</span> 以确认此操作
      </div>
      <input
        ref="inputRef"
        v-model="typed"
        class="app-gate__input"
        :placeholder="name"
        @keyup.enter="unlocked && submit()"
      />

      <div class="app-gate__btns">
        <button type="button" class="app-modal__btn app-modal__btn--ghost" @click="cancel">
          取消
        </button>
        <button
          type="button"
          class="app-modal__btn app-modal__btn--danger"
          :class="{ 'is-disabled': !unlocked }"
          :disabled="!unlocked"
          @click="submit"
        >
          {{ verb }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";

import { INTENT_ICON_PATHS, type AppIntent } from "./intent";

const props = defineProps<{
  name: string;
  impact: string;
  title: string;
  verb: string;
  /** 图标形状与配色（intent.ts 四意图）；默认 danger 保持既有外观 */
  intent: AppIntent;
  onResolve: (v: { typedName: string; impact: string; ts: number }) => void;
  onReject: (reason?: unknown) => void;
}>();

const typed = ref("");
const inputRef = ref<HTMLInputElement | null>(null);

/** 逐字匹配（去首尾空格，大小写敏感——名称是标识符不做宽松匹配） */
const unlocked = computed(() => typed.value.trim() === props.name.trim());

function submit(): void {
  if (!unlocked.value) return;
  props.onResolve({ typedName: typed.value.trim(), impact: props.impact, ts: Date.now() });
}

function cancel(): void {
  props.onReject("cancel");
}

function onKey(e: KeyboardEvent): void {
  if (e.key === "Escape") cancel();
}

onMounted(() => {
  document.addEventListener("keydown", onKey);
  nextTick(() => inputRef.value?.focus());
});

onUnmounted(() => document.removeEventListener("keydown", onKey));
</script>

<style scoped>
/* 遮罩与定位：MessageBox 由 EP 的 overlay 负责，闸门自绘故在此补齐 */
.app-gate-mask {
  position: fixed;
  inset: 0;
  z-index: var(--z-confirm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-gate {
  position: relative;
  box-sizing: border-box;
  width: var(--overlay-w-gate);
  max-width: calc(100vw - 32px);
  padding: var(--overlay-pad);
  background: var(--overlay-surface);
  border-radius: var(--overlay-radius);
  box-shadow: var(--shadow-lg);
  animation: overlay-pop-in var(--motion-confirm) var(--overlay-ease) both;
}

.app-gate__close {
  position: absolute;
  top: 14px;
  right: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 14px;
  color: var(--overlay-ink-3);
  cursor: pointer;
  border-radius: var(--btn-radius);
}

.app-gate__close:hover {
  background: var(--overlay-divider);
}

.app-gate__input {
  width: 100%;
  height: var(--overlay-input-h);
  padding: 0 10px;
  margin-top: 8px;
  font-family: inherit;
  font-size: 14px;
  color: var(--overlay-ink);
  border: 1px solid var(--overlay-input-border);
  border-radius: var(--overlay-input-radius);
  outline: none;
}

.app-gate__input:focus {
  border: 1.5px solid var(--overlay-primary);
  box-shadow: 0 0 0 3px var(--overlay-primary-soft);
}

/* 提示行：字号必须显式给，不给就继承弹窗基准字号，和 16/600 的标题一样大
   （否则闸门上「请输入 X 以确认此操作」看着像第二个标题）。 */
.app-gate__hint {
  margin-top: 12px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--overlay-ink-2);
}

.app-gate__name {
  font-weight: 600;
  color: var(--overlay-ink-strong);
}

.app-gate__btns {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 20px;
}

/* 闸门的两个钮是原生 <button>，拿不到 el-button 的底子，
   不定义 `.app-modal__btn*` 就会渲染成浏览器默认按钮。
   几何照 overlay.scss「按钮组 mt 20 · gap 8 · h32 · 圆角 6」，
   配色与 .app-confirm 的取消钮 / delete 主钮保持同一套令牌。 */
.app-modal__btn {
  height: 32px;
  padding: 0 14px;
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: var(--btn-radius);
  transition:
    background 0.12s var(--overlay-ease),
    color 0.12s var(--overlay-ease);
}

.app-modal__btn--ghost {
  color: var(--overlay-ink-btn);
  background: var(--overlay-surface);
  border-color: var(--overlay-border);
}

/* 取消钮 hover：本闸门恒为 .app-confirm--danger（L3 只用于不可逆/资金/批量≥20/前台可见性
   影响场景，从不降级为 warn），沿用蓝色 hover 会把「退出危险操作」显示成「去做」的信号 ——
   镜像 overlay.scss 里 .app-confirm--danger .app-confirm__cancel:hover 的同一套令牌。 */
.app-modal__btn--ghost:hover {
  color: var(--overlay-danger);
  background: var(--overlay-danger-soft);
  border-color: var(--overlay-danger-border);
}

.app-modal__btn--danger {
  color: #fff;
  background: var(--overlay-danger);
}

.app-modal__btn--danger:hover {
  background: var(--overlay-danger-hover);
}

/* 未逐字输完：主按钮浅化且不可点 */
.app-gate__btns .is-disabled,
.app-gate__btns .is-disabled:hover {
  color: #fff;
  cursor: not-allowed;
  background: var(--overlay-danger-border);
  border-color: var(--overlay-danger-border);
}
</style>
