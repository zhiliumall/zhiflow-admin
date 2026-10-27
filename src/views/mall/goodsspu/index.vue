<template>
  <div class="goodsspu-dc">
    <!-- 顶部 Banner -->
    <div class="goodsspu-dc__banner">
      <div class="goodsspu-dc__banner-grid" />
      <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--1" />
      <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--2" />
      <div class="goodsspu-dc__banner-head">
        <div class="goodsspu-dc__banner-title">商品管理</div>
        <div class="goodsspu-dc__banner-sub">巡检价格、库存与上下架，发布与修改商品</div>
      </div>
      <div style="flex:1" />
      <div class="goodsspu-dc__banner-stats">
        <div class="goodsspu-dc__stat">
          <div class="goodsspu-dc__stat-label">商品总数</div>
          <div class="goodsspu-dc__stat-num">{{ statistics.countTotal }}</div>
        </div>
        <div class="goodsspu-dc__stat goodsspu-dc__stat--divider">
          <div class="goodsspu-dc__stat-label">今日新增</div>
          <div class="goodsspu-dc__stat-num goodsspu-dc__stat-num--brand">{{ statistics.countToday }}</div>
        </div>
      </div>
    </div>

    <div class="goodsspu-dc__card">
      <!-- 上下架 / 库存预警 Tab -->
      <div class="goodsspu-dc__tabs">
        <div class="goodsspu-dc__tabs-inner">
          <div
            v-for="(t, i) in statusTabs"
            :key="t.value"
            :ref="(el) => setTabRef(el, i)"
            class="goodsspu-dc__tab"
            :class="{ 'is-active': statusTab === t.value }"
            @click="handleClickStatusTab(t.value)"
          >
            {{ t.label }}
            <span v-if="t.count !== null" class="goodsspu-dc__tab-badge">{{ t.count }}</span>
          </div>
          <div class="goodsspu-dc__tab-ink" :style="inkStyle" />
        </div>
      </div>

      <!-- 筛选栏 -->
      <div class="goodsspu-dc__filter">
        <div class="goodsspu-dc__filter-item">
          <span class="goodsspu-dc__filter-label">商品名称</span>
          <input
            v-model="searchParams.name"
            class="goodsspu-dc__input"
            placeholder="请输入商品名称"
            @keyup.enter="handleSearch"
          >
        </div>
        <div class="goodsspu-dc__filter-item">
          <span class="goodsspu-dc__filter-label">商品编码</span>
          <input
            v-model="searchParams.spuCode"
            class="goodsspu-dc__input"
            placeholder="请输入商品编码"
            @keyup.enter="handleSearch"
          >
        </div>
        <div class="goodsspu-dc__filter-actions">
          <button class="goodsspu-dc__btn goodsspu-dc__btn--primary" @click="handleSearch">查询</button>
          <button class="goodsspu-dc__btn goodsspu-dc__btn--ghost" @click="handleResetSearch">重置</button>
          <span class="goodsspu-dc__filter-more" @click="filterExpanded = !filterExpanded">
            {{ filterExpanded ? '收起筛选 ▴' : '展开筛选 ▾' }}
          </span>
        </div>
      </div>
      <!-- 展开区 -->
      <div v-if="filterExpanded" class="goodsspu-dc__filter goodsspu-dc__filter--extra">
        <div class="goodsspu-dc__filter-item">
          <span class="goodsspu-dc__filter-label">商品分类</span>
          <el-cascader
            v-model="searchParams.categoryPath"
            class="goodsspu-dc__cascader"
            :options="categoryTreeOptions"
            :props="{ value: 'id', label: 'name', children: 'children', checkStrictly: true }"
            clearable
            placeholder="请选择商品分类"
            @change="handleSearch"
          />
        </div>
        <div class="goodsspu-dc__filter-item">
          <span class="goodsspu-dc__filter-label">商品品牌</span>
          <el-select v-model="searchParams.brandId" placeholder="全部品牌" clearable filterable class="goodsspu-dc__select dc-nsel" @change="handleSearch">
            <el-option v-for="b in brandOptions" :key="b.id" :value="b.id" :label="b.brandName" />
          </el-select>
        </div>
        <div class="goodsspu-dc__filter-item">
          <span class="goodsspu-dc__filter-label">规格类型</span>
          <el-select v-model="searchParams.specType" placeholder="全部" class="goodsspu-dc__select dc-nsel" @change="handleSearch">
            <el-option value="" label="全部" />
            <el-option value="0" label="单规格" />
            <el-option value="1" label="多规格" />
          </el-select>
        </div>
      </div>

      <!-- 工具栏 / 批量条 -->
      <div class="goodsspu-dc__toolbar">
        <template v-if="selectionData.length > 0">
          <span class="goodsspu-dc__sel-count">已选 <b>{{ selectionData.length }}</b> 件</span>
          <template v-if="permissions['mall:goodsspu:edit']">
            <button class="goodsspu-dc__tbtn" @click="batchShelf('1')">{{ $t("mall.goodsspu.menuBatchOn") }}</button>
            <button class="goodsspu-dc__tbtn" @click="batchShelf('0')">{{ $t("mall.goodsspu.menuBatchOff") }}</button>
          </template>
          <!-- 勾选态下分裂按钮整体被批量条替换，导出入口在这里补一个（下拉里那个只导当前筛选） -->
          <button class="goodsspu-dc__tbtn" :disabled="exporting" @click="exportGoodsToExcel">
            <TransferIcon direction="out" :size="14" />{{ exporting ? '导出中…' : '导出选中' }}
          </button>
          <span class="goodsspu-dc__clear" @click="clearSelection">清除选择</span>
        </template>
        <template v-else>
          <button v-if="permissions['mall:goodsspu:add']" class="goodsspu-dc__btn goodsspu-dc__btn--primary goodsspu-dc__new" @click="handleAdd">+ 新建商品</button>

          <!-- 批量导入分裂按钮：左段直接开弹窗，右段展开菜单 -->
          <div v-if="permissions['mall:goodsspu:add']" ref="importSplitRef" class="goodsspu-dc__split">
            <button class="goodsspu-dc__split-main" @click="openImport('upload')">
              <TransferIcon direction="in" :size="15" />批量导入
            </button>
            <button class="goodsspu-dc__split-caret" @click="importMenuOpen = !importMenuOpen">▾</button>
            <span v-if="runningImportCount > 0" class="goodsspu-dc__split-badge">{{ runningImportCount }}</span>
            <div v-if="importMenuOpen" class="goodsspu-dc__split-menu">
              <div v-if="runningImport" class="goodsspu-dc__split-task" @click="openImport('records')">
                <span>{{ runningImportCount }} 个任务导入中</span>
                <b>{{ runningImport.percent || 0 }}%</b>
                <div class="goodsspu-dc__split-mini">
                  <div class="goodsspu-dc__split-mini-bar" :style="{ width: (runningImport.percent || 0) + '%' }" />
                </div>
              </div>
              <div class="goodsspu-dc__split-item" @click="openImport('upload')">
                <TransferIcon direction="in" :size="14" />导入商品
              </div>
              <div class="goodsspu-dc__split-item" @click="openImport('records')">导入记录</div>
              <!-- 导出 = 增量更新模板格式，改完可原样传回，所以入口挨着导入放 -->
              <div class="goodsspu-dc__split-item" @click="exportGoodsToExcel">
                <TransferIcon direction="out" :size="14" />{{ exporting ? '导出中…' : '导出商品（改完可导回）' }}
              </div>
              <div class="goodsspu-dc__split-item" @click="downloadImportTemplate">
                <TransferIcon direction="out" :size="14" />下载导入模板
              </div>
            </div>
          </div>

          <span class="goodsspu-dc__total">共 <b>{{ page.total }}</b> 件商品</span>
        </template>
        <div style="flex:1" />
        <button
          v-if="permissions['mall:goodsspu:edit']"
          class="goodsspu-dc__tbtn"
          :disabled="syncLoading"
          title="把全部商品重新写进搜索引擎（启用 MeiliSearch 且前台搜不到商品时用）"
          @click="syncSearch"
        >{{ syncLoading ? '重建中…' : '重建搜索索引' }}</button>
        <div class="goodsspu-dc__icon-btn" title="刷新" @click="refreshChange">
          <el-icon><Refresh /></el-icon>
        </div>
      </div>

      <!-- 数据表格（CSS grid 自绘） -->
      <div class="goodsspu-dc__table">
        <!-- 表头 -->
        <div class="goodsspu-dc__thead">
          <div class="goodsspu-dc__th goodsspu-dc__th--check">
            <input type="checkbox" :checked="allChecked" @change="toggleAll(($event.target as HTMLInputElement).checked)">
          </div>
          <div class="goodsspu-dc__th">商品</div>
          <div class="goodsspu-dc__th">分类</div>
          <div class="goodsspu-dc__th goodsspu-dc__th--sort" @click="toggleSort('priceDown')">价格<i :class="sortArrow('priceDown')" /></div>
          <div class="goodsspu-dc__th goodsspu-dc__th--sort" @click="toggleSort('saleNum')">销量<i :class="sortArrow('saleNum')" /></div>
          <div class="goodsspu-dc__th goodsspu-dc__th--sort" @click="toggleSort('stockTotal')">库存<i :class="sortArrow('stockTotal')" /></div>
          <div class="goodsspu-dc__th">上架</div>
          <div class="goodsspu-dc__th">规格</div>
          <div class="goodsspu-dc__th goodsspu-dc__th--right">操作</div>
        </div>

        <!-- 骨架 -->
        <DcSkeleton v-if="tableLoadingStage === 'skeleton'" />
        <!-- 空态 -->
        <div v-else-if="!tableLoading && tableData.length === 0" class="goodsspu-dc__empty goodsspu-dc__empty--goods">
          <img class="goodsspu-dc__empty-image" :src="emptyImg" alt="暂无商品">
          <div class="goodsspu-dc__empty-title">暂无商品</div>
          <div class="goodsspu-dc__empty-desc">试试更换关键词或重置筛选条件</div>
          <span class="goodsspu-dc__empty-cta" @click="handleResetSearch">重置筛选</span>
        </div>

        <!-- 数据行 -->
        <template v-else>
          <div
            v-for="row in tableData"
            :key="row.id"
            class="goodsspu-dc__tr"
            :class="{ 'is-checked': isRowChecked(row) }"
          >
            <div class="goodsspu-dc__td goodsspu-dc__td--check">
              <input type="checkbox" :checked="isRowChecked(row)" @change="toggleRow(row, ($event.target as HTMLInputElement).checked)">
            </div>
            <!-- 商品 -->
            <div class="goodsspu-dc__product">
              <div class="goodsspu-dc__thumb">
                <el-image
                  v-if="firstPic(row)"
                  :src="firstPic(row)"
                  fit="cover"
                  :preview-src-list="row.picUrls.length ? row.picUrls : [firstPic(row)]"
                  :preview-teleported="true"
                />
                <span v-else>{{ (row.name || '商').slice(0, 1) }}</span>
              </div>
              <div class="goodsspu-dc__product-main">
                <div class="goodsspu-dc__product-name" :title="row.name">{{ row.name || '—' }}</div>
                <div class="goodsspu-dc__product-meta">
                  <span class="goodsspu-dc__code">
                    {{ row.spuCode || '—' }}
                    <el-icon v-if="row.spuCode" class="goodsspu-dc__copy" @click="copyText(row.spuCode)"><DocumentCopy /></el-icon>
                  </span>
                </div>
              </div>
            </div>
            <!-- 分类 -->
            <div class="goodsspu-dc__cell-cat" :title="row.categoryIdText">{{ row.categoryIdText || '—' }}</div>
            <!-- 价格 / 销量 / 库存 -->
            <div class="goodsspu-dc__cell-price">{{ row.priceDown != null ? `¥${row.priceDown}` : '—' }}</div>
            <div class="goodsspu-dc__cell-num">{{ row.saleNum ?? 0 }}</div>
            <div
              class="goodsspu-dc__cell-stock"
              :class="stockClass(row)"
              :title="`预警线 ${warnLineOf(row)}`"
            >{{ row.stockTotal }}</div>
            <!-- 上架开关 -->
            <div class="goodsspu-dc__cell-state">
              <span
                class="goodsspu-dc__switch"
                :class="{ 'is-on': row.shelf === '1' }"
                @click="permissions['mall:goodsspu:edit'] && handleShelf(row, row.shelf === '1' ? '0' : '1')"
              >
                <span class="goodsspu-dc__switch-dot" />
              </span>
            </div>
            <!-- 规格 -->
            <div class="goodsspu-dc__cell-spec">{{ row.specTypeText || '—' }}</div>
            <!-- 操作 -->
            <div class="goodsspu-dc__cell-action">
              <span v-if="permissions['mall:goodsspu:edit']" class="goodsspu-dc__link" @click="handleEdit(row)">编辑</span>
              <span class="goodsspu-dc__link" @click="handleDetail(row)">详情</span>
              <el-dropdown trigger="click">
                <span class="goodsspu-dc__more">···</span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="permissions['mall:goodssku:edit']" @click="handleStock(row)"><span style="color: var(--dc-info)">库存</span></el-dropdown-item>
                    <el-dropdown-item @click="handlePreview(row)"><span style="color: var(--dc-info)">商品预览</span></el-dropdown-item>
                    <el-dropdown-item
                      v-if="permissions['mall:goodsspu:del']"
                      :disabled="row.shelf === '1'"
                      divided
                      @click="handleDel(row)"
                    >
                      <span style="color: var(--dc-danger)">删除</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </template>
      </div>

      <!-- 分页（自绘，调现有 onPageChange/onSizeChange） -->
      <div v-if="tableData.length > 0" class="goodsspu-dc__pager">
        <span>共 {{ page.total }} 件</span>
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
      </div>
    </div>

    <!-- 详情抽屉 -->
    <GoodsDetailDrawer :visible="detailDrawerVisible" :goods-id="detailGoodsId"
      @update:visible="detailDrawerVisible = $event" />

    <!-- 编辑商品抽屉 -->
    <GoodsEditDrawer :visible="editDrawerVisible" :goods-id="editGoodsId" @update:visible="editDrawerVisible = $event"
      @success="handleEditSuccess" />

    <!-- 库存弹窗 -->
    <StockDialog :visible="stockDialogVisible" :goods-id="stockDialogGoodsId" :goods-name="stockDialogGoodsName"
      :goods-image="stockDialogGoodsImage" @update:visible="stockDialogVisible = $event" @success="refreshChange" />

    <!-- 商品预览弹窗 -->
    <PreviewDialog :visible="previewDialogVisible" :goods-id="previewDialogGoodsId"
      @update:visible="previewDialogVisible = $event" />

    <!-- 批量导入弹窗 -->
    <GoodsImportDialog v-model="importDialogVisible" :initial-view="importDialogView"
      @refresh="handleImportFinished" />
  </div>
