<!--
  批量导入商品弹窗

  模板是全类目通用的一份（区分「全量新增 / 增量更新」两种类型）；类目在弹窗里整批选定，表格里不用填。
  商品固定归属默认店铺，前端不传店铺。

  多规格：「同一商品编码填多行 = 一个多规格商品」，组头行带整品字段、每行一个 SKU；
  规格项/规格值须已存在于「商品规格」字典，导入不自动建字典。规则见后端 GoodsImportColumn
  的 SPEC_NAMES / SPEC_VALUES 与 GoodsImportRowGroups。
-->
<template>
  <!-- 挂到 body：商品页根节点的入场动画结束后留着 transform，
       fixed 会改成相对页面内容区定位，页面一长弹窗就落到第一屏下面 -->
  <Teleport to="body">
  <div v-if="visible" class="gi-dc">
    <div class="gi-dc__mask" @click="handleMaskClick" />
    <div class="gi-dc__dialog" :class="{ 'is-wide': view === 'records' }">
      <!-- 标题栏 -->
      <div class="gi-dc__head">
        <div class="gi-dc__title">{{ view === 'records' ? '导入记录' : '批量导入商品' }}</div>
        <div style="flex:1" />
        <span class="gi-dc__link" @click="toggleRecords">
          {{ view === 'records' ? '返回导入' : '导入记录' }}
        </span>
        <div class="gi-dc__close" @click="requestClose">
          <el-icon><Close /></el-icon>
        </div>
        <!-- 有未提交文件时的关闭确认气泡 -->
        <div v-if="confirmClose" class="gi-dc__pop gi-dc__pop--close">
          <div class="gi-dc__pop-title">关闭后已上传的文件会丢失</div>
          <div class="gi-dc__pop-desc">已解析的数据还没开始导入，关闭需要重新上传。</div>
          <div class="gi-dc__pop-actions">
            <button class="gi-dc__btn gi-dc__btn--mini" @click="confirmClose = false">继续编辑</button>
            <button class="gi-dc__btn gi-dc__btn--mini gi-dc__btn--primary" @click="close(true)">确认关闭</button>
          </div>
        </div>
      </div>

      <!-- 步骤条 -->
      <div v-if="view !== 'records'" class="gi-dc__steps">
        <div v-for="(s, i) in steps" :key="s" class="gi-dc__step-wrap">
          <div class="gi-dc__step" :class="stepClass(i)">
            <span v-if="stepIndex > i" class="gi-dc__step-check">✓</span>
            <span v-else>{{ i + 1 }}</span>
          </div>
          <div class="gi-dc__step-label" :class="{ 'is-active': stepIndex === i }">{{ s }}</div>
          <div v-if="i < steps.length - 1" class="gi-dc__step-line" :class="{ 'is-done': stepIndex > i }" />
        </div>
      </div>

      <!-- ============ 上传步骤 ============ -->
      <div v-if="view === 'upload'" class="gi-dc__body">
        <div class="gi-dc__tip">
          <span class="gi-dc__tip-icon">i</span>
          <span>
            模板为全类目通用，分「全量新增 / 增量更新」两种。类目在这里选，整批统一，表格里不用填。
            多规格商品把「商品编码」填成同一个、逐行填规格值即可，整品字段只填第一行。
            支持 .xlsx / .xls，单个文件 ≤10MB，单次最多 500 行。
          </span>
        </div>

        <div class="gi-dc__row" :class="{ 'is-shake': catShake }">
          <label class="gi-dc__label"><i>*</i>商品类目</label>
          <el-cascader
            v-model="form.categoryId"
            class="gi-dc__ctrl"
            :class="{ 'is-error': catError }"
            :options="categoryTree"
            :props="cascaderProps"
            placeholder="请选择商品类目"
            clearable
            @change="onCategoryChange"
          />
        </div>
        <div v-if="catError" class="gi-dc__row gi-dc__row--hint">
          <label class="gi-dc__label" />
          <span class="gi-dc__error">请先选择商品类目</span>
        </div>

        <div class="gi-dc__row">
          <label class="gi-dc__label">模板类型</label>
          <div class="gi-dc__seg">
            <button
              v-for="t in templateTypes"
              :key="t.value"
              class="gi-dc__seg-item"
              :class="{ 'is-active': form.templateType === t.value }"
              @click="form.templateType = t.value"
            >{{ t.label }}</button>
          </div>
        </div>

        <!-- 模板行 -->
        <div class="gi-dc__template">
          <div class="gi-dc__xls">XLS</div>
          <div class="gi-dc__template-main">
            <div class="gi-dc__template-name">{{ templateName }}</div>
            <div class="gi-dc__template-meta">
              含 {{ columnCount }} 个字段 · 必填 {{ requiredCount }} 项 · 支持单规格与多规格
            </div>
          </div>
          <span class="gi-dc__link gi-dc__link--sm gi-dc__link--icon" @click="handleDownloadTemplate">
            <TransferIcon direction="out" :size="14" />
            {{ templateDownloaded ? '已下载 · 重新下载' : '下载模板' }}
          </span>
        </div>

        <!-- 拖拽区 / 文件行 -->
        <div
          v-if="!file"
          class="gi-dc__drop"
          :class="{ 'is-over': dragOver }"
          @click="pickFile"
          @dragover.prevent="onDragOver"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="onDrop"
        >
          <div class="gi-dc__drop-icon">
            <TransferIcon direction="in" :size="22" />
          </div>
          <div class="gi-dc__drop-text">
            {{ dragOver ? '松开即可上传' : '把填好的文件拖到这里，或' }}
            <em v-if="!dragOver">点击选择</em>
          </div>
          <div class="gi-dc__drop-sub">仅支持 .xlsx / .xls，单个文件不超过 10MB</div>
        </div>

        <div v-else class="gi-dc__file">
          <div class="gi-dc__file-row">
            <div class="gi-dc__xls gi-dc__xls--sm">XLS</div>
            <div class="gi-dc__file-name" :title="file.name">{{ file.name }}</div>
            <div class="gi-dc__file-size">{{ prettySize(file.size) }}</div>
            <div style="flex:1" />
            <span v-if="parsing" class="gi-dc__file-stage">校验中…</span>
            <template v-else-if="preview">
              <span class="gi-dc__file-ok">✓ 校验通过 {{ preview.validCount }} 条</span>
              <span
                v-if="preview.invalidCount > 0"
                class="gi-dc__file-bad"
                @click="issuesOpen = !issuesOpen"
              >异常 {{ preview.invalidCount }} 条 {{ issuesOpen ? '▲' : '▼' }}</span>
            </template>
            <div class="gi-dc__file-close" @click="resetFile">✕</div>
            <div v-if="parsing" class="gi-dc__file-bar" />
          </div>

          <div v-if="issuesOpen && preview" class="gi-dc__issues">
            <div v-for="(issue, i) in preview.issues" :key="i" class="gi-dc__issue">
              <span class="gi-dc__issue-row">第 {{ issue.rowNo }} 行</span>
              <span class="gi-dc__issue-reason">{{ issue.reason }}</span>
            </div>
          </div>
          <div v-if="preview && preview.invalidCount > 0" class="gi-dc__skip">
            <label class="gi-dc__check">
              <input v-model="options.skipInvalid" type="checkbox">
              <span>忽略异常行，仅导入通过的 {{ preview.validCount }} 条</span>
            </label>
          </div>
        </div>

        <!-- 重复策略 -->
        <div class="gi-dc__row gi-dc__row--wide">
          <label class="gi-dc__label gi-dc__label--wide">编码重复时</label>
          <div class="gi-dc__seg">
            <button
              v-for="d in dupOptions"
              :key="d.value"
              class="gi-dc__seg-item"
              :class="{ 'is-active': options.dupStrategy === d.value }"
              @click="options.dupStrategy = d.value"
            >{{ d.label }}</button>
          </div>
        </div>
        <div v-if="options.dupStrategy === 'overwrite'" class="gi-dc__warn">
          覆盖更新会用表格里的值改写已有商品，且不可撤销。价格默认不覆盖，需要一并改价请在下方高级设置里开启。
        </div>

        <!-- 高级设置 -->
        <div class="gi-dc__adv">
          <div class="gi-dc__adv-head" @click="advOpen = !advOpen">
            <span>高级设置 {{ advOpen ? '▲' : '▼' }}</span>
            <span class="gi-dc__adv-sum">已启用 {{ advEnabledCount }} 项</span>
          </div>
          <div v-if="advOpen" class="gi-dc__adv-body">
            <label class="gi-dc__check">
              <input v-model="options.forceOffShelf" type="checkbox">
              <span>导入后一律下架（忽略表格里的上架状态）</span>
            </label>
            <label class="gi-dc__check">
              <input v-model="options.zeroStock" type="checkbox">
              <span>库存一律置 0（忽略表格里的库存）</span>
            </label>
            <label class="gi-dc__check">
              <input v-model="options.syncPrice" type="checkbox">
              <span>覆盖更新时一并同步价格</span>
            </label>
          </div>
        </div>
      </div>

      <!-- ============ 导入中 ============ -->
      <div v-else-if="view === 'importing'" class="gi-dc__body gi-dc__body--center">
        <div class="gi-dc__phases">
          <span :class="phaseClass(0)">解析文件</span>
          <i class="gi-dc__phase-line" />
          <span :class="phaseClass(1)">写入商品</span>
          <i class="gi-dc__phase-line" />
          <span :class="phaseClass(2)">生成结果</span>
        </div>
        <div class="gi-dc__running-title">正在导入，请勿关闭窗口</div>
        <div class="gi-dc__running-sub">{{ task?.fileName }}<template v-if="task?.categoryName"> · {{ task.categoryName }}</template></div>
        <div class="gi-dc__progress">
          <div class="gi-dc__progress-bar" :style="{ width: percent + '%' }" />
        </div>
        <div class="gi-dc__progress-meta">
          <span>已处理 {{ task?.processedCount || 0 }} / {{ task?.totalCount || 0 }} 条</span>
          <span>{{ percent }}%</span>
        </div>
        <div class="gi-dc__running-hint">可点击「后台运行」关闭窗口，稍后在导入记录中查看结果</div>
      </div>

      <!-- ============ 结果：部分成功 ============ -->
      <div v-else-if="view === 'result'" class="gi-dc__body">
        <div class="gi-dc__stats">
          <div class="gi-dc__stat">
            <div class="gi-dc__stat-label">导入总数</div>
            <div class="gi-dc__stat-num">{{ task?.totalCount || 0 }}</div>
          </div>
          <div class="gi-dc__stat gi-dc__stat--ok">
            <div class="gi-dc__stat-label">成功</div>
            <div class="gi-dc__stat-num">{{ task?.successCount || 0 }}</div>
          </div>
          <div class="gi-dc__stat gi-dc__stat--bad">
            <div class="gi-dc__stat-label">失败</div>
            <div class="gi-dc__stat-num">{{ task?.failCount || 0 }}</div>
          </div>
        </div>

        <div class="gi-dc__chips">
          <button
            v-for="c in issueChips"
            :key="c.value"
            class="gi-dc__chip"
            :class="{ 'is-active': issueFilter === c.value }"
            @click="issueFilter = c.value"
          >{{ c.label }} {{ c.count }}</button>
          <div style="flex:1" />
          <span class="gi-dc__link gi-dc__link--sm" @click="handleDownloadFail()">下载失败数据</span>
        </div>

        <div class="gi-dc__table">
          <div class="gi-dc__thead">
            <div class="gi-dc__th gi-dc__th--check">
              <input type="checkbox" :checked="allFailChecked" @change="toggleAllFail(($event.target as HTMLInputElement).checked)">
            </div>
            <div class="gi-dc__th">行号</div>
            <div class="gi-dc__th">商品名称</div>
            <div class="gi-dc__th">失败原因</div>
            <div class="gi-dc__th gi-dc__th--right">操作</div>
          </div>
          <div class="gi-dc__tbody">
            <div v-for="row in filteredFailures" :key="row.rowNo" class="gi-dc__tr" :class="{ 'is-fixed': fixedRows.has(row.rowNo) }">
              <div class="gi-dc__td gi-dc__td--check">
                <input type="checkbox" :checked="picked.has(row.rowNo)" @change="togglePick(row.rowNo)">
              </div>
              <div class="gi-dc__td gi-dc__td--muted">第 {{ row.rowNo }} 行</div>
              <div class="gi-dc__td">
                <input
                  v-if="editingRow === row.rowNo"
                  v-model="editingName"
                  class="gi-dc__edit"
                  @keyup.enter="commitEdit(row.rowNo)"
                >
                <span v-else>{{ displayName(row) }}</span>
              </div>
              <div class="gi-dc__td" :class="fixedRows.has(row.rowNo) ? 'gi-dc__td--ok' : 'gi-dc__td--bad'">
                {{ fixedRows.has(row.rowNo) ? '已修正 · 待重新导入' : row.reason }}
              </div>
              <div class="gi-dc__td gi-dc__td--right">
                <template v-if="editingRow === row.rowNo">
                  <span class="gi-dc__link gi-dc__link--ok" @click="commitEdit(row.rowNo)">确认</span>
                  <span class="gi-dc__link gi-dc__link--muted" @click="editingRow = null">取消</span>
                </template>
                <span v-else-if="fixedRows.has(row.rowNo)" class="gi-dc__td--muted">已修正</span>
                <span v-else class="gi-dc__link gi-dc__link--sm" @click="startEdit(row)">编辑修正</span>
              </div>
            </div>
            <div v-if="!filteredFailures.length" class="gi-dc__table-empty">没有符合条件的失败数据</div>
          </div>
        </div>
      </div>

      <!-- ============ 结果：全部成功 ============ -->
      <div v-else-if="view === 'success'" class="gi-dc__body gi-dc__body--center">
        <div class="gi-dc__done">✓</div>
        <div class="gi-dc__done-title">{{ task?.status === '4' ? '导入已终止' : '全部导入成功' }}</div>
        <div class="gi-dc__done-sub">
          共导入 {{ task?.successCount || 0 }} 条商品<template v-if="durationText"> · 耗时 {{ durationText }}</template>
        </div>
        <div class="gi-dc__done-tip">
          <template v-if="options.forceOffShelf">导入的商品当前为下架状态，确认无误后到商品列表上架。</template><template v-else>导入的商品按表格里的上架状态生效。</template>
        </div>
      </div>

      <!-- ============ 导入记录 ============ -->
      <div v-else class="gi-dc__body">
        <div class="gi-dc__filters">
          <el-select v-model="recordStatus" class="gi-dc__rsel" placeholder="全部状态" @change="loadRecords(1)">
            <el-option label="全部状态" value="" />
            <el-option label="导入中" value="1" />
            <el-option label="部分成功" value="2" />
            <el-option label="全部成功" value="3" />
            <el-option label="已终止" value="4" />
            <el-option label="执行异常" value="5" />
          </el-select>
          <el-select v-model="recordDays" class="gi-dc__rsel" @change="loadRecords(1)">
            <el-option label="近 7 天" :value="7" />
            <el-option label="近 30 天" :value="30" />
            <el-option label="近 90 天" :value="90" />
          </el-select>
          <div style="flex:1" />
          <button class="gi-dc__btn" @click="loadRecords(recordPage.current)">刷新</button>
        </div>

        <div class="gi-dc__table gi-dc__table--records">
          <div class="gi-dc__thead">
            <div class="gi-dc__th">提交时间</div>
            <div class="gi-dc__th">文件名 / 类目</div>
            <div class="gi-dc__th">操作人</div>
            <div class="gi-dc__th">状态</div>
            <div class="gi-dc__th">成功 / 失败</div>
            <div class="gi-dc__th gi-dc__th--right">操作</div>
          </div>
          <div class="gi-dc__tbody">
            <div v-for="r in records" :key="r.id" class="gi-dc__tr">
              <div class="gi-dc__td gi-dc__td--muted">{{ r.createTime }}</div>
              <div class="gi-dc__td">
                <div class="gi-dc__file-title">{{ r.fileName }}</div>
                <div class="gi-dc__td--muted">{{ r.categoryName }}</div>
              </div>
              <div class="gi-dc__td gi-dc__td--muted">{{ r.operatorName }}</div>
              <div class="gi-dc__td">
                <span class="gi-dc__tag" :class="'gi-dc__tag--' + r.status">
                  <i />{{ statusText(r.status) }}
                </span>
                <div v-if="r.status === '1'" class="gi-dc__mini">
                  <div class="gi-dc__mini-bar" :style="{ width: (r.percent || 0) + '%' }" />
                </div>
              </div>
              <div class="gi-dc__td">
                <template v-if="r.status === '1'">— / —</template>
                <template v-else>
                  <b class="gi-dc__td--ok">{{ r.successCount || 0 }}</b> / <b class="gi-dc__td--bad">{{ r.failCount || 0 }}</b>
                </template>
              </div>
              <div class="gi-dc__td gi-dc__td--right">
                <span v-if="r.status === '1'" class="gi-dc__link gi-dc__link--sm" @click="watchTask(r.id)">查看进度</span>
                <template v-else>
                  <span class="gi-dc__link gi-dc__link--sm" @click="watchTask(r.id)">详情</span>
                  <span v-if="(r.failCount || 0) > 0" class="gi-dc__link gi-dc__link--sm" @click="handleDownloadFail(r.id)">下载失败</span>
                </template>
              </div>
            </div>
            <div v-if="!records.length && !recordLoading" class="gi-dc__empty">
              <div class="gi-dc__empty-icon">🕐</div>
              <div class="gi-dc__empty-title">暂无导入记录</div>
              <div class="gi-dc__empty-desc">导入任务完成后将在此保留 90 天</div>
              <button class="gi-dc__btn gi-dc__btn--primary" @click="view = 'upload'">去导入</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="gi-dc__foot">
        <span class="gi-dc__foot-tip">{{ footTip }}</span>
        <template v-if="view === 'upload'">
          <button class="gi-dc__btn" @click="requestClose">取消</button>
          <button
            class="gi-dc__btn gi-dc__btn--primary"
            :disabled="!canStart"
            @click="handleStart"
          >{{ startText }}</button>
        </template>
        <template v-else-if="view === 'importing'">
          <div class="gi-dc__abort-wrap">
            <button class="gi-dc__btn gi-dc__btn--danger" @click="confirmAbort = true">终止导入</button>
            <div v-if="confirmAbort" class="gi-dc__pop gi-dc__pop--abort">
              <div class="gi-dc__pop-title">确认终止导入？</div>
              <div class="gi-dc__pop-desc">已处理的数据将保留，未处理的将被放弃</div>
              <div class="gi-dc__pop-actions">
                <button class="gi-dc__btn gi-dc__btn--mini" @click="confirmAbort = false">再想想</button>
                <button class="gi-dc__btn gi-dc__btn--mini gi-dc__btn--danger-solid" @click="handleAbort">确认终止</button>
              </div>
            </div>
          </div>
          <button class="gi-dc__btn gi-dc__btn--primary" @click="runInBackground">后台运行</button>
        </template>
        <template v-else-if="view === 'result'">
          <button class="gi-dc__btn" @click="close(true)">关闭</button>
          <button
            class="gi-dc__btn gi-dc__btn--primary"
            :disabled="picked.size === 0 || retrying"
            @click="handleRetry"
          >重新导入所选 {{ picked.size }} 条</button>
        </template>
        <template v-else-if="view === 'success'">
          <button class="gi-dc__btn" @click="startNextBatch">继续导入下一批</button>
          <button class="gi-dc__btn" @click="close(true)">关闭</button>
          <button class="gi-dc__btn gi-dc__btn--primary" @click="viewGoods">查看商品</button>
        </template>
        <template v-else>
          <el-pagination
            v-model:current-page="recordPage.current"
            :page-size="recordPage.size"
            :total="recordPage.total"
            layout="prev, pager, next"
            small
            @current-change="loadRecords"
          />
        </template>
      </div>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      accept=".xlsx,.xls"
      style="display:none"
      @change="onFileChange"
    >
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Close } from '@element-plus/icons-vue'
import TransferIcon from './TransferIcon.vue'
import {
  abortTask,
  downloadFailData,
  downloadTemplate,
  getTask,
  getTaskPage,
  getTemplateColumns,
  precheck,
  retryRows,
  saveBlob,
  startTask,
  type GoodsImportColumnMeta,
  type GoodsImportIssue,
  type GoodsImportPreview,
  type GoodsImportTask,
} from '@/api/mall/goodsimport'
import { goodscategoryTree } from '@/api/mall/goodsspu'
import '../../goods-import-dc.scss'

