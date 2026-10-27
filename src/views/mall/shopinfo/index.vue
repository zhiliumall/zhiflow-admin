<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<!-- 系统管理 · 商城设置：商城名称、logo、客服电话（单店铺，固定读写默认店） -->
<template>
  <div class="shopinfo-dc">
    <DcConfigShell
      :providers="[]"
      :saving="saving"
      :show-save="canEdit"
      save-text="保存设置"
      @save="handleSave"
    >
      <template #banner>
        <div class="goodsspu-dc__banner">
          <div class="goodsspu-dc__banner-grid" />
          <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--1" />
          <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--2" />
          <div class="goodsspu-dc__banner-head">
            <div class="goodsspu-dc__banner-title">商城设置</div>
            <div class="goodsspu-dc__banner-sub">商城名称与 logo 会显示在后台顶栏和用户端，客服电话显示在用户端</div>
          </div>
        </div>
      </template>

      <DcConfigSection title="基本信息">
        <div class="shopinfo-dc__f">
          <div class="shopinfo-dc__f-label"><span class="shopinfo-dc__req">*</span>{{ $t("mall.shopinfo.name") }}</div>
          <input
            v-model="form.name"
            class="dc-cfg__input"
            :class="{ 'is-error': !!errs.name }"
            maxlength="50"
            :disabled="!canEdit"
            placeholder="如 智流商城"
            @input="errs.name = ''"
          >
          <div v-if="errs.name" class="shopinfo-dc__err">{{ errs.name }}</div>
        </div>

        <div class="shopinfo-dc__f">
          <div class="shopinfo-dc__f-label"><span class="shopinfo-dc__req">*</span>{{ $t("mall.shopinfo.phone") }}</div>
          <input
            v-model="form.phone"
            class="dc-cfg__input"
            :class="{ 'is-error': !!errs.phone }"
            maxlength="20"
            :disabled="!canEdit"
            placeholder="手机号或座机号"
            @input="errs.phone = ''"
          >
          <div v-if="errs.phone" class="shopinfo-dc__err">{{ errs.phone }}</div>
        </div>

        <div class="shopinfo-dc__f" style="grid-column: span 2">
          <div class="shopinfo-dc__f-label"><span class="shopinfo-dc__req">*</span>{{ $t("mall.shopinfo.imgUrl") }}</div>
          <material-list v-model:value="logo" type="image" :num="1" :width="100" :height="100" />
          <div class="shopinfo-dc__hint">建议上传正方形图片</div>
          <div v-if="errs.imgUrl" class="shopinfo-dc__err">{{ errs.imgUrl }}</div>
        </div>
      </DcConfigSection>
    </DcConfigShell>
  </div>
</template>
<script lang="ts" setup>
import { computed, getCurrentInstance, onMounted, reactive, ref, watch } from "vue";
import { getObj, putObj } from "@/api/mall/shopinfo";
import { DEFAULT_SHOP_ID, refreshBrand } from "@/composables/useBrand";
import DcConfigShell from "@/components/dc-shell/DcConfigShell.vue";
import DcConfigSection from "@/components/dc-shell/DcConfigSection.vue";
import MaterialList from "@/components/material/list.vue";
import { usePermissionStoreHook } from "@/store/modules/permission";

import "../goods-list-dc.scss";

defineOptions({ name: "ShopInfo" });

const { proxy } = getCurrentInstance()!;

const canEdit = computed(() => !!usePermissionStoreHook()?.permissions["mall:shopinfo:edit"]);

const form = ref<{ id: string; name: string; phone: string; imgUrl: string }>({
  id: DEFAULT_SHOP_ID,
  name: "",
  phone: "",
  imgUrl: "",
});
// MaterialList 的值是数组，保存时取第一张
const logo = ref<string[]>([]);
watch(logo, (v) => {
  form.value.imgUrl = v?.length ? v[0] : "";
  if (form.value.imgUrl) errs.imgUrl = "";
});
const saving = ref(false);
const errs = reactive<Record<string, string>>({});

function load() {
  getObj(DEFAULT_SHOP_ID).then((res: any) => {
    const d = res?.data || {};
    form.value = {
      id: d.id || DEFAULT_SHOP_ID,
      name: d.name || "",
      phone: d.phone || "",
      imgUrl: d.imgUrl || "",
    };
    logo.value = d.imgUrl ? [d.imgUrl] : [];
  });
}

function validate(): boolean {
  Object.keys(errs).forEach((k) => delete errs[k]);
  if (!form.value.name.trim()) errs.name = proxy.$t("mall.shopinfo.name") + proxy.$t("commons.notNull");
  if (!form.value.phone.trim()) errs.phone = proxy.$t("mall.shopinfo.phone") + proxy.$t("commons.notNull");
  else if (!/^[0-9+\-\s()]{5,20}$/.test(form.value.phone.trim())) errs.phone = "请输入正确的电话号码";
  if (!form.value.imgUrl) errs.imgUrl = proxy.$t("mall.shopinfo.imgUrl") + proxy.$t("commons.notNull");
  return !Object.keys(errs).length;
}

function handleSave() {
  if (!canEdit.value || !validate()) return;
  saving.value = true;
  putObj({
    id: form.value.id,
    name: form.value.name.trim(),
    phone: form.value.phone.trim(),
    imgUrl: form.value.imgUrl,
  })
    .then(() => {
      saving.value = false;
      proxy.$message({ showClose: true, message: proxy.$t("commons.saveSuccess"), type: "success" });
      // 顶栏商城名称 / logo 跟着刷新
      refreshBrand();
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
.shopinfo-dc__f {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.shopinfo-dc__f-label {
  display: flex;
  gap: 3px;
  align-items: center;
  font-size: 14px;
  color: var(--dc-text-2);
}

.shopinfo-dc__req {
  color: var(--dc-danger);
}

.shopinfo-dc__err {
  font-size: 14px;
  color: var(--dc-danger);
}

.shopinfo-dc__hint {
  font-size: 12px;
  line-height: 1.6;
  color: var(--dc-text-3);
}

:deep(.dc-cfg__input.is-error) {
  background: #fff7f7;
  border-color: var(--dc-danger);
}
</style>
