<!--
  内容 › 热搜 —— H5 搜索页「热门搜索」词维护（列表 + 新增 / 编辑弹窗 + 删除）。

  接口（@/api/mall/hotword）：GET /mall/hotword/page、POST /mall/hotword、PUT /mall/hotword、DELETE /mall/hotword/{id}。
  权限码：mall:hotword:index / add / edit / del（按钮只管可见性，后端接口各自鉴权）。
  后端字段只有「热词 + 热度」：没有启停、没有单独的排序字段，热度就是排序依据。
  C 端（GET /mallapi/globalhotword/getTop）按热度倒序、创建时间倒序取前 10，与本页列表同一个顺序，
  所以未筛选时列表前 10 行就是 H5 正在展示的词。热词去首尾空格后最多 50 字、不能重复；热度不填按 0、不能为负。
-->
<template>
  <div class="hotword-page">
    <DcTableShell
      v-model:keyword="keyword"
      storage-key="mall-hotword"
      :cols="cols"
      grid="64px minmax(0, 1.6fr) 120px 120px 150px 110px"
      q-ph="搜索热词"
      :rows="rows"
      :total="total"
      :loading="loading"
      :filtered="isFiltered"
      :empty-title="emptyTitle"
      :empty-btn-text="canAdd ? '新增热词' : ''"
      export-file-name="热搜词"
      @search="handleSearch"
      @reset="handleReset"
      @refresh="reload"
      @empty-action="onEmptyAction"
    >
      <template #banner>
        <div class="goodsspu-dc__banner">
          <div class="goodsspu-dc__banner-grid" />
          <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--1" />
          <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--2" />
          <div class="goodsspu-dc__banner-head">
            <div class="goodsspu-dc__banner-title">热搜</div>
            <div class="goodsspu-dc__banner-sub">H5 搜索页展示热度最高的 {{ TOP_N }} 个词；调高热度即可把词顶上去</div>
          </div>
        </div>
      </template>

      <template #tools>
        <button v-if="canAdd" class="dc-tbl__tool-btn dc-tbl__tool-btn--primary" @click="openForm('add')">
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round"
          ><path d="M12 5v14M5 12h14" /></svg>新增热词
        </button>
      </template>

      <template #col-rank="{ index }">
        <span class="hotword-page__rank" :class="{ 'is-top': isShown(index) }">{{ rankOf(index) }}</span>
      </template>
      <template #col-word="{ row }">
        <div class="hotword-page__word" :title="row.word">{{ row.word || "—" }}</div>
      </template>
      <template #col-totalCount="{ row }">
        <span class="hotword-page__num">{{ row.totalCount ?? 0 }}</span>
      </template>
      <template #col-shown="{ index }">
        <span v-if="isFiltered" class="hotword-page__muted" title="筛选状态下看不出排名，清空筛选后再看">—</span>
        <span v-else-if="isShown(index)" class="goods-dc-status goods-dc-status--success">展示中</span>
        <span v-else class="hotword-page__muted">未进前 {{ TOP_N }}</span>
      </template>
      <template #col-updateTime="{ row }">
        <span class="hotword-page__time" :title="row.createTime ? '创建时间：' + row.createTime : ''">{{ fmtTime(row.updateTime || row.createTime) }}</span>
      </template>
      <template #col-acts="{ row }">
        <DcOverflowActions :actions="actsOf(row)" :row-key="row.id" />
      </template>

      <template #pagination>
        <DcPager
          :total="total"
          :current="pageNo"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          @change="onPageChange"
          @size-change="onSizeChange"
        />
      </template>
    </DcTableShell>

    <!-- ============ 新增 / 编辑 ============ -->
    <DcFormDialog
      v-model="formOpen"
      :title="formMode === 'add' ? '新增热词' : '编辑热词'"
      subtitle="带 * 为必填项，保存后 H5 搜索页即时生效"
      :width="480"
      :columns="1"
      :mode="formMode"
      :saving="formSaving"
      :missing-count="missingCount"
      @save="saveForm"
    >
      <div class="dcfd-field">
        <label class="dcfd-label"><em>*</em>热词</label>
        <div class="dcfd-control">
          <input
            v-model="form.word"
            class="dcfd-input"
            :class="{ 'is-error': !!errors.word }"
            :maxlength="WORD_MAX"
            placeholder="如：保温杯"
            @input="clearError('word')"
          >
          <span class="dcfd-counter">{{ form.word.length }}/{{ WORD_MAX }}</span>
        </div>
        <div v-if="errors.word" class="dcfd-error">{{ errors.word }}</div>
      </div>

      <div class="dcfd-field">
        <label class="dcfd-label">热度</label>
        <div class="dcfd-control">
          <input
            v-model="form.totalCount"
            class="dcfd-input"
            :class="{ 'is-error': !!errors.totalCount }"
            inputmode="numeric"
            placeholder="0"
            @input="clearError('totalCount')"
          >
        </div>
        <div v-if="errors.totalCount" class="dcfd-error">{{ errors.totalCount }}</div>
        <div v-else class="dcfd-helper">数值越大越靠前，不填按 0；H5 只展示前 {{ TOP_N }} 个</div>
      </div>
    </DcFormDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import DcTableShell from "@/components/dc-shell/DcTableShell.vue";
