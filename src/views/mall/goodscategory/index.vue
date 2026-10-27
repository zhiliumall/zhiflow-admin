<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
  <div class="gcat-dc">
    <!-- ══ 顶部 Banner ══ -->
    <div class="gcat-dc__banner">
      <div class="gcat-dc__banner-grid" />
      <div class="gcat-dc__banner-glow gcat-dc__banner-glow--1" />
      <div class="gcat-dc__banner-glow gcat-dc__banner-glow--2" />
      <div class="gcat-dc__banner-head">
        <div class="gcat-dc__banner-title">商品类目</div>
        <div class="gcat-dc__banner-sub">维护分类层级与各端展示素材，决定商城分类页结构</div>
      </div>
      <div style="flex:1" />
      <div class="gcat-dc__banner-art" aria-hidden="true">
        <span class="gcat-dc__art-tree">
          <svg width="44" height="40" viewBox="0 0 26 24" fill="none">
            <rect x="1" y="2" width="10" height="7" rx="1.6" fill="#EBF0FF" stroke="#3C6EF0" stroke-width="1.3" />
            <path d="M6 9v4h8" stroke="#9DB6F8" stroke-width="1.3" stroke-linecap="round" />
            <rect x="14" y="4" width="10" height="6" rx="1.4" fill="#fff" stroke="#9DB6F8" stroke-width="1.2" />
            <rect x="14" y="14" width="10" height="6" rx="1.4" fill="#fff" stroke="#9DB6F8" stroke-width="1.2" />
          </svg>
        </span>
        <span class="gcat-dc__art-check">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" fill="#FFF7E6" stroke="#FA8C16" stroke-width="1.4" />
            <path d="M8 12.5 11 15.5 16 9.5" stroke="#FA8C16" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="gcat-dc__art-dot-a" />
        <span class="gcat-dc__art-dot-b" />
      </div>
      <div class="gcat-dc__banner-stats">
        <div class="gcat-dc__stat">
          <div class="gcat-dc__stat-label">一级类目</div>
          <div class="gcat-dc__stat-num">{{ rootCount }}</div>
        </div>
        <div class="gcat-dc__stat gcat-dc__stat--divider">
          <div class="gcat-dc__stat-label">已启用</div>
          <div class="gcat-dc__stat-num gcat-dc__stat-num--brand">{{ enabledCount }}</div>
        </div>
      </div>
    </div>

    <basic-container>
      <div class="gcat-dc__card">
        <!-- ══ 工具栏 ══ -->
        <div class="gcat-dc__toolbar">
          <button
            v-if="permissions['mall:goodscategory:add']"
            class="gcat-dc__new"
            @click="handleAddRoot"
          >
            + 新增一级类目
          </button>
          <div class="gcat-dc__search">
            <input v-model="keyword" class="gcat-dc__search-input" placeholder="搜索类目名称，自动定位">
            <svg
              class="gcat-dc__search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="#C0C7D1" stroke-width="1.8" stroke-linecap="round"
            >
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
          </div>
          <span class="gcat-dc__total">共 <b>{{ totalCount }}</b> 个类目 · 拖动 ⠿ 可在同级内排序</span>
          <div style="flex:1" />
          <span class="gcat-dc__expand-all" @click="toggleExpandAll">{{ expandAllText }}</span>
          <div class="gcat-dc__icon-btn" title="刷新" @click="refreshChange">
            <el-icon><Refresh /></el-icon>
          </div>
        </div>

        <!-- ══ 表头 ══ -->
        <div class="gcat-dc__grid-cols gcat-dc__thead">
          <div />
          <div>类目名称</div>
          <div>状态</div>
          <div>展示素材</div>
          <div>最后更新</div>
          <div class="gcat-dc__th--right">操作</div>
        </div>

        <!-- ══ 骨架 ══ -->
        <div v-if="loadingStage === 'skeleton'" class="gcat-dc__skeleton">
          <DcSkeleton />
        </div>

        <!-- ══ 空态 ══ -->
        <div v-else-if="!tableLoading && tableData.length === 0" class="gcat-dc__empty">
          <DcEmptyImage
            :src="emptyImg"
            alt="商品类目配置空状态插画"
          />
          <div class="gcat-dc__empty-title">还没有商品类目</div>
          <div class="gcat-dc__empty-desc">先建分类骨架，再为商品归类</div>
          <div class="gcat-dc__empty-actions">
            <button v-if="permissions['mall:goodscategory:add']" class="gcat-dc__empty-btn" @click="handleAddRoot">
              + 新增一级类目
            </button>
          </div>
          <div class="gcat-dc__empty-tip">建议先建 3–5 个一级类目，再往下挂子类目</div>
        </div>

        <!-- ══ 搜索无匹配 ══ -->
        <div v-else-if="!tableLoading && keyword.trim() && flatRows.length === 0" class="gcat-dc__empty">
          <DcEmptyImage
            :src="emptyImg"
            alt="暂无匹配类目插画"
          />
          <div class="gcat-dc__empty-title">暂无匹配类目</div>
          <div class="gcat-dc__empty-desc">换个关键词试试，或清空筛选查看全部类目</div>
          <div class="gcat-dc__empty-actions">
            <button class="gcat-dc__empty-btn" @click="keyword = ''">清空筛选</button>
          </div>
        </div>

        <!-- ══ 树形行 ══ -->
        <template v-else>
          <div
            v-for="r in flatRows"
            :key="r.node.id"
            class="gcat-dc__grid-cols gcat-dc__row"
            :class="{ 'is-child': r.level >= 1, 'is-grandchild': r.level === 2, 'is-dragging': dragId === r.node.id }"
            @dragover="onDragOver($event, r)"
            @drop="onDrop($event, r)"
          >
            <div
              v-if="overKey === rowKey(r) && dragParentKey === parentKeyOf(r)"
              class="gcat-dc__drop-line"
            />
            <!-- 拖拽手柄 -->
            <div
              class="gcat-dc__handle"
              draggable="true"
              title="拖拽调整同级顺序"
              @dragstart="onDragStart(r)"
              @dragend="onDragEnd"
            >⠿</div>

            <!-- 类目名称 -->
            <div class="gcat-dc__name-cell">
              <!-- 每深一层多画一组缩进引导线，三级比二级再缩进一格 -->
              <template v-for="d in r.level" :key="d">
                <span class="gcat-dc__indent-line" />
                <span class="gcat-dc__indent-tick" />
              </template>
              <span
                v-if="r.hasKids"
                class="gcat-dc__toggle"
                :class="{ 'is-open': isExpanded(r.node.id) }"
                @click="toggleExpand(r.node.id)"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#8A93A3" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 5l8 7-8 7" />
                </svg>
              </span>
              <span v-else class="gcat-dc__toggle-spacer" />
              <!-- 有素材就显示素材（C 端分类页显示的正是这张图），无图才回落色块首字 -->
              <img
                v-if="iconSrc(r.node)"
                class="gcat-dc__icon gcat-dc__icon--img"
                :src="iconSrc(r.node)"
                :alt="r.node.name"
                loading="lazy"
                @error="onIconError(r.node)"
              >
              <span v-else class="gcat-dc__icon" :style="{ background: iconBg(r.node) }">{{ iconChar(r.node) }}</span>
              <div class="gcat-dc__name-main">
                <div class="gcat-dc__name-top">
                  <span
                    class="gcat-dc__name-text"
                    :class="{ 'is-root': r.level === 0, 'is-child': r.level >= 1, 'is-hl': isMatch(r.node) }"
                    :title="r.node.name"
                  >{{ r.node.name }}</span>
                  <span v-if="r.hasKids" class="gcat-dc__kids-n">({{ r.node.children.length }})</span>
                </div>
                <div class="gcat-dc__name-sub">排序 {{ r.node.sort ?? '-' }}</div>
              </div>
            </div>

            <!-- 状态开关 -->
            <div>
              <span
                class="gcat-dc__switch"
                :class="{ 'is-on': String(r.node.enable) === '1', 'is-disabled': !permissions['mall:goodscategory:edit'] }"
                @click="toggleEnable(r.node)"
              >
                <span class="gcat-dc__switch-dot" />
              </span>
            </div>

            <!-- 展示素材 -->
            <div class="gcat-dc__mat">
              <div class="gcat-dc__thumbs">
                <span
                  v-for="(m, i) in matSlots(r.node)"
                  :key="i"
                  class="gcat-dc__thumb"
                  :class="{ 'gcat-dc__thumb--empty': !m.url }"
                >
                  <el-image v-if="m.url" :src="m.url" fit="cover" :preview-src-list="[m.url]" :preview-teleported="true" />
                </span>
              </div>
              <span class="gcat-dc__mat-pill" :class="matPill(r.node).cls">{{ matPill(r.node).text }}</span>
            </div>

            <!-- 最后更新 -->
            <div class="gcat-dc__upd">
              <template v-if="r.node.updateTime">
                <div class="gcat-dc__upd-d">{{ String(r.node.updateTime).slice(0, 10) }}</div>
                <div class="gcat-dc__upd-t">{{ String(r.node.updateTime).slice(11) }}</div>
              </template>
              <span v-else class="gcat-dc__upd-none">--</span>
            </div>

            <!-- 操作 -->
            <div class="gcat-dc__ops">
              <span
                v-if="permissions['mall:goodscategory:edit']"
                class="gcat-dc__op"
                @click="handleEdit(r.node)"
              >编辑</span>
              <!-- 一级、二级都能加子分类；三级不再往下（商品只有 first/second/third 三个字段） -->
              <span
                v-if="r.level < 2 && permissions['mall:goodscategory:add']"
                class="gcat-dc__op"
                @click="handleAddSubcategory(r.node)"
              >添加子分类</span>
              <span
                v-if="permissions['mall:goodscategory:del']"
                class="gcat-dc__op gcat-dc__op--del"
                :class="{ 'gcat-dc__op--disabled': r.hasKids }"
                :title="r.hasKids ? `含 ${r.node.children.length} 个子分类，请先处理` : '删除类目'"
                @click="handleDel(r.node)"
              >删除</span>
            </div>
          </div>
        </template>

        <!-- ══ avue-crud 表单宿主：仅用于新增/编辑内置表单，表格自绘不使用 ══ -->
        <div class="gcat-dc__form-host" aria-hidden="true">
          <avue-crud
            ref="crud" v-model="form" :data="tableData" :permission="permissionList"
            :table-loading="tableLoading" :option="tableOption" :before-open="beforeOpen"
            @row-update="handleUpdate" @row-save="handleSave"
          >
            <template v-slot:picUrl-form>
              <div>
                <material-list v-model:value="form.picUrl" type="image" :num="1" :width="form.parentId == '0' ? 300 : 150"
                  :height="150" />
                <p v-if="form.parentId" class="lib-text-tips">
                  {{ $t("commons.imageSizeTip", { size: form.parentId == "0" ? "180*180" : "100*100" }) }}
                </p>
              </div>
            </template>
            <template v-slot:mobilePicUrl-form>
              <div>
                <material-list v-model:value="form.mobilePicUrl" type="image" :num="1"
                  :width="form.parentId == '0' ? 300 : 150" :height="150" />
                <p v-if="form.parentId" class="lib-text-tips">{{ $t("commons.imageSizeTip", { size: "720*280" }) }}</p>
              </div>
            </template>
            <template v-slot:mobileAdImageUrl-form>
              <div>
                <material-list v-model:value="form.mobileAdImageUrl" type="image" :num="1" :width="375" :height="150" />
                <p class="lib-text-tips">{{ $t("commons.imageSizeTip", { size: "750*300" }) }}</p>
              </div>
            </template>
            <template v-slot:enable="scope">
              <el-switch v-model="scope.row.enable" :disabled="!permissions['mall:goodscategory:edit']" active-value="1"
                inactive-value="0" inline-prompt active-icon="Check" inactive-icon="Close"
                @change="changeEnable(scope.row)" />
            </template>
          </avue-crud>
        </div>
      </div>
    </basic-container>

    <!-- 添加子分类抽屉 -->
    <AddSubcategoryDrawer v-model:visible="subcategoryDrawerVisible" :parent-category="currentParentCategory"
      :category-tree="categoryTreeData" @success="getPageF" />
  </div>
