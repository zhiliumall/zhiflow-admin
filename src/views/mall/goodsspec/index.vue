<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
  <div class="goodsspec-dc">
    <!-- ============ 页头 ============ -->
    <div class="goodsspu-dc__banner">
      <div class="goodsspu-dc__banner-grid" />
      <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--1" />
      <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--2" />
      <div class="goodsspu-dc__banner-head">
        <div class="goodsspu-dc__banner-title">规格管理</div>
        <div class="goodsspu-dc__banner-sub">
          规格用于生成商品 SKU，如：规格 <b>[尺码]</b> 的规格值为 <b>S / M / L</b>；左侧维护规格，右侧维护其规格值
        </div>
      </div>
      <div style="flex: 1" />
      <div class="gspec-dc__banner-art" aria-hidden="true">
        <span class="gspec-dc__art-ruler">
          <svg width="48" height="26" viewBox="0 0 30 16" fill="none">
            <rect x="1" y="4" width="28" height="8" rx="2" fill="#EBF0FF" stroke="#3C6EF0" stroke-width="1.3" />
            <path d="M6 4v3M11 4v5M16 4v3M21 4v5M26 4v3" stroke="#3C6EF0" stroke-width="1.2" />
          </svg>
        </span>
        <span class="gspec-dc__art-grid">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#FA8C16" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
            <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
          </svg>
        </span>
        <span class="gspec-dc__art-dot-a" />
        <span class="gspec-dc__art-dot-b" />
      </div>
    </div>

    <!-- ============ 主卡片：左右分栏 ============ -->
    <div class="goodsspec-dc__card">
      <!-- ═══ 左栏 · 规格列表 ═══ -->
      <div class="goodsspec-dc__left">
        <!-- 工具条 -->
        <div class="goodsspec-dc__toolbar">
          <button v-if="canAdd" class="goodsspec-dc__new" @click="openAddSpec">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>新建规格
          </button>
          <button
            v-if="canDel"
            class="goodsspec-dc__batch-del"
            :class="{ 'is-active': selectedIds.size > 0 }"
            @click="batchDel"
          >批量删除{{ selectedIds.size > 0 ? `（${selectedIds.size}）` : '' }}</button>
          <div class="goodsspec-dc__spacer" />
          <div class="goodsspec-dc__search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8A93A3" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input
              v-model="searchName"
              class="goodsspec-dc__search-input"
              placeholder="搜索规格名称"
              @input="onSearchInput"
              @keyup.enter="doSearch"
            >
          </div>
          <div class="goodsspec-dc__icon-btn" :class="{ 'is-spin': refreshing }" title="刷新" @click="refreshChange">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-2.4-5.7" /><path d="M20.4 3.6v4.2h-4.2" /></svg>
          </div>
        </div>

        <!-- 滚动体 -->
        <div class="goodsspec-dc__scroll">
          <!-- 表头 -->
          <div class="goodsspec-dc__thead">
            <div class="goodsspec-dc__th goodsspec-dc__th--c">
              <span class="goodsspec-dc__ck" :class="{ 'is-on': allChecked }" @click="toggleAll(!allChecked)">
                <span v-if="allChecked">✓</span>
              </span>
            </div>
            <div class="goodsspec-dc__th goodsspu-dc__th--sort" @click="toggleSort('name')">规格名称<i :class="sortArrow('name')" /></div>
            <div class="goodsspec-dc__th goodsspec-dc__th--c">规格值数量</div>
            <div class="goodsspec-dc__th goodsspec-dc__th--c">引用商品</div>
            <div class="goodsspec-dc__th goodsspec-dc__th--time goodsspec-dc__th--timesort">
              <span class="goodsspu-dc__th--sort" title="按更新时间排序" @click="toggleSort('updateTime')">更新<i :class="sortArrow('updateTime')" /></span>
              <span class="goodsspu-dc__th--sort" title="按创建时间排序" @click="toggleSort('createTime')">创建<i :class="sortArrow('createTime')" /></span>
            </div>
            <div class="goodsspec-dc__th goodsspec-dc__th--ops">操作</div>
          </div>

          <!-- 空态 -->
          <div v-if="!tableLoading && tableData.length === 0" class="goodsspec-dc__empty">
            {{ searchName ? `未找到匹配「${searchName}」的规格` : '暂无规格，点击「新建规格」开始' }}
          </div>

          <!-- 数据行 -->
          <template v-else>
            <div
              v-for="row in tableData"
              :key="row.id"
              class="goodsspec-dc__tr"
              :class="{ 'is-active': selectedSpec && selectedSpec.id === row.id }"
              @click="selectSpec(row)"
            >
              <div class="goodsspec-dc__ck-cell" @click.stop>
                <span class="goodsspec-dc__ck" :class="{ 'is-on': isRowChecked(row) }" @click="toggleRow(row, !isRowChecked(row))">
                  <span v-if="isRowChecked(row)">✓</span>
                </span>
              </div>
              <div class="goodsspec-dc__name-cell">
                <div class="goodsspec-dc__name-line">
                  <span class="goodsspec-dc__name">{{ row.name }}</span>
                  <span v-if="looksLikeSpecValue(row.name)" class="goodsspec-dc__sug"
                    :title="`规格名应该是「轴」（如 ${recommendedSpecNames}），「${row.name}」看起来是具体的规格值，应该挂在某个规格下面`">疑似规格值</span>
                </div>
                <div class="goodsspec-dc__sub">{{ valuePreview(row) }}</div>
              </div>
              <div class="goodsspec-dc__count-cell">
                <span v-if="valueCount(row) > 0" class="goodsspec-dc__count">{{ valueCount(row) }}</span>
                <span v-else-if="valueLoaded(row)" class="goodsspec-dc__count--empty" title="该规格还没有规格值，无法生成 SKU">未配置</span>
                <span v-else class="goodsspec-dc__count">…</span>
              </div>
              <!-- 引用商品：后端暂无统计接口，占位降级 -->
              <div class="goodsspec-dc__ref-cell" title="引用商品统计待后端接口">—</div>
              <div class="goodsspec-dc__time" :title="`创建时间：${fmtTime(row.createTime)}`">{{ fmtTime(row.updateTime || row.createTime) }}</div>
              <div class="goodsspec-dc__ops" @click.stop>
                <span v-if="canView" class="goodsspec-dc__op" title="查看" @click="selectSpec(row)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.8 12S6.2 5.9 12 5.9 21.2 12 21.2 12 18 18.1 12 18.1 2.8 12 2.8 12z" /><circle cx="12" cy="12" r="2.5" /></svg>
                </span>
                <span v-if="canEdit" class="goodsspec-dc__op" title="编辑" @click="openEditSpec(row)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16" /><path d="M6 15 15.5 5.5a2.1 2.1 0 0 1 3 3L9 18l-4 1z" /></svg>
                </span>
                <span v-if="canDel" class="goodsspec-dc__op goodsspec-dc__op--del" title="删除" @click="handleDelSpec(row)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6.5h16M9.5 6V4.5h5V6M7 6.5l1 13h8l1-13M10 10v6M14 10v6" /></svg>
                </span>
              </div>
            </div>
          </template>
        </div>

        <!-- 分页 -->
        <div class="goodsspec-dc__pager">
          <span>共 {{ page.total }} 条</span>
          <span class="goodsspec-dc__pager-dot">·</span>
          <el-select
            :model-value="page.pageSize"
            class="dc-pager__size dc-nsel"
            @change="onSizeChange(Number($event))"
          >
            <el-option :value="10" label="10 条/页" />
            <el-option :value="20" label="20 条/页" />
            <el-option :value="50" label="50 条/页" />
          </el-select>
          <span class="goodsspec-dc__pager-nums">
            <span
              class="goodsspec-dc__pager-btn"
              :class="{ 'is-disabled': page.currentPage <= 1 }"
              @click="page.currentPage > 1 && onPageChange(page.currentPage - 1)"
            >‹</span>
            <span
              v-for="(p, i) in pageList"
              :key="i"
              class="goodsspec-dc__pager-num"
              :class="{ 'is-active': p === page.currentPage, 'is-ellipsis': typeof p !== 'number' }"
              @click="typeof p === 'number' && onPageChange(p)"
            >{{ p }}</span>
            <span
              class="goodsspec-dc__pager-btn"
              :class="{ 'is-disabled': page.currentPage >= totalPages }"
              @click="page.currentPage < totalPages && onPageChange(page.currentPage + 1)"
            >›</span>
          </span>
        </div>
      </div>

      <div class="goodsspec-dc__divider" />

      <!-- ═══ 右栏 · 规格值面板 ═══ -->
      <div class="goodsspec-dc__right">
        <!-- 未选择 -->
        <div v-if="!selectedSpec" class="goodsspec-dc__blank">
          <DcEmptyImage :src="emptyValueImg" size="panel" alt="未选择规格插画" />
          <div class="goodsspec-dc__blank-title">从左侧选择一个规格查看规格值</div>
          <div class="goodsspec-dc__blank-desc">规格值将组合生成商品 SKU<br>也可点击「新建规格」创建规格后再维护规格值</div>
        </div>

        <!-- 已选择 -->
        <template v-else>
          <div class="goodsspec-dc__rhead">
            <span class="goodsspec-dc__rbar" />
            <span class="goodsspec-dc__rtitle">规格值 · {{ selectedSpec.name }}</span>
            <span class="goodsspec-dc__rcount">{{ valueList.length }} 个值</span>
            <div class="goodsspec-dc__spacer" />
            <button v-if="canAdd" class="goodsspec-dc__radd" @click="startAddValue">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>添加规格值
            </button>
          </div>

          <div class="goodsspec-dc__vlist">
            <!-- 值为空 -->
            <div v-if="!valueLoading && valueList.length === 0 && !addingValue" class="goodsspec-dc__vempty">
              <DcEmptyImage :src="emptyValueImg" size="compact" alt="规格值空状态插画" />
              <div class="goodsspec-dc__vempty-title">该规格还没有规格值</div>
              <div class="goodsspec-dc__vempty-desc">没有规格值将无法生成 SKU，先添加一个吧</div>
              <button v-if="canAdd" class="goodsspec-dc__vempty-cta" @click="startAddValue">＋ 添加规格值</button>
            </div>

            <!-- 值行 -->
            <div v-for="(v, i) in valueList" :key="v.id" class="goodsspec-dc__vrow">
              <span class="goodsspec-dc__vidx">#{{ i + 1 }}</span>
              <template v-if="editValueId === v.id">
                <input
                  ref="editInputRef"
                  v-model="editValueText"
                  class="goodsspec-dc__vinput"
                  placeholder="规格值，如 XL"
                  @keydown.enter="saveEditValue(v)"
                  @keydown.esc="cancelEditValue"
                  @blur="saveEditValue(v)"
                >
              </template>
              <template v-else>
                <span class="goodsspec-dc__vname">{{ v.name }}</span>
                <span class="goodsspec-dc__vops">
                  <span v-if="canEdit" class="goodsspec-dc__vop" title="编辑" @click="startEditValue(v)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16" /><path d="M6 15 15.5 5.5a2.1 2.1 0 0 1 3 3L9 18l-4 1z" /></svg>
                  </span>
                  <span v-if="canDel" class="goodsspec-dc__vop goodsspec-dc__vop--del" title="删除" @click="handleDelValue(v)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6.5h16M9.5 6V4.5h5V6M7 6.5l1 13h8l1-13M10 10v6M14 10v6" /></svg>
                  </span>
                </span>
              </template>
            </div>

            <!-- 新增值内联输入 -->
            <div v-if="addingValue" class="goodsspec-dc__vrow">
              <span class="goodsspec-dc__vidx">#{{ valueList.length + 1 }}</span>
              <input
                ref="addInputRef"
                v-model="addValueText"
                class="goodsspec-dc__vinput"
                placeholder="规格值，如 XL"
                @keydown.enter="saveNewValue"
                @keydown.esc="cancelAddValue"
                @blur="saveNewValue"
              >
            </div>
          </div>

          <!-- 批量添加 -->
          <div v-if="canAdd" class="goodsspec-dc__vfoot">
            <div class="goodsspec-dc__vfoot-line">
              <span class="goodsspec-dc__vfoot-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--dc-brand)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h9" /><path d="M17.5 15v5M15 17.5h5" /></svg>批量添加
              </span>
              <input
                v-model="batchText"
                class="goodsspec-dc__vfoot-input"
                placeholder="多个值用 / 分隔，如 S/M/L，回车添加"
                @keydown.enter="batchAddValues"
              >
              <button class="goodsspec-dc__vfoot-btn" @click="batchAddValues">添加</button>
            </div>
            <div class="goodsspec-dc__vfoot-tip">自动去重、忽略空值；新值将追加到列表末尾</div>
          </div>
        </template>
      </div>
    </div>

    <!-- ============ 新建/编辑规格 弹窗 ============ -->
    <Teleport to="body">
      <div v-if="specModalOpen" class="goodsspec-modal__mask" @click.self="closeSpecModal">
        <div class="goodsspec-modal__box">
          <div class="goodsspec-modal__head">
            <span class="goodsspec-modal__title">{{ specModalMode === 'edit' ? '编辑规格' : '新建规格' }}</span>
            <span class="goodsspec-modal__close" @click="closeSpecModal">✕</span>
          </div>
          <div class="goodsspec-modal__body">
            <div class="goodsspec-modal__flabel">规格名称 <span>*</span></div>
            <div class="goodsspec-modal__field">
              <input
                v-model="specForm.name"
                class="goodsspec-modal__input"
                :class="{ 'is-error': specNameErr }"
                maxlength="20"
                :placeholder="`规格名，如 ${recommendedSpecNames}`"
                @input="specNameErr = ''"
                @keyup.enter="saveSpec"
              >
              <span class="goodsspec-modal__count">{{ (specForm.name || '').length }}/20</span>
            </div>
            <div v-if="looksLikeSpecValue(specForm.name)" class="goodsspec-modal__sug">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--overlay-warn)" stroke-width="1.8" stroke-linecap="round"><path d="M12 8v5" /><circle cx="12" cy="16.5" r=".6" fill="var(--overlay-warn)" /><path d="M12 3 2.8 20h18.4z" stroke-linejoin="round" /></svg>
              「{{ specForm.name }}」看起来是<b>规格值</b>。规格名请填「轴」，如 {{ recommendedSpecNames }}；具体的值保存后加到该规格下面
            </div>
            <div v-else class="goodsspec-modal__hint">
              规格名是全店共用的「轴」，如 {{ recommendedSpecNames }}；具体的「红色」「XL」属于规格值，保存后在右栏添加
            </div>
            <div v-if="specNameErr" class="goodsspec-modal__err">{{ specNameErr }}</div>
          </div>
          <div class="goodsspec-modal__foot">
            <span class="goodsspec-modal__cancel" @click="closeSpecModal">取消</span>
            <button class="goodsspec-modal__ok" :disabled="specSubmitting" @click="saveSpec">
              <span v-if="specSubmitting" class="goodsspec-modal__spin" />{{ specSubmitting ? '保存中…' : '确 定' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
/**
 * 规格管理页（自绘）
 *
 * 双表保留：规格 goodsspec + 规格值 goodsspecvalue，avue-crud 全换自绘，
 * 左右分栏（左规格列表 / 右规格值面板）。
 *
 * 逻辑保留（重接触发点，接口不变）：
 *  - 规格：getPage 加载 / addObj / putObj / delObj（原 handleSpecConfirm/handleDel）
 *  - 规格值：getPage(specId) 加载 / addObj / putObj / delObj（原 handleSpecValueConfirm/handleDel2）
 *  - 搜索走 name 字段透传、二次确认删除全部保留。
 *
 * 后端字段：
 *  - GoodsSpec：name（必填 max50）/ createTime / updateTime（spuId/value/leaf 字典态未暴露）
 *  - GoodsSpecValue：name（必填 max50）/ specId / createTime / updateTime
 *
 * 后端没有引用商品统计、规格值启用开关、拖拽排序等接口，这些不做。
 */
import { addObj, delObj, getPage, putObj } from '@/api/mall/goodsspec'
import {
  addObj as addObj2,
  delObj as delObj2,
  getPage as getPage2,
  putObj as putObj2,
} from '@/api/mall/goodsspecvalue'
import { usePermissionStoreHook } from '@/store/modules/permission'
import { filterForm } from '@/utils/util'
import {
  looksLikeSpecValue,
  specNamingWarning,
  RECOMMENDED_SPEC_NAMES,
} from '@/components/sku/specNaming'
import { computed, getCurrentInstance, nextTick, ref } from 'vue'
import '../goods-list-dc.scss'
import '../goodsspec-dc.scss'
import { DcEmptyImage } from '@/components/dc-states'
import { appConfirm } from '@/components/overlay'
import emptyValueImg from '@/assets/common/empty.png'
import { usePagerClamp } from '@/hooks/usePagerClamp'

const { proxy } = getCurrentInstance()!

// 权限（原 permissionList：规格/规格值两表共用 goodsspec 权限位）
const perms = computed(() => usePermissionStoreHook()?.permissions || {})
const canAdd = computed(() => !!perms.value['mall:goodsspec:add'])
const canEdit = computed(() => !!perms.value['mall:goodsspec:edit'])
const canDel = computed(() => !!perms.value['mall:goodsspec:del'])
const canView = computed(() => !!perms.value['mall:goodsspec:get'])

// ==================== 规格列表态 ====================
const tableData = ref<any[]>([])
const tableLoading = ref(false)
const refreshing = ref(false)
const page = ref({
  total: 0,
  currentPage: 1,
  pageSize: 10,
  ascs: '',
  descs: 'create_time',
})
const paramsSearch = ref<Record<string, any>>({})
const searchName = ref('')

// 规格值缓存：specId -> { total, list }（用于列表数量/预览 + 右栏面板）
const valueCache = ref<Record<string, { total: number; list: any[] }>>({})

// ==================== 选择态 ====================
const selectedIds = ref(new Set<string>())
function isRowChecked(row: any) {
  return selectedIds.value.has(row.id)
}
function toggleRow(row: any, checked: boolean) {
  if (checked) selectedIds.value.add(row.id)
  else selectedIds.value.delete(row.id)
  selectedIds.value = new Set(selectedIds.value)
}
const allChecked = computed(
  () => tableData.value.length > 0 && tableData.value.every((r) => selectedIds.value.has(r.id)),
)
function toggleAll(checked: boolean) {
  if (checked) tableData.value.forEach((r) => selectedIds.value.add(r.id))
  else tableData.value.forEach((r) => selectedIds.value.delete(r.id))
  selectedIds.value = new Set(selectedIds.value)
}
function clearSelection() {
  selectedIds.value = new Set()
}

// ==================== 规格列表加载（重接：脚本顶层首拉，替代 avue @on-load） ====================
function getPageF(pageParam: any, params?: any) {
  tableLoading.value = true
  getPage(
    Object.assign(
      {
        current: pageParam.currentPage,
        size: pageParam.pageSize,
        descs: page.value.descs,
        ascs: page.value.ascs,
      },
      params,
      paramsSearch.value,
    ),
  )
    .then((response: any) => {
      tableData.value = response.data.records || []
      page.value.total = response.data.total ?? 0
      page.value.currentPage = pageParam.currentPage
      page.value.pageSize = pageParam.pageSize
      tableLoading.value = false
      // 若已选规格不在当前页，保留其面板；否则同步选中对象引用
      if (selectedSpec.value) {
        const still = tableData.value.find((r) => r.id === selectedSpec.value.id)
        if (still) selectedSpec.value = still
      }
      loadValueCounts(tableData.value)
    })
    .catch(() => {
      tableLoading.value = false
    })
}

// 批量拉取当前页各规格的规格值（真实接口 Promise.all，供数量徽标 + 预览）
function loadValueCounts(rows: any[]) {
  rows.forEach((sp) => {
    getPage2({ current: 1, size: 200, specId: sp.id })
      .then((res: any) => {
        valueCache.value = {
          ...valueCache.value,
          [sp.id]: {
            total: res.data.total ?? (res.data.records || []).length,
            list: res.data.records || [],
          },
        }
      })
      .catch(() => {})
  })
}

function valueLoaded(row: any) {
  return !!valueCache.value[row.id]
}
function valueCount(row: any) {
  return valueCache.value[row.id]?.total ?? 0
}
function valuePreview(row: any) {
  const cache = valueCache.value[row.id]
  if (!cache) return '加载中…'
  if (cache.total === 0) return '暂无规格值 · 不可生成 SKU'
  const names = cache.list.map((v) => v.name).filter(Boolean)
  return `共 ${cache.total} 个值：${names.join(' / ')}`
}

// ==================== 搜索（原 searchChange：name 字段透传 + 重置页码） ====================
let searchTimer: any = null
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(doSearch, 300)
}
function doSearch() {
  clearTimeout(searchTimer)
  const kw = searchName.value.trim()
  paramsSearch.value = filterForm(kw ? { name: kw } : {})
  page.value.currentPage = 1
  getPageF(page.value)
}

function refreshChange() {
  refreshing.value = true
  setTimeout(() => (refreshing.value = false), 650)
  getPageF(page.value)
}

// ==================== 自绘表头：排序三态（asc → desc → 取消，通法同 goodsspu/index.vue）====================
const sortState = ref<{ prop: string; order: 'ascending' | 'descending' | null }>({ prop: '', order: null })
function toggleSort(prop: string) {
  if (sortState.value.prop !== prop) sortState.value = { prop, order: 'ascending' }
  else if (sortState.value.order === 'ascending') sortState.value = { prop, order: 'descending' }
  else if (sortState.value.order === 'descending') sortState.value = { prop, order: null }
  else sortState.value = { prop, order: 'ascending' }
  sortChange({ prop, order: sortState.value.order })
}
function sortArrow(prop: string) {
  if (sortState.value.prop !== prop) return 'goodsspu-dc__sort-i'
  return sortState.value.order === 'ascending'
    ? 'goodsspu-dc__sort-i is-asc'
    : sortState.value.order === 'descending'
      ? 'goodsspu-dc__sort-i is-desc'
      : 'goodsspu-dc__sort-i'
}
// 原 sortChange：prop 转 snake_case 拼 ascs/descs，透传给分页接口（与基线 avue @sort-change 一致）
function sortChange({ prop, order }: { prop: string; order: string | null }) {
  const colName = prop ? prop.replace(/([A-Z])/g, '_$1').toLowerCase() : ''
  if (order === 'ascending') { page.value.ascs = colName; page.value.descs = '' }
  else if (order === 'descending') { page.value.ascs = ''; page.value.descs = colName }
  else { page.value.ascs = ''; page.value.descs = '' }
  getPageF(page.value)
}

// ==================== 分页 ====================
const totalPages = computed(() => Math.max(1, Math.ceil(page.value.total / page.value.pageSize)))
// 页码越界自愈：末页删掉最后一行 / 筛窄结果后，别停在空白页配着「共 N 条」
usePagerClamp(
  () => page.value.total,
  () => page.value.currentPage,
  () => page.value.pageSize,
  onPageChange,
)
const pageList = computed<(number | string)[]>(() => {
  const cur = page.value.currentPage
  const last = totalPages.value
  const out: (number | string)[] = []
  out.push(1)
  if (cur > 3) out.push('…')
  for (let i = Math.max(2, cur - 1); i <= Math.min(last - 1, cur + 1); i++) out.push(i)
  if (cur < last - 2) out.push('…')
  if (last > 1) out.push(last)
  return out
})
function onPageChange(p: number) {
  page.value.currentPage = p
  getPageF(page.value)
}
function onSizeChange(s: number) {
  page.value.pageSize = s
  page.value.currentPage = 1
  getPageF(page.value)
}

// ==================== 展示辅助 ====================
function fmtTime(t: any) {
  return String(t || '').replace('T', ' ').slice(0, 19) || '—'
}
// 命名规范建议（纯前端启发式，不入库）：名字长得像规格值就告警。
// 命名标准见 @/components/sku/specNaming.ts。
const recommendedSpecNames = RECOMMENDED_SPEC_NAMES.slice(0, 3).join(' / ')

// ==================== 删除（原 handleDel：二次确认 → delObj → 刷新） ====================
function handleDelSpec(row: any) {
  appConfirm({
    intent: 'delete',
    title: '删除该规格？',
    verb: '删除',
    impact: '该规格下的规格值会一并删除。',
    irreversible: true,
  })
    .then(() => delObj(row.id))
    .then(() => {
      proxy.$message({ showClose: true, message: proxy.$t('commons.delSuccess'), type: 'success' })
      if (selectedSpec.value && selectedSpec.value.id === row.id) selectedSpec.value = null
      selectedIds.value.delete(row.id)
      selectedIds.value = new Set(selectedIds.value)
      getPageF(page.value)
    })
    .catch(() => {})
}

// 批量删除：后端仅单删端点 → Promise.all 循环 delObj（真实调用）
function batchDel() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  appConfirm({
    intent: 'delete',
    title: '删除选中的规格？',
    verb: '删除',
    count: ids.length,
    impact: '这些规格下的规格值会一并删除。',
    irreversible: true,
  })
    .then(() => Promise.all(ids.map((id) => delObj(id))))
    .then(() => {
      proxy.$message.success(`已删除 ${ids.length} 个规格`)
      if (selectedSpec.value && ids.includes(selectedSpec.value.id)) selectedSpec.value = null
      clearSelection()
      getPageF(page.value)
    })
    .catch(() => {})
}

