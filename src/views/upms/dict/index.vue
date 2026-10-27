<!-- 系统管理 · 字典管理：字典类型列表 + 右侧键值抽屉 -->
<template>
  <div class="dict-dc">
    <div class="goodsspu-dc__banner">
      <div class="goodsspu-dc__banner-grid" />
      <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--1" />
      <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--2" />
      <div class="goodsspu-dc__banner-head">
        <div class="goodsspu-dc__banner-title">字典管理</div>
        <div class="goodsspu-dc__banner-sub">系统管理 · 基础配置</div>
      </div>
      <div style="flex: 1" />
      <div v-if="metrics?.length" class="goodsspu-dc__banner-stats">
        <div
          v-for="(mt, i) in metrics"
          :key="i"
          class="goodsspu-dc__stat"
          :class="{ 'goodsspu-dc__stat--divider': i > 0 }"
        >
          <div class="goodsspu-dc__stat-label">{{ mt.label }}</div>
          <div class="goodsspu-dc__stat-num" :style="{ color: mt.color }">{{ mt.value }}</div>
        </div>
      </div>
    </div>

    <DcTableShell
      storage-key="upms-dict"
      :cols="cols"
      grid="1fr 1.15fr 110px 206px"
      :show-keyword="false"
      :rows="visibleRows"
      :row-class="rowClass"
      :total="page.total"
      :loading="tableLoading"
      :filtered="isFiltered"
      empty-title="没有符合条件的记录"
      :empty-btn-text="permissionList.addBtn ? '新增字典' : ''"
      empty-tint1="#F4EDFC"
      empty-tint2="#722ED1"
      export-file-name="字典管理"
      @search="handleQuery"
      @reset="handleReset"
      @refresh="refreshChange"
      @sort-change="onSortChange"
      @empty-action="onEmptyAction"
    >
      <!-- 按字典类型搜索（GET /upms/dict/page 的 type 参数） -->
      <template #filters>
        <label style="font-size: 14px;color:var(--dc-text-2);white-space:nowrap;">类型</label>
        <input
          v-model="searchForm.type"
          style="flex:none;width:158px;height:32px;padding:0 10px;font-family:inherit;font-size: 14px;color:var(--dc-text-1);background:var(--dc-surface);border:1px solid var(--dc-border);border-radius:6px;outline:none;"
          placeholder="请输入字典类型"
          @keyup.enter="handleQuery"
        >
      </template>

      <template #tools>
        <button
          v-if="permissionList.addBtn"
          class="dc-tbl__tool-btn dc-tbl__tool-btn--primary"
          @click="openForm('add')"
        >
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff"
            stroke-width="2.4" stroke-linecap="round"
          ><path d="M12 5v14M5 12h14" /></svg>新增字典
        </button>
      </template>

      <template #col-type="{ row }">
        <div
          style="overflow:hidden;font-family:ui-monospace,'SF Mono',Consolas,monospace;font-size: 14px;color:var(--dc-text-1);text-overflow:ellipsis;white-space:nowrap;"
          :title="row.type"
        >{{ row.type || "—" }}</div>
      </template>

      <template #col-description="{ row }">
        <div
          style="overflow:hidden;font-size: 14px;color:var(--dc-text-2);text-overflow:ellipsis;white-space:nowrap;"
          :title="row.description"
        >{{ row.description || "—" }}</div>
      </template>

      <template #col-createTime="{ row }">
        <div style="font-size: 14px;color:var(--dc-text-2-strong);">{{ row.createTime || "—" }}</div>
      </template>

      <template #col-acts="{ row }">
        <DcOverflowActions :actions="actsOf(row)" :row-key="row.id" />
      </template>

      <template #pagination>
        <DcPager
          :total="page.total"
          :current="page.currentPage"
          :page-size="page.pageSize"
          @change="onPageChange"
        />
      </template>

      <template #empty-art>
        <DcEmptyImage :src="emptyImg" alt="字典管理空状态插画" />
      </template>
    </DcTableShell>

    <!-- ══ 字典表单 ══ -->
    <DcFormDialog
      :missing-count="missingCount"
      v-model="formVisible"
      :title="formTitle"
      :width="480"
      :columns="1"
      :saving="saving"
      @save="onSave"
    >
      <div class="dcfd-field">
        <label class="dcfd-label"><em v-if="!readonly">*</em>类型</label>
        <div class="dcfd-control">
          <input
            v-model="form.type"
            class="dcfd-input"
            style="font-family:ui-monospace,'SF Mono',Consolas,monospace;"
            :class="{ 'is-error': !!errors.type }"
            :readonly="readonly || formMode === 'edit'"
            placeholder="如 order_status"
          >
        </div>
        <div v-if="errors.type" class="dcfd-error">{{ errors.type }}</div>
        <div v-else-if="formMode === 'edit'" class="dcfd-helper">类型创建后不可修改</div>
      </div>

      <div class="dcfd-field">
        <label class="dcfd-label"><em v-if="!readonly">*</em>描述</label>
        <div class="dcfd-control">
          <input
            v-model="form.description"
            class="dcfd-input"
            :class="{ 'is-error': !!errors.description }"
            :readonly="readonly"
          >
        </div>
        <div v-if="errors.description" class="dcfd-error">{{ errors.description }}</div>
      </div>

      <div v-if="formMode !== 'add'" class="dcfd-field">
        <label class="dcfd-label">创建时间</label>
        <input class="dcfd-input" :value="originalRow.createTime || '—'" readonly>
      </div>

      <template v-if="readonly" #footer>
        <button class="dcfd-btn dcfd-btn--cancel" @click="formVisible = false">关闭</button>
      </template>
    </DcFormDialog>

    <!-- ══ 键值抽屉 ══ -->
    <template v-if="clickObj">
      <div class="dict-dc__kv-mask" @click="handleItem()" />
      <div class="dict-dc__kv">
        <div
          style="display:flex;flex:none;gap:10px;align-items:center;height:52px;padding:0 18px;border-bottom:1px solid var(--dc-divider);"
        >
          <span style="font-size:14px;font-weight:600;color:var(--dc-text-1);">键值列表</span>
          <span style="font-size: 14px;color:var(--dc-text-2-strong);">所属类型:<span
            style="font-family:ui-monospace,'SF Mono',Consolas,monospace;color:var(--dc-text-2);"
          >{{ clickObj.type }}</span></span>
          <span style="flex:1;" />
          <button v-if="permissionList.addBtn" class="dict-dc__kv-add" @click="openKvForm('add')">+ 新增键值</button>
          <div class="dict-dc__kv-x" @click="handleItem()">
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round"
            ><path d="M6 6l12 12M18 6L6 18" /></svg>
          </div>
        </div>

        <div style="flex:1;overflow:auto;">
          <div style="display:flex;background:var(--dc-bg-header);border-bottom:1px solid var(--dc-divider);">
            <div style="flex:none;width:90px;padding:8px 14px;font-size: 14px;font-weight:500;color:var(--dc-text-2);">数据值</div>
            <div style="flex:1;padding:8px 14px;font-size: 14px;font-weight:500;color:var(--dc-text-2);">标签名</div>
            <div style="flex:none;width:60px;padding:8px 14px;font-size: 14px;font-weight:500;color:var(--dc-text-2);">排序</div>
            <div style="flex:1.2;padding:8px 14px;font-size: 14px;font-weight:500;color:var(--dc-text-2);">描述</div>
            <div style="flex:none;width:96px;padding:8px 14px;font-size: 14px;font-weight:500;color:var(--dc-text-2);">操作</div>
          </div>

          <div
            v-for="kr in tableData2"
            :key="kr.id"
            style="display:flex;align-items:center;border-bottom:1px solid var(--dc-divider);"
          >
            <div
              style="flex:none;width:90px;padding:11px 14px;overflow:hidden;font-family:ui-monospace,'SF Mono',Consolas,monospace;font-size: 14px;color:var(--dc-text-2);text-overflow:ellipsis;"
            >{{ kr.value }}</div>
            <div style="flex:1;padding:11px 14px;overflow:hidden;font-size: 14px;color:var(--dc-text-1);text-overflow:ellipsis;">{{ kr.label }}</div>
            <div style="flex:none;width:60px;padding:11px 14px;font-size: 14px;color:var(--dc-text-2);">{{ kr.sort }}</div>
            <div style="flex:1.2;padding:11px 14px;overflow:hidden;font-size: 14px;color:var(--dc-text-2);text-overflow:ellipsis;">{{ kr.description }}</div>
            <div style="display:flex;flex:none;gap:12px;width:96px;padding:11px 14px;">
              <span v-if="permissionList.editBtn" class="dict-dc__act" @click="openKvForm('edit', kr)">编辑</span>
              <span v-if="permissionList.delBtn" class="dict-dc__act dict-dc__act--danger" @click="handleDel2(kr)">删除</span>
            </div>
          </div>

          <div
            v-if="!tableLoading2 && !tableData2.length"
            style="display:flex;flex-direction:column;gap:8px;align-items:center;padding:44px 0;"
          >
            <svg
              width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="var(--dc-text-4)"
              stroke-width="1.4" stroke-linecap="round"
            ><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></svg>
            <span style="font-size: 14px;color:var(--dc-text-3);">该类型暂无键值,点击右上角新增</span>
          </div>
        </div>

        <div
          style="flex:none;padding:10px 18px;font-size: 14px;color:var(--dc-text-3);border-top:1px solid var(--dc-divider);"
        >键值供表单下拉与状态映射使用,修改后立即生效。</div>
      </div>
    </template>

    <!-- ══ 键值表单 ══ -->
    <DcFormDialog
      :missing-count="kvMissingCount"
      v-model="kvVisible"
      :title="kvMode === 'edit' ? '编辑键值' : '新增键值'"
      :subtitle="`所属类型:${clickObj?.type || ''}`"
      :width="480"
      :columns="2"
      :saving="kvSaving"
      @save="onKvSave"
    >
      <div class="dcfd-field">
        <label class="dcfd-label"><em>*</em>数据值</label>
        <div class="dcfd-control">
          <input
            v-model="kvForm.value"
            class="dcfd-input"
            style="font-family:ui-monospace,'SF Mono',Consolas,monospace;"
            :class="{ 'is-error': !!kvErrors.value }"
          >
        </div>
        <div v-if="kvErrors.value" class="dcfd-error">{{ kvErrors.value }}</div>
      </div>
      <div class="dcfd-field">
        <label class="dcfd-label"><em>*</em>标签名</label>
        <div class="dcfd-control">
          <input v-model="kvForm.label" class="dcfd-input" :class="{ 'is-error': !!kvErrors.label }">
        </div>
        <div v-if="kvErrors.label" class="dcfd-error">{{ kvErrors.label }}</div>
      </div>
      <div class="dcfd-field">
        <label class="dcfd-label"><em>*</em>排序</label>
        <div class="dcfd-control">
          <input v-model="kvForm.sort" class="dcfd-input" :class="{ 'is-error': !!kvErrors.sort }" inputmode="numeric">
        </div>
        <div v-if="kvErrors.sort" class="dcfd-error">{{ kvErrors.sort }}</div>
      </div>
      <div class="dcfd-field">
        <label class="dcfd-label"><em>*</em>描述</label>
        <div class="dcfd-control">
          <input v-model="kvForm.description" class="dcfd-input" :class="{ 'is-error': !!kvErrors.description }">
        </div>
        <div v-if="kvErrors.description" class="dcfd-error">{{ kvErrors.description }}</div>
      </div>
    </DcFormDialog>

    <!-- 隐藏 avue host：@on-load 是列表首屏唯一触发器。
         已摘掉 v-model="form" / :before-open / @row-save / @row-update / @row-del / 表单槽。
         键值列表(crud2)不再需要 host —— 抽屉打开时显式调 getPage2F。 -->
    <div style="display:none;">
      <avue-crud
        ref="crud"
        v-model:page="page"
        :data="tableData"
        :permission="permissionList"
        :table-loading="tableLoading"
        :option="tableOption"
        @on-load="getPageF"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  addObj,
  addObj2,
  delObj,
  delObj2,
  getPage,
  getPage2,
  type ObjVO,
  putObj,
  putObj2,
} from "@/api/upms/dict";
import { tableOption } from "@/const/crud/upms/dict";
import { usePermissionStoreHook } from "@/store/modules/permission";
import { useDictStoreHook } from "@/store/modules/dict";
import { filterForm } from "@/utils/util";
import { computed, getCurrentInstance, reactive, ref } from "vue";
import DcTableShell from "@/components/dc-shell/DcTableShell.vue";
import { useDcDeleteToast } from "@/components/dc-shell/dcDeleteToast";
import type { DcTableCol, DcSortPayload, DcRowAction, DcPageMetric } from "@/components/dc-shell/types";
import DcOverflowActions from "@/components/dc-shell/DcOverflowActions.vue";
import DcFormDialog from "@/components/dc-dialog/DcFormDialog.vue";
import DcPager from "@/components/dc-shell/DcPager.vue";
import { DcEmptyImage } from "@/components/dc-states";
import emptyImg from "@/assets/common/empty.png";