type View = 'upload' | 'importing' | 'result' | 'success' | 'records'

const props = defineProps<{ modelValue: boolean; initialView?: View }>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'refresh'): void
}>()

const visible = computed(() => props.modelValue)
const view = ref<View>('upload')
const steps = ['选类目 · 下模板', '上传数据', '导入完成']

// ---------- 上传表单 ----------
const form = reactive({
  templateType: 'add',
  categoryId: [] as string[],
  categoryName: '',
})
const templateTypes = [
  { label: '全量新增模板', value: 'add' },
  { label: '增量更新模板', value: 'update' },
]
const dupOptions = [
  { label: '跳过该条', value: 'skip' },
  { label: '覆盖更新', value: 'overwrite' },
  { label: '终止导入', value: 'abort' },
]
const options = reactive({
  dupStrategy: 'skip',
  skipInvalid: true,
  forceOffShelf: true,
  zeroStock: true,
  syncPrice: false,
})

const categoryTree = ref<any[]>([])
const cascaderProps = { label: 'name', value: 'id', checkStrictly: true }
const catError = ref(false)
const catShake = ref(false)
const columns = ref<GoodsImportColumnMeta[]>([])
const templateDownloaded = ref(false)

// ---------- 文件 ----------
const fileInputRef = ref<HTMLInputElement>()
const file = ref<File | null>(null)
const dragOver = ref(false)
const parsing = ref(false)
const preview = ref<GoodsImportPreview | null>(null)
const issuesOpen = ref(false)

