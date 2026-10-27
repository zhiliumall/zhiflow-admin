<!--
  DcFormDialog —— 自绘表单弹窗壳
  结构：图标 chip + 副标题 + 分组头 + 两列 + 计数 + pill 段选
  用法：
    <DcFormDialog v-model="open" title="新增角色" subtitle="带 * 为必填项，保存后立即生效"
                  :width="640" :saving="saving" @save="onSave" @cancel="onCancel">
      <div class="dcfd-section"><i /><span>角色信息</span></div>
      <div class="dcfd-field">... </div>            // 半列
      <div class="dcfd-field dcfd-field--full">...</div>  // 整宽
    </DcFormDialog>
  说明：遮罩不可关；关闭 X / Esc 触发 @cancel（脏检查由父组件在 @cancel 里决定）。
  字段/分组/pill 全部用下方全局辅助类（非 scoped，供 slot 内容使用）。
-->
<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      ref="maskEl"
      class="dcfd-mask"
      :style="{ zIndex: maskZIndex }"
    >
      <div
        ref="panelEl"
        class="dcfd-panel"
        :style="{ width: width + 'px' }"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="subtitle ? subtitleId : undefined"
        tabindex="-1"
        @keydown.tab="onTabKey"
      >
        <!-- 头部：图标 chip + 标题 + 副标题 + 关闭 -->
        <div class="dcfd-header">
          <!-- 头部图标随 mode 切换（新增 + ／编辑 铅笔 ／只读 锁），
               否则只读的「预览」态看起来像新增。 -->
          <span v-if="!hideIcon" class="dcfd-icon">
            <slot name="icon">
              <!-- 只读：锁 -->
              <svg
                v-if="mode === 'view'"
                width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"
              >
                <path d="M5 11a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
                <path d="M8 9V6a4 4 0 1 1 8 0v3" />
              </svg>
              <!-- 编辑：铅笔 -->
              <svg
                v-else-if="mode === 'edit'"
                width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
              <!-- 新增：+ -->
              <svg
                v-else
                width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round"
              ><path d="M12 5v14M5 12h14" /></svg>
            </slot>
          </span>
          <div class="dcfd-head-text">
            <div :id="titleId" class="dcfd-title">{{ title }}</div>
            <div v-if="subtitle" :id="subtitleId" class="dcfd-subtitle">{{ subtitle }}</div>
          </div>
          <button
            type="button"
            class="dcfd-close"
            :aria-label="cancelText"
            @click="onCancel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <!-- ══ 缺必填定位条 ══
             父组件在 validate() 失败后传 missingCount = 出错字段数；> 0 才出这一条。
             点它会把弹窗体滚到**第一个** .is-error 控件并聚焦 —— 这正是「定位条」
             三个字的由来（长表单里光有红字提示，用户仍要自己找是哪一格）。 -->
        <div
          v-if="missingCount > 0"
          class="dcfd-locator"
          role="alert"
          title="点击定位到第一个未填写的必填项"
          @click="scrollToFirstError"
        >
          仍有 {{ missingCount }} 个必填项未填写,请补全后再保存
        </div>

        <!-- 体：栅格（默认两列；窄弹窗传 :columns="1"） -->
        <div class="dcfd-body" :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }">
          <slot />
        </div>

        <!-- 脚：取消 / 保存 -->
        <div class="dcfd-footer">
          <slot name="footer">
            <button class="dcfd-btn dcfd-btn--cancel" @click="onCancel">{{ cancelText }}</button>
            <button class="dcfd-btn dcfd-btn--save" :disabled="saving" @click="onSave">
              {{ saving ? "保存中…" : saveText }}
            </button>
          </slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, watch, nextTick, onBeforeUnmount, useId } from "vue";