</template>
<script lang="ts" setup>
import { addObj, delObj, fetchTree, putObj } from '@/api/mall/goodscategory'
import MaterialList from '@/components/material/list.vue'
import { tableOption } from '@/const/crud/mall/goodscategory'
import { usePermissionStoreHook } from '@/store/modules/permission'
import { appConfirm } from '@/components/overlay'
import { Refresh } from '@element-plus/icons-vue'
import { cloneDeep } from '@pureadmin/utils'
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import AddSubcategoryDrawer from './components/AddSubcategoryDrawer.vue'
import { DcEmptyImage, DcSkeleton, useLoadingStage } from '@/components/dc-states'

import '../goodscategory-dc.scss'
import emptyImg from '@/assets/common/empty.png'

const { proxy } = getCurrentInstance()!

// 数据可视化 8 色（类目图标底色）
const VIZ = ['#3c6ef0', '#26bf66', '#ff8800', '#0e9cb8', '#7262fd', '#b542d8', '#e8684a', '#17c3b2']

const form = ref<any>({
  parentId: '',
  picUrl: undefined,
  mobilePicUrl: undefined,
  mobileAdImageUrl: undefined,
})
const tableData = ref<any[]>([])
const tableLoading = ref(false)
const crud = ref<any>(null)

// 加载反馈分级：>1s 显示骨架屏（四态展示用）
const { stage: loadingStage } = useLoadingStage(tableLoading)

