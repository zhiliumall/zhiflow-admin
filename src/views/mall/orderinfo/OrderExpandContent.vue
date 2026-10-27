<template>
  <div class="orderinfo-dc__card" :class="{ 'is-cancelled': isCancelled }">
    <!-- ══ 卡片头：批量选择框 + 订单号 + 复制 + 下单时间 + 来源 + 倒计时 ══ -->
    <div class="orderinfo-dc__card-head">
      <input type="checkbox" class="orderinfo-dc__checkbox" :checked="checked" title="选择此单"
        @change="$emit('toggleSelect', row, ($event.target as HTMLInputElement).checked)">
      <span class="orderinfo-dc__card-no">{{ row.orderNo }}</span>
      <span class="orderinfo-dc__card-copy" title="复制订单号" @click="copyText(row.orderNo)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
      </span>
      <span class="orderinfo-dc__card-time">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
        {{ row.createTime }}
      </span>
      <span v-if="appSourceLabel" class="orderinfo-dc__card-src">{{ appSourceLabel }}</span>
      <div class="orderinfo-dc__card-head-gap"></div>
      <span v-if="headCountdown" class="orderinfo-dc__card-countdown" :class="headCountdownClass">{{ headCountdown
        }}</span>
    </div>

    <!-- ══ 商品网格行（与 OrderListPage 统一表头同列） ══ -->
    <div class="orderinfo-dc__row">
      <!-- 商品信息（多商品纵向堆叠） -->
      <div class="orderinfo-dc__cell orderinfo-dc__goods">
        <div v-for="(item, idx) in row.listOrderItem" :key="'g-' + idx" class="orderinfo-dc__goods-item">
          <div v-if="item.picUrl" class="orderinfo-dc__goods-thumb">
            <el-image :src="item.picUrl" fit="contain" :preview-src-list="[item.picUrl]" preview-teleported
              :hide-on-click-modal="false" />
          </div>
          <div class="orderinfo-dc__goods-main">
            <div class="orderinfo-dc__goods-name">{{ item.spuName || '（未知商品）' }}</div>
            <div class="orderinfo-dc__goods-spec" :title="item.specInfo || ''">{{ item.specInfo || '' }}</div>
          </div>
        </div>
      </div>

      <!-- 单价·数量 -->
      <div class="orderinfo-dc__cell orderinfo-dc__stack orderinfo-dc__stack--right">
        <div v-for="(item, idx) in row.listOrderItem" :key="'q-' + idx" class="orderinfo-dc__stack-item">
          <span>¥{{ formatMoney(getItemUnitPrice(item)) }} ×
            <span class="orderinfo-dc__qty">{{ item.quantity }}</span>{{ piecesLabel }}</span>
        </div>
      </div>

      <!-- 实付金额：第二行灰字「含运费 ¥xx」，运费为 0 时不显示 -->
      <div class="orderinfo-dc__cell orderinfo-dc__cell--right">
        <div class="orderinfo-dc__paid-num">¥{{ formatMoney(orderPaid) }}</div>
        <div v-if="paidNote" class="orderinfo-dc__paid-note">{{ paidNote }}</div>
      </div>

      <!-- 买家信息 -->
      <div class="orderinfo-dc__cell">
        <div class="orderinfo-dc__buyer-line">
          {{ row.recName || '--' }}
          <PhoneMask :phone="row.recTel || ''" eye-title="查看完整手机号" />
        </div>
        <div class="orderinfo-dc__buyer-addr" :title="row.recAddress || ''">{{ row.recAddress || '' }}</div>
      </div>

      <!-- 支付·物流 -->
      <div class="orderinfo-dc__cell">
        <div class="orderinfo-dc__pay-line">
          <span v-if="!isCancelled" class="orderinfo-dc__pay-dot" :class="{ 'is-paid': isPaid }"></span>
          {{ isCancelled ? '交易关闭' : (isPaid ? paidLabel : '待支付') }}
        </div>
        <div class="orderinfo-dc__pay-express">{{ paymentTypeLabel }}</div>
      </div>

      <!-- 状态 -->
      <div class="orderinfo-dc__cell orderinfo-dc__status-cell">
        <span class="goods-dc-status" :class="orderStatusDcClass">{{ row.statusDesc || '--' }}</span>
      </div>

      <!-- 操作：主按钮 + 详情 + 更多▾ 下拉；危险项在下拉底部分组置底 -->
      <div class="orderinfo-dc__cell orderinfo-dc__actions">
        <button v-if="canShip" class="orderinfo-dc__main-btn is-brand" :class="{ 'is-loading': shipping }"
          @click="!shipping && emit('delivery', row)">
          <i v-if="shipping" class="orderinfo-dc__main-spin"></i>{{ shipping ? '发货中' : '发货' }}
        </button>
        <span class="orderinfo-dc__action-link" @click="$emit('detail', row)">详情</span>
        <el-popover v-if="menuItems.length" :visible="morePanelOpen" :width="confirmItem ? 240 : 144"
          placement="bottom-end" :teleported="true" :show-arrow="false" popper-class="orderinfo-dc__more-popover">
          <template #reference>
            <div ref="moreRef" class="orderinfo-dc__more">
              <span class="orderinfo-dc__action-link" @click="toggleMenu">{{ morePanelOpen ? '更多 ▴' : '更多 ▾' }}</span>
            </div>
          </template>
          <div ref="morePanelRef">
            <!-- 下拉面板（每张卡各自持有 menuOpen，不会「点一张卡所有卡都展开」） -->
            <div v-if="menuOpen" class="orderinfo-dc__more-panel">
              <div v-for="mi in normalMenuItems" :key="mi.key" class="orderinfo-dc__more-item" :title="mi.title"
                @click="runMenuItem(mi)">{{ mi.label }}</div>
              <div v-if="dangerMenuItems.length" class="orderinfo-dc__more-danger">
                <div v-for="mi in dangerMenuItems" :key="mi.key" class="orderinfo-dc__more-item is-danger"
                  :title="mi.title" @click="runMenuItem(mi)">{{ mi.label }}</div>
              </div>
            </div>
            <!-- 锚定二次确认小卡：危险项（取消订单）先在这里确认 -->
            <div v-if="confirmItem" class="orderinfo-dc__confirm-pop">
              <div class="orderinfo-dc__confirm-body">
                <span class="orderinfo-dc__confirm-dot">!</span>
                <div>
                  <div class="orderinfo-dc__confirm-title">确认{{ confirmItem.label }}？</div>
                  <div class="orderinfo-dc__confirm-text">{{ confirmItem.confirm?.text }}</div>
                </div>
              </div>
              <div class="orderinfo-dc__confirm-foot">
                <span class="orderinfo-dc__confirm-cancel" @click="closeMore">取消</span>
                <span class="orderinfo-dc__confirm-ok" @click="runConfirmedItem">确认</span>
              </div>
            </div>
          </div>
        </el-popover>
      </div>
    </div>

    <!-- ══ 附加行：卖家备注 ══ -->
    <div v-if="row.remark" class="orderinfo-dc__extra">
      <div class="orderinfo-dc__chip-row">
        <div class="orderinfo-dc__remark-line" :title="row.remark">
          <svg class="orderinfo-dc__remark-flag" width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path class="orderinfo-dc__remark-flag-pole" d="M5 21V4" stroke-width="2" />
            <path class="orderinfo-dc__remark-flag-body" d="M5 4h13l-2.5 4L18 12H5z" />
          </svg>
          备注:{{ row.remark }}
          <span v-if="canEdit" class="orderinfo-dc__remark-edit" @click="$emit('mark', row)">修改</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ========== 修改地址弹窗 ========== -->
  <el-dialog v-model="addressDialogVisible" :show-close="false" :show-header="false" width="800px"
    class="address-edit-dialog" style="--el-dialog-padding-primary: 0;" :append-to-body="true" align-center
    :close-on-click-modal="false" :body-style="{ padding: 0 }">
    <div class="address-dialog__body">
      <div class="address-dialog__content">
        <h3 class="address-dialog__title">修改<span class="text-primary">地址</span></h3>
        <p class="address-dialog__desc">请填写正确的收货信息，确保订单准确送达</p>

        <el-form ref="addressFormRef" :model="addressForm" :rules="addressRules" label-width="90px"
          class="address-dialog__form">
          <el-form-item label="联系人" prop="recName">
            <el-input v-model="addressForm.recName" placeholder="请输入收货人姓名" />
          </el-form-item>
          <el-form-item label="联系电话" prop="recTel">
            <el-input v-model="addressForm.recTel" placeholder="请输入联系电话" maxlength="20" />
          </el-form-item>
          <el-form-item label="地址" prop="recAddress">
            <div class="address-dialog__region-row">
              <regionalcomponent ref="addressRegionRef" @getAddress="onRegionChange" />
            </div>
            <el-input v-model="addressForm.recAddress" type="textarea" :rows="3" placeholder="请输入详细地址" resize="none"
              class="mt-3" />
          </el-form-item>
        </el-form>
      </div>

      <div class="address-dialog__actions">
        <el-button @click="addressDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="addressLoading" @click="confirmAddress">保存地址</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import PhoneMask from '@/components/PhoneMask/index.vue'
