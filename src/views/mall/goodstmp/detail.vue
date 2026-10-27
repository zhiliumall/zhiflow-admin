<template>
  <div />
</template>

<script lang="ts" setup>
/**
 * 参数模板的维护都在列表页（新增 / 编辑抽屉 + 「管理参数」弹窗）完成，这里没有独立页面。
 * 保留路由占位，旧链接进来直接回列表。
 */
import { useRouter } from 'vue-router'

const router = useRouter()
router.replace({ path: '/mall/goods/goodstmp' }).catch(() => { })
</script>
