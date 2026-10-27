<template>
  <el-drawer v-model="drawerVisible" :with-header="false"
    size="min(1120px, calc(100vw - 64px))" :destroy-on-close="true"
    :close-on-click-modal="false" :before-close="handleBeforeClose" append-to-body
    class="ds-drawer ds-drawer-enter goods-dc-drawer goods-edit-wizard goods-edit-drawer-shell" @close="handleClose">
    <div class="goods-wizard__shell">
      <!-- 头部（自绘） -->
      <div class="goods-wizard__head">
        <span class="goods-wizard__title">{{ props.goodsId ? '编辑商品' : '新建商品' }}</span>
        <span class="goods-wizard__step-badge">第 {{ tabsActive }}/{{ STEP_COUNT }} 步</span>
        <span class="goods-wizard__sub">{{ form.name || '—' }}</span>
        <div style="flex: 1" />
        <span class="goods-wizard__close" @click="requestClose">✕</span>
      </div>
      <!-- 步骤条（自绘，由 tabsActive 驱动） -->
      <div class="goods-wizard__steps">
        <template v-for="(s, i) in wizardSteps" :key="i">
          <div class="goods-wizard__step" :class="stepClass(i + 1)" @click="goStep(i + 1)">
            <span class="goods-wizard__dot">{{ i + 1 < tabsActive ? '✓' : i + 1 }}</span>
            <div class="goods-wizard__step-title">{{ s.title }}</div>
          </div>
          <div v-if="i < wizardSteps.length - 1" class="goods-wizard__line"
            :class="{ 'is-done': i + 1 < tabsActive }" />
        </template>
      </div>
      <!-- 内容区：avue-form 内置 tab 头隐藏，用 tabsActive 联动；成功态时隐藏但保留挂载（供「再发一件」复用） -->
      <!-- initializing：打开抽屉后的异步初始化（字典 / 商品详情）未完成前遮罩表单，
           否则这时输入的内容会被随后到达的初始化结果整体覆盖 -->
      <div v-show="!submitDone" v-loading="initializing" element-loading-text="正在加载表单…"
        class="goods-edit-drawer ds-form-family-17b goods-wizard__body">
      <avue-form ref="formRef" v-model="form" :option="tableOption" @submit="handleSave" @error="handleError"
        @reset-change="handleCancel" style="

