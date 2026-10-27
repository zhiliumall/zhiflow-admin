<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<!-- 系统管理 · 文件存储配置：本地存储 / MinIO（S3 兼容）二选一，全局一份 -->
<template>
  <div class="storagecfg-dc storagecfg-dc--config">
    <DcConfigShell
      :model-value="normStorageType(form.storageType) ?? ''"
      prov-title="存储方式"
      :providers="providers"
      :prov-error="errs.storageType"
      :test-text="isMinio ? '测试连接' : ''"
      :saving="saving"
      @update:model-value="pickProv"
      @test="handleTestConnection"
      @save="handleSave"
    >
      <!-- ══ 横幅：cloud 动图（照搬 banners-html/sys-cloud.html）+ blue tint ══ -->
      <template #banner>
        <div class="storagecfg-dc__banner">
          <div class="storagecfg-dc__banner-overlay">
            <div class="storagecfg-dc__banner-gridlines" />
            <div class="storagecfg-dc__banner-glow storagecfg-dc__banner-glow--1" />
            <div class="storagecfg-dc__banner-glow storagecfg-dc__banner-glow--2" />
          </div>
          <div class="storagecfg-dc__banner-title">
            {{ $t("upms.configstorage.config") }}
          </div>
          <div class="storagecfg-dc__banner-spacer" />
          <div class="storagecfg-dc__banner-art" aria-hidden="true">
            <span class="storagecfg-dc__cloud">
              <svg width="72" height="48" viewBox="0 0 72 48" fill="none">
                <path
                  d="M18 38a10 10 0 0 1-1-19.9A16 16 0 0 1 48 12a12 12 0 0 1 6 22.5"
                  fill="#FFFFFF" stroke="#3C6EF0" stroke-width="1.6" stroke-linejoin="round" />
                <path d="M36 42V24M29 31l7-7 7 7" stroke="#3C6EF0" stroke-width="1.8"
                  stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <span class="storagecfg-dc__folder">
              <svg width="34" height="28" viewBox="0 0 34 28" fill="none">
                <rect x="1" y="5" width="32" height="22" rx="3" fill="#FFFFFF" stroke="#5A86F5"
                  stroke-width="1.4" />
                <path d="M1 10h13l3-5H4a3 3 0 0 0-3 3z" fill="#EBF0FF" stroke="#5A86F5"
                  stroke-width="1.2" />
              </svg>
            </span>
            <span class="storagecfg-dc__cloud-dot" />
          </div>
        </div>
      </template>

      <!-- ══ 连接配置（仅 MinIO 需要） ══ -->
      <DcConfigSection
        v-if="isMinio"
        title="连接配置"
      >
        <div class="storagecfg-dc__f" style="grid-column: span 2">
          <div class="storagecfg-dc__f-label"><span class="storagecfg-dc__req">*</span>Endpoint</div>
          <input
            v-model="form.endpoint"
            class="dc-cfg__input storagecfg-dc__mono"
            :class="{ 'is-error': !!errs.endpoint }"
            placeholder="如 https://s3.example.com（浏览器可直接访问的外部地址）"
            @input="errs.endpoint = ''"
          >
          <div v-if="errs.endpoint" class="storagecfg-dc__err">{{ errs.endpoint }}</div>
          <div v-else-if="endpointCheck.warn" class="storagecfg-dc__warn">{{ endpointCheck.warn }}</div>
          <div class="storagecfg-dc__hint">
            MinIO / S3 兼容存储：文件地址 = Endpoint + Bucket + 文件路径，会原样写进商品图片等数据、由浏览器直接加载，
            所以必须填浏览器能访问的外部地址（推荐 https 域名），不能填容器名或内网地址；末尾带不带「/」都可以。
          </div>
        </div>

        <div class="storagecfg-dc__f">
          <div class="storagecfg-dc__f-label"><span class="storagecfg-dc__req">*</span>Bucket</div>
          <input
            v-model="form.bucket"
            class="dc-cfg__input storagecfg-dc__mono"
            :class="{ 'is-error': !!errs.bucket }"
            @input="errs.bucket = ''"
          >
          <div v-if="errs.bucket" class="storagecfg-dc__err">{{ errs.bucket }}</div>
        </div>

        <div class="storagecfg-dc__f">
          <div class="storagecfg-dc__f-label"><span class="storagecfg-dc__req">*</span>AccessKeyId</div>
          <input
            v-model="form.accessKeyId"
            class="dc-cfg__input storagecfg-dc__mono"
            :class="{ 'is-error': !!errs.accessKeyId }"
            @input="errs.accessKeyId = ''"
          >
          <div v-if="errs.accessKeyId" class="storagecfg-dc__err">{{ errs.accessKeyId }}</div>
        </div>

        <div class="storagecfg-dc__f" style="grid-column: span 2">
          <div class="storagecfg-dc__f-label"><span class="storagecfg-dc__req">*</span>AccessKeySecret</div>
          <input
            v-model="form.accessKeySecret"
            type="password"
            class="dc-cfg__input storagecfg-dc__mono"
            :class="{ 'is-error': !!errs.accessKeySecret }"
            @input="errs.accessKeySecret = ''"
          >
          <div v-if="errs.accessKeySecret" class="storagecfg-dc__err">{{ errs.accessKeySecret }}</div>
        </div>
      </DcConfigSection>

      <!-- ══ 图片配置 ══ -->
      <DcConfigSection :title="$t('upms.configstorage.imageConfiguration')">
      >
        <div class="storagecfg-dc__f" style="grid-column: span 2">
          <div class="storagecfg-dc__f-label">{{ $t("upms.configstorage.imageWatermark") }}</div>
          <input
            v-model="form.waterMarkContent"
            class="dc-cfg__input"
            placeholder="留空则不加水印"
          >
        </div>
      </DcConfigSection>
    </DcConfigShell>
  </div>
