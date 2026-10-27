<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
  <div class="goods-dc-page agreecfg-page">
    <!-- ============ 顶部 Banner ============ -->
    <div class="goodsspu-dc__banner">
      <div class="goodsspu-dc__banner-grid" />
      <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--1" />
      <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--2" />
      <div class="goodsspu-dc__banner-head">
        <div class="goodsspu-dc__banner-title">协议管理</div>
        <div class="goodsspu-dc__banner-sub">维护用户协议 / 隐私政策等各类协议的富文本内容，支持按协议类型深链查看</div>
      </div>
      <div style="flex: 1" />
      <div class="agreecfg-dc__banner-art">
        <div class="agreecfg-dc__art-doc">
          <svg width="52" height="62" viewBox="0 0 52 62" fill="none">
            <path d="M6 2h28l12 12v46H6z" fill="#FFFFFF" stroke="#3C6EF0" stroke-width="1.6" stroke-linejoin="round" />
            <path d="M34 2v12h12" stroke="#3C6EF0" stroke-width="1.6" stroke-linejoin="round" />
            <rect x="13" y="24" width="26" height="3.5" rx="1.75" fill="#BBD4FF" />
            <rect x="13" y="33" width="18" height="3.5" rx="1.75" fill="#D6E4FF" />
            <rect x="13" y="42" width="22" height="3.5" rx="1.75" fill="#BBD4FF" />
          </svg>
        </div>
        <div class="agreecfg-dc__art-pen">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FA8C16" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 3l4 4L8 20l-5 1 1-5z" fill="#FFF4E6" />
            <path d="M14.5 5.5l4 4" />
          </svg>
        </div>
        <span class="agreecfg-dc__art-line" />
        <span class="agreecfg-dc__art-dot" />
      </div>
      <div class="goodsspu-dc__banner-stats">
        <div class="goodsspu-dc__stat">
          <div class="goodsspu-dc__stat-label">协议数</div>
          <div class="goodsspu-dc__stat-num">{{ page.total }}</div>
        </div>
      </div>
    </div>

    <!-- ============ 表格 ============ -->
    <DcTableShell
      v-model:keyword="searchName"
      storage-key="upms-agreementconfig"
      :cols="cols"
      grid="1fr 2fr 1.1fr 1.3fr"
      q-ph="搜索协议名"
      :rows="visibleRows"
      :row-class="rowClass"
      :total="page.total"
      :loading="tableLoading"
      :filtered="!!searchName"
      empty-title="暂无协议"
      :empty-btn-text="permissionList.addBtn && !noAddableType ? '新增协议' : ''"
      export-file-name="协议管理"
      @search="handleQuery"
      @reset="handleReset"
      @refresh="refreshChange"
      @sort-change="onSortChange"
      @empty-action="onEmptyAction"
    >
      <template #tools>
        <button
          v-if="permissionList.addBtn"
          class="dc-tbl__tool-btn dc-tbl__tool-btn--primary"
          :disabled="noAddableType"
          :title="noAddableType ? '所有协议类型均已创建' : ''"
          @click="openAgreeForm('add')"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
          新增协议
        </button>
      </template>

      <template #empty-art>
        <DcEmptyImage
          :src="emptyImg"
          alt="协议配置空状态插画"
        />
      </template>

      <!-- 协议类型章 + 字典说明 -->
      <template #col-agreementType="{ row }">
        <div class="agreecfg-dc__type-cell">
          <span class="agreecfg-dc__tag" :class="typeTagClass(row)">{{ typeLabel(row) }}</span>
          <span v-if="agreementTypeNote(row.agreementType)" class="agreecfg-dc__type-note">
            {{ agreementTypeNote(row.agreementType) }}
          </span>
        </div>
      </template>
      <template #col-agreementName="{ row }">
        <div class="agreecfg-dc__name">{{ row.agreementName || '--' }}</div>
      </template>
      <template #col-updateTime="{ row }">
        <div style="font-size: 14px;color:var(--dc-text-1);">{{ row.updateTime || '—' }}</div>
      </template>
      <!-- 操作：预览（只读弹窗）/ 编辑 / 删除 -->
      <template #col-acts="{ row }">
        <div class="dc-tbl__acts">
          <span v-if="permissionList.viewBtn" class="dc-tbl__act" @click.stop="openAgreeForm('view', row)">预览</span>
          <span v-if="permissionList.editBtn" class="dc-tbl__act" @click.stop="openAgreeForm('edit', row)">编辑</span>
          <span
            v-if="permissionList.delBtn"
            class="dc-tbl__act dc-tbl__act--danger"
            @click.stop="handleDel(row)"
          >删除</span>
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
    </DcTableShell>

    <!-- ============ 新增 / 编辑 / 预览 协议弹窗 ============ -->
    <DcFormDialog
      v-model="agreeOpen"
      :title="agreeMode === 'add' ? '新增协议' : agreeMode === 'edit' ? '编辑协议' : '协议预览'"
      :width="640"
      :saving="agreeSaving"
      @save="saveAgreeForm"
    >
      <div class="dcfd-section"><i /><span>协议信息</span></div>

      <div class="dcfd-field">
        <label class="dcfd-label"><em>*</em>协议类型</label>
        <el-select
          v-model="agreeForm.agreementType"
          :disabled="agreeMode !== 'add'"
          placeholder="请选择协议类型"
          @change="errType = ''"
        >
          <el-option
            v-for="opt in agreeTypeOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <div class="dcfd-helper">
          {{
            agreeMode !== 'add'
              ? '协议类型创建后不可修改'
              : noAddableType
                ? '所有协议类型均已创建，如需调整请编辑现有协议'
                : '仅列出尚未创建的协议类型，创建后不可修改'
          }}
        </div>
        <div v-if="errType" class="dcfd-error">{{ errType }}</div>
      </div>

      <div class="dcfd-field dcfd-field--full">
        <label class="dcfd-label"><em>*</em>协议名</label>
        <div class="dcfd-control">
          <input
            v-model="agreeForm.agreementName"
            class="dcfd-input"
            :class="{ 'is-error': !!errName }"
            :disabled="agreeMode === 'view'"
            maxlength="100"
            placeholder="如《某某用户服务协议》"
            @input="errName = ''"
          >
          <span class="dcfd-counter">{{ (agreeForm.agreementName || '').length }}/100</span>
        </div>
        <div v-if="errName" class="dcfd-error">{{ errName }}</div>
      </div>

      <div class="dcfd-section"><i /><span>正文<em>发布新版本后，用户下次登录需重新勾选同意</em></span></div>
      <div class="dcfd-field dcfd-field--full">
        <label class="dcfd-label">协议正文</label>
        <BaseEditor v-model:value="agreeForm.agreementContent" :disabled="agreeMode === 'view'" />
        <div class="dcfd-helper">修改正文建议同步告知用户</div>
      </div>

      <template v-if="agreeMode === 'view'" #footer>
        <button class="dcfd-btn dcfd-btn--cancel" @click="agreeOpen = false">关闭</button>
      </template>
    </DcFormDialog>

    <!-- 隐藏的 avue-crud host：列表首屏加载由它的 @on-load 触发 -->
    <div class="agreecfg-dc__crud-host" aria-hidden="true">
      <avue-crud
        ref="crud"
        v-model:page="page"
        :data="tableData"
        :permission="permissionList"
        :table-loading="tableLoading"
        :option="tableOption"
        @on-load="getPageF"
        @refresh-change="refreshChange"
        @sort-change="sortChange"
        @search-change="searchChange"
      />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, getCurrentInstance, nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { addObj, delObj, getObj, getObjByType, getPage, putObj } from '@/api/upms/agreementconfig'