// ---------- 任务 ----------
const task = ref<GoodsImportTask | null>(null)
const advOpen = ref(false)
const confirmClose = ref(false)
const confirmAbort = ref(false)
const retrying = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

// ---------- 结果页 ----------
const issueFilter = ref('all')
const picked = ref<Set<number>>(new Set())
const fixedRows = ref<Set<number>>(new Set())
const editingRow = ref<number | null>(null)
const editingName = ref('')
const fixedValues = ref<Record<number, Record<string, string>>>({})

// ---------- 记录页 ----------
const records = ref<GoodsImportTask[]>([])
const recordStatus = ref('')
const recordDays = ref(30)
const recordLoading = ref(false)
const recordPage = reactive({ current: 1, size: 10, total: 0 })

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      stopPoll()
      return
    }
    view.value = props.initialView || 'upload'
    resetAll()
    void bootstrap()
    if (view.value === 'records') void loadRecords(1)
  },
)

watch(
  () => form.templateType,
  () => {
    templateDownloaded.value = false
    void loadColumns()
  },
)

async function bootstrap() {
  await Promise.all([loadCategories(), loadColumns()])
}

async function loadCategories() {
  try {
    const res = await goodscategoryTree()
    categoryTree.value = res?.data || []
  } catch {
    categoryTree.value = []
  }
}

