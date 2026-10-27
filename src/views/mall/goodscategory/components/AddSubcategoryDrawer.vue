<template>
  <el-drawer v-model="visible" title="添加子分类" size="650px" direction="rtl" append-to-body :before-close="handleClose" class="ds-drawer">
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="120px" label-position="left">
      <!-- 上级分类 -->
      <el-form-item :label="$t('mall.goodscategory.parentId')" prop="parentId">
        <el-tree-select v-model="formData.parentId" :data="categoryTreeWithPath"
          :props="treeSelectProps" :render-after-expand="false" check-strictly
          style="width: 100%" placeholder="请选择上级分类" />
      </el-form-item>

      <!-- 分类名称 -->
      <el-form-item :label="$t('mall.goodscategory.name')" prop="name">
        <el-input v-model="formData.name" :placeholder="$t('commons.pleaseInput')" maxlength="16" show-word-limit />
      </el-form-item>

      <!-- 是否启用 -->
      <el-form-item :label="$t('mall.goodscategory.enable')" prop="enable">
        <el-radio-group v-model="formData.enable">
          <el-radio value="1">{{ $t('commons.open') }}</el-radio>
          <el-radio value="0">{{ $t('commons.close') }}</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 排序 -->
      <el-form-item :label="$t('mall.goodscategory.sort')" prop="sort">
        <el-input-number v-model="formData.sort" :min="0" :max="9999" controls-position="right" style="width: 100%" />
      </el-form-item>

      <!-- 分类图标 -->
      <el-form-item :label="$t('mall.goodscategory.picUrl')" prop="picUrl">
        <div>
          <material-list v-model:value="formData.picUrl" type="image" :num="1" :width="150" :height="150" />
          <p class="lib-text-tips">
            {{ $t('commons.imageSizeTip', { size: '100*100' }) }}
          </p>
        </div>
      </el-form-item>

      <!-- 移动端大图 -->
      <el-form-item :label="$t('mall.goodscategory.mobilePicUrl')" prop="mobilePicUrl">
        <div>
          <material-list v-model:value="formData.mobilePicUrl" type="image" :num="1" :width="150" :height="150" />
          <p class="lib-text-tips">
            {{ $t('commons.imageSizeTip', { size: '720*280' }) }}
          </p>
        </div>
      </el-form-item>

      <!-- 移动端广告图 -->
      <el-form-item :label="$t('mall.goodscategory.mobileAdImageUrl')" prop="mobileAdImageUrl">
        <div>
          <material-list v-model:value="formData.mobileAdImageUrl" type="image" :num="1" :width="375" :height="150" />
          <p class="lib-text-tips">
            {{ $t('commons.imageSizeTip', { size: '750*300' }) }}
          </p>
        </div>
      </el-form-item>

    </el-form>

    <template #footer>
      <div class="drawer-footer">
        <el-button class="ds-btn ds-btn--secondary" @click="handleClose">{{ $t('commons.cancel') }}</el-button>
        <el-button class="ds-btn ds-btn--primary" type="primary" :loading="submitting" @click="handleSubmit">
          保存
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { addObj } from '@/api/mall/goodscategory'
import MaterialList from '@/components/material/list.vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Props
const props = defineProps<{
  visible: boolean
  parentCategory?: any
  categoryTree: any[]
}>()

// Emits
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}>()

// 计算属性控制抽屉显隐
const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 构建带完整路径的树形数据
/**
 * 上级分类候选树。
 *
 * depth ≥ 2（即三级节点）一律 disabled：选它当上级就会造出四级，而 goods_spu 只有
 * categoryFirst/Second/Third 三个字段，第四级的商品无处挂靠，落库后前台永远查不到。
 * 层级上限与列表页的 MAX_LEVEL 保持一致。
 */
function buildTreeWithFullPath(tree: any[], parentPath = '', depth = 0): any[] {
  return tree.map(node => {
    const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name
    return {
      ...node,
      fullName: fullPath,
      disabled: depth >= 2,
      children: node.children?.length ? buildTreeWithFullPath(node.children, fullPath, depth + 1) : undefined
    }
  })
}

// el-tree-select 的 props 类型里没有 value，但运行时按它取节点值
const treeSelectProps: any = { label: 'fullName', value: 'id', children: 'children', disabled: 'disabled' }

// 带完整路径的分类树
const categoryTreeWithPath = computed(() => buildTreeWithFullPath(props.categoryTree))

// 表单引用
const formRef = ref<FormInstance>()
const submitting = ref(false)

// 表单数据
const formData = ref({
  parentId: '',
  name: '',
  enable: '1',
  sort: 0,
  picUrl: [] as string[],
  mobilePicUrl: [] as string[],
  mobileAdImageUrl: [] as string[],
})

// 表单验证规则
const rules = computed<FormRules>(() => ({
  parentId: [
    { required: true, message: t('mall.goodscategory.parentId') + t('commons.notNull'), trigger: 'change' }
  ],
  name: [
    { required: true, message: t('mall.goodscategory.name') + t('commons.notNull'), trigger: 'blur' },
    { max: 16, message: t('commons.lengthTips', { length: 16 }), trigger: 'blur' }
  ],
  enable: [
    { required: true, message: t('mall.goodscategory.enable') + t('commons.notNull'), trigger: 'change' }
  ],
  sort: [
    { required: true, message: t('mall.goodscategory.sort') + t('commons.notNull'), trigger: 'blur' }
  ],
  picUrl: [
    { required: true, type: 'array', message: t('commons.notNull'), trigger: 'change' }
  ],
}))

// 监听 visible 变化，初始化表单数据
watch(() => props.visible, (val) => {
  if (val) {
    // 打开时设置默认父级分类
    formData.value = {
      parentId: props.parentCategory?.id || '',
      name: '',
      enable: '1',
      sort: 0,
      picUrl: [],
      mobilePicUrl: [],
      mobileAdImageUrl: [],
    }
    // 重置表单验证状态
    formRef.value?.clearValidate()
  }
})

// 关闭抽屉
function handleClose() {
  visible.value = false
}

// 提交表单
async function handleSubmit() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    submitting.value = true

    // 构建提交数据
    const submitData = {
      ...formData.value,
      picUrl: formData.value.picUrl.length > 0 ? formData.value.picUrl[0] : '',
      mobilePicUrl: formData.value.mobilePicUrl.length > 0 ? formData.value.mobilePicUrl[0] : '',
      mobileAdImageUrl: formData.value.mobileAdImageUrl.length > 0 ? formData.value.mobileAdImageUrl[0] : '',
    }

    await addObj(submitData)
    ElMessage.success(t('commons.addSuccess'))
    emit('success')
    handleClose()
  } catch (error) {
    console.error('添加子分类失败', error)
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.drawer-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
