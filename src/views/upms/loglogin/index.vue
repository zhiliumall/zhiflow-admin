<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
  <div class="goods-dc-page loglogin-page">
    <!-- ============ 页头横幅（cyan tint + shield 动效插画 + 指标） ============ -->
    <div class="loglogin-dc__banner">
      <div class="loglogin-dc__banner-tex">
        <div class="loglogin-dc__banner-glow--1" />
        <div class="loglogin-dc__banner-glow--2" />
      </div>
      <div class="loglogin-dc__banner-title">登录日志</div>
      <div style="flex: 1" />
      <!-- 动效插画（banners-html/sys-shield.html 照搬） -->
      <div class="loglogin-dc__banner-art">
        <div class="loglogin-dc__art-shield">
          <svg width="56" height="62" viewBox="0 0 24 26" fill="none">
            <path d="M12 2l9 3.6v6.2c0 5.6-3.8 10.4-9 12-5.2-1.6-9-6.4-9-12V5.6z" fill="#FFFFFF" stroke="#3C6EF0" stroke-width="1.3" />
            <path d="M8 12l2.8 2.8L17 9" stroke="#3C6EF0" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <div class="loglogin-dc__art-radar">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="26" stroke="#D4E1FB" stroke-width="1.4" />
            <circle cx="28" cy="28" r="16" stroke="#D4E1FB" stroke-width="1.2" stroke-dasharray="3 4" />
            <circle cx="28" cy="28" r="3" fill="#3C6EF0" />
          </svg>
          <span class="loglogin-dc__art-sweep" />
          <span class="loglogin-dc__art-dot" />
        </div>
      </div>
      <!-- 指标：后端无「今日登录」聚合接口 → 按当前页数据估算（页级近似），样式照设计 -->
      <div class="loglogin-dc__banner-metric">
        <div class="loglogin-dc__metric-label">今日登录</div>
        <div class="loglogin-dc__metric-num">{{ todayLoginCount }}</div>
      </div>
    </div>

    <!-- ============ 表格外壳（由 DcTableShell 统一承载） ============ -->
    <DcTableShell
      v-model:keyword="searchForm.keyword"
      storage-key="upms-loglogin"
      :cols="cols"
      grid="1.3fr 1.1fr 0.65fr 0.9fr 1fr 0.9fr 1.4fr 1fr 1.1fr 1.4fr 0.6fr"
      q-ph="搜索登录者 / IP"
      :rows="visibleRows"
      :row-class="rowClass"
      :total="page.total"
      :loading="tableLoading"
      :filtered="hasActiveFilter"
      :active-filters="activeFilters"
      empty-title="暂无登录记录"
      empty-tint1="#E8F1FF"
      empty-tint2="#3C6EF0"
      export-file-name="登录日志"
      @search="handleQuery"
      @reset="handleReset"
      @refresh="refreshChange"
      @sort-change="onSortChange"
      @empty-action="handleReset"
    >
      <template #filters>
        <el-select placeholder="全部类型" v-model="searchForm.type" class="dc-tbl__select dc-nsel">
          <el-option value="" label="全部类型" />
          <el-option v-for="d in typeDict" :key="d.value" :value="d.value" :label="d.label" />
        </el-select>
        <el-select placeholder="全部登录方式" v-model="searchForm.grantType" class="dc-tbl__select dc-nsel">
          <el-option value="" label="全部登录方式" />
          <el-option v-for="(label, value) in GRANT_LABEL" :key="value" :value="value" :label="label" />
        </el-select>
      </template>

      <template #col-createId="{ row }">
        <div class="loglogin-dc__mono-cell">
          <span class="loglogin-dc__mono" :title="String(row.createId ?? '')">{{ row.createId ?? "—" }}</span>
        </div>
      </template>

      <!-- 登录者：头像 + 用户名 -->
      <template #col-createBy="{ row }">
        <div class="loglogin-dc__user">
          <div class="loglogin-dc__avatar" :style="{ background: avatarBg(row) }">{{ avatarChar(row) }}</div>
          <div class="loglogin-dc__user-main">
            <div class="loglogin-dc__user-name">{{ row.createBy || "—" }}</div>
          </div>
        </div>
      </template>
      <template #col-type="{ row }">
        <span class="loglogin-dc__tag" :class="typeTagClass(row)">
          <span class="loglogin-dc__tag-dot" />{{ typeText(row) }}
        </span>
      </template>
      <template #col-grantType="{ row }">
        <span class="loglogin-dc__tag" :class="grantTagClass(row)">{{ grantText(row) }}</span>
      </template>
      <template #col-remoteAddr="{ row }">
        <div class="loglogin-dc__mono-cell">
          <span class="loglogin-dc__mono">{{ row.remoteAddr || "—" }}</span>
          <span
            v-if="row.remoteAddr"
            class="loglogin-dc__cp"
            :class="{ 'is-copied': copiedKey === row.id + ':ip' }"
            title="复制"
            @click="copyText(row.id + ':ip', row.remoteAddr)"
          >
            <svg v-if="copiedKey === row.id + ':ip'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--dc-success)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg>
            <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
          </span>
        </div>
      </template>
      <template #col-address="{ row }">
        <div class="loglogin-dc__text" :class="{ 'is-empty': !row.address }">{{ row.address || "—" }}</div>
      </template>
      <template #col-userAgent="{ row }">
        <div class="loglogin-dc__text" :class="{ 'is-empty': !row.userAgent }" :title="row.userAgent || ''">
          {{ row.userAgent || "—" }}
        </div>
      </template>
      <template #col-requestUri="{ row }">
        <div class="loglogin-dc__mono-cell">
          <span class="loglogin-dc__mono" :title="row.requestUri || ''">{{ row.requestUri || "—" }}</span>
          <span
            v-if="row.requestUri"
            class="loglogin-dc__cp"
            :class="{ 'is-copied': copiedKey === row.id + ':uri' }"
            title="复制"
            @click="copyText(row.id + ':uri', row.requestUri)"
          >
            <svg v-if="copiedKey === row.id + ':uri'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--dc-success)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg>
            <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
          </span>
        </div>
      </template>
      <!-- 时间：7 天内相对时间 + title 悬停绝对值 -->
      <template #col-createTime="{ row }">
        <div class="loglogin-dc__time" :title="row.createTime || ''">{{ relTime(row.createTime) }}</div>
      </template>
      <template #col-exception="{ row }">
        <div class="loglogin-dc__exception" :class="{ 'is-empty': !hasException(row) }" :title="row.exception || ''">
          {{ hasException(row) ? row.exception : "—" }}
        </div>
      </template>
      <template #col-acts="{ row }">
        <div class="dc-tbl__acts">
          <span v-if="canDel" class="dc-tbl__act dc-tbl__act--danger" @click.stop="handleDel(row)">删除</span>
        </div>
      </template>

      <!-- ============ 分页（共享原语 DcPager；单页仍隐藏，调现有 getPageF） ============ -->
      <template #pagination>
        <DcPager
          v-if="page.total > page.pageSize"
          :total="page.total"
          :current="page.currentPage"
          :page-size="page.pageSize"
          :page-sizes="[10, 20, 50]"
          @change="onPageChange"
          @size-change="onSizeChange"
        />
      </template>

      <template #empty-art>
        <DcEmptyImage :src="emptyImg" alt="登录日志空状态插画" />
      </template>
    </DcTableShell>

  </div>