import { useZIndex } from "element-plus";

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    subtitle?: string;
    width?: number;
    /** 表单栅格列数；480 这类窄弹窗传 1，否则每个字段都得手工加 --full */
    columns?: number;
    saving?: boolean;
    /**
     * 弹窗形态 —— 只影响**头部图标**：
     *   'add'（缺省）= `+` ／ 'edit' = 铅笔 ／ 'view' = 锁
     * 页面本来就有 `mode` 变量，直接透传即可：`:mode="mode"`。
     * 只读态的**按钮区**仍由页面控制（通常隐藏保存、把取消改成「关闭」）。
     */
    mode?: "add" | "edit" | "view";
    hideIcon?: boolean;
    /**
     * 未填写的必填项数量。> 0 时头部下方出红色定位条
     * 「仍有 N 个必填项未填写，请补全后再保存」。
     *
     * 页面接线（必须做，否则这条永远不出）：
     * ```ts
     * const errors = reactive<Record<string, string>>({});
     * const missingCount = computed(() => Object.keys(errors).length);
     *
     * function validate() {
     *   Object.keys(errors).forEach((k) => delete errors[k]);
     *   if (!form.name?.trim()) errors.name = "请输入名称";
     *   // …其余规则（含从 avue crud rules 手工搬过来的异步查重）
     *   return missingCount.value === 0;
     * }
     * function onSave() { if (!validate()) return; submit(); }
     * ```
     * ```vue
     * <DcFormDialog :missing-count="missingCount" …>
     *   <!-- 出错的控件加 .is-error，定位条才能滚到它 -->
     *   <input class="dcfd-input" :class="{ 'is-error': errors.name }" v-model="form.name">
     *   <div v-if="errors.name" class="dcfd-error">{{ errors.name }}</div>
     * </DcFormDialog>
     * ```
     * ⚠ 只在**点过一次保存之后**才让它有值：一进弹窗就红着，等于每个新增都先挨一顿骂。
     */
    missingCount?: number;
    saveText?: string;
    cancelText?: string;
  }>(),
  {
    subtitle: "",
    width: 640,
    columns: 2,
    saving: false,
    mode: "add",
    hideIcon: false,
    missingCount: 0,
    saveText: "保存",
    cancelText: "取消",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "cancel"): void;
  (e: "save"): void;
}>();

/**
 * 遮罩层级：必须取 Element Plus 自己的 z-index 计数器，不能写死。
 * EP 的 popper（el-select 下拉 / el-date-picker / tooltip…）从 2000 起自增，
 * 写死 2100 会让弹窗内 select 的下拉「看得见但点不到」——下拉浮层 z-index
 * 只有 2033，被 2100 的遮罩盖住，elementFromPoint 命中 .dcfd-body。
 * 每次打开时取一次 nextZIndex()，之后再开的 popper 必然比遮罩高。
 */
const { nextZIndex } = useZIndex();
const maskZIndex = ref(2100);

const maskEl = ref<HTMLElement | null>(null);
const panelEl = ref<HTMLElement | null>(null);
const uid = useId();
const titleId = `dcfd-title-${uid}`;
const subtitleId = `dcfd-subtitle-${uid}`;

/**
 * 打开中的实例栈：Esc 只关最上面那个。
 * 每个实例各自挂 window 监听时，嵌套两层弹窗按一次 Esc 会把两层一起关掉。
 */
const openStack: symbol[] = [];
const instanceKey = Symbol("dcfd");

// 关闭：同时同步 v-model 与 @cancel（父组件可只监听其一）
function onCancel() {
  emit("update:modelValue", false);
  emit("cancel");
}
function onSave() {
  emit("save");
}

/**
 * 定位条点击：滚到弹窗体内第一个 .is-error 控件并聚焦。
 * 找不到 .is-error 时什么都不做 —— 页面没给控件加 is-error 是页面的锅，
 * 这里不要退而求其次去猜「第一个空的输入框」，猜错比不动更糟。
 */
function scrollToFirstError() {
  const first = panelEl.value?.querySelector<HTMLElement>(".is-error");
  if (!first) return;
  first.scrollIntoView({ behavior: "smooth", block: "center" });
  first.focus?.();
}