// 自绘树：展开态 / 搜索
const expandedIds = ref<Array<string | number>>([])
const keyword = ref('')

// 拖拽排序态
const dragId = ref<string | number | null>(null)
const dragIndex = ref<number>(-1)
const dragParentKey = ref<string | number | null>(null)
const overKey = ref('')

// 添加子分类相关状态
const subcategoryDrawerVisible = ref(false)
const currentParentCategory = ref<any>(null)
const categoryTreeData = ref<any[]>([])

onMounted(() => {
  // 自绘表格首拉（不依赖 avue @on-load）
  getPageF()
})

const permissions = computed(() => usePermissionStoreHook().permissions)
const permissionList = computed(() => {
  return {
    addBtn: !!permissions.value['mall:goodscategory:add'],
    delBtn: !!permissions.value['mall:goodscategory:del'],
    editBtn: !!permissions.value['mall:goodscategory:edit'],
    viewBtn: false,
  }
})

// ==================== Banner 统计（由树数据聚合，无专用接口）====================
const rootCount = computed(() => tableData.value.length)
const enabledCount = computed(() => tableData.value.filter((c: any) => String(c.enable) === '1').length)
// ==================== 计数 / 扁平化 ====================
const totalCount = computed(() => {
  let n = 0
  const walk = (list: any[]) => list.forEach((c) => {
    n += 1
    if (c.children?.length) walk(c.children)
  })
  walk(tableData.value)
  return n
})