import { appConfirm } from "@/components/overlay";

import "../../mall/goods-list-dc.scss";

const { proxy } = getCurrentInstance()! as any;

const cols: DcTableCol[] = [
  { key: "type", t: "类型" },
  { key: "description", t: "描述" },
  { key: "createTime", t: "创建时间", sort: true },
  { key: "acts", t: "操作", al: "right", hideable: false },
];

const clickObj = ref<any>(null);
const tableData = ref<any[]>([]);
const page = ref({
  total: 0,
  currentPage: 1,
  pageSize: 20,
  ascs: "",
  descs: "",
});
const paramsSearch = ref<any>({});
const searchForm = ref<{ type: string }>({ type: "" });
const tableLoading = ref(false);

/** 只放后端真实返回的分页总数 */
const metrics = computed<DcPageMetric[]>(() => [{ label: "字典类型", value: page.value.total }]);

const tableData2 = ref<any[]>([]);
const page2 = ref({ total: 0, currentPage: 1, pageSize: 100, ascs: "", descs: "" });
const tableLoading2 = ref(false);

const isFiltered = computed(() => !!String(searchForm.value.type || "").trim());

/**
 * 行操作链：
 *   ['view','edit','del',{k:'kv',t:'键值列表'}]
 */
function actsOf(row: any): DcRowAction[] {
  return [
    { key: "view", t: "查看", on: () => openForm("view", row) },
    { key: "edit", t: "编辑", on: () => openForm("edit", row), hidden: !permissionList.value.editBtn },
    { key: "del", t: "删除", danger: true, on: () => handleDel(row), hidden: !permissionList.value.delBtn },
    { key: "kv", t: "键值列表", on: () => handleItem(row) },
  ];
}

