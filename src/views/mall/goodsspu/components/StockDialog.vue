<template>
  <!-- 库存管理弹窗 -->
  <el-dialog v-model="dialogVisible" title="库存管理" width="1040px" :destroy-on-close="true" append-to-body class="ds-dialog-form">
    <div class="p-4">
      <!-- 商品信息头部 -->
      <div v-if="goodsName" class="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
        <el-image
          v-if="goodsImage"
          :src="goodsImage"
          class="w-12 h-12 rounded object-cover flex-shrink-0"
          fit="cover"
        />
        <div v-else class="w-12 h-12 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
          <el-icon :size="20" color="var(--dc-text-3)"><Picture /></el-icon>
        </div>
        <span class="text-base font-medium" style="color: var(--dc-text-1)">{{ goodsName }}</span>
      </div>

      <!-- 批量操作按钮 -->
      <div class="flex justify-end mb-4">
        <el-dropdown @command="handleBatchCommand">
          <el-button class="ds-btn ds-btn--secondary">
            批量操作<el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="batchIn">
                <div class="flex items-center gap-2 px-2">
                  <span>批量入库</span>
                </div>
              </el-dropdown-item>
              <el-dropdown-item command="batchOut">
                <div class="flex items-center gap-2 px-2">
                  <span>批量出库</span>
                </div>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <el-table :data="currentSkuList" border stripe size="default">
        <el-table-column label="图片" width="70" align="center">
          <template #default="{ row }">
            <el-image
              v-if="row.picUrl || goodsImage"
              :src="row.picUrl || goodsImage"
              class="w-10 h-10 rounded object-cover"
              fit="cover"
              :preview-src-list="[row.picUrl || goodsImage]"
              preview-teleported
            />
            <span v-else class="text-sm" style="color: var(--dc-text-3)">无图</span>
          </template>
        </el-table-column>
        <el-table-column label="产品规格" prop="name" min-width="160" />
        <el-table-column label="商品编码" prop="skuCode" min-width="120" />
        <el-table-column label="当前库存" width="100" align="center">
          <template #default="{ row }">
            <span :class="(row.stock || 0) <= 0 ? 'text-red-500 font-bold' : ''">{{ row.stock || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="库存操作" width="220" align="center">
          <template #default="{ row }">
            <div class="flex items-center justify-center gap-1">
              <el-input
                v-model="row.adjustStock"
                type="number"
                :min="0"
                :max="99999"
                class="!w-[90px]"
                :input-style="{
                  border: 'none',
                  padding: '0 4px',
                  textAlign: 'center',
                  background: 'transparent',
                }"
                placeholder="数量"
              />
              <el-button-group>
                <el-button

                  class="ds-btn ds-btn--secondary"
                  :disabled="!row.adjustStock || Number(row.adjustStock) <= 0"
                  @click="applyStockAction(row, 'in')"
                >
                  入库
                </el-button>
                <el-button

                  type="danger"
                  :disabled="!row.adjustStock || Number(row.adjustStock) <= 0 || Number(row.adjustStock) > (row.stock || 0)"
                  @click="applyStockAction(row, 'out')"
                >
                  出库
                </el-button>
              </el-button-group>
            </div>
            <div v-if="row._pendingAction" class="mt-1 text-sm">
              <span v-if="row._pendingAction === 'in'" class="text-green-600">
                +{{ row._pendingAmount }} (入库)
              </span>
              <span v-else class="text-red-600">
                -{{ row._pendingAmount }} (出库)
              </span>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <el-button class="ds-btn" @click="dialogVisible = false">取消</el-button>
        <el-button class="ds-btn ds-btn--primary" type="primary" @click="submitStock">保存</el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 批量设置弹窗 -->
  <el-dialog
    v-model="batchDialogVisible"
    :title="batchType === 'batchIn' ? '批量入库' : '批量出库'"
    width="420px"
    :destroy-on-close="true"
    append-to-body
    class="ds-dialog-form"
  >
    <div class="p-4">
      <div class="flex items-center gap-4">
        <span class="w-24">调整数量：</span>
        <el-input
          v-model="batchStock"
          type="number"
          :min="0"
          :max="99999"
          class="!flex-1"
          :input-style="{ textAlign: 'center' }"
        />
      </div>
      <div class="mt-2 text-sm" style="color: var(--dc-text-3)">
        <template v-if="batchType === 'batchIn'">将为所有规格增加指定数量的库存</template>
        <template v-else>将从所有规格中扣减指定数量的库存（库存不足的规格会被跳过）</template>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <el-button class="ds-btn" @click="batchDialogVisible = false">取消</el-button>
        <el-button class="ds-btn ds-btn--primary" type="primary" @click="handleBatchStock">保存</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { computed, getCurrentInstance, ref, watch } from 'vue'
import { ArrowDown, Picture } from '@element-plus/icons-vue'
import { getSkuListBySpuId, updateSku } from '@/api/mall/goodssku'

// Props
const props = defineProps<{
  visible: boolean
  goodsId: string
  goodsName?: string
  goodsImage?: string
}>()

// Emits
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}>()

