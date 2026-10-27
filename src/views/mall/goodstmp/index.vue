<template>
  <div class="goodstmp-dc">
    <!-- 顶部 Banner -->
    <div class="goodstmp-dc__banner">
      <div class="goodstmp-dc__banner-grid" />
      <div class="goodstmp-dc__banner-glow goodstmp-dc__banner-glow--1" />
      <div class="goodstmp-dc__banner-glow goodstmp-dc__banner-glow--2" />
      <div class="goodstmp-dc__banner-head">
        <div class="goodstmp-dc__banner-title">商品参数模板</div>
        <div class="goodstmp-dc__banner-sub">定义商品参数项，发品时套用模板快速填写</div>
      </div>
      <div style="flex:1" />
      <div class="goodstmp-dc__banner-stats">
        <div class="goodstmp-dc__stat">
          <div class="goodstmp-dc__stat-label">模板数</div>
          <div class="goodstmp-dc__stat-num">{{ page.total }}</div>
        </div>
        <div class="goodstmp-dc__stat goodstmp-dc__stat--divider">
          <div class="goodstmp-dc__stat-label">参数项</div>
          <div class="goodstmp-dc__stat-num">{{ bannerParamTotal }}</div>
        </div>
      </div>
      <div class="goodstmp-dc__banner-deco">
        <div class="goodstmp-dc__deco-rail goodstmp-dc__deco-rail--1" />
        <div class="goodstmp-dc__deco-rail goodstmp-dc__deco-rail--2" />
        <div class="goodstmp-dc__deco-rail goodstmp-dc__deco-rail--3" />
        <div class="goodstmp-dc__deco-dot goodstmp-dc__deco-dot--1" />
        <div class="goodstmp-dc__deco-dot goodstmp-dc__deco-dot--2" />
        <div class="goodstmp-dc__deco-dot goodstmp-dc__deco-dot--3" />
      </div>
    </div>

    <div class="goodstmp-dc__card">
      <!-- 工具栏 -->
      <div class="goodstmp-dc__toolbar">
        <button v-if="perms['mall:goodstmp:add']" class="goodstmp-dc__btn goodstmp-dc__btn--primary" @click="openAddTpl">+ 新增模板</button>
        <input
          v-model="searchName"
          class="goodstmp-dc__search"
          placeholder="搜索模板名称"
        >
        <span class="goodstmp-dc__total">共 <b>{{ displayRows.length }}</b> 个模板</span>
        <div style="flex:1" />
        <div class="goodstmp-dc__icon-btn" title="列设置" @click="templateColumnPreference?.show()">
          <el-icon><Operation /></el-icon>
        </div>
        <div class="goodstmp-dc__icon-btn" :class="{ 'is-spin': refreshing }" title="刷新" @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
        </div>
      </div>

      <!-- 表头 -->
      <div class="goodstmp-dc__thead" :style="templateGridStyle">
        <div>模板名称</div>
        <div v-if="templateColumnVisible('paramCount')">参数项数</div>
        <div v-if="templateColumnVisible('updateTime')">最后更新</div>
        <div class="goodstmp-dc__th--right">操作</div>
      </div>

      <!-- 空态 -->
      <div v-if="!tableLoading && displayRows.length === 0" class="goodstmp-dc__empty">
        <DcEmptyImage
          :src="emptyImg"
          alt="参数模板配置空状态插画"
        />
        <div class="goodstmp-dc__empty-title">还没有参数模板</div>
        <div class="goodstmp-dc__empty-desc">创建模板后，发品时可一键填充商品参数信息</div>
        <div class="goodstmp-dc__empty-actions">
          <button v-if="perms['mall:goodstmp:add']" class="goodstmp-dc__btn goodstmp-dc__btn--primary" @click="openAddTpl">+ 新增模板</button>
        </div>
      </div>

      <!-- 数据行 -->
      <template v-else>
        <div v-for="row in displayRows" :key="row.id" class="goodstmp-dc__tr" :style="templateGridStyle">
          <!-- 模板名称 + 参数项预览 -->
          <div class="goodstmp-dc__name-cell">
            <div class="goodstmp-dc__name">{{ row.name }}</div>
            <div class="goodstmp-dc__preview">
              <template v-if="(row._paramNames || []).length">
                <span v-for="(n, i) in row._paramNames.slice(0, 3)" :key="i" class="goodstmp-dc__chip">{{ n }}</span>
                <span
                  v-if="row._paramNames.length > 3"
                  class="goodstmp-dc__chip goodstmp-dc__chip--more"
                  :title="row._paramNames.slice(3).join('、')"
                >+{{ row._paramNames.length - 3 }}</span>
              </template>
              <span v-else class="goodstmp-dc__chip goodstmp-dc__chip--empty">暂无参数项</span>
            </div>
          </div>
          <!-- 参数项数 -->
          <div v-if="templateColumnVisible('paramCount')" class="goodstmp-dc__num">{{ row._paramCount ?? 0 }}</div>
          <!-- 最后更新 -->
          <div v-if="templateColumnVisible('updateTime')" class="goodstmp-dc__upd">
            <template v-if="formatUpd(row)">
              <div class="goodstmp-dc__upd-d">{{ formatUpd(row).d }}</div>
              <div class="goodstmp-dc__upd-t">{{ formatUpd(row).t }}</div>
            </template>
            <span v-else class="goodstmp-dc__upd--empty">--</span>
          </div>
          <!-- 操作 -->
          <div class="goodstmp-dc__action">
            <span v-if="perms['mall:goodstmp:edit']" class="goodstmp-dc__link" @click="openEditTpl(row)">编辑</span>
            <el-dropdown trigger="click">
              <span class="goodstmp-dc__more">···</span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleManage(row)"><span style="color: var(--dc-info)">管理参数</span></el-dropdown-item>
                  <el-dropdown-item v-if="perms['mall:goodstmp:del']" divided @click="handleDel(row)">
                    <span style="color: var(--dc-danger)">删除</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </template>

      <!-- 分页 -->
      <div v-if="displayRows.length > 0" class="goodstmp-dc__pager">
        <span>共 {{ page.total }} 条</span>
        <!-- 名称搜索是页内前端过滤（后端 page 无按名称检索），分页分的却是全部模板 -->
        <span
          v-if="searchName.trim()"
          class="dc-pager__hit"
          :title="`分页按全部模板走（每页 ${page.pageSize} 条）；名称搜索只在当前页内过滤，所以这一页只命中 ${displayRows.length} 条`"
        >· 本页命中 {{ displayRows.length }} 条</span>
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
          class="goodstmp-dc__pager-btn"
          :class="{ 'is-disabled': page.currentPage <= 1 }"
          @click="page.currentPage > 1 && onPageChange(page.currentPage - 1)"
        >‹</span>
        <span
          v-for="(p, i) in pageList"
          :key="i"
          class="goodstmp-dc__pager-num"
          :class="{ 'is-active': p === page.currentPage, 'is-ellipsis': typeof p !== 'number' }"
          @click="typeof p === 'number' && onPageChange(p)"
        >{{ p }}</span>
        <span
          class="goodstmp-dc__pager-btn"
          :class="{ 'is-disabled': page.currentPage >= totalPages }"
          @click="page.currentPage < totalPages && onPageChange(page.currentPage + 1)"
        >›</span>
      </div>
    </div>

    <!-- 新增/编辑模板抽屉（自绘风格，套 el-drawer） -->
    <el-drawer
      v-model="tplDrawerVisible"
      :title="tplForm.id ? `编辑模板：${tplForm.origName}` : '新增模板'"
      direction="rtl"
      size="640px"
      :append-to-body="true"
    >
      <div class="goodstmp-dc__drawer-body">
        <div class="goodstmp-dc__sect-title">基础信息</div>
        <div class="goodstmp-dc__field">
          <div class="goodstmp-dc__field-label">
            <span>模板名称 <span class="goodstmp-dc__req">*</span></span>
            <span style="color:var(--text-tertiary, #667085)">{{ (tplForm.name || '').length }}/20</span>
          </div>
          <input
            v-model="tplForm.name"
            class="goodstmp-dc__field-input"
            :class="{ 'is-error': tplNameErr }"
            maxlength="20"
            placeholder="如：商品规格参数"
            @input="tplNameErr = false"
          >
          <div v-if="tplNameErr" class="goodstmp-dc__field-err">模板名称必填</div>
        </div>
        <div class="goodstmp-dc__field">
          <div class="goodstmp-dc__field-label"><span>排序</span></div>
          <input
            v-model="tplForm.sort"
            class="goodstmp-dc__field-input"
            type="number"
            placeholder="数字越小越靠前"
          >
        </div>
        <div class="goodstmp-dc__hint">
          模板保存后，可在「管理参数」中维护参数项及其取值（单选/多选/输入框）。
        </div>
      </div>
      <template #footer>
        <el-button @click="tplDrawerVisible = false">取消</el-button>
        <el-button type="primary" :loading="tplSaving" @click="saveTpl">保存</el-button>
      </template>
    </el-drawer>

    <!-- ==== 以下为参数项管理弹窗：沿用原有 CRUD 逻辑与接口（保持不动）==== -->
    <!-- 参数项管理 -->
    <el-dialog v-model="manageShow" title="管理参数" width="800px" append-to-body>
      <div class="goodstmp-dc__manage-bar">
        <el-button type="primary" size="small" @click="handleAddParam">新增</el-button>
        <span style="font-size: 14px;color:var(--text-tertiary, #667085)">共 {{ manageList.length }} 项</span>
      </div>
      <el-table :data="manageList" style="width: 100%">
        <el-table-column prop="name" label="参数名称" />
        <el-table-column prop="type" label="类型">
          <template #default="scope">
            <span v-if="scope.row.type == 0">单选</span>
            <span v-else-if="scope.row.type == 1">多选</span>
            <span v-else-if="scope.row.type == 2">输入框</span>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="参数值">
          <template #default="scope">
            {{ getContent(scope.row.goodsParameterValueList) }}
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作">
          <template #default="scope">
            <el-button text type="primary" size="small" @click="handTmpBigEdit(scope.row)">编辑</el-button>
            <el-button text type="danger" size="small" @click="handTmpBigDel(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 新增/编辑参数项 -->
    <el-dialog
      v-model="paramShow"
      :title="selfId ? '编辑参数' : '新增参数'"
      width="560px"
      append-to-body
      @close="handTmpClose"
    >
      <el-form label-width="80px">
        <el-form-item label="参数名称">
          <el-input v-model="addForm.name" placeholder="请输入参数名称" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="addForm.type" placeholder="请选择类型">
            <el-option value="0" label="单选">单选</el-option>
            <el-option value="1" label="多选">多选</el-option>
            <el-option value="2" label="输入">输入</el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input v-model="addForm.sort" placeholder="请输入排序" />
        </el-form-item>
      </el-form>
      <el-table v-if="addForm.type != '2'" :data="addTableData">
        <el-table-column prop="name" label="参数值">
          <template #default="scope">
            <el-input v-model="addTableData[scope.$index].name" placeholder="请输入参数值" />
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序">
          <template #default="scope">
            <el-input v-model="addTableData[scope.$index].sort" placeholder="请输入排序" />
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作">
          <template #default="scope">
            <el-button text type="danger" @click="handleTmpDel(scope.$index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="addForm.type != '2'" style="margin-top: 20px">
        <el-button text type="primary" @click="handleTmpAdd">添加参数值</el-button>
      </div>
      <template #footer>
        <el-button @click="paramShow = false">取消</el-button>
        <el-button type="primary" @click="handTmpSave">保存</el-button>
      </template>
    </el-dialog>
    <ColumnPreferenceDialog ref="templateColumnPreference" storage-key="mall:table-columns:goodstmp:list:v1" :columns="templateColumns" @change="visibleTemplateColumns = $event" />
  </div>