/**
 * 页面上是否有打开着的 EP 浮层（select 下拉 / 日期选择器 / cascader…）。
 * EP 的这些组件自己处理 Escape 但**不** stopPropagation，若不判断，
 * 用户按 Esc 想关下拉，会连整个表单一起关掉。
 */
function hasOpenPopper() {
  // EP 关闭浮层时会同时设 aria-hidden="true" 和内联 display:none，但不同组件/版本
  // 未必两者都有，所以两个信号都判，且用计算样式而不是匹配内联 style 字符串。
  return Array.from(document.querySelectorAll<HTMLElement>(".el-popper")).some(
    (el) =>
      el.getAttribute("aria-hidden") !== "true" &&
      getComputedStyle(el).display !== "none",
  );
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  if (!props.modelValue || props.saving) return; // 保存中不响应，避免请求飞行途中弹窗消失
  if (openStack[openStack.length - 1] !== instanceKey) return; // 只有最上层实例响应
  if (hasOpenPopper()) return; // 先让 EP 浮层自己吃掉这次 Esc
  onCancel();
}

/** 焦点陷阱：Tab / Shift+Tab 在面板内循环，不让焦点跑到背后的页面 */
function onTabKey(e: KeyboardEvent) {
  const root = panelEl.value;
  if (!root) return;
  const items = Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement as HTMLElement | null;
  if (e.shiftKey && (active === first || active === root)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

// body 滚动锁（计数式：多层弹窗只在最后一层关闭时还原）
let lockedByMe = false;
function lockScroll() {
  if (lockedByMe) return;
  const n = Number(document.body.dataset.dcfdLock || 0) + 1;
  document.body.dataset.dcfdLock = String(n);
  if (n === 1) {
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.dataset.dcfdPrevOverflow = document.body.style.overflow;
    document.body.dataset.dcfdPrevPad = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
  }
  lockedByMe = true;
}
function unlockScroll() {
  if (!lockedByMe) return;
  const n = Math.max(0, Number(document.body.dataset.dcfdLock || 1) - 1);
  document.body.dataset.dcfdLock = String(n);
  if (n === 0) {
    document.body.style.overflow = document.body.dataset.dcfdPrevOverflow || "";
    document.body.style.paddingRight = document.body.dataset.dcfdPrevPad || "";
    delete document.body.dataset.dcfdPrevOverflow;
    delete document.body.dataset.dcfdPrevPad;
  }
  lockedByMe = false;
}

let lastFocused: HTMLElement | null = null;

function onOpen() {
  maskZIndex.value = nextZIndex();
  openStack.push(instanceKey);
  lastFocused = document.activeElement as HTMLElement | null;
  lockScroll();
  // 捕获阶段：EP 的 select 即使在下拉已关闭时也会吞掉 Escape，冒泡阶段收不到，
  // 结果是「点过一次下拉之后，Esc 再也关不掉弹窗」。改在捕获阶段先拿到事件，
  // 再由 hasOpenPopper() 决定这次 Esc 该给浮层还是给弹窗。
  window.addEventListener("keydown", onKeydown, true);
  // 初始焦点给面板本身，避免落在背后页面上
  nextTick(() => panelEl.value?.focus());
}

function onClose() {
  const i = openStack.lastIndexOf(instanceKey);
  if (i > -1) openStack.splice(i, 1);
  unlockScroll();
  window.removeEventListener("keydown", onKeydown, true);
  lastFocused?.focus?.(); // 焦点还给打开它的那个元素
  lastFocused = null;
}

// ⚠ immediate:true 不可省：页面若「挂载即打开」（v-if 包裹 / setup 里同步置 true /
// 深链打开），watcher 不触发 → 遮罩退回写死的 2100，被 EP 浮层盖住的 z-index bug
// 会原样复活，且 Esc 监听也不会挂上。
watch(
  () => props.modelValue,
  (v) => (v ? onOpen() : onClose()),
  { immediate: true },
);
onBeforeUnmount(onClose);
</script>

<!-- 非 scoped：壳 + 字段/分组/pill 辅助类均为全局，供各页 slot 内容复用 -->
<style lang="scss">
@keyframes dcfd-fade {
  from { opacity: 0; }

  to { opacity: 1; }
}

@keyframes dcfd-up {
  from { opacity: 0; transform: translateY(14px); }

  to { opacity: 1; transform: translateY(0); }
}

.dcfd-mask {
  position: fixed;
  inset: 0;
  z-index: 2100; /* 兜底；实际由内联 style 的 EP nextZIndex() 覆盖，见 script 注释 */
  display: flex;

  /* 水平垂直都居中，对齐全站弹窗标准（顶部偏移的话弹窗矮时下方留白明显） */
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  overflow: auto;
  background: rgb(0 0 0 / 40%);
  animation: dcfd-fade 150ms ease;
}

.dcfd-panel {
  display: flex;
  flex-direction: column;
  max-width: calc(100vw - 32px);
  max-height: 86vh;
  overflow: hidden;
  background: var(--dc-surface);
  border-radius: var(--dc-radius-xl); /* 12 */
  box-shadow: 0 12px 40px rgb(0 0 0 / 18%);
  animation: dcfd-up 180ms ease;
}

/* ---- 头部 ---- */
.dcfd-header {
  display: flex;
  flex: none;
  gap: 12px;

  /* 与图标 chip 垂直居中对齐：flex-start 是照「标题+副标题」两行文字块估的高度，
     副标题收口后大量弹窗只剩一行标题，文字块矮了一截，continued flex-start
     会让图标看起来比标题偏下（标题贴顶、图标居中于自身 36px 高）。center 在
     一行和两行文字块下都居中对齐，两种情况都好看。 */
  align-items: center;
  padding: 18px 24px 14px;
  border-bottom: 1px solid var(--dc-divider);
}

.dcfd-icon {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--dc-brand);
  background: var(--dc-brand-soft);
  border-radius: var(--dc-radius-lg);
}

.dcfd-head-text {
  flex: 1;
  min-width: 0;
}

.dcfd-title {
  font-size: var(--dc-fs-16);
  font-weight: 600;
  line-height: 1.3;
  color: var(--dc-text-1);
}

.dcfd-subtitle {
  margin-top: 4px;
  font-size: 14px;
  color: var(--dc-text-3);
}

.dcfd-close {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--dc-text-3);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: var(--dc-radius-md);

  &:hover { color: var(--dc-text-1); background: var(--dc-bg-page); }

  &:focus-visible {
    outline: 2px solid var(--dc-brand);
    outline-offset: 1px;
  }
}