async function loadColumns() {
  try {
    const res = await getTemplateColumns(form.templateType)
    columns.value = res?.data || []
  } catch {
    columns.value = []
  }
}

const columnCount = computed(() => columns.value.length)
const requiredCount = computed(() => columns.value.filter((c) => c.required).length)
const templateName = computed(() =>
  form.templateType === 'update' ? '商品更新模板.xlsx' : '商品新增模板.xlsx',
)

const stepIndex = computed(() => {
  if (view.value === 'upload') return file.value ? 1 : 0
  if (view.value === 'importing') return 1
  return 2
})

function stepClass(i: number) {
  if (stepIndex.value > i) return 'is-done'
  return stepIndex.value === i ? 'is-current' : ''
}

function phaseClass(i: number) {
  const p = percent.value
  const current = p < 10 ? 0 : p < 100 ? 1 : 2
  if (current > i) return 'gi-dc__phase is-done'
  return current === i ? 'gi-dc__phase is-current' : 'gi-dc__phase'
}

const percent = computed(() => task.value?.percent ?? 0)

const durationText = computed(() => {
  const ms = task.value?.durationMs
  if (!ms) return ''
  return ms < 1000 ? '不到 1 秒' : `${Math.round(ms / 1000)} 秒`
})

const advEnabledCount = computed(
  () =>
    [options.forceOffShelf, options.zeroStock, options.syncPrice].filter(Boolean).length,
)

