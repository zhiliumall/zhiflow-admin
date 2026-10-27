<!--
  内容 › 轮播图 —— H5 首页轮播图维护（列表 + 新增 / 编辑弹窗 + 启停 + 删除）。

  接口（@/api/mall/banner）：GET /mall/banner/page、POST /mall/banner、PUT /mall/banner、DELETE /mall/banner/{id}。
  权限码：mall:banner:index / add / edit / del（按钮只管可见性，后端接口各自鉴权）。
  后端规则：标题必填 ≤64 字、图片必填；跳转地址只收站内路由（以 / 开头）或 http(s) 地址，空 = 不跳转；
  排序不填按 0、小的在前；启用状态不填按启用。列表固定按排序升序、创建时间倒序，不支持前端排序。
  C 端只取启用的轮播图（GET /mallapi/banner/list）。
-->
<template>
  <div class="banner-page">
    <DcTableShell
      v-model:keyword="keyword"
      storage-key="mall-banner"
      :cols="cols"
      grid="120px minmax(0, 1.2fr) minmax(0, 1.6fr) 72px 84px 150px 110px"
      q-ph="搜索轮播图标题"
      :rows="rows"
      :total="total"
      :loading="loading"
      :filtered="isFiltered"
      :active-filters="activeFilters"
      :empty-title="emptyTitle"
      :empty-btn-text="canAdd ? '新增轮播图' : ''"
      export-file-name="轮播图"
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
            <div class="goodsspu-dc__banner-title">轮播图</div>
            <div class="goodsspu-dc__banner-sub">H5 首页顶部轮播，只展示已启用的；排序数值越小越靠前</div>
          </div>
        </div>
      </template>

      <template #filters>
        <el-select v-model="enableFilter" class="dc-tbl__select dc-nsel" style="width: 120px" @change="handleSearch">
          <el-option value="" label="全部状态" />
          <el-option value="1" label="启用" />
          <el-option value="0" label="停用" />
        </el-select>
      </template>

      <template #tools>
        <button v-if="canAdd" class="dc-tbl__tool-btn dc-tbl__tool-btn--primary" @click="openForm('add')">
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round"
          ><path d="M12 5v14M5 12h14" /></svg>新增轮播图
        </button>
      </template>

      <template #col-imageUrl="{ row }">
        <el-image
          v-if="row.imageUrl"
          class="banner-page__thumb"
          :src="row.imageUrl"
          :preview-src-list="[row.imageUrl]"
          preview-teleported
          fit="cover"
          @click.stop
        />
        <span v-else class="banner-page__muted">—</span>
      </template>
      <template #col-title="{ row }">
        <div class="banner-page__title" :class="{ 'is-off': row.enable !== '1' }" :title="row.title">{{ row.title || "—" }}</div>
      </template>
      <template #col-linkUrl="{ row }">
        <div v-if="row.linkUrl" class="banner-page__link" :title="row.linkUrl">{{ row.linkUrl }}</div>
        <span v-else class="banner-page__muted">不跳转</span>
      </template>
      <template #col-sort="{ row }">
        <span class="banner-page__num">{{ row.sort ?? 0 }}</span>
      </template>
      <template #col-enable="{ row }">
        <el-switch
          :model-value="row.enable === '1'"
          :loading="isPending(row)"
          :disabled="!canEdit"
          @update:model-value="toggle(row)"
          @click.stop
        />
      </template>
      <template #col-updateTime="{ row }">
        <span class="banner-page__time" :title="row.createTime ? '创建时间：' + row.createTime : ''">{{ fmtTime(row.updateTime || row.createTime) }}</span>
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
      :title="formMode === 'add' ? '新增轮播图' : '编辑轮播图'"
      subtitle="带 * 为必填项，保存后 H5 首页即时生效"
      :width="560"
      :columns="1"
      :mode="formMode"
      :saving="formSaving"
      :missing-count="missingCount"
      @save="saveForm"
    >
      <div class="dcfd-field">
        <label class="dcfd-label"><em>*</em>标题</label>
        <div class="dcfd-control">
          <input
            v-model="form.title"
            class="dcfd-input"
            :class="{ 'is-error': !!errors.title }"
            :maxlength="TITLE_MAX"
            placeholder="后台识别用，H5 不展示，如：开学季活动"
            @input="clearError('title')"
          >
          <span class="dcfd-counter">{{ form.title.length }}/{{ TITLE_MAX }}</span>
        </div>
        <div v-if="errors.title" class="dcfd-error">{{ errors.title }}</div>
      </div>

      <div class="dcfd-field">
        <label class="dcfd-label"><em>*</em>图片</label>
        <div :class="{ 'is-error': !!errors.imageUrl }" tabindex="-1">
          <MaterialList
            v-model:singleValue="form.imageUrl"
            :num="1"
            :is-single="true"
            type="image"
            :width="240"
            :height="96"
            @update:singleValue="clearError('imageUrl')"
          />
        </div>
        <div v-if="errors.imageUrl" class="dcfd-error">{{ errors.imageUrl }}</div>
        <div v-else class="dcfd-helper">同一组轮播图请用相同尺寸，建议宽 750px</div>
      </div>

      <div class="dcfd-field">
        <label class="dcfd-label">跳转地址</label>
        <div class="dcfd-control">
          <input
            v-model="form.linkUrl"
            class="dcfd-input"
            :class="{ 'is-error': !!errors.linkUrl }"
            :maxlength="LINK_MAX"
            placeholder="如：/pages/goods/goods-detail/index?id=商品ID"
            @input="clearError('linkUrl')"
          >
        </div>
        <div v-if="errors.linkUrl" class="dcfd-error">{{ errors.linkUrl }}</div>
        <div v-else class="dcfd-helper">站内页面以 / 开头，外部页面填 http(s) 地址；留空则点击不跳转</div>
      </div>

      <div class="dcfd-field">
        <label class="dcfd-label">排序</label>
        <div class="dcfd-control">
          <input
            v-model="form.sort"
            class="dcfd-input"
            :class="{ 'is-error': !!errors.sort }"
            inputmode="numeric"
            placeholder="0"
            @input="clearError('sort')"
          >
        </div>
        <div v-if="errors.sort" class="dcfd-error">{{ errors.sort }}</div>
        <div v-else class="dcfd-helper">数值越小越靠前，不填按 0</div>
      </div>

      <div class="dcfd-field">
        <label class="dcfd-label">状态</label>
        <div class="dcfd-pills">
          <span class="dcfd-pill" :class="{ 'is-active': form.enable === '1' }" @click="form.enable = '1'">启用</span>
          <span class="dcfd-pill" :class="{ 'is-active': form.enable === '0' }" @click="form.enable = '0'">停用</span>
        </div>
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
import MaterialList from "@/components/material/list.vue";
import type { DcActiveFilter, DcRowAction, DcTableCol } from "@/components/dc-shell/types";
import { appConfirm, message, useOptimisticToggle } from "@/components/overlay";
import { hasAnyPermission } from "@/utils/permission";
import { addObj, delObj, getPage, putObj, type BannerVO } from "@/api/mall/banner";

