<!--
  资金差错池 —— 只读列表 + 详情抽屉 + 唯一动作「标记已处理」。

  收的是「钱到了、订单收不了」的差错：取消后才到账、同一订单重复付款、到账金额与订单不符。
  系统不自动退、不恢复订单：人到支付渠道商户后台原路退款或核实后，回来点「标记已处理」并写备注（后端写操作日志）。
  按钮只给有 mall:orderinfo:edit 的人（与后端同一个码，这里只管可见性）。

  接口：GET /mall/payexception/page、/mall/payexception/{id}（权限 mall:orderinfo:index，与订单列表同一个码）。
  字段口径（类型 / 状态文案、渠道名、最小单位金额、timestamptz 时间）见 @/const/payException。

  深链：带 ?id=<差错 id> 进页即拉详情打开抽屉；页面被 keep-alive 缓存时，
  只在路由仍停在本页时响应 id 变化，避免别的页面的 ?id= 把本页抽屉顶出来。
-->
<template>
  <div class="payexc-page">
    <DcTableShell
      v-model:keyword="keyword"
      storage-key="mall-payexception"
      :cols="cols"
      grid="1.15fr 1.25fr 0.85fr 1.35fr 1fr 1.5fr 1fr 0.55fr"
      q-ph="按订单号精确查询"
      :rows="rows"
      :total="total"
      :loading="loading"
      :filtered="isFiltered"
      :active-filters="activeFilters"
      :row-accent="rowAccent"
      :empty-title="emptyTitle"
      export-file-name="资金差错"
      @search="handleSearch"
      @reset="handleReset"
      @refresh="reload"
      @empty-action="handleReset"
      @row-click="(row: PayException) => openDetail(row.id)"
    >
      <template #banner>
        <div class="goodsspu-dc__banner">
          <div class="goodsspu-dc__banner-grid" />
          <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--1" />
          <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--2" />
          <div class="goodsspu-dc__banner-head">
            <div class="goodsspu-dc__banner-title">差错池</div>
            <div class="goodsspu-dc__banner-sub">
              渠道已确认收款、但订单正常流程入不了账的钱都会落到这里
            </div>
          </div>
        </div>
        <div class="payexc-notice" role="note">
          <svg
            class="payexc-notice__icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16.5v.01" />
          </svg>
          <span>这里只有「钱到了、订单收不了」的差错：取消后才到账、同一订单重复付款、到账金额与订单不符。请到支付渠道商户后台原路退款或核实，处理完回来打开详情点「标记已处理」并写明备注</span>
        </div>
      </template>

      <template #filters>
        <el-select
          v-model="typeFilter"
          class="dc-tbl__select dc-nsel"
          placeholder="全部类型"
          style="width: 190px"
        >
          <el-option value="" label="全部类型" />
          <el-option v-for="t in PAY_EXCEPTION_TYPES" :key="t.value" :value="t.value" :label="t.label" />
        </el-select>
        <el-select
          v-model="statusFilter"
          class="dc-tbl__select dc-nsel"
          placeholder="全部状态"
          style="width: 140px"
        >
          <el-option value="" label="全部状态" />
          <el-option v-for="s in PAY_EXCEPTION_STATUSES" :key="s.value" :value="s.value" :label="s.label" />
        </el-select>
      </template>

      <template #col-createTime="{ row }">
        <span class="payexc-cell payexc-cell--num">{{ formatDateTime(row.createTime) }}</span>
      </template>
      <template #col-type="{ row }">
        <span class="payexc-cell payexc-cell--strong" :title="row.type">{{ payExceptionTypeLabel(row.type) }}</span>
      </template>
      <template #col-status="{ row }">
        <span :class="['goods-dc-status', statusClass(row.status)]">{{ payExceptionStatusLabel(row.status) }}</span>
      </template>
      <template #col-orderNo="{ row }">
        <span class="payexc-cell payexc-cell--mono" :title="row.orderNo || ''">{{ row.orderNo || "—" }}</span>
      </template>
      <template #col-channel="{ row }">
        <span class="payexc-cell">{{ payChannelLabel(row.channel) }}</span>
      </template>
      <template #col-channelTxnId="{ row }">
        <span class="payexc-cell payexc-cell--mono" :title="row.channelTxnId || ''">{{ row.channelTxnId || "—" }}</span>
      </template>
      <template #col-amount="{ row }">
        <span class="payexc-cell payexc-cell--amount">{{ formatMinorAmountWithCurrency(row.amountMinor, row.currency) }}</span>
      </template>
      <template #col-acts="{ row }">
        <div class="dc-tbl__acts">
          <span class="dc-tbl__act" @click.stop="openDetail(row.id)">详情</span>
        </div>
      </template>

      <template #pagination>
        <DcPager
          v-if="rows.length > 0"
          :total="total"
          :current="pageNo"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          @change="onPageChange"
          @size-change="onSizeChange"
        />
      </template>
    </DcTableShell>

    <AppDrawer v-model="detailOpen" size="m" title="差错详情" @closed="detail = null">
      <div v-if="detailLoading" v-loading="true" class="payexc-drawer__loading" />
      <template v-else-if="detail">
        <div class="payexc-drawer__head">
          <span class="payexc-drawer__type">{{ payExceptionTypeLabel(detail.type) }}</span>
          <span :class="['goods-dc-status', statusClass(detail.status)]">{{ payExceptionStatusLabel(detail.status) }}</span>
        </div>
        <div class="payexc-drawer__amount">
          {{ formatMinorAmountWithCurrency(detail.amountMinor, detail.currency) }}
        </div>

        <!-- 唯一动作「标记已处理」（只对「待处理」、只给 mall:orderinfo:edit） -->
        <div v-if="detail.status === 'OPEN' && canHandle" class="payexc-actions">
          <button
            type="button"
            class="odd-dc__btn payexc-actions__btn payexc-actions__btn--primary"
            :disabled="acting"
            @click="onResolve(detail)"
          >
            标记已处理
          </button>
        </div>

        <el-descriptions class="payexc-desc" :column="1" border>
          <el-descriptions-item label="订单号">
            <span class="payexc-mono">{{ detail.orderNo || "—" }}</span>
            <span
              v-if="detail.orderId"
              class="payexc-link"
              @click="goOrder(detail.orderId)"
            >查看订单</span>
          </el-descriptions-item>
          <el-descriptions-item label="入池时间">{{ formatDateTime(detail.createTime) }}</el-descriptions-item>
          <el-descriptions-item label="类型">
            {{ payExceptionTypeLabel(detail.type) }}
            <span class="payexc-code">{{ detail.type }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="渠道">{{ payChannelLabel(detail.channel) }}</el-descriptions-item>
          <el-descriptions-item label="渠道流水号">
            <span class="payexc-mono">{{ detail.channelTxnId || "—" }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="入池上下文">
            <div class="payexc-detail-text">{{ detail.detail || "—" }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="处置结果">{{ payExceptionResolutionLabel(detail.resolution) }}</el-descriptions-item>
          <el-descriptions-item label="处置人">{{ detail.resolvedBy || "—" }}</el-descriptions-item>
          <el-descriptions-item label="处置时间">{{ formatDateTime(detail.resolvedTime) }}</el-descriptions-item>
          <el-descriptions-item label="处置原因">{{ detail.resolveReason || "—" }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(detail.updateTime) }}</el-descriptions-item>
        </el-descriptions>

        <div class="payexc-drawer__section">关联编号</div>
        <el-descriptions class="payexc-desc" :column="1" border>
          <el-descriptions-item label="差错编号"><span class="payexc-mono">{{ detail.id }}</span></el-descriptions-item>
          <el-descriptions-item label="订单 ID"><span class="payexc-mono">{{ detail.orderId || "—" }}</span></el-descriptions-item>
          <el-descriptions-item label="支付单 ID"><span class="payexc-mono">{{ detail.payOrderId || "—" }}</span></el-descriptions-item>
          <el-descriptions-item label="回调日志 ID"><span class="payexc-mono">{{ detail.callbackLogId || "—" }}</span></el-descriptions-item>
          <el-descriptions-item label="去重键"><span class="payexc-mono">{{ detail.dedupeKey || "—" }}</span></el-descriptions-item>
          <el-descriptions-item label="金额（最小单位）">
            <span class="payexc-mono">{{ detail.amountMinor ?? "—" }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="渠道码"><span class="payexc-mono">{{ detail.channel || "—" }}</span></el-descriptions-item>
        </el-descriptions>
      </template>
      <div v-else class="payexc-drawer__empty">{{ detailError || "未找到这条差错记录" }}</div>
    </AppDrawer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import DcPager from "@/components/dc-shell/DcPager.vue";
import DcTableShell from "@/components/dc-shell/DcTableShell.vue";
import { AppDrawer } from "@/components/overlay";
import {
  PAY_EXCEPTION_STATUSES,
  PAY_EXCEPTION_TYPES,
  formatDateTime,
  formatMinorAmountWithCurrency,
  payChannelLabel,
  payExceptionResolutionLabel,
  payExceptionStatusLabel,
  payExceptionStatusTone,
  payExceptionTypeLabel,
} from "@/const/payException";
import {
  getPayException,
  getPayExceptionPage,
  isPayExceptionEndpointMissing,
  resolvePayException,
  type PayException,
} from "@/api/mall/payexception";
import { appConfirm, message } from "@/components/overlay";
import { hasAnyPermission } from "@/utils/permission";
import type { DcActiveFilter, DcTableCol } from "@/components/dc-shell/types";

import "../goods-list-dc.scss";

defineOptions({ name: "MallPayException" });

const route = useRoute();
const router = useRouter();

const cols: DcTableCol[] = [
  { key: "createTime", t: "入池时间", exportValue: (r) => formatDateTime(r.createTime) },
  { key: "type", t: "类型", exportValue: (r) => payExceptionTypeLabel(r.type) },
  { key: "status", t: "状态", exportValue: (r) => payExceptionStatusLabel(r.status) },
  { key: "orderNo", t: "订单号" },
  { key: "channel", t: "渠道", exportValue: (r) => payChannelLabel(r.channel) },
  { key: "channelTxnId", t: "渠道流水" },
  {
    key: "amount",
    t: "金额",
    al: "right",
    exportValue: (r) => formatMinorAmountWithCurrency(r.amountMinor, r.currency),
  },
  { key: "acts", t: "操作", al: "right", hideable: false },
];

// ────────── 筛选（输入态 vs 已生效态：翻页 / 刷新只用已生效的，避免条件静默丢失） ──────────
const keyword = ref("");
const typeFilter = ref("");
const statusFilter = ref("");
const applied = ref({ orderNo: "", type: "", status: "" });

const isFiltered = computed(
  () => !!applied.value.orderNo || !!applied.value.type || !!applied.value.status,
);

const activeFilters = computed<DcActiveFilter[]>(() => {
  const out: DcActiveFilter[] = [];
  if (applied.value.type) {
    out.push({
      key: "type",
      label: `类型: ${payExceptionTypeLabel(applied.value.type)}`,
      onRemove: () => {
        typeFilter.value = "";
        applied.value = { ...applied.value, type: "" };
        pageNo.value = 1;
        reload();
      },
    });
  }
  if (applied.value.status) {
    out.push({
      key: "status",
      label: `状态: ${payExceptionStatusLabel(applied.value.status)}`,
      onRemove: () => {
        statusFilter.value = "";
        applied.value = { ...applied.value, status: "" };
        pageNo.value = 1;
        reload();
      },
    });
  }
  return out;
});

// ────────── 列表 ──────────
const rows = ref<PayException[]>([]);
const total = ref(0);
const pageNo = ref(1);
const pageSize = ref(20);
const loading = ref(false);
/** "" 正常 / unavailable 端点未部署（404，不给重试）/ error 其它失败（工具栏刷新即重试） */
const loadState = ref<"" | "unavailable" | "error">("");

const emptyTitle = computed(() => {
  if (loadState.value === "unavailable") return "暂不可用（差错池尚未在当前环境开放）";
  if (loadState.value === "error") return "加载失败，请点右上角刷新重试";
  return isFiltered.value ? "没有符合条件的差错记录" : "暂无资金差错";
});

async function reload() {
  loading.value = true;
  try {
    const res = await getPayExceptionPage({
      current: pageNo.value,
      size: pageSize.value,
      type: applied.value.type,
      status: applied.value.status,
      orderNo: applied.value.orderNo,
    });
    rows.value = res?.data?.records ?? [];
    total.value = Number(res?.data?.total ?? 0);
    loadState.value = "";
  } catch (e) {
    rows.value = [];
    total.value = 0;
    loadState.value = isPayExceptionEndpointMissing(e) ? "unavailable" : "error";
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  applied.value = {
    orderNo: keyword.value.trim(),
    type: typeFilter.value,
    status: statusFilter.value,
  };
  pageNo.value = 1;
  reload();
}

function handleReset() {
  keyword.value = "";
  typeFilter.value = "";
  statusFilter.value = "";
  applied.value = { orderNo: "", type: "", status: "" };
  pageNo.value = 1;
  reload();
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

/** 状态章：statusDict 的语义色 → goods-dc-status 全局色类（info→muted、primary→brand） */
function statusClass(status: string | null | undefined) {
  const tone = payExceptionStatusTone(status);
  const dc = tone === "info" ? "muted" : tone === "primary" ? "brand" : tone;
  return `goods-dc-status--${dc}`;
}

/** 行左侧强调条只表达一种语义：还没人处理（OPEN） */
const rowAccent = (row: PayException) => (row.status === "OPEN" ? "var(--dc-warning)" : "");

// ────────── 详情抽屉 ──────────
const detailOpen = ref(false);
const detailLoading = ref(false);
const detail = ref<PayException | null>(null);
const detailError = ref("");
let detailSeq = 0;

/** 永远按 id 回源拉一次：列表行可能是几分钟前的快照（状态可能已被别人标记） */
async function openDetail(id: string | null | undefined) {
  if (!id) return;
  const seq = ++detailSeq;
  detail.value = null;
  detailError.value = "";
  detailLoading.value = true;
  detailOpen.value = true;
  try {
    const res = await getPayException(id);
    if (seq !== detailSeq) return;
    detail.value = res?.data ?? null;
  } catch (e) {
    if (seq !== detailSeq) return;
    detailError.value = isPayExceptionEndpointMissing(e)
      ? "暂不可用（差错池尚未在当前环境开放）"
      : "加载失败，请关闭后重试";
  } finally {
    if (seq === detailSeq) detailLoading.value = false;
  }
}

// ────────── 标记已处理 ──────────
/** computed 里读权限：刷新早期 store 未回填时，回填后按钮自动出现 */
const canHandle = computed(() => hasAnyPermission(["mall:orderinfo:edit"]));
const acting = ref(false);

async function askReason(title: string, body: string, verb: string, danger = true): Promise<string> {
  try {
    const r = await appConfirm({
      intent: danger ? "danger" : "confirm",
      title,
      body,
      verb,
      input: { type: "textarea", placeholder: "处理备注（必填，会写进操作日志），例如：已在支付渠道商户后台原路退款，退款单号 xxx", errorText: "请填写处理备注" },
    });
    return (r?.value || "").trim();
  } catch {
    return "";
  }
}

async function runAction(e: PayException, fn: () => Promise<any>, done: (data: any) => string) {
  acting.value = true;
  try {
    const res: any = await fn();
    if (Number(res?.code ?? -1) !== 0) {
      message.error(res?.msg || "处置失败");
      return;
    }
    message.success(done(res?.data));
    await openDetail(e.id);
    reload();
  } catch {
    // 拦截器已提示后端原话（如库存不足、已被处理）
  } finally {
    acting.value = false;
  }
}

async function onResolve(e: PayException) {
  const note = await askReason(
    "标记已处理",
    `这笔 ${formatMinorAmountWithCurrency(e.amountMinor, e.currency)} 已在渠道商户后台处理完（原路退款或核实无需退）？写明怎么处理的，之后不再提醒。`,
    "标记",
    false,
  );
  if (!note) return;
  await runAction(e, () => resolvePayException(e.id, note), () => "已标记为已处理");
}

function goOrder(orderId: string) {
  detailOpen.value = false;
  router.push({ path: "/mall/order/orderinfo", query: { orderId } });
}

// 深链 ?id=<差错 id>：进页即开详情。keep-alive 下只认停在本页时的 query。
const selfPath = route.path;
watch(
  () => (route.path === selfPath ? route.query.id : undefined),
  (id) => {
    const value = Array.isArray(id) ? id[0] : id;
    if (typeof value === "string" && value) openDetail(value);
  },
  { immediate: true },
);

reload();
</script>

<style scoped lang="scss">
.payexc-notice {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 16px;
  margin-bottom: 12px;
  font-size: var(--dc-fs-body, 14px);
  line-height: var(--dc-lh-body, 22px);
  color: var(--dc-warning-text);
  background: var(--dc-warning-soft);
  border: 1px solid var(--dc-warning-border);
  border-radius: var(--dc-radius-lg);
}

.payexc-actions {
  display: flex;
  gap: 8px;
  margin: 12px 0 16px;
}

.payexc-actions__btn--primary {
  color: #fff;
  background: var(--dc-brand, #2456f5);
  border-color: var(--dc-brand, #2456f5);
}

.payexc-notice__icon {
  flex: none;
  margin-top: 3px;
  color: var(--dc-warning);
}

.payexc-cell {
  display: block;
  overflow: hidden;
  font-size: var(--dc-fs-body, 14px);
  color: var(--dc-text-1);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.payexc-cell--strong {
  font-weight: 600;
}

.payexc-cell--num {
  font-variant-numeric: tabular-nums;
}

.payexc-cell--mono,
.payexc-mono {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  word-break: break-all;
}

.payexc-cell--amount {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.payexc-drawer__loading {
  min-height: 240px;
}

.payexc-drawer__head {
  display: flex;
  gap: 8px;
  align-items: center;
}

.payexc-drawer__type {
  font-size: var(--dc-fs-lg, 16px);
  font-weight: 600;
  color: var(--dc-text-1);
}

.payexc-drawer__amount {
  margin: 8px 0 16px;
  font-size: 20px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--dc-text-1);
}

.payexc-drawer__section {
  margin: 20px 0 8px;
  font-size: var(--dc-fs-body, 14px);
  font-weight: 600;
  color: var(--dc-text-1);
}

.payexc-drawer__empty {
  padding: 48px 0;
  font-size: var(--dc-fs-body, 14px);
  color: var(--dc-text-3);
  text-align: center;
}

.payexc-desc :deep(.el-descriptions__label) {
  width: 116px;
  white-space: nowrap;
}

.payexc-code {
  margin-left: 6px;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  color: var(--dc-text-3);
}

.payexc-link {
  margin-left: 10px;
  color: var(--dc-brand);
  white-space: nowrap;
  cursor: pointer;
}

.payexc-detail-text {
  line-height: var(--dc-lh-body, 22px);
  word-break: break-word;
  white-space: pre-wrap;
}
</style>
