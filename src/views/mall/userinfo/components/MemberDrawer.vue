<!-- 会员详情侧拉：基础资料、订单汇总、收货地址（只读）、拉黑 / 恢复 -->
<template>
  <el-drawer v-model="visible" title="会员详情" size="50%" direction="rtl" class="member-drawer goods-dc-drawer" append-to-body>
    <div v-loading="loading" class="member-drawer-content">
      <!-- 头像 + 昵称 + 状态 -->
      <div class="user-profile">
        <el-avatar :size="56" :src="userInfo.headimgUrl" shape="square">
          {{ (userInfo.nickName || '客').slice(0, 1) }}
        </el-avatar>
        <div class="profile-main">
          <div class="profile-name-row">
            <span class="profile-name">{{ userInfo.nickName || userInfo.phone || '未设昵称' }}</span>
            <el-tag v-if="isBlack(userInfo)" size="small" type="danger" effect="light" round>已拉黑</el-tag>
            <el-tag v-else size="small" type="success" effect="light" round>正常</el-tag>
          </div>
          <div class="profile-sub">编码 {{ userInfo.userCode ?? '-' }}</div>
        </div>
        <div style="flex: 1" />
        <el-button
          v-if="canEdit && userInfo.id"
          :type="isBlack(userInfo) ? 'primary' : 'danger'"
          plain
          @click="handleToggleBlack"
        >{{ isBlack(userInfo) ? '恢复正常' : '拉黑' }}</el-button>
      </div>

      <!-- 基础资料 -->
      <div class="info-card">
        <div class="card-title">基础资料</div>
        <div class="card-body card-grid">
          <div v-for="f in baseFields" :key="f.label" class="card-field">
            <span class="field-label">{{ f.label }}</span>
            <span class="field-value">{{ f.value || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 订单汇总（已支付订单） -->
      <div class="info-card">
        <div class="card-title">
          订单汇总
          <el-button v-if="canViewOrders" link type="primary" class="card-title__action" @click="viewOrders">查看订单</el-button>
        </div>
        <div class="card-body stat-row">
          <div class="stat-item">
            <span class="stat-label">累计订单</span>
            <span class="stat-value">{{ userInfo.orderTotal?.totalCount ?? 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">累计消费（元）</span>
            <span class="stat-value">{{ formatAmount(userInfo.orderTotal?.totalAmount) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">客单价（元）</span>
            <span class="stat-value">{{ formatAmount(userInfo.orderTotal?.avgOrderAmount) }}</span>
          </div>
        </div>
      </div>

      <!-- 收货地址（只读） -->
      <div v-if="canViewAddress" class="info-card">
        <div class="card-title">收货地址（{{ addresses.length }}）</div>
        <div class="card-body">
          <div v-if="!addresses.length" class="empty-text">暂无收货地址</div>
          <div v-for="addr in addresses" :key="addr.id" class="address-item">
            <div class="address-head">
              <span class="address-name">{{ addr.userName || '-' }}</span>
              <span class="address-tel">{{ addr.telNum || '-' }}</span>
              <el-tag v-if="addr.isDefault === '1'" size="small" effect="plain">默认</el-tag>
            </div>
            <div class="address-detail">
              {{ [addr.provinceName, addr.cityName, addr.countyName, addr.detailInfo].filter(Boolean).join(' ') || '-' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { getObj as getUserInfo } from '@/api/mall/userinfo'
import { getPage as getAddressPage } from '@/api/mall/useraddress'
import { clientTypes } from '@/const/clientType'
import { usePermissionStoreHook } from '@/store/modules/permission'
import { computed, ref, watch } from 'vue'
import { useBlackFlag } from './useBlackFlag'

const props = defineProps<{
  visible: boolean
  userId: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'refresh'): void
  (e: 'view-orders', userName: string): void
}>()

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const permissions = usePermissionStoreHook()?.permissions || {}
const canEdit = !!permissions['mall:userinfo:edit']
const canViewOrders = !!permissions['mall:orderinfo:index']
const canViewAddress = !!permissions['mall:useraddress:index']

const loading = ref(false)
const userInfo = ref<any>({})
const addresses = ref<any[]>([])

const SEX_TEXT: Record<string, string> = { '0': '未知', '1': '男', '2': '女' }

const baseFields = computed(() => {
  const u = userInfo.value
  return [
    { label: '昵称', value: u.nickName },
    { label: '手机号码', value: u.fullPhone || u.phone },
    { label: '邮箱', value: u.email },
    { label: '性别', value: SEX_TEXT[u.sex] },
    { label: '来源', value: (clientTypes as Record<string, string>)[u.appType] || u.appType },
    { label: '所在地区', value: [u.province, u.city].filter(Boolean).join(' ') },
    { label: '地址', value: u.address },
    { label: '注册时间', value: u.createTime },
    { label: '最近登录', value: u.lastLoginTime2 },
  ]
})

const formatAmount = (amount: number | string | undefined | null) => {
  if (amount === null || amount === undefined || amount === '') return '0.00'
  return Number(amount).toFixed(2)
}

async function fetchUserData() {
  if (!props.userId) return
  loading.value = true
  userInfo.value = {}
  addresses.value = []
  try {
    const [infoRes, addrRes] = await Promise.all([
      getUserInfo(props.userId),
      canViewAddress
        ? getAddressPage({ userId: props.userId, current: 1, size: 50, descs: 'is_default' })
        : Promise.resolve(null),
    ])
    userInfo.value = infoRes?.data || {}
    addresses.value = addrRes?.data?.records || []
  } finally {
    loading.value = false
  }
}

const { isBlack, toggleBlack } = useBlackFlag()
function handleToggleBlack() {
  toggleBlack(userInfo.value)
    .then(() => emit('refresh'))
    .catch(() => {})
}

function viewOrders() {
  emit('view-orders', userInfo.value.nickName || String(userInfo.value.userCode ?? ''))
}

watch(
  () => [props.visible, props.userId],
  ([newVisible, newUserId]) => {
    if (newVisible && newUserId) fetchUserData()
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.member-drawer-content {
  padding: 0 20px 24px;
}

.user-profile {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 0 16px;

  :deep(.el-avatar) {
    flex-shrink: 0;
    font-size: 22px;
    background-color: var(--dc-brand-soft);
    color: var(--dc-brand);
    border-radius: 8px !important;
  }

  .profile-name-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .profile-name {
    font-size: 18px;
    font-weight: 600;
    color: var(--dc-text-1);
  }

  .profile-sub {
    margin-top: 4px;
    font-size: 13px;
    color: var(--dc-text-3);
  }
}

.info-card {
  margin-bottom: 14px;
  overflow: hidden;
  background: var(--dc-surface);
  border: 1px solid var(--dc-divider);
  border-radius: 8px;

  .card-title {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    font-size: 15px;
    font-weight: 600;
    color: var(--el-color-primary);
  }

  .card-title__action {
    margin-left: auto;
  }

  .card-body {
    padding: 0 16px 14px;
  }
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 32px;
}

.card-field {
  display: flex;
  min-width: 0;
  font-size: 14px;
  line-height: 2.2;

  .field-label {
    flex-shrink: 0;
    width: 70px;
    color: var(--dc-text-3);
  }

  .field-value {
    overflow: hidden;
    color: var(--dc-text-1);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.stat-row {
  display: flex;
  gap: 40px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .stat-label {
    font-size: 13px;
    color: var(--dc-text-3);
  }

  .stat-value {
    font-size: 22px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--dc-text-1);
  }
}

.empty-text {
  font-size: 14px;
  color: var(--dc-text-3);
}

.address-item {
  padding: 10px 0;
  border-top: 1px solid var(--dc-divider);

  &:first-child {
    padding-top: 0;
    border-top: none;
  }
}

.address-head {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 14px;
  color: var(--dc-text-1);

  .address-name {
    font-weight: 600;
  }
}

.address-detail {
  margin-top: 4px;
  font-size: 13px;
  color: var(--dc-text-3);
}
</style>
