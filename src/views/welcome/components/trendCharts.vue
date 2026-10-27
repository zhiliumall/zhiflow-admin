<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
  <div class="trend-card goods-dc-card">
    <div class="trend-head">
      <div class="trend-tabs">
        <div class="trend-tab" :class="{ 'is-active': activeTab === 'orders' }" @click="setTab('orders')">
          订单量趋势
        </div>
        <div class="trend-tab" :class="{ 'is-active': activeTab === 'sales' }" @click="setTab('sales')">
          销售额（元）
        </div>
      </div>
      <div class="trend-spacer" />
      <span class="trend-range">近 7 天 · 已支付订单</span>
    </div>

    <DcSkeleton v-if="loading && !hasData" :toolbar="false" :rows="4" />
    <DcEmpty v-else-if="!hasData" title="暂无数据" description="有订单后这里会显示近 7 天趋势" :absolute="false" />
    <div v-show="hasData" ref="chartRef" class="trend-chart" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as echarts from "echarts";
import { DcEmpty, DcSkeleton } from "@/components/dc-states";
import { useHomepageOverview } from "../composables/useHomepageOverview";

// 与 tokens.css --dc-viz-1 / --dc-viz-2 对齐
const COLOR_ORDERS = "#3C6EF0";
const COLOR_SALES = "#26BF66";
const gridLineColor = "#EBEEF2";
const axisTextColor = "#5C6470";

const DAYS = 7;

const { data, loading, load } = useHomepageOverview();
const activeTab = ref<"orders" | "sales">("orders");

/** 取 dailyMetrics 的最后 7 天（末位是今天） */
const recent = computed(() => (data.value?.dailyMetrics ?? []).slice(-DAYS));
const hasData = computed(() => recent.value.length > 0);

const chartRef = ref<HTMLElement | null>(null);
let chart: echarts.ECharts | null = null;

function renderChart() {
  const dom = chartRef.value;
  if (!dom || !hasData.value) return;
  if (!chart) chart = echarts.init(dom);
  const isOrders = activeTab.value === "orders";
  const color = isOrders ? COLOR_ORDERS : COLOR_SALES;
  const areaTop = isOrders ? "rgba(60,110,240,0.3)" : "rgba(38,191,102,0.3)";
  const areaBottom = isOrders ? "rgba(60,110,240,0.02)" : "rgba(38,191,102,0.02)";
  chart.setOption(
    {
      xAxis: {
        type: "category",
        data: recent.value.map(d => String(d.date).slice(5)),
        boundaryGap: false,
        axisLine: { lineStyle: { color: gridLineColor } },
        axisLabel: { color: axisTextColor },
      },
      yAxis: {
        type: "value",
        minInterval: isOrders ? 1 : 0,
        axisLabel: { color: axisTextColor },
        splitLine: { lineStyle: { color: gridLineColor } },
      },
      grid: { left: "3%", right: "3%", top: "12%", bottom: "10%", containLabel: true },
      tooltip: {
        trigger: "axis",
        backgroundColor: "#FFFFFF",
        borderWidth: 0,
        textStyle: { color: "#1F2733" },
        extraCssText: "box-shadow: 0 8px 28px rgba(31,39,51,0.15);",
      },
      series: [
        {
          name: isOrders ? "订单数" : "销售额",
          // 金额是精确小数字符串，图表只做展示，转成数字即可
          data: recent.value.map(d => (isOrders ? d.paidOrderCount : Number(d.grossPaidCashflow) || 0)),
          type: "line",
          smooth: true,
          showSymbol: false,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: areaTop },
              { offset: 1, color: areaBottom },
            ]),
          },
          lineStyle: { color },
          itemStyle: { color },
        },
      ],
    },
    true,
  );
}

function setTab(tab: "orders" | "sales") {
  if (activeTab.value === tab) return;
  activeTab.value = tab;
  renderChart();
}

watch(recent, async () => {
  await nextTick();
  renderChart();
});

function onResize() {
  chart?.resize();
}

onMounted(async () => {
  window.addEventListener("resize", onResize);
  await load();
  await nextTick();
  renderChart();
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
  chart?.dispose();
  chart = null;
});
</script>

<style scoped>
.trend-card {
  padding: 20px;
}

.trend-head {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.trend-tabs {
  display: flex;
  gap: 24px;
}

.trend-tab {
  padding-bottom: 8px;
  font-size: 16px;
  color: var(--dc-text-3);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color var(--dc-dur-micro) var(--dc-ease);
}

.trend-tab:hover {
  color: var(--dc-brand);
}

.trend-tab.is-active {
  color: var(--dc-brand-active);
  border-bottom-color: var(--dc-brand);
}

.trend-spacer {
  flex: 1;
}

.trend-range {
  font-size: var(--dc-fs-13);
  color: var(--dc-text-3);
}

.trend-chart {
  width: 100%;
  height: 280px;
  margin-top: 12px;
}
</style>