/** 所有「有子节点」的节点 id（含二级父节点）——支持三级分类后「全部展开」不能只认一级。 */
function expandableIds(nodes: any[], depth = 0): string[] {
  const out: string[] = []
  ;(nodes || []).forEach((n: any) => {
    const kids: any[] = depth < MAX_LEVEL ? (n.children || []) : []
    if (!kids.length) return
    out.push(n.id)
    out.push(...expandableIds(kids, depth + 1))
  })
  return out
}

const expandAllText = computed(() => {
  const ids = expandableIds(tableData.value)
  const allOpen = ids.length > 0 && ids.every((id: string) => expandedIds.value.includes(id))
  return allOpen ? '全部收起 ▴' : '全部展开 ▾'
})

interface FlatRow { node: any; level: number; parent: any; index: number; hasKids: boolean }

/** 商品只有 categoryFirst/Second/Third 三个字段，第四级无处挂靠，故最深维护到三级（level 2）。 */
const MAX_LEVEL = 2

/** 该节点自身或任一后代命中关键字（搜索时用来决定要不要把这一支显示出来）。 */
function subtreeMatches(node: any, q: string): boolean {
  if (!q) return true
  if (String(node?.name || '').includes(q)) return true
  return (node?.children || []).some((c: any) => subtreeMatches(c, q))
}

