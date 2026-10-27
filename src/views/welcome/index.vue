<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
  <div class="welcome-container goods-dc-page welcome-page">
    <!-- 欢迎条 -->
    <guide />
    <!-- 今日订单 / 今日销售额 / 在售商品 / 会员数 -->
    <overview-cards />
    <div class="welcome-layout">
      <!-- 近 7 天趋势 -->
      <trend-charts class="welcome-main" />
      <!-- 快捷入口 -->
      <section class="goods-dc-card welcome-side-card welcome-side">
        <div class="welcome-side-card__head">
          <span class="welcome-side-card__title">{{ $t("welcome.welcome.quickEntry") }}</span>
        </div>
        <guide-entries />
      </section>
    </div>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import "../mall/goods-dc.scss";
import AppFooter from "@/layout/components/footer/index.vue";
import Guide from "./components/guide.vue";
import GuideEntries from "./components/guideEntries.vue";
import OverviewCards from "./components/overviewCards.vue";
import TrendCharts from "./components/trendCharts.vue";
</script>

<style lang="scss" scoped>
.welcome-container {
  min-height: 100vh;
}

/* 两栏：趋势图自适应 + 右侧快捷入口 280px */
.welcome-layout {
  display: flex;
  gap: 16px;
  align-items: stretch;
}

.welcome-main {
  flex: 1;
  min-width: 0;
}

.welcome-side {
  flex: none;
  width: 280px;
}

.welcome-side-card {
  padding: 16px 20px 18px;
}

.welcome-side-card__head {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.welcome-side-card__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--dc-text-1);
}

@media (max-width: 960px) {
  .welcome-layout {
    flex-direction: column;
  }

  .welcome-side {
    width: auto;
  }
}
</style>

<!-- welcome 卡片规范类（全局，供子组件根节点透传 class 命中） -->
<style lang="scss">
.welcome-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}
</style>