const permissionList = computed(() => {
  const permissions = usePermissionStoreHook()?.permissions;
  return {
    addBtn: !!permissions["sys:dict:add"],
    delBtn: !!permissions["sys:dict:del"],
    editBtn: !!permissions["sys:dict:edit"],
  };
});

function getPageF(pageVal: any, params?: any) {
  tableLoading.value = true;
  getPage(
    Object.assign(
      {
        current: page.value.currentPage,
        size: page.value.pageSize,
        descs: page.value.descs,
        ascs: page.value.ascs,
      },
      paramsSearch.value,
      params,
    ),
  )
    .then((response: any) => {
      tableData.value = response.data.records;
      page.value.total = response.data.total;
      page.value.currentPage = pageVal.currentPage;
      page.value.pageSize = pageVal.pageSize;
      tableLoading.value = false;
    })
    .catch(() => {
      tableLoading.value = false;
    });
}

/** 搜索条件存 paramsSearch */
function handleQuery() {
  paramsSearch.value = filterForm({ type: searchForm.value.type });
  page.value.currentPage = 1;
  getPageF(page.value);
}
function handleReset() {
  searchForm.value.type = "";
  paramsSearch.value = {};
  page.value.currentPage = 1;
  page.value.ascs = "";
  page.value.descs = "";
  getPageF(page.value);
}
function refreshChange() {
  getPageF(page.value);
}
function onPageChange(v: number) {
  page.value.currentPage = v;
  getPageF(page.value);
}
function onSortChange(p: DcSortPayload) {
  const prop = p.key ? p.key.replace(/([A-Z])/g, "_$1").toLowerCase() : "";
  page.value.ascs = p.order === "asc" ? prop : "";
  page.value.descs = p.order === "desc" ? prop : "";
  getPageF(page.value);
}
function onEmptyAction(filtered: boolean) {
  if (filtered) handleReset();
  else openForm("add");
}