import { remote } from '@/api/upms/dict'
import BaseEditor from '@/components/editor/BaseEditor.vue'
import { DcEmptyImage } from '@/components/dc-states'
import DcFormDialog from '@/components/dc-dialog/DcFormDialog.vue'
import DcTableShell from '@/components/dc-shell/DcTableShell.vue'
import { useDcDeleteToast } from '@/components/dc-shell/dcDeleteToast'
import DcPager from '@/components/dc-shell/DcPager.vue'
import type { DcSortPayload, DcTableCol } from '@/components/dc-shell/types'
import { tableOption } from '@/const/crud/upms/agreementconfig'
import { usePermissionStoreHook } from '@/store/modules/permission'
import { filterForm } from '@/utils/util'
import emptyImg from '@/assets/common/empty.png'

import '../../mall/goods-list-dc.scss'
import '../agreementconfig-dc.scss'

import { appConfirm } from "@/components/overlay";

defineOptions({ name: 'agreementconfig' })

const { proxy } = getCurrentInstance()!
const route = useRoute()
let hasOpenedFromQuery = false

/** 列：协议类型 / 协议名 / 更新时间 / 操作 */
const cols: DcTableCol[] = [
  { key: 'agreementType', t: '协议类型', exportValue: r => typeLabel(r) },
  { key: 'agreementName', t: '协议名' },
  { key: 'updateTime', t: '更新时间', sort: true },
  { key: 'acts', t: '操作', al: 'right', hideable: false, exportValue: () => '' },
]