// ==================== 新建/编辑规格 弹窗（原 beforeOpen/handleSpecConfirm，接口不变） ====================
const specModalOpen = ref(false)
const specModalMode = ref<'add' | 'edit'>('add')
const specForm = ref<{ id?: string | number; name: string }>({ name: '' })
const specSubmitting = ref(false)
const specNameErr = ref('')

function openAddSpec() {
  specModalMode.value = 'add'
  specForm.value = { name: '' }
  specNameErr.value = ''
  specSubmitting.value = false
  specModalOpen.value = true
}
function openEditSpec(row: any) {
  specModalMode.value = 'edit'
  specForm.value = { id: row.id, name: row.name }
  specNameErr.value = ''
  specSubmitting.value = false
  specModalOpen.value = true
}
function closeSpecModal() {
  if (specSubmitting.value) return
  specModalOpen.value = false
}
function saveSpec() {
  if (specSubmitting.value) return
  const name = (specForm.value.name || '').trim()
  if (!name) {
    specNameErr.value = '请输入规格名称'
    return
  }
  // 新建时名字长得像规格值就问一句 —— `goods_spec` 是全店共用的词表，
  // 写错一次全店所有商品的「添加规格」下拉里就多一条永久噪音。编辑已有规格不打扰。
  if (specModalMode.value === 'add' && looksLikeSpecValue(name)) {
    appConfirm(specNamingWarning(name))
      .then(() => doSaveSpec(name))
      .catch(() => {})
    return
  }
  doSaveSpec(name)
}