/**
 * 字典项改动后必须让全局字典缓存失效。
 * 传 type 只清该类型；不传则整体清空（字典本身被改/删时 type 可能变了）。
 */
function invalidateDictCache(type?: string) {
  useDictStoreHook().clearCache(type);
}

// ────────── 字典表单 ──────────
const formVisible = ref(false);
const formMode = ref<"add" | "edit" | "view">("add");
const saving = ref(false);
const originalRow = ref<any>({});
const form = reactive<any>({ type: "", description: "" });
const errors = reactive<Record<string, string>>({ type: "", description: "" });
/**
 * 必填项缺失计数 —— 传给 DcFormDialog，壳在头部下方渲染通栏红色定位条
 * 「仍有 N 个必填项未填写,请补全后再保存」，点它滚到第一个 .is-error。
 * 用 Object.values(...).filter(Boolean)：本页 errors 是预置空串的对象，只有非空串才算真的有错。
 * 字典类型弹窗专用；键值弹窗另有 kvMissingCount。
 * errors 仅在点过一次保存（validate()）后才有值，故新增弹窗打开时不会先红一片。
 */
const missingCount = computed(() => Object.values(errors).filter(Boolean).length);

const readonly = computed(() => formMode.value === "view");
const formTitle = computed(() =>
  formMode.value === "view" ? "字典详情" : formMode.value === "edit" ? "编辑字典" : "新增字典",
);