/* ---- 缺必填定位条 ----
   padding:8px 24px / background:var(--error-bg) / font-size:12.5px / color:var(--error) / flex:none
   即**通栏色条**（与头部同宽、贴着头部下沿），不是带外边距的圆角卡片，也没有图标，只有纯文字。 */
.dcfd-locator {
  display: flex;
  flex: none;
  gap: 6px;
  align-items: center;
  padding: 8px 24px;
  font-size: 14px;
  color: var(--dc-danger);
  cursor: pointer;
  background: var(--dc-danger-soft);

  &:hover { text-decoration: underline; }
}

/* ---- 体：两列 grid ---- */
.dcfd-body {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(2, minmax(0, 1fr)); /* 兜底；实际由 :columns prop 内联覆盖 */
  gap: 16px 20px;
  padding: 18px 24px;
  overflow-y: auto;
}

.dcfd-panel:focus { outline: none; }

/* 分组头（品牌竖条 + 标题，整宽） */
.dcfd-section {
  display: flex;
  grid-column: 1 / -1;
  gap: 8px;
  align-items: center;
  min-width: 0;
  margin-top: 2px;
  font-size: var(--dc-fs-14);
  font-weight: 600;
  color: var(--dc-text-1);

  > i {
    display: inline-block;
    flex: none;
    width: 3px;
    height: 12px;
    background: var(--dc-brand);
    border-radius: 2px;
  }

  em {
    margin-left: 4px;
    font-size: var(--dc-fs-14);
    font-style: normal;
    font-weight: 400;
    color: var(--dc-text-3);
  }
}