import regionalcomponent from '@/components/regionalcomponent/regionalcomponent.vue'
import { clientTypesOrder } from '@/const/clientType'
import { hasAnyPermission } from '@/utils/permission'
import { onClickOutside } from '@vueuse/core'
import { ElMessage } from 'element-plus'
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  formatShipCountdown,
  formatUnpaidCountdown,
  isShipPending,
  isUnpaidPending,
  resolvePromiseDeliveryAt,
  resolveUnpaidCloseAt,
} from './orderCountdown'
import '../orderinfo-dc.scss'

const { t } = useI18n()

const props = withDefaults(defineProps<{
  row: Record<string, any>
  /** 批量选择：本卡是否已勾选（选择态由 OrderListPage 统一管理，本组件只负责展示 + 上抛勾选事件） */
  checked?: boolean
  /** 卡头倒计时的时间基准，由 OrderListPage 单个 setInterval 统一下发（不要在卡内各起 timer） */
  now?: number
  /** 本单是否正在提交发货，主按钮据此切「发货中 + spinner」 */
  shipping?: boolean
}>(), {
  checked: false,
  now: 0,
  shipping: false,
})

const emit = defineEmits<{
  (e: 'detail', row: Record<string, any>): void
  (e: 'mark', row: Record<string, any>): void
  (e: 'delivery', row: Record<string, any>): void
  (e: 'editAddress', row: Record<string, any>, data: { recName: string; recTel: string; recAddress: string }, done: () => void): void
  /** 取消订单：已在订单卡的锚定确认小卡里确认过，宿主页不再二次确认 */
  (e: 'cancel', row: Record<string, any>): void
  (e: 'toggleSelect', row: Record<string, any>, checked: boolean): void
}>()