function openForm(mode: "add" | "edit" | "view", row?: any) {
  formMode.value = mode;
  errors.type = "";
  errors.description = "";
  originalRow.value = mode === "add" ? {} : { ...row };
  form.type = mode === "add" ? "" : (row?.type ?? "");
  form.description = mode === "add" ? "" : (row?.description ?? "");
  formVisible.value = true;
}

/** avue rules 手工搬运：type 必填、description 必填 */
function validate() {
  errors.type = "";
  errors.description = "";
  let ok = true;
  if (!String(form.type || "").trim()) {
    errors.type = proxy.$t("upms.dict.type") + proxy.$t("commons.notNull");
    ok = false;
  }
  if (!String(form.description || "").trim()) {
    errors.description = proxy.$t("upms.dict.description") + proxy.$t("commons.notNull");
    ok = false;
  }
  return ok;
}

function onSave() {
  if (readonly.value) return;
  if (!validate()) return;
  saving.value = true;
  // payload：编辑时合并原行、剔除 $ 前缀字段、新增时去掉 id
  const payload: any =
    formMode.value === "edit"
      ? { ...originalRow.value, type: form.type, description: form.description }
      : { type: form.type, description: form.description };
  Object.keys(payload).forEach((k) => {
    if (k.startsWith("$")) delete payload[k];
  });
  if (formMode.value === "add") delete payload.id;

  const isEdit = formMode.value === "edit";
  const req = isEdit ? putObj(filterForm(payload)) : addObj(filterForm(payload));
  req
    .then(() => {
      saving.value = false;
      formVisible.value = false;
      proxy.$message({
        showClose: true,
        message: proxy.$t(isEdit ? "commons.updateSuccess" : "commons.addSuccess"),
        type: "success",
      });
      invalidateDictCache(); // 字典本身被改，type 可能变，整体清空
      getPageF(page.value);
    })
    .catch((e: any) => {
      saving.value = false;
      if (e && typeof e === "object" && !(e instanceof Error) && e.msg) {
        proxy.$message({ showClose: true, message: e.msg, type: "error" });
      }
    });
}