</template>

<script lang="ts" setup>
/**
 * 商品参数模板列表页（自绘）
 *
 * 视图全换：avue-crud 列表 → 自绘 CSS grid（Banner + 工具栏 + 表格 + 空态 + 分页）；
 *           avue-form 内置新增表单 → 自绘「新增/编辑模板」抽屉（name + sort）。
 * 业务逻辑全留：模板 CRUD 走原 /goodsparametertemplate；参数项 CRUD 弹窗与接口
 *           (/goodsparameter) 原样保留（后端参数项含 type 0/1/2 与取值列表，
 *           与扁平的模板模型不一致，故沿用既有弹窗）。
 */
import {
  addObj,
  addTemObj,
  delObj,
  delTemObj,
  getPage,
  getTemList,
  putObj,
  putTemObj,
} from '@/api/mall/goodstmp'
import ColumnPreferenceDialog from '@/components/dc-shell/ColumnPreferenceDialog.vue'
import { DcEmptyImage } from '@/components/dc-states'
import { Menu, Operation, Refresh } from '@element-plus/icons-vue'
import { appConfirm } from '@/components/overlay'
import { computed, getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { usePagerClamp } from '@/hooks/usePagerClamp'

import '../goodstmp-dc.scss'
import emptyImg from '@/assets/common/empty.png'
import { usePermissionStoreHook } from '@/store/modules/permission'


const perms = computed(() => usePermissionStoreHook()?.permissions || {})
const { proxy } = getCurrentInstance()!
const templateColumnPreference = ref<InstanceType<typeof ColumnPreferenceDialog>>()
const templateColumns = [
  { key: 'name', label: '模板名称', required: true }, { key: 'paramCount', label: '参数项数' },
  { key: 'updateTime', label: '最后更新' },
]
const visibleTemplateColumns = ref(templateColumns.map(column => column.key))
const templateColumnVisible = (key: string) => visibleTemplateColumns.value.includes(key)
const templateGridStyle = computed(() => ({ gridTemplateColumns: [
  'minmax(260px, 1.6fr)', ...(templateColumnVisible('paramCount') ? ['120px'] : []),
  ...(templateColumnVisible('updateTime') ? ['150px'] : []), '150px',
].join(' ') }))

// ==================== 列表数据 ====================
const rawData = ref<any[]>([])
const tableLoading = ref(false)
const refreshing = ref(false)
const searchName = ref('')
const page = reactive({
  total: 0,
  currentPage: 1,
  pageSize: 20,
})

// 客户端过滤（后端 page 接口无按名称检索能力，即时过滤已加载数据）
const displayRows = computed(() => {
  const q = searchName.value.trim()
  return q ? rawData.value.filter(t => String(t.name || '').includes(q)) : rawData.value
})
// Banner「参数项」合计：无聚合接口，前端按已加载模板的参数项数求和
const bannerParamTotal = computed(() =>
  rawData.value.reduce((s, t) => s + (Number(t._paramCount) || 0), 0),
)

// 自绘分页页码
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

function formatUpd(row: any) {
  const raw = row.updateTime || row.createTime || ''
  if (!raw) return null
  const s = String(raw).replace('T', ' ')
  return { d: s.slice(0, 10), t: s.slice(11, 19) || '' }
}

// ==================== 数据加载 ====================
async function onGetPage() {
  tableLoading.value = true
  try {
    const res: any = await getPage({ page: page.currentPage, size: page.pageSize })
    const records: any[] = res.data.records || []
    page.total = res.data.total ?? 0
    // 补参数项预览/计数（无聚合接口，前端 Promise.all 循环 getTemList）
    await Promise.all(
      records.map(async (t) => {
        try {
          const pr: any = await getTemList(t.id)
          const params: any[] = pr.data || []
          t._params = params
          t._paramCount = params.length
          t._paramNames = params.map((p: any) => String(p.name || '').replace(/[【】]/g, ''))
        } catch {
          t._params = []
          t._paramCount = 0
          t._paramNames = []
        }
      }),
    )
    rawData.value = records
    tableLoading.value = false
  } catch {
    tableLoading.value = false
  }
}
onMounted(onGetPage)

function onPageChange(p: number) {
  page.currentPage = p
  onGetPage()
}
function onSizeChange(s: number) {
  page.pageSize = s
  page.currentPage = 1
  onGetPage()
}
function handleRefresh() {
  refreshing.value = true
  onGetPage().finally(() => {
    setTimeout(() => { refreshing.value = false }, 500)
  })
}
// ==================== 模板 CRUD（自绘抽屉，走原 addObj/putObj/delObj）====================
const tplDrawerVisible = ref(false)
const tplSaving = ref(false)
const tplNameErr = ref(false)
const tplForm = reactive<{ id: string; name: string; sort: any; origName: string }>({ id: '', name: '', sort: 0, origName: '' })

function openAddTpl() {
  tplForm.id = ''
  tplForm.name = ''
  tplForm.sort = 0
  tplForm.origName = ''
  tplNameErr.value = false
  tplDrawerVisible.value = true
}
function openEditTpl(row: any) {
  tplForm.id = row.id
  tplForm.name = row.name
  tplForm.sort = row.sort ?? 0
  tplForm.origName = row.name
  tplNameErr.value = false
  tplDrawerVisible.value = true
}
function saveTpl() {
  if (!tplForm.name || !tplForm.name.trim()) {
    tplNameErr.value = true
    return
  }
  tplSaving.value = true
  const payload: any = {
    name: tplForm.name.trim(),
    sort: tplForm.sort === '' || tplForm.sort == null ? 0 : tplForm.sort,
  }
  const req = tplForm.id ? putObj({ ...payload, id: tplForm.id }) : addObj(payload)
  req
    .then(() => {
      proxy.$message({
        showClose: true,
        message: tplForm.id ? '修改成功' : '新增成功',
        type: 'success',
      })
      tplSaving.value = false
      tplDrawerVisible.value = false
      onGetPage()
    })
    .catch(() => {
      tplSaving.value = false
    })
}
function handleDel(row: any) {
  appConfirm({
    intent: 'delete',
    title: `删除「${row.name}」？`,
    verb: '删除',
    irreversible: true,
  })
    .then(() => delObj(row.id))
    .then(() => {
      proxy.$message({ showClose: true, message: '删除成功', type: 'success' })
      onGetPage()
    })
    .catch(() => {})
}

// ==================== 参数项 CRUD（沿用原逻辑与接口，未改动）====================
const specTemplateId = ref('')
const manageShow = ref(false)
const manageList = ref<any[]>([])
const paramShow = ref(false)
const selfId = ref('')
const addTableData = ref<any[]>([])
const addForm = reactive<{ name: string; type: string; sort: any }>({ name: '', type: '', sort: '' })

function handleManage(r: any) {
  specTemplateId.value = r.id
  manageShow.value = true
  getTemList(r.id).then((res: any) => {
    manageList.value = res.data
  })
}
function handleAddParam() {
  paramShow.value = true
}
function handleTmpAdd() {
  addTableData.value.push({ name: '', sort: '' })
}
function handleTmpDel(e: number) {
  addTableData.value.splice(e, 1)
}
function handTmpSave() {
  if (!addForm.name || !addForm.name.trim()) {
    proxy.$message({ showClose: true, message: '请输入名称', type: 'warning' })
    return
  }
  if (!addForm.type) {
    proxy.$message({ showClose: true, message: '请选择类型', type: 'warning' })
    return
  }
  let _da: any = JSON.parse(JSON.stringify(addForm))
  if (_da.type == 2) {
    _da.goodsParameterValueList = []
  } else {
    _da.goodsParameterValueList = addTableData.value
  }
  _da.parameterTemplateId = specTemplateId.value
  if (selfId.value) {
    _da.id = selfId.value
    putTemObj(_da).then(() => {
      resetParamForm()
      refreshManage()
    })
    return
  }
  addTemObj(_da).then(() => {
    resetParamForm()
    refreshManage()
  })
}
function handTmpBigEdit(d: any) {
  const _da: any = JSON.parse(JSON.stringify(d))
  selfId.value = _da.id
  addForm.name = _da.name
  addForm.type = '' + _da.type + ''
  addForm.sort = _da.sort
  addTableData.value = _da.goodsParameterValueList || []
  paramShow.value = true
}
function handTmpBigDel(id: string) {
  appConfirm({ intent: 'delete', title: '删除该参数？', verb: '删除' })
    .then(() => delTemObj(id))
    .then(() => {
      proxy.$message({ showClose: true, message: '删除成功', type: 'success' })
      refreshManage()
    })
    .catch(() => {})
}
function handTmpClose() {
  selfId.value = ''
  addForm.name = ''
  addForm.type = ''
  addForm.sort = ''
  addTableData.value = []
}
function resetParamForm() {
  addForm.name = ''
  addForm.sort = ''
  addForm.type = ''
  addTableData.value = []
  paramShow.value = false
}
function refreshManage() {
  getTemList(specTemplateId.value).then((res: any) => {
    manageList.value = res.data
  })
}
function getContent(row: any) {
  if (row) {
    return row.map((item: any) => item.name).join(',')
  }
  return ''
}
</script>
