<!-- 会员订单侧拉：按状态查看某个会员的订单，点「查看」跳到订单详情 -->
<template>
  <el-drawer v-model="visible" :title="title" size="900px" direction="rtl" class="order-drawer goods-dc-drawer" append-to-body>
    <div class="drawer-content">
      <div class="order-toolbar">
        <el-radio-group v-model="activeStatus" @change="handleSearch">
          <el-radio-button v-for="tab in orderTabs" :key="tab.value" :value="tab.value">{{ tab.label }}</el-radio-button>
        </el-radio-group>
        <div style="flex: 1" />
        <el-input
          v-model="orderNo"
          placeholder="订单号"
          clearable
          style="width: 220px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #suffix>
            <el-icon class="search-icon" @click="handleSearch"><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <el-table v-loading="loading" :data="tableData" border style="width: 100%">
        <el-table-column label="订单信息" min-width="280">
          <template #default="{ row }">
            <div class="order-info">
              <div class="order-no">{{ row.orderNo }}</div>
              <div class="order-time">{{ row.createTime }}</div>
              <div v-if="row.listOrderItem && row.listOrderItem.length" class="order-goods">
                <div v-for="(item, idx) in row.listOrderItem.slice(0, 2)" :key="idx" class="goods-item">
                  <el-image :src="item.picUrl" style="width: 36px; height: 36px; border-radius: 4px" fit="cover" />
                  <span class="goods-name">{{ item.spuName }}</span>
                  <span class="goods-qty">×{{ item.quantity }}</span>
                </div>
                <div v-if="row.listOrderItem.length > 2" class="more-goods">等 {{ row.listOrderItem.length }} 件商品</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="实付金额" width="120" align="right">
          <template #default="{ row }">¥{{ formatAmount(row.paymentPrice) }}</template>
        </el-table-column>
        <el-table-column label="收货人" min-width="140">
          <template #default="{ row }">
            <div>{{ row.recName || '-' }}</div>
            <div class="sub-text">{{ row.recTel || '' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">{{ row.statusDesc || '-' }}</template>
        </el-table-column>
        <el-table-column v-if="canViewDetail" label="操作" width="80" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleViewOrder(row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="page.currentPage"
          v-model:page-size="page.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="page.total"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSearch"
          @current-change="fetchData"
        />
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { getPage } from '@/api/mall/orderinfo'
import { usePermissionStoreHook } from '@/store/modules/permission'
import { Search } from '@element-plus/icons-vue'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  visible: boolean
  userId: string
  userName: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})
const title = computed(() => (props.userName ? `${props.userName} 的订单` : '会员订单'))

const router = useRouter()
const canViewDetail = !!usePermissionStoreHook()?.permissions?.['mall:orderinfo:get']

// 订单状态：0 待付款 / 1 待发货 / 2 待收货 / 3 已完成 / 5 已取消
const orderTabs = [
  { label: '全部', value: '' },
  { label: '待付款', value: '0' },
  { label: '待发货', value: '1' },
  { label: '待收货', value: '2' },
  { label: '已完成', value: '3' },
  { label: '已取消', value: '5' },
]

const loading = ref(false)
const tableData = ref<any[]>([])
const activeStatus = ref('')
const orderNo = ref('')
const page = reactive({ currentPage: 1, pageSize: 10, total: 0 })

const formatAmount = (amount: number | string | undefined | null) => {
  if (amount === null || amount === undefined || amount === '') return '0.00'
  return Number(amount).toFixed(2)
}

async function fetchData() {
  if (!props.userId) return
  loading.value = true
  try {
    const params: Record<string, any> = {
      current: page.currentPage,
      size: page.pageSize,
      userId: props.userId,
      descs: 'create_time',
    }
    if (activeStatus.value) params.status = activeStatus.value
    if (orderNo.value.trim()) params.orderNo = orderNo.value.trim()
    const response = await getPage(params)
    tableData.value = response.data?.records || []
    page.total = response.data?.total || 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.currentPage = 1
  fetchData()
}

// 跳到商城订单页，由订单页按 orderId 打开详情
function handleViewOrder(row: any) {
  visible.value = false
  router.push({ path: '/mall/order/orderinfo', query: { orderId: row.id } })
}

watch(
  () => [props.visible, props.userId],
  ([newVisible]) => {
    if (!newVisible) return
    activeStatus.value = ''
    orderNo.value = ''
    handleSearch()
  }
)
</script>

<style lang="scss" scoped>
.drawer-content {
  padding: 0 20px 20px;
}

.order-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

.search-icon {
  cursor: pointer;
}

.order-info {
  .order-no {
    font-weight: 600;
    color: var(--dc-text-1);
  }

  .order-time {
    margin: 2px 0 6px;
    font-size: 12px;
    color: var(--dc-text-3);
  }

  .goods-item {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 4px;
  }

  .goods-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .goods-qty,
  .more-goods {
    font-size: 12px;
    color: var(--dc-text-3);
  }
}

.sub-text {
  font-size: 12px;
  color: var(--dc-text-3);
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
