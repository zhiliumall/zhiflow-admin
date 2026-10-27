<template>
  <div class="orderinfo-page goods-dc-page goodsspu-dc">
    <!-- ========== 订单详情抽屉 ========== -->
    <el-drawer v-model="isorderdetails" size="900px" direction="rtl" :with-header="false" :destroy-on-close="true"
      custom-class="no-header-drawer" @close="isorderdetails = false" append-to-body>
      <neworderdetails :infpData="orderdetailsData" @cloneView="cloneView" @reload="reloadDetail" />
    </el-drawer>

    <!-- ========== 页头横幅 ========== -->
    <div class="goodsspu-dc__banner">
      <div class="goodsspu-dc__banner-grid"></div>
      <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--1"></div>
      <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--2"></div>
      <div class="goodsspu-dc__banner-head">
        <div class="goodsspu-dc__banner-title">{{ bannerTitle }}</div>
        <div class="goodsspu-dc__banner-sub">{{ bannerSub }}</div>
      </div>
      <div style="flex: 1"></div>
      <div class="goodsspu-dc__banner-stats">
        <div class="goodsspu-dc__stat">
          <div class="goodsspu-dc__stat-label">{{ bannerStatLabel }}</div>
          <div class="goodsspu-dc__stat-num goodsspu-dc__stat-num--brand">{{ bannerStatValue }}</div>
        </div>
        <!-- 即将超时：距承诺发货截止不足 6 小时的待发货单（口径与卡头倒计时同一套，见 orderCountdown.ts） -->
        <div class="goodsspu-dc__stat goodsspu-dc__stat--divider" :title="soonOverdueTitle">
          <div class="goodsspu-dc__stat-label">即将超时</div>
          <div class="goodsspu-dc__stat-num orderinfo-dc__stat-num--warning">{{ soonOverdueCount }}</div>
        </div>
      </div>
    </div>

    <!-- 插槽：Tab 页签行（由父组件决定是否展示） -->
    <div v-if="$slots.tabs" class="order-top-row goodsspu-dc__card">
      <slot name="tabs" />
    </div>

    <!-- ========== 筛选卡：字段变化即触发查询，搜索按钮只是额外的显式入口 ========== -->
    <div class="orderinfo-dc__filter-card">
      <div class="orderinfo-dc__filter-row">
        <span class="goodsspu-dc__filter-label">订单时间</span>
        <div class="orderinfo-dc__quicks">
          <span v-for="qk in QUICK_RANGES" :key="qk.key" class="orderinfo-dc__quick"
            :class="{ 'is-active': quickRange === qk.key }" @click="toggleQuickRange(qk.key)">{{ qk.label }}</span>
        </div>
        <!-- format 只改显示（去掉秒），value-format 不动 —— 提交给后端的仍是含秒的完整时间 -->
        <el-date-picker v-model="dateRange" class="orderinfo-dc__range" type="datetimerange"
          value-format="YYYY-MM-DD HH:mm:ss" format="YYYY-MM-DD HH:mm"
          :start-placeholder="$t('mall.orderinfo.startDate')" :end-placeholder="$t('mall.orderinfo.endDate')"
          range-separator="-" clearable @change="onDateRangeChange" />
        <span class="goodsspu-dc__filter-label">订单单号</span>
        <el-input v-model="filterOrderNo" placeholder="请输入" clearable style="width: 170px"
          @keyup.enter="applyFilters" @clear="applyFilters" />
        <span class="goodsspu-dc__filter-label">来源类型</span>
        <el-select v-model="filterAppType" placeholder="请选择" clearable style="width: 120px" @change="applyFilters">
          <el-option v-for="op in appTypeOptions" :key="op.value" :label="op.label" :value="op.value" />
        </el-select>
        <button class="orderinfo-dc__fbtn orderinfo-dc__fbtn--primary" @click="applyFilters">搜索</button>
        <button class="orderinfo-dc__fbtn" @click="onCustomReset">重置</button>
        <span class="goodsspu-dc__filter-more" @click="searchExpanded = !searchExpanded">{{ searchExpanded ? '收起筛选 ▴'
          : '更多筛选 ▾' }}</span>
        <div class="orderinfo-dc__filter-tools">
          <button class="orderinfo-dc__fbtn" title="按当前筛选条件导出（单次最多 1 万单）" :disabled="exporting"
            @click.stop="onExport">{{ exporting ? '导出中…' : $t("mall.orderinfo.exportOrders") }}</button>
          <button v-if="canEdit" class="orderinfo-dc__fbtn" title="上传 Excel 批量发货"
            @click="batchDeliveryVisible = true">批量发货</button>
          <button class="orderinfo-dc__fbtn" title="刷新列表" @click="refreshChange">刷新</button>
        </div>
      </div>

      <!-- 更多筛选（展开）：是否支付 / 支付方式 / 订单ID -->
      <div v-show="searchExpanded" class="orderinfo-dc__filter-row orderinfo-dc__filter-row--more">
        <span class="goodsspu-dc__filter-label">是否支付</span>
        <el-select v-model="filterIsPay" placeholder="请选择" clearable style="width: 120px" @change="applyFilters">
          <el-option label="是" value="1" />
          <el-option label="否" value="0" />
        </el-select>
        <span class="goodsspu-dc__filter-label">支付方式</span>
        <el-select v-model="filterPaymentType" placeholder="请选择" clearable style="width: 120px" @change="applyFilters">
          <el-option v-for="op in paymentTypeOptions" :key="op.value" :label="op.label" :value="op.value" />
        </el-select>
        <span class="goodsspu-dc__filter-label">订单ID</span>
        <el-input v-model="filterOrderId" placeholder="请输入" clearable style="width: 180px" @keyup.enter="applyFilters"
          @clear="applyFilters" />
      </div>

      <!-- 已选条件回显（仅快捷时间：手填的日期区间由日期控件本身回显，不重复堆 chip） -->
      <div v-if="quickRangeLabel" class="orderinfo-dc__filter-recap">
        <span class="orderinfo-dc__filter-recap-label">已选条件</span>
        <span class="orderinfo-dc__filter-recap-chip" title="点击移除" @click="clearQuickRange">时间:{{ quickRangeLabel
          }}<i>×</i></span>
      </div>
    </div>

    <!-- 宽网格只在列表内横滚，表头与订单卡保持同一滚动位置。 -->
    <div v-if="loadingStage === 'skeleton' || tableLoading || tableData.length > 0"
      class="orderinfo-dc__table-scroll" tabindex="0" role="region" aria-label="订单列表，可横向滚动">
      <div class="orderinfo-dc__table">
        <!-- ========== 统一表头（与订单卡商品网格同列） ========== -->
        <div class="orderinfo-dc__thead">
          <input type="checkbox" class="orderinfo-dc__checkbox orderinfo-dc__thead-check" :checked="allChecked"
            :indeterminate="someChecked" title="全选本页"
            @change="toggleAll(($event.target as HTMLInputElement).checked)">
          <span>商品信息</span>
          <span class="orderinfo-dc__th--right">单价·数量</span>
          <span class="orderinfo-dc__th--right">实付金额</span>
          <span>买家信息</span>
          <span>支付方式</span>
          <span class="orderinfo-dc__th--center">状态</span>
          <span class="orderinfo-dc__th--right">操作</span>
        </div>

        <DcSkeleton v-if="loadingStage === 'skeleton'" />
        <div v-else class="orderinfo-dc__list" :class="{ 'is-loading': tableLoading }">
          <OrderExpandContent v-for="row in tableData" :key="row.id" :row="row" :checked="isRowChecked(row)" :now="now"
            :shipping="shippingOrderId === row.id" @toggle-select="toggleRow" @detail="openView" @mark="setremark"
            @delivery="openDelivery" @editAddress="onmodifyaddress" @cancel="orderCancelF" />
        </div>
      </div>
    </div>
    <DcEmpty v-else title="暂无订单" description="有新订单时将在此展示" :absolute="false" />

    <!-- ========== 自绘分页 ========== -->
    <div v-if="tableData.length > 0" class="goodsspu-dc__pager">
      <span>共 {{ page.total }} 单</span>
      <el-select :model-value="page.pageSize" class="dc-pager__size dc-nsel"
        @change="onSizeChange(Number($event))">
        <el-option :value="10" label="10 条/页" />
        <el-option :value="20" label="20 条/页" />
        <el-option :value="50" label="50 条/页" />
        <el-option :value="100" label="100 条/页" />
      </el-select>
      <span class="goodsspu-dc__pager-btn" :class="{ 'is-disabled': page.currentPage <= 1 }"
        @click="page.currentPage > 1 && onPageChange(page.currentPage - 1)">‹</span>
      <span v-for="(p, i) in pageList" :key="i" class="goodsspu-dc__pager-num"
        :class="{ 'is-active': p === page.currentPage, 'is-ellipsis': typeof p !== 'number' }"
        @click="typeof p === 'number' && onPageChange(p)">{{ p }}</span>
      <span class="goodsspu-dc__pager-btn" :class="{ 'is-disabled': page.currentPage >= totalPages }"
        @click="page.currentPage < totalPages && onPageChange(page.currentPage + 1)">›</span>
      <span>跳至</span>
      <input v-model="jumpVal" class="orderinfo-dc__pager-jump" @keyup.enter="onJump">
      <span>页</span>
    </div>

    <!-- ========== 批量操作浮条 ========== -->
    <Transition name="orderinfo-dc__batch">
      <div v-if="selectedCount > 0" class="orderinfo-dc__batch-bar">
        <span class="orderinfo-dc__batch-count">已选 <b>{{ selectedCount }}</b> 单</span>
        <button class="orderinfo-dc__batch-btn orderinfo-dc__batch-btn--outline" @click="openBatchRemark">批量备注</button>
        <span class="orderinfo-dc__batch-clear" @click="clearSelection">清除选择</span>
      </div>
    </Transition>

    <!-- ========== 发货抽屉 ========== -->
    <OrderDeliveryDrawer v-model="deliveryVisible" :order="deliveryOrder"
      @busy="(busy: boolean) => (shippingOrderId = busy ? deliveryOrder?.id ?? '' : '')" @done="loadPage()" />

    <!-- ========== Excel 批量发货 ========== -->
    <OrderBatchDelivery v-model="batchDeliveryVisible" @done="loadPage()" />

    <!-- ========== 订单备注弹窗（批量备注复用同一弹窗） ========== -->
    <el-dialog v-model="remarkdialogVisible" :title="batchRemarkMode ? `批量备注（${selectedRows.length}）` : '备注'"
      width="560px" append-to-body>
      <el-input v-model="remarktext" :autosize="{ minRows: 2, maxRows: 4 }" type="textarea" maxlength="500"
        placeholder="请输入订单备注消息" />
      <template #footer>
        <div class="dialog-footer"><el-button @click="remarkdialogVisible = false">取消</el-button><el-button
            type="primary" :loading="remarking" @click="onremarkdialogVisible">保存</el-button></div>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