function doSaveSpec(name: string) {
  specSubmitting.value = true
  const fn = specModalMode.value === 'add' ? addObj : putObj
  fn({ ...specForm.value, name })
    .then(() => {
      proxy.$message({
        showClose: true,
        message: proxy.$t(specModalMode.value === 'add' ? 'commons.addSuccess' : 'commons.updateSuccess'),
        type: 'success',
      })
      specModalOpen.value = false
      specSubmitting.value = false
      getPageF(page.value)
    })
    .catch(() => {
      specSubmitting.value = false
    })
}

// ==================== 右栏 · 规格值面板 ====================
const selectedSpec = ref<any>(null)
const valueList = ref<any[]>([])
const valueLoading = ref(false)

function selectSpec(row: any) {
  // 再次点击当前规格 → 收起面板
  if (selectedSpec.value && selectedSpec.value.id === row.id) {
    selectedSpec.value = null
    valueList.value = []
    return
  }
  selectedSpec.value = row
  cancelAddValue()
  cancelEditValue()
  loadValues(row.id)
}

function loadValues(specId: string | number) {
  valueLoading.value = true
  getPage2({ current: 1, size: 200, specId })
    .then((res: any) => {
      const list = res.data.records || []
      valueList.value = list
      valueLoading.value = false
      valueCache.value = {
        ...valueCache.value,
        [specId]: { total: res.data.total ?? list.length, list },
      }
    })
    .catch(() => {
      valueLoading.value = false
    })
}