const crud = ref()
const tableData = ref<any[]>([])
const dicData = ref<any[]>([])
const page = ref({
  total: 0,
  currentPage: 1,
  pageSize: 20,
  ascs: [] as any,
  descs: [] as any,
})
const paramsSearch = ref<any>({})
const tableLoading = ref(false)

// 获取权限
const permissions = usePermissionStoreHook().permissions
const permissionList = computed(() => {
  return {
    addBtn: !!permissions['upms:agreementconfig:add'],
    delBtn: !!permissions['upms:agreementconfig:del'],
    editBtn: !!permissions['upms:agreementconfig:edit'],
    viewBtn: !!permissions['upms:agreementconfig:get'],
  }
})

function getPageF(p: any, params?: any) {
  tableLoading.value = true
  getPage(
    Object.assign(
      {
        current: p.currentPage,
        size: p.pageSize,
        descs: page.value.descs,
        ascs: page.value.ascs,
      },
      params,
      paramsSearch.value
    )
  )
    .then(async response => {
      tableData.value = response.data.records
      page.value.total = response.data.total
      page.value.currentPage = p.currentPage
      page.value.pageSize = p.pageSize
      tableLoading.value = false
      // 加载协议类型
      getDicData()
    })
    .catch(() => {
      tableLoading.value = false
    })
}

/**
 * 可撤销删除：行滑出 + toast 内 5 秒撤销。
 * 点删除**不立刻发 DELETE** —— 先本地标 gone 播滑出动画，弹 5 秒可撤销 toast，
 * 5 秒内点「撤销」则行复原且一个请求都没发；到期才真跑 commit()。
 * 因此无需后端提供「恢复」接口。commit 失败时原语自动复原该行并弹后端 msg。
 * ⚠ 模板 :rows 已换成 visibleRows、:row-class 已挂 rowClass —— 缺任一行都不会滑出。
 * 确认框保留：协议删除后 C 端对应入口即刻失效。
 */
const { visibleRows, rowClass, requestDelete } = useDcDeleteToast(() => tableData.value)

function handleDel(row: any) {
  appConfirm({ intent: "delete", title: "删除该协议配置？", verb: "删除", impact: "C 端对应入口将立即失效。" })
    .then(() => {
      requestDelete(row, {
        commit: () => delObj(row.id),
        message: proxy.$t('commons.delSuccess'),
        onCommitted: () => getPageF(page.value),
      })
    })
    .catch(() => {
      // 用户取消确认框
    })
}

function searchChange(params: any, done: () => void) {
  params = filterForm(params)
  paramsSearch.value = params
  page.value.currentPage = 1
  getPageF(page.value, params)
  done()
}

function sortChange(val: any) {
  const prop = val.prop ? val.prop.replace(/([A-Z])/g, '_$1').toLowerCase() : ''

  if (val.order === 'ascending') {
    page.value.descs = []
    page.value.ascs = prop
  } else if (val.order === 'descending') {
    page.value.ascs = []
    page.value.descs = prop
  } else {
    page.value.ascs = []
    page.value.descs = []
  }
  getPageF(page.value)
}