const flatRows = computed<FlatRow[]>(() => {
  const q = keyword.value.trim()
  const out: FlatRow[] = []

  // 递归展平到 MAX_LEVEL。index 必须是「在自己兄弟数组里的下标」——
  // 拖拽排序的 rowKey/parentKeyOf/onDrop 全靠这个不变量定位同级序列。
  const walk = (nodes: any[], level: number, parent: any) => {
    nodes.forEach((node: any, i: number) => {
      const kids: any[] = level < MAX_LEVEL ? (node.children || []) : []
      const selfMatch = q ? String(node.name || '').includes(q) : true
      // 搜索时：自己不命中但后代命中的分支也要显示（否则用户看不到命中项的上下文）
      if (q && !selfMatch && !kids.some((k: any) => subtreeMatches(k, q))) return
      out.push({ node, level, parent, index: i, hasKids: kids.length > 0 })
      if (!kids.length) return
      // 搜索命中后代时自动展开，无搜索时按用户展开状态
      const expanded = q
        ? (kids.some((k: any) => subtreeMatches(k, q)) || expandedIds.value.includes(node.id))
        : expandedIds.value.includes(node.id)
      if (!expanded) return
      // ⚠️ 始终递归**完整**的 kids 数组，不要先 filter 再递归：
      // 过滤后下标会变成「过滤结果里的位置」，而 rowKey/parentKeyOf/onDrop 依赖
      // index 是同级真实下标，否则搜索状态下拖拽会把顺序改错。
      // 该显示哪些由每个节点自己开头的命中判定负责。
      walk(kids, level + 1, node)
    })
  }
  walk(tableData.value || [], 0, null)
  return out
})

function isExpanded(id: string | number) { return expandedIds.value.includes(id) }
function toggleExpand(id: string | number) {
  if (expandedIds.value.includes(id)) expandedIds.value = expandedIds.value.filter(x => x !== id)
  else expandedIds.value = [...expandedIds.value, id]
}
function toggleExpandAll() {
  const ids = expandableIds(tableData.value)
  const allOpen = ids.length > 0 && ids.every((id: string) => expandedIds.value.includes(id))
  expandedIds.value = allOpen ? [] : ids
}

