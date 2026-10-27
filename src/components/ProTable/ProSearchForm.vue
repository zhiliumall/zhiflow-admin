<template>
  <div v-if="!noCard" class="pro-search-form pro-search-form--card">
    <div class="pro-search-form__body pro-search-form__grid">
      <ProPanel v-for="field in visibleFields" :key="field.prop" :label="field.label"
        :style="field.span ? { gridColumn: 'span ' + field.span } : undefined">
        <!-- 自定义插槽：按 prop 名称 -->
        <slot :name="'field-' + field.prop" :field="field" :value="formData[field.prop]"
          :onUpdate:value="(v: any) => formData[field.prop] = v">
          <!-- 输入框 -->
          <el-input v-if="field.component === 'input'" v-model="formData[field.prop]"
            :placeholder="field.placeholder || `请输入${field.label}`" v-bind="field.componentProps" clearable
            @keyup.enter="handleSearch" class="pro-search-form__control" />
          <!-- 选择器 -->
          <el-select v-else-if="field.component === 'select'" v-model="formData[field.prop]"
            :placeholder="field.placeholder || '请选择'" v-bind="field.componentProps" clearable
            class="pro-search-form__control">
            <el-option v-for="opt in field.options" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
          <!-- 日期选择器 -->
          <el-date-picker v-else-if="field.component === 'date-picker'" v-model="formData[field.prop]"
            :placeholder="field.placeholder || '请选择日期'" v-bind="field.componentProps"
            :type="field.componentProps?.type || 'date'" value-format="YYYY-MM-DD" class="pro-search-form__control" />
          <!-- 级联选择器 -->
          <el-cascader v-else-if="field.component === 'cascader'" v-model="formData[field.prop]"
            :placeholder="field.placeholder || '请选择'" :options="field.options" v-bind="field.componentProps" clearable
            class="pro-search-form__control" />
        </slot>
      </ProPanel>
      <!-- 操作栏：作为 grid 最后一项 -->
      <div class="pro-search-form__actions pro-search-form__item--actions">
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
        <el-button v-if="showFoldToggle" link type="" @click="toggleFold">
          {{ isExpanded ? '收起' : '展开' }}
          <el-icon class="pro-search-form__fold-icon" :class="{ 'is-expanded': isExpanded }">
            <ArrowUp />
          </el-icon>
        </el-button>
      </div>
    </div>
  </div>

  <!-- 无卡片模式（noCard） -->
  <div v-else class="pro-search-form">
    <div class="pro-search-form__grid">
      <ProPanel v-for="field in visibleFields" :key="field.prop" :label="field.label"
        :style="field.span ? { gridColumn: 'span ' + field.span } : undefined">
        <!-- 自定义插槽：按 prop 名称 -->
        <slot :name="'field-' + field.prop" :field="field" :value="formData[field.prop]"
          :onUpdate:value="(v: any) => formData[field.prop] = v">
          <el-input v-if="field.component === 'input'" v-model="formData[field.prop]"
            :placeholder="field.placeholder || `请输入${field.label}`" v-bind="field.componentProps" clearable
            @keyup.enter="handleSearch" class="pro-search-form__control" />
          <el-select v-else-if="field.component === 'select'" v-model="formData[field.prop]"
            :placeholder="field.placeholder || '请选择'" v-bind="field.componentProps" clearable
            class="pro-search-form__control">
            <el-option v-for="opt in field.options" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
          <el-date-picker v-else-if="field.component === 'date-picker'" v-model="formData[field.prop]"
            :placeholder="field.placeholder || '请选择日期'" v-bind="field.componentProps"
            :type="field.componentProps?.type || 'date'" value-format="YYYY-MM-DD" class="pro-search-form__control" />
          <el-cascader v-else-if="field.component === 'cascader'" v-model="formData[field.prop]"
            :placeholder="field.placeholder || '请选择'" :options="field.options" v-bind="field.componentProps" clearable
            class="pro-search-form__control" />
        </slot>
      </ProPanel>
      <!-- 操作栏：作为 grid 最后一项 -->
      <div class="pro-search-form__actions pro-search-form__item--actions">
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
        <el-button v-if="showFoldToggle" link type="" @click="toggleFold">
          {{ isExpanded ? '收起' : '展开' }}
          <el-icon class="pro-search-form__fold-icon" :class="{ 'is-expanded': isExpanded }">
            <ArrowUp />
          </el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowUp } from '@element-plus/icons-vue';
import { computed, ref, watch } from 'vue';
import type { SearchField } from './types';

