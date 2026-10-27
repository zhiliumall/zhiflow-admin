<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
  <div class="guide-entries">
    <div v-for="item in entries" :key="item.path" class="guide-entry" @click="router.push(item.path)">
      <span class="guide-entry__icon" :style="{ color: item.color }">
        <el-icon :size="20"><component :is="item.icon" /></el-icon>
      </span>
      <span class="guide-entry__label">{{ item.label }}</span>
    </div>
    <div v-if="h5Url" class="guide-entry" @click="dialogH5 = true">
      <span class="guide-entry__icon" style="color: var(--dc-viz-6)">
        <el-icon :size="20"><Iphone /></el-icon>
      </span>
      <span class="guide-entry__label">{{ $t("welcome.welcome.h5Mall") }}</span>
    </div>
  </div>
  <div v-if="!entries.length && !h5Url" class="guide-entries__empty">{{ $t("welcome.welcome.notData") }}</div>

  <!-- H5 商城链接：扫码或复制到手机浏览器打开 -->
  <el-dialog v-model="dialogH5" :title="$t('welcome.welcome.h5Mall')" width="360px" append-to-body>
    <div class="h5-link">
      <vue-qr :text="h5Url" :size="180" :margin="0" />
      <div class="h5-link__tip">{{ $t("welcome.welcome.mobileBrOpen") }}</div>
      <el-input :model-value="h5Url" readonly>
        <template #append>
          <el-button :icon="CopyDocument" @click="copyH5" />
        </template>
      </el-input>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { copyTextToClipboard } from "@pureadmin/utils";
import VueQr from "vue-qr/src/packages/vue-qr.vue";
import {
  CopyDocument,
  CreditCard,
  Document,
  Goods,
  Iphone,
  Menu,
  Picture,
  Setting,
  User,
  Van,
} from "@element-plus/icons-vue";
import { h5Url } from "@/config/env";

const router = useRouter();
const dialogH5 = ref(false);

/** 候选入口；只展示当前账号有权限（路由已注册）的页面 */
const CANDIDATES = [
  { path: "/mall/goods/goodsspu", label: "商品管理", icon: Goods, color: "var(--dc-viz-1)" },
  { path: "/mall/goods/goodscategory", label: "商品分类", icon: Menu, color: "var(--dc-viz-2)" },
  { path: "/mall/order/orderinfo", label: "商城订单", icon: Document, color: "var(--dc-viz-3)" },
  { path: "/mall/order/orderpending", label: "待发货", icon: Van, color: "var(--dc-viz-4)" },
  { path: "/mall/user/userInfo", label: "会员列表", icon: User, color: "var(--dc-viz-5)" },
  { path: "/mall/content/banner", label: "轮播图", icon: Picture, color: "var(--dc-viz-6)" },
  { path: "/sys/info", label: "商城设置", icon: Setting, color: "var(--dc-viz-7)" },
  { path: "/sys/payconfig", label: "支付配置", icon: CreditCard, color: "var(--dc-viz-8)" },
];

const entries = computed(() => {
  const registered = new Set(router.getRoutes().map(r => r.path));
  return CANDIDATES.filter(item => registered.has(item.path));
});

function copyH5() {
  copyTextToClipboard(h5Url) ? ElMessage.success("复制成功") : ElMessage.error("复制失败");
}
</script>

<style scoped>
.guide-entries {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.guide-entry {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  padding: 10px 4px;
  cursor: pointer;
  border-radius: var(--dc-radius-md);
  transition: background var(--dc-dur-micro) var(--dc-ease);
}

.guide-entry:hover {
  background: var(--dc-row-hover);
}

.guide-entry__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--dc-bg-page);
  border-radius: var(--dc-radius-md);
}

.guide-entry__label {
  font-size: var(--dc-fs-13);
  color: var(--dc-text-2);
  white-space: nowrap;
}

.guide-entries__empty {
  font-size: var(--dc-fs-13);
  color: var(--dc-text-3);
}

.h5-link {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.h5-link__tip {
  font-size: var(--dc-fs-13);
  color: var(--dc-text-3);
}
</style>