// ---- 新增规格值（内联输入，原 handleSpecValueConfirm add） ----
const addingValue = ref(false)
const addValueText = ref('')
const addInputRef = ref<any>(null)
const valueSubmitting = ref(false)

function startAddValue() {
  cancelEditValue()
  addingValue.value = true
  addValueText.value = ''
  nextTick(() => {
    const el = Array.isArray(addInputRef.value) ? addInputRef.value[0] : addInputRef.value
    el?.focus?.()
  })
}
function cancelAddValue() {
  addingValue.value = false
  addValueText.value = ''
}
function saveNewValue() {
  if (valueSubmitting.value) return
  const name = addValueText.value.trim()
  if (!name) {
    addingValue.value = false
    return
  }
  if (valueList.value.some((v) => String(v.name).toLowerCase() === name.toLowerCase())) {
    proxy.$message.warning(`「${name}」已存在，自动去重`)
    return
  }
  valueSubmitting.value = true
  addObj2({ name, specId: selectedSpec.value.id })
    .then(() => {
      proxy.$message({ showClose: true, message: proxy.$t('commons.addSuccess'), type: 'success' })
      addingValue.value = false
      addValueText.value = ''
      valueSubmitting.value = false
      loadValues(selectedSpec.value.id)
    })
    .catch(() => {
      valueSubmitting.value = false
    })
}