import "../goods-list-dc.scss";

defineOptions({ name: "MallBanner" });

/** 与后端 Banner 实体校验一致 */
const TITLE_MAX = 64;
const LINK_MAX = 500;

// ────────── 权限（computed 里读：刷新早期 store 未回填时，回填后按钮自动出现） ──────────
const canAdd = computed(() => hasAnyPermission(["mall:banner:add"]));
const canEdit = computed(() => hasAnyPermission(["mall:banner:edit"]));
const canDel = computed(() => hasAnyPermission(["mall:banner:del"]));

const cols: DcTableCol[] = [
  { key: "imageUrl", t: "图片", hideable: false },
  { key: "title", t: "标题" },
  { key: "linkUrl", t: "跳转地址" },
  { key: "sort", t: "排序", al: "center" },
  { key: "enable", t: "启用", al: "center", exportValue: (r) => (r.enable === "1" ? "启用" : "停用") },
  { key: "updateTime", t: "更新时间", exportValue: (r) => fmtTime(r.updateTime || r.createTime) },
  { key: "acts", t: "操作", al: "right", hideable: false },
];

function fmtTime(t: unknown) {
  return t ? String(t).slice(0, 16) : "—";
}

// ────────── 筛选（输入态 vs 已生效态：翻页 / 刷新只用已生效的） ──────────
const keyword = ref("");
const enableFilter = ref("");
const applied = ref({ title: "", enable: "" });

const isFiltered = computed(() => !!applied.value.title || !!applied.value.enable);

const activeFilters = computed<DcActiveFilter[]>(() => {
  const out: DcActiveFilter[] = [];
  if (applied.value.enable) {
    out.push({
      key: "enable",
      label: `状态: ${applied.value.enable === "1" ? "启用" : "停用"}`,
      onRemove: () => {
        enableFilter.value = "";
        applied.value = { ...applied.value, enable: "" };
        pageNo.value = 1;
        reload();
      },
    });
  }
  return out;
});

// ────────── 列表 ──────────
const rows = ref<BannerVO[]>([]);
const total = ref(0);
const pageNo = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const loadFailed = ref(false);

const emptyTitle = computed(() => {
  if (loadFailed.value) return "加载失败，请点右上角刷新重试";
  return isFiltered.value ? "没有符合条件的轮播图" : "还没有轮播图";
});