--avue-form-label-width: 140px"
        class="custom-form">
        <template #menu-form>
          <el-button v-if="tabsActive < STEP_COUNT" type="primary" class="ds-btn ds-btn--primary" :disabled="submitLoading"
            @click="onNextStep()">
            {{ $t('mall.goodsspu.batchImportTip9') }}
          </el-button>
        </template>
        <template v-slot:specType>
          <el-radio-group v-model="form.specType">
            <el-radio-button value="0">单规格</el-radio-button>
            <el-radio-button value="1">多规格</el-radio-button>
          </el-radio-group>
        </template>
        <template v-slot:skus>
          <SkuForm :key="skuFormKey" :specType="form.specType" :goodsSpec="goodsSpec" :goodsSpuSpec="goodsSpuSpec"
            :goodsSku="goodsSku" :form="form" @getGoodsSku="getGoodsSku" />
        </template>
        <template v-slot:selecttmp>
          <div class="goods-param">
            <div class="goods-param__card">
              <div class="goods-param__title">
                <span class="goods-param__title-bar" />
                <span class="goods-param__title-text">参数模版</span>
                <span class="goods-param__title-hint">模版在「商品参数」模块维护</span>
              </div>
              <div class="goods-param__pick">
                <span class="goods-param__pick-label">选择模版</span>
                <el-select v-model="form.specTemplateId" class="goods-param__select" placeholder="请选择参数模版"
                  @change="handleTempChange">
                  <el-option v-for="item in tmpSelectData" :key="item.id" :label="item.name" :value="item.id" />
                </el-select>
              </div>
              <!-- 空态：未选模版 / 无参数行 -->
              <div v-if="!tmpTableData.length" class="goods-param__empty">
                <div class="goods-param__empty-box">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c0c7d1" stroke-width="1.8"
                    stroke-linecap="round">
                    <path d="M4 5h16M4 10h16M4 15h10M4 20h7" />
                  </svg>
                </div>
                <div class="goods-param__empty-title">选择参数模版可快速填充商品规格参数</div>
                <div class="goods-param__empty-desc">如产地、规格、储存条件；模版在「商品参数」模块维护</div>
              </div>
              <!-- 参数表：grid 自绘，编辑绑定 tmpTableData 行引用 -->
              <div v-else class="goods-param__table">
                <div class="goods-param__head">
                  <div />
                  <div>名称</div>
                  <div>类型</div>
                  <div>内容（可编辑）</div>
                </div>
                <div v-for="(row, index) in tmpTableData" :key="index" class="goods-param__row">
                  <div class="goods-param__drag" title="拖拽排序">⠿</div>
                  <div class="goods-param__name">{{ row.name }}</div>
                  <div class="goods-param__type">
                    <span v-if="row.type == 0">单选</span>
                    <span v-else-if="row.type == 1">多选</span>
                    <span v-else-if="row.type == 2">输入框</span>
                  </div>
                  <div class="goods-param__content">
                    <el-input v-if="row.type == 2" v-model="row.value" />
                    <el-radio-group v-else-if="row.type == 0" v-model="row.value">
                      <el-radio v-for="(item, i) in row.content" :key="i" :value="item">
                        {{ item }}
                      </el-radio>
                    </el-radio-group>
                    <el-checkbox-group v-else-if="row.type == 1" v-model="row.checkValue">
                      <el-checkbox v-for="(item, i) in row.content" :key="i" :value="item">
                        {{ item }}
                      </el-checkbox>
                    </el-checkbox-group>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
        <template v-slot:description>
          <div class="goods-detail-layout">
            <div class="goods-detail-editor">
              <BaseEditor ref="editorRef" v-model:value="form.description" :showBackTop="false"
                :showBottomAction="false" @editorScroll="handleEditorScroll" />
              <div class="split-actions">
                <el-button circle class="action-up" @click="scrollToTop" title="回到顶部">
                  <el-icon>
                    <Top />
                  </el-icon>
                </el-button>
                <el-button circle class="action-down" @click="scrollToBottom" title="回到底部">
                  <el-icon>
                    <Bottom />
                  </el-icon>
                </el-button>
              </div>
            </div>
            <div class="goods-detail-preview">
              <PhonePreview :html="form.description" :time="statusTime" :scrollRatio="editorScrollRatio" :maxWidth="480"
                :vhOffset="340" />
            </div>
          </div>
        </template>
        <template v-slot:brandId>
          <el-select v-model="form.brandId" :clearable="true" filterable placeholder="请选择商品品牌">
            <template #label="{ value }">
              <div class="brand-option">
                <span>{{ findBrandByBrandId(value).brandName }}</span>
                <el-image v-if="findBrandByBrandId(value).picUrl"
                  :src="findBrandByBrandId(value).picUrl" class="brand-logo" fit="contain" />
              </div>
            </template>
            <el-option v-for="item in brandDic" :key="item.id" :label="item.brandName" :value="item.id">
              <div class="brand-option">
                <span>{{ item.brandName }}</span>
                <el-image v-if="item.picUrl" :src="item.picUrl" class="brand-logo" fit="contain" />
              </div>
            </el-option>
          </el-select>
        </template>
        <template v-slot:picUrls>
          <material-list v-model:value="form.picUrls" :num="10" type="image" :width="100"
            :height="100" />
        </template>
        <template v-slot:videoUrl="scope">
          <div>
            <material-list :disabled="scope.type == 'view'"
              :value="form.videoUrl ? [form.videoUrl] : []" type="video" :num="1"
              @sureSuccess="form.videoUrl = $event ? $event[0] : ''" />
          </div>
        </template>
      </avue-form>
      </div>
      <!-- 提交成功态：蓝勾动画 + 返回列表/再发一件 -->
      <div v-if="submitDone" class="goods-wizard__done">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <circle cx="36" cy="36" r="34" stroke="var(--dc-brand)" stroke-opacity="0.25" stroke-width="2" />
          <circle cx="36" cy="36" r="26" fill="var(--dc-brand-soft)" />
          <path d="M24 37l8 8 16-18" stroke="var(--dc-brand)" stroke-width="5" stroke-linecap="round"
            stroke-linejoin="round"
            style="stroke-dasharray: 48; animation: dc-draw-check 0.6s var(--dc-ease) forwards" />
        </svg>
        <div class="goods-wizard__done-title">保存成功</div>
        <div class="goods-wizard__done-sub">{{ savedShelf === '1' ? '商品已上架，商城前台即可看到' : '商品已保存为下架状态，上架后前台可见' }}</div>
        <div class="goods-wizard__done-actions">
          <button type="button" class="goods-wizard__fbtn goods-wizard__fbtn--primary"
            @click="backToList">返回列表</button>
          <!-- 「再发一件」= 连续新建，仅新建模式提供；编辑模式下 props.goodsId 恒定，重置后提交仍走 putObj，故隐藏 -->
          <button v-if="!props.goodsId" type="button" class="goods-wizard__fbtn goods-wizard__done-again"
            @click="resetWizard">再发一件</button>
        </div>
      </div>
      <!-- footer（自绘，接管下一步/提交） -->
      <div v-if="!submitDone" class="goods-wizard__footer">
        <button v-if="tabsActive > 1" type="button" class="goods-wizard__fbtn goods-wizard__fbtn--ghost"
          @click="onPrevStep">上一步</button>
        <div style="flex: 1" />
        <span class="goods-wizard__draft">{{ saveText }}</span>
        <div style="flex: 1" />
        <button type="button" class="goods-wizard__fbtn goods-wizard__fbtn--primary" :disabled="submitLoading || initializing"
          @click="onFooterNext">
          {{ footerBtnText }}
        </button>
      </div>
    </div>
  </el-drawer>