// ---- 编辑规格值（内联输入，原 handleSpecValueConfirm edit） ----
const editValueId = ref<string | number | null>(null)
const editValueText = ref('')
const editInputRef = ref<any>(null)

function startEditValue(v: any) {
  cancelAddValue()
  editValueId.value = v.id
  editValueText.value = v.name || ''
  nextTick(() => {
    const el = Array.isArray(editInputRef.value) ? editInputRef.value[0] : editInputRef.value
    el?.focus?.()
  })
}
function cancelEditValue() {
  editValueId.value = null
  editValueText.value = ''
}
function saveEditValue(v: any) {
  if (editValueId.value !== v.id) return
  const name = editValueText.value.trim()
  if (!name) {
    proxy.$message.warning('规格值不能为空')
    return
  }
  if (name === v.name) {
    cancelEditValue()
    return
  }
  if (valueList.value.some((x) => x.id !== v.id && String(x.name).toLowerCase() === name.toLowerCase())) {
    proxy.$message.warning(`「${name}」已存在，自动去重`)
    return
  }
  const id = editValueId.value
  editValueId.value = null
  // ⚠️ 规格值和规格名一样是**全店词表**：同一条值会被多个商品的 SKU 共用。就地改名 =
  // 所有在用商品的规格文案一起变，且买家侧立刻可见。后端没有引用统计接口，
  // 给不出准确条数，所以只能把这层共用语义讲清楚，让人自己判断。
  appConfirm({
    intent: 'danger',
    title: `把规格值「${v.name}」改成「${name}」？`,
    body: '规格值是全店共用的，所有正在使用它的商品都会一起改，买家端立即可见。只想改某一个商品的话，请新建一个值再到该商品上换过去。',
    verb: '确认改名',
  })
    .then(() => {
      putObj2({ ...v, name, specId: v.specId ?? selectedSpec.value.id })
        .then(() => {
          proxy.$message({ showClose: true, message: proxy.$t('commons.updateSuccess'), type: 'success' })
          loadValues(selectedSpec.value.id)
        })
        .catch(() => {
          editValueId.value = id
        })
    })
    .catch(() => {
      // 放弃改名：把输入框恢复成原值，别让人以为已经改了
      editValueId.value = id
      editValueText.value = v.name || ''
    })
}

