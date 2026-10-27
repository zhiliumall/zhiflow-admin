<!-- 系统管理 · 系统参数：商城级 KV 配置项（mall_config），保存后后端立即刷新缓存 -->
<template>
  <div class="app-container goods-dc-page">
    <DcTableShell
      storage-key="mall-mallsystemconfig"
      :cols="cols"
      grid="1.35fr 76px 76px 1.55fr 110px 96px"
      :rows="visibleRows"
      :row-class="rowClass"
      :total="page.total"
      :loading="loading"
      :searchable="false"
      :show-keyword="false"
      :filtered="isFiltered"
      :active-filters="activeFilters"
      empty-title="没有符合条件的记录"
      :empty-btn-text="canAdd ? '新建配置' : ''"
      empty-tint1="#F4EDFC"
      empty-tint2="#722ED1"
      export-file-name="系统配置"
      @reset="handleReset"
      @refresh="refreshChange"
      @empty-action="onEmptyAction"
    >
      <template #banner>
        <div class="goodsspu-dc__banner">
          <div class="goodsspu-dc__banner-grid" />
          <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--1" />
          <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--2" />
          <div class="goodsspu-dc__banner-head">
            <div class="goodsspu-dc__banner-title">系统参数</div>
            <div class="goodsspu-dc__banner-sub">商城的键值配置项，保存后立即刷新缓存生效</div>
          </div>
          <div style="flex:1;" />
          <div class="goodsspu-dc__banner-stats">
            <div class="goodsspu-dc__stat">
              <div class="goodsspu-dc__stat-label">配置项</div>
              <div class="goodsspu-dc__stat-num">{{ page.total }}</div>
            </div>
          </div>
        </div>
      </template>

      <!-- 筛选：配置键 / 配置描述 -->
      <template #filters>
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="font-size: 14px;color:var(--dc-text-2);white-space:nowrap;">配置键</span>
          <input
            v-model="filterForm.configKey"
            style="width:158px;height:32px;padding:0 10px;font-size: 14px;color:var(--dc-text-1);background:var(--dc-surface);border:1px solid var(--dc-border);border-radius:6px;outline:none;"
            placeholder="请输入配置键"
            @keyup.enter="handleQuery"
          >
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="font-size: 14px;color:var(--dc-text-2);white-space:nowrap;">配置描述</span>
          <input
            v-model="filterForm.configDesc"
            style="width:158px;height:32px;padding:0 10px;font-size: 14px;color:var(--dc-text-1);background:var(--dc-surface);border:1px solid var(--dc-border);border-radius:6px;outline:none;"
            placeholder="请输入配置描述"
            @keyup.enter="handleQuery"
          >
        </div>
        <button
          style="flex:none;height:32px;padding:0 16px;font-size: 14px;font-weight:400;color:#fff;cursor:pointer;background:var(--dc-brand);border:none;border-radius:6px;"
          @click="handleQuery"
        >查询</button>
        <button
          style="flex:none;height:32px;padding:0 6px;font-size: 14px;color:var(--dc-text-3);cursor:pointer;background:transparent;border:none;"
          @click="handleReset"
        >重置</button>
      </template>

      <template #tools>
        <button
          v-if="canAdd"
          class="dc-tbl__tool-btn dc-tbl__tool-btn--primary"
          @click="openForm('add')"
        >
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.4" stroke-linecap="round"
          ><path d="M12 5v14M5 12h14" /></svg>新建配置
        </button>
      </template>

      <template #empty-art>
        <DcEmptyImage
          :src="emptyImg"
          alt="系统配置空状态插画"
        />
      </template>

      <!-- 刷新缓存 = POST /mall/mallsystemconfig/refresh -->
      <template #toolbar-extra>
        <button
          v-if="canEdit"
          class="dc-tbl__tool-btn"
          style="height:28px;padding:0 12px;font-size: 14px;color:var(--dc-text-2);cursor:pointer;background:var(--dc-surface);border:1px solid var(--dc-border);border-radius:4px;"
          @click="refreshConfigCache"
        >刷新缓存</button>
      </template>

      <!-- 配置键：mono 主行 + 「创建于 …」副行 -->
      <template #col-configKey="{ row }">
        <div style="min-width:0;">
          <div
            style="overflow:hidden;font-family:'SF Mono',Consolas,monospace;font-size: 14px;color:var(--dc-text-1);text-overflow:ellipsis;white-space:nowrap;"
            :title="row.configKey"
          >{{ row.configKey || "—" }}</div>
          <div
            v-if="row.createTime"
            style="margin-top:2px;overflow:hidden;font-size: 14px;color:var(--dc-text-2-strong);text-overflow:ellipsis;white-space:nowrap;"
          >创建于 {{ row.createTime }}</div>
        </div>
      </template>

      <!-- 配置值：布尔值 → 启用 / 禁用 章；其余 → brand 章（超 6 字截断） -->
      <template #col-configValue="{ row }">
        <span
          v-if="row.configType === 'boolean'"
          :style="tagStyle(row.configValue === 'true' ? 'success' : 'gray')"
        >{{ row.configValue === "true" ? "启用" : "禁用" }}</span>
        <span v-else-if="row.configValue" :style="tagStyle('brand')" :title="row.configValue">
          {{ String(row.configValue).length > 6 ? String(row.configValue).slice(0, 6) + "…" : row.configValue }}
        </span>
        <span v-else style="font-size: 14px;color:var(--dc-text-4);">—</span>
      </template>

      <!-- 类型：cyan 章 -->
      <template #col-configType="{ row }">
        <span :style="tagStyle('cyan')">{{ configTypeLabel(row.configType) }}</span>
      </template>

      <template #col-configDesc="{ row }">
        <div
          style="overflow:hidden;font-size: 14px;color:var(--dc-text-1);text-overflow:ellipsis;white-space:nowrap;"
          :title="row.configDesc"
        >{{ row.configDesc || "—" }}</div>
      </template>

      <template #col-updateTime="{ row }">
        <div style="font-size: 14px;color:var(--dc-text-2-strong);">{{ row.updateTime || "—" }}</div>
      </template>

      <template #col-acts="{ row }">
        <div class="dc-tbl__acts">
          <span v-if="canEdit" class="dc-tbl__act" @click="openForm('edit', row)">编辑</span>
          <span v-if="canDel" class="dc-tbl__act dc-tbl__act--danger" @click="handleDel(row)">删除</span>
        </div>
      </template>

      <template #pagination>
        <div style="display:flex;justify-content:flex-end;padding:12px 16px;">
          <el-pagination
            :current-page="page.currentPage"
            :page-size="page.pageSize"
            :page-sizes="[10, 20, 50]"
            :total="page.total"
            layout="sizes, prev, pager, next, jumper"
            background
            @current-change="currentChange"
            @size-change="sizeChange"
          />
        </div>
      </template>
    </DcTableShell>

    <!-- ============ 新建 / 编辑 配置弹窗 ============ -->
    <DcFormDialog
      v-model="formOpen"
      :title="formMode === 'add' ? '新建配置' : '编辑配置'"
      :width="480"
      :columns="1"
      :saving="formSaving"
      @save="saveForm"
    >
      <div class="dcfd-section"><i /><span>配置信息</span></div>

      <div class="dcfd-field dcfd-field--full">
        <label class="dcfd-label"><em>*</em>配置键</label>
        <input
          v-model="configForm.configKey"
          class="dcfd-input"
          :class="{ 'is-error': !!errKey }"
          style="font-family:'SF Mono',Consolas,monospace;"
          placeholder="如 order.auto_cancel_minutes"
          @input="errKey = ''"
        >
        <div class="dcfd-helper">配置键必须唯一，建议使用英文和点号组合，如：order.auto_cancel_minutes</div>
        <div v-if="errKey" class="dcfd-error">{{ errKey }}</div>
      </div>

      <div class="dcfd-field dcfd-field--full">
        <label class="dcfd-label"><em>*</em>配置值</label>
        <input
          v-model="configForm.configValue"
          class="dcfd-input"
          :class="{ 'is-error': !!errValue }"
          style="font-family:'SF Mono',Consolas,monospace;"
          placeholder="布尔值填 true / false"
          @input="errValue = ''"
        >
        <div v-if="errValue" class="dcfd-error">{{ errValue }}</div>
      </div>

      <div class="dcfd-field dcfd-field--full">
        <label class="dcfd-label"><em>*</em>配置类型</label>
        <el-select v-model="configForm.configType" class="dcfd-input dc-nsel" @change="errType = ''">
          <el-option v-for="o in configTypeOpts" :key="o.value" :value="o.value" :label="o.label" />
        </el-select>
        <div v-if="errType" class="dcfd-error">{{ errType }}</div>
      </div>

      <div class="dcfd-field dcfd-field--full">
        <label class="dcfd-label">配置描述</label>
        <textarea
          v-model="configForm.configDesc"
          class="dcfd-textarea"
          placeholder="说明该配置的作用与取值含义"
        />
      </div>
    </DcFormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, getCurrentInstance, onMounted } from "vue";