// ============ 卡片头右侧倒计时 ============
// 待付款 = 红字「M 分 SS 秒后自动关闭」；待发货 = 橙字「承诺发货 剩 H 小时 M 分」（口径见 orderCountdown.ts）
const isUnpaidPendingRow = computed(() => isUnpaidPending(props.row))
const headCountdown = computed<string>(() => {
  const nowTs = props.now || Date.now()
  if (isUnpaidPendingRow.value) {
    const at = resolveUnpaidCloseAt(props.row)
    return at === null ? '' : formatUnpaidCountdown(at - nowTs)
  }
  if (isShipPending(props.row)) {
    const at = resolvePromiseDeliveryAt(props.row)
    return at === null ? '' : formatShipCountdown(at - nowTs)
  }
  return ''
})
const headCountdownClass = computed(() => (isUnpaidPendingRow.value ? 'is-danger' : 'is-warning'))

// ============ 状态 ============
const isCancelled = computed(() => String(props.row.status) === '5')
const isPaid = computed(() => String(props.row.isPay) === '1')
/** 发货 / 备注 / 改地址 / 取消都要 mall:orderinfo:edit（与后端同一个码，这里只管可见性） */
const canEdit = computed(() => hasAnyPermission(['mall:orderinfo:edit']))
const canShip = computed(() => canEdit.value && isShipPending(props.row))