const canStart = computed(() => {
  if (form.templateType === 'add' && !form.categoryId.length) return false
  if (!file.value || parsing.value || !preview.value) return false
  if (!options.skipInvalid && preview.value.invalidCount > 0) return false
  return effectiveValidCount.value > 0
})

/** 选了「覆盖更新」之后，编码重复那批不再算异常，可导条数要跟着涨 */
const effectiveValidCount = computed(() => {
  if (!preview.value) return 0
  if (options.dupStrategy !== 'overwrite' && form.templateType !== 'update') {
    return preview.value.validCount
  }
  const waived = new Set(
    preview.value.issues
      .filter((i) => i.type === 'duplicate' && !String(i.reason || '').includes('不存在'))
      .map((i) => i.rowNo),
  )
  const stillBad = new Set(
    preview.value.issues
      .filter((i) => !(i.type === 'duplicate' && !String(i.reason || '').includes('不存在')))
      .map((i) => i.rowNo),
  )
  waived.forEach((r) => stillBad.delete(r))
  return preview.value.total - stillBad.size
})

const startText = computed(() => {
  if (!file.value || !preview.value) return '开始导入'
  return `开始导入 ${effectiveValidCount.value} 条`
})

const footTip = computed(() => {
  if (view.value === 'upload') {
    if (form.templateType === 'add' && !form.categoryId.length) return '请先选择商品类目'
    if (!file.value) return '请上传数据文件'
    if (parsing.value) return '文件处理中…'
    if (preview.value && !options.skipInvalid && preview.value.invalidCount > 0) {
      return `有 ${preview.value.invalidCount} 条异常，勾选「忽略异常行」或修正后重传`
    }
    return ''
  }
  if (view.value === 'result' || view.value === 'success') {
    return durationText.value ? `导入耗时 ${durationText.value}` : ''
  }
  if (view.value === 'records') return `共 ${recordPage.total} 条 · 导入记录保留 90 天`
  return ''
})

