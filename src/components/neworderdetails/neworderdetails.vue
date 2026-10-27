<script setup lang="ts">
/**
 * 订单详情面板（订单列表抽屉、订单详情页共用）。
 *
 * infpData = `GET /mall/orderinfo/{id}` 的 orderInfo 字段，外加宿主页挂上的
 * logistic（物流单）与 machineState（状态机状态，LEGACY_INVALID 时出「人工处理」）。
 * 发货、取消、改收货信息、人工处理成功后 emit('reload')，由宿主页重拉详情。
 */
import { orderCancel, putaddress, type OrderManualFixResult } from '@/api/mall/orderinfo'
import { appConfirm, message } from '@/components/overlay'
import { clientTypesOrder } from '@/const/clientType'
import { hasAnyPermission } from '@/utils/permission'
import { EditPen } from '@element-plus/icons-vue'
import { computed, ref, watch } from 'vue'
import OrderDeliveryDrawer from './OrderDeliveryDrawer.vue'
import OrderManualFix from './OrderManualFix.vue'
import '@/views/mall/order-dc.scss'
import '@/views/mall/orderdetail-dc.scss'

const emit = defineEmits<{
  (e: 'cloneView'): void
  (e: 'reload', id?: string): void
}>()
const props = defineProps<{
  infpData: Record<string, any>
}>()

const listOrderRecord = computed(() => props.infpData?.listOrderRecord || [])
/** 发货、取消、改收货信息都要 mall:orderinfo:edit（与后端同一个码，这里只管可见性） */
const canEdit = computed(() => hasAnyPermission(['mall:orderinfo:edit']))

/** 待付款：is_pay = '0' 且 status 为空（或 '0'） */
const isUnpaidPending = computed(() => {
  const s = String(props.infpData?.status ?? '')
  return String(props.infpData?.isPay ?? '') === '0' && (s === '' || s === '0')
})
const isShipPending = computed(() => String(props.infpData?.status ?? '') === '1')

/**
 * 状态机状态（由宿主页挂到 infpData 上；没挂 = undefined，「人工处理」入口不出现）。
 * 人工处理成功后先用回执里的新状态本地覆盖，让标记与按钮立刻消失；宿主页重拉详情带回新值、
 * 或换了一张单时清掉覆盖，以宿主页数据为准。
 */
const machineStateOverride = ref<string | null>(null)
const machineState = computed<string | null>(
  () => machineStateOverride.value ?? props.infpData?.machineState ?? null,
)
watch(
  () => [props.infpData?.id, props.infpData?.machineState],
  () => {
    machineStateOverride.value = null
  },
)
const onManualFixed = (result: OrderManualFixResult) => {
  machineStateOverride.value = result.to
  emit('reload', props.infpData?.id)
}
const cloneView = () => {
  emit('cloneView')
}

// ============ 发货 ============
const deliveryVisible = ref(false)
const onDelivered = () => emit('reload', props.infpData?.id)

// ============ 取消订单（只有待付款可取消） ============
const cancelling = ref(false)
async function onCancel() {
  if (cancelling.value) return
  try {
    await appConfirm({
      intent: 'danger',
      title: '取消订单',
      body: '该待付款订单将直接关闭，买家不可再支付。',
      verb: '取消订单',
    })
  } catch {
    return
  }
  cancelling.value = true
  try {
    await orderCancel(props.infpData?.id)
    message.success('订单已取消')
    emit('reload', props.infpData?.id)
  } catch {
    // 拦截器已提示后端原话
  } finally {
    cancelling.value = false
  }
}

// ============ 收货人信息编辑（发货前可改） ============
const receiverDialogVisible = ref(false)
const receiverForm = ref({ recName: '', recTel: '', recAddress: '' })
const canEditReceiver = computed(() => canEdit.value && (isUnpaidPending.value || isShipPending.value))

const openReceiverDialog = () => {
  receiverForm.value = {
    recName: props.infpData?.recName || '',
    recTel: props.infpData?.recTel || '',
    recAddress: props.infpData?.recAddress || '',
  }
  receiverDialogVisible.value = true
}

const saveReceiverInfo = async () => {
  if (!receiverForm.value.recName?.trim()) {
    message.warning('请输入收货人姓名')
    return
  }
  if (!receiverForm.value.recTel?.trim()) {
    message.warning('请输入联系电话')
    return
  }
  if (!receiverForm.value.recAddress?.trim()) {
    message.warning('请输入收货地址')
    return
  }
  try {
    await putaddress({
      id: props.infpData?.id,
      recName: receiverForm.value.recName,
      recTel: receiverForm.value.recTel,
      recAddress: receiverForm.value.recAddress,
    })
    message.success('收货人信息保存成功')
    receiverDialogVisible.value = false
    emit('reload', props.infpData?.id)
  } catch {
    // 拦截器已提示
  }
}

