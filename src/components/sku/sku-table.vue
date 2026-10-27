<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
  <basic-container>
    <div class="sku-table">
      <!-- 批量填充：字段名写在框前面，右侧一个「应用到 N 条」 -->
      <template v-if="skuData.length > 0">
        <div class="batch-setting">
          <span class="batch-setting__title">批量填充</span>
          <span class="batch-setting__field">
            <label>{{ $t("components.sku.sellingPrice") }}</label>
            <el-input-number v-model="batchAddObj.salesPrice" size="small" :controls="false" :precision="2" :min="0"
              :max="99999999" />
          </span>
          <span class="batch-setting__field">
            <label>{{ $t("components.sku.marketPrice") }}</label>
            <el-input-number v-model="batchAddObj.marketPrice" size="small" :controls="false" :precision="2" :min="0"
              :max="99999999" />
          </span>
          <span class="batch-setting__field">
            <label>{{ $t("components.sku.costPrice") }}</label>
            <el-input-number v-model="batchAddObj.costPrice" size="small" :controls="false" :precision="2" :min="0"
              :max="99999999" />
          </span>
          <span class="batch-setting__field">
            <label>{{ $t("components.sku.weight") }}</label>
            <el-input-number v-model="batchAddObj.weight" size="small" :controls="false" :precision="2" :min="0"
              :max="99999999" />
          </span>
          <span class="batch-setting__field">
            <label>{{ $t("components.sku.volume") }}</label>
            <el-input-number v-model="batchAddObj.volume" size="small" :controls="false" :precision="2" :min="0"
              :max="99999999" />
          </span>
          <span class="batch-setting__field">
            <label>{{ $t("components.sku.stock") }}</label>
            <el-input-number v-model="batchAddObj.stock" size="small" :controls="false" :precision="0" :min="0"
              :max="99999999" />
          </span>
          <span class="batch-setting__field is-code">
            <label>{{ $t("components.sku.skuCode") }}</label>
            <el-input v-model="batchAddObj.skuCode" size="small" clearable />
          </span>
          <el-button class="batch-setting__apply" type="primary" size="small" @click="batchAdd">
            应用到 {{ skuData.length }} 条
          </el-button>
        </div>
      </template>
      <!-- SKU -->
      <el-table ref="skuTableRef" :data="skuData" size="small" border >
        <el-table-column v-for="(item, index) in specData" :key="item.id" :prop="item.id" :label="item.value"
          align="center">
          <template #default="scope">
            {{ scope.row.specs[index].specValueName }}
          </template>
        </el-table-column>
        <el-table-column prop="picUrl" :label="$t('commons.image')" width="75" align="center">
          <template #default="scope">
            <div>
              <div>
                <MaterialList v-model:singleValue="scope.row.picUrl"
                  :num="1" :is-single="true" :width="60" :height="60" type="image" />
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="salesPrice" align="center" min-width="110">
          <template v-slot:header>{{ $t("components.sku.sellingPrice")
          }}<span style="margin-left: 5px; font-size: large; color: red">*</span>
          </template>
          <template #default="scope">
            <el-input-number v-model="scope.row['salesPrice']" size="small" style="width: 100%"
              controls-position="right" :precision="2" :step="0.1" :min="0" :disabled="!scope.row['enable']" />
          </template>
        </el-table-column>
        <el-table-column prop="marketPrice" align="center" min-width="110" :label="$t('components.sku.marketPrice')">
          <template #default="scope">
            <el-input-number v-model="scope.row['marketPrice']" size="small" style="width: 100%"
              controls-position="right" :precision="2" :step="0.1" :min="0" :disabled="!scope.row['enable']" />
          </template>
        </el-table-column>
        <el-table-column :label="$t('components.sku.costPrice')" prop="costPrice" align="center" min-width="100">
          <template #default="scope">
            <el-input-number v-model="scope.row['costPrice']" size="small" style="width: 100%"
              controls-position="right" :precision="2" :step="0.1" :min="0" :disabled="!scope.row['enable']" />
          </template>
        </el-table-column>

        <el-table-column prop="weight" align="center" min-width="100" :label="$t('components.sku.weight')">
          <template #default="scope">
            <el-input-number v-model="scope.row['weight']" size="small" style="width: 100%" controls-position="right"
              :precision="2" :step="0.1" :min="0" :disabled="!scope.row['enable']" />
          </template>
        </el-table-column>
        <el-table-column prop="volume" align="center" min-width="100" :label="$t('components.sku.volume')">
          <template #default="scope">
            <el-input-number v-model="scope.row['volume']" size="small" style="width: 100%" controls-position="right"
              :precision="2" :step="0.1" :min="0" :disabled="!scope.row['enable']" />
          </template>
        </el-table-column>
        <el-table-column prop="stock" align="center" min-width="100" :label="$t('components.sku.stock')">
          <template #header>{{ $t("components.sku.stock")
          }}<span style="margin-left: 5px; font-size: large; color: red">*</span>
          </template>
          <template #default="scope">
            <el-input-number v-model="scope.row.stock" name="stock" size="small" style="width: 100%"
              controls-position="right" :precision="0" :step="1" :min="0" :disabled="!scope.row['enable']" />
          </template>
        </el-table-column>
        <el-table-column prop="skuCode" align="center" width="80" :label="$t('components.sku.skuCode')">
          <template #default="scope">
            <el-input v-model="scope.row['skuCode']" style="width: 100%" size="small" clearable
              :disabled="!scope.row['enable']" />
          </template>
        </el-table-column>

        <el-table-column align="center" width="100" :label="$t('components.sku.enable')">
          <template #default="scope">
            <el-switch v-model="scope.row['enable']" active-value="1"
              inactive-value="0" inline-prompt active-icon="Check" inactive-icon="Close" />
          </template>
        </el-table-column>
      </el-table>
      <!-- 写清 SKU 是怎么算出来的：只报「6条」时没人知道 6 从哪来 -->
      <div class="sku-table__foot">
        共 {{ skuData.length }} {{ $t("components.sku.pieces") }}
        <span v-if="specData.length > 1">（{{specData.map((s: any) => `${s.value} ${s.leaf?.length || 0}`).join(" × ")}}）</span>
      </div>
    </div>
  </basic-container>
