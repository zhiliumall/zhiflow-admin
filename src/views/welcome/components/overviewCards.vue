<template>
  <div class="overview-cards">
    <div
      v-for="card in cards"
      :key="card.key"
      class="overview-card goods-dc-card"
      :class="{ 'is-link': !!card.to }"
      @click="card.to && router.push(card.to)"
    >
      <div class="overview-card__icon" :style="{ color: card.color, background: card.bg }">
        <el-icon :size="20"><component :is="card.icon" /></el-icon>
      </div>
      <div class="overview-card__main">
        <div class="overview-card__label">{{ card.label }}</div>
        <div class="overview-card__value">{{ card.value }}</div>
        <div class="overview-card__sub">{{ card.sub }}</div>
      </div>
    </div>
  </div>
  <div v-if="error" class="overview-cards__error">
    经营数据加载失败，<span class="overview-cards__retry" @click="refresh">点击重试</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { Document, Goods, Money, User } from "@element-plus/icons-vue";
import { getCount as getGoodsCount } from "@/api/mall/goodsspu";
import { formatMoney } from "../composables/decimal";
import { useHomepageOverview } from "../composables/useHomepageOverview";

const router = useRouter();
const { data, error, load, refresh } = useHomepageOverview();

// 在售商品数 = 已上架（shelf=1）的商品数
const onSaleCount = ref<number | null>(null);
function loadGoodsCount() {
  getGoodsCount({ shelf: "1" })
    .then((res: any) => { onSaleCount.value = Number(res?.data ?? 0); })
    .catch(() => { onSaleCount.value = null; });
}

/** dailyMetrics 末位是今天，倒数第二位是昨天 */
const yesterday = computed(() => {
  const list = data.value?.dailyMetrics ?? [];
  return list.length >= 2 ? list[list.length - 2] : null;
});

const PLACEHOLDER = "—";

const cards = computed(() => {
  const d = data.value;
  const y = yesterday.value;
  return [
    {
      key: "orders",
      label: "今日订单",
      value: d ? String(d.today.paidOrderCount) : PLACEHOLDER,
      sub: y ? `昨日 ${y.paidOrderCount} 单（已支付）` : "已支付订单",
      icon: Document,
      color: "var(--dc-viz-1)",
      bg: "var(--dc-brand-soft)",
      to: "/mall/order/orderinfo",
    },
    {
      key: "sales",
      label: "今日销售额（元）",
      value: d ? formatMoney(d.today.grossPaidCashflow) : PLACEHOLDER,
      sub: y ? `昨日 ${formatMoney(y.grossPaidCashflow)}` : "已支付金额",
      icon: Money,
      color: "var(--dc-viz-2)",
      bg: "var(--dc-success-soft)",
      to: "",
    },
    {
      key: "goods",
      label: "在售商品",
      value: onSaleCount.value == null ? PLACEHOLDER : String(onSaleCount.value),
      sub: "已上架商品数",
      icon: Goods,
      color: "var(--dc-viz-3)",
      bg: "var(--dc-warning-soft)",
      to: "/mall/goods/goodsspu",
    },
    {
      key: "users",
      label: "会员数",
      value: d?.users.totalUserCount == null ? PLACEHOLDER : String(d.users.totalUserCount),
      sub: d?.users.todayNewUserCount == null ? "累计注册会员" : `今日新增 ${d.users.todayNewUserCount}`,
      icon: User,
      color: "var(--dc-viz-4)",
      bg: "var(--dc-purple-bg)",
      to: "/mall/user/userInfo",
    },
  ];
});

onMounted(() => {
  load();
  loadGoodsCount();
});
</script>

<style scoped>
.overview-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.overview-card {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 18px 20px;
}

.overview-card.is-link {
  cursor: pointer;
  transition: box-shadow var(--dc-dur-micro) var(--dc-ease);
}

.overview-card.is-link:hover {
  box-shadow: var(--dc-shadow-pop);
}

.overview-card__icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--dc-radius-md);
}

.overview-card__main {
  min-width: 0;
}

.overview-card__label {
  font-size: var(--dc-fs-14);
  color: var(--dc-text-3);
}

.overview-card__value {
  margin-top: 6px;
  font-size: var(--dc-fs-24);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--dc-text-1);
  white-space: nowrap;
}

.overview-card__sub {
  margin-top: 4px;
  font-size: var(--dc-fs-12);
  color: var(--dc-text-3);
}

.overview-cards__error {
  margin-top: -6px;
  font-size: var(--dc-fs-13);
  color: var(--dc-danger);
}

.overview-cards__retry {
  text-decoration: underline;
  cursor: pointer;
}

@media (max-width: 1200px) {
  .overview-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