// ==================== 单元格展示辅助 ====================
function iconBg(node: any) {
  const seed = Number(node.id) || String(node.name || '').length
  return VIZ[Math.abs(seed) % VIZ.length]
}
function iconChar(node: any) { return String(node.name || '类')[0] }
/** 类目图标：分类图标优先，其次移动端大图；加载失败的 URL 记进 iconBroken 后回落首字色块 */
const iconBroken = ref<Record<string, boolean>>({})
function iconSrc(node: any) {
  if (iconBroken.value[node?.id]) return ''
  return node?.picUrl || node?.mobilePicUrl || ''
}
function onIconError(node: any) {
  if (node?.id) iconBroken.value = { ...iconBroken.value, [node.id]: true }
}
// 展示素材三槽：分类图标 / 移动端大图 / 广告图
function matSlots(node: any) {
  return [
    { url: node.picUrl || '' },
    { url: node.mobilePicUrl || '' },
    { url: node.mobileAdImageUrl || '' },
  ]
}
function matCount(node: any) { return matSlots(node).filter(s => s.url).length }
function matPill(node: any) {
  const n = matCount(node)
  const total = matSlots(node).length
  if (n === total) return { text: `${total}/${total}`, cls: 'is-full' }
  if (n === 0) return { text: '未配置', cls: 'is-none' }
  return { text: `${n}/${total}`, cls: 'is-partial' }
}
function isMatch(node: any) {
  const q = keyword.value.trim()
  return !!q && String(node.name || '').includes(q)
}

// ==================== 拖拽排序（写真实 sort 字段 → putObj 逐同级持久化）====================
function rowKey(r: FlatRow) { return `${parentKeyOf(r)}|${r.index}` }
function parentKeyOf(r: FlatRow) { return r.parent ? r.parent.id : 'root' }
function onDragStart(r: FlatRow) {
  dragId.value = r.node.id
  dragIndex.value = r.index
  dragParentKey.value = parentKeyOf(r)
}
function onDragOver(e: DragEvent, r: FlatRow) {
  if (dragParentKey.value === parentKeyOf(r)) {
    e.preventDefault()
    overKey.value = rowKey(r)
  }
}
function onDragEnd() {
  dragId.value = null
  dragIndex.value = -1
  dragParentKey.value = null
  overKey.value = ''
}
function onDrop(e: DragEvent, r: FlatRow) {
  e.preventDefault()
  const targetParentKey = parentKeyOf(r)
  if (dragId.value == null || dragParentKey.value !== targetParentKey || dragIndex.value === r.index) {
    onDragEnd()
    return
  }
  const siblings: any[] = r.parent ? (r.parent.children || []) : tableData.value
  const arr = [...siblings]
  const [moved] = arr.splice(dragIndex.value, 1)
  arr.splice(r.index, 0, moved)
  // 重算同级 sort，并逐条持久化（sort 为后端真实字段，putObj 支持部分更新）
  const updates = arr.map((n: any, i: number) => putObj({ id: n.id, sort: i + 1 }))
  onDragEnd()
  Promise.all(updates)
    .then(() => {
      proxy.$message({ showClose: true, message: '排序已更新', type: 'success' })
      getPageF()
    })
    .catch(() => getPageF())
}

// ==================== 行操作 ====================
function handleAddRoot() {
  crud.value?.rowAdd()
}
function handleEdit(row: any) {
  crud.value?.rowEdit(row, 0)
}
function toggleEnable(row: any) {
  if (!permissions.value['mall:goodscategory:edit']) return
  const turningOff = String(row.enable) === '1'
  if (turningOff) {
    const kidsN = row.children?.length || 0
    const kidsPart = kidsN ? `及 ${kidsN} 个子类目` : ''
    appConfirm({
      intent: 'danger',
      title: `停用后「${row.name}」${kidsPart}将在前端隐藏，确定？`,
      verb: '停用',
    })
      .then(() => persistEnable(row, '0', '已停用，前端不再展示'))
      .catch(() => { })
  } else {
    persistEnable(row, '1', '已启用')
  }
}
function persistEnable(row: any, enable: string, tip: string) {
  putObj({ id: row.id, enable }).then(() => {
    row.enable = enable
    proxy.$message({ showClose: true, message: `「${row.name}」${tip}`, type: 'success' })
    getPageF()
  })
}
// 保留内置 avue 表单 enable slot 的原回调（表单内切换用）
function changeEnable(row: any) {
  if (row?.id)
    putObj({ id: row.id, enable: row.enable }).then(() => { })
}