</template>

<script lang="ts" setup>
import { getList as brandList } from '@/api/mall/goodsbrand'
import { getList as specList } from '@/api/mall/goodsspec'
import { addObj, getObj, putObj } from '@/api/mall/goodsspu'
import { fetchTree } from '@/api/mall/goodsspuspec'
import { getTemList, getPage as getTmpPage } from '@/api/mall/goodstmp'
import BaseEditor from '@/components/editor/BaseEditor.vue'
import MaterialList from '@/components/material/list.vue'
import PhonePreview from '@/components/preview/PhonePreview.vue'
import SkuForm from '@/components/sku/sku-form.vue'
import { tableOption as baseTableOption } from '@/const/crud/mall/goodsspu/index'
import { Bottom, Top } from '@element-plus/icons-vue'
import { computed, getCurrentInstance, nextTick, reactive, ref, watch } from 'vue'
import { useLoadingStage } from '@/components/dc-states'

import '../../goods-wizard-dc.scss'
import { appConfirm } from "@/components/overlay";

// Props
const props = defineProps<{
  visible: boolean
  goodsId: string
}>()

// Emits
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}>()

const { proxy } = getCurrentInstance()!

/** 向导步骤 = tableOption.group 的分组，顺序一致 */
const wizardSteps = [
  { title: '基本信息' },
  { title: '规格信息' },
  { title: '模版参数' },
  { title: '商品详情' },
]
const STEP_COUNT = wizardSteps.length

// 抽屉显示状态
const drawerVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

// 响应式数据
const formRef = ref(null)
let form = reactive({
  id: '',
  name: '',
  spuCode: '',
  sellPoint: '',
  picUrls: [] as string[],
  videoUrl: '',
  specType: '0',
  categoryId: [] as string[],
  brandId: '',
  saleNum: undefined as number | undefined,
  stockWarnLine: undefined as number | undefined,
  shelf: '1',
  description: '',
  specTemplateId: '',
  parameterJson: '',
}) as any

/** 重置表单到初始状态（用于新建商品时清除残留数据） */
const resetForm = () => {
  Object.assign(form, {
    id: '',
    name: '',
    spuCode: '',
    sellPoint: '',
    picUrls: [] as string[],
    videoUrl: '',
    specType: '0',
    categoryId: [] as string[],
    brandId: '',
    saleNum: undefined,
    stockWarnLine: undefined,
    // 发布即上架：默认上架，需要先存为下架时在表单里改
    shelf: '1',
    description: '',
    specTemplateId: '',
    parameterJson: '',
  })
  goodsSpuSpec.value = null
  goodsSku.value = []
  tmpTableData.value = []
  skuFormKey.value++
  tableOption.tabsActive = 1
  tabsActive.value = 1
}

