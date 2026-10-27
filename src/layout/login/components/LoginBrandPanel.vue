<!-- 登录页左栏品牌区（视口 ≥1100px 才渲染）：点阵地图 + 运营链路示意，文案与行业无关。 -->
<template>
  <div class="hl-brand">
    <h1>{{ brandName }} 管理后台</h1>
    <p>商品、订单、会员、内容 —— 一处登录，全店掌控。</p>
    <div class="hl-banner">
      <img class="hl-banner-map" :src="worldDots" alt="" />
      <div class="hl-banner-glow1" />
      <div class="hl-banner-glow2" />
      <span class="hl-dot-w" />
      <span class="hl-dot-b" />
      <span class="hl-dot-g" />
      <span class="hl-arc1" />
      <span class="hl-arc2" />
      <div class="hl-banner-top">
        <div class="hl-chips">
          <span class="hl-chip">多端同步</span>
          <span class="hl-chip">数据实时</span>
          <span class="hl-chip">权限分明</span>
        </div>
      </div>
      <div class="hl-route">
        <span class="hl-route-node"><span class="hl-rd hl-rd--w" />上架商品</span>
        <span class="hl-route-line" />
        <span class="hl-route-node"><span class="hl-rd hl-rd--b" />订单履约</span>
        <span class="hl-route-line" />
        <span class="hl-route-node"><span class="hl-rd hl-rd--g" />数据复盘</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 仓库装了 vite-svg-loader，.svg 默认导出的是组件，这里要的是图片地址，必须带 ?url
import worldDots from "@/assets/login/world-dots.svg?url";
import { useBrand } from "@/composables/useBrand";

defineOptions({ name: "LoginBrandPanel" });

const brandName = useBrand({ anonymous: true }).name;
</script>
