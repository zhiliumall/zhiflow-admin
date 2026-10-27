<template>
  <OrderListPage ref="orderListRef" :order-id="orderId" key="orderinfo">
    <!-- ========== Tab 页签行（状态 Tab + 计数 badge + 下划线） ========== -->
    <template #tabs>
      <div class="goodsspu-dc__tabs orderinfo-tabs">
        <div class="goodsspu-dc__tabs-inner">
          <div v-for="tb in tabDefs" :key="tb.name" class="goodsspu-dc__tab orderinfo-tabs__tab"
            :class="{ 'is-active': tabStatus === tb.name }" @click="handleClickStatus(tb.name)">
            {{ tb.label }}
            <span v-if="tb.count !== null" class="goodsspu-dc__tab-badge">{{ tb.count }}</span>
            <span class="orderinfo-tabs__ink" :class="{ 'is-active': tabStatus === tb.name }"></span>
          </div>
        </div>
      </div>
    </template>
  </OrderListPage>
</template>

<script lang="ts" setup>
/**
 * 订单管理页 — 全部订单视图（带 Tab 切换）
 * 复用 OrderListPage 共享组件，仅负责 Tab 状态管理
 */
import { ref, computed, onActivated } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import OrderListPage from './OrderListPage.vue'

defineProps<{ orderId?: string }>()

const route = useRoute()
const { t } = useI18n()
const orderListRef = ref<InstanceType<typeof OrderListPage>>()

// Tab 状态：默认从路由参数读取，否则 '-1'（全部）
const tabStatus = ref<string>(route.query?.orderStatus ? String(route.query.orderStatus) : '-1')

/** Tab 定义：订单状态只有待付款 / 待发货 / 待收货 / 已完成 / 已取消（后端 OrderInfoEnum） */
const tabDefs = computed(() => [
  { name: '-1', label: t('mall.orderinfo.allOrders'), count: null as number | null },
  { name: '0', label: t('mall.orderinfo.pendingPayment'), count: orderListRef.value?.status0 ?? 0 },
  { name: '1', label: t('mall.orderinfo.toBeShipped'), count: orderListRef.value?.status1 ?? 0 },
  { name: '2', label: t('mall.orderinfo.toBeReceived'), count: orderListRef.value?.status2 ?? 0 },
  { name: '3', label: t('mall.orderinfo.completedOrders'), count: null },
  { name: '5', label: t('mall.orderinfo.canceledOrders'), count: null },
])

/** 清除其他页面残留到 #compact-tags-extra 的 badge */
function clearExtraBadge() {
  const target = document.querySelector('#compact-tags-extra')
  if (!target) return
  const old = target.querySelector('.order-count')
  if (old) old.remove()
}

onActivated(() => clearExtraBadge())

function handleClickStatus(name: string) {
  tabStatus.value = name
  orderListRef.value?.setStatus(name)
}
</script>

<style scoped lang="scss">
/* goodsspu-dc__tabs 通用块来自 goods-list-dc.scss（OrderListPage 已全局引入），此处仅补本页差异 */
.orderinfo-tabs {
  padding: 0 16px;
  background: var(--dc-surface);
}

.orderinfo-tabs__tab {
  position: relative;
}

/* 下划线 ink（每 tab 独立，激活时展开） */
.orderinfo-tabs__ink {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 3px;
  background: var(--dc-brand);
  border-radius: 4px 4px 0 0;
  opacity: 0;
  transition: opacity var(--dc-dur-modal) var(--dc-ease), transform var(--dc-dur-modal) var(--dc-ease);
  transform: scaleX(0.4);

  &.is-active {
    opacity: 1;
    transform: scaleX(1);
  }
}
</style>