import {
  fetchList,
  addObj,
  putObj,
  delObj,
  refreshCache as apiRefreshCache,
} from "@/api/mall/mallsystemconfig";
import { usePermissionStoreHook } from "@/store/modules/permission";
import { DcEmptyImage } from "@/components/dc-states";
import emptyImg from "@/assets/common/empty.png";
import DcTableShell from "@/components/dc-shell/DcTableShell.vue";
import { useDcDeleteToast } from "@/components/dc-shell/dcDeleteToast";
import DcFormDialog from "@/components/dc-dialog/DcFormDialog.vue";
import { appConfirm } from "@/components/overlay";
import type { DcActiveFilter, DcTableCol } from "@/components/dc-shell/types";
import { usePagerClamp } from "@/hooks/usePagerClamp";

import "../goods-list-dc.scss";

defineOptions({ name: "MallMallsystemconfig" });

const { proxy } = getCurrentInstance() as any;
const permissions = computed(() => usePermissionStoreHook()?.permissions || {});
const canAdd = computed(() => !!permissions.value["mall:systemconfig:add"]);
const canEdit = computed(() => !!permissions.value["mall:systemconfig:edit"]);
const canDel = computed(() => !!permissions.value["mall:systemconfig:del"]);

/** 列声明，act 列不进「列设置」 */
const cols: DcTableCol[] = [
  { key: "configKey", t: "配置键" },
  { key: "configValue", t: "配置值" },
  { key: "configType", t: "类型", exportValue: (r) => configTypeLabel(r.configType) },
  { key: "configDesc", t: "配置描述" },
  { key: "updateTime", t: "更新时间" },
  { key: "acts", t: "操作", hideable: false, exportValue: () => "" },
];

