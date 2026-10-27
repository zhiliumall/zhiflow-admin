<template>
  <div v-if="show" class="pro-pagination">
    <el-pagination :current-page="currentPage" :page-size="pageSize" :total="total" :page-sizes="pageSizes"
      :background="background" :layout="layout" @current-change="onPageChange" @size-change="onSizeChange" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, watch } from 'vue';

const props = withDefaults(defineProps<{
  /** 当前页 */
  currentPage?: number
  /** 每页条数 */
  pageSize?: number
  /** 总条数 */
  total?: number
  /** 可选每页条数 */
  pageSizes?: number[]
  /** 是否显示分页器 */
  show?: boolean
  /** 是否带背景色（element-plus background prop） */
  background?: boolean
  /** 分页布局，默认与 ProTable 一致 */
  layout?: string
}>(), {
  currentPage: 1,
  pageSize: 10,
  total: 0,
  pageSizes: () => [10, 20, 30, 50],
  show: true,
  background: true,
  layout: 'prev, pager, next, sizes, jumper',
})

const emit = defineEmits<{
  (e: 'update:currentPage', page: number): void
  (e: 'update:pageSize', size: number): void
  (e: 'page-change', page: number): void
  (e: 'size-change', size: number): void
}>()

function onPageChange(page: number) {
  emit('update:currentPage', page)
  emit('page-change', page)
}

function onSizeChange(size: number) {
  emit('update:pageSize', size)
  emit('size-change', size)
}

// 将"前往"文案替换为"跳转"
function replaceJumperText() {
  nextTick(() => {
    const container = document.querySelector('.pro-pagination')
    if (!container) return
    const goto = container.querySelector('.el-pagination__goto') as HTMLElement | null
    if (goto?.textContent === '前往') goto.textContent = '跳转'
  })
}
watch(() => props.total, () => replaceJumperText())
onMounted(() => replaceJumperText())
</script>

<style lang="scss" scoped>
.pro-pagination {
  display: flex;
  justify-content: center;
  padding: 16px 0 8px;

  :deep(.el-pagination) {
    gap: 12px;
    color: var(--dc-text-3);

    /* 前后翻页按钮 */
    .btn-prev,
    .btn-next {
      width: auto;
      min-width: auto;
      height: auto;
      padding: 0;
      line-height: normal;
      color: var(--dc-text-3);
      background-color: transparent;
      border: none;

      &:hover {
        color: var(--text-link, #155eef);
        border-color: transparent;
      }
    }

    /* 页码数字 */
    .el-pager {
      li {
        min-width: auto;
        height: auto;
        margin: 0 4px;
        line-height: normal;
        color: var(--text-secondary, #3f4a59);
        background-color: transparent;
        border: none;

        &:hover:not(.is-active) {
          color: var(--text-link, #155eef);
          border-color: transparent;
        }

        &.is-active {
          font-weight: 600;
          color: #2654DD;
          background-color: transparent;
        }
      }
    }

    /* 每页条数选择器 */
    .el-select {
      width: 98px;
    }

    .el-select__wrapper {
      box-shadow: none;
    }

    .el-select .el-input .el-input__wrapper {
      background-color: transparent !important;
      box-shadow: none !important;

      &,
      &:hover,
      &:focus,
      &.is-focus {
        border: none !important;
        box-shadow: none !important;
      }
    }

    /* 跳转输入框 */
    .el-pagination__jump {
      margin-left: 16px;
      font-size: 14px;
      color: var(--text-secondary, #3f4a59);

      .el-input {
        width: 48px;

        .el-input__wrapper,
        .el-input__inner {
          background: transparent;
          border: none !important;
          box-shadow: none !important;
        }
      }
    }
  }
}
</style>