function refreshChange() {
  getPageF(page.value)
}

function getDicData() {
  remote('agreement_type').then(res => {
    dicData.value = res.data || []
  })
}

// 协议说明
function agreementTypeNote(type: string) {
  return dicData.value.find(item => item.value === type)?.description
}

/**
 * 页面URL参数说明：
 * - id / agreementId：按协议ID打开查看弹窗
 * - agreementType / type：按协议类型打开查看弹窗（字典 agreement_type）
 * 使用示例：
 * - /upms/agreementconfig?id=123
 * - /upms/agreementconfig?agreementType=3
 * 行为：
 * - 页面挂载时解析参数，只触发一次；若同时存在 id 与 type，优先使用 id。
 */
function tryOpenFromQuery() {
  // 仅触发一次，避免重复
  if (hasOpenedFromQuery) return
  const q: any = route.query || {}
  // 解析支持的参数并优先 id
  const id = q.id || q.agreementId
  const type = q.agreementType || q.type
  if (!id && !type) return
  hasOpenedFromQuery = true
  const p = id ? getObj(id) : getObjByType(String(type))
  p.then(res => {
    const row = res?.data || {}
    // 深链打开：直接进编辑弹窗
    nextTick(() => {
      openAgreeForm('edit', row)
    })
  }).catch(() => {})
}

onMounted(() => {
  tryOpenFromQuery()
})

// ==================== 搜索（按协议名精确匹配：后端 Wrappers.query(entity) 为等值条件） ====================
const searchName = ref('')
function handleQuery() {
  const p: Record<string, any> = {}
  if (searchName.value.trim()) p.agreementName = searchName.value.trim()
  searchChange(p, () => {})
}
function handleReset() {
  searchName.value = ''
  paramsSearch.value = {}
  page.value.currentPage = 1
  getPageF(page.value)
}
/** 壳的三态排序（asc → desc → null）转给原 sortChange（驼峰转下划线由它负责） */
function onSortChange(p: DcSortPayload) {
  sortChange({
    prop: p.key,
    order: p.order === 'asc' ? 'ascending' : p.order === 'desc' ? 'descending' : '',
  })
}
/** 空态主按钮：有筛选条件时是「清空筛选条件」，否则是 tools[0]「新增协议」 */
function onEmptyAction(filtered: boolean) {
  if (filtered) handleReset()
  else openAgreeForm('add')
}

// 协议类型章（字典 label；色族按字典项顺序稳定取 b/p/c/r/o/g/m/br）
function typeLabel(row: any) {
  return dicData.value.find(item => item.value === row.agreementType)?.label
    || row.$agreementType
    || row.agreementType
    || '--'
}
function typeTagClass(row: any) {
  const idx = dicData.value.findIndex(item => item.value === row.agreementType)
  return `is-t${idx >= 0 ? idx % 8 : 7}`
}

// ==================== 新增 / 编辑 / 预览 弹窗 ====================
const agreeOpen = ref(false)
const agreeMode = ref<'add' | 'edit' | 'view'>('add')
const agreeSaving = ref(false)
const errType = ref('')
const errName = ref('')
const agreeForm = ref<any>({
  id: '',
  agreementType: '',
  agreementName: '',
  agreementContent: '',
})
// 编辑时保留整行原始字段作为 PUT 底稿，避免只回传 4 个字段把未在表单出现的列置空
const editingRow = ref<any>(null)
// 正文补拉的请求令牌：迟到的响应不得覆盖新一次打开/用户输入
let contentReqToken = 0

/**
 * 协议类型可选项。
 * 新增：沿用原 beforeOpen → setDicData 语义，剔除「已存在的类型」（与原实现一致，
 *       依据仍是当前页 tableData，非全量）。编辑/预览：给全量字典，保证已选项能显示 label。
 */
