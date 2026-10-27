<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<!--
  系统管理 · 支付配置：微信支付（H5 / JSAPI）与支付宝（H5），普通商户模式，每种类型全局一份。
  证书文件经 POST /pay/payconfig/cert/upload 存到服务器，表单里保存的是服务器上的文件路径。
-->
<template>
  <div class="payconfig-dc">
    <DcConfigShell
      :model-value="payType"
      prov-title="支付方式"
      prov-sub="两种方式分别保存，未配置的方式在用户端不展示"
      :prov-columns="2"
      :providers="providers"
      :saving="saving"
      :show-save="canSave"
      save-text="保存配置"
      @update:model-value="switchType"
      @save="handleSave"
    >
      <template #banner>
        <div class="goodsspu-dc__banner">
          <div class="goodsspu-dc__banner-grid" />
          <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--1" />
          <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--2" />
          <div class="goodsspu-dc__banner-head">
            <div class="goodsspu-dc__banner-title">{{ $t("pay.payconfig.title") }}</div>
            <div class="goodsspu-dc__banner-sub">普通商户模式收款：微信支付支持 H5 与公众号 JSAPI，支付宝支持手机网站（H5）支付</div>
          </div>
        </div>
      </template>

      <!-- ══ 微信支付 ══ -->
      <template v-if="payType === TYPE_WX">
        <DcConfigSection title="商户信息" sub="微信支付商户平台 › 账户中心">
          <div class="payconfig-dc__f">
            <div class="payconfig-dc__f-label"><span class="payconfig-dc__req">*</span>AppID</div>
            <input v-model="form.appId" class="dc-cfg__input payconfig-dc__mono" :class="{ 'is-error': !!errs.appId }"
              maxlength="64" :disabled="!canSave" placeholder="与商户号绑定的公众号 AppID" @input="errs.appId = ''">
            <div v-if="errs.appId" class="payconfig-dc__err">{{ errs.appId }}</div>
            <div v-else class="payconfig-dc__hint">JSAPI 支付要求与「微信网页授权配置」里的公众号 AppID 一致</div>
          </div>
          <div class="payconfig-dc__f">
            <div class="payconfig-dc__f-label"><span class="payconfig-dc__req">*</span>商户号</div>
            <input v-model="form.mchId" class="dc-cfg__input payconfig-dc__mono" :class="{ 'is-error': !!errs.mchId }"
              maxlength="64" :disabled="!canSave" placeholder="10 位数字" @input="errs.mchId = ''">
            <div v-if="errs.mchId" class="payconfig-dc__err">{{ errs.mchId }}</div>
          </div>
        </DcConfigSection>

        <DcConfigSection title="密钥" sub="商户平台 › 账户中心 › API 安全">
          <div class="payconfig-dc__f">
            <div class="payconfig-dc__f-label"><span class="payconfig-dc__req">*</span>APIv2 密钥</div>
            <input v-model="form.mchKey" type="password" autocomplete="new-password" class="dc-cfg__input payconfig-dc__mono"
              :class="{ 'is-error': !!errs.mchKey }" maxlength="2048" :disabled="!canSave" placeholder="32 位商户密钥"
              @input="errs.mchKey = ''">
            <div v-if="errs.mchKey" class="payconfig-dc__err">{{ errs.mchKey }}</div>
          </div>
          <div class="payconfig-dc__f">
            <div class="payconfig-dc__f-label">APIv3 密钥</div>
            <input v-model="form.apiV3Key" type="password" autocomplete="new-password" class="dc-cfg__input payconfig-dc__mono"
              maxlength="64" :disabled="!canSave" placeholder="32 位 APIv3 密钥">
          </div>
          <div class="payconfig-dc__f" style="grid-column: span 2">
            <div class="payconfig-dc__f-label">API 证书序列号</div>
            <input v-model="form.certSerialNo" class="dc-cfg__input payconfig-dc__mono" maxlength="64" :disabled="!canSave"
              placeholder="APIv3 证书序列号">
          </div>
        </DcConfigSection>
      </template>

      <!-- ══ 支付宝 ══ -->
      <template v-else>
        <DcConfigSection title="应用信息" sub="支付宝开放平台 › 应用详情 › 开发设置（公钥证书模式）">
          <div class="payconfig-dc__f" style="grid-column: span 2">
            <div class="payconfig-dc__f-label"><span class="payconfig-dc__req">*</span>AppID</div>
            <input v-model="form.appId" class="dc-cfg__input payconfig-dc__mono" :class="{ 'is-error': !!errs.appId }"
              maxlength="64" :disabled="!canSave" placeholder="支付宝应用 AppID" @input="errs.appId = ''">
            <div v-if="errs.appId" class="payconfig-dc__err">{{ errs.appId }}</div>
          </div>
          <div class="payconfig-dc__f" style="grid-column: span 2">
            <div class="payconfig-dc__f-label"><span class="payconfig-dc__req">*</span>应用私钥</div>
            <textarea v-model="form.mchKey" class="dc-cfg__input payconfig-dc__mono payconfig-dc__textarea"
              :class="{ 'is-error': !!errs.mchKey }" maxlength="2048" :disabled="!canSave"
              placeholder="RSA2 应用私钥（不含首尾标记行）" @input="errs.mchKey = ''" />
            <div v-if="errs.mchKey" class="payconfig-dc__err">{{ errs.mchKey }}</div>
          </div>
        </DcConfigSection>
      </template>

      <!-- ══ 证书 ══ -->
      <DcConfigSection title="证书" :sub="payType === TYPE_WX ? '微信支付 API 证书' : '公钥证书模式需要三张证书'">
        <div v-for="c in certFields" :key="c.prop" class="payconfig-dc__f" style="grid-column: span 2">
          <div class="payconfig-dc__f-label"><span v-if="c.required" class="payconfig-dc__req">*</span>{{ c.label }}</div>
          <div v-if="form[c.prop]" class="payconfig-dc__cert">
            <el-tag :closable="canSave" @close="form[c.prop] = ''">{{ String(form[c.prop]).slice(-60) }}</el-tag>
          </div>
          <el-upload
            v-else-if="canSave"
            :action="certUploadUrl"
            :headers="uploadHeaders()"
            :limit="1"
            :accept="c.accept"
            :show-file-list="false"
            :on-success="(r: any) => onCertUploaded(c.prop, r)"
            :on-error="onCertError"
          >
            <el-button size="small" type="primary">{{ $t("pay.payconfig.clickUpload") }}</el-button>
          </el-upload>
          <div class="payconfig-dc__hint">{{ c.hint }}</div>
          <div v-if="errs[c.prop]" class="payconfig-dc__err">{{ errs[c.prop] }}</div>
        </div>
      </DcConfigSection>
    </DcConfigShell>
  </div>