const loading = ref(false);
const data = ref<any[]>([]);
const page = ref({ pageSize: 10, currentPage: 1, total: 0 });

// 筛选表单与**已生效**的查询参数。生效条件单独存一份：翻页 / 刷新只带已生效的条件。
const filterForm = reactive({ configKey: "", configDesc: "" });
const paramsSearch = ref<Record<string, any>>({});
const isFiltered = computed(() => Object.keys(paramsSearch.value).length > 0);

/** 生效筛选条件 tag：取已生效参数，文案 `字段名: 值` */
const FILTER_LABELS: Record<string, string> = { configKey: "配置键", configDesc: "配置描述" };
const activeFilters = computed<DcActiveFilter[]>(() =>
  Object.keys(paramsSearch.value).map((k) => ({
    key: k,
    label: `${FILTER_LABELS[k] || k}: ${paramsSearch.value[k]}`,
    onRemove: () => {
      (filterForm as any)[k] = "";
      const next = { ...paramsSearch.value };
      delete next[k];
      paramsSearch.value = next;
      page.value.currentPage = 1;
      getData();
    },
  })),
);

function getData() {
  loading.value = true;
  fetchList({
    ...paramsSearch.value,
    size: page.value.pageSize,
    current: page.value.currentPage,
  })
    .then((res: any) => {
      data.value = res?.data?.records || [];
      page.value.total = res?.data?.total || 0;
    })
    .finally(() => {
      loading.value = false;
    });
}

function handleQuery() {
  const p: Record<string, any> = {};
  if (filterForm.configKey.trim()) p.configKey = filterForm.configKey.trim();
  if (filterForm.configDesc.trim()) p.configDesc = filterForm.configDesc.trim();
  paramsSearch.value = p;
  page.value.currentPage = 1;
  getData();
}

function handleReset() {
  filterForm.configKey = "";
  filterForm.configDesc = "";
  paramsSearch.value = {};
  page.value.currentPage = 1;
  getData();
}

function currentChange(p: number) {
  page.value.currentPage = p;
  getData();
}
function sizeChange(s: number) {
  page.value.pageSize = s;
  page.value.currentPage = 1;
  getData();
}
// 页码越界自愈：末页删掉最后一行 / 筛窄结果后，别停在空白页配着「共 N 条」
usePagerClamp(
  () => page.value.total,
  () => page.value.currentPage,
  () => page.value.pageSize,
  currentChange,
);
function refreshChange() {
  getData();
}

/** 空态 CTA：有筛选条件时外壳文案为「清空筛选条件」，否则是「新建配置」 */
function onEmptyAction(filtered: boolean) {
  if (filtered) handleReset();
  else openForm("add");
}

// ==================== 配置类型 ====================
const configTypeOpts = [
  { value: "string", label: "字符串" },
  { value: "number", label: "数字" },
  { value: "boolean", label: "布尔值" },
  { value: "json", label: "JSON" },
];
function configTypeLabel(t: string) {
  return configTypeOpts.find((o) => o.value === t)?.label || t || "—";
}

