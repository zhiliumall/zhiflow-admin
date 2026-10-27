<template>
  <div v-loading="loading" class="body-wrap goods-dc-page">
    <neworderdetails v-if="orderdetailsData" :infpData="orderdetailsData" @cloneView="cloneView" @reload="load" />
    <DcEmpty v-else-if="!loading" title="订单不存在或已删除" :absolute="false" />
  </div>
</template>

<script setup lang="ts">
/**
 * 订单详情独立页：/mall/order/orderdetail?id=<订单 id>。
 * 与订单列表的详情抽屉共用 neworderdetails 面板。
 */
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getObj } from "@/api/mall/orderinfo";
import neworderdetails from "@/components/neworderdetails/neworderdetails.vue";
import { DcEmpty } from "@/components/dc-states";
import "../goods-dc.scss";
import "../order-dc.scss";

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const orderdetailsData = ref<Record<string, any> | null>(null);

function currentId(): string {
  const id = route.query.id ?? route.query.orderId;
  return String(Array.isArray(id) ? id[0] : id ?? "").trim();
}

function load() {
  const id = currentId();
  if (!id) {
    orderdetailsData.value = null;
    return;
  }
  loading.value = true;
  getObj(id)
    .then((res: any) => {
      const data = res?.data || {};
      orderdetailsData.value = data.orderInfo
        ? { ...data.orderInfo, logistic: data.logistic ?? null, machineState: data.machineState ?? null }
        : null;
    })
    .catch(() => {
      orderdetailsData.value = null;
    })
    .finally(() => {
      loading.value = false;
    });
}

watch(() => [route.query.id, route.query.orderId], load, { immediate: true });

const cloneView = () => {
  router.go(-1);
};
</script>

<style lang="scss" scoped>
.body-wrap {
  min-height: 200px;
  padding: 0 24px;
}
</style>