</template>
<script lang="ts" setup>
import { computed, getCurrentInstance, onMounted, reactive, ref } from "vue";
import { putObj, getObj2, type ObjVO } from "@/api/upms/configstorage";
import { http } from "@/utils/http";
import DcConfigShell from "@/components/dc-shell/DcConfigShell.vue";
import DcConfigSection from "@/components/dc-shell/DcConfigSection.vue";
import type { DcProvider } from "@/components/dc-shell/types";
// dc 壳样式（横幅/服务商卡/分节/页脚），内部 @import ../../mall/goods-list-dc.scss
import "./storage-dc.scss";
import { checkStorageEndpoint, MINIO_STORAGE_TYPE } from "./endpointCheck";

const { proxy } = getCurrentInstance()!;

const form = ref<ObjVO>({} as ObjVO);
/** 选 MinIO 才需要填连接配置；本地存储不需要任何参数 */
const isMinio = computed(() => String(normStorageType((form.value as any).storageType) ?? "") === MINIO_STORAGE_TYPE);
const endpointCheck = computed(() =>
  checkStorageEndpoint(normStorageType((form.value as any).storageType), (form.value as any).endpoint));
const saving = ref(false);
const errs = reactive<Record<string, string>>({});

onMounted(() => {
  handleGet();
  loadStorageDict();
});

function handleGet() {
  getObj2().then((response) => {
    form.value = response.data ? response.data : ({} as ObjVO);
  });
}

/** 保存前校验：存储方式必选；MinIO 时 Endpoint / Bucket / AccessKeyId / AccessKeySecret 必填 */
function validate(): boolean {
  Object.keys(errs).forEach((k) => delete errs[k]);
  const f: any = form.value;
  if (!String(normStorageType(f.storageType) ?? "").trim()) {
    errs.storageType = proxy.$t("upms.configstorage.selectStorageType");
  }
  if (!isMinio.value) return Object.keys(errs).every((k) => !errs[k]);
  if (!String(f.endpoint ?? "").trim()) {
    errs.endpoint = proxy.$t("upms.configstorage.endpointRequired");
  }
  const epCheck = checkStorageEndpoint(normStorageType(f.storageType), f.endpoint);
  if (!errs.endpoint && epCheck.error) {
    errs.endpoint = epCheck.error;
  }
  if (!String(f.accessKeyId ?? "").trim()) {
    errs.accessKeyId = proxy.$t("upms.configstorage.accessKeyIdRequired");
  }
  if (!String(f.accessKeySecret ?? "").trim()) {
    errs.accessKeySecret = proxy.$t("upms.configstorage.accessKeySecretRequired");
  }
  if (!String(f.bucket ?? "").trim()) {
    errs.bucket = proxy.$t("upms.configstorage.bucketRequired");
  }
  return Object.keys(errs).every((k) => !errs[k]);
}