async function reload() {
  loading.value = true;
  try {
    const res: any = await getPage({
      current: pageNo.value,
      size: pageSize.value,
      title: applied.value.title || undefined,
      enable: applied.value.enable || undefined,
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
  applied.value = { title: keyword.value.trim(), enable: enableFilter.value };
  pageNo.value = 1;
  reload();
}

function handleReset() {
  keyword.value = "";
  enableFilter.value = "";
  applied.value = { title: "", enable: "" };
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

/** 后端 PUT 整条校验，改单个字段也带上整条 */
function toPayload(row: BannerVO): BannerVO {
  return {
    id: row.id,
    title: row.title,
    imageUrl: row.imageUrl,
    linkUrl: row.linkUrl || null,
    sort: row.sort ?? 0,
    enable: row.enable,
  };
}

// ────────── 行启停（乐观翻转，失败回滚） ──────────
const { toggle, isPending } = useOptimisticToggle<BannerVO>({
  get: (row) => row.enable === "1",
  set: (row, v) => {
    row.enable = v ? "1" : "0";
  },
  submit: (row, next) => putObj({ ...toPayload(row), enable: next ? "1" : "0" }),
  key: (row) => row.id as string,
  confirmOnOff: (row) => ({
    intent: "danger",
    title: `停用「${row.title}」？`,
    body: "停用后 H5 首页不再展示这张轮播图，可随时重新启用。",
    verb: "停用",
  }),
});

// ────────── 行操作 ──────────
function actsOf(row: BannerVO): DcRowAction[] {
  return [
    { key: "edit", t: "编辑", on: () => openForm("edit", row), hidden: !canEdit.value },
    { key: "del", t: "删除", danger: true, on: () => handleDel(row), hidden: !canDel.value },
  ];
}

function handleDel(row: BannerVO) {
  appConfirm({ intent: "delete", title: `删除轮播图「${row.title}」？`, verb: "删除" })
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
const form = reactive({ title: "", imageUrl: "", linkUrl: "", sort: "", enable: "1" });
const errors = reactive<Record<string, string>>({});
const missingCount = computed(() => Object.keys(errors).length);

function clearError(key: string) {
  delete errors[key];
}

function openForm(mode: "add" | "edit", row?: BannerVO) {
  formMode.value = mode;
  editingId.value = mode === "edit" ? (row?.id ?? "") : "";
  Object.assign(form, {
    title: row?.title ?? "",
    imageUrl: row?.imageUrl ?? "",
    linkUrl: row?.linkUrl ?? "",
    sort: row?.sort == null ? "" : String(row.sort),
    enable: row?.enable ?? "1",
  });
  Object.keys(errors).forEach((k) => delete errors[k]);
  formSaving.value = false;
  formOpen.value = true;
}

/** 与后端 BannerController.normalize 同一套规则，前置拦下免得白跑一趟 */
function isAllowedLink(link: string) {
  if (link.startsWith("/")) return !link.startsWith("//");
  return /^https?:\/\//i.test(link);
}

function validate() {
  Object.keys(errors).forEach((k) => delete errors[k]);
  const title = form.title.trim();
  if (!title) errors.title = "请输入标题";
  else if (title.length > TITLE_MAX) errors.title = `标题最多 ${TITLE_MAX} 个字`;
  if (!form.imageUrl) errors.imageUrl = "请选择图片";
  const link = form.linkUrl.trim();
  if (link && !isAllowedLink(link)) errors.linkUrl = "跳转地址只能是站内路由（以 / 开头）或 http(s) 地址";
  const sort = String(form.sort).trim();
  if (sort && !/^\d{1,9}$/.test(sort)) errors.sort = "排序请填 0 或正整数";
  return missingCount.value === 0;
}

function saveForm() {
  if (formSaving.value || !validate()) return;
  const sort = String(form.sort).trim();
  const payload: BannerVO = {
    title: form.title.trim(),
    imageUrl: form.imageUrl,
    linkUrl: form.linkUrl.trim() || null,
    sort: sort ? Number(sort) : 0,
    enable: form.enable,
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
      // 拦截器已提示后端原话
    })
    .finally(() => {
      formSaving.value = false;
    });
}

reload();
</script>

<style scoped lang="scss">
.banner-page__thumb {
  display: block;
  width: 104px;
  height: 42px;
  cursor: zoom-in;
  background: var(--dc-bg-header);
  border: 1px solid var(--dc-border);
  border-radius: 4px;
}

.banner-page__title {
  overflow: hidden;
  font-size: 14px;
  color: var(--dc-text-1);
  text-overflow: ellipsis;
  white-space: nowrap;

  &.is-off {
    color: var(--dc-text-3);
  }
}

.banner-page__link {
  overflow: hidden;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 13px;
  color: var(--dc-text-2);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.banner-page__muted {
  font-size: 14px;
  color: var(--dc-text-4);
}

.banner-page__num,
.banner-page__time {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: var(--dc-text-2);
}

.banner-page__time {
  color: var(--dc-text-3);
}
</style>