const { proxy } = getCurrentInstance()!

// 弹窗显示状态
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

// 响应式数据
const currentSkuList = ref<any[]>([])
const batchDialogVisible = ref(false)
const batchStock = ref(0)
const batchType = ref('batchIn')

// 监听 visible 变化加载数据
watch(
  () => props.visible,
  async (val) => {
    if (val && props.goodsId) {
      await loadSkuData()
    }
  },
  { immediate: true }
)

// 加载 SKU 数据
async function loadSkuData() {
  if (!props.goodsId) return

  try {
    const response = await getSkuListBySpuId(props.goodsId)
    const skuList = response.data || response
    currentSkuList.value = (Array.isArray(skuList) ? skuList : []).map((sku: any) => ({
      ...sku,
      adjustStock: undefined as number | undefined,
      _pendingAction: '' as string,
      _pendingAmount: 0 as number,
    }))
  } catch (error) {
    console.error('加载SKU数据失败:', error)
    proxy?.$message.error('加载库存数据失败')
  }
}

// 应用入库/出库操作（明确操作类型）
function applyStockAction(row: any, action: 'in' | 'out') {
  const amount = Number(row.adjustStock || 0)
  if (amount <= 0) {
    proxy?.$message.warning('请输入有效的数量')
    return
  }

  if (action === 'out' && amount > (row.stock || 0)) {
    proxy?.$message.warning(`出库数量(${amount})大于当前库存(${row.stock || 0})`)
    return
  }

  row._pendingAction = action
  row._pendingAmount = amount
}

// 批量操作命令
function handleBatchCommand(command: string) {
  batchType.value = command
  batchDialogVisible.value = true
}

// 批量设置库存
function handleBatchStock() {
  if (!batchStock.value || batchStock.value <= 0) {
    proxy?.$message.warning('请输入有效的调整数量')
    return
  }

  const amount = Number(batchStock.value)
  const isIn = batchType.value === 'batchIn'

  currentSkuList.value.forEach((sku) => {
    if (!isIn && amount > (sku.stock || 0)) {
      return
    }
    sku.adjustStock = amount
    sku._pendingAction = isIn ? 'in' : 'out'
    sku._pendingAmount = amount
  })

  batchDialogVisible.value = false
  batchStock.value = 0
}

// 提交库存
async function submitStock() {
  const pendingSkus = currentSkuList.value.filter(
    (sku) => sku._pendingAction && sku._pendingAmount > 0,
  )

  if (pendingSkus.length === 0) {
    proxy?.$message.warning('请先设置库存调整数量并选择入库或出库操作')
    return
  }

  try {
    await Promise.all(
      pendingSkus.map((sku) => {
        const isIn = sku._pendingAction === 'in'
        const newStock = isIn
          ? (sku.stock || 0) + sku._pendingAmount
          : (sku.stock || 0) - sku._pendingAmount
        return updateSku({
          id: sku.id,
          stock: newStock,
          version: sku.version,
        })
      }),
    )
    proxy?.$message.success('库存更新成功')
    dialogVisible.value = false
    emit('success')
  } catch (error) {
    console.error('库存更新失败:', error)
    proxy?.$message.error('库存更新失败，请重试')
    await loadSkuData()
  }
}
</script>