const piecesLabel = computed(() => t('mall.orderinfo.pieces'))
const paidLabel = computed(() => t('mall.orderinfo.paid', {}, '已支付'))
const paymentTypeLabel = computed(() => {
  const type = String(props.row.paymentType ?? '')
  if (type === '1') return t('mall.orderinfo.paymentType1')
  if (type === '2') return t('mall.orderinfo.paymentType2')
  return '--'
})

// 状态章语义色：待付款 warning、待发货 brand、待收货 cyan、已完成 success、已取消 muted
const ORDER_STATUS_DC_MOD: Record<string, string> = {
  '0': 'warning',
  '1': 'brand',
  '2': 'cyan',
  '3': 'success',
  '5': 'muted',
}
const orderStatusDcClass = computed(() => {
  const mod = isUnpaidPendingRow.value ? 'warning' : ORDER_STATUS_DC_MOD[String(props.row.status)]
  return `goods-dc-status--${mod ?? 'muted'}`
})

/** 订单来源文字（小程序 / 公众号 / H5 / APP / PC） */
const appSourceLabel = computed(() => {
  const typeVal = String(props.row.appType ?? '').trim()
  return clientTypesOrder[typeVal as keyof typeof clientTypesOrder] || typeVal
})

// ============ 金额 ============
const orderPaid = computed<number>(() => {
  const v = normalizeNumber(props.row?.paymentPrice)
  if (v !== null) return v
  return (props.row?.listOrderItem || []).reduce(
    (sum: number, it: any) => sum + (normalizeNumber(it?.paymentPrice) ?? 0), 0)
})
const paidNote = computed<string>(() => {
  const freight = normalizeNumber(props.row?.freightPrice) ?? 0
  return freight > 0 ? `含运费 ¥${formatMoney(freight)}` : ''
})

/** 单价使用销售价；缺少该字段时由商品项小计按数量反推 */
function getItemUnitPrice(item: any): number {
  const salesPrice = normalizeNumber(item?.salesPrice)
  if (salesPrice !== null) return salesPrice
  const paymentPrice = normalizeNumber(item?.paymentPrice) ?? 0
  const quantity = normalizeNumber(item?.quantity) ?? 1
  return quantity > 0 ? paymentPrice / quantity : paymentPrice
}

function formatMoney(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return '0.00'
  const num = typeof value === 'string' ? parseFloat(value) : value
  return isNaN(num) ? '0.00' : num.toFixed(2)
}

function normalizeNumber(value: any): number | null {
  if (value === undefined || value === null || value === '') return null
  const num = Number(value)
  return isNaN(num) ? null : num
}

function copyText(text: string) {
  const value = String(text ?? '')
  if (!value) return
  if (navigator.clipboard) {
    navigator.clipboard.writeText(value).then(() => ElMessage.success('复制成功')).catch(fallbackCopy)
  } else {
    fallbackCopy()
  }
  function fallbackCopy() {
    const ta = document.createElement('textarea')
    ta.value = value
    ta.style.cssText = 'position:fixed;left:-9999px;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    ElMessage.success('复制成功')
  }
}

// ============ 修改地址弹窗 ============
const addressDialogVisible = ref(false)
const addressLoading = ref(false)
const addressFormRef = ref()
const addressRegionRef = ref()
const regionText = ref('')
const addressForm = ref({ recName: '', recTel: '', recAddress: '' })
const addressRules = {
  recName: [{ required: true, message: '请输入收货人姓名', trigger: 'blur' }],
  recTel: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  recAddress: [{ required: true, message: '请输入详细地址', trigger: 'blur' }],
}

function openAddressDialog() {
  const row = props.row
  addressForm.value = { recName: row.recName || '', recTel: row.recTel || '', recAddress: '' }
  regionText.value = ''
  addressDialogVisible.value = true
  nextTick(() => {
    if (addressRegionRef.value) {
      const remaining = addressRegionRef.value.initAddress(row.recAddress)
      addressForm.value.recAddress = remaining ?? ''
    }
  })
}

function onRegionChange(d: any) {
  regionText.value = d.name.join('')
}

