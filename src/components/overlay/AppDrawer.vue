<!-- AppDrawer · 列表编辑 / 详情统一件（弹窗与反馈体系）
       尺寸 480 / 800 两档（size="m|l"），左侧向阴影、入场动效、
       header 15·600 + 下分隔（与正文首行等距 16）；footer 与弹窗同规格。
     行为契约：loading 锁 / dirty 挽留 / destroy-on-close / Esc 走 dirty 闸门。

     ⚠️ append-to-body：内容挂到 <body> 直下，页面里带作用域根类的 scss
        （如 `.my-page .xxx`）与挂在根类上的 CSS 变量**都会失效**。
        调用方若要用页面自己的内容样式，必须给本组件传一个全局作用域类
        （`<AppDrawer class="xx-overlay-scope">`），并把那批规则从页面根类下提出来。
        皮肤本身不需要额外类：src/style/overlay.scss 已完整换皮 `.el-drawer`
        （阴影 / header / body / footer 分隔线）与 `.el-drawer__footer > .el-button`。 -->
<template>
  <el-drawer
    v-model="visible"
    :title="title"
    :size="size === 'l' ? DRAWER_SIZE_LG : DRAWER_SIZE"
    :close-on-click-modal="!dirty && !busy"
    :close-on-press-escape="false"
    append-to-body
    destroy-on-close
    @closed="emit('closed')"
  >
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>

    <slot />

    <template v-if="showFooter" #footer>
      <div class="app-drawer__footer">
        <slot name="footer">
          <el-button :disabled="busy" @click="requestClose">{{ cancelText }}</el-button>
          <el-button
            v-if="confirmText"
            :type="confirmDanger ? 'danger' : 'primary'"
            :loading="busy"
            :disabled="busy"
            @click="handleConfirm"
          >
            {{ busy ? busyText : confirmText }}
          </el-button>
        </slot>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, useSlots, watch } from "vue";

import { appConfirm } from "./confirm";
import { DRAWER_SIZE, DRAWER_SIZE_LG } from "./sizes";

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    /** m = 480（默认）/ l = 800 */
    size?: "m" | "l";
    confirmText?: string;
    cancelText?: string;
    busyText?: string;
    confirmDanger?: boolean;
    hideFooter?: boolean;
    dirty?: boolean;
    onConfirm?: () => unknown | Promise<unknown>;
  }>(),
  {
    title: "",
    size: "m",
    confirmText: "",
    cancelText: "取消",
    busyText: "提交中…",
    confirmDanger: false,
    hideFooter: false,
    dirty: false,
    onConfirm: undefined,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "confirm"): void;
  (e: "cancel"): void;
  (e: "closed"): void;
}>();

const slots = useSlots();

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit("update:modelValue", v),
});

/**
 * 详情型抽屉常常没有提交动作：既不传 confirmText 也没有自定义 footer 时整段不渲染，
 * 正文直接顶到底（不留一条空的分隔线）。
 */
const showFooter = computed(() => !props.hideFooter && (!!props.confirmText || !!slots.footer));

const busy = ref(false);

async function requestClose(): Promise<void> {
  if (busy.value) return;
  if (props.dirty) {
    try {
      await appConfirm({
        intent: "discard",
        title: "修改尚未保存",
        body: "关闭后已填写的内容不会保存。",
        verb: "放弃修改",
      });
    } catch {
      return;
    }
  }
  emit("cancel");
  visible.value = false;
}

async function handleConfirm(): Promise<void> {
  if (busy.value) return;
  emit("confirm");
  if (!props.onConfirm) return;
  busy.value = true;
  try {
    await props.onConfirm();
  } finally {
    busy.value = false;
  }
}

/** EP 自带的 Esc 已关（close-on-press-escape=false），否则会绕过 dirty 挽留直接关窗 */
function onKey(e: KeyboardEvent): void {
  if (e.key === "Escape") void requestClose();
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) document.addEventListener("keydown", onKey);
    else document.removeEventListener("keydown", onKey);
  },
  { immediate: true },
);

onUnmounted(() => document.removeEventListener("keydown", onKey));

defineExpose({ requestClose });
</script>

<style scoped>
/* 全局 overlay.scss 的 `.el-drawer__footer` 只给了 padding + 上分隔线，
   按钮排布要各件自己出（共享件不能依赖页面局部皮肤）。几何照 overlay.scss「gap 10 · 右对齐」。 */
.app-drawer__footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
</style>