import DcOverflowActions from "@/components/dc-shell/DcOverflowActions.vue";
import DcPager from "@/components/dc-shell/DcPager.vue";
import DcFormDialog from "@/components/dc-dialog/DcFormDialog.vue";
import type { DcRowAction, DcTableCol } from "@/components/dc-shell/types";
import { appConfirm, message } from "@/components/overlay";
import { hasAnyPermission } from "@/utils/permission";
import { addObj, delObj, getPage, putObj, type HotWordVO } from "@/api/mall/hotword";

import "../goods-list-dc.scss";

defineOptions({ name: "MallHotWord" });

/** 与后端 HotWordController.MAX_WORD_LENGTH（表字段 varchar(50)）一致 */
const WORD_MAX = 50;
/** C 端 getTop 取的条数 */
const TOP_N = 10;

// ────────── 权限（computed 里读：刷新早期 store 未回填时，回填后按钮自动出现） ──────────
const canAdd = computed(() => hasAnyPermission(["mall:hotword:add"]));
const canEdit = computed(() => hasAnyPermission(["mall:hotword:edit"]));
const canDel = computed(() => hasAnyPermission(["mall:hotword:del"]));

const cols: DcTableCol[] = [
  { key: "rank", t: "排名", al: "center", hideable: false, exportValue: () => "" },
  { key: "word", t: "热词" },
  { key: "totalCount", t: "热度", al: "right" },
  { key: "shown", t: "H5 展示", al: "center", exportValue: () => "" },
  { key: "updateTime", t: "更新时间", exportValue: (r) => fmtTime(r.updateTime || r.createTime) },
  { key: "acts", t: "操作", al: "right", hideable: false },
];

function fmtTime(t: unknown) {
  return t ? String(t).slice(0, 16) : "—";
}

// ────────── 筛选（输入态 vs 已生效态：翻页 / 刷新只用已生效的） ──────────
const keyword = ref("");
const applied = ref("");
const isFiltered = computed(() => !!applied.value);

// ────────── 列表 ──────────
const rows = ref<HotWordVO[]>([]);
const total = ref(0);
const pageNo = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const loadFailed = ref(false);

const emptyTitle = computed(() => {
  if (loadFailed.value) return "加载失败，请点右上角刷新重试";
  return isFiltered.value ? "没有符合条件的热词" : "还没有热搜词";
});

/** 列表顺序与 C 端一致，未筛选时的全局名次 = 页偏移 + 行号 */
function rankOf(index: number) {
  return isFiltered.value ? "—" : (pageNo.value - 1) * pageSize.value + index + 1;
}
function isShown(index: number) {
  return !isFiltered.value && (pageNo.value - 1) * pageSize.value + index < TOP_N;
}

