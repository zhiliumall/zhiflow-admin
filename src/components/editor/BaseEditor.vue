<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<!--
  BaseEditor —— 富文本编辑器统一入口（内核为 wangEditor）。

  只读态（disabled=true）不加载编辑器内核，只走 v-html + sanitizeRichText，
  既省去加载开销，也避免内容经编辑器解析器后丢失。

  props : value / disabled / shopId / maxSize / uploadData / onUploaded
          / autoSaveToMaterial / showBackTop / showBottomAction / clientType
  emits : update:value / editorScroll
-->
<template>
  <div class="fb-editor">
    <div v-if="disabled">
      <div class="w-e-readonly" v-html="safeContent" />
    </div>
    <component
      v-else
      :is="AdapterComp"
      :value="value"
      :max-size="maxSize"
      :shop-id="shopId"
      :client-type="clientType"
      :upload-data="uploadData"
      :on-uploaded="onUploaded"
      :auto-save-to-material="autoSaveToMaterial"
      :show-back-top="showBackTop"
      :show-bottom-action="showBottomAction"
      @update:value="(v: string) => emit('update:value', v)"
      @editorScroll="(p: any) => emit('editorScroll', p)"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, markRaw } from 'vue'
import { sanitizeRichText } from '@/utils/sanitizeHtml'
import { EDITOR_DEFAULTS } from './editorDefaults'

const props = withDefaults(
  defineProps<{
    value?: string
    disabled?: boolean
    shopId?: string
    clientType?: string
    maxSize?: number
    uploadData?: Record<string, any>
    onUploaded?: (file: File, url: string) => void | Promise<void>
    autoSaveToMaterial?: boolean
    showBackTop?: boolean
    showBottomAction?: boolean
  }>(),
  {
    value: '',
    disabled: false,
    clientType: '',
    maxSize: EDITOR_DEFAULTS.imageMaxKb,
    autoSaveToMaterial: true,
    showBackTop: false,
    showBottomAction: false,
  },
)

const emit = defineEmits<{
  (e: 'update:value', v: string): void
  (e: 'editorScroll', p: { top: number; ratio: number }): void
}>()

/** 只读态 v-html 渲染前净化，纵深防御存储型 XSS（改造前即如此） */
const safeContent = computed(() => sanitizeRichText(props.value))

/** 编辑器内核异步加载：只有打开编辑器的页面才下载 wangEditor（markRaw 避免被深度代理） */
const AdapterComp = markRaw(defineAsyncComponent(() => import('./adapters/WangEditorAdapter.vue')))
</script>

<style lang="scss">
/* 只读态与浮动按钮样式（非 scoped） */
.w-e-readonly {
  min-height: 400px;
  padding: 10px;
  background: #fff;
  border: 1px solid #e5e7eb;
}

.floating-actions {
  position: fixed;
  right: 17px;
  bottom: 84px;
  z-index: 2000;
}

.action-btn {
  box-sizing: border-box !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 36px !important;
  height: 36px !important;
  padding: 0 !important;
  color: inherit;
  background-color: transparent;
  border: none;
  border-radius: 50% !important;

  .el-icon {
    font-size: 20px;
    font-weight: bold;
  }
}

.action-up {
  color: var(--el-color-success);
  background-color: var(--el-color-success-light-8);

  &:hover {
    color: var(--el-color-success);
    background-color: var(--el-color-success-light-7);
  }
}

.action-down {
  color: var(--dc-text-3);
  background-color: #fff;
  border: 2px solid var(--el-border-color-lighter) !important;

  &:hover {
    color: var(--dc-text-3);
    background-color: var(--el-fill-color-light);
  }
}

.backtop-slot {
  width: 40px;
  height: 40px;
  line-height: 40px;
  text-align: center;
}
</style>