</template>

<script setup lang="ts">
import MaterialList from "@/components/material/list.vue";
import { diffArray } from "@/utils/util";
import { computed, reactive, ref, watch } from "vue";
import { flatten } from "./sku";

// Props 定义
const props = defineProps<{
  form: Record<string, any>;
  specData?: any[];
  goodsSku?: any[];
}>();

// 设置默认值
const specData = computed(() => props.specData || []);
const goodsSku = computed(() => props.goodsSku || []);

// Emits 定义
const emit = defineEmits<{
  getGoodsSku: [value: any[]];
}>();

// 响应式数据
const skuTableRef = ref();
const batchAddObj = reactive({
  skuCode: "",
  salesPrice: 0,
  stock: 0,
  marketPrice: undefined as number | undefined,
  costPrice: undefined as number | undefined,
  weight: undefined as number | undefined,
  volume: undefined as number | undefined,
});
const skuData = ref<any[]>([]);

// 计算属性
const skusList = computed(() => {
  const skusList1: any[] = flatten(specData.value).map((item) => ({
    specs: item.specs,
    specIds: item.specs.reduce(
      (total: string, prev: any, index: number) =>
        `${total}${prev.specId}-${prev.specValueId}${index === item.specs.length - 1 ? "" : "_"
        }`,
      ""
    ),
  }));
  const skusList2 = goodsSku.value.map((item: any) => ({
    ...item,
    specIds: item.specs.reduce(
      (total: string, prev: any, index: number) =>
        `${total}${prev.specId}-${prev.specValueId}${index === item.specs.length - 1 ? "" : "_"
        }`,
      ""
    ),
  }));
  skusList1.forEach((item: any) => {
    skusList2.forEach((item2) => {
      const itemList = item.specIds.split("_");
      const item2List = item2.specIds.split("_");
      let is = true;
      itemList.forEach((item3: string) => {
        if (!item2List.find((c: string) => c === item3)) {
          is = false;
        }
      });
      if (is) {
        item.id = item2.id ? item2.id : undefined;
        item.picUrl = item2.picUrl ? item2.picUrl : "";
        item.skuCode = item2.skuCode ? item2.skuCode : undefined;
        item.salesPrice = item2.salesPrice;
        item.marketPrice = item2.marketPrice;
        item.costPrice = item2.costPrice;
        item.stock = item2.stock;
        item.weight = item2.weight;
        item.volume = item2.volume;
        item.enable = item2.enable;
      }
    });
  });
  return skusList1;
});

// 方法
function batchAdd() {
  skuData.value.forEach((val) => {
    if (val.enable === "1") {
      if (batchAddObj.skuCode) {
        val.skuCode = batchAddObj.skuCode;
      }

      if ((batchAddObj.salesPrice as number) >= 0) {
        val.salesPrice = batchAddObj.salesPrice;
      }

      if ((batchAddObj.marketPrice as number) >= 0) {
        val.marketPrice = batchAddObj.marketPrice;
      }

      if ((batchAddObj.costPrice as number) >= 0) {
        val.costPrice = batchAddObj.costPrice;
      }

      if ((batchAddObj.stock as number) >= 0) {
        val.stock = batchAddObj.stock;
      }

      if ((batchAddObj.weight as number) >= 0) {
        val.weight = batchAddObj.weight;
      }

      if ((batchAddObj.volume as number) >= 0) {
        val.volume = batchAddObj.volume;
      }
    }
  });
}

