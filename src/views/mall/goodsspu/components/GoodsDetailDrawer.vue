<template>
  <el-drawer :model-value="visible" title="商品详情" direction="rtl" size="80%" :close-on-click-modal="true" append-to-body
    class="ds-drawer ds-drawer-enter goods-detail-drawer-shell"
    @update:model-value="$emit('update:visible', $event)">
    <div v-loading="loading" class="goods-detail-drawer goods-detail-drawer__surface">
      <avue-form ref="formRef" v-model="form" :option="detailOption">
        <!-- SKU规格 -->
        <template #skus>
          <SkuForm :key="skuFormKey" spec-type-disabled :specType="form.specType" :goodsSpec="goodsSpec"
            :goodsSpuSpec="goodsSpuSpec" :goodsSku="goodsSku" :form="form" />
        </template>

        <!-- 商品图片 -->
        <template #picUrls>
          <div v-if="form.picUrls && form.picUrls.length" class="goods-detail-drawer__images">
            <el-image v-for="(url, idx) in form.picUrls" :key="idx" :src="url" fit="cover"
              :preview-src-list="form.picUrls" preview-teleported class="goods-detail-drawer__image" />
          </div>
          <span v-else>—</span>
        </template>

        <!-- 视频 -->
        <template #videoUrl>
          <video v-if="form.videoUrl" :src="form.videoUrl" controls width="320" height="180" />
          <span v-else>—</span>
        </template>

        <!-- 商品详情富文本 -->
        <template #description>
          <PhonePreview :html="form.description || ''" :maxWidth="420" :vhOffset="0" />
        </template>

        <!-- 品牌 -->
        <template #brandId>
          {{ brandName }}
        </template>

        <!-- 模板参数：按商品保存时的 parameterJson 展示 -->
        <template #selecttmp>
          <span v-if="!tmpTableData.length">-</span>
          <el-table v-else :data="tmpTableData" border>
            <el-table-column prop="name" label="参数名" min-width="100" />
            <el-table-column prop="type" label="类型" width="80">
              <template #default="{ row }">
                <span v-if="row.type == 0">单选</span>
                <span v-else-if="row.type == 1">多选</span>
                <span v-else-if="row.type == 2">输入</span>
                <span v-else>—</span>
              </template>
            </el-table-column>
            <el-table-column prop="value" label="值" min-width="150">
              <template #default="{ row }">
                <span v-if="row.type == 2">{{ row.value || '—' }}</span>
                <el-tag v-else-if="row.type == 0" size="small">{{ row.value || '—' }}</el-tag>
                <template v-else-if="row.type == 1">
                  <el-tag v-for="(item, i) in (Array.isArray(row.value) ? row.value : [])" :key="i" size="small" class="mr-1">{{ item
                    }}</el-tag>
                </template>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </avue-form>
    </div>
  </el-drawer>
</template>

<script lang="ts" setup>
import { getList as getBrandList } from '@/api/mall/goodsbrand'
import { getList as specList } from '@/api/mall/goodsspec'
import { getObj } from '@/api/mall/goodsspu'
import { fetchTree } from '@/api/mall/goodsspuspec'
import PhonePreview from '@/components/preview/PhonePreview.vue'
import SkuForm from '@/components/sku/sku-form.vue'
import { tableOption } from '@/const/crud/mall/goodsspu/index'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  goodsId: string
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
}>()

const loading = ref(false)
const formRef = ref<any>(null)
const form = ref<Record<string, any>>({
  id: '',
  picUrls: [],
  videoUrl: '',
  specType: '0',
  description: '',
})
const goodsSpuSpec = ref<any[]>([])
const goodsSku = ref<any[]>([])
const goodsSpec = ref<any>(null)
const tmpTableData = ref<any[]>([])
const skuFormKey = ref(0)
const brandName = ref('—')

// 只读表单配置：基于 tableOption 浅拷贝分组与列，禁用所有字段（列里有 control 函数，不能用结构化克隆）
const detailOption = computed(() => ({
  ...tableOption,
  menuBtn: false,
  group: tableOption.group.map((g: any) => ({
    ...g,
    column: (g.column || []).map((col: any) => ({ ...col, disabled: true })),
  })),
}) as any)

watch(
  () => props.visible,
  async (val) => {
    if (val && props.goodsId) {
      await loadDetail()
    }
  },
)

async function loadDetail() {
  if (!props.goodsId) return
  loading.value = true
  try {
    const res: any = await getObj(props.goodsId)
    const data = res.data || {}
    if (!Array.isArray(data.picUrls)) {
      data.picUrls = data.picUrl ? [data.picUrl] : []
    }
    const categoryId: string[] = []
    if (data.categoryFirst) categoryId.push(data.categoryFirst)
    if (data.categorySecond) categoryId.push(data.categorySecond)
    if (data.categoryThird) categoryId.push(data.categoryThird)
    data.categoryId = categoryId
    form.value = data

    brandName.value = '—'
    // 品牌名走 /goodsbrand/list（不挂权限码），只有商品权限的账号也能看到
    if (data.brandId) {
      getBrandList().then((res2: any) => {
        const list = Array.isArray(res2?.data) ? res2.data : []
        brandName.value = list.find((b: any) => b.id === data.brandId)?.brandName || '—'
      }).catch(() => { })
    }

    // SKU 规格树
    fetchTree({ spuId: data.id }).then((res2: any) => {
      goodsSpuSpec.value = res2.data || []
    })
    specList().then((res2: any) => {
      goodsSpec.value = res2.data
    })

    // SKU 数据
    goodsSku.value = (data.skus || []).map((v: any) => ({
      ...v,
      picUrls: v.picUrl ? [v.picUrl] : [],
    }))
    skuFormKey.value++

    // 模板参数
    tmpTableData.value = []
    if (data.parameterJson) {
      try {
        const pJson = JSON.parse(data.parameterJson)
        tmpTableData.value = Array.isArray(pJson?.data) ? pJson.data : []
      } catch {
        tmpTableData.value = []
      }
    }
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
:deep(.goods-detail-drawer-shell) {
  .el-drawer__header {
    padding: 20px 24px 12px;
    margin-bottom: 0;
    color: var(--dc-text-1);
    border-bottom: 1px solid var(--ds-border-light);
  }

  .el-drawer__body {
    padding: 0;
    background: var(--ds-page-bg);
  }
}

:deep(.goods-detail-drawer-shell.rtl) {
  border-radius: var(--ds-radius-lg) 0 0 var(--ds-radius-lg);
  box-shadow: var(--ds-shadow-dialog);
}

:deep(.goods-detail-drawer-shell) {
  .el-form-item.is-required .el-form-item__label::before {
    color: var(--dc-danger);
  }

  .el-table__header th.el-table__cell {
    color: var(--dc-text-1);
    background-color: var(--ds-table-header-bg) !important;
  }
}

.goods-detail-drawer__images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.goods-detail-drawer__image {
  width: 72px;
  height: 72px;
  overflow: hidden;
  border: 1px solid var(--ds-border-light);
  border-radius: var(--ds-radius-sm);
}

.goods-detail-drawer {
  min-height: 100%;
  padding: 16px 24px;
  overflow-y: auto;
  background: var(--ds-page-bg);

  :deep(.avue-form) {
    padding: 0;
  }
}

.goods-detail-drawer__surface {
  :deep(.avue-group),
  :deep(.avue-form__group) {
    background: var(--ds-surface);
    border-radius: var(--ds-radius-md);
  }
}
</style>