</template>
<script lang="ts" setup>
import { computed, getCurrentInstance, onMounted, reactive, ref } from "vue";
import { addObj, getByType, putObj, type PayConfigVO } from "@/api/pay/payconfig";
import DcConfigShell from "@/components/dc-shell/DcConfigShell.vue";
import DcConfigSection from "@/components/dc-shell/DcConfigSection.vue";
import type { DcProvider } from "@/components/dc-shell/types";
import { usePermissionStoreHook } from "@/store/modules/permission";
import { getToken } from "@/utils/auth";
import { apiUrl } from "@/utils/http/apiUrl";

import "../../mall/goods-list-dc.scss";

defineOptions({ name: "PayConfig" });

const { proxy } = getCurrentInstance()!;

/** 支付类型：1 微信支付；2 支付宝 */
const TYPE_WX = "1";
const TYPE_ALI = "2";
/** 收款模式：2 普通商户模式（开源版唯一模式） */
const MODEL_NORMAL = "2";

const providers = computed<DcProvider[]>(() => [
  { value: TYPE_WX, name: proxy.$t("pay.payconfig.wxPay"), desc: "微信内 JSAPI 支付、手机浏览器 H5 支付" },
  { value: TYPE_ALI, name: proxy.$t("pay.payconfig.aliPay"), desc: "手机网站（H5）支付" },
]);

const permissions = computed(() => usePermissionStoreHook()?.permissions || {});
const payType = ref(TYPE_WX);
const form = ref<PayConfigVO>(emptyForm(TYPE_WX));
/** 当前类型是否已有配置：有 → PUT，没有 → POST */
const isEdit = computed(() => !!form.value.id);
const canSave = computed(() =>
  isEdit.value ? !!permissions.value["pay:payconfig:edit"] : !!permissions.value["pay:payconfig:add"],
);
const saving = ref(false);
const errs = reactive<Record<string, string>>({});

function emptyForm(type: string): PayConfigVO {
  return {
    type,
    model: MODEL_NORMAL,
    appId: "",
    mchId: "",
    mchKey: "",
    keyPath: "",
    privateKeyPath: "",
    privateCertPath: "",
    certSerialNo: "",
    apiV3Key: "",
  };
}