async function reload() {
  loading.value = true;
  try {
    const res: any = await getPage({
      current: pageNo.value,
      size: pageSize.value,
      word: applied.value || undefined,
    });
    rows.value = res?.data?.records ?? [];
    total.value = Number(res?.data?.total ?? 0);
    loadFailed.value = false;
  } catch {
    rows.value = [];
    total.value = 0;
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  applied.value = keyword.value.trim();
  pageNo.value = 1;
  reload();
}

function handleReset() {
  keyword.value = "";
  applied.value = "";
  pageNo.value = 1;
  reload();
}

function onEmptyAction(filtered: boolean) {
  if (filtered) handleReset();
  else openForm("add");
}

function onPageChange(p: number) {
  pageNo.value = p;
  reload();
}

function onSizeChange(s: number) {
  pageSize.value = s;
  pageNo.value = 1;
  reload();
}

// ────────── 行操作 ──────────
function actsOf(row: HotWordVO): DcRowAction[] {
  return [
    { key: "edit", t: "编辑", on: () => openForm("edit", row), hidden: !canEdit.value },
    { key: "del", t: "删除", danger: true, on: () => handleDel(row), hidden: !canDel.value },
  ];
}

function handleDel(row: HotWordVO) {
  appConfirm({ intent: "delete", title: `删除热词「${row.word}」？`, verb: "删除" })
    .then(() => delObj(row.id as string))
    .then(() => {
      message.success("已删除");
      reload();
    })
    .catch(() => {});
}

// ────────── 新增 / 编辑弹窗 ──────────
const formOpen = ref(false);
const formMode = ref<"add" | "edit">("add");
const formSaving = ref(false);
const editingId = ref("");
const form = reactive({ word: "", totalCount: "" });
const errors = reactive<Record<string, string>>({});
const missingCount = computed(() => Object.keys(errors).length);

function clearError(key: string) {
  delete errors[key];
}

function openForm(mode: "add" | "edit", row?: HotWordVO) {
  formMode.value = mode;
  editingId.value = mode === "edit" ? (row?.id ?? "") : "";
  form.word = row?.word ?? "";
  form.totalCount = row?.totalCount == null ? "" : String(row.totalCount);
  Object.keys(errors).forEach((k) => delete errors[k]);
  formSaving.value = false;
  formOpen.value = true;
}

/** 与后端 HotWordController.normalize 同一套规则；重名由后端判 */
function validate() {
  Object.keys(errors).forEach((k) => delete errors[k]);
  const word = form.word.trim();
  if (!word) errors.word = "请输入热词";
  else if (word.length > WORD_MAX) errors.word = `热词最多 ${WORD_MAX} 个字`;
  const count = String(form.totalCount).trim();
  if (count && !/^\d{1,15}$/.test(count)) errors.totalCount = "热度请填 0 或正整数";
  return missingCount.value === 0;
}

function saveForm() {
  if (formSaving.value || !validate()) return;
  const count = String(form.totalCount).trim();
  const payload: HotWordVO = {
    word: form.word.trim(),
    totalCount: count ? Number(count) : 0,
  };
  const isEdit = formMode.value === "edit";
  formSaving.value = true;
  (isEdit ? putObj({ ...payload, id: editingId.value }) : addObj(payload))
    .then(() => {
      message.success(isEdit ? "已保存" : "已新增");
      formOpen.value = false;
      reload();
    })
    .catch(() => {
      // 拦截器已提示后端原话（如「热搜词已存在」）
    })
    .finally(() => {
      formSaving.value = false;
    });
}

reload();
</script>

<style scoped lang="scss">
.hotword-page__rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  padding: 0 6px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--dc-text-3);
  background: var(--dc-bg-header);
  border-radius: 4px;

  &.is-top {
    font-weight: 600;
    color: var(--dc-brand);
    background: var(--dc-brand-soft);
  }
}

.hotword-page__word {
  overflow: hidden;
  font-size: 14px;
  color: var(--dc-text-1);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hotword-page__num {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: var(--dc-text-1);
}

.hotword-page__muted {
  font-size: 14px;
  color: var(--dc-text-4);
}

.hotword-page__time {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: var(--dc-text-3);
}
</style>