</template>

<script lang="ts" setup>
/**
 * 登录日志：只读列表 + 删除。
 * 类型取字典 log_type；登录方式是 OAuth2 grant_type 原值，前端本地映射文案。
 */
import { computed, getCurrentInstance, reactive, ref } from "vue";
import { delObj, getPage } from "@/api/upms/loglogin";
import { validatenull } from "@/utils/validate";
import { http } from "@/utils/http";
import DcPager from "@/components/dc-shell/DcPager.vue";
import DcTableShell from "@/components/dc-shell/DcTableShell.vue";
import { useDcDeleteToast } from "@/components/dc-shell/dcDeleteToast";
import { DcEmptyImage } from "@/components/dc-states";
import { appConfirm } from "@/components/overlay";
import { usePermissionStoreHook } from "@/store/modules/permission";
import emptyImg from "@/assets/common/empty.png";
import type { DcActiveFilter, DcSortPayload, DcTableCol } from "@/components/dc-shell/types";

import "../../mall/goods-dc.scss"; // 页面根类 goods-dc-page（共享，只引用不修改）
import "../../mall/goods-list-dc.scss";
import "../loglogin-dc.scss";

const { proxy } = getCurrentInstance()!;

const cols: DcTableCol[] = [
  { key: "createId", t: "登录者ID" },
  { key: "createBy", t: "登录者" },
  { key: "type", t: "类型", exportValue: (r) => typeText(r) },
  { key: "grantType", t: "登录方式", exportValue: (r) => grantText(r) },
  { key: "remoteAddr", t: "IP 地址" },
  { key: "address", t: "地址" },
  { key: "userAgent", t: "用户代理" },
  { key: "requestUri", t: "请求 URI" },
  { key: "createTime", t: "时间", sort: true },
  { key: "exception", t: "异常信息" },
  { key: "acts", t: "操作", al: "right", hideable: false, exportValue: () => "" },
];

