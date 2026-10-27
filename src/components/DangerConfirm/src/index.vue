<!--
  通用危险操作确认组件
  交互闸门：必须在输入框逐字输入指定名称（如操作名）后，确认按钮才 enabled。
  红线：组件内不做任何权限判断——权限归服务端；本组件只是交互层防误触闸门。
  审计：不另造前端审计通道；高危接口的审计由后端 @SysLog 切面记录（sys_log）。
  confirm 回调附带 { typedName, impact, ts } 供调用方按需拼进请求或日志。
-->
<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="560px"
    :append-to-body="false"
    :close-on-click-modal="false"
    class="danger-confirm"
    @update:model-value="onDialogVisible"
    @close="onClose"
    @closed="emit('closed')"
  >
    <div class="danger-confirm__body">
      <!-- actionName 是本组件既有的「操作名」醒目行；标准确认框没有这一行
           （只有 title + desc），不传 actionName 即可整行不渲染。 -->
      <div v-if="actionName" class="danger-confirm__action">
        <el-icon class="danger-confirm__warn-icon"><WarningFilled /></el-icon>
        <span>{{ actionName }}</span>
      </div>
      <div v-if="descText" class="danger-confirm__impact">{{ descText }}</div>
      <!-- verify 闸门：**只有高危对象**（角色/机构等）才出这一段，
           普通删除只有 desc + 确定/取消。verify 为空 → 整段不渲染、确认钮直接可点。
           提示语「请输入 X 以确认操作」（逐字），
           X 用 monospace + --error 色 + 600 字重；输入框 placeholder 就是 X 本身。 -->
      <template v-if="verifyText">
        <div class="danger-confirm__type-tip">
          请输入 <b>{{ verifyText }}</b> 以确认操作
        </div>
        <el-input
          v-model="typedName"
          class="danger-confirm__input"
          :placeholder="verifyText"
          clearable
          @paste.prevent
          @keyup.enter="onConfirm"
        />
      </template>
    </div>
    <template #footer>
      <el-button class="danger-confirm__cancel-btn" @click="onCancel">
        {{ cancelText }}
      </el-button>
      <el-button
        class="danger-confirm__confirm-btn"
        type="danger"
        :disabled="!matched"
        @click="onConfirm"
      >
        {{ confirmText }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { WarningFilled } from "@element-plus/icons-vue";
import { ElButton, ElDialog, ElIcon, ElInput } from "element-plus";
import { computed, ref, watch } from "vue";

defineOptions({ name: "DangerConfirm" });

export interface DangerConfirmPayload {
  /** 用户逐字输入的确认名称 */
  typedName: string;
  /** 弹窗展示的影响面描述 */
  impact: string;
  /** 确认时间戳（ms） */
  ts: number;
}

const props = withDefaults(
  defineProps<{
    /** 弹窗可见性（v-model） */
    modelValue: boolean;
    /** 弹窗标题 */
    title?: string;
    /** 操作名（醒目展示）；标准确认框没有这一行，一般不传 */
    actionName?: string;
    /** 影响面描述（旧 API）；新代码请改用 `desc` */
    impact?: string;
    /**
     * 必须逐字输入的指定名称（**旧 API**，语义保持不变：
     * 只要传了本 prop，闸门就一定存在；传空串 = 闸门永久关闭，防止空匹配放行）。
     * 新代码请改用 `verify`。
     */
    requireTypedName?: string;

    // ───────── 新 API ─────────
    /**
     * 后果说明，渲染在标题下方。
     * 例：「删除角色将同时移除其全部权限点,使用该角色的账号将失去对应访问能力,不可恢复。」
     * 与旧 prop `impact` 同一个位置；两者都传时以 `desc` 为准。
     */
    desc?: string;
    /**
     * 高危闸门：用户必须逐字输入等于本值的文本，确认钮才可点。
     * **不传 / 传空串 = 没有闸门**（普通删除确认，确认钮直接可点）——
     * 这与旧 prop `requireTypedName` 传空串的语义**不同**，故意分成两个 prop：
     * 旧调用方靠「空串 = 锁死」做防御，改语义会把它们变成一点就删。
     */
    verify?: string;

    confirmText?: string;
    cancelText?: string;
  }>(),
  {
    title: "危险操作确认",
    actionName: "",
    impact: "",
    requireTypedName: undefined,
    desc: "",
    verify: "",
    confirmText: "确认执行",
    cancelText: "取消",
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "confirm", payload: DangerConfirmPayload): void;
  (e: "cancel"): void;
  (e: "closed"): void;
}>();

const typedName = ref("");

/** 后果说明：新 API `desc` 优先，回落到旧 API `impact` */
const descText = computed(() => props.desc || props.impact);

/**
 * 闸门是否存在：
 *  - 传了新 API `verify`（非空）→ 有闸门
 *  - 传了旧 API `requireTypedName`（哪怕是空串）→ 有闸门（保留「空串锁死」的防御语义）
 *  - 两个都没传 → 无闸门，退化成普通「确定 / 取消」确认框（普通删除就是这样）
 */
const gated = computed(() => !!props.verify || props.requireTypedName !== undefined);

/** 需要逐字输入的文本；`verify` 优先 */
const verifyText = computed(() =>
  gated.value ? props.verify || props.requireTypedName || "" : ""
);

/** 防御：有闸门但目标文本为空串时保持关闭，避免空匹配放行 */
const matched = computed(() => {
  if (!gated.value) return true;
  return verifyText.value !== "" && typedName.value.trim() === verifyText.value;
});

watch(
  () => props.modelValue,
  visible => {
    if (visible) typedName.value = "";
  }
);

let confirmed = false;

function close() {
  emit("update:modelValue", false);
}

function onConfirm() {
  if (!matched.value) return;
  confirmed = true;
  emit("confirm", {
    typedName: typedName.value.trim(),
    // 回传实际展示的后果说明（desc 优先，回落 impact），不是原样回传 impact prop
    impact: descText.value,
    ts: Date.now(),
  });
  close();
}

function onCancel() {
  confirmed = false;
  emit("cancel");
  close();
}

function onDialogVisible(value: boolean) {
  if (!value) onCancel();
}

/**
 * 弹窗关闭收尾：重置 confirmed 标记。
 * ×/ESC 路径由 el-dialog 的 update:model-value(false) → onDialogVisible → onCancel 覆盖（安全退出）；
 * confirm 路径靠 confirmed 标记避免误发 cancel。
 */
function onClose() {
  confirmed = false;
}
</script>

<style scoped>
.danger-confirm__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 取消钮 hover 不应跟确认钮撞色：本弹窗恒为高危删除/不可撤销操作（confirm 钮恒 type="danger"
   红色），取消钮若沿用 el-button 默认 hover（蓝）会把「退出危险操作」的钮显示成「去做」的信号。
   直接覆盖 el-button 自身读取的 hover 变量，改用本文件已在用的 --el-color-danger* 令牌。 */
.danger-confirm__cancel-btn {
  --el-button-hover-text-color: var(--el-color-danger);
  --el-button-hover-bg-color: var(--el-color-danger-light-9);
  --el-button-hover-border-color: var(--el-color-danger-light-7);
}

.danger-confirm__action {
  display: flex;
  gap: 6px;
  align-items: center;
  font-weight: 600;
  color: var(--el-color-danger);
}

.danger-confirm__warn-icon {
  font-size: 18px;
}

.danger-confirm__impact {
  padding: 8px 12px;
  line-height: 1.6;
  color: var(--dc-text-1);
  white-space: pre-line;
  background: var(--el-color-danger-light-9);
  border: 1px solid var(--el-color-danger-light-7);
  border-radius: 4px;
}

.danger-confirm__type-tip {
  color: var(--dc-text-1);
}

.danger-confirm__type-tip b {
  color: var(--el-color-danger);
  user-select: none;
}
</style>
