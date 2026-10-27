<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
  <div class="execution userinfo-page">
    <!-- ============ 顶部 Banner ============ -->
    <div class="goodsspu-dc__banner">
      <div class="goodsspu-dc__banner-grid" />
      <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--1" />
      <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--2" />
      <div class="goodsspu-dc__banner-head">
        <div class="goodsspu-dc__banner-title">会员列表</div>
        <div class="goodsspu-dc__banner-sub">按渠道查看全部会员，查看资料、订单与收货地址，管理黑名单</div>
      </div>
      <div style="flex: 1" />
      <div class="goodsspu-dc__banner-stats">
        <div class="goodsspu-dc__stat">
          <div class="goodsspu-dc__stat-label">总会员</div>
          <div class="goodsspu-dc__stat-num">{{ stats.countTotal }}</div>
        </div>
        <div class="goodsspu-dc__stat goodsspu-dc__stat--divider">
          <div class="goodsspu-dc__stat-label">今日新增</div>
          <div class="goodsspu-dc__stat-num goodsspu-dc__stat-num--brand">{{ stats.countToday }}</div>
        </div>
        <div class="goodsspu-dc__stat goodsspu-dc__stat--divider">
          <div class="goodsspu-dc__stat-label">本月新增</div>
          <div class="goodsspu-dc__stat-num">{{ stats.countMonth }}</div>
        </div>
      </div>
    </div>

    <div class="goodsspu-dc__card">
      <!-- ============ 渠道 Tab ============ -->
      <div class="goodsspu-dc__tabs">
        <div class="goodsspu-dc__tabs-inner">
          <div
            v-for="(t, i) in channelTabs"
            :key="t.value"
            :ref="(el) => setTabRef(el, i)"
            class="goodsspu-dc__tab"
            :class="{ 'is-active': appType === t.value }"
            @click="handleClickChannel(t.value)"
          >
            {{ t.label }}
          </div>
          <div class="goodsspu-dc__tab-ink" :style="inkStyle" />
        </div>
      </div>

      <!-- ============ 筛选栏 ============ -->
      <div class="goodsspu-dc__filter">
        <div class="goodsspu-dc__filter-item">
          <span class="goodsspu-dc__filter-label">会员</span>
          <input
            v-model="searchForm.keyword"
            class="goodsspu-dc__input"
            placeholder="昵称 / 手机号 / 编码"
            @keyup.enter="handleQuery"
          >
        </div>
        <div class="goodsspu-dc__filter-item">
          <span class="goodsspu-dc__filter-label">状态</span>
          <el-select v-model="searchForm.blackFlag" placeholder="全部" class="goodsspu-dc__select dc-nsel">
            <el-option value="" label="全部" />
            <el-option value="0" label="正常" />
            <el-option value="1" label="已拉黑" />
          </el-select>
        </div>
        <div class="goodsspu-dc__filter-actions">
          <button class="goodsspu-dc__btn goodsspu-dc__btn--primary" @click="handleQuery">查询</button>
          <button class="goodsspu-dc__btn goodsspu-dc__btn--ghost" @click="handleReset">重置</button>
        </div>
      </div>

      <!-- ============ 工具栏 ============ -->
      <div class="goodsspu-dc__toolbar">
        <span class="goodsspu-dc__total">共 <b>{{ page.total }}</b> 位会员</span>
        <div style="flex: 1" />
        <div class="goodsspu-dc__icon-btn" title="刷新" @click="refreshChange">
          <el-icon><Refresh /></el-icon>
        </div>
        <div class="goodsspu-dc__icon-btn" title="列设置" @click="columnPreference?.show()">
          <el-icon><Operation /></el-icon>
        </div>
      </div>

      <!-- ============ CSS grid 自绘表格 ============ -->
      <div class="userinfo-dc__table">
        <div class="userinfo-dc__thead" :style="userGridStyle">
          <div class="userinfo-dc__th">会员</div>
          <div v-if="isUserColumnVisible('phone')" class="userinfo-dc__th">手机号码</div>
          <div v-if="isUserColumnVisible('source')" class="userinfo-dc__th">来源</div>
          <div v-if="isUserColumnVisible('status')" class="userinfo-dc__th">状态</div>
          <div v-if="isUserColumnVisible('createTime')" class="userinfo-dc__th userinfo-dc__th--sort" @click="toggleRegSort">
            注册时间<i :class="regSortArrow" />
          </div>
          <div class="userinfo-dc__th userinfo-dc__th--right">操作</div>
        </div>

        <DcSkeleton v-if="loadingStage === 'skeleton'" />
        <div v-else-if="!tableLoading && tableData.length === 0" class="goodsspu-dc__empty">
          <el-icon class="userinfo-dc__empty-icon"><UserFilled /></el-icon>
          <div class="goodsspu-dc__empty-title">暂无匹配会员</div>
          <div class="goodsspu-dc__empty-desc">试试调整筛选条件</div>
          <span class="goodsspu-dc__empty-cta" @click="handleReset">重置筛选</span>
        </div>

        <template v-else>
          <div v-for="row in tableData" :key="row.id" class="userinfo-dc__tr" :style="userGridStyle">
            <!-- 会员 -->
            <div class="userinfo-dc__member">
              <div class="userinfo-dc__avatar-wrap">
                <div class="userinfo-dc__avatar" :style="{ background: avatarBg(row) }">
                  <el-image
                    v-if="row.headimgUrl"
                    :src="row.headimgUrl"
                    fit="cover"
                    :preview-src-list="[row.headimgUrl]"
                    preview-teleported
                    :hide-on-click-modal="false"
                  >
                    <template #error><span>{{ avatarChar(row) }}</span></template>
                  </el-image>
                  <span v-else>{{ avatarChar(row) }}</span>
                </div>
              </div>
              <div class="userinfo-dc__member-main">
                <div class="userinfo-dc__nick-row">
                  <span class="userinfo-dc__nick" :class="{ 'is-empty': !row.nickName }">{{ displayNick(row) }}</span>
                  <span v-if="!row.nickName" class="userinfo-dc__nick-tag">未设昵称</span>
                </div>
                <div class="userinfo-dc__code">
                  编码 {{ row.userCode || '—' }}
                  <el-icon v-if="row.userCode" class="goodsspu-dc__copy" @click="copyText(String(row.userCode), '编码已复制')"><DocumentCopy /></el-icon>
                </div>
              </div>
            </div>
            <!-- 手机号码 -->
            <div v-if="isUserColumnVisible('phone')" class="userinfo-dc__phone">
              <span class="userinfo-dc__phone-text" :class="{ 'is-empty': !row.phone }">{{ row.phone || '—' }}</span>
            </div>
            <!-- 来源 -->
            <div v-if="isUserColumnVisible('source')" class="userinfo-dc__source">
              <div class="userinfo-dc__source-main">{{ appTypeText(row) }}</div>
              <div class="userinfo-dc__source-geo">{{ geoText(row) }}</div>
            </div>
            <!-- 状态：blackFlag '1' 已拉黑，其余正常 -->
            <div v-if="isUserColumnVisible('status')" class="userinfo-dc__state-cell">
              <span class="userinfo-dc__state" :class="isBlack(row) ? 'is-black' : 'is-normal'">
                {{ isBlack(row) ? '已拉黑' : '正常' }}
              </span>
            </div>
            <!-- 注册时间 -->
            <div v-if="isUserColumnVisible('createTime')" class="userinfo-dc__reg">
              <div class="userinfo-dc__reg-d">{{ regDate(row) }}</div>
              <div class="userinfo-dc__reg-t">{{ regTime(row) }}</div>
            </div>
            <!-- 操作 -->
            <div class="userinfo-dc__action">
              <span v-if="permissions['mall:userinfo:get']" class="goodsspu-dc__link" @click="handleViewMember(row)">详情</span>
              <span v-if="permissions['mall:orderinfo:index']" class="goodsspu-dc__link" @click="handleViewOrders(row)">订单</span>
              <span
                v-if="permissions['mall:userinfo:edit']"
                class="goodsspu-dc__link"
                :class="{ 'userinfo-dc__menu-danger': !isBlack(row) }"
                @click="handleToggleBlack(row)"
              >{{ isBlack(row) ? '恢复' : '拉黑' }}</span>
            </div>
          </div>
        </template>
      </div>

      <!-- ============ 分页 ============ -->
      <div v-if="tableData.length > 0" class="goodsspu-dc__pager">
        <span>共 {{ page.total }} 条</span>
        <el-select
          :model-value="page.pageSize"
          class="dc-pager__size dc-nsel"
          @change="onSizeChange(Number($event))"
        >
          <el-option :value="10" label="10 条/页" />
          <el-option :value="20" label="20 条/页" />
          <el-option :value="50" label="50 条/页" />
        </el-select>
        <span
          class="goodsspu-dc__pager-btn"
          :class="{ 'is-disabled': page.currentPage <= 1 }"
          @click="page.currentPage > 1 && onPageChange(page.currentPage - 1)"
        >‹</span>
        <span
          v-for="(p, i) in pageList"
          :key="i"
          class="goodsspu-dc__pager-num"
          :class="{ 'is-active': p === page.currentPage, 'is-ellipsis': typeof p !== 'number' }"
          @click="typeof p === 'number' && onPageChange(p)"
        >{{ p }}</span>
        <span
          class="goodsspu-dc__pager-btn"
          :class="{ 'is-disabled': page.currentPage >= totalPages }"
          @click="page.currentPage < totalPages && onPageChange(page.currentPage + 1)"
        >›</span>
        <span>前往</span>
        <input v-model="jumpVal" class="goodsspu-dc__pager-jump" @keyup.enter="onJump">
        <span>页</span>
      </div>
    </div>

    <!-- 会员详情侧拉 -->
    <MemberDrawer
      v-model:visible="memberDrawerVisible"
      :user-id="currentMemberId"
      @refresh="refreshChange"
      @view-orders="openOrdersFromDetail"
    />
    <!-- 会员订单侧拉 -->
    <OrderDrawer v-model:visible="orderDrawerVisible" :user-id="currentMemberId" :user-name="currentMemberName" />
    <ColumnPreferenceDialog ref="columnPreference" storage-key="mall:table-columns:userinfo:list:v2" :columns="userColumns" @change="visibleUserColumns = $event" />
  </div>