// ---------- 类目 ----------
function onCategoryChange(value: string[]) {
  catError.value = false
  form.categoryName = labelPathOf(categoryTree.value, value || []).join(' / ')
}

function labelPathOf(tree: any[], ids: string[]): string[] {
  const path: string[] = []
  let level = tree
  for (const id of ids) {
    const hit = (level || []).find((n: any) => n.id === id)
    if (!hit) break
    path.push(hit.name)
    level = hit.children || []
  }
  return path
}

// ---------- 文件 ----------
function pickFile() {
  if (form.templateType === 'add' && !form.categoryId.length) {
    flagCategoryError()
    return
  }
  fileInputRef.value?.click()
}

function onDragOver() {
  if (form.templateType === 'add' && !form.categoryId.length) return
  dragOver.value = true
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  if (form.templateType === 'add' && !form.categoryId.length) {
    flagCategoryError()
    return
  }
  const dropped = e.dataTransfer?.files?.[0]
  if (dropped) void acceptFile(dropped)
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const chosen = input.files?.[0]
  if (chosen) void acceptFile(chosen)
  // 清空 value，否则连选同一个文件两次不会再触发 change
  input.value = ''
}

function flagCategoryError() {
  catError.value = true
  catShake.value = true
  setTimeout(() => (catShake.value = false), 300)
}

