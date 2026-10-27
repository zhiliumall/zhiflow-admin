<template>
  <!-- 商品预览弹窗 -->
  <el-dialog
    v-model="dialogVisible"
    title="商品详情"
    width="420px"
    :destroy-on-close="true"
    class="preview-dialog ds-dialog-form"
    append-to-body
  >
    <div class="preview-container" style="height: 600px; overflow-y: auto">
      <div class="con-top-bg">
        <!-- 商品主图 -->
        <el-carousel indicator-position="outside" height="380px">
          <el-carousel-item v-for="(url, index) in previewData.picUrls" :key="index">
            <el-image :src="url" fit="cover" class="w-full" />
          </el-carousel-item>
        </el-carousel>

        <div class="text-2xl text-red-500 font-bold my-4 px-4">¥{{ previewData.priceDown }}</div>

        <!-- 商品标题 -->
        <div class="title-info px-4">
          <h1 class="text-lg font-medium mb-2">{{ previewData.name }}</h1>
        </div>

        <!-- 商品价格信息 -->
        <div class="price-info py-4 mb-4 px-4">
          <div class="text-sm flex items-center justify-between" style="color: var(--dc-text-1)">
            <span>划线价：¥{{ previewData.priceUp }}</span>
            <span>销量：{{ previewData.saleNum || 0 }}</span>
            <span>库存：{{ previewData.skus?.[0]?.stock || 0 }}</span>
          </div>
        </div>
      </div>
      <!-- 商品详情 -->
      <div class="detail-info">
        <div class="text-center text-base font-bold py-3">商品介绍</div>
        <div class="px-4" v-html="previewData.description" />
      </div>
    </div>
  </el-dialog>
</template>

<script lang="ts" setup>
import { computed, getCurrentInstance, reactive, watch } from 'vue'
import { getObj } from '@/api/mall/goodsspu'

// Props
const props = defineProps<{
  visible: boolean
  goodsId: string
}>()

// Emits
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const { proxy } = getCurrentInstance()!

// 弹窗显示状态
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

// 响应式数据
const previewData = reactive({
  picUrls: [] as string[],
  priceDown: 0,
  priceUp: 0,
  name: '',
  saleNum: 0,
  skus: [] as any[],
  description: '',
}) as any

// 监听 visible 变化加载数据
watch(
  () => props.visible,
  async (val) => {
    if (val && props.goodsId) {
      await loadPreviewData()
    }
  },
  { immediate: true }
)

// 加载预览数据
async function loadPreviewData() {
  if (!props.goodsId) return

  try {
    const response = await getObj(props.goodsId)
    Object.assign(previewData, response.data)
  } catch (error) {
    console.error('加载预览数据失败:', error)
    proxy?.$message.error('加载预览数据失败')
  }
}
</script>

<style lang="scss" scoped>
:deep(.preview-dialog) {
  padding: 0 !important;
  background-color: var(--ds-page-bg) !important;

  .el-dialog__header {
    padding-top: 15px;
    text-align: center;
    background-color: var(--ds-surface);

    .el-dialog__title {
      font-weight: bold;
    }
  }

  .preview-container {
    .con-top-bg {
      background-color: var(--ds-surface);
    }

    .detail-info {
      margin-top: 10px;
      background-color: var(--ds-surface);
    }

    &::-webkit-scrollbar {
      width: 0;
    }
  }
}
</style>
