<!--
  DcConfigShell —— 配置页（kind:'config' / 'form'）的整页外壳
  包含：provider 卡片选择区 / 表单区 / 子项区 / 底部说明 + 测试按钮 + 保存配置 的底部条

  ⚠ config 页不是表格页：没有筛选卡、没有工具栏、没有分页。别硬塞进 DcTableShell。

  ────────────────────────── 用法示例（sys-sms 短信配置） ──────────────────────────
  <DcConfigShell
    v-model="form.smsType"
    prov-title="短信服务商"
    prov-sub="切换后需重新填写密钥"
    :providers="providers"
    test-text="发送测试"
    :saving="saving"
    @test="onTest"
    @save="onSave"
  >
    <template #banner><MyBanner /></template>

    <DcConfigSection title="基础参数" sub="阿里云短信">
      <div style="display:flex;flex-direction:column;gap:6px;min-width:0;">
        <div style="font-size: 14px;color:var(--dc-text-2);display:flex;gap:3px;align-items:center;">
          <span style="color:var(--dc-danger);">*</span>AccessKeyId
        </div>
        <input v-model="form.accessKey" class="dc-cfg__input" placeholder="请输入 AccessKeyId">
      </div>
      <div style="grid-column:span 2;">…整宽字段…</div>
    </DcConfigSection>

    <template #sub>
      <DcConfigSection title="模板开关" :columns="3">…</DcConfigSection>
    </template>
  </DcConfigShell>
  ─────────────────────────────────────────────────────────────────────────────
-->
<template>
  <div class="dc-cfg">
    <slot name="banner" />

    <div style="display:flex;flex-direction:column;gap:12px;">
      <!-- ══════════ provider 卡片选择区 ══════════ -->
      <div
        v-if="providers.length"
        style="padding:16px 18px;background:var(--dc-surface);border:1px solid var(--dc-border);border-radius:8px;box-shadow:0 1px 2px rgb(0 0 0 / 4%);"
      >
        <div style="display:flex;gap:7px;align-items:center;">
          <span style="width:3px;height:13px;background:var(--dc-brand);border-radius:2px;" />
          <span style="font-size: 14px;font-weight:600;color:var(--dc-text-1);">{{ provTitle }}</span>
          <span v-if="provSub" style="font-size: 14px;color:var(--dc-text-3);">{{ provSub }}</span>
        </div>
        <div
          style="display:grid;gap:10px;margin-top:14px;"
          :style="{ gridTemplateColumns: `repeat(${provColumns}, 1fr)` }"
        >
          <div
            v-for="p in providers"
            :key="String(p.value)"
            class="dc-cfg__prov"
            style="position:relative;padding:12px 14px;cursor:pointer;border-radius:8px;transition:all .12s ease;"
            :style="{
              border: '2px solid ' + (isPicked(p) ? 'var(--dc-brand)' : 'var(--dc-border)'),
              background: isPicked(p) ? 'var(--dc-brand-soft)' : 'var(--dc-surface)',
              opacity: p.disabled ? 0.5 : 1,
              pointerEvents: p.disabled ? 'none' : 'auto',
            }"
            @click="pick(p)"
          >
            <div style="display:flex;gap:6px;align-items:center;">
              <span style="font-size: 14px;font-weight:600;color:var(--dc-text-1);">{{ p.name }}</span>
              <span
                v-if="p.rec"
                style="display:inline-flex;flex:none;align-items:center;height:17px;padding:0 6px;font-size: 12px;color:var(--dc-warning);background:var(--dc-warning-soft);border-radius:3px;"
              >推荐</span>
              <div style="flex:1;" />
              <span
                v-if="isPicked(p)"
                style="display:inline-flex;flex:none;align-items:center;justify-content:center;width:16px;height:16px;background:var(--dc-brand);border-radius:50%;"
              >
                <svg
                  width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff"
                  stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"
                ><path d="M4 12.5l5 5L20 6.5" /></svg>
              </span>
            </div>
            <div
              v-if="p.desc"
              style="margin-top:5px;font-size: 14px;line-height:1.5;color:var(--dc-text-2-strong);"
            >{{ p.desc }}</div>
            <slot name="prov-extra" :provider="p" :picked="isPicked(p)" />
          </div>
        </div>
        <!-- provider 必选缺省兜底（卡片替代下拉后唯一的可见校验提示） -->
        <div v-if="provError" style="margin-top:10px;font-size: 14px;color:var(--dc-danger);">
          {{ provError }}
        </div>
      </div>

      <!-- ══════════ 表单区：放 <DcConfigSection> ══════════ -->
      <slot />

      <!-- ══════════ 子项区（如物流公司开关列表） ══════════ -->
      <slot name="sub" />

      <!-- ══════════ 测试 + 保存 ══════════ -->
      <div
        v-if="showFoot"
        style="display:flex;gap:10px;align-items:center;padding:12px 18px;background:var(--dc-surface);border:1px solid var(--dc-border);border-radius:8px;box-shadow:0 1px 2px rgb(0 0 0 / 4%);"
      >
        <div style="flex:1;" />
        <slot name="foot-extra" />
        <!-- 「测试连接 / 发送测试」按钮插槽：传 testText 用默认钮，或整个换掉 -->
        <slot name="test">
          <button
            v-if="testText"
            class="dc-cfg__btn-ghost"
            :disabled="testing"
            style="height:32px;padding:0 14px;font-family:inherit;font-size: 14px;color:var(--dc-text-2);cursor:pointer;background:var(--dc-surface);border:1px solid var(--dc-border);border-radius:4px;"
            @click="emit('test')"
          >{{ testing ? "测试中…" : testText }}</button>
        </slot>
        <button
          v-if="showSave"
          class="dc-cfg__btn-primary"
          :disabled="saving"
          style="min-width:88px;height:32px;padding:0 16px;font-family:inherit;font-size: 14px;font-weight:400;color:#fff;cursor:pointer;background:var(--dc-brand);border:none;border-radius:4px;"
          @click="emit('save')"
        >{{ saving ? "保存中…" : saveText }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DcProvider } from "./types";