const props = withDefaults(defineProps<{
  /** 搜索字段配置列表 */
  fields: SearchField[]
  /** 双向绑定的表单数据（v-model） */
  modelValue?: Record<string, any>
  /** 每行显示的列数（CSS Grid columns） */
  columns?: number
  /** 折叠时显示的字段数量，超出则出现收起/展开按钮 */
  foldCount?: number
  /** 标签宽度，如 '80px' */
  labelWidth?: string
  /** 是否去掉外层卡片背景和 padding */
  noCard?: boolean
  /** 是否显示内部的收起/展开按钮（设为 false 时由外部自行控制显隐） */
  showFold?: boolean
}>(), {
  modelValue: () => ({}),
  columns: 5,
  foldCount: 5,
  labelWidth: '80px',
  noCard: false,
  showFold: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>): void
  (e: 'search', params: Record<string, any>): void
  (e: 'reset'): void
}>()

// 表单数据
const formData = ref<Record<string, any>>({})
// 是否展开全部字段
const isExpanded = ref(false)

/** 初始化表单默认值 */
function initFormData() {
  const initial: Record<string, any> = {}
  for (const field of props.fields) {
    initial[field.prop] = field.defaultValue ?? ''
  }
  formData.value = { ...initial }
}
initFormData()

/** 同步外部 modelValue */
watch(
  () => props.modelValue,
  (val) => {
    if (val && Object.keys(val).length > 0) {
      formData.value = { ...val }
    }
  },
  { immediate: true, deep: true },
)

/** 可见字段列表（受折叠状态控制） */
const visibleFields = computed(() => {
  if (!props.showFold || isExpanded.value) return props.fields
  return props.fields.slice(0, props.foldCount)
})

/** 是否需要显示折叠按钮 */
const showFoldToggle = computed(() => props.showFold && props.fields.length > props.foldCount)

/** 搜索 */
function handleSearch() {
  emit('update:modelValue', { ...formData.value })
  emit('search', { ...formData.value })
}

/** 重置 */
function handleReset() {
  initFormData()
  emit('update:modelValue', { ...formData.value })
  emit('reset')
}

/** 切换折叠 */
function toggleFold() {
  isExpanded.value = !isExpanded.value
}

/** 暴露方法供外部调用 */
defineExpose({
  resetFields: handleReset,
  getParams: () => ({ ...formData.value }),
})
</script>

<style lang="scss" scoped>
.pro-search-form {
  &--card {
    // padding: 20px 24px;
    background-color: #fff;
    border-radius: 4px;
  }

  /* CSS Grid 布局，支持 CSS 变量覆盖列数 */
  &__grid {
    display: grid;
    grid-template-columns: repeat(var(--pt-search-columns, 6), 1fr);
    gap: 12px 16px;

    @media (width <=1400px) {
      grid-template-columns: repeat(var(--pt-search-columns, 5), 1fr);
    }

    @media (width <=1100px) {
      grid-template-columns: repeat(var(--pt-search-columns, 4), 1fr);
    }

    @media (width <=840px) {
      grid-template-columns: repeat(var(--pt-search-columns, 3), 1fr);
    }

    @media (width <=600px) {
      grid-template-columns: repeat(var(--pt-search-columns, 2), 1fr);
    }
  }

  /* 每个表单项：边框由 ProPanel 组件提供 */
  &__item {
    /* 操作栏变体：无边框 */
    &--actions {
      grid-column: auto;
      justify-content: flex-start;
      padding-left: 4px;
      border: none;
    }
  }

  /* 标签样式已统一到 ProPanel 组件 */

  /* 输入控件 */
  &__control {
    flex: 1;

    :deep(.el-input__wrapper),
    :deep(.el-select .el-input .el-input__wrapper) {
      padding-right: 8px;
      padding-left: 8px;
      box-shadow: none !important;
    }

    :deep(.el-select) {
      width: 100%;
    }

    :deep(.el-date-editor) {
      --el-input-border-radius: 0;

      width: 100%;
    }

    :deep(.el-cascader) {
      width: 100%;
    }

    :deep(.el-input__inner) {
      text-align: left;
    }
  }

  &__actions {
    display: flex;
    gap: 8px;
    align-items: center;

    .el-button+.el-button {
      margin-left: 0;
    }
  }

  &__fold-icon {
    margin-left: 4px;
    transition: transform 0.3s;

    &.is-expanded {
      transform: rotate(180deg);
    }
  }

  :deep(.el-select__wrapper) {
    box-shadow: var(--pt-select-shadow, none);
  }

  :deep(.el-input__wrapper) {
    box-shadow: var(--pt-input-shadow, none) !important;
  }
}
</style>