</template>

<script setup lang="ts">
/**
 * 会员列表：渠道 Tab + 关键字 / 状态筛选 + 自绘 grid 表格 + 自绘分页。
 * 行操作：详情（资料、订单汇总、收货地址）、订单、拉黑 / 恢复。
 * 通用块复用 goods-list-dc.scss 的 goodsspu-dc__*，会员专属类见 user-dc.scss。
 */
import { DcSkeleton, useLoadingStage } from "@/components/dc-states";
import ColumnPreferenceDialog from "@/components/dc-shell/ColumnPreferenceDialog.vue";
import { getPage, getStatistics } from "@/api/mall/userinfo";
import { clientTypes } from "@/const/clientType";
import { usePermissionStoreHook } from "@/store/modules/permission";
import { filterForm } from "@/utils/util";
import { DocumentCopy, Operation, Refresh, UserFilled } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { computed, nextTick, onActivated, onMounted, reactive, ref, watch } from "vue";
import MemberDrawer from "./components/MemberDrawer.vue";
import OrderDrawer from "./components/OrderDrawer.vue";
import { useBlackFlag } from "./components/useBlackFlag";
import { usePagerClamp } from "@/hooks/usePagerClamp";

import "../goods-list-dc.scss";
import "../user-dc.scss";

// 头像 8 色板（按 userCode hash 取色）
const AV = ["#3C6EF0", "#26BF66", "#FF8800", "#0E9CB8", "#7262FD", "#B542D8", "#E8684A", "#17C3B2"];

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
const { stage: loadingStage } = useLoadingStage(tableLoading);
const appType = ref("-1");
const stats = reactive({ countTotal: 0, countToday: 0, countMonth: 0 });