/** 证书槽：同一列在两种支付方式下含义不同（与后端 PayConfig 字段说明一致） */
const certFields = computed(() =>
  payType.value === TYPE_WX
    ? [
        { prop: "keyPath", label: "API 证书（apiclient_cert.p12）", accept: ".p12,.pfx", required: true, hint: "商户平台下载的 p12 证书" },
        { prop: "privateKeyPath", label: "API 证书私钥（apiclient_key.pem）", accept: ".pem,.key", required: false, hint: "APIv3 接口使用" },
        { prop: "privateCertPath", label: "API 证书（apiclient_cert.pem）", accept: ".pem,.crt,.cer", required: false, hint: "APIv3 接口使用" },
      ]
    : [
        { prop: "privateCertPath", label: "应用公钥证书（appCertPublicKey.crt）", accept: ".crt,.cer,.pem", required: true, hint: "开放平台生成的应用公钥证书" },
        { prop: "privateKeyPath", label: "支付宝公钥证书（alipayCertPublicKey_RSA2.crt）", accept: ".crt,.cer,.pem", required: true, hint: "开放平台下载" },
        { prop: "keyPath", label: "支付宝根证书（alipayRootCert.crt）", accept: ".crt,.cer,.pem", required: true, hint: "开放平台下载" },
      ],
);

function load(type: string) {
  Object.keys(errs).forEach((k) => delete errs[k]);
  getByType(type).then((res: any) => {
    if (payType.value !== type) return; // 切换期间迟到的响应不覆盖
    const d = res?.data;
    form.value = d ? { ...emptyForm(type), ...d, type, model: MODEL_NORMAL } : emptyForm(type);
  });
}

function switchType(v: string | number) {
  payType.value = String(v);
  form.value = emptyForm(payType.value);
  load(payType.value);
}

const certUploadUrl = apiUrl("/pay/payconfig/cert/upload");

function uploadHeaders() {
  return { Authorization: "Bearer " + getToken().access_token };
}
function onCertUploaded(prop: string, r: any) {
  // 接口返回 {"link": "服务器上的证书路径"}
  const body = typeof r === "string" ? JSON.parse(r) : r;
  if (body?.link) {
    form.value[prop] = body.link;
    errs[prop] = "";
  } else {
    proxy.$message({ showClose: true, message: body?.msg || "证书上传失败", type: "error" });
  }
}
function onCertError() {
  proxy.$message({ showClose: true, message: "证书上传失败，请检查文件格式（p12 / pfx / pem / key / crt / cer，不超过 2MB）", type: "error" });
}

/** 必填与后端 PayConfigValidator 一致：appId、密钥、keyPath；微信另需商户号，支付宝另需另外两张证书 */
function validate(): boolean {
  Object.keys(errs).forEach((k) => delete errs[k]);
  const f = form.value;
  if (!String(f.appId || "").trim()) errs.appId = "请输入 AppID";
  if (!String(f.mchKey || "").trim()) errs.mchKey = payType.value === TYPE_WX ? "请输入 APIv2 密钥" : "请输入应用私钥";
  if (payType.value === TYPE_WX && !String(f.mchId || "").trim()) errs.mchId = "请输入商户号";
  certFields.value.forEach((c) => {
    if (c.required && !f[c.prop]) errs[c.prop] = "请上传" + c.label;
  });
  return !Object.keys(errs).length;
}

function handleSave() {
  if (!canSave.value || !validate()) return;
  saving.value = true;
  const payload: PayConfigVO = { ...form.value, type: payType.value, model: MODEL_NORMAL };
  Object.keys(payload).forEach((k) => {
    if (typeof payload[k] === "string") payload[k] = payload[k].trim();
  });
  if (!payload.id) delete payload.id;
  const req = payload.id ? putObj(payload) : addObj(payload);
  req
    .then(() => {
      saving.value = false;
      proxy.$message({ showClose: true, message: proxy.$t("commons.saveSuccess"), type: "success" });
      load(payType.value);
    })
    .catch((e: any) => {
      saving.value = false;
      // 拦截器已弹过 toast；只有 reject 裸 {msg} 那条路径没弹过
      if (e && typeof e === "object" && !(e instanceof Error) && e.msg) {
        proxy.$message({ showClose: true, message: e.msg, type: "error" });
      }
    });
}

onMounted(() => load(payType.value));
</script>
<style lang="scss" scoped>
.payconfig-dc__f {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.payconfig-dc__f-label {
  display: flex;
  gap: 3px;
  align-items: center;
  font-size: 14px;
  color: var(--dc-text-2);
}

.payconfig-dc__req {
  color: var(--dc-danger);
}

.payconfig-dc__err {
  font-size: 14px;
  color: var(--dc-danger);
}

.payconfig-dc__hint {
  font-size: 12px;
  line-height: 1.6;
  color: var(--dc-text-3);
}

.payconfig-dc__mono {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
}

.payconfig-dc__textarea {
  height: 96px;
  padding: 8px 12px;
  resize: vertical;
}

.payconfig-dc__cert {
  display: flex;
  gap: 8px;
  align-items: center;
}

:deep(.dc-cfg__input.is-error) {
  background: #fff7f7;
  border-color: var(--dc-danger);
}
</style>