/* 字段（label + 控件 + 说明；半列，整宽用 --full） */
.dcfd-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;

  &--full { grid-column: 1 / -1; }
}

.dcfd-label {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: var(--dc-text-2);

  em {
    margin-right: 3px;
    font-size: var(--dc-fs-14);
    font-style: normal;
    color: var(--dc-danger);
  }
}

.dcfd-control { position: relative; }

.dcfd-input,
.dcfd-textarea {
  width: 100%;
  font-family: inherit;
  font-size: var(--dc-fs-14);
  color: var(--dc-text-1);
  background: var(--dc-surface);
  border: 1px solid var(--dc-border);
  border-radius: var(--dc-radius-md);
  outline: none;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;

  &::placeholder { color: var(--dc-text-4); }

  &:focus { border-color: var(--dc-brand); box-shadow: var(--dc-focus-ring); }

  &.is-error { background: #fff7f7; border-color: var(--dc-danger); }
}

.dcfd-input {
  height: 36px;
  padding: 0 12px;
}

.dcfd-textarea {
  min-height: 82px;
  padding: 9px 12px;
  line-height: 1.6;
  resize: vertical;
}

/* Element 控件（select / tree-select / 上传）与原生输入对齐：36 / 6 / 13 */
.dcfd-field {
  .el-select,
  .el-tree-select,
  .el-cascader {
    width: 100%;
  }

  .el-select__wrapper,
  .el-input__wrapper {
    min-height: 36px;
    font-size: var(--dc-fs-14);
    border-radius: var(--dc-radius-md);
  }
}

.dcfd-counter {
  position: absolute;
  right: 10px;
  bottom: 8px;
  font-size: var(--dc-fs-14);
  color: var(--dc-text-4);
  pointer-events: none;
}

.dcfd-input + .dcfd-counter { top: 10px; bottom: auto; }

.dcfd-helper {
  font-size: 14px;
  line-height: 1.5;
  color: var(--dc-text-3);
}

.dcfd-error {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 14px;
  color: var(--dc-danger);
}

/* pill 段选（数据范围等） */
.dcfd-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dcfd-pill {
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 14px;
  font-size: 12px;
  color: var(--dc-text-2);
  cursor: pointer;
  user-select: none;
  background: var(--dc-surface);
  border: 1px solid var(--dc-border);
  border-radius: var(--dc-radius-md);
  transition: all 0.12s ease;

  &:hover { border-color: var(--dc-brand-border); }

  &.is-active {
    color: var(--dc-brand);
    background: var(--dc-brand-soft);
    border-color: var(--dc-brand-border);
  }
}

/* ---- 脚 ---- */
.dcfd-footer {
  display: flex;
  flex: none;
  gap: 10px;
  justify-content: flex-end;
  padding: 13px 24px;
  background: var(--dc-surface);
  border-top: 1px solid var(--dc-divider);
}

.dcfd-btn {
  height: 34px;
  padding: 0 16px;
  font-family: inherit;
  font-size: var(--dc-fs-14);
  cursor: pointer;
  border-radius: var(--dc-radius-md);
  transition: all 0.12s ease;

  &--cancel {
    color: var(--dc-text-2);
    background: var(--dc-surface);
    border: 1px solid var(--dc-border);

    &:hover { color: var(--dc-brand); border-color: var(--dc-brand); }
  }

  &--save {
    min-width: 88px;
    font-weight: 400;
    color: #fff;
    background: var(--dc-brand);
    border: none;

    &:hover { background: var(--dc-brand-hover); }

    &:disabled { cursor: not-allowed; opacity: 0.7; }
  }
}
</style>