/**
 * 可撤销删除：行滑出 + toast 内 5 秒撤销。
 * 点删除**不立刻发 DELETE** —— 先本地标 gone 播滑出动画，弹 5 秒可撤销 toast，
 * 5 秒内点「撤销」则行复原且一个请求都没发；到期才真跑 commit()。
 * 因此无需后端提供「恢复」接口。commit 失败时原语自动复原该行并弹后端 msg。
 * ⚠ 模板 :rows 已换成 visibleRows、:row-class 已挂 rowClass —— 缺任一行都不会滑出。
 * 确认框保留：删除一个字典类型会连带其下全部键值，撤销窗口之外不可恢复。
 */
const { visibleRows, rowClass, requestDelete } = useDcDeleteToast(() => tableData.value);

/** 删除统一直调 handleDel(row) */
function handleDel(row: ObjVO) {
  appConfirm({ intent: "delete", title: "删除该字典？", verb: "删除" })
    .then(() => {
      requestDelete(row, {
        commit: () => delObj(row),
        message: proxy.$t("commons.delSuccess"),
        onCommitted: () => {
          // 真提交后才失效字典缓存并刷右侧键值面板 —— 撤销掉的删除不该动缓存
          invalidateDictCache();
          handleItem();
          getPageF(page.value);
        },
      });
    })
    .catch(() => {
      // 用户取消确认框
    });
}

// ────────── 键值抽屉 ──────────
function handleItem(row?: any) {
  if (row) {
    clickObj.value = row;
    page2.value.currentPage = 1;
    getPage2F(page2.value);
  } else {
    clickObj.value = null;
    tableData2.value = [];
  }
}

function getPage2F(pageVal: any) {
  if (!clickObj.value) return;
  tableLoading2.value = true;
  getPage2({
    current: pageVal.currentPage,
    size: pageVal.pageSize,
    descs: page2.value.descs,
    ascs: page2.value.ascs,
    dictId: clickObj.value.id,
  })
    .then((response: any) => {
      tableData2.value = response.data.records;
      page2.value.total = response.data.total;
      tableLoading2.value = false;
    })
    .catch(() => {
      tableLoading2.value = false;
    });
}

const kvVisible = ref(false);
const kvMode = ref<"add" | "edit">("add");
const kvSaving = ref(false);
const kvOriginal = ref<any>({});
const kvForm = reactive<any>({ value: "", label: "", sort: "0", description: "" });
const kvErrors = reactive<Record<string, string>>({
  value: "",
  label: "",
  sort: "",
  description: "",
});
/**
 * 必填项缺失计数 —— 传给 DcFormDialog，壳在头部下方渲染通栏红色定位条
 * 「仍有 N 个必填项未填写,请补全后再保存」，点它滚到第一个 .is-error。
 * 用 Object.values(...).filter(Boolean)：本页 errors 是预置空串的对象，只有非空串才算真的有错。
 * 键值弹窗专用（validateKv）。
 * errors 仅在点过一次保存（validate()）后才有值，故新增弹窗打开时不会先红一片。
 */
const kvMissingCount = computed(() => Object.values(kvErrors).filter(Boolean).length);

function resetKvErrors() {
  kvErrors.value = "";
  kvErrors.label = "";
  kvErrors.sort = "";
  kvErrors.description = "";
}

function openKvForm(mode: "add" | "edit", row?: any) {
  kvMode.value = mode;
  resetKvErrors();
  kvOriginal.value = mode === "edit" ? { ...row } : {};
  kvForm.value = mode === "edit" ? (row?.value ?? "") : "";
  kvForm.label = mode === "edit" ? (row?.label ?? "") : "";
  kvForm.sort = mode === "edit" ? String(row?.sort ?? "0") : "0";
  kvForm.description = mode === "edit" ? (row?.description ?? "") : "";
  kvVisible.value = true;
}

/** tableOption2 的 rules 手工搬运：value/label/sort/description 全部必填 */
function validateKv() {
  resetKvErrors();
  let ok = true;
  if (!String(kvForm.value || "").trim()) {
    kvErrors.value = proxy.$t("upms.dict.enterDataValue");
    ok = false;
  }
  if (!String(kvForm.label || "").trim()) {
    kvErrors.label = proxy.$t("upms.dict.enterTagName");
    ok = false;
  }
  if (kvForm.sort === "" || kvForm.sort == null || !Number.isFinite(Number(kvForm.sort))) {
    kvErrors.sort = proxy.$t("upms.dict.enterSorting");
    ok = false;
  }
  if (!String(kvForm.description || "").trim()) {
    kvErrors.description = proxy.$t("upms.dict.description");
    ok = false;
  }
  return ok;
}