function toTwoDecimals(num: any) {
  const n = Number(num)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

// ============ 订单进度步骤 ============
const orderSteps = computed(() => {
  const status = String(props.infpData?.status ?? '')
  const isPaid = props.infpData?.isPay === '1'
  const createTime = props.infpData?.createTime

  /** 确保时间不早于前一个节点的时间（时间线不倒流） */
  const ensureAfter = (time: any, preTime: any) => {
    if (time && preTime && time < preTime) {
      return preTime
    }
    return time
  }

  const paymentTime = ensureAfter(props.infpData?.paymentTime, createTime)
  const deliveryTime = ensureAfter(props.infpData?.deliveryTime, paymentTime || createTime)
  const receiverTime = ensureAfter(props.infpData?.receiverTime, deliveryTime || paymentTime || createTime)
  const cancelTime = ensureAfter(props.infpData?.cancelTime || props.infpData?.closingTime, createTime)

  if (status === '5') {
    return [
      { title: '提交订单', time: createTime, done: true },
      { title: isPaid ? '已支付' : '待支付', time: paymentTime, done: isPaid },
      { title: '已取消', time: cancelTime, done: true },
    ]
  }

  return [
    { title: '提交订单', time: createTime, done: true },
    { title: '已支付', time: paymentTime, done: ['1', '2', '3'].includes(status) },
    { title: '待发货', time: '', done: ['2', '3'].includes(status) },
    { title: '已发货', time: deliveryTime, done: status === '3' },
    { title: '已完成', time: receiverTime, done: status === '3' },
  ]
})

// 当前激活的步骤索引：第一个未完成的节点；全部完成时返回总步数
const activeStep = computed(() => {
  const idx = orderSteps.value.findIndex(s => !s.done)
  return idx === -1 ? orderSteps.value.length : idx
})

const paymentTypeText = computed(() => {
  const map: Record<string, string> = { '1': '微信支付', '2': '支付宝' }
  return map[String(props.infpData?.paymentType ?? '')] || '--'
})

const appSourceText = computed(() => {
  const type = String(props.infpData?.appType ?? '')
  return clientTypesOrder[type as keyof typeof clientTypesOrder] || type || '--'
})

const ITEM_STATUS_TEXT: Record<string, string> = {
  NORMAL: '待发货',
  SHIPPED: '已发货',
  CANCELLED: '已取消',
}
function itemStatusText(item: any) {
  return ITEM_STATUS_TEXT[String(item?.itemStatus ?? '')] || '—'
}
</script>

<template>
  <div class="odd-dc">
    <!-- 顶部操作栏：标题 + 单号 + 状态药丸 + 操作按钮 + 关闭 -->
    <div class="odd-dc__topbar">
      <span class="odd-dc__title">订单详情</span>
      <span class="odd-dc__no">{{ infpData.orderNo }}</span>
      <span class="odd-dc__pill" :class="'is-s' + (infpData.status ?? '0')">{{ infpData.statusDesc || '—' }}</span>
      <!-- 状态机判为不合法组合（LEGACY_INVALID）时：状态异常标记 + 「人工处理」（mall:orderinfo:edit） -->
      <OrderManualFix :order-id="infpData.id" :machine-state="machineState" @fixed="onManualFixed" />
      <span class="odd-dc__spacer"></span>
      <button v-if="canEdit && isShipPending" type="button" class="odd-dc__btn odd-dc__btn--primary"
        @click="deliveryVisible = true">去发货</button>
      <button v-if="canEdit && isUnpaidPending" type="button" class="odd-dc__btn" :disabled="cancelling"
        @click="onCancel">取消订单</button>
      <span class="odd-dc__close" title="关闭" @click="cloneView">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </span>
    </div>

    <!-- 状态进度（节点式时间轴） -->
    <div class="odd-dc__steps">
      <template v-for="(step, index) in orderSteps" :key="index">
        <div class="odd-dc__step" :class="{
          'is-finish': index < activeStep,
          'is-process': index === activeStep && activeStep < orderSteps.length,
          'is-cancel': step.title === '已取消' && index < activeStep,
        }">
          <span class="odd-dc__step-dot">
            <svg v-if="step.title === '已取消' && index < activeStep" width="11" height="11" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
            <svg v-else-if="index < activeStep" width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
            <template v-else>{{ index + 1 }}</template>
          </span>
          <span class="odd-dc__step-label">{{ step.title }}</span>
          <span class="odd-dc__step-time">{{ step.time || '' }}</span>
        </div>
        <span v-if="index < orderSteps.length - 1" class="odd-dc__step-line"
          :class="{ 'is-on': index < activeStep }"></span>
      </template>
    </div>

    <!-- 滚动内容区 -->
    <div class="odd-dc__body">
      <!-- 三栏信息卡 -->
      <div class="odd-dc__grid">
        <!-- 收货人信息 -->
        <section class="odd-dc__card">
          <header class="odd-dc__card-hd">
            <i class="odd-dc__bar"></i>
            <span>收货人信息</span>
            <span v-if="canEditReceiver" class="edit-link" title="修改收货信息" @click="openReceiverDialog">
              <el-icon :size="14">
                <EditPen />
              </el-icon>
            </span>
          </header>
          <div class="odd-dc__rows">
            <div class="odd-dc__row">
              <span class="odd-dc__k">会员名称</span>
              <span class="odd-dc__v">{{ infpData.userInfo?.nickName || infpData.recName || '--' }}</span>
            </div>
            <div class="odd-dc__row">
              <span class="odd-dc__k">收货人</span>
              <span class="odd-dc__v">{{ infpData.recName || '--' }}</span>
            </div>
            <div class="odd-dc__row">
              <span class="odd-dc__k">联系电话</span>
              <span class="odd-dc__v">{{ infpData.recTel || '--' }}</span>
            </div>
            <div class="odd-dc__row">
              <span class="odd-dc__k">收货地址</span>
              <span class="odd-dc__v">{{ infpData.recAddress || '--' }}</span>
            </div>
            <div class="odd-dc__row">
              <span class="odd-dc__k">买家留言</span>
              <span class="odd-dc__v">{{ infpData.userMessage || '--' }}</span>
            </div>
          </div>
        </section>

        <!-- 配送信息 -->
        <section class="odd-dc__card">
          <header class="odd-dc__card-hd">
            <i class="odd-dc__bar"></i>
            <span>配送信息</span>
          </header>
          <div class="odd-dc__rows">
            <div class="odd-dc__row">
              <span class="odd-dc__k">配送方式</span>
              <span class="odd-dc__v">快递发货</span>
            </div>
            <div class="odd-dc__row">
              <span class="odd-dc__k">发货时间</span>
              <span class="odd-dc__v">{{ infpData.deliveryTime || '--' }}</span>
            </div>
            <div class="odd-dc__row">
              <span class="odd-dc__k">物流公司</span>
              <span class="odd-dc__v">{{ infpData.logistic?.logisticsName || '--' }}</span>
            </div>
            <div class="odd-dc__row">
              <span class="odd-dc__k">运单号</span>
              <span class="odd-dc__v">{{ infpData.logistic?.logisticsNo || '--' }}</span>
            </div>
          </div>
        </section>

        <!-- 付款信息 -->
        <section class="odd-dc__card">
          <header class="odd-dc__card-hd">
            <i class="odd-dc__bar"></i>
            <span>付款信息</span>
          </header>
          <div class="odd-dc__rows">
            <div class="odd-dc__row">
              <span class="odd-dc__k">订单编号</span>
              <span class="odd-dc__v">{{ infpData.orderNo || '--' }}</span>
            </div>
            <div class="odd-dc__row">
              <span class="odd-dc__k">订单来源</span>
              <span class="odd-dc__v">{{ appSourceText }}</span>
            </div>
            <div class="odd-dc__row">
              <span class="odd-dc__k">支付方式</span>
              <span class="odd-dc__v">{{ paymentTypeText }}</span>
            </div>
            <div class="odd-dc__row">
              <span class="odd-dc__k">付款时间</span>
              <span class="odd-dc__v">{{ infpData.paymentTime || '--' }}</span>
            </div>
            <div class="odd-dc__row">
              <span class="odd-dc__k">支付流水号</span>
              <span class="odd-dc__v">{{ infpData.transactionId || '--' }}</span>
            </div>
          </div>
        </section>
      </div>

      <!-- 商品明细 -->
      <section class="odd-dc__card odd-dc__goods">
        <header class="odd-dc__card-hd">
          <i class="odd-dc__bar"></i>
          <span>商品明细</span>
        </header>
        <div class="odd-dc__ghead">
          <span>商品信息</span>
          <span>单价</span>
          <span>数量</span>
          <span>小计</span>
          <span>发货状态</span>
        </div>
        <div v-for="item in (infpData.listOrderItem || [])" :key="item.id" class="odd-dc__gr">
          <div class="odd-dc__ginfo">
            <el-image :src="item.picUrl" fit="cover" class="odd-dc__gimg">
              <template #error>
                <div class="odd-dc__gimg-ph">
                  <span>暂无图片</span>
                </div>
              </template>
            </el-image>
            <div class="odd-dc__gmeta">
              <div class="odd-dc__gname">{{ item.spuName }}</div>
              <div class="odd-dc__gspec">{{ item.specInfo || '—' }}</div>
            </div>
          </div>
          <span class="odd-dc__gcell order-dc-amount">¥{{ toTwoDecimals(item.salesPrice) }}</span>
          <span class="odd-dc__gcell">×{{ item.quantity }}</span>
          <span class="odd-dc__gcell order-dc-amount">¥{{ toTwoDecimals((item.salesPrice || 0) * (item.quantity || 0)) }}</span>
          <span class="odd-dc__gcell odd-dc__gas">{{ itemStatusText(item) }}</span>
        </div>

        <!-- 金额汇总 -->
        <div class="odd-dc__sum">
          <div class="odd-dc__sum-row">
            <span>商品总额</span>
            <em class="order-dc-amount">¥{{ toTwoDecimals(infpData.salesPrice) }}</em>
          </div>
          <div class="odd-dc__sum-row">
            <span>运费</span>
            <em>+¥{{ toTwoDecimals(infpData.freightPrice) }}</em>
          </div>
          <div class="odd-dc__sum-divider"></div>
          <div class="odd-dc__sum-row odd-dc__sum-row--total">
            <span>实付金额</span>
            <em class="order-dc-amount order-dc-amount--brand">¥{{ toTwoDecimals(infpData.paymentPrice) }}</em>
          </div>
        </div>
      </section>

      <!-- 卖家备注 -->
      <section v-if="infpData.remark" class="odd-dc__card">
        <header class="odd-dc__card-hd">
          <i class="odd-dc__bar"></i>
          <span>卖家备注</span>
        </header>
        <div class="odd-dc__log-txt">{{ infpData.remark }}</div>
      </section>

      <!-- 订单日志 -->
      <section class="odd-dc__card">
        <header class="odd-dc__card-hd">
          <i class="odd-dc__bar"></i>
          <span>订单日志</span>
        </header>
        <div v-if="listOrderRecord && listOrderRecord.length" class="order-dc-timeline odd-dc__log">
          <div v-for="(item, index) in listOrderRecord" :key="index" class="order-dc-timeline__item"
            :class="{ 'is-active': index === 0 }">
            <div class="odd-dc__log-hd">
              <span class="odd-dc__log-tag">{{ item.recordSource || '系统' }}</span>
              <span class="order-dc-timeline__time">{{ item.createTime }}</span>
            </div>
            <div class="odd-dc__log-txt">{{ item.recordContent }}</div>
          </div>
        </div>
        <div v-else class="odd-dc__log-empty">
          暂无订单日志
        </div>
      </section>
    </div>
  </div>

  <OrderDeliveryDrawer v-model="deliveryVisible" :order="infpData" @done="onDelivered" />

  <!-- 收货人信息编辑对话框 -->
  <el-dialog v-model="receiverDialogVisible" title="编辑收货人信息" width="560px" append-to-body>
    <el-form :model="receiverForm" label-width="90px">
      <el-form-item label="收货人">
        <el-input v-model="receiverForm.recName" placeholder="请输入收货人姓名" maxlength="50" />
      </el-form-item>
      <el-form-item label="联系电话">
        <el-input v-model="receiverForm.recTel" placeholder="请输入联系电话" maxlength="20" />
      </el-form-item>
      <el-form-item label="收货地址">
        <el-input v-model="receiverForm.recAddress" type="textarea" :rows="3" placeholder="请输入详细收货地址" maxlength="200" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="receiverDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="saveReceiverInfo">保存</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss">
/* 布局/卡片/商品明细/金额/日志样式统一在 src/views/mall/orderdetail-dc.scss（odd-dc__ 前缀） */

/* 通用编辑图标按钮（全局，非 scoped） */
.edit-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-left: auto;
  font-size: 14px;
  color: var(--dc-brand);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background-color: color-mix(in srgb, var(--dc-brand) 10%, transparent);
  }
}

/* 让抽屉 body 容器支持固定头部 + 滚动内容的 flex 布局 */
.no-header-drawer .el-drawer__body {
  display: flex !important;
  flex-direction: column;
}

.no-header-drawer .el-scrollbar {
  display: flex !important;
  flex-direction: column;
}

.no-header-drawer .el-scrollbar__wrap {
  display: flex !important;
  flex-direction: column;
  overflow: hidden auto !important;
}
</style>
