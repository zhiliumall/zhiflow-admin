<script setup lang="ts">
/**
 * 订单详情顶栏的「状态异常」标记 + 「人工处理」入口。
 *
 * 只在后端状态机判为 LEGACY_INVALID（status 与 is_pay 拼出了状态机里不存在的组合）时出现：
 * - 标记对所有能看详情的人显示；
 * - 按钮只给有 mall:orderinfo:edit 的人（与后端 manual-fix 接口同一个码；这里只管可见性，后端独立鉴权）。
 *
 * 弹窗里选一个合法目标状态 + 填原因，提交 `PUT /mall/orderinfo/{id}/manual-fix`。
 * 成功 → 提示并 emit('fixed')，由详情面板负责重拉详情；失败 → 弹窗不关，把后端原话留在表单底部。
 */
import { computed, reactive, ref } from "vue";
import {
  manualFixOrderState,
  type OrderManualFixResult,
} from "@/api/mall/orderinfo";
import { DIALOG_WIDTH, message } from "@/components/overlay";
import {
  LEGACY_INVALID,
  LEGACY_INVALID_LABEL,
  MANUAL_FIX_TARGET_STATES,
  isLegacyInvalid,
  manualFixErrorMessage,
  orderMachineStateLabel,
  validateManualFixReason,
  validateManualFixTarget,
} from "@/const/orderMachineState";
import { hasAnyPermission } from "@/utils/permission";

defineOptions({ name: "OrderManualFix" });

const props = defineProps<{
  orderId?: string | number | null;
  machineState?: string | null;
}>();

const emit = defineEmits<{
  (e: "fixed", result: OrderManualFixResult): void;
}>();

const visible = computed(() => isLegacyInvalid(props.machineState));
/** computed 里读权限：刷新早期 store 未回填时，回填后按钮自动出现 */
const canFix = computed(() => hasAnyPermission(["mall:orderinfo:edit"]));

const dialogOpen = ref(false);
const saving = ref(false);
const serverError = ref("");
const form = reactive({ targetState: "", reason: "" });
const errors = reactive({ targetState: "", reason: "" });

function openDialog() {
  form.targetState = "";
  form.reason = "";
  errors.targetState = "";
  errors.reason = "";
  serverError.value = "";
  dialogOpen.value = true;
}

async function onSubmit() {
  if (saving.value) return;
  serverError.value = "";
  errors.targetState = validateManualFixTarget(form.targetState);
  errors.reason = validateManualFixReason(form.reason);
  if (errors.targetState || errors.reason) return;

  const id = String(props.orderId ?? "").trim();
  if (!id) {
    serverError.value = "缺少订单 ID，请关闭详情后重新打开";
    return;
  }

  saving.value = true;
  try {
    const res = await manualFixOrderState(id, {
      targetState: form.targetState,
      reason: form.reason.trim(),
    });
    // 拦截器只对 code === 1 reject；其它非 0 码会 resolve 回来，这里兜住，不当成功
    if (Number(res?.code ?? -1) !== 0) {
      const msg = manualFixErrorMessage(res);
      serverError.value = msg;
      message.error(msg);
      return;
    }
    const result: OrderManualFixResult = res.data ?? {
      from: LEGACY_INVALID,
      to: form.targetState,
      logId: "",
    };
    message.success(
      `已人工处理为「${orderMachineStateLabel(result.to || form.targetState)}」`,
    );
    dialogOpen.value = false;
    emit("fixed", { ...result, to: result.to || form.targetState });
  } catch (e) {
    // 拦截器已 toast 过后端原话；弹窗不关，把同一句话留在表单底部，方便对照着改
    serverError.value = manualFixErrorMessage(e);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <template v-if="visible">
    <span class="omf-tag">{{ LEGACY_INVALID_LABEL }}</span>
    <button
      v-if="canFix"
      type="button"
      class="odd-dc__btn omf-btn"
      @click="openDialog"
    >
      人工处理
    </button>

    <el-dialog
      v-model="dialogOpen"
      title="人工处理订单状态"
      :width="DIALOG_WIDTH.m"
      append-to-body
      :close-on-click-modal="false"
      modal-class="omf-dialog-mask"
    >
      <p class="omf-intro">
        该订单的状态字段组合在状态机中不合法。请核对支付与发货记录后，选择它实际应处的状态。提交后写入审计日志。
      </p>
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="当前状态">
          <span class="omf-current">{{
            orderMachineStateLabel(machineState)
          }}</span>
          <span v-if="orderId" class="omf-order-id">订单 ID {{ orderId }}</span>
        </el-form-item>
        <el-form-item label="改为" required :error="errors.targetState">
          <el-select
            v-model="form.targetState"
            class="omf-select"
            placeholder="请选择改后的状态"
            style="width: 100%"
            @change="errors.targetState = ''"
          >
            <el-option
              v-for="opt in MANUAL_FIX_TARGET_STATES"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            >
              <span>{{ opt.label }}</span>
              <span class="omf-option-code">{{ opt.value }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item
          label="处理原因"
          required
          :error="errors.reason"
        >
          <el-input
            v-model="form.reason"
            class="omf-reason"
            type="textarea"
            :rows="4"
            placeholder="例：已核对支付流水与物流，该单实际已签收"
            @input="errors.reason = ''"
          />
        </el-form-item>
      </el-form>
      <p v-if="serverError" class="omf-server-error">{{ serverError }}</p>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button
          type="primary"
          class="omf-submit"
          :loading="saving"
          @click="onSubmit"
          >提交人工处理</el-button
        >
      </template>
    </el-dialog>
  </template>
</template>

<style scoped lang="scss">
.omf-tag {
  display: inline-flex;
  flex: none;
  align-items: center;
  height: 22px;
  padding: 2px 8px;
  font-size: var(--dc-fs-12);
  font-weight: 500;
  color: var(--dc-warning);
  background: var(--dc-warning-soft);
  border: 1px solid color-mix(in srgb, var(--dc-warning) 35%, transparent);
  border-radius: var(--dc-radius-sm);
}

.omf-btn {
  color: var(--dc-warning);
  border-color: color-mix(in srgb, var(--dc-warning) 45%, transparent);
}

.omf-btn:hover {
  color: var(--dc-warning);
  background: var(--dc-warning-soft);
  border-color: var(--dc-warning);
}

.omf-intro {
  margin: 0 0 12px;
  font-size: var(--dc-fs-14);
  line-height: 1.6;
  color: var(--dc-text-2);
}

.omf-current {
  color: var(--dc-warning);
}

.omf-order-id {
  margin-left: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--dc-text-3);
}

.omf-option-code {
  float: right;
  margin-left: 16px;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: var(--dc-fs-12);
  color: var(--dc-text-3);
}

.omf-server-error {
  margin: 4px 0 0;
  font-size: var(--dc-fs-14);
  line-height: 1.5;
  color: var(--dc-danger);
}
</style>