const permissions = usePermissionStoreHook()?.permissions || {};
const columnPreference = ref<InstanceType<typeof ColumnPreferenceDialog>>();
const userColumns = [
  { key: "nickName", label: "会员", required: true },
  { key: "phone", label: "手机号" },
  { key: "source", label: "来源" },
  { key: "status", label: "状态" },
  { key: "createTime", label: "注册时间" },
];
const visibleUserColumns = ref(userColumns.map(column => column.key));
const isUserColumnVisible = (key: string) => visibleUserColumns.value.includes(key);
const userGridStyle = computed(() => ({
  gridTemplateColumns: [
    "minmax(215px, 1.25fr)",
    ...(isUserColumnVisible("phone") ? ["150px"] : []),
    ...(isUserColumnVisible("source") ? ["minmax(150px, 1fr)"] : []),
    ...(isUserColumnVisible("status") ? ["100px"] : []),
    ...(isUserColumnVisible("createTime") ? ["128px"] : []),
    "150px",
  ].join(" "),
}));

const memberDrawerVisible = ref(false);
const orderDrawerVisible = ref(false);
const currentMemberId = ref("");
const currentMemberName = ref("");

// ==================== 渠道 Tab ====================
const channelTabs = computed(() => {
  const arr: { value: string; label: string }[] = [{ value: "-1", label: "全部" }];
  for (const key in clientTypes) {
    arr.push({ value: key, label: (clientTypes as Record<string, string>)[key] });
  }
  return arr;
});
const tabRefs = ref<HTMLElement[]>([]);
function setTabRef(el: any, i: number) {
  if (el) tabRefs.value[i] = el as HTMLElement;
}
const inkStyle = ref({ left: "0px", width: "0px" });
async function updateInk() {
  await nextTick();
  const idx = channelTabs.value.findIndex((x) => x.value === appType.value);
  const el = tabRefs.value[idx];
  if (el) inkStyle.value = { left: `${el.offsetLeft}px`, width: `${el.offsetWidth}px` };
}
function handleClickChannel(val: string) {
  appType.value = val;
  page.currentPage = 1;
  getPageF();
  updateInk();
}
watch([appType, () => page.total], updateInk);

