<template>
  <OrderListPage ref="orderListRef" default-status="1" key="orderpending" />
</template>

<script lang="ts" setup>
import { ref, watch, nextTick, onMounted, onActivated, onDeactivated, onUnmounted } from "vue";
import { getBulkOrderCount } from "@/api/mall/orderinfo";
import OrderListPage from "../orderinfo/OrderListPage.vue";

const orderListRef = ref<InstanceType<typeof OrderListPage>>();
const totalCount = ref(0);
let isActive = true;

function updateBadge() {
  if (!isActive) return;
  nextTick(() => {
    if (!isActive) return;
    const target = document.querySelector("#compact-tags-extra");
    if (!target) return;
    const old = target.querySelector(".order-count");
    if (old) old.remove();
    if (totalCount.value <= 0) return;
    const span = document.createElement("span");
    span.className = "order-count";
    span.textContent = `（${totalCount.value}）`;
    target.appendChild(span);
  });
}

function clearBadge() {
  const target = document.querySelector("#compact-tags-extra");
  if (!target) return;
  const old = target.querySelector(".order-count");
  if (old) old.remove();
}

function loadTotalCount() {
  getBulkOrderCount({}).then((response: any) => {
    if (response.code === 0 && response.data) {
      totalCount.value = response.data["1"] || 0;
      updateBadge();
    }
  }).catch(() => {});
}

onMounted(() => loadTotalCount());
onActivated(() => { isActive = true; loadTotalCount(); });
// keep-alive 未缓存时走 onUnmounted，缓存时走 onDeactivated
onDeactivated(() => { isActive = false; clearBadge(); });
onUnmounted(() => { isActive = false; clearBadge(); });

watch(
  () => orderListRef.value?.page?.total,
  (total) => {
    if (total != null && isActive) {
      totalCount.value = total;
      updateBadge();
    }
  }
);
</script>

<style scoped lang="scss">
.order-count {
  margin-left: 4px;
  font-size: 16px;
  font-weight: bold;
  color: var(--dc-danger);
}
</style>