/**
 * 订单列表共享组件（订单卡列表）
 *
 * Props:
 *   defaultStatus   - 默认筛选的订单状态，'-1' 表示全部（商城订单页），'1' 表示待发货（待发货订单页）
 *   orderId         - 可选的订单 ID，用于自动打开详情
 *
 * Slots:
 *   tabs - Tab 页签区域（商城订单页传入，待发货页不传）
 */
import {
  exportOrders,
  getBulkOrderCount,
  getObj,
  getPage,
  orderCancel,
  putaddress,
  putremark,
  putRemarkBatch,
  saveDownload,
} from "@/api/mall/orderinfo";
import neworderdetails from "@/components/neworderdetails/neworderdetails.vue";
import OrderDeliveryDrawer from "@/components/neworderdetails/OrderDeliveryDrawer.vue";
import { clientTypesOrder } from "@/const/clientType";
import { hasAnyPermission } from "@/utils/permission";
import { filterForm } from "@/utils/util";
import { ElMessage } from "element-plus";
import { computed, getCurrentInstance, onActivated, onDeactivated, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { onBeforeRouteLeave, useRoute } from "vue-router";
import OrderExpandContent from "./OrderExpandContent.vue";
import OrderBatchDelivery from "./components/OrderBatchDelivery.vue";
import {
  PROMISE_DELIVERY_HOURS,
  SHIP_SOON_OVERDUE_HOURS,
  isShipOverdue,
  isShipSoonOverdue,
  orderNeedsCountdown,
} from "./orderCountdown";
import "../goods-dc.scss";
import "../goods-list-dc.scss";
import "../order-dc.scss";
import "../orderinfo-dc.scss";
import { DcEmpty, DcSkeleton, useLoadingStage } from "@/components/dc-states";
import { usePagerClamp } from "@/hooks/usePagerClamp";

// ==================== Props ====================
const props = withDefaults(defineProps<{
  /** 默认筛选状态：'-1'=全部, '1'=待发货 */
  defaultStatus?: string
  /** 路由传入的订单 ID，自动打开详情 */
  orderId?: string
}>(), {
  defaultStatus: '-1',
});

// ==================== 实例引用 ====================
const route = useRoute();
const proxy = getCurrentInstance()?.proxy as any;
const isorderdetails = ref(false);
/** 「更多筛选」默认收起 */
const searchExpanded = ref(false);
/** 发货 / 批量发货 / 备注 / 改地址 / 取消都要 mall:orderinfo:edit（与后端同一个码，这里只管可见性） */
const canEdit = computed(() => hasAnyPermission(["mall:orderinfo:edit"]));

// ==================== 订单状态 ====================
/** 当前选中的 tab 状态值，受外部/内部共同驱动 */
const status = ref<string>(props.defaultStatus);

/** Tab 各状态的计数 */
const status0 = ref(0);
const status1 = ref(0);
const status2 = ref(0);

/** 外部调用此方法来切换状态（如商城订单页的 tabs 点击时调用） */
function setStatus(val: string) {
  status.value = val;
  page.currentPage = 1;
  loadPage();
}

// ==================== 时间选择器 + 快捷时间 chip ====================
const dateRange = ref<any[]>([]);

/** 快捷时间 chip（今天 / 近7天 / 近30天）。days = 起始日相对今天往前推的天数 */
const QUICK_RANGES = [
  { key: 'today', label: '今天', days: 0 },
  { key: 'd7', label: '近7天', days: 6 },
  { key: 'd30', label: '近30天', days: 29 },
];
const quickRange = ref<string>('');
const quickRangeLabel = computed(() => QUICK_RANGES.find(q => q.key === quickRange.value)?.label ?? '');

/** 与 el-date-picker 的 value-format 对齐的 'YYYY-MM-DD HH:mm:ss' 字面量 */
function dayBoundary(offsetDays: number, endOfDay: boolean): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${endOfDay ? '23:59:59' : '00:00:00'}`;
}

function toggleQuickRange(key: string) {
  if (quickRange.value === key) { clearQuickRange(); return; }
  const def = QUICK_RANGES.find(q => q.key === key);
  if (!def) return;
  quickRange.value = key;
  dateRange.value = [dayBoundary(def.days, false), dayBoundary(0, true)];
  applyFilters();
}

function clearQuickRange() {
  quickRange.value = '';
  dateRange.value = [];
  applyFilters();
}

/** 手动改日期即脱离快捷 chip，避免 chip 高亮与实际区间不一致 */
function onDateRangeChange() {
  quickRange.value = '';
  applyFilters();
}

// ==================== 筛选条件（变量名后的注释即后端查询参数名） ====================
const filterOrderNo = ref<string>('')      // 订单单号 → orderNo
const filterIsPay = ref<string>('')        // 是否支付 → isPay
const filterOrderId = ref<string>('')      // 订单ID   → id
const filterPaymentType = ref<string>('')  // 支付方式 → paymentType
const filterAppType = ref<string>('')      // 来源类型 → appType

const paymentTypeOptions = [
  { label: proxy.$t("mall.orderinfo.paymentType1"), value: "1" },
  { label: proxy.$t("mall.orderinfo.paymentType2"), value: "2" },
];
const appTypeOptions = Object.entries(clientTypesOrder).map(([value, label]) => ({ label, value }));

/** 把筛选控件 + 状态 + 时间拼成后端查询参数（列表与导出共用，空值一律不下发） */
function buildQuery(): Record<string, any> {
  const params: Record<string, any> = {
    status: status.value !== "-1" ? status.value : null,
    orderNo: filterOrderNo.value.trim(),
    isPay: filterIsPay.value,
    id: filterOrderId.value.trim() || props.orderId || "",
    paymentType: filterPaymentType.value,
    appType: filterAppType.value,
  };
  if (dateRange.value && dateRange.value.length === 2) {
    params.beginTime = dateRange.value[0];
    params.endTime = dateRange.value[1];
  }
  Object.keys(params).forEach(k => {
    if (params[k] === '' || params[k] === undefined || params[k] === null) delete params[k];
  });
  return params;
}

/** 任一筛选控件变化 / 点「搜索」：都是「立即基于当前条件查一次」 */
function applyFilters() {
  page.currentPage = 1;
  loadPage();
}

// ==================== 分页状态 ====================
const page = reactive({ total: 0, currentPage: 1, pageSize: 20 });
const tableLoading = ref(false);
const tableData = ref<any[]>([]);
// 加载反馈分级（>1s 显示骨架屏）
const { stage: loadingStage } = useLoadingStage(tableLoading);

// ==================== 卡片头倒计时的时间基准 ====================
// 全页只有一个 setInterval，`now` 以 prop 下发给每张订单卡；
// 当前页没有需要倒计时的订单时不起 timer，避免整页每秒白重渲染一次。
const now = ref(Date.now());
let nowTimer: ReturnType<typeof setInterval> | null = null;
function stopNowTimer() {
  if (nowTimer) { clearInterval(nowTimer); nowTimer = null; }
}
function syncNowTimer() {
  const need = tableData.value.some(orderNeedsCountdown);
  if (!need) { stopNowTimer(); return; }
  if (nowTimer) return;
  now.value = Date.now();
  nowTimer = setInterval(() => { now.value = Date.now(); }, 1000);
}

// ==================== 批量选择（范围限当前页；翻页/刷新后清空） ====================
const selectedIds = ref(new Set<string>());
function isRowChecked(row: any) { return selectedIds.value.has(row.id); }
function toggleRow(row: any, checked: boolean) {
  if (checked) selectedIds.value.add(row.id);
  else selectedIds.value.delete(row.id);
}
const allChecked = computed(() => tableData.value.length > 0 && tableData.value.every(r => selectedIds.value.has(r.id)));
const someChecked = computed(() => selectedIds.value.size > 0 && !allChecked.value);
function toggleAll(checked: boolean) {
  if (checked) tableData.value.forEach(r => selectedIds.value.add(r.id));
  else tableData.value.forEach(r => selectedIds.value.delete(r.id));
}
function clearSelection() { selectedIds.value.clear(); }
const selectedCount = computed(() => selectedIds.value.size);
const selectedRows = computed(() => tableData.value.filter(r => selectedIds.value.has(r.id)));

// ==================== 页头横幅 ====================
/** 待发货作业台视图（待发货订单页传 defaultStatus='1'） */
const isPendingView = computed(() => props.defaultStatus === "1");
const bannerTitle = computed(() => (isPendingView.value ? "待发货订单" : "订单管理"));
const bannerSub = computed(() => (isPendingView.value ? "发货作业台 · 单个发货与 Excel 批量发货" : "状态跟踪 · 发货 · 导出"));
const bannerStatLabel = computed(() => (isPendingView.value ? "待发货" : "待处理订单"));
/** 待处理 = 待付款 + 待发货；待发货视图直接用当前 total */
const bannerStatValue = computed(() => {
  if (isPendingView.value) return page.total;
  return status0.value + status1.value;
});

/**
 * 即将超时：当前页内「距承诺发货截止不足 6 小时、且尚未超时」的待发货单数。
 * 判定复用卡头倒计时那套口径（orderCountdown.ts），`now` 是卡头倒计时的时间基准，所以这个数字会自己往上走。
 * 页级统计，已超时的单单独计数、只写进 title。
 */
const soonOverdueCount = computed(
  () => tableData.value.filter((row) => isShipSoonOverdue(row, now.value)).length,
);
const shipOverdueCount = computed(
  () => tableData.value.filter((row) => isShipOverdue(row, now.value)).length,
);
const soonOverdueTitle = computed(() => {
  const base = `当前页内距承诺发货截止不足 ${SHIP_SOON_OVERDUE_HOURS} 小时的待发货单（承诺发货 = 付款后 ${PROMISE_DELIVERY_HOURS} 小时）`;
  const extra = shipOverdueCount.value ? `；另有 ${shipOverdueCount.value} 单已超承诺发货时限` : "";
  return `${base}${extra} · 页级统计，非全量`;
});

// ==================== 数据加载 ====================
function loadPage() {
  tableLoading.value = true;
  const params: Record<string, any> = {
    current: page.currentPage,
    size: page.pageSize,
    descs: "create_time",
    ...buildQuery(),
  };
  return getPage(filterForm(params))
    .then((response: any) => {
      tableLoading.value = false;
      tableData.value = response.data.records || [];
      // 翻页/筛选/刷新后旧的选中 id 不再对应当前视图里的行，一律清空
      clearSelection();
      page.total = response.data.total ?? 0;
      page.currentPage = response.data.current ?? page.currentPage;
      page.pageSize = response.data.size ?? page.pageSize;
      syncNowTimer();
      loadTabCounts();
    })
    .catch(() => { tableLoading.value = false; });
}

function loadTabCounts() {
  getBulkOrderCount({})
    .then((response: any) => {
      if (response.code === 0 && response.data) {
        status0.value = response.data["0"] || 0;
        status1.value = response.data["1"] || 0;
        status2.value = response.data["2"] || 0;
      }
    })
    .catch(() => { });
}

function onPageChange(currentPage: number) { page.currentPage = currentPage; loadPage(); }
function onSizeChange(pageSize: number) { page.pageSize = pageSize; page.currentPage = 1; loadPage(); }

// ==================== 自绘分页辅助 ====================
const totalPages = computed(() => Math.max(1, Math.ceil(page.total / page.pageSize)));
// 页码越界自愈：末页删掉最后一行 / 筛窄结果后，别停在空白页配着「共 N 条」
usePagerClamp(
  () => page.total,
  () => page.currentPage,
  () => page.pageSize,
  onPageChange,
);
const pageList = computed<(number | string)[]>(() => {
  const cur = page.currentPage;
  const last = totalPages.value;
  const out: (number | string)[] = [];
  out.push(1);
  if (cur > 3) out.push("…");
  for (let i = Math.max(2, cur - 1); i <= Math.min(last - 1, cur + 1); i++) out.push(i);
  if (cur < last - 2) out.push("…");
  if (last > 1) out.push(last);
  return out;
});
const jumpVal = ref("");
function onJump() {
  const n = parseInt(jumpVal.value, 10);
  if (!Number.isNaN(n) && n >= 1 && n <= totalPages.value) onPageChange(n);
  jumpVal.value = "";
}

// ==================== 重置 / 刷新 ====================
/** 重置：日期 + 快捷 chip + 全部筛选控件一起清干净 */
function onCustomReset() {
  dateRange.value = [];
  quickRange.value = '';
  filterOrderNo.value = '';
  filterIsPay.value = '';
  filterOrderId.value = '';
  filterPaymentType.value = '';
  filterAppType.value = '';
  page.currentPage = 1;
  loadPage();
}
function refreshChange() { loadPage(); }

// ==================== 导出（后端按当前筛选条件生成 Excel） ====================
const exporting = ref(false);
async function onExport() {
  if (exporting.value) return;
  exporting.value = true;
  try {
    const res = await exportOrders(buildQuery());
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    await saveDownload(res, `订单导出_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}.xlsx`);
  } catch {
    // 拦截器已提示
  } finally {
    exporting.value = false;
  }
}

// ==================== 订单详情 ====================
const orderdetailsData = ref<any>({});
/**
 * `GET /mall/orderinfo/{id}` 返回 { orderInfo, logistic, machineState, actions }：
 * 订单字段合进行对象，物流单挂到 logistic，machineState 交给详情面板决定是否出「人工处理」。
 */
function mergeOrderDetail(row: any, response: any) {
  const data = response?.data || {};
  Object.assign(row, data.orderInfo || {});
  row.logistic = data.logistic ?? null;
  row.machineState = data.machineState ?? null;
  return row;
}
function openView(row: any) {
  tableLoading.value = true;
  getObj(row.id)
    .then((response: any) => {
      mergeOrderDetail(row, response);
      isorderdetails.value = true;
      orderdetailsData.value = row;
      tableLoading.value = false;
    })
    .catch(() => { tableLoading.value = false; });
}
const cloneView = () => { isorderdetails.value = false; };

/** 详情面板里做完会改订单的操作（发货、人工处理、改地址）后：重拉当前详情，并刷新列表与页签计数 */
function reloadDetail() {
  const row = orderdetailsData.value;
  if (row?.id) {
    getObj(row.id)
      .then((response: any) => { mergeOrderDetail(row, response); })
      .catch(() => { /* 拦截器已提示；详情保持旧数据，列表下面照样刷新 */ });
  }
  loadPage();
}

// 监听路由 orderId 参数自动打开详情
watch(() => route.query.orderId as string, (orderId) => {
  if (!orderId) return;
  getObj(orderId).then((response: any) => {
    const row = mergeOrderDetail({ id: orderId }, response);
    isorderdetails.value = true; orderdetailsData.value = row;
  }).catch(() => { proxy.$message.error("订单不存在或已删除"); });
}, { immediate: true });
onBeforeRouteLeave(() => { isorderdetails.value = false; });

// ==================== 发货 ====================
const deliveryVisible = ref(false);
const deliveryOrder = ref<any>(null);
/** 正在提交发货的订单 id，订单卡主按钮据此切「发货中」 */
const shippingOrderId = ref<string>("");
const batchDeliveryVisible = ref(false);

function openDelivery(row: any) {
  deliveryOrder.value = row;
  deliveryVisible.value = true;
}

// ==================== 取消订单（订单卡上已做锚定二次确认） ====================
function orderCancelF(row: any) {
  orderCancel(row.id)
    .then(() => { proxy.$message.success(proxy.$t("mall.orderinfo.cancelSuccess")); loadPage(); })
    .catch(() => { });
}

// ==================== 修改地址 ====================
function onmodifyaddress(row: any, data: { recName: string; recTel: string; recAddress: string }, done: () => void) {
  putaddress({ id: row.id, ...data })
    .then(() => { ElMessage.success("操作成功"); loadPage(); done(); })
    .catch(() => done());
}

// ==================== 备注（批量备注复用同一弹窗） ====================
const remarktext = ref("");
let remarkRowId = "";
const remarkdialogVisible = ref(false);
const batchRemarkMode = ref(false);
const remarking = ref(false);
function setremark(row: any) {
  batchRemarkMode.value = false;
  remarkRowId = row.id;
  remarktext.value = row.remark || "";
  remarkdialogVisible.value = true;
}
function openBatchRemark() {
  if (!selectedRows.value.length) return;
  if (selectedRows.value.length > 100) { ElMessage.warning("每次最多为 100 单批量备注"); return; }
  batchRemarkMode.value = true;
  remarktext.value = "";
  remarkdialogVisible.value = true;
}
function onremarkdialogVisible() {
  const remark = remarktext.value?.trim();
  if (!remark) { ElMessage.warning("请输入订单备注消息"); return; }
  remarking.value = true;
  const req = batchRemarkMode.value
    ? putRemarkBatch({ orderIds: selectedRows.value.map(r => String(r.id)), remark })
    : putremark({ id: remarkRowId, remark });
  req
    .then(() => {
      remarkdialogVisible.value = false;
      if (batchRemarkMode.value) clearSelection();
      batchRemarkMode.value = false;
      ElMessage.success("操作成功");
      loadPage();
    })
    .catch(() => { })
    .finally(() => { remarking.value = false; });
}

// ==================== 初始化加载 ====================
onMounted(() => loadPage())

// 倒计时定时器的生命周期：卸载必清；keep-alive 缓存态也停掉，回到页面再按当前数据重建
onUnmounted(stopNowTimer)
onDeactivated(stopNowTimer)
onActivated(syncNowTimer)

// ==================== 暴露方法给父组件 ====================
defineExpose({
  setStatus,
  status0,
  status1,
  status2,
  page,
});
</script>

<style scoped lang="scss">
/* 订单卡结构样式在 ../orderinfo-dc.scss */

.orderinfo-page {
  position: relative;
}

.order-top-row {
  position: sticky;
  top: 0;
  z-index: 1000;
  margin-top: 12px;
  background-color: var(--dc-surface);
}
</style>
<style lang="scss">
.no-header-drawer .el-drawer__body {
  padding-top: 0 !important;
  overflow: hidden auto !important;
}

.no-header-drawer .el-drawer__header {
  display: none !important;
}

.no-header-drawer .el-scrollbar__wrap {
  overflow: hidden auto !important;
}
</style>