// 监听 skuData 变化
watch(
  skuData,
  (newSkus) => {
    emit("getGoodsSku", newSkus);
  },
  { deep: true, immediate: true }
);

// 监听 skusList 变化
watch(
  skusList,
  (newSkus, oldSkus) => {
    if (!newSkus || !newSkus.length) {
      skuData.value = [];
      return;
    }
    if (!oldSkus || !oldSkus.length) {
      skuData.value = newSkus.map((item) => ({
        ...item,
        // 初始化属性
        id: item.id ? item.id : undefined,
        picUrl: item.picUrl ? item.picUrl : "",
        skuCode: item.skuCode ? item.skuCode : undefined,
        salesPrice: item.salesPrice ? item.salesPrice : 0,
        marketPrice: item.marketPrice ? item.marketPrice : undefined,
        costPrice: item.costPrice ? item.costPrice : null,
        stock: item.stock ? item.stock : 0,
        weight: item.weight ? item.weight : undefined,
        volume: item.volume ? item.volume : undefined,
        enable: item.enable ? item.enable : "1",
      }));
      return;
    }
    // 当规格名的数量发生了变化
    if (newSkus[0].specs.length !== oldSkus[0].specs.length) {
      skuData.value = newSkus.map((item) => ({
        ...item,
        // 初始化属性
        id: undefined,
        picUrl: "",
        skuCode: undefined,
        salesPrice: 0,
        marketPrice: undefined,
        costPrice: undefined,
        stock: 0,
        weight: undefined,
        volume: undefined,
        enable: "1",
      }));
      return;
    }
    if (newSkus.length === oldSkus.length) {
      // 当规格名和规格值数量未发生变化，更新 specs 即可
      skuData.value = newSkus.map((item, index) => ({
        ...skuData.value[index],
        ...item,
      }));
      return;
    }

    function diffIdsF(skusList1: any[], skusList2: any[]) {
      const ids1 = skusList1.map((item) => item.specIds);
      const ids2 = skusList2.map((item) => item.specIds);
      return diffArray(ids1, ids2);
    }

    const diffIds = diffIdsF(newSkus, oldSkus);
    if (newSkus.length > oldSkus.length) {
      // 当添加了规格值
      const data: any[] = [];
      newSkus.forEach((item) => {
        const sku = skuData.value.find(
          (_item) => _item.specIds === item.specIds
        );
        if (sku) {
          data.push(sku);
        } else {
          data.push({
            ...item,
            id: undefined,
            picUrl: "",
            skuCode: undefined,
            salesPrice: 0,
            marketPrice: undefined,
            costPrice: undefined,
            stock: 0,
            weight: undefined,
            volume: undefined,
            enable: "1",
          });
        }
      });
      skuData.value = data;
    } else {
      // 当删除了规格值
      skuData.value = skuData.value.filter(
        (_item) => !diffIds.includes(_item.specIds)
      );
    }
  },
  { deep: true, immediate: true }
);
</script>

<style lang="scss" scoped>
.batch-setting {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 9px 12px;
  margin-bottom: 12px;
  background-color: var(--dc-bg-header, #fafbfc);
  border: 1px solid var(--dc-border, #ebeef2);
  border-radius: var(--dc-radius-md, 6px);

  &:empty {
    display: none;
  }

  .batch-setting__title {
    font-size: var(--dc-fs-14, 14px);
    font-weight: 600;
    color: var(--dc-text-2, #3f4a59);
  }

  .batch-setting__field {
    display: inline-flex;
    gap: 5px;
    align-items: center;

    label {
      font-size: var(--dc-fs-12, 12px);
      color: var(--dc-text-3, #8a93a3);
      white-space: nowrap;
    }

    // 64/84 是为了让 7 个字段 + 标题 + 按钮在抽屉宽度（内容区 ~980px）里排成一行；
    // 再宽就会折行，折行后「应用到 N 条」会掉到左下角，看起来像另一个独立按钮。
    :deep(.el-input-number) {
      width: 64px;
    }

    :deep(.el-input-number .el-input__inner) {
      text-align: right;
    }

    &.is-code :deep(.el-input) {
      width: 84px;
    }
  }

  .batch-setting__apply {
    margin-left: auto;
  }
}

.sku-table__foot {
  padding: 8px 4px 2px;
  font-size: var(--dc-fs-12, 12px);
  color: var(--dc-text-3, #8a93a3);
}

.sku-table {
  padding: 5px;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
}

.sku-table .avue-upload__avatar {
  width: 60px;
  height: 60px;
}

.sku-table .avue-upload__icon {
  width: 60px;
  height: 60px;
  line-height: 60px !important;
}

.sku-table .el-upload__tip {
  margin-top: unset;
}

.sku-table .avue-group__item {
  margin-bottom: unset;
  background-color: unset;
}

.sku-table .el-form-item {
  margin-bottom: unset;
}

.sku-table .el-col {
  margin-bottom: unset;
}
</style>