function confirmAddress() {
  addressFormRef.value.validate((valid: boolean) => {
    if (!valid) return
    addressLoading.value = true
    emit('editAddress', props.row, {
      recName: addressForm.value.recName,
      recTel: addressForm.value.recTel,
      recAddress: regionText.value + addressForm.value.recAddress,
    }, () => {
      addressLoading.value = false
      addressDialogVisible.value = false
      addressFormRef.value?.resetFields()
    })
  })
}

// ============ 操作列「更多▾」 ============
interface OrderMenuItem {
  key: string
  label: string
  /** 危险项：红字 + 置底分组 */
  danger?: boolean
  title?: string
  /** 有则先弹锚定确认小卡 */
  confirm?: { text: string }
  run: () => void
}

const menuItems = computed<OrderMenuItem[]>(() => {
  const row = props.row
  const items: OrderMenuItem[] = []
  if (!canEdit.value) return items
  items.push({ key: 'mark', label: '备注', title: row.remark || '点击添加备注', run: () => emit('mark', row) })
  // 发货前（待付款 / 待发货）可改收货地址
  if (isUnpaidPendingRow.value || isShipPending(row)) {
    items.push({ key: 'address', label: '修改地址', run: openAddressDialog })
  }
  // 后端状态机只允许从「待付款」取消
  if (isUnpaidPendingRow.value) {
    items.push({
      key: 'cancel',
      label: '取消订单',
      danger: true,
      confirm: { text: '该待付款订单将直接关闭，买家不可再支付。' },
      run: () => emit('cancel', row),
    })
  }
  return items
})

const normalMenuItems = computed(() => menuItems.value.filter(i => !i.danger))
const dangerMenuItems = computed(() => menuItems.value.filter(i => i.danger))

const moreRef = ref<HTMLElement>()
const morePanelRef = ref<HTMLElement>()
const menuOpen = ref(false)
const confirmKey = ref<string>('')
const confirmItem = computed(() => menuItems.value.find(i => i.key === confirmKey.value && i.confirm) ?? null)
const morePanelOpen = computed(() => menuOpen.value || !!confirmItem.value)

function closeMore() {
  menuOpen.value = false
  confirmKey.value = ''
}
function toggleMenu() {
  if (morePanelOpen.value) closeMore()
  else menuOpen.value = true
}
function runMenuItem(mi: OrderMenuItem) {
  if (mi.confirm) { menuOpen.value = false; confirmKey.value = mi.key; return }
  closeMore()
  mi.run()
}
function runConfirmedItem() {
  const item = confirmItem.value
  closeMore()
  item?.run()
}
// 点击卡外关闭（moreRef 只包住本卡的「更多▾」，所以每张卡的菜单彼此独立）
onClickOutside(moreRef, closeMore, { ignore: [morePanelRef] })
</script>

<style lang="scss" scoped>
/* 订单卡结构样式统一在 ../orderinfo-dc.scss（与 OrderListPage 统一表头共用同一网格） */

// ========== 修改地址弹窗 ==========
.address-dialog__body {
  display: flex;
  flex-direction: column;
  background: var(--dc-surface, #fff);
}

.address-dialog__content {
  padding: 32px 40px;
}

.address-dialog__title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  color: var(--dc-text-1);

  .text-primary {
    color: var(--dc-success);
  }
}

.address-dialog__desc {
  margin: 0 0 24px;
  font-size: 14px;
  color: var(--dc-text-3);
}

.address-dialog__form {
  .el-form-item {
    margin-bottom: 20px;
  }

  // 地址项：label 不换行，避免被挤压成多行
  .el-form-item:last-of-type {
    .el-form-item__label {
      white-space: nowrap;
    }
  }

  .el-input__inner,
  .el-textarea__inner {
    border-radius: 6px;
  }
}

.address-dialog__region-row {
  display: flex;
  flex: 1;
  flex-wrap: nowrap;

  >* {
    flex: 1;
    gap: 12px;
    min-width: 0;
  }
}

.address-dialog__actions {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  padding: 16px 24px;
  background: var(--dc-bg-header, #F7FAF9);
  border-top: 1px solid var(--dc-border, #f0f0f0);

  .el-button {
    min-width: 88px;
    border-radius: 6px;
  }
}
</style>