async function acceptFile(chosen: File) {
  if (!/\.(xlsx|xls)$/i.test(chosen.name)) {
    ElMessage.error('只支持 .xlsx / .xls 文件')
    return
  }
  if (chosen.size > 10 * 1024 * 1024) {
    ElMessage.error('文件不能超过 10MB')
    return
  }
  file.value = chosen
  preview.value = null
  issuesOpen.value = false
  parsing.value = true
  try {
    const res = await precheck({
      file: chosen,
      templateType: form.templateType,
      categoryFirst: form.categoryId[0],
      categorySecond: form.categoryId[1],
      categoryThird: form.categoryId[2],
      categoryName: form.categoryName,
    })
    preview.value = res?.data || null
    if (preview.value && preview.value.invalidCount > 0) issuesOpen.value = true
  } catch (e: any) {
    resetFile()
    ElMessage.error(e?.msg || e?.message || '文件校验失败')
  } finally {
    parsing.value = false
  }
}

function resetFile() {
  file.value = null
  preview.value = null
  issuesOpen.value = false
  parsing.value = false
}

function prettySize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ---------- 模板下载 ----------
async function handleDownloadTemplate() {
  try {
    const blob = await downloadTemplate(form.templateType)
    saveBlob(blob, templateName.value)
    templateDownloaded.value = true
  } catch {
    ElMessage.error('模板下载失败，请稍后重试')
  }
}

// ---------- 开始 / 轮询 ----------
async function handleStart() {
  if (!preview.value) return
  try {
    const res = await startTask(preview.value.taskId, {
      dupStrategy: options.dupStrategy,
      skipInvalid: options.skipInvalid ? '1' : '0',
      forceOffShelf: options.forceOffShelf ? '1' : '0',
      zeroStock: options.zeroStock ? '1' : '0',
      syncPrice: options.syncPrice ? '1' : '0',
    })
    task.value = res?.data || null
    view.value = 'importing'
    startPoll(preview.value.taskId)
  } catch (e: any) {
    ElMessage.error(e?.msg || e?.message || '导入启动失败')
  }
}

