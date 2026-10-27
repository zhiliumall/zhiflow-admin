<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<!-- 系统管理 · 微信网页授权配置：公众号 AppID / AppSecret（用户端微信内登录、JSAPI 支付用），全局一份 -->
<template>
  <div class="wxapp-dc">
    <DcConfigShell
      :providers="[]"
      :saving="saving"
      :show-save="canSave"
      save-text="保存配置"
      @save="handleSave"
    >
      <template #banner>
        <div class="goodsspu-dc__banner">
          <div class="goodsspu-dc__banner-grid" />
          <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--1" />
          <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--2" />
          <div class="goodsspu-dc__banner-head">
            <div class="goodsspu-dc__banner-title">{{ $t("wxmp.wxapp.title") }}</div>
            <div class="goodsspu-dc__banner-sub">填写微信公众号（服务号）的开发者凭据，用于用户端在微信内授权登录与 JSAPI 支付</div>
          </div>
        </div>
      </template>

      <DcConfigSection title="公众号开发者凭据" sub="微信公众平台 › 设置与开发 › 基本配置">
        <div class="wxapp-dc__f">
          <div class="wxapp-dc__f-label"><span class="wxapp-dc__req">*</span>{{ $t("wxmp.wxapp.appId") }}</div>
          <input
            v-model="form.id"
            class="dc-cfg__input wxapp-dc__mono"
            :class="{ 'is-error': !!errs.id }"
            maxlength="32"
            :disabled="isEdit || !canSave"
            placeholder="wx 开头的 18 位字符"
            @input="errs.id = ''"
          >
          <div v-if="errs.id" class="wxapp-dc__err">{{ errs.id }}</div>
          <div v-else-if="isEdit" class="wxapp-dc__hint">AppID 保存后不可修改</div>
        </div>

        <div class="wxapp-dc__f">
          <div class="wxapp-dc__f-label"><span v-if="!isEdit" class="wxapp-dc__req">*</span>{{ $t("wxmp.wxapp.secret") }}</div>
          <input
            v-model="form.secret"
            type="password"
            autocomplete="new-password"
            class="dc-cfg__input wxapp-dc__mono"
            :class="{ 'is-error': !!errs.secret }"
            maxlength="64"
            :disabled="!canSave"
            :placeholder="isEdit ? '已配置，留空则不修改' : '请输入 AppSecret'"
            @input="errs.secret = ''"
          >
          <div v-if="errs.secret" class="wxapp-dc__err">{{ errs.secret }}</div>
        </div>

        <div class="wxapp-dc__f" style="grid-column: span 2">
          <div class="wxapp-dc__f-label">{{ $t("wxmp.wxapp.name") }}</div>
          <input
            v-model="form.name"
            class="dc-cfg__input"
            maxlength="50"
            :disabled="!canSave"
            placeholder="选填，便于识别"
          >
          <div class="wxapp-dc__hint">还需在公众号后台把用户端域名加入「网页授权域名」，并把服务器出口 IP 加入「IP 白名单」</div>
        </div>
      </DcConfigSection>
    </DcConfigShell>
  </div>
</template>
<script lang="ts" setup>
import { computed, getCurrentInstance, onMounted, reactive, ref } from "vue";
import { addObj, getPage, putObj } from "@/api/wxmp/wxapp";
import DcConfigShell from "@/components/dc-shell/DcConfigShell.vue";
import DcConfigSection from "@/components/dc-shell/DcConfigSection.vue";
import { usePermissionStoreHook } from "@/store/modules/permission";

import "../../mall/goods-list-dc.scss";

defineOptions({ name: "WxApp" });

const { proxy } = getCurrentInstance()!;

/** 应用类型：2 = 公众号 */
const APP_TYPE_OFFICIAL_ACCOUNT = "2";

const permissions = computed(() => usePermissionStoreHook()?.permissions || {});
/** 已有配置 → 编辑；还没有 → 新增 */
const isEdit = ref(false);
const canSave = computed(() =>
  isEdit.value ? !!permissions.value["wxmp:wxapp:edit"] : !!permissions.value["wxmp:wxapp:add"],
);

const form = ref({ id: "", secret: "", name: "" });
const saving = ref(false);
const errs = reactive<Record<string, string>>({});

function load() {
  getPage({ current: 1, size: 1, appType: APP_TYPE_OFFICIAL_ACCOUNT }).then((res: any) => {
    const row = res?.data?.records?.[0];
    isEdit.value = !!row;
    // AppSecret 从不回显
    form.value = { id: row?.id || "", secret: "", name: row?.name || "" };
  });
}

function validate(): boolean {
  Object.keys(errs).forEach((k) => delete errs[k]);
  const id = form.value.id.trim();
  if (!id) errs.id = "请输入 AppID";
  else if (!/^wx[0-9a-zA-Z]{16}$/.test(id)) errs.id = "AppID 格式不正确（wx 开头的 18 位字符）";
  if (!isEdit.value && !form.value.secret.trim()) errs.secret = "请输入 AppSecret";
  return !Object.keys(errs).length;
}

function handleSave() {
  if (!canSave.value || !validate()) return;
  saving.value = true;
  const payload: Record<string, any> = {
    id: form.value.id.trim(),
    appType: APP_TYPE_OFFICIAL_ACCOUNT,
    name: form.value.name.trim(),
  };
  // 留空不传：后端只更新非空字段，原 secret 保持不变
  if (form.value.secret.trim()) payload.secret = form.value.secret.trim();
  const req = isEdit.value ? putObj(payload) : addObj(payload);
  req
    .then(() => {
      saving.value = false;
      proxy.$message({ showClose: true, message: proxy.$t("commons.saveSuccess"), type: "success" });
      load();
    })
    .catch((e: any) => {
      saving.value = false;
      // 拦截器已弹过 toast；只有 reject 裸 {msg} 那条路径没弹过
      if (e && typeof e === "object" && !(e instanceof Error) && e.msg) {
        proxy.$message({ showClose: true, message: e.msg, type: "error" });
      }
    });
}

onMounted(load);
</script>
<style lang="scss" scoped>
.wxapp-dc__f {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.wxapp-dc__f-label {
  display: flex;
  gap: 3px;
  align-items: center;
  font-size: 14px;
  color: var(--dc-text-2);
}

.wxapp-dc__req {
  color: var(--dc-danger);
}

.wxapp-dc__err {
  font-size: 14px;
  color: var(--dc-danger);
}

.wxapp-dc__hint {
  font-size: 12px;
  line-height: 1.6;
  color: var(--dc-text-3);
}

.wxapp-dc__mono {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
}

:deep(.dc-cfg__input.is-error) {
  background: #fff7f7;
  border-color: var(--dc-danger);
}
</style>
