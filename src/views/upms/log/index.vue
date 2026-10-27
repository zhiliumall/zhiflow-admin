<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
  <div class="log-page">
    <!-- ============ 横幅（tint=ink + logf 动效插画 + 今日操作指标） ============ -->
    <div class="log-dc__banner">
      <div class="log-dc__banner-fx">
        <div class="log-dc__banner-gridfx" />
        <div class="log-dc__banner-glow--1" />
        <div class="log-dc__banner-glow--2" />
      </div>
      <div class="log-dc__banner-title">操作日志</div>
      <div style="flex: 1" />
      <div class="log-dc__banner-art">
        <div class="log-dc__art-doc">
          <svg width="120" height="60" viewBox="0 0 120 60" fill="none">
            <rect x="1" y="1" width="118" height="58" rx="6" fill="#FFFFFF" stroke="#8C8C8C" stroke-width="1.5" />
            <rect x="1" y="1" width="118" height="12" rx="6" fill="#E8F1FF" />
            <circle cx="9" cy="7" r="2" fill="#3C6EF0" />
            <circle cx="16" cy="7" r="2" fill="#5A86F5" />
            <circle cx="23" cy="7" r="2" fill="#9DB6F8" />
            <rect x="10" y="20" width="56" height="4" rx="2" fill="#BBD4FF" />
            <rect x="10" y="30" width="84" height="4" rx="2" fill="#D6E4FF" />
            <rect x="10" y="40" width="40" height="4" rx="2" fill="#BBD4FF" />
          </svg>
          <span class="log-dc__art-cursor" />
        </div>
        <span class="log-dc__art-dot--1" />
        <span class="log-dc__art-dot--2" />
      </div>
      <!-- 今日操作：后端无聚合接口，按当前页数据 createTime 归今日计数（页级近似） -->
      <div class="log-dc__banner-metric">
        <div class="log-dc__banner-metric-label">今日操作</div>
        <div class="log-dc__banner-metric-num">{{ todayCount }}</div>
      </div>
    </div>

    <!-- ============ 表格外壳（由 DcTableShell 统一承载） ============ -->
    <DcTableShell
      v-model:keyword="searchForm.keyword"
      storage-key="upms-log"
      :cols="cols"
      grid="0.65fr 1.5fr 0.7fr 1fr 1.5fr 0.7fr 0.85fr 1.1fr 0.6fr"
      q-ph="搜索标题 / URI"
      :rows="visibleRows"
      :row-class="rowClass"
      :total="page.total"
      :loading="tableLoading"
      :filtered="isFiltered"
      empty-title="暂无操作记录"
      empty-tint1="#E8F1FF"
      empty-tint2="#3C6EF0"
      export-file-name="操作日志"
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
        <el-select placeholder="全部方式" v-model="searchForm.method" class="dc-tbl__select dc-nsel">
          <el-option value="" label="全部方式" />
          <el-option v-for="d in methodDict" :key="d.value" :value="d.value" :label="d.label" />
        </el-select>
      </template>

      <template #col-type="{ row }">
        <span class="log-dc__tag" :class="typeTagClass(row)">{{ typeLabel(row) }}</span>
      </template>
      <template #col-title="{ row }">
        <div class="log-dc__td--ellipsis" style="font-size: 14px;color:var(--dc-text-1);" :title="row.title" @click="openDetail(row)">{{ row.title || '—' }}</div>
      </template>
      <template #col-createBy="{ row }">
        <div class="log-dc__td--ellipsis" style="font-size: 14px;color:var(--dc-text-1);">{{ row.createBy || '—' }}</div>
      </template>
      <template #col-remoteAddr="{ row }">
        <div class="log-dc__mono">
          <span class="log-dc__mono-text">{{ row.remoteAddr || '—' }}</span>
          <el-icon
            v-if="row.remoteAddr"
            class="goodsspu-dc__copy"
            @click.stop="copyText(row.remoteAddr, 'IP 已复制')"
          ><DocumentCopy /></el-icon>
        </div>
      </template>
      <template #col-requestUri="{ row }">
        <div class="log-dc__mono" :title="row.requestUri">
          <span class="log-dc__mono-text">{{ row.requestUri || '—' }}</span>
          <el-icon
            v-if="row.requestUri"
            class="goodsspu-dc__copy"
            @click.stop="copyText(row.requestUri, 'URI 已复制')"
          ><DocumentCopy /></el-icon>
        </div>
      </template>
      <template #col-method="{ row }">
        <span class="log-dc__tag log-dc__tag--mono" :class="methodTagClass(row.method)">{{ methodLabel(row) }}</span>
      </template>
      <template #col-time="{ row }">
        <div
          class="log-dc__cost"
          :class="{ 'is-slow': isSlow(row) }"
          :title="isSlow(row) ? '慢请求 >1s' : ''"
        >{{ costText(row.time) }}</div>
      </template>
      <template #col-createTime="{ row }">
        <div class="log-dc__time">{{ row.createTime || '—' }}</div>
      </template>
      <template #col-acts="{ row }">
        <div class="dc-tbl__acts">
          <span class="dc-tbl__act" @click.stop="openDetail(row)">详情</span>
          <span v-if="canDel" class="dc-tbl__act dc-tbl__act--danger" @click.stop="handleDel(row)">删除</span>
        </div>
      </template>

      <!-- ============ 分页 ============ -->
      <template #pagination>
        <DcPager
          v-if="tableData.length > 0"
          :total="page.total"
          :current="page.currentPage"
          :page-size="page.pageSize"
          :page-sizes="[10, 20, 50]"
          @change="onPageChange"
          @size-change="onSizeChange"
        />
      </template>

      <template #empty-art>
        <DcEmptyImage :src="emptyImg" alt="操作日志空状态插画" />
      </template>
    </DcTableShell>

    <!-- ============ 操作日志详情抽屉 ============ -->
    <Teleport to="body">
      <div v-if="detailRow" class="log-dc__mask" @click="closeDetail">
        <div class="log-dc__drawer" @click.stop>
          <div class="log-dc__drawer-head">
            <span class="log-dc__drawer-title">操作日志详情</span>
            <span class="log-dc__tag log-dc__tag--mono" :class="methodTagClass(detailRow.method)">{{ methodLabel(detailRow) }}</span>
            <span class="log-dc__tag" :class="detailRow.exception ? 'is-r' : 'is-g'">{{ detailRow.exception ? '异常' : '成功' }}</span>
            <div style="flex: 1" />
            <span class="log-dc__drawer-close" @click="closeDetail">✕</span>
          </div>
          <div class="log-dc__drawer-body">
            <!-- 基本信息网格 -->
            <div class="log-dc__info-grid">
              <div>
                <div class="log-dc__info-label">日志标题</div>
                <div class="log-dc__info-val log-dc__info-val--strong">{{ detailRow.title || '—' }}</div>
              </div>
              <div>
                <div class="log-dc__info-label">创建者</div>
                <div class="log-dc__info-val">{{ detailRow.createBy || '—' }}</div>
              </div>
              <div>
                <div class="log-dc__info-label">IP 地址</div>
                <div class="log-dc__info-val log-dc__info-val--mono">{{ detailRow.remoteAddr || '—' }}</div>
              </div>
              <div>
                <div class="log-dc__info-label">执行耗时</div>
                <div class="log-dc__info-val log-dc__info-val--num log-dc__info-val--cost" :class="{ 'is-slow': isSlow(detailRow) }">
                  {{ costText(detailRow.time) }}
                </div>
              </div>
              <div class="log-dc__info-span2">
                <div class="log-dc__info-label">请求 URI</div>
                <div class="log-dc__info-val log-dc__info-val--mono">{{ detailRow.requestUri || '—' }}</div>
              </div>
              <div>
                <div class="log-dc__info-label">创建时间</div>
                <div class="log-dc__info-val log-dc__info-val--num">{{ detailRow.createTime || '—' }}</div>
              </div>
            </div>
            <!-- 请求参数（深底 mono 代码块；行数据无 params 则整块降级隐藏） -->
            <div v-if="detailParams">
              <div class="log-dc__sec-title">请求参数</div>
              <pre class="log-dc__code">{{ detailParams }}</pre>
            </div>
            <!-- 异常堆栈（暗红底代码块；无异常隐藏） -->
            <div v-if="detailRow.exception">
              <div class="log-dc__sec-title log-dc__sec-title--err">异常信息</div>
              <pre class="log-dc__code log-dc__code--err">{{ detailRow.exception }}</pre>
            </div>
          </div>
          <div class="log-dc__drawer-foot">
            <button v-if="detailParams" class="log-dc__foot-btn" @click="copyText(detailParams, '请求参数已复制')">复制参数</button>
            <button v-if="detailRow.exception" class="log-dc__foot-btn" @click="copyText(detailRow.exception, '异常信息已复制')">复制堆栈</button>
            <button class="log-dc__foot-btn log-dc__foot-btn--primary" @click="closeDetail">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