function startPoll(taskId: string) {
  stopPoll()
  pollTimer = setInterval(() => void pollOnce(taskId), 1000)
  void pollOnce(taskId)
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function pollOnce(taskId: string) {
  try {
    const res = await getTask(taskId)
    const data: GoodsImportTask | null = res?.data || null
    if (!data) return
    task.value = data
    if (data.status === '1') return
    stopPoll()
    emit('refresh')
    view.value = (data.failCount || 0) > 0 ? 'result' : 'success'
    if (view.value === 'result') {
      picked.value = new Set((data.failures || []).map((f) => f.rowNo))
    }
  } catch {
    // 轮询失败不打断用户，下一次再试
  }
}

async function handleAbort() {
  confirmAbort.value = false
  if (!task.value) return
  try {
    await abortTask(task.value.id)
    ElMessage.success('已请求终止，正在收尾')
  } catch (e: any) {
    ElMessage.error(e?.msg || '终止失败')
  }
}

function runInBackground() {
  ElMessage.success('任务已转入后台运行')
  stopPoll()
  view.value = 'records'
  void loadRecords(1)
}

// ---------- 结果页 ----------
const failures = computed<GoodsImportIssue[]>(() => task.value?.failures || [])

const issueChips = computed(() => {
  const list = failures.value
  const countOf = (type: string) => list.filter((i) => i.type === type).length
  return [
    { label: '全部', value: 'all', count: list.length },
    { label: '重复编码', value: 'duplicate', count: countOf('duplicate') },
    { label: '缺必填', value: 'required', count: countOf('required') },
    { label: '格式错误', value: 'format', count: countOf('format') },
    { label: '其他', value: 'other', count: countOf('other') },
  ].filter((c) => c.value === 'all' || c.count > 0)
})

const filteredFailures = computed(() =>
  issueFilter.value === 'all'
    ? failures.value
    : failures.value.filter((i) => i.type === issueFilter.value),
)

const allFailChecked = computed(
  () => filteredFailures.value.length > 0 && filteredFailures.value.every((r) => picked.value.has(r.rowNo)),
)

function toggleAllFail(checked: boolean) {
  const next = new Set(picked.value)
  filteredFailures.value.forEach((r) => (checked ? next.add(r.rowNo) : next.delete(r.rowNo)))
  picked.value = next
}

function togglePick(rowNo: number) {
  const next = new Set(picked.value)
  if (next.has(rowNo)) {
    next.delete(rowNo)
  } else {
    next.add(rowNo)
  }
  picked.value = next
}

function displayName(row: GoodsImportIssue) {
  return fixedValues.value[row.rowNo]?.name ?? (row.name || '—')
}

function startEdit(row: GoodsImportIssue) {
  editingRow.value = row.rowNo
  editingName.value = displayName(row) === '—' ? '' : displayName(row)
}

function commitEdit(rowNo: number) {
  const base = task.value?.failRowValues?.[String(rowNo)] || {}
  fixedValues.value[rowNo] = { ...base, ...(fixedValues.value[rowNo] || {}), name: editingName.value }
  fixedRows.value = new Set(fixedRows.value).add(rowNo)
  editingRow.value = null
}

async function handleRetry() {
  if (!task.value || picked.value.size === 0) return
  const rows = Array.from(picked.value).map((rowNo) => ({
    rowNo,
    values: {
      ...(task.value?.failRowValues?.[String(rowNo)] || {}),
      ...(fixedValues.value[rowNo] || {}),
    },
  }))
  retrying.value = true
  try {
    const res = await retryRows(task.value.id, rows)
    const next: GoodsImportTask | null = res?.data || null
    if (next) {
      task.value = next
      resetResultState()
      view.value = 'importing'
      startPoll(next.id)
    }
  } catch (e: any) {
    ElMessage.error(e?.msg || e?.message || '重新导入失败')
  } finally {
    retrying.value = false
  }
}

async function handleDownloadFail(taskId?: string) {
  const id = typeof taskId === 'string' ? taskId : task.value?.id
  if (!id) return
  try {
    const blob = await downloadFailData(id)
    saveBlob(blob, '导入失败数据.xlsx')
  } catch {
    ElMessage.error('失败数据下载失败')
  }
}

// ---------- 记录页 ----------
async function loadRecords(current = 1) {
  recordLoading.value = true
  try {
    const res = await getTaskPage({
      current,
      size: recordPage.size,
      status: recordStatus.value || undefined,
      days: recordDays.value,
    })
    const page = res?.data || {}
    records.value = page.records || []
    recordPage.current = Number(page.current || current)
    recordPage.total = Number(page.total || 0)
  } catch {
    records.value = []
  } finally {
    recordLoading.value = false
  }
}

function statusText(status: string) {
  return (
    { '1': '导入中', '2': '部分成功', '3': '全部成功', '4': '已终止', '5': '执行异常' } as Record<
      string,
      string
    >
  )[status] || '—'
}

async function watchTask(taskId: string) {
  try {
    const res = await getTask(taskId)
    const data: GoodsImportTask | null = res?.data || null
    if (!data) return
    task.value = data
    resetResultState()
    if (data.status === '1') {
      view.value = 'importing'
      startPoll(taskId)
    } else if ((data.failCount || 0) > 0) {
      view.value = 'result'
      picked.value = new Set((data.failures || []).map((f) => f.rowNo))
    } else {
      view.value = 'success'
    }
  } catch {
    ElMessage.error('读取任务详情失败')
  }
}

function toggleRecords() {
  if (view.value === 'records') {
    view.value = 'upload'
    return
  }
  view.value = 'records'
  void loadRecords(1)
}

// ---------- 关闭 ----------
function requestClose() {
  if (view.value === 'importing') {
    ElMessage.warning('导入进行中，请先终止或选择后台运行')
    return
  }
  if (view.value === 'upload' && file.value) {
    confirmClose.value = true
    return
  }
  close(true)
}

function handleMaskClick() {
  if (view.value === 'importing') return
  requestClose()
}

function close(refresh = false) {
  confirmClose.value = false
  stopPoll()
  emit('update:modelValue', false)
  if (refresh) emit('refresh')
}

function startNextBatch() {
  view.value = 'upload'
  resetFile()
  resetResultState()
  task.value = null
}

function viewGoods() {
  close(true)
}

function resetResultState() {
  issueFilter.value = 'all'
  picked.value = new Set()
  fixedRows.value = new Set()
  fixedValues.value = {}
  editingRow.value = null
}

function resetAll() {
  resetFile()
  resetResultState()
  task.value = null
  confirmClose.value = false
  confirmAbort.value = false
  advOpen.value = false
  catError.value = false
}

onBeforeUnmount(stopPoll)
</script>
