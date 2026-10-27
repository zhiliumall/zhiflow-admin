<template>
  <div class="goods-dc-page">
    <basic-container>
      <el-card class="box-card">
        <div class="goods-detail-entry">
          <div class="goods-detail-entry__title">{{ goodsId ? '编辑商品' : '发布商品' }}</div>
          <div class="goods-detail-entry__desc">
            商品在抽屉里分步填写：基本信息、规格、参数模版、商品详情。保存后返回商品列表。
          </div>
          <div class="goods-detail-entry__actions">
            <el-button type="primary" @click="drawerVisible = true">{{ goodsId ? '继续编辑' : '发布新商品' }}</el-button>
            <el-button @click="backToList">返回商品列表</el-button>
          </div>
        </div>
      </el-card>
    </basic-container>

    <GoodsEditDrawer :visible="drawerVisible" :goods-id="goodsId" @update:visible="drawerVisible = $event"
      @success="backToList" />
  </div>
</template>

<script lang="ts" setup>
/**
 * 「商品详情（编辑）」菜单页：与商品列表共用同一个编辑向导（GoodsEditDrawer）。
 * 带 ?goodsId= 进来是编辑该商品，不带是发布新商品。
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GoodsEditDrawer from './components/GoodsEditDrawer.vue'

const route = useRoute()
const router = useRouter()

const goodsId = computed(() => (route.query.goodsId as string) || '')
const drawerVisible = ref(true)

function backToList() {
  drawerVisible.value = false
  router.push({ path: '/mall/goods/goodsspu' }).catch(() => { })
}
</script>

<style lang="scss" scoped>
.goods-detail-entry {
  padding: 24px 8px;
}

.goods-detail-entry__title {
  font-size: var(--dc-fs-16, 16px);
  font-weight: 600;
  color: var(--dc-text-1);
}

.goods-detail-entry__desc {
  margin-top: 8px;
  font-size: var(--dc-fs-14, 14px);
  color: var(--dc-text-3);
}

.goods-detail-entry__actions {
  margin-top: 20px;
}
</style>