// ==================== 筛选 ====================
const searchForm = reactive({ keyword: "", blackFlag: "" });

// keyWord：后端对昵称 / 手机号 / 编码做模糊匹配
function buildSearchParams() {
  const p: Record<string, any> = {};
  const kw = searchForm.keyword.trim();
  if (kw) p.keyWord = kw;
  if (searchForm.blackFlag) p.blackFlag = searchForm.blackFlag;
  return p;
}
function handleQuery() {
  paramsSearch.value = filterForm(buildSearchParams());
  page.currentPage = 1;
  getPageF();
}
function handleReset() {
  searchForm.keyword = "";
  searchForm.blackFlag = "";
  paramsSearch.value = {};
  page.currentPage = 1;
  getPageF();
}

// ==================== 排序（注册时间，desc ↔ asc） ====================
const regSortOrder = ref<"ascending" | "descending">("descending");
const regSortArrow = computed(() =>
  regSortOrder.value === "ascending" ? "goodsspu-dc__sort-i is-asc" : "goodsspu-dc__sort-i is-desc",
);
function toggleRegSort() {
  regSortOrder.value = regSortOrder.value === "descending" ? "ascending" : "descending";
  page.ascs = regSortOrder.value === "ascending" ? "create_time" : "";
  page.descs = regSortOrder.value === "descending" ? "create_time" : "";
  getPageF();
}