/** TAG 单元格：4px 圆角 / padding 2px 8px / weight 500 / 高 22px */
function tagStyle(tone: "success" | "gray" | "brand" | "cyan") {
  const map: Record<string, [string, string]> = {
    success: ["var(--dc-success)", "var(--dc-success-soft)"],
    gray: ["var(--dc-text-3)", "var(--dc-bg-header)"],
    brand: ["var(--dc-brand)", "var(--dc-brand-soft)"],
    cyan: ["#13C2C2", "#E6FBFB"],
  };
  const [color, background] = map[tone];
  return {
    display: "inline-flex",
    alignItems: "center",
    height: "22px",
    padding: "2px 8px",
    fontSize: "11.5px",
    fontWeight: 500,
    lineHeight: "18px",
    borderRadius: "4px",
    whiteSpace: "nowrap",
    color,
    background,
  };
}

// ==================== 新建 / 编辑 弹窗 ====================
const formOpen = ref(false);
const formMode = ref<"add" | "edit">("add");
const formSaving = ref(false);
/** 编辑态的原始行：保存时打底，避免窄 PUT 把未出现在表单里的列置空 */
const originalRow = ref<Record<string, any>>({});
const errKey = ref("");
const errValue = ref("");
const errType = ref("");
const configForm = reactive({
  id: "",
  configKey: "",
  configValue: "",
  configType: "string",
  configDesc: "",
});

function openForm(mode: "add" | "edit", row?: any) {
  formMode.value = mode;
  errKey.value = "";
  errValue.value = "";
  errType.value = "";
  originalRow.value = mode === "edit" ? { ...row } : {};
  Object.assign(configForm, {
    id: mode === "edit" ? row.id : "",
    configKey: mode === "edit" ? row.configKey || "" : "",
    configValue: mode === "edit" ? row.configValue || "" : "",
    configType: mode === "edit" ? row.configType || "string" : "string",
    configDesc: mode === "edit" ? row.configDesc || "" : "",
  });
  formOpen.value = true;
}

/** 前置校验：配置键 / 配置值 / 配置类型必填，唯一性由后端兜底 */
function validateForm(): boolean {
  errKey.value = configForm.configKey.trim() ? "" : "请输入配置键";
  errValue.value = configForm.configValue.trim() ? "" : "请输入配置值";
  errType.value = configForm.configType ? "" : "请选择配置类型";
  return !errKey.value && !errValue.value && !errType.value;
}

function saveForm() {
  if (formSaving.value || !validateForm()) return;
  formSaving.value = true;

  const payload: Record<string, any> =
    formMode.value === "edit"
      ? { ...originalRow.value, ...configForm }
      : { ...configForm };
  Object.keys(payload).forEach((k) => {
    if (k.startsWith("$")) delete payload[k];
  });
  if (formMode.value === "add") delete payload.id;

  const req = formMode.value === "add" ? addObj(payload) : putObj(payload);
  req
    .then(() => {
      formSaving.value = false;
      formOpen.value = false;
      proxy.$message({
        showClose: true,
        message: proxy.$t(
          formMode.value === "add" ? "commons.addSuccess" : "commons.updateSuccess",
        ),
        type: "success",
      });
      getData();
    })
    .catch((e: any) => {
      formSaving.value = false;
      // 拦截器已弹过 toast，只补 reject 裸 {msg} 这一条路径
      if (e && typeof e === "object" && !(e instanceof Error) && e.msg) {
        proxy.$message({ showClose: true, message: e.msg, type: "error" });
      }
    });
}

/** 可撤销删除：行滑出 + 5 秒内可撤销，到期才真发 DELETE */
const { visibleRows, rowClass, requestDelete } = useDcDeleteToast(() => data.value);

function handleDel(row: any) {
  appConfirm({ intent: "delete", title: "删除该配置项？", verb: "删除" })
    .then(() => {
      requestDelete(row, {
        commit: () => delObj(row.id),
        message: proxy.$t("commons.delSuccess"),
        onCommitted: () => getData(),
      });
    })
    .catch((e: any) => {
      if (e && typeof e === "object" && !(e instanceof Error) && e.msg) {
        proxy.$message({ showClose: true, message: e.msg, type: "error" });
      }
    });
}

// ==================== 刷新缓存 ====================
function refreshConfigCache() {
  appConfirm({ intent: "confirm", title: "确定刷新配置缓存吗？", verb: "刷新" })
    .then(() => apiRefreshCache())
    .then(() => {
      proxy.$message({ showClose: true, message: "缓存刷新成功", type: "success" });
    })
    .catch(() => {
      /* 取消或接口失败：拦截器已提示 */
    });
}

onMounted(getData);
</script>