</template>

<script lang="ts" setup>
/**
 * 商品列表页（自绘）
 *
 * 结构（样式集中于 goods-list-dc.scss）：
 * - Banner 统计条 + 上下架 / 库存预警 Tab
 * - 自绘筛选栏 + 自绘工具栏/批量条
 * - CSS grid 九列自绘表格
 * - 自绘分页
 * 单店铺、发布即上架，没有审核流程。
 */

import { usePermissionStoreHook } from '@/store/modules/permission'
import { DocumentCopy, Refresh } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { computed, getCurrentInstance, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

// API & Utils
import { getList as getBrandList } from '@/api/mall/goodsbrand'
import {
  delObj,
  getCount,
  getPage,
  getStatistics,
  goodscategoryTree,
  meiliSearchSync,
  putObjShelf,
} from '@/api/mall/goodsspu'
import {
  downloadTemplate,
  exportGoods,
  getRunningTasks,
  saveBlob,
} from '@/api/mall/goodsimport'
import { filterForm } from '@/utils/util'
import { onClickOutside } from '@vueuse/core'

// 子组件
import GoodsImportDialog from './components/GoodsImportDialog.vue'
import TransferIcon from './components/TransferIcon.vue'
import GoodsDetailDrawer from './components/GoodsDetailDrawer.vue'
import GoodsEditDrawer from './components/GoodsEditDrawer.vue'
import PreviewDialog from './components/PreviewDialog.vue'
import StockDialog from './components/StockDialog.vue'

import { DcSkeleton, useLoadingStage } from '@/components/dc-states'
import { useDangerConfirm } from '@/components/DangerConfirm'

import '../goods-list-dc.scss'
import emptyImg from '@/assets/common/empty.png'
import { appConfirm } from '@/components/overlay'
import { usePagerClamp } from '@/hooks/usePagerClamp'

/** 商品未配置预警线时的兜底值（与后端列表查询 COALESCE(stock_warn_line, 20) 一致） */
const DEFAULT_STOCK_WARN_LINE = 20

// ==================== 响应式数据 ====================
const route = useRoute()
const { proxy } = getCurrentInstance()!

/** Tab：all 全部 / on 已上架 / off 已下架 / warn 库存预警 */
type StatusTab = 'all' | 'on' | 'off' | 'warn'
const statusTab = ref<StatusTab>('all')
const tableLoading = ref(false)
const tableData = ref<any[]>([])
const selectionData = ref<any[]>([])
const { stage: tableLoadingStage } = useLoadingStage(tableLoading)
const searchParams = ref<Record<string, any>>({})
const editDrawerVisible = ref(false)
const detailDrawerVisible = ref(false)
const detailGoodsId = ref('')
const editGoodsId = ref('')
const stockDialogVisible = ref(false)
const stockDialogGoodsId = ref('')
const stockDialogGoodsName = ref('')
const stockDialogGoodsImage = ref('')
const previewDialogVisible = ref(false)
const previewDialogGoodsId = ref('')

// ==================== 权限 ====================
const permissions = computed(() => usePermissionStoreHook()?.permissions || {})

// ==================== 批量导入入口 ====================
const importDialogVisible = ref(false)
const importDialogView = ref<'upload' | 'records'>('upload')
const importMenuOpen = ref(false)
const importSplitRef = ref<HTMLElement | null>(null)
const exporting = ref(false)
onClickOutside(importSplitRef, () => (importMenuOpen.value = false))
const runningImports = ref<any[]>([])
const runningImportCount = computed(() => runningImports.value.length)
const runningImport = computed(() => runningImports.value[0] || null)

function openImport(view: 'upload' | 'records') {
  importMenuOpen.value = false
  importDialogView.value = view
  importDialogVisible.value = true
}

/**
 * 导出现有商品 → 在 Excel 里改 → 用「批量导入·增量更新模板」传回去。
 *
 * 勾选优先，没勾就导当前筛选条件下的商品（后端按 500 行封顶，按商品边界截断）。
 * 导完必须把「改价要勾同步价格」讲清楚：导入侧 syncPrice 默认关，不勾的话价格列被忽略，
 * 运营会以为改价失败。
 */
async function exportGoodsToExcel() {
  importMenuOpen.value = false
  if (exporting.value) return
  const ids = selectionData.value.map((i: any) => i.id).filter(Boolean).join(',')
  exporting.value = true
  try {
    const blob = await exportGoods(buildQuery(), ids || undefined)
    const stamp = new Date().toLocaleString('sv').replace(/[-: ]/g, '').slice(0, 12)
    saveBlob(blob, `商品导出_${stamp}.xlsx`)
    ElMessageBox.alert(
      `已导出${ids ? `勾选的 ${selectionData.value.length} 件` : '当前筛选条件下的'}商品（单次最多 500 行，超出的请用筛选分批导）。<br><br>`
      + '1. 改完到「批量导入」里选 <b>增量更新模板</b> 上传，按「商品编码」匹配已有商品。<br>'
      + '2. <b>留空 = 不修改</b>；不想动的列保持原样即可。<br>'
      + '3. <b>要改销售价 / 市场价 / 成本价，上传时必须在「高级设置」里勾上「同步价格」</b>，否则价格列会被忽略。<br>'
      + '4. 商品详情可直接粘 &lt;img src="..."&gt; 换图；原内容超出 Excel 单元格上限的已导成空白（见「参考·详情字数」列），留空不会覆盖原详情。',
      '导出成功',
      { dangerouslyUseHTMLString: true, confirmButtonText: '知道了' },
    ).catch(() => { })
  } catch (e: any) {
    proxy.$message.error(e?.msg || e?.message || '导出失败，请稍后重试')
  } finally {
    exporting.value = false
  }
}

async function downloadImportTemplate() {
  importMenuOpen.value = false
  try {
    const blob = await downloadTemplate('add')
    saveBlob(blob, '商品新增模板.xlsx')
  } catch {
    proxy.$message.error('模板下载失败，请稍后重试')
  }
}

/** 角标只在刷列表时顺带查一次，不单开轮询——导入中的进度在弹窗里看 */
async function loadRunningImports() {
  if (!permissions.value['mall:goodsspu:add']) return
  try {
    const res = await getRunningTasks()
    runningImports.value = res?.data || []
  } catch {
    runningImports.value = []
  }
}

function handleImportFinished() {
  refreshChange()
  void loadRunningImports()
}

const page = reactive({
  total: 0,
  currentPage: 1,
  pageSize: 20,
  ascs: '',
  descs: 'create_time',
})

// ==================== Banner 统计 / Tab 计数 ====================
const statistics = reactive({ countTotal: 0, countToday: 0 })
const shelfCount = reactive<{ on: number | null; off: number | null }>({ on: null, off: null })

function loadStatistics() {
  if (permissions.value['mall:goodsspu:statistics']) {
    getStatistics().then((res: any) => {
      statistics.countTotal = Number(res?.data?.countTotal) || 0
      statistics.countToday = Number(res?.data?.countToday) || 0
    }).catch(() => { })
  }
  if (permissions.value['mall:goodsspu:count']) {
    getCount({ shelf: '1' }).then((res: any) => { shelfCount.on = Number(res?.data) || 0 }).catch(() => { })
    getCount({ shelf: '0' }).then((res: any) => { shelfCount.off = Number(res?.data) || 0 }).catch(() => { })
  }
}

const statusTabs = computed(() => [
  { value: 'all' as StatusTab, label: proxy.$t('commons.allGoods'), count: statistics.countTotal || null },
  { value: 'on' as StatusTab, label: '已上架', count: shelfCount.on },
  { value: 'off' as StatusTab, label: '已下架', count: shelfCount.off },
  { value: 'warn' as StatusTab, label: '库存预警', count: null },
])
const tabRefs = ref<HTMLElement[]>([])
function setTabRef(el: any, i: number) {
  if (el) tabRefs.value[i] = el as HTMLElement
}
const inkStyle = ref({ left: '0px', width: '0px' })
async function updateInk() {
  await nextTick()
  const idx = statusTabs.value.findIndex(x => x.value === statusTab.value)
  const el = tabRefs.value[idx]
  if (el) inkStyle.value = { left: `${el.offsetLeft}px`, width: `${el.offsetWidth}px` }
}
function handleClickStatusTab(val: StatusTab) {
  statusTab.value = val
  page.currentPage = 1
  clearSelection()
  getPageF()
  updateInk()
}
onMounted(updateInk)
watch([statusTab, () => statistics.countTotal, () => shelfCount.on, () => shelfCount.off], updateInk)

// ==================== 筛选栏展开态 ====================
const filterExpanded = ref(false)

// ==================== 自绘表格：选择态 ====================
const selectedIds = ref(new Set<string>())
function clearSelection() {
  selectionData.value = []
  selectedIds.value.clear()
}
function isRowChecked(row: any) {
  return selectedIds.value.has(row.id)
}
function toggleRow(row: any, checked: boolean) {
  if (checked) selectedIds.value.add(row.id)
  else selectedIds.value.delete(row.id)
  syncSelection()
}
const allChecked = computed(
  () => tableData.value.length > 0 && tableData.value.every(r => selectedIds.value.has(r.id)),
)
function toggleAll(checked: boolean) {
  if (checked) tableData.value.forEach(r => selectedIds.value.add(r.id))
  else tableData.value.forEach(r => selectedIds.value.delete(r.id))
  syncSelection()
}
// 保持 selectionData 为 row 对象数组，供 batchShelf / 导出使用
function syncSelection() {
  selectionData.value = tableData.value.filter(r => selectedIds.value.has(r.id))
}

// ==================== 自绘表格：排序三态（asc → desc → 默认）====================
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

// ==================== 自绘表格：单元格展示辅助 ====================
function firstPic(row: any) {
  return row.picUrls?.[0] || ''
}
function warnLineOf(row: any) {
  const n = Number(row.stockWarnLine)
  return Number.isFinite(n) && row.stockWarnLine !== null && row.stockWarnLine !== '' ? n : DEFAULT_STOCK_WARN_LINE
}
function stockClass(row: any) {
  const n = Number(row.stockTotal) || 0
  if (n <= 0) return 'is-danger'
  if (n <= warnLineOf(row)) return 'is-warning'
  return ''
}
function copyText(txt: string) {
  if (!txt) return
  navigator.clipboard?.writeText(txt)
  proxy.$message.success('已复制')
}

// ==================== 自绘分页（页码列表计算）====================
const totalPages = computed(() => Math.max(1, Math.ceil(page.total / page.pageSize)))
// 页码越界自愈：末页删掉最后一行 / 筛窄结果后，别停在空白页配着「共 N 条」
usePagerClamp(
  () => page.total,
  () => page.currentPage,
  () => page.pageSize,
  onPageChange,
)
const pageList = computed<(number | string)[]>(() => {
  const cur = page.currentPage
  const last = totalPages.value
  const out: (number | string)[] = []
  out.push(1)
  if (cur > 3) out.push('…')
  for (let i = Math.max(2, cur - 1); i <= Math.min(last - 1, cur + 1); i++) out.push(i)
  if (cur < last - 2) out.push('…')
  if (last > 1) out.push(last)
  return out
})

// ==================== 字典：分类树 / 品牌 ====================
const categoryTreeOptions = ref<any[]>([])
// 分类ID → 名称映射表
const categoryIdsDict = ref<Record<string, any>>({})
const brandOptions = ref<any[]>([])

function loadCategoryTree() {
  goodscategoryTree().then((res: any) => {
    const treeData = Array.isArray(res) ? res : res?.data || []
    categoryTreeOptions.value = Array.isArray(treeData) ? treeData : []
    const dict: Record<string, any> = {}
    const walk = (nodes: any[]) => {
      if (!nodes) return
      for (const node of nodes) {
        if (node.id != null) dict[node.id] = node
        if (node.children?.length) walk(node.children)
      }
    }
    walk(categoryTreeOptions.value)
    categoryIdsDict.value = dict
    // 分类树晚于列表返回时补一次名称
    tableData.value.forEach(fillCategoryText)
  }).catch(() => {
    categoryTreeOptions.value = []
  })
}

function loadBrandOptions() {
  getBrandList().then((res: any) => {
    brandOptions.value = Array.isArray(res?.data) ? res.data : []
  }).catch(() => {
    brandOptions.value = []
  })
}

function fillCategoryText(item: any) {
  item.categoryIdText = [item.categoryFirst, item.categorySecond, item.categoryThird]
    .filter(Boolean)
    .map(id => categoryIdsDict.value[id]?.name || id)
    .join(' | ') || '—'
}

// ==================== 数据加载 ====================
/** 筛选栏 + Tab 拼成后端查询参数（空值不下发）；导出与列表共用 */
function buildQuery() {
  const { categoryPath, ...rest } = searchParams.value
  const path: string[] = Array.isArray(categoryPath) ? categoryPath : []
  return filterForm({
    ...rest,
    categoryFirst: path[0],
    categorySecond: path[1],
    categoryThird: path[2],
    shelf: statusTab.value === 'on' ? '1' : statusTab.value === 'off' ? '0' : undefined,
    stockWarning: statusTab.value === 'warn' ? true : undefined,
  })
}

function getPageF() {
  tableLoading.value = true
  return getPage({
    current: page.currentPage,
    size: page.pageSize,
    descs: page.descs,
    ascs: page.ascs,
    ...buildQuery(),
  }).then((response: any) => {
    tableLoading.value = false
    const records = response.data.records || []
    records.forEach((item: any) => {
      fillCategoryText(item)
      if (!Array.isArray(item.picUrls)) item.picUrls = item.picUrl ? [item.picUrl] : []
      // 库存：后端 selectPage1 已聚合 SKU stock 返回
      item.stockTotal = Number(item.stock) || 0
      item.specTypeText = item.specType === '1' ? '多规格' : '单规格'
    })
    tableData.value = records
    page.total = response.data.total ?? 0
    page.currentPage = response.data.current ?? page.currentPage
    page.pageSize = response.data.size ?? page.pageSize
  }).catch(() => {
    tableLoading.value = false
  })
}

// ==================== 搜索/重置/分页/排序 ====================
function handleSearch() {
  page.currentPage = 1
  getPageF()
}
function handleResetSearch() {
  searchParams.value = {}
  page.currentPage = 1
  getPageF()
}
function onPageChange(p: number) {
  page.currentPage = p
  getPageF()
}
function onSizeChange(s: number) {
  page.pageSize = s
  page.currentPage = 1
  getPageF()
}
function sortChange({ prop, order }: { prop: string; order: string | null }) {
  const colName = prop.replace(/([A-Z])/g, '_$1').toLowerCase()
  if (order === 'ascending') { page.ascs = colName; page.descs = '' }
  else if (order === 'descending') { page.ascs = ''; page.descs = colName }
  else { page.ascs = ''; page.descs = 'create_time' }
  getPageF()
}

// ==================== 工具栏操作 ====================
function refreshChange() {
  getPageF()
  loadStatistics()
}

function handleEditSuccess() {
  refreshChange()
}

function batchShelf(shelf: string) {
  if (selectionData.value.length <= 0) { proxy.$message.error('请先选择商品'); return }
  const actionName = shelf === '1' ? '批量上架' : '批量下架'
  const count = selectionData.value.length
  const sampleNames = selectionData.value.slice(0, 3).map((i: any) => i.name).filter(Boolean).join('、')
  // 批量上下架直接影响商城前台商品展示，必须二次确认；权限与审计由后端负责
  useDangerConfirm({
    actionName,
    impact: `将对 ${count} 件商品执行${actionName}：${sampleNames}${count > 3 ? ` 等 ${count} 件` : ''}。\n操作立即生效并影响商城前台商品展示。`,
    requireTypedName: actionName,
  }).then(() => {
    const ids = selectionData.value.map((i: any) => i.id).join(',')
    return putObjShelf({ ids, shelf }).then(() => {
      clearSelection()
      refreshChange()
    })
  }).catch(() => { })
}

/** 单条商品上架/下架 */
function handleShelf(row: any, shelf: string) {
  const label = shelf === '1' ? '上架' : '下架'
  appConfirm({ intent: 'confirm', title: `确定${label}该商品吗？`, verb: label })
    .then(() => putObjShelf({ ids: row.id, shelf }))
    .then(() => refreshChange())
    .catch(() => { })
}

/**
 * 重建搜索索引（MeiliSearch）：商品改了但前台搜不到时的兜底入口。
 * 后端未启用 MeiliSearch 时返回 code=1 与原因（商品搜索直接查库，无需重建），
 * 这条提示由 http 拦截器统一弹出，这里不再重复。
 */
const syncLoading = ref(false)
function syncSearch() {
  appConfirm({
    intent: 'confirm',
    title: '确认把全部商品重新写进搜索引擎？',
    verb: '重建',
  })
    .then(() => {
      syncLoading.value = true
      return meiliSearchSync()
    })
    .then((response: any) => {
      syncLoading.value = false
      proxy.$message.success(response?.data || '重建完成')
    })
    .catch(() => {
      // appConfirm 取消、接口失败都走这里；失败原因拦截器已提示
      syncLoading.value = false
    })
}

// ==================== 行操作 ====================
function handleAdd() {
  editGoodsId.value = ''
  editDrawerVisible.value = true
}

function handleEdit(row: any) {
  editGoodsId.value = row.id
  editDrawerVisible.value = true
}

function handleDetail(row: any) {
  detailGoodsId.value = row.id
  detailDrawerVisible.value = true
}

function handleStock(row: any) {
  stockDialogGoodsId.value = row.id
  stockDialogGoodsName.value = row.name || ''
  stockDialogGoodsImage.value = firstPic(row)
  stockDialogVisible.value = true
}

function handlePreview(row: any) {
  previewDialogGoodsId.value = row.id
  previewDialogVisible.value = true
}

function handleDel(row: any) {
  appConfirm({ intent: 'delete', title: '删除该商品？', verb: '删除' })
    .then(() => delObj(row.id))
    .then(() => { proxy.$message.success('删除成功'); refreshChange() })
    .catch(() => { })
}

// ==================== 初始化 ====================
// 首页待办卡片带 ?shelf=1 / ?shelf=0 跳进来时直接落到对应 Tab
const initShelf = route.query.shelf as string
if (initShelf === '1') statusTab.value = 'on'
else if (initShelf === '0') statusTab.value = 'off'

loadCategoryTree()
loadBrandOptions()
refreshChange()
void loadRunningImports()
watch(() => route.query.spuId as string, (spuId: string) => {
  // 外部带 ?spuId= 跳进来时直接打开该商品详情抽屉
  if (spuId) { detailGoodsId.value = spuId; detailDrawerVisible.value = true }
}, { immediate: true })
</script>

<style lang="scss" scoped>
.goodsspu-dc__empty--goods {
  padding: 32px 0 38px;
}

.goodsspu-dc__empty-image {
  display: block;
  width: clamp(180px, 22vw, 240px);
  height: auto;
  margin-bottom: 8px;
  object-fit: contain;
}
</style>