const tableOption = reactive({ ...baseTableOption }) as any

// 提交成功态：为真时隐藏 footer 与表单体、显示蓝勾成功态（handleSave 成功后置真）
// 声明前置于 visible 侦听器之前，避免 immediate 侦听触发时的暂时性死区
const submitDone = ref(false)
/** 最近一次保存的上架状态，成功态文案用 */
const savedShelf = ref('1')
// 保存加载态（分级反馈：>300ms 转圈 / >1s 骨架，此处用于提交按钮文案与禁用）
const submitLoading = ref(false)
const { stage: saveStage } = useLoadingStage(submitLoading)
const originalSubmitText = tableOption.submitText
watch(saveStage, (s) => {
  tableOption.submitText = s !== 'none' ? '保存中…' : originalSubmitText
})
const tmpTableData = ref<any[]>([])
const tmpSelectData = ref<any[]>([])
const tabsActive = ref(1)
const goodsSpec = ref<any>(null)
const goodsSpuSpec = ref<any>(null)
const brandDic = ref<any[]>([])
const editorRef = ref<any>(null)

const scrollToTop = () => {
  const el = document.querySelector('.wangeditor-editor .w-e-scroll') as HTMLElement | null
  if (el) {
    el.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const scrollToBottom = () => {
  const el = document.querySelector('.wangeditor-editor .w-e-scroll') as HTMLElement | null
  if (el) {
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }
}
const goodsSku = ref<any[]>([])
const goodsSkuData = ref<any[]>([])
const goodsSpuSpecData = ref<any[]>([])
const skuFormKey = ref(0)
const statusTime = ref('')
const editorScrollRatio = ref(0)

// 格式化时间
const formatTime = (d: Date) => {
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}
statusTime.value = formatTime(new Date())

// 打开抽屉后的异步初始化是否进行中（遮罩表单、禁用提交）。
// avue 的 option / 字典一变就按外层 form 重新铺一遍表单值，初始化完成前输入的内容会被清空，
// 所以初始化完成前不让输入；initToken 防止快速关开时旧一轮的收尾把新一轮的遮罩提前撤掉。
const initializing = ref(false)
let initToken = 0

// 监听 visible 变化加载数据
watch(
  () => props.visible,
  async (val) => {
    if (val) {
      const token = ++initToken
      initializing.value = true
      // 每次打开重置成功态，避免上次提交成功后残留的蓝勾遮罩挡住表单
      submitDone.value = false
      try {
        loadDictionaries()
        if (props.goodsId) {
          await loadGoodsData()
        } else {
          // 新建商品时重置表单，清除上次编辑残留数据，并加载规格列表
          resetForm()
          specListF()
        }
        // 等 avue 按新 option / 字典重铺完表单再放开输入
        await nextTick()
        await nextTick()
      } finally {
        if (token === initToken) initializing.value = false
      }
    }
  },
  { immediate: true }
)

// 脏数据追踪：抽屉打开且用户改动 form 后置脏；保存或关闭后清零
const isDirty = ref(false)
watch(
  () => props.visible,
  (val) => {
    if (val) {
      // 打开抽屉后清零，防止上一次残留脏标记
      isDirty.value = false
    }
  }
)
watch(
  form,
  () => {
    if (props.visible) {
      isDirty.value = true
    }
  },
  { deep: true }
)

function handleBeforeClose(done: () => void) {
  if (!isDirty.value) {
    done()
    return
  }
  appConfirm({
    intent: "discard",
    title: '退出商品编辑',
    body: '有未保存的修改，退出后不会保留，确定退出？',
    verb: "退出",
  })
    .then(() => {
      isDirty.value = false
      done()
    })
    .catch(() => { })
}

// 加载字典数据
function loadDictionaries() {
  brandList().then((res) => {
    const d = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (res?.data?.records ?? []))
    brandDic.value = d
  })
}

// 加载商品数据
async function loadGoodsData() {
  if (!props.goodsId) return

  tableOption.tabsActive = 1
  tabsActive.value = 1
  goodsSpuSpec.value = []
  goodsSku.value = []
  tmpTableData.value = []

  try {
    const response = await getObj(props.goodsId)
    Object.assign(form, response.data)
    form.id = props.goodsId

    // 设置 categoryId 数组
    const selectedValue: string[] = []
    if (response.data.categoryFirst) selectedValue.push(response.data.categoryFirst)
    if (response.data.categorySecond) selectedValue.push(response.data.categorySecond)
    if (response.data.categoryThird) selectedValue.push(response.data.categoryThird)
    form.categoryId = selectedValue

    // 加载规格树
    await fetchTreeF({ spuId: form.id })
    await specListF()

    // 处理 SKU 数据
    const skus = (response.data.skus || []).map((val: any) => {
      val.picUrls = val.picUrl ? [val.picUrl] : []
      return val
    })
    goodsSku.value = skus
    skuFormKey.value++
  } catch (error) {
    console.error('加载商品数据失败:', error)
    proxy?.$message.error('加载商品数据失败')
  }
}

// 加载规格树
function fetchTreeF(params: any) {
  return fetchTree(params).then((res) => {
    goodsSpuSpec.value = res.data
  })
}

// 加载规格列表
function specListF() {
  return specList().then((res) => {
    goodsSpec.value = res.data
  })
}

// 获取 SKU 数据
function getGoodsSku(val: any, val2: any) {
  goodsSkuData.value = val
  goodsSpuSpecData.value = val2
}

// 编辑器滚动处理
function handleEditorScroll(payload: any) {
  const r = Number(payload?.ratio) || 0
  editorScrollRatio.value = Math.min(1, Math.max(0, r))
}

// 表单错误处理：avue 校验失败时回调 { 字段 prop: [{ message, field }] }。
// 自绘向导隐藏了 avue 的 tab 头，最后一步点「保存」时前面步骤的必填项没填，页面上看不到，
// 这里跳回最靠前的出错步骤并点名缺哪几项。
function handleError(err: any) {
  submitLoading.value = false
  const fields = err && typeof err === 'object' ? Object.keys(err) : []
  const groups: any[] = tableOption.group || []
  let step = 0
  const labels: string[] = []
  for (const f of fields) {
    const gi = groups.findIndex((g: any) => (g.column || []).some((c: any) => c.prop === f))
    const col = gi >= 0 ? groups[gi].column.find((c: any) => c.prop === f) : null
    const msg = Array.isArray(err[f]) ? err[f][0]?.message : ''
    labels.push(col?.label || msg || f)
    if (gi >= 0 && (step === 0 || gi + 1 < step)) step = gi + 1
  }
  if (step >= 1 && step <= STEP_COUNT) {
    tableOption.tabsActive = step
    tabsActive.value = step
  }
  const where = step ? `「${wizardSteps[step - 1]?.title}」` : '前面步骤'
  proxy?.$message({
    showClose: true,
    type: 'error',
    duration: 6000,
    message: labels.length
      ? `请先完善${where}：${[...new Set(labels)].join('、')}`
      : '表单校验未通过，请检查各步骤的必填项',
  })
}

// 保存商品
function handleSave(row: any, done: () => void) {
  submitLoading.value = true

  row.brandId = row.brandId || ''
  row.skus = goodsSkuData.value
  row.spuSpec = goodsSpuSpecData.value
  row.categoryFirst = row.categoryId?.[0] ?? ''
  row.categorySecond = row.categoryId?.[1] ?? ''
  row.categoryThird = row.categoryId?.[2] ?? ''

  row.skus.forEach((val: any) => {
    if (val.picUrls && val.picUrls.length > 0) {
      val.picUrl = val.picUrls[0]
    }
  })

  try {
    const tmpTableDataParsed = JSON.parse(JSON.stringify(tmpTableData.value)) as any[]
    const newtmpTableData = tmpTableDataParsed.map((item) => {
      if (item.type === 1) {
        item.value = item.checkValue
        delete item.checkValue
      } else if (item.type === 2 || item.type === 0) {
        delete item.checkValue
      }
      return item
    })
    row.parameterJson = JSON.stringify({
      id: form.specTemplateId,
      data: newtmpTableData,
    })
  } catch (e) {
    console.error('Error processing tmpTableData:', e)
    row.parameterJson = JSON.stringify({
      id: form.specTemplateId,
      data: [],
    })
  }

  const saveFn = props.goodsId ? putObj : addObj
  saveFn(row)
    .then(() => {
      proxy?.$message({
        showClose: true,
        message: props.goodsId ? proxy.$t('commons.updateSuccess') : proxy.$t('commons.addSuccess'),
        type: 'success',
      })
      done()
      submitLoading.value = false
      isDirty.value = false
      savedShelf.value = row.shelf
      // 提交成功后展示蓝勾成功态；emit('success') 与关闭时机在成功态「返回列表」按钮，「再发一件」则 resetWizard
      submitDone.value = true
    })
    .catch(() => {
      done()
      submitLoading.value = false
    })
}

// 关闭抽屉
function handleClose() {
  emit('update:visible', false)
}

// 取消事件
function handleCancel() {
  handleClose()
}

// 下一步
function onNextStep() {
  if (tabsActive.value < STEP_COUNT) {
    if (tableOption.tabsActive === 0) {
      tableOption.tabsActive = 1
    }
    tableOption.tabsActive++
    tabsActive.value++
  }
}

// ===== 自绘向导外壳（步骤条 / footer）辅助 =====
// 表单内核仍由 avue-form 渲染，此处仅驱动自绘步骤条与底部按钮
function stepClass(n: number) {
  if (n === tabsActive.value) return 'is-current'
  if (n < tabsActive.value) return 'is-done'
  return ''
}
// 回跳已达步骤：同步 tableOption.tabsActive 与 tabsActive，保证 avue-form 内容区随步骤条切换
function goStep(n: number) {
  if (n >= 1 && n <= tabsActive.value) {
    tableOption.tabsActive = n
    tabsActive.value = n
  }
}
function onPrevStep() {
  if (tabsActive.value > 1) {
    tableOption.tabsActive = tabsActive.value - 1
    tabsActive.value--
  }
}
const footerBtnText = computed(() =>
  tabsActive.value < STEP_COUNT ? `下一步：${wizardSteps[tabsActive.value]?.title ?? ''}` : '保存'
)
function onFooterNext() {
  if (tabsActive.value < STEP_COUNT) {
    onNextStep()
  } else {
    // 触发 avue-form @submit → handleSave
    formRef.value?.submit?.()
  }
}
const saveText = computed(() => (isDirty.value ? '有未保存的修改' : ''))
// 成功态「返回列表」：emit('success') 让父页面刷新列表 + 关抽屉
function backToList() {
  emit('success')
  drawerVisible.value = false
}
// 成功态「再发一件」：复用 resetForm 清空关键字段并回到第 1 步，关掉成功态继续新建
function resetWizard() {
  emit('success')
  resetForm()
  submitDone.value = false
  // resetForm 改动 form 会触发深度 watch 置脏，下一 tick 清零
  proxy?.$nextTick(() => { isDirty.value = false })
}
// 头部 ✕ / 关闭：复用脏数据二次确认
function requestClose() {
  handleBeforeClose(() => {
    drawerVisible.value = false
  })
}

// ===== 第 3 步参数模版懒加载 =====
// 任意路径（下一步 / 回跳 / 上一步）到达第 3 步都触发一次；tmpLoaded 防重复、避免覆盖用户已编辑值
const tmpLoaded = ref(false)
watch(
  () => props.visible,
  (val) => {
    if (val) tmpLoaded.value = false
  }
)
watch(tabsActive, (v) => {
  if (v === 3 && !tmpLoaded.value) {
    tmpLoaded.value = true
    loadTmpOptions()
  }
})

// 加载参数模版下拉，并按商品已存的 parameterJson 还原参数值
function loadTmpOptions() {
  getTmpPage({ current: 1, size: 200 }).then((res) => {
    tmpSelectData.value = res.data.records
    if (!form.parameterJson) return
    let parameterJson: any = null
    try {
      parameterJson = JSON.parse(form.parameterJson)
    } catch {
      return
    }
    form.specTemplateId = parameterJson?.id || ''
    tmpTableData.value = (parameterJson?.data || []).map((item: any) => {
      if (item.type === 1) {
        item.checkValue = item.value
        item.value = ''
      }
      return item
    })
  })
}

// 模板变更
function handleTempChange() {
  if (form.specTemplateId) {
    getTemList(form.specTemplateId).then((res) => {
      const _da = res.data as any[]
      tmpTableData.value = _da.map((item: any) => {
        let content: string[] = []
        if (item.goodsParameterValueList && item.goodsParameterValueList.length > 0) {
          content = item.goodsParameterValueList.map((it: any) => it.name as string)
        }
        return {
          name: item.name,
          sort: item.sort,
          type: item.type,
          content,
          value: '',
          checkValue: [],
        }
      })
    })
  }
}

// 获取品牌
const findBrandByBrandId = (brandId: string) => {
  return brandDic.value.find((item) => item.id === brandId) ?? {}
}
</script>

<style lang="scss" scoped>
// 商品向导：抽屉主体纵向弹性布局
.goods-edit-wizard {
  :deep(.el-drawer__body) {
    display: flex;
    flex-direction: column;
  }
}

:deep(.custom-form) {
  .avue-form__menu {
    --avue-form-menu-max-width: auto;
    --avue-form-menu-text-align: center;
  }

  // 规格信息下样式
  [index="2"] {
    .avue-form__tabs {
      justify-content: center;
    }

    .avue-form__group {
      justify-content: center;
    }

    .el-form-item__content {
      text-align: center;
    }

  }

}

:deep(.goods-edit-drawer-shell) {
  .el-drawer__header {
    padding: 20px 24px 12px;
    margin-bottom: 0;
    color: var(--dc-text-1);
    border-bottom: 1px solid var(--ds-border-light);
  }

  .el-drawer__body {
    padding: 0;
    background: var(--ds-page-bg);
  }
}

:deep(.goods-edit-drawer-shell.rtl) {
  border-radius: var(--ds-radius-lg) 0 0 var(--ds-radius-lg);
  box-shadow: var(--ds-shadow-dialog);
}

:deep(.goods-edit-drawer-shell) {
  .el-form-item.is-required .el-form-item__label::before {
    color: var(--dc-danger);
  }

  .avue-form__menu {
    position: sticky;
    bottom: 0;
    z-index: 5;
    padding: 12px 24px;
    background: var(--ds-surface);
    border-top: 1px solid var(--ds-border-light);
    box-shadow: var(--ds-shadow-header);
  }

  .avue-form__menu .el-button--primary,
  .avue-form__menu .el-button--success {
    color: #fff;
    background: var(--overlay-primary);
    border-color: var(--overlay-primary);
    box-shadow: var(--ds-shadow-brand);
  }

  .avue-form__menu .el-button--primary:hover,
  .avue-form__menu .el-button--success:hover {
    color: #fff;
    background: var(--overlay-primary-hover);
    border-color: var(--overlay-primary-hover);
  }
}

.goods-edit-drawer {
  min-height: 100%;
  padding: 16px 24px 0;
  background: var(--ds-page-bg);

  :deep(.avue-form) {
    padding: 0;
  }

  // 隐藏规格类型 label
  :deep(.el-form-item--specType > .el-form-item__label) {
    display: none !important;
  }

  // 规格类型按钮组圆角样式
  :deep(.el-radio-group) {
    .el-radio-button {
      &:first-child .el-radio-button__inner {
        border-top-left-radius: 6px;
        border-bottom-left-radius: 6px;
      }

      &:last-child .el-radio-button__inner {
        border-top-right-radius: 6px;
        border-bottom-right-radius: 6px;
      }

      &.is-active .el-radio-button__inner {
        outline-color: var(--el-radio-button-checked-border-color);
      }

      &:not(:first-child) {
        margin-left: -1px;
      }
    }
  }

  // 模板参数表格表头背景
  :deep(.el-table__header th.el-table__cell) {
    font-weight: 600;
    color: var(--dc-text-1);
    background-color: var(--ds-table-header-bg) !important;
  }


  // 步骤条风格的 tab 样式
  :deep(.el-tabs__nav-wrap) {
    &::after {
      display: none;
    }
  }

  // 标签式 checkbox 样式
  :deep(.el-checkbox-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  :deep(.el-checkbox) {
    justify-content: center;
    min-width: 6em;
    min-height: 36px;
    padding: 4px 12px;
    margin-right: 0;
    background-color: var(--ds-fill-soft);
    border: 1px solid var(--ds-border-light);
    border-radius: 999px;
    transition: all 0.2s;

    .el-checkbox__input {
      display: none;
    }

    .el-checkbox__label {
      padding-left: 4px;
      font-size: 14px;
      color: var(--dc-text-3);
      white-space: nowrap;
    }

    &.is-checked {
      background-color: var(--overlay-primary-soft);
      border-color: var(--el-color-primary);

      .el-checkbox__label {
        font-weight: 500;
        color: var(--el-color-primary);
      }
    }

    &:hover {
      border-color: var(--el-color-primary);
    }
  }

  :deep(.el-tabs:not(.default-el-tabs)) {

    // 隐藏默认 active-bar
    .el-tabs__active-bar {
      display: none !important;
    }

    .el-tabs__nav {
      position: relative;
      display: flex;
      gap: 0;
      align-items: flex-start;
      border: none !important;
    }

    .el-tabs__item {
      position: relative;
      flex: 1;
      min-width: 80px;
      height: auto;
      padding: 24px 12px 8px !important;
      font-size: 14px;
      line-height: 1.4;
      color: var(--dc-text-3);
      text-align: center;
      background: transparent !important;
      border: none !important;

      // 圆形节点
      &::before {
        position: absolute;
        top: 6px;
        left: 50%;
        z-index: 1;
        box-sizing: border-box;
        width: 10px;
        height: 10px;
        content: '';
        background: var(--ds-surface);
        border: 2px solid;
        border-radius: 50%;
        transition: all 0.3s;
        transform: translateX(-50%);
      }

      &:hover {
        color: var(--el-color-primary);

        &::before {
          border-color: var(--el-color-primary);
        }
      }

      &.is-active {
        font-weight: 600;
        color: var(--el-color-primary) !important;

        &::before {
          background: var(--el-color-primary);
          border-color: var(--el-color-primary);
        }
      }

      // active 之后的所有元素不显示绿线
      &.is-active~.el-tabs__item {
        &::after {
          position: absolute;
          top: 10px;
          right: 55%;
          left: -45%;
          z-index: 0;
          height: 2px;
          content: '';
          background: var(--ds-border-subtle);
        }

        &::before {
          border-color: #c0c4cc !important;
        }
      }

      // 已走过的绿色连接线：从当前 item 左边缘到圆心
      &:not(:nth-child(2))::after {
        position: absolute;
        top: 10px;
        right: 55%;
        left: -45%;
        z-index: 0;
        height: 2px;
        content: '';
        background: var(--el-color-primary);
      }

    }
  }
}

.brand-option {
  display: flex;
  gap: 10px;
  align-items: center;
}

.brand-logo {
  width: 25px;
  height: 25px;
}

.split-actions {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 4px;

  .el-button {
    box-sizing: border-box !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 36px !important;
    height: 36px !important;
    padding: 0 !important;
    margin-left: 0 !important;
    color: inherit;
    background-color: transparent;
    border: none;
    border-radius: 50% !important;

    .el-icon {
      font-size: 20px;
      font-weight: bold;
    }
  }

  .action-up {
    color: var(--el-color-success);
    background-color: var(--el-color-success-light-8);

    &:hover {
      color: var(--el-color-success);
      background-color: var(--el-color-success-light-7);
    }
  }

  .action-down {
    color: var(--dc-text-3);
    background-color: var(--ds-surface);
    border: 2px solid var(--el-border-color-lighter) !important;

    &:hover {
      color: var(--dc-text-3);
      background-color: var(--el-fill-color-light);
    }
  }
}

</style>