// ⚠ 与原 setDicData 一致，「已存在」只按当前页 tableData 判断（非全量）。
// pageSize 可选 10，若协议总数 > 每页条数，第 2 页会把第 1 页的类型也当成可新增，
// 存在建重复类型的可能。原实现即如此，此处保持行为一致，仅记录该前提。
const addableTypes = computed(() =>
  dicData.value.filter(
    (d: any) => tableData.value.findIndex((r: any) => r.agreementType === d.value) === -1
  )
)
/**
 * 「无可新增类型」只有在字典**确实加载完**之后才成立。
 * 字典还没回来（或请求失败）时 addableTypes 也是空的，若据此禁用新增按钮，
 * 会出现「加载期间按钮不可点」，字典挂了更是永久不可点。
 */
const noAddableType = computed(() => dicData.value.length > 0 && addableTypes.value.length === 0)
const agreeTypeOptions = computed(() =>
  agreeMode.value === 'add' ? addableTypes.value : dicData.value
)

function openAgreeForm(mode: 'add' | 'edit' | 'view', row?: any) {
  agreeMode.value = mode
  errType.value = ''
  errName.value = ''
  if (mode === 'add') {
    editingRow.value = null
    agreeForm.value = { id: '', agreementType: '', agreementName: '', agreementContent: '' }
  } else {
    editingRow.value = row
    agreeForm.value = {
      id: row.id,
      agreementType: row.agreementType ?? '',
      agreementName: row.agreementName || '',
      agreementContent: row.agreementContent || '',
    }
    // 列表接口通常不返回富文本正文，按 id 拉全量后回填（目前列表是带正文的，此处仅兜底）
    if (row.id && !row.agreementContent) {
      const token = ++contentReqToken
      getObj(row.id)
        .then((res: any) => {
          // 仅当这仍是最新一次请求、弹窗还开着、且用户没在等待期间动过正文时才回填，
          // 避免迟到的响应覆盖用户已经输入的内容
          if (
            token === contentReqToken &&
            agreeOpen.value &&
            agreeForm.value.id === row.id &&
            !agreeForm.value.agreementContent
          ) {
            agreeForm.value.agreementContent = res?.data?.agreementContent || ''
          }
        })
        .catch(() => {})
    }
  }
  agreeOpen.value = true
}

function saveAgreeForm() {
  if (agreeMode.value === 'view') return
  if (agreeForm.value.agreementType === '' || agreeForm.value.agreementType == null) {
    errType.value = '协议类型为必填项'
    return
  }
  if (!String(agreeForm.value.agreementName || '').trim()) {
    errName.value = '协议名为必填项'
    return
  }
  agreeSaving.value = true
  const payload: any =
    agreeMode.value === 'edit'
      ? { ...(editingRow.value || {}), ...agreeForm.value }
      : { ...agreeForm.value }
  // 剔除 avue 注入的视图态键（$cellEdit / $index / $agreementType…），只回传真实列
  Object.keys(payload).forEach(k => {
    if (k.startsWith('$')) delete payload[k]
  })
  // 新增不带 id（原 avue rowAdd 提交的表单里没有 id 键）
  if (agreeMode.value === 'add') delete payload.id
  const req = agreeMode.value === 'add' ? addObj(payload) : putObj(payload)
  req
    .then(() => {
      proxy?.$message({
        showClose: true,
        message:
          agreeMode.value === 'add'
            ? proxy.$t('commons.addSuccess')
            : proxy.$t('commons.updateSuccess'),
        type: 'success',
      })
      agreeSaving.value = false
      agreeOpen.value = false
      getPageF(page.value)
    })
    .catch((e: any) => {
      agreeSaving.value = false
      // 拦截器已经弹过 toast 了：业务错误 reject 字符串、网络/超时/5xx reject Error
      // 或 axios 响应对象，都不该再补一条。只有 reject 出裸的 {msg} 那条路径没弹过。
      if (e && typeof e === 'object' && !(e instanceof Error) && e.msg) {
        proxy?.$message({ showClose: true, message: e.msg, type: 'error' })
      }
    })
}

// 分页（DcPager 负责页码序列/跳页 UI，页面只保留取数副作用）
function onPageChange(p: number) {
  page.value.currentPage = p
  getPageF(page.value)
}
function onSizeChange(s: number) {
  page.value.pageSize = s
  page.value.currentPage = 1
  getPageF(page.value)
}
</script>