// ---- 删除规格值（原 handleDel2：二次确认 → delObj2 → 刷新） ----
function handleDelValue(v: any) {
  appConfirm({
    intent: 'delete',
    title: `删除规格值「${v.name}」？`,
    verb: '删除',
    // 同上：该值可能被多个商品共用，删掉是全店范围的
    impact: '该值是全店共用的，所有正在使用它的商品，其对应的 SKU 组合都会失效。',
    irreversible: true,
  })
    .then(() => delObj2(v.id))
    .then(() => {
      proxy.$message({ showClose: true, message: proxy.$t('commons.delSuccess'), type: 'success' })
      loadValues(selectedSpec.value.id)
    })
    .catch(() => {})
}

// ---- 批量添加规格值（/ 分隔，去重，Promise.all 循环 addObj2 真实调用） ----
const batchText = ref('')
function batchAddValues() {
  const raw = batchText.value.split('/').map((t) => t.trim()).filter(Boolean)
  if (!raw.length) {
    proxy.$message.warning('请输入规格值')
    return
  }
  const exist = new Set(valueList.value.map((v) => String(v.name).toLowerCase()))
  const seen = new Set<string>()
  const add: string[] = []
  raw.forEach((t) => {
    const key = t.toLowerCase()
    if (!exist.has(key) && !seen.has(key)) {
      seen.add(key)
      add.push(t)
    }
  })
  if (!add.length) {
    proxy.$message.warning('没有可添加的新值（已自动去重）')
    return
  }
  Promise.all(add.map((name) => addObj2({ name, specId: selectedSpec.value.id })))
    .then(() => {
      proxy.$message.success(`已批量添加 ${add.length} 个规格值`)
      batchText.value = ''
      loadValues(selectedSpec.value.id)
    })
    .catch(() => {})
}

// ==================== 首拉（替代 avue @on-load） ====================
getPageF(page.value)
</script>