function handleSave() {
  if (!validate()) return;
  saving.value = true;
  // 单店铺：始终使用本商城自己的存储配置
  putObj({ ...form.value, isSelf: "1" })
    .then((response: any) => {
      saving.value = false;
      form.value = response.data;
      proxy?.$message({
        showClose: true,
        message: proxy.$t("commons.updateSuccess"),
        type: "success",
      });
    })
    .catch((e: any) => {
      saving.value = false;
      // 拦截器已弹过 toast；只有 reject 裸 {msg} 那条路径没弹过
      if (e && typeof e === "object" && !(e instanceof Error) && e.msg) {
        proxy.$message({ showClose: true, message: e.msg, type: "error" });
      }
    });
}

// ==================== 存储方式卡片（字典 storage_type：0 本地 / 3 MinIO） ====================
const storageDict = ref<{ label: string; value: string }[]>([]);
// 字典接口异常时的兜底项
const FALLBACK_DICT = [
  { label: "本地存储", value: "0" },
  { label: "MinIO", value: "3" },
];
function provMeta(value: string) {
  if (value === "0") return { desc: "文件保存在服务器本机，适合单机与开发环境", rec: false };
  if (value === MINIO_STORAGE_TYPE) return { desc: "MinIO / S3 兼容对象存储，适合正式环境", rec: true };
  return { desc: "", rec: false };
}

const providers = computed<DcProvider[]>(() => {
  const list = storageDict.value.length ? storageDict.value : FALLBACK_DICT;
  return list
    .filter((d) => d.value === "0" || d.value === MINIO_STORAGE_TYPE)
    .map((d) => ({ value: d.value, name: d.label, ...provMeta(d.value) }));
});

function loadStorageDict() {
  http
    .request("get", "/upms/dict/type/storage_type")
    .then((res: any) => {
      const list = Array.isArray(res) ? res : res?.data || [];
      storageDict.value = Array.isArray(list) ? list : [];
    })
    .catch(() => {
      storageDict.value = [];
    });
}

// 兼容级联可能存的数组值,取末级与卡片值比对（双向同步不改数据结构）
function normStorageType(v: any) {
  return Array.isArray(v) ? v[v.length - 1] : v;
}
function pickProv(val: string | number) {
  form.value.storageType = val as any;
  errs.storageType = "";
}

// ==================== 测试连接（后端无连接测试接口，只做前端必填校验） ====================
function handleTestConnection() {
  const f: any = form.value;
  const required: Array<[any, string]> = [
    [f.endpoint, "endpoint"],
    [f.accessKeyId, "accessKeyId"],
    [f.accessKeySecret, "accessKeySecret"],
    [f.bucket, "bucket"],
  ];
  const missing = required
    .filter(([v]) => v == null || v === "")
    .map(([, name]) => name);
  if (missing.length) {
    proxy?.$message({
      showClose: true,
      message: `请先补全必填项：${missing.join("、")}`,
      type: "warning",
    });
    return;
  }
  proxy?.$message({
    showClose: true,
    message: "必填项已填写完整，请保存后确认文件可正常上传",
    type: "info",
  });
}
</script>
<style lang="scss" scoped>
/* 配置字段（DcConfigSection 栅格里的一格） */
.storagecfg-dc__f {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.storagecfg-dc__f-label {
  display: flex;
  gap: 3px;
  align-items: center;
  font-size: 14px;
  color: var(--dc-text-2);
}

.storagecfg-dc__req {
  color: var(--dc-danger);
}

.storagecfg-dc__err {
  font-size: 14px;
  color: var(--dc-danger);
}

.storagecfg-dc__hint {
  font-size: 12px;
  line-height: 1.6;
  color: var(--dc-text-3);
}

.storagecfg-dc__warn {
  font-size: 14px;
  color: var(--dc-warning);
}

.storagecfg-dc__mono {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
}

:deep(.dc-cfg__input.is-error) {
  background: #fff7f7;
  border-color: var(--dc-danger);
}
</style>
