<script setup lang="ts">
/**
 * 导入 / 导出方向图标（线性，stroke 1.8 / round）。
 *
 * 18×18 内联 line-SVG，不用 EP 的实心云图标——
 * 后台其余图标（刷新/复制）都是线性，混用实心会在同一行里明显不同家族。
 * 图形是「托盘 + 箭头」：箭头朝上=导入（数据进系统），朝下=导出，两者互为镜像。
 *
 * 之所以做成组件而不是各处内联：批量导入按钮、下载模板、导出商品、拖拽区四处都要用，
 * path 抄四遍改一次就得改四处。
 */
defineOptions({ name: 'TransferIcon' })

withDefaults(defineProps<{
  /** in = 进系统（导入 / 上传），out = 出系统（导出 / 下载） */
  direction?: 'in' | 'out'
  size?: number | string
}>(), {
  direction: 'in',
  size: 15,
})
</script>

<template>
  <svg
    class="transfer-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
    <template v-if="direction === 'in'">
      <path d="M12 15V4" />
      <path d="m8 8 4-4 4 4" />
    </template>
    <template v-else>
      <path d="M12 4v11" />
      <path d="m8 11 4 4 4-4" />
    </template>
  </svg>
</template>

<style scoped>
.transfer-icon {
  flex: none;

  /* 与相邻文字基线对齐：图标盒比文字高，靠 -1px 压回视觉中线 */
  vertical-align: -2px;
}
</style>