const canDel = computed(() => !!usePermissionStoreHook()?.permissions["sys:loglogin:del"]);

// ==================== 响应式状态 ====================
const tableData = ref<any[]>([]);
const page = ref({
  total: 0,
  currentPage: 1,
  pageSize: 20,
  ascs: "",
  descs: "create_time",
});
const paramsSearch = ref<any>({});
const tableLoading = ref(false);

/** 过滤空值 */
function filterForm(formData: any) {
  const obj: any = {};
  Object.keys(formData).forEach((ele) => {
    if (!validatenull(formData[ele])) {
      obj[ele] = formData[ele];
    }
  });
  return obj;
}

function searchChange(params: any, done: () => void) {
  params = filterForm(params);
  paramsSearch.value = params;
  page.value.currentPage = 1;
  getPageF(page.value, params);
  done();
}

function sortChange(val: any) {
  const prop = val.prop
    ? val.prop.replace(/([A-Z])/g, "_$1").toLowerCase()
    : "";

  if (val.order == "ascending") {
    page.value.descs = "";
    page.value.ascs = prop;
  } else if (val.order == "descending") {
    page.value.ascs = "";
    page.value.descs = prop;
  } else {
    page.value.ascs = "";
    page.value.descs = "";
  }

  getPageF(page.value);
}

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
      params,
      paramsSearch.value
    )
  )
    .then((response) => {
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

function refreshChange() {
  getPageF(page.value);
}

// ==================== 字典 ====================
const typeDict = ref<any[]>([]);
/** OAuth2 grant_type → 文案 */
const GRANT_LABEL: Record<string, string> = {
  password: "账号密码",
  refresh_token: "刷新令牌",
};
function loadDicts() {
  http
    .request("get", "/upms/dict/type/log_type")
    .then((res: any) => {
      const list = Array.isArray(res) ? res : res?.data || [];
      typeDict.value = Array.isArray(list) ? list : [];
    })
    .catch(() => {
      typeDict.value = [];
    });
}
function dictLabel(list: any[], v: any) {
  if (v == null || v === "") return "";
  const hit = list.find((d) => String(d.value) === String(v));
  return hit ? hit.label : String(v);
}

// ==================== 筛选（映射到原搜索参数 createBy / type / grantType） ====================
const searchForm = reactive({ keyword: "", type: "", grantType: "" });
const hasActiveFilter = computed(
  () => !!(searchForm.keyword.trim() || searchForm.type || searchForm.grantType)
);

// 搜索框：IP 形态按 remoteAddr 查，其余按登录者 createBy
function buildSearchParams() {
  const p: Record<string, any> = {};
  const kw = searchForm.keyword.trim();
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(kw)) p.remoteAddr = kw;
  else if (kw) p.createBy = kw;
  if (searchForm.type) p.type = searchForm.type;
  if (searchForm.grantType) p.grantType = searchForm.grantType;
  return p;
}
function handleQuery() {
  searchChange(buildSearchParams(), () => {});
}

/** 生效筛选条件 tag：只对两个下拉做，关键字由搜索框自己的 ✕ 清除 */
const activeFilters = computed<DcActiveFilter[]>(() => {
  const out: DcActiveFilter[] = [];
  const ps: any = paramsSearch.value || {};
  if (ps.type) {
    out.push({
      key: "type",
      label: `类型: ${dictLabel(typeDict.value, ps.type) || ps.type}`,
      onRemove: () => {
        searchForm.type = "";
        handleQuery();
      },
    });
  }
  if (ps.grantType) {
    out.push({
      key: "grantType",
      label: `登录方式: ${GRANT_LABEL[ps.grantType] || ps.grantType}`,
      onRemove: () => {
        searchForm.grantType = "";
        handleQuery();
      },
    });
  }
  return out;
});
function handleReset() {
  searchForm.keyword = "";
  searchForm.type = "";
  searchForm.grantType = "";
  paramsSearch.value = {};
  page.value.currentPage = 1;
  getPageF(page.value);
}
// ==================== 排序（三态由 DcTableShell 表头维护） ====================
function onSortChange(p: DcSortPayload) {
  sortChange({
    prop: p.key,
    order: p.order === "asc" ? "ascending" : p.order === "desc" ? "descending" : "",
  });
}

// ==================== 分页 ====================
function onPageChange(p: number) {
  page.value.currentPage = p;
  getPageF(page.value);
}
function onSizeChange(s: number) {
  page.value.pageSize = s;
  page.value.currentPage = 1;
  getPageF(page.value);
}

// ==================== 行展示辅助（仅取现有字段） ====================
// 头像渐变 6 色板（按登录者名 hash 取色）
const AV = [
  "linear-gradient(135deg,#3C6EF0,#5A86F5)",
  "linear-gradient(135deg,#07C160,#3ED483)",
  "linear-gradient(135deg,#FA8C16,#FFB35C)",
  "linear-gradient(135deg,#722ED1,#9A5CE6)",
  "linear-gradient(135deg,#13C2C2,#4DD6D6)",
  "linear-gradient(135deg,#EB2F96,#F67AB7)",
];
function avatarBg(row: any) {
  const s = String(row.createBy || row.createId || "");
  let n = 0;
  for (let i = 0; i < s.length; i++) n += s.charCodeAt(i);
  return AV[n % AV.length];
}
function avatarChar(row: any) {
  const s = String(row.createBy || "").trim();
  return s ? s[0].toUpperCase() : "—";
}

function hasException(row: any) {
  return !validatenull(row.exception);
}
function typeText(row: any) {
  return dictLabel(typeDict.value, row.type) || "—";
}
// 类型章配色：有异常或字典文案含失败/异常 → 红，否则绿（设计 成功 g / 失败 r）
function typeTagClass(row: any) {
  const label = typeText(row);
  return hasException(row) || /失败|异常|错误/.test(label) ? "is-r" : "is-g";
}
function grantText(row: any) {
  if (row.grantType == null || row.grantType === "") return "—";
  return GRANT_LABEL[row.grantType] || String(row.grantType);
}
function grantTagClass(row: any) {
  return row.grantType === "password" ? "is-b" : "is-gy";
}

// 相对时间：7 天内显示相对值，title 悬停绝对值
function relTime(t: any) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(String(t || ""));
  if (!m) return t || "—";
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const diff = Date.now() - d.getTime();
  if (diff < 0 || Number.isNaN(diff)) return t;
  const mn = Math.floor(diff / 60000);
  if (mn < 1) return "刚刚";
  if (mn < 60) return `${mn} 分钟前`;
  const h = Math.floor(mn / 60);
  if (h < 24) return `${h} 小时前`;
  const dd = Math.floor(h / 24);
  if (dd <= 7) return `${dd} 天前`;
  return t;
}

// 横幅指标：今日登录（当前页数据聚合估算，页级近似，非全量）
const todayLoginCount = computed(() => {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return tableData.value.filter((r) => String(r.createTime || "").slice(0, 10) === today).length;
});

// mono 单元格复制（复制成功短暂显示 ✓）
const copiedKey = ref("");
let copiedTimer: ReturnType<typeof setTimeout> | null = null;
function copyText(key: string, txt: string) {
  if (!txt) return;
  navigator.clipboard?.writeText(txt);
  copiedKey.value = key;
  if (copiedTimer) clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => (copiedKey.value = ""), 1500);
}

// ==================== 删除（5 秒内可撤销） ====================
const { visibleRows, rowClass, requestDelete } = useDcDeleteToast(() => tableData.value);
function handleDel(row: any) {
  appConfirm({ intent: "delete", title: "删除该登录日志？", verb: "删除" })
    .then(() => {
      requestDelete(row, {
        commit: () => delObj(row.id),
        message: proxy.$t("commons.delSuccess"),
        onCommitted: () => getPageF(page.value),
      });
    })
    .catch(() => {
      // 用户取消确认框
    });
}

// ==================== 首拉 + 字典 ====================
loadDicts();
getPageF(page.value);
</script>