/**
 * 操作日志：只读列表 + 详情抽屉 + 删除。
 */
import { delObj, getPage } from "@/api/upms/log";
import { filterForm } from "@/utils/util";
import { http } from "@/utils/http";
import DcTableShell from "@/components/dc-shell/DcTableShell.vue";
import DcPager from "@/components/dc-shell/DcPager.vue";
import { useDcDeleteToast } from "@/components/dc-shell/dcDeleteToast";
import { DcEmptyImage } from "@/components/dc-states";
import { appConfirm } from "@/components/overlay";
import { usePermissionStoreHook } from "@/store/modules/permission";
import emptyImg from "@/assets/common/empty.png";
import type { DcSortPayload, DcTableCol } from "@/components/dc-shell/types";
import { DocumentCopy } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import {
  computed,
  getCurrentInstance,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";

import "../../mall/goods-list-dc.scss";
import "../log-dc.scss";

const { proxy } = getCurrentInstance()!;

const canDel = computed(() => !!usePermissionStoreHook()?.permissions["sys:log:del"]);

const cols: DcTableCol[] = [
  { key: "type", t: "类型", exportValue: (r) => typeLabel(r) },
  { key: "title", t: "日志标题" },
  { key: "createBy", t: "创建者" },
  { key: "remoteAddr", t: "IP 地址" },
  { key: "requestUri", t: "请求 URI" },
  { key: "method", t: "方式", exportValue: (r) => methodLabel(r) },
  { key: "time", t: "执行耗时", al: "right", sort: true, exportValue: (r) => costText(r.time) },
  { key: "createTime", t: "创建时间", sort: true },
  { key: "acts", t: "操作", al: "right", hideable: false, exportValue: () => "" },
];

// ==================== 响应式状态 ====================
const tableData = ref<any[]>([]);
const page = reactive({
  total: 0,
  currentPage: 1,
  pageSize: 20,
  ascs: "",
  descs: "create_time",
});
const paramsSearch = ref<any>({});
const tableLoading = ref(false);

// ==================== 字典（log_type / request_method） ====================
const typeDict = ref<any[]>([]);
const methodDict = ref<any[]>([]);
function loadDict(dictType: string, target: typeof typeDict) {
  http
    .request("get", `/upms/dict/type/${dictType}`)
    .then((res: any) => {
      let list = Array.isArray(res) ? res : res?.data || [];
      if (!Array.isArray(list)) list = [];
      target.value = list;
    })
    .catch(() => {
      target.value = [];
    });
}
function dictLabel(dict: any[], val: any) {
  if (val == null || val === "") return "—";
  const hit = dict.find((d) => String(d.value) === String(val));
  return hit ? hit.label : String(val);
}
function typeLabel(row: any) {
  return dictLabel(typeDict.value, row.type);
}
function methodLabel(row: any) {
  return dictLabel(methodDict.value, row.method);
}

// ==================== 状态章配色（类型按语义、方式按 HTTP 动词） ====================
const TYPE_TAG: Record<string, string> = {
  正常: "is-g",
  异常: "is-r",
  查询: "is-gy",
  新增: "is-b",
  修改: "is-o",
  删除: "is-r",
  导出: "is-c",
};
function typeTagClass(row: any) {
  return TYPE_TAG[typeLabel(row)] || "is-gy";
}
const METHOD_TAG: Record<string, string> = {
  GET: "is-b",
  POST: "is-g",
  PUT: "is-o",
  DELETE: "is-r",
};
function methodTagClass(method: any) {
  return METHOD_TAG[String(method || "").toUpperCase()] || "is-gy";
}

// ==================== 筛选 ====================
const searchForm = reactive({ keyword: "", type: "", method: "" });
// 空态按钮形态：有任一筛选条件时变「清空筛选条件」+ ghost
const isFiltered = computed(
  () => !!(searchForm.keyword || searchForm.type || searchForm.method),
);
// 关键词：以 / 开头按请求 URI，否则按日志标题
function buildSearchParams() {
  const p: Record<string, any> = {};
  const kw = searchForm.keyword.trim();
  if (kw.startsWith("/")) p.requestUri = kw;
  else if (kw) p.title = kw;
  if (searchForm.type) p.type = searchForm.type;
  if (searchForm.method) p.method = searchForm.method;
  return p;
}
function searchChange(params: any, done: () => void) {
  params = filterForm(params);
  paramsSearch.value = params;
  page.currentPage = 1;
  getPageF(page, params);
  done();
}
function handleQuery() {
  searchChange(buildSearchParams(), () => {});
}
function handleReset() {
  searchForm.keyword = "";
  searchForm.type = "";
  searchForm.method = "";
  paramsSearch.value = {};
  page.currentPage = 1;
  getPageF(page);
}

// ==================== 排序（执行耗时 / 创建时间；三态由 DcTableShell 表头维护） ====================
function sortChange(val: any) {
  const prop = val.prop
    ? val.prop.replace(/([A-Z])/g, "_$1").toLowerCase()
    : "";

  if (val.order == "ascending") {
    page.descs = "";
    page.ascs = prop;
  } else if (val.order == "descending") {
    page.ascs = "";
    page.descs = prop;
  } else {
    page.ascs = "";
    page.descs = "";
  }

  getPageF(page);
}
/** 壳的三态排序（asc → desc → null）转成后端 ascs/descs 的下划线列名 */
function onSortChange(p: DcSortPayload) {
  sortChange({
    prop: p.key,
    order: p.order === "asc" ? "ascending" : p.order === "desc" ? "descending" : "",
  });
}

// ==================== 数据加载 ====================
function getPageF(pageVal: any, params?: any) {
  tableLoading.value = true;
  getPage(
    Object.assign(
      {
        current: page.currentPage,
        size: page.pageSize,
        descs: page.descs,
        ascs: page.ascs,
      },
      params,
      paramsSearch.value,
    ),
  )
    .then((response) => {
      tableData.value = response.data.records || [];
      page.total = response.data.total;
      page.currentPage = pageVal.currentPage;
      page.pageSize = pageVal.pageSize;
      tableLoading.value = false;
    })
    .catch(() => {
      tableLoading.value = false;
    });
}

function refreshChange() {
  getPageF(page);
}

// ==================== 删除（5 秒内可撤销） ====================
const { visibleRows, rowClass, requestDelete } = useDcDeleteToast(() => tableData.value);
function handleDel(row: any) {
  appConfirm({ intent: "delete", title: "删除该操作日志？", verb: "删除" })
    .then(() => {
      requestDelete(row, {
        commit: () => delObj(row.id),
        message: proxy.$t("commons.delSuccess"),
        onCommitted: () => getPageF(page),
      });
    })
    .catch(() => {
      // 用户取消确认框
    });
}

// ==================== 分页 ====================
function onPageChange(p: number) {
  page.currentPage = p;
  getPageF(page);
}
function onSizeChange(s: number) {
  page.pageSize = s;
  page.currentPage = 1;
  getPageF(page);
}

// ==================== 横幅指标（页级近似：当前页 createTime 归今日的记录数） ====================
const todayCount = computed(() => {
  const today = dayjs().format("YYYY-MM-DD");
  return tableData.value.filter((r) => String(r.createTime || "").slice(0, 10) === today).length;
});

// ==================== 行展示辅助 ====================
// 执行耗时：后端 time 为 Long 毫秒，千分位 + ms；>1s 慢请求红色
function costText(time: any) {
  const n = Number(time);
  if (time == null || time === "" || Number.isNaN(n)) return "—";
  return `${n.toLocaleString()} ms`;
}
function isSlow(row: any) {
  return Number(row?.time) >= 1000;
}
function copyText(txt: string, tip = "已复制") {
  if (!txt) return;
  navigator.clipboard?.writeText(txt);
  proxy.$message.success(tip);
}

// ==================== 详情抽屉（字段取自行数据） ====================
const detailRow = ref<any>(null);
function openDetail(row: any) {
  detailRow.value = row;
}
function closeDetail() {
  detailRow.value = null;
}
// 请求参数：可解析 JSON 则美化缩进，否则原样展示；无 params 字段整块隐藏
const detailParams = computed(() => {
  const raw = detailRow.value?.params;
  if (raw == null || raw === "") return "";
  const s = String(raw);
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
});
// Esc 关闭 + 抽屉开启时锁背景滚动
function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && detailRow.value) closeDetail();
}
watch(detailRow, (val) => {
  document.body.style.overflow = val ? "hidden" : "";
});
onMounted(() => {
  document.addEventListener("keydown", onKeydown);
});
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = "";
});

// 首拉 + 字典
loadDict("log_type", typeDict);
loadDict("request_method", methodDict);
getPageF(page);
</script>
