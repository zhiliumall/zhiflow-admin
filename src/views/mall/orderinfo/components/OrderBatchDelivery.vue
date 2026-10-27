<script setup lang="ts">
/**
 * Excel 批量发货：下载模板 → 填订单号 / 物流公司 / 运单号 → 上传。
 *
 * 后端逐行处理、逐行回结果（单行失败不影响其他行），这里把失败行与原因逐条列出来，
 * 运营改完表格可以只把失败的行再传一次（已发货的订单重复上传会被后端拒绝，不会重复发货）。
 */
import { computed, ref } from "vue";
import {
  batchDelivery,
  downloadBatchDeliveryTemplate,
  saveDownload,
  type BatchDeliveryResult,
} from "@/api/mall/orderinfo";
import { DIALOG_WIDTH, message } from "@/components/overlay";

defineOptions({ name: "OrderBatchDelivery" });

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  /** 至少有一行发货成功，宿主页据此刷新列表 */
  (e: "done"): void;
}>();

const fileInput = ref<HTMLInputElement>();
const file = ref<File | null>(null);
const uploading = ref(false);
const downloading = ref(false);
const result = ref<BatchDeliveryResult | null>(null);

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit("update:modelValue", v),
});

function onOpen() {
  file.value = null;
  result.value = null;
  if (fileInput.value) fileInput.value.value = "";
}

async function onDownloadTemplate() {
  downloading.value = true;
  try {
    const res = await downloadBatchDeliveryTemplate();
    await saveDownload(res, "批量发货模板.xlsx");
  } catch {
    // 拦截器已提示
  } finally {
    downloading.value = false;
  }
}

function pickFile() {
  fileInput.value?.click();
}

function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0] || null;
  if (f && !/\.xlsx$/i.test(f.name)) {
    message.warning("请上传 .xlsx 格式的 Excel 文件");
    (e.target as HTMLInputElement).value = "";
    return;
  }
  file.value = f;
  result.value = null;
}

async function onUpload() {
  if (!file.value || uploading.value) return;
  uploading.value = true;
  try {
    const res = await batchDelivery(file.value);
    if (Number(res?.code ?? -1) !== 0) {
      message.error(res?.msg || "批量发货失败");
      return;
    }
    result.value = res.data;
    const ok = res.data?.successCount ?? 0;
    const fail = res.data?.failCount ?? 0;
    if (fail) message.warning(`批量发货完成：成功 ${ok} 单，失败 ${fail} 单`);
    else message.success(`批量发货成功：共 ${ok} 单`);
    if (ok) emit("done");
  } catch {
    // 拦截器已提示后端原话（如文件格式不对、字典为空）
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <el-dialog v-model="visible" title="批量发货" :width="DIALOG_WIDTH.m" append-to-body @open="onOpen">
    <ol class="obd-steps">
      <li>
        <span>下载模板，按「订单号 / 物流公司 / 运单号」填写（物流公司填名称或编码均可，可选值见模板第二页）</span>
        <el-button link type="primary" :loading="downloading" @click="onDownloadTemplate">下载模板</el-button>
      </li>
      <li>
        <span>上传填好的表格</span>
        <el-button link type="primary" @click="pickFile">{{ file ? "重新选择" : "选择文件" }}</el-button>
        <input ref="fileInput" type="file" accept=".xlsx" class="obd-file" @change="onFileChange">
      </li>
    </ol>
    <div v-if="file" class="obd-file-name">{{ file.name }}</div>

    <div v-if="result" class="obd-result">
      <div class="obd-result__sum">
        共 {{ result.total }} 行：成功 <b class="is-ok">{{ result.successCount }}</b> 行，失败
        <b class="is-fail">{{ result.failCount }}</b> 行
      </div>
      <ul v-if="result.failed?.length" class="obd-result__list">
        <li v-for="f in result.failed" :key="f.id">
          <span class="obd-result__row">{{ f.id }}</span>{{ f.reason }}
        </li>
      </ul>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button type="primary" :disabled="!file" :loading="uploading" @click="onUpload">开始发货</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.obd-steps {
  padding-left: 20px;
  margin: 0;
  font-size: var(--dc-fs-14, 14px);
  line-height: 1.8;
  color: var(--dc-text-2);

  li + li {
    margin-top: 8px;
  }

  .el-button {
    margin-left: 8px;
    vertical-align: baseline;
  }
}

.obd-file {
  display: none;
}

.obd-file-name {
  margin: 8px 0 0 20px;
  font-size: var(--dc-fs-14, 14px);
  color: var(--dc-text-1);
  word-break: break-all;
}

.obd-result {
  padding: 12px 16px;
  margin-top: 16px;
  font-size: var(--dc-fs-14, 14px);
  color: var(--dc-text-2);
  background: var(--dc-bg-header, #f8f9fb);
  border-radius: var(--dc-radius-md, 6px);

  .is-ok {
    color: var(--dc-success);
  }

  .is-fail {
    color: var(--dc-danger);
  }
}

.obd-result__list {
  max-height: 220px;
  padding: 0;
  margin: 8px 0 0;
  overflow-y: auto;
  list-style: none;

  li {
    padding: 4px 0;
    line-height: 1.6;
    border-top: 1px dashed var(--dc-divider, #eee);
  }
}

.obd-result__row {
  margin-right: 8px;
  font-variant-numeric: tabular-nums;
  color: var(--dc-text-3);
}
</style>