function beforeOpen(done: () => void, type: string) {
  if (type === 'add') {
    form.value.picUrl = []
    form.value.mobilePicUrl = []
    form.value.mobileAdImageUrl = []
  } else {
    form.value.picUrl = form.value.picUrl ? [form.value.picUrl] : []
    form.value.mobilePicUrl = form.value.mobilePicUrl ? [form.value.mobilePicUrl] : []
    form.value.mobileAdImageUrl = form.value.mobileAdImageUrl ? [form.value.mobileAdImageUrl] : []
  }
  done()
}

function getPageF() {
  tableLoading.value = true
  fetchTree()
    .then((response: any) => {
      const resTableData = response.data
      tableData.value = cloneDeep(resTableData)
      const parentIdDIC: any[] = [
        {
          id: '0',
          name: proxy.$t('mall.goodscategory.parentTop'),
          parentId: '0',
          children: [],
        },
      ]
      resTableData.forEach((item: any) => {
        // 最多加载3级
        if (item.children) {
          item.children.forEach((item2: any) => {
            item2.children = []
          })
        }
        parentIdDIC.push({
          id: item.id,
          name: item.name,
          parentId: item.parentId,
          children: item.children,
        })
      })
      if (crud.value?.DIC) crud.value.DIC.parentId = parentIdDIC
      // 更新分类树数据供抽屉使用
      categoryTreeData.value = parentIdDIC
      tableLoading.value = false
    })
    .catch(() => {
      tableLoading.value = false
    })
}

function handleDel(row: any) {
  // 前端防呆：含子分类先拦截（后端删除子分类保护由服务端最终校验）
  if (row.children?.length) {
    proxy.$message({
      showClose: true,
      message: `该类目含 ${row.children.length} 个子分类，请先处理后再删除`,
      type: 'info',
    })
    return
  }
  appConfirm({
    intent: 'delete',
    title: `删除「${row.name}」？`,
    verb: '删除',
    irreversible: true,
  })
    .then(() => delObj(row.id))
    .then(() => {
      proxy.$message({
        showClose: true,
        message: proxy.$t('commons.delSuccess'),
        type: 'success',
      })
      getPageF()
    })
    .catch(() => { })
}

function handleUpdate(row: any, _index: number, done: () => void, loading: () => void) {
  row.picUrl = form.value.picUrl[0]
  row.mobilePicUrl = form.value.mobilePicUrl[0] || ''
  row.mobileAdImageUrl =
    form.value.mobileAdImageUrl && form.value.mobileAdImageUrl.length > 0
      ? form.value.mobileAdImageUrl[0]
      : ''
  putObj(row)
    .then(() => {
      proxy.$message({
        showClose: true,
        message: proxy.$t('commons.updateSuccess'),
        type: 'success',
      })
      done()
      getPageF()
    })
    .catch(() => {
      loading()
    })
}

function handleSave(row: any, done: () => void, loading: () => void) {
  row.picUrl = row.picUrl.length > 0 ? row.picUrl[0] : ''
  row.mobilePicUrl = row.mobilePicUrl.length > 0 ? row.mobilePicUrl[0] : ''
  row.mobileAdImageUrl =
    row.mobileAdImageUrl && row.mobileAdImageUrl.length > 0 ? row.mobileAdImageUrl[0] : ''

  addObj(row)
    .then(() => {
      proxy.$message({
        showClose: true,
        message: proxy.$t('commons.addSuccess'),
        type: 'success',
      })
      done()
      getPageF()
    })
    .catch(() => {
      loading()
    })
}

function refreshChange() {
  getPageF()
}

// 添加子分类
function handleAddSubcategory(row: any) {
  currentParentCategory.value = row
  subcategoryDrawerVisible.value = true
}

</script>

<style lang="scss" scoped>
/* 页面级样式集中于 ../goodscategory-dc.scss（自绘树形） */
</style>