function onKvSave() {
  if (!clickObj.value) return;
  if (!validateKv()) return;
  kvSaving.value = true;
  // payload：编辑时合并原行、剔除 $ 前缀字段、新增时去掉 id
  const payload: any =
    kvMode.value === "edit"
      ? {
          ...kvOriginal.value,
          value: kvForm.value,
          label: kvForm.label,
          sort: Number(kvForm.sort),
          description: kvForm.description,
        }
      : {
          dictId: clickObj.value.id,
          type: clickObj.value.type,
          value: kvForm.value,
          label: kvForm.label,
          sort: Number(kvForm.sort),
          description: kvForm.description,
        };
  Object.keys(payload).forEach((k) => {
    if (k.startsWith("$")) delete payload[k];
  });
  if (kvMode.value === "add") delete payload.id;

  const isEdit = kvMode.value === "edit";
  const req = isEdit ? putObj2(payload) : addObj2(payload);
  req
    .then(() => {
      kvSaving.value = false;
      kvVisible.value = false;
      proxy.$message({
        showClose: true,
        message: proxy.$t(isEdit ? "commons.updateSuccess" : "commons.addSuccess"),
        type: "success",
      });
      invalidateDictCache(clickObj.value.type);
      getPage2F(page2.value);
    })
    .catch((e: any) => {
      kvSaving.value = false;
      if (e && typeof e === "object" && !(e instanceof Error) && e.msg) {
        proxy.$message({ showClose: true, message: e.msg, type: "error" });
      }
    });
}

function handleDel2(row: any) {
  appConfirm({ intent: "delete", title: "删除该字典项？", verb: "删除" })
    .then(() => delObj2(row.id))
    .then(() => {
      proxy.$message({
        showClose: true,
        message: proxy.$t("commons.delSuccess"),
        type: "success",
      });
      invalidateDictCache(clickObj.value?.type);
      getPage2F(page2.value);
    })
    .catch((e: any) => {
      if (e && typeof e === "object" && !(e instanceof Error) && e.msg) {
        proxy.$message({ showClose: true, message: e.msg, type: "error" });
      }
    });
}
</script>

<style lang="scss">
.dict-dc {
  /* 键值抽屉：右侧 460px，遮罩自顶栏 56px 起 */
  &__kv-mask {
    position: fixed;
    inset: 56px 0 0;
    z-index: 89;
    background: rgb(26 26 26 / 12%);
  }

  &__kv {
    position: fixed;
    top: 56px;
    right: 0;
    bottom: 0;
    z-index: 90;
    display: flex;
    flex-direction: column;
    width: 460px;
    background: var(--dc-surface);
    border-left: 1px solid var(--dc-border);
    box-shadow: -8px 0 24px rgb(0 0 0 / 8%);
  }

  &__kv-add {
    height: 28px;
    padding: 0 12px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    color: #fff;
    cursor: pointer;
    background: var(--dc-brand);
    border: none;
    border-radius: 6px;

    &:hover { background: var(--dc-brand-hover); }
  }

  &__kv-x {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    color: var(--dc-text-3);
    cursor: pointer;
    border-radius: 6px;

    &:hover {
      color: var(--dc-text-1);
      background: var(--dc-bg-page);
    }
  }

  /* 抽屉里的行内操作链。DcTableShell 的 .dc-tbl__act 嵌在 .dc-tbl 下，
     键值抽屉不在其中，故本地定义一份同规格的。 */
  &__act {
    font-size: 14px;
    font-weight: 400;
    color: var(--dc-info);
    white-space: nowrap;
    cursor: pointer;
    user-select: none;

    &:hover { text-decoration: underline; }

    &--danger { color: var(--dc-danger-link); }
  }
}
</style>
