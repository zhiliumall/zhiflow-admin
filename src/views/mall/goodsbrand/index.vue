<!--
  Copyright (C) 2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
  <div class="goodsbrand-dc">
    <!-- ============ 页头 ============ -->
    <div class="goodsspu-dc__banner">
      <div class="goodsspu-dc__banner-grid" />
      <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--1" />
      <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--2" />
      <div class="goodsspu-dc__banner-head">
        <div class="goodsspu-dc__banner-title">商品品牌</div>
        <div class="goodsspu-dc__banner-sub">品牌用于商品归类，可在商品列表按品牌筛选</div>
      </div>
      <div style="flex: 1" />
      <div class="gbrand-dc__banner-art" aria-hidden="true">
        <span class="gbrand-dc__art-ribbon">
          <svg width="44" height="50" viewBox="0 0 26 30" fill="none">
            <path d="M4 2h18v20l-9 6-9-6z" fill="#EBF0FF" stroke="#3C6EF0" stroke-width="1.4" stroke-linejoin="round" />
            <path d="M9 12h8M9 17h5" stroke="#9DB6F8" stroke-width="1.3" stroke-linecap="round" />
          </svg>
        </span>
        <span class="gbrand-dc__art-check">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" fill="#FFF7E6" stroke="#FA8C16" stroke-width="1.4" />
            <path d="M8 12.5 11 15.5 16 9.5" stroke="#FA8C16" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="gbrand-dc__art-dot-a" />
        <span class="gbrand-dc__art-dot-b" />
      </div>
    </div>

    <div class="goodsbrand-dc__card">
      <!-- ============ 工具栏 ============ -->
      <div class="goodsbrand-dc__toolbar">
        <button
          v-if="permissionList.addBtn"
          class="goodsbrand-dc__new"
          @click="openAdd"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>新建品牌
        </button>

        <!-- 批量启停用（真实：Promise.all putObj 循环现有端点） -->
        <div v-if="permissionList.editBtn" class="goodsbrand-dc__bulk">
          <button
            class="goodsbrand-dc__bulk-btn"
            :class="{ 'is-disabled': selectedIds.size === 0 || bulkRunning }"
            @click.stop="toggleBulkMenu"
          >
            批量启停用{{ selectedIds.size ? `（${selectedIds.size}）` : '' }}<span style="font-size: 12px">▾</span>
          </button>
          <div v-if="bulkMenuOpen" class="goodsbrand-dc__bulk-menu" @click.stop>
            <div class="goodsbrand-dc__bulk-item" @click="bulkSetEnable('1')">
              <i style="background:var(--dc-brand)" />批量启用
            </div>
            <div class="goodsbrand-dc__bulk-item" @click="bulkSetEnable('0')">
              <i style="background:var(--dc-text-disabled)" />批量停用
            </div>
          </div>
        </div>

        <div class="goodsbrand-dc__spacer" />

        <!-- 搜索：按品牌名称 -->
        <div class="goodsbrand-dc__search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8A93A3" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input
            v-model="searchForm.keyword"
            placeholder="品牌名称"
            @keyup.enter="handleQuery"
          >
        </div>
        <!-- 状态筛选：enable 为后端字段 -->
        <el-select placeholder="全部状态" v-model="searchForm.enable" class="goodsbrand-dc__select dc-nsel" @change="handleQuery">
          <el-option value="" label="全部状态" />
          <el-option value="1" label="启用" />
          <el-option value="0" label="停用" />
        </el-select>

        <div class="goodsspu-dc__icon-btn" title="列设置" @click="brandColumnPreference?.show()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v14H4zM9 5v14M15 5v14M4 12h16" /></svg>
        </div>
        <div class="goodsspu-dc__icon-btn" title="刷新" @click="refreshChange">
          <el-icon><Refresh /></el-icon>
        </div>
        <!-- 卡片 / 表格视图切换（纯前端展示态） -->
        <div class="goodsbrand-dc__vswitch">
          <span
            class="goodsbrand-dc__vbtn"
            :class="{ 'is-active': view === 'card' }"
            title="卡片视图"
            @click="view = 'card'"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
          </span>
          <span
            class="goodsbrand-dc__vbtn"
            :class="{ 'is-active': view === 'table' }"
            title="表格视图"
            @click="view = 'table'"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </span>
        </div>
      </div>

      <!-- ============ 卡片墙视图 ============ -->
      <div v-if="view === 'card'">
        <DcSkeleton v-if="loadingStage === 'skeleton'" />
        <div v-else-if="!tableLoading && tableData.length === 0" class="goodsspu-dc__empty">
          <DcEmptyImage :src="emptyImg" alt="品牌空状态插画" />
          <div class="goodsspu-dc__empty-title">{{ emptyTitle }}</div>
          <button
            v-if="isEmptyAll && permissionList.addBtn"
            class="goodsspu-dc__btn goodsspu-dc__btn--primary"
            style="margin-top:12px"
            @click="openAdd"
          >＋ 新建第一个品牌</button>
        </div>
        <div v-else class="goodsbrand-dc__wall">
          <div
            v-for="row in tableData"
            :key="row.id"
            class="goodsbrand-dc__bcard"
            :class="{ 'is-flash': flashId === row.id }"
          >
            <span class="goodsbrand-dc__bcard-ck" @click.stop="toggleRow(row)">
              <span class="goodsbrand-dc__ck" :class="{ 'is-on': isChecked(row) }">{{ isChecked(row) ? '✓' : '' }}</span>
            </span>
            <div class="goodsbrand-dc__bcard-logo" v-if="isBrandColumnVisible('logo')" @click="openEdit(row)">
              <img v-if="row.picUrl" :src="row.picUrl" :alt="row.brandName">
              <span v-else class="goodsbrand-dc__bcard-tile">{{ tileText(row) }}</span>
            </div>
            <div class="goodsbrand-dc__bcard-body" @click="openEdit(row)">
              <div class="goodsbrand-dc__bcard-name" :class="{ 'is-off': row.enable !== '1' }">
                {{ row.brandName || '—' }}
                <span v-if="isBrandColumnVisible('status') && row.enable !== '1'" class="goodsbrand-dc__off-tag">已停用</span>
              </div>
            </div>
            <div class="goodsbrand-dc__bcard-foot">
              <span class="goodsbrand-dc__muted">品牌</span>
              <div class="goodsbrand-dc__spacer" />
              <span class="goodsbrand-dc__bcard-ops">
                <span
                  v-if="permissionList.editBtn"
                  class="goodsbrand-dc__bcard-op"
                  title="编辑"
                  @click.stop="openEdit(row)"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16" /><path d="M6 15 15.5 5.5a2.1 2.1 0 0 1 3 3L9 18l-4 1z" /></svg>
                </span>
                <span
                  v-if="permissionList.delBtn"
                  class="goodsbrand-dc__bcard-op goodsbrand-dc__bcard-op--del"
                  title="删除"
                  @click.stop="handleDel(row)"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6.5h16M9.5 6V4.5h5V6M7 6.5l1 13h8l1-13M10 10v6M14 10v6" /></svg>
                </span>
              </span>
              <span
                class="goodsbrand-dc__switch"
                :class="{ 'is-on': row.enable === '1', 'is-loading': switchLoadingId === row.id }"
                title="启用/停用"
                @click.stop="toggleEnable(row)"
              >
                <span class="goodsbrand-dc__switch-dot">
                  <svg v-if="switchLoadingId === row.id" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#8A93A3" stroke-width="3" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-2.4-5.7" /></svg>
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ============ 表格视图 ============ -->
      <div v-else class="goodsbrand-dc__table">
        <div class="goodsbrand-dc__thead" :style="brandGridStyle">
          <span class="goodsbrand-dc__th goodsbrand-dc__th--ck" @click="toggleAll">
            <span class="goodsbrand-dc__ck" :class="{ 'is-on': allChecked }">{{ allChecked ? '✓' : '' }}</span>
          </span>
          <span class="goodsbrand-dc__th goodsbrand-dc__th--brand">品牌</span>
          <span v-if="isBrandColumnVisible('sort')" class="goodsbrand-dc__th goodsbrand-dc__th--center" title="点击数值可行内编辑">排序 <i>✎</i></span>
          <span v-if="isBrandColumnVisible('status')" class="goodsbrand-dc__th goodsbrand-dc__th--center">启用</span>
          <span
            v-if="isBrandColumnVisible('updateTime')"
            class="goodsbrand-dc__th goodsbrand-dc__th--time"
            style="cursor:pointer"
            title="点击按更新时间排序"
            @click="toggleTimeSort"
          >更新时间<i :class="timeSortArrow" /></span>
          <span class="goodsbrand-dc__th goodsbrand-dc__th--right">操作</span>
        </div>

        <DcSkeleton v-if="loadingStage === 'skeleton'" />
        <div v-else-if="!tableLoading && tableData.length === 0" class="goodsspu-dc__empty">
          <DcEmptyImage :src="emptyImg" alt="品牌空状态插画" />
          <div class="goodsspu-dc__empty-title">{{ emptyTitle }}</div>
          <span v-if="!isEmptyAll" class="goodsspu-dc__empty-cta" @click="handleReset">重置筛选</span>
        </div>

        <template v-else>
          <div
            v-for="row in tableData"
            :key="row.id"
            class="goodsbrand-dc__tr"
            :style="brandGridStyle"
            :class="{ 'is-flash': flashId === row.id }"
          >
            <span class="goodsbrand-dc__ck-wrap" @click.stop="toggleRow(row)">
              <span class="goodsbrand-dc__ck" :class="{ 'is-on': isChecked(row) }">{{ isChecked(row) ? '✓' : '' }}</span>
            </span>
            <!-- 品牌 -->
            <div class="goodsbrand-dc__brand" @click="openEdit(row)">
              <span class="goodsbrand-dc__logo">
                <img v-if="row.picUrl" :src="row.picUrl" :alt="row.brandName">
                <span v-else class="goodsbrand-dc__logo-txt">{{ tileText(row) }}</span>
              </span>
              <span class="goodsbrand-dc__brand-main">
                <span class="goodsbrand-dc__brand-name" :class="{ 'is-off': row.enable !== '1' }" :title="row.brandName">
                  {{ row.brandName || '—' }}
                  <span v-if="isBrandColumnVisible('status') && row.enable !== '1'" class="goodsbrand-dc__off-tag">已停用</span>
                </span>
              </span>
            </div>
            <!-- 排序：行内编辑（putObj({id, sort})） -->
            <div v-if="isBrandColumnVisible('sort')" class="goodsbrand-dc__cell-center">
              <input
                v-if="sortEditId === row.id"
                ref="sortInputRef"
                v-model="sortEditVal"
                class="goodsbrand-dc__sort-input"
                @keydown.enter="saveSort(row)"
                @keydown.esc="sortEditId = ''"
                @blur="saveSort(row)"
              >
              <span
                v-else
                class="goodsbrand-dc__sort-plain"
                :class="{ 'is-empty': row.sort == null || row.sort === '' }"
                title="点击行内编辑排序"
                @click="startSortEdit(row)"
              >{{ row.sort == null || row.sort === '' ? '—' : row.sort }}</span>
            </div>
            <!-- 启用：switch（changeEnable → putObj({id, enable})） -->
            <div v-if="isBrandColumnVisible('status')" class="goodsbrand-dc__cell-center">
              <span
                class="goodsbrand-dc__switch"
                :class="{ 'is-on': row.enable === '1', 'is-loading': switchLoadingId === row.id }"
                title="启用/停用"
                @click.stop="toggleEnable(row)"
              >
                <span class="goodsbrand-dc__switch-dot">
                  <svg v-if="switchLoadingId === row.id" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#8A93A3" stroke-width="3" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-2.4-5.7" /></svg>
                </span>
              </span>
            </div>
            <!-- 更新时间（hover 查看创建时间） -->
            <span v-if="isBrandColumnVisible('updateTime')" class="goodsbrand-dc__time" :title="row.createTime ? '创建时间：' + row.createTime : ''">{{ row.updateTime || '—' }}</span>
            <!-- 操作 -->
            <span class="goodsbrand-dc__ops">
              <span
                v-if="permissionList.editBtn"
                class="goodsbrand-dc__op"
                title="编辑"
                @click.stop="openEdit(row)"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16" /><path d="M6 15 15.5 5.5a2.1 2.1 0 0 1 3 3L9 18l-4 1z" /></svg>
              </span>
              <span
                v-if="permissionList.delBtn"
                class="goodsbrand-dc__op goodsbrand-dc__op--del"
                title="删除"
                @click.stop="handleDel(row)"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6.5h16M9.5 6V4.5h5V6M7 6.5l1 13h8l1-13M10 10v6M14 10v6" /></svg>
              </span>
            </span>
          </div>
        </template>
      </div>

      <!-- ============ 底部统计 ============ -->
      <div class="goodsbrand-dc__foot">
        <span>共 {{ page.total }} 个品牌</span>
      </div>

      <!-- ============ 分页（自绘，调现有 getPageF） ============ -->
      <div v-if="tableData.length > 0" class="goodsspu-dc__pager">
        <span>共 {{ page.total }} 条</span>
        <el-select
          :model-value="page.pageSize"
          class="dc-pager__size dc-nsel"
          @change="onSizeChange(Number($event))"
        >
          <el-option :value="20" label="20 条/页" />
          <el-option :value="50" label="50 条/页" />
          <el-option :value="100" label="100 条/页" />
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
      </div>
    </div>

    <!-- ============ 新建 / 编辑 品牌弹窗（自绘 560px） ============ -->
    <Teleport to="body">
      <div v-if="modalOpen" class="goodsbrand-dc__mask overlay-scope" @click.self="closeModal">
        <div class="goodsbrand-dc__modal">
          <div class="goodsbrand-dc__modal-head">
            <span class="goodsbrand-dc__modal-title">{{ modalTitle }}</span>
            <span class="goodsbrand-dc__modal-close" @click="closeModal">✕</span>
          </div>
          <div class="goodsbrand-dc__modal-body">
            <div class="goodsbrand-dc__section"><i /><span>基本信息</span></div>

            <div class="goodsbrand-dc__field-label">品牌名称 <em>*</em></div>
            <div class="goodsbrand-dc__field-wrap">
              <input
                v-model="modalForm.brandName"
                class="goodsbrand-dc__field-input"
                :class="{ 'is-error': !!nameErr }"
                :maxlength="nameMax"
                placeholder="如：品牌中文名"
                @input="nameErr = ''"
              >
              <span class="goodsbrand-dc__field-count">{{ modalForm.brandName.length }}/{{ nameMax }}</span>
            </div>
            <div v-if="nameErr" class="goodsbrand-dc__field-err">{{ nameErr }}</div>

            <div class="goodsbrand-dc__field-label" style="margin-top:12px">品牌 Logo <em>*</em></div>
            <MaterialList
              v-model:singleValue="modalForm.picUrl"
              :num="1"
              :is-single="true"
              type="image"
              :width="100"
              :height="100"
            />
            <div v-if="logoErr" class="goodsbrand-dc__field-err">{{ logoErr }}</div>
            <div class="goodsbrand-dc__logo-tip">{{ $t("commons.imageSizeTip", { size: "100px*100px" }) }}</div>

            <div class="goodsbrand-dc__row">
              <div class="goodsbrand-dc__sort-field">
                <div class="goodsbrand-dc__field-label">排序</div>
                <div class="goodsbrand-dc__stepper">
                  <span class="goodsbrand-dc__step" @click="stepSort(-1)">−</span>
                  <input v-model="modalForm.sort" class="goodsbrand-dc__step-input" placeholder="0" @input="onSortInput">
                  <span class="goodsbrand-dc__step" @click="stepSort(1)">＋</span>
                </div>
                <div class="goodsbrand-dc__field-hint">数值越小越靠前</div>
              </div>
              <div class="goodsbrand-dc__enable-field">
                <div class="goodsbrand-dc__field-label">是否启用</div>
                <div class="goodsbrand-dc__enable-row">
                  <span
                    class="goodsbrand-dc__enable-switch"
                    :class="{ 'is-on': modalForm.enable === '1' }"
                    @click="modalForm.enable = modalForm.enable === '1' ? '0' : '1'"
                  ><i /></span>
                  <span class="goodsbrand-dc__enable-text" :class="{ 'is-on': modalForm.enable === '1' }">
                    {{ modalForm.enable === '1' ? '启用中 · C 端品牌馆可见' : '已停用 · C 端隐藏' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div class="goodsbrand-dc__modal-foot">
            <span class="goodsbrand-dc__cancel" @click="closeModal">取消</span>
            <button class="goodsbrand-dc__ok" :disabled="modalSaving" @click="saveModal">
              <span v-if="modalSaving" class="goodsbrand-dc__spin" />{{ modalSaving ? '保存中…' : '确 定' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    <ColumnPreferenceDialog
      ref="brandColumnPreference"
      :key="view"
      :storage-key="`mall:table-columns:goodsbrand:${view}:v1`"
      :columns="activeBrandColumns"
      @change="visibleBrandColumns = $event"
    />
  </div>
</template>

<script lang="ts" setup>
/**
 * 商品品牌列表页（自绘）
 *
 * 卡片墙 / 表格两种视图（纯前端展示态），新增 / 编辑走自绘弹窗，CRUD 调 addObj / putObj / delObj。
 * 后端字段：id / brandName / picUrl / sort / enable / createTime / updateTime。
 */
import { DcEmptyImage, DcSkeleton, useLoadingStage } from "@/components/dc-states";
import emptyImg from "@/assets/common/empty.png";
import {
  addObj,
  delObj,
  getPage,
  type ObjVO,
  putObj,
} from "@/api/mall/goodsbrand";
import MaterialList from "@/components/material/list.vue";
import ColumnPreferenceDialog from "@/components/dc-shell/ColumnPreferenceDialog.vue";
import { usePermissionStoreHook } from "@/store/modules/permission";
import { filterForm } from "@/utils/util";
import { Refresh } from "@element-plus/icons-vue";
import { computed, getCurrentInstance, nextTick, reactive, ref } from "vue";

import "../goods-list-dc.scss";
import "../goodsbrand-dc.scss";
import { appConfirm } from "@/components/overlay";
import { usePagerClamp } from "@/hooks/usePagerClamp";

defineOptions({ name: "goodsbrand" });

const { proxy } = getCurrentInstance()!;

// ==================== 响应式数据 ====================
const tableData = ref<any[]>([]);
const page = reactive({
  total: 0,
  currentPage: 1,
  pageSize: 20,
  ascs: "sort", // 升序字段（默认按 sort）
  descs: "",
});
const paramsSearch = ref<Record<string, any>>({});
const tableLoading = ref(false);
const { stage: loadingStage } = useLoadingStage(tableLoading);

// 视图态（纯前端）
const view = ref<"card" | "table">("card");
const brandColumnPreference = ref<InstanceType<typeof ColumnPreferenceDialog>>();
const cardBrandColumns = [
  { key: "brand", label: "品牌", required: true }, { key: "logo", label: "品牌 Logo" }, { key: "status", label: "启停状态" },
];
const tableBrandColumns = [
  { key: "brand", label: "品牌", required: true }, { key: "sort", label: "排序" }, { key: "status", label: "启停状态" },
  { key: "updateTime", label: "更新时间" },
];
const activeBrandColumns = computed(() => view.value === "card" ? cardBrandColumns : tableBrandColumns);
const visibleBrandColumns = ref(tableBrandColumns.map(column => column.key));
const isBrandColumnVisible = (key: string) => visibleBrandColumns.value.includes(key);
const brandGridStyle = computed(() => ({ gridTemplateColumns: [
  "40px", "minmax(0, 1fr)", ...(isBrandColumnVisible("sort") ? ["84px"] : []),
  ...(isBrandColumnVisible("status") ? ["84px"] : []), ...(isBrandColumnVisible("updateTime") ? ["138px"] : []), "92px",
].join(" ") }));

// ==================== 权限 ====================
const permissions = usePermissionStoreHook().permissions;
const permissionList = computed(() => ({
  addBtn: !!permissions["mall:goodsbrand:add"],
  delBtn: !!permissions["mall:goodsbrand:del"],
  editBtn: !!permissions["mall:goodsbrand:edit"],
  viewBtn: !!permissions["mall:goodsbrand:get"],
}));

// ==================== 展示辅助 ====================
function tileText(row: any) {
  return String(row.brandName || "").trim().slice(0, 1).toUpperCase() || "?";
}
const isEmptyAll = computed(
  () => Object.keys(paramsSearch.value).length === 0,
);
const emptyTitle = computed(() =>
  isEmptyAll.value ? "还没有品牌，创建第一个吧" : "未找到匹配的品牌，试试调整筛选条件",
);

// ==================== 数据加载（重接：脚本顶层首拉，替代 avue @on-load） ====================
function getPageF(pageParam: any, params?: any) {
  tableLoading.value = true;
  return getPage(
    filterForm({
      current: pageParam.currentPage,
      size: pageParam.pageSize,
      descs: page.descs,
      ascs: page.ascs,
      ...params,
      ...paramsSearch.value,
    }),
  )
    .then((response: any) => {
      tableData.value = response.data.records || [];
      page.total = response.data.total;
      page.currentPage = pageParam.currentPage;
      page.pageSize = pageParam.pageSize;
      tableLoading.value = false;
    })
    .catch(() => {
      tableLoading.value = false;
    });
}

// ==================== 搜索（保留原 searchChange 逻辑） ====================
const searchForm = reactive({ keyword: "", enable: "" });
function buildSearchParams() {
  const p: Record<string, any> = {};
  const kw = searchForm.keyword.trim();
  if (kw) p.brandName = kw; // 后端字段（模糊匹配以后端为准）
  if (searchForm.enable !== "") p.enable = searchForm.enable; // 后端字段
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
  searchForm.enable = "";
  paramsSearch.value = {};
  page.currentPage = 1;
  getPageF(page);
}

// ==================== 排序（更新时间两态，调现有 sortChange） ====================
const timeSortOrder = ref<"ascending" | "descending" | null>(null);
const timeSortArrow = computed(() =>
  timeSortOrder.value === "ascending"
    ? "goodsspu-dc__sort-i is-asc"
    : timeSortOrder.value === "descending"
      ? "goodsspu-dc__sort-i is-desc"
      : "goodsspu-dc__sort-i",
);
function sortChange(val: any) {
  const prop = val.prop ? val.prop.replace(/([A-Z])/g, "_$1").toLowerCase() : "";
  if (val.order === "ascending") {
    page.descs = "";
    page.ascs = prop;
  } else if (val.order === "descending") {
    page.ascs = "";
    page.descs = prop;
  } else {
    page.ascs = "sort"; // 复位到默认排序
    page.descs = "";
  }
  getPageF(page);
}
function toggleTimeSort() {
  timeSortOrder.value =
    timeSortOrder.value === "descending"
      ? "ascending"
      : timeSortOrder.value === "ascending"
        ? null
        : "descending";
  sortChange({ prop: "updateTime", order: timeSortOrder.value });
}

// ==================== 分页 ====================
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
function onPageChange(p: number) {
  page.currentPage = p;
  getPageF(page);
}
function onSizeChange(s: number) {
  page.pageSize = s;
  page.currentPage = 1;
  getPageF(page);
}
function refreshChange() {
  getPageF(page);
}
// ==================== 选择态（复用 goodsspu 通法） ====================
const selectedIds = ref(new Set<string>());
function isChecked(row: any) {
  return selectedIds.value.has(row.id);
}
function toggleRow(row: any) {
  if (selectedIds.value.has(row.id)) selectedIds.value.delete(row.id);
  else selectedIds.value.add(row.id);
  selectedIds.value = new Set(selectedIds.value);
}
const allChecked = computed(
  () => tableData.value.length > 0 && tableData.value.every((r) => selectedIds.value.has(r.id)),
);
function toggleAll() {
  if (allChecked.value) tableData.value.forEach((r) => selectedIds.value.delete(r.id));
  else tableData.value.forEach((r) => selectedIds.value.add(r.id));
  selectedIds.value = new Set(selectedIds.value);
}

// ==================== 批量启停用（真实：循环 putObj 现有端点） ====================
const bulkMenuOpen = ref(false);
const bulkRunning = ref(false);
function toggleBulkMenu() {
  if (selectedIds.value.size === 0 || bulkRunning.value) return;
  bulkMenuOpen.value = !bulkMenuOpen.value;
}
function bulkSetEnable(enable: string) {
  bulkMenuOpen.value = false;
  const ids = [...selectedIds.value];
  if (!ids.length) return;
  const label = enable === "1" ? "启用" : "停用";
  appConfirm({
    intent: "danger",
    title: `确定批量${label}选中的品牌吗？`,
    verb: label,
    count: ids.length,
  })
    .then(() => {
      bulkRunning.value = true;
      return Promise.all(ids.map((id) => putObj({ id, enable })));
    })
    .then(() => {
      bulkRunning.value = false;
      selectedIds.value = new Set();
      proxy.$message.success(`已批量${label} ${ids.length} 个品牌`);
      getPageF(page);
    })
    .catch(() => {
      bulkRunning.value = false;
    });
}

// ==================== 行开关（保留原 changeEnable：putObj({id, enable})） ====================
const switchLoadingId = ref<string>("");
function toggleEnable(row: any) {
  if (switchLoadingId.value) return;
  if (!row?.id) return;
  const next = row.enable === "1" ? "0" : "1";
  switchLoadingId.value = row.id;
  putObj({ id: row.id, enable: next })
    .then(() => {
      row.enable = next;
      switchLoadingId.value = "";
      proxy.$message.success(next === "1" ? `已启用「${row.brandName}」` : `已停用「${row.brandName}」`);
    })
    .catch(() => {
      switchLoadingId.value = "";
    });
}

// ==================== 排序行内编辑（putObj({id, sort})） ====================
const sortEditId = ref<string>("");
const sortEditVal = ref<string>("");
const sortInputRef = ref<any>(null);
function startSortEdit(row: any) {
  sortEditId.value = row.id;
  sortEditVal.value = row.sort == null ? "" : String(row.sort);
  nextTick(() => {
    const el = Array.isArray(sortInputRef.value) ? sortInputRef.value[0] : sortInputRef.value;
    el?.focus?.();
  });
}
function saveSort(row: any) {
  if (sortEditId.value !== row.id) return;
  const raw = sortEditVal.value.trim().replace(/[^0-9]/g, "");
  const nextSort = raw === "" ? undefined : Number(raw);
  sortEditId.value = "";
  if (String(row.sort ?? "") === String(nextSort ?? "")) return; // 未变化不请求
  putObj({ id: row.id, sort: nextSort })
    .then(() => {
      row.sort = nextSort;
      flash(row.id);
      proxy.$message.success("排序已更新");
    })
    .catch(() => {});
}

// ==================== 行高亮反馈 ====================
const flashId = ref<string>("");
function flash(id: string) {
  flashId.value = id;
  setTimeout(() => {
    if (flashId.value === id) flashId.value = "";
  }, 1300);
}

// ==================== 删除（保留原 handleDel：二次确认 + delObj + 刷新） ====================
function handleDel(row: any) {
  appConfirm({ intent: "delete", title: "删除该品牌？", verb: "删除" })
    .then(() => delObj(row.id))
    .then(() => {
      proxy.$message({
        showClose: true,
        message: proxy.$t("commons.delSuccess"),
        type: "success",
      });
      selectedIds.value.delete(row.id);
      selectedIds.value = new Set(selectedIds.value);
      getPageF(page);
    })
    .catch(() => {});
}

// ==================== 新建 / 编辑弹窗（自绘，CRUD 走原 addObj/putObj） ====================
const modalOpen = ref(false);
const modalMode = ref<"add" | "edit">("add");
const editingId = ref<string | null>(null);
const modalSaving = ref(false);
const nameErr = ref("");
const logoErr = ref("");
const nameMax = 64; // 与后端 brandName 校验一致（rules.max = 64）
const modalForm = reactive<ObjVO>({ brandName: "", picUrl: "", sort: undefined, enable: "1" });
const modalTitle = computed(() =>
  modalMode.value === "edit" ? "编辑品牌 · " + (modalForm.brandName || "") : "新建品牌",
);

function resetModalForm(row?: any) {
  modalForm.brandName = row?.brandName ?? "";
  modalForm.picUrl = row?.picUrl ?? "";
  modalForm.sort = row?.sort ?? undefined;
  modalForm.enable = row?.enable ?? "1";
  nameErr.value = "";
  logoErr.value = "";
  modalSaving.value = false;
}
function openAdd() {
  modalMode.value = "add";
  editingId.value = null;
  resetModalForm();
  modalOpen.value = true;
}
function openEdit(row: any) {
  modalMode.value = "edit";
  editingId.value = row.id;
  resetModalForm(row);
  modalOpen.value = true;
}
function closeModal() {
  if (modalSaving.value) return;
  modalOpen.value = false;
}
function onSortInput() {
  const v = String(modalForm.sort ?? "").replace(/[^0-9]/g, "");
  modalForm.sort = v === "" ? undefined : Number(v);
}
function stepSort(delta: number) {
  const cur = Number(modalForm.sort) || 0;
  modalForm.sort = Math.max(0, cur + delta);
}
function saveModal() {
  if (modalSaving.value) return;
  const name = String(modalForm.brandName || "").trim();
  if (!name) {
    nameErr.value = "品牌名称必填";
    return;
  }
  if (name.length > nameMax) {
    nameErr.value = `品牌名称不能超过 ${nameMax} 个字符`;
    return;
  }
  if (!modalForm.picUrl) {
    logoErr.value = "请上传品牌 Logo";
    return;
  }
  modalSaving.value = true;
  const payload: ObjVO = {
    brandName: name,
    picUrl: modalForm.picUrl,
    sort: modalForm.sort,
    enable: modalForm.enable,
  };
  const req =
    modalMode.value === "edit"
      ? putObj({ id: editingId.value as string, ...payload })
      : addObj(payload);
  req
    .then(() => {
      proxy.$message({
        showClose: true,
        message: proxy.$t(modalMode.value === "edit" ? "commons.updateSuccess" : "commons.addSuccess"),
        type: "success",
      });
      modalOpen.value = false;
      modalSaving.value = false;
      if (modalMode.value === "edit" && editingId.value) flash(editingId.value);
      getPageF(page);
    })
    .catch(() => {
      modalSaving.value = false;
    });
}

// 首拉（替代 avue @on-load）
getPageF(page);
</script>