// ==================== 分页 ====================
const totalPages = computed(() => Math.max(1, Math.ceil(page.total / page.pageSize)));
// 页码越界自愈：末页数据变少后不停在空白页
usePagerClamp(
  () => page.total,
  () => page.currentPage,
  () => page.pageSize,
  onPageChange,
);
const pageList = computed<(number | string)[]>(() => {
  const cur = page.currentPage;
  const last = totalPages.value;
  const out: (number | string)[] = [1];
  if (cur > 3) out.push("…");
  for (let i = Math.max(2, cur - 1); i <= Math.min(last - 1, cur + 1); i++) out.push(i);
  if (cur < last - 2) out.push("…");
  if (last > 1) out.push(last);
  return out;
});
const jumpVal = ref("");
function onPageChange(p: number) {
  page.currentPage = p;
  getPageF();
}
function onSizeChange(s: number) {
  page.pageSize = s;
  page.currentPage = 1;
  getPageF();
}
function onJump() {
  const n = parseInt(jumpVal.value, 10);
  if (!Number.isNaN(n) && n >= 1 && n <= totalPages.value) onPageChange(n);
  jumpVal.value = "";
}

// ==================== 数据加载 ====================
function getPageF() {
  tableLoading.value = true;
  getPage(
    filterForm({
      current: page.currentPage,
      size: page.pageSize,
      descs: page.descs,
      ascs: page.ascs,
      appType: appType.value !== "-1" ? appType.value : null,
      ...paramsSearch.value,
    }),
  )
    .then((response) => {
      tableData.value = response.data.records || [];
      page.total = response.data.total;
    })
    .catch(() => {
      // 失败提示由 http 拦截器统一弹出，这里只清空列表
      tableData.value = [];
      page.total = 0;
    })
    .finally(() => {
      tableLoading.value = false;
    });
}
function loadStats() {
  getStatistics()
    .then((res: any) => {
      const d = res?.data || {};
      stats.countTotal = d.countTotal ?? 0;
      stats.countToday = d.countToday ?? 0;
      stats.countMonth = d.countMonth ?? 0;
    })
    .catch(() => {});
}
function refreshChange() {
  getPageF();
}
function refreshAll() {
  getPageF();
  loadStats();
}

// ==================== 行展示辅助 ====================
function avatarBg(row: any) {
  const s = String(row.userCode ?? row.id ?? "");
  let n = 0;
  for (let i = 0; i < s.length; i++) n += s.charCodeAt(i);
  return AV[n % AV.length];
}
function avatarChar(row: any) {
  const s = String(row.nickName || "").trim();
  return s ? s[0] : "客";
}
function displayNick(row: any) {
  return row.nickName || row.phone || "游客";
}
function appTypeText(row: any) {
  return (clientTypes as Record<string, string>)[row.appType] || row.appType || "—";
}
function geoText(row: any) {
  return [row.province, row.city].filter(Boolean).join("·") || "—";
}
function regDate(row: any) {
  return String(row.createTime || "").slice(0, 10) || "—";
}
function regTime(row: any) {
  return String(row.createTime || "").slice(11, 19);
}
function copyText(txt: string, tip = "已复制") {
  if (!txt) return;
  navigator.clipboard?.writeText(txt);
  ElMessage.success(tip);
}

// ==================== 拉黑 / 恢复 ====================
const { isBlack, toggleBlack } = useBlackFlag();
function handleToggleBlack(row: any) {
  toggleBlack(row).catch(() => {});
}

// ==================== 行操作 ====================
function handleViewMember(row: any) {
  currentMemberId.value = row.id;
  currentMemberName.value = row.nickName || String(row.userCode ?? "");
  memberDrawerVisible.value = true;
}
function handleViewOrders(row: any) {
  currentMemberId.value = row.id;
  currentMemberName.value = row.nickName || String(row.userCode ?? "");
  orderDrawerVisible.value = true;
}
function openOrdersFromDetail(name: string) {
  currentMemberName.value = name;
  orderDrawerVisible.value = true;
}

onMounted(updateInk);
onActivated(updateInk);

refreshAll();
</script>

<style>
.userinfo-dc__empty-icon {
  margin-bottom: 8px;
  font-size: 56px;
  color: var(--dc-text-disabled);
}
</style>