defineOptions({ name: "DcConfigShell" });

const props = withDefaults(
  defineProps<{
    /** 当前选中的 provider 值（v-model）；无 provider 区时不用传 */
    modelValue?: string | number;
    /** provider 卡片列表；空数组 = 不渲染选择区 */
    providers?: DcProvider[];
    /** 选择区卡头标题 / 副标题 */
    provTitle?: string;
    provSub?: string;
    /** 选择区列数；缺省 4 */
    provColumns?: number;
    /** provider 未选中的内联错误文案（自绘卡片替代下拉后唯一的可见校验提示） */
    provError?: string;
    /** 「测试连接」/「发送测试」按钮文案；空串 = 不出该按钮 */
    testText?: string;
    testing?: boolean;
    /** 保存按钮 */
    showSave?: boolean;
    saveText?: string;
    saving?: boolean;
    /** 整条底部说明/按钮条的开关 */
    showFoot?: boolean;
  }>(),
  {
    modelValue: "",
    providers: () => [],
    provTitle: "服务商",
    provSub: "",
    provColumns: 4,
    provError: "",
    testText: "",
    testing: false,
    showSave: true,
    saveText: "保存配置",
    saving: false,
    showFoot: true,
  },
);

const emit = defineEmits<{
  "update:modelValue": [v: string | number];
  /** 选中某个 provider（在 update:modelValue 之后触发，便于拉该 provider 的配置） */
  pick: [p: DcProvider];
  /** 点「测试连接 / 发送测试」 */
  test: [];
  /** 点「保存配置」 */
  save: [];
}>();

function isPicked(p: DcProvider) {
  // 字典 value 有的是 number 有的是 string，统一按字符串比，避免 "1" !== 1 导致卡片选不中
  return String(props.modelValue) === String(p.value);
}
function pick(p: DcProvider) {
  if (p.disabled) return;
  emit("update:modelValue", p.value);
  emit("pick", p);
}
</script>

<style lang="scss">
.dc-cfg {
  &__prov:hover { border-color: var(--dc-brand) !important; }

  &__btn-ghost:hover:not(:disabled) {
    color: var(--dc-brand) !important;
    border-color: var(--dc-brand) !important;
  }

  &__btn-primary:hover:not(:disabled) { background: var(--dc-brand-hover) !important; }

  &__btn-ghost:disabled,
  &__btn-primary:disabled { cursor: not-allowed; opacity: 0.6; }

  /* 配置页表单控件（36px 高 / 6px 圆角 / 14px 字） */
  &__input,
  &__select {
    width: 100%;
    height: 36px;
    padding: 0 12px;
    font-family: inherit;
    font-size: 14px;
    color: var(--dc-text-1);
    background: var(--dc-surface);
    border: 1px solid var(--dc-border);
    border-radius: 6px;
    outline: none;
    transition: border-color 0.12s ease, box-shadow 0.12s ease;

    &:focus {
      border-color: var(--dc-brand);
      box-shadow: var(--dc-focus-ring);
    }

    &:disabled {
      color: var(--dc-text-3);
      background: var(--dc-bg-header);
    }
  }

  &__select { padding: 0 8px; cursor: pointer; }

  &__textarea {
    width: 100%;
    height: 70px;
    padding: 8px 10px;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    color: var(--dc-text-1);
    resize: none;
    border: 1px solid var(--dc-border);
    border-radius: 4px;
    outline: none;

    &:focus {
      border-color: var(--dc-brand);
      box-shadow: var(--dc-focus-ring);
    }
  }

  /* 字段 helper（ⓘ + 11.5px 灰字） */
  &__hint {
    display: flex;
    gap: 5px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--dc-text-3);
  }
}
</style>
