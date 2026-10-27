<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
  <div class="welcome-banner goods-dc-card">
    <div class="welcome-banner__hello">
      {{ greeting }}{{ userInfo.nickName || userInfo.username }}
    </div>
    <div class="welcome-banner__sub">{{ bannerSub }}</div>
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import dayjs from "dayjs";
import { useUserStoreHook } from "@/store/modules/user";
import { useBrand } from "@/composables/useBrand";

const userInfo = useUserStoreHook().userInfo;
const brand = useBrand();

const greeting = computed(() => {
  const h = dayjs().hour();
  if (h < 6) return "凌晨好，";
  if (h < 12) return "上午好，";
  if (h < 14) return "中午好，";
  if (h < 18) return "下午好，";
  return "晚上好，";
});

const bannerSub = computed(
  () => `${brand.name.value} · ${dayjs().format("YYYY-MM-DD")} · 以下是商城今日经营概况`,
);
</script>
<style scoped>
.welcome-banner {
  padding: 20px 24px;
  background: linear-gradient(100deg, var(--dc-brand-soft) 0%, var(--dc-surface) 70%);
}

.welcome-banner__hello {
  font-size: var(--dc-fs-20);
  font-weight: 700;
  color: var(--dc-text-1);
}

.welcome-banner__sub {
  margin-top: 6px;
  font-size: var(--dc-fs-14);
  color: var(--dc-text-3);
}
</style>
