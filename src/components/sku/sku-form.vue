<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<!-- 商品规格 -->
<template>
  <div class="sku-form">
    <!-- 单规格 -->
    <div v-if="specType == '0'">
      <el-row class="justify-center">
        <el-col :span="15">
          <el-form class="spec-type-form" ref="formRef" :model="goodsSkuOne" :rules="rules" label-width="80px"
            label-position="left">
            <el-form-item :label="$t('components.sku.sellingPrice')">
              <el-input-number :disabled="readonly" v-model="goodsSkuOne.salesPrice" :precision="2" :step="0.1" :min="0" :max="99999999" />
              <span class="unit-suffix">元</span>
            </el-form-item>
            <el-form-item :label="$t('components.sku.marketPrice')" class="mt-4">
              <el-input-number :disabled="readonly" v-model="goodsSkuOne.marketPrice" :precision="2" :step="0.1" :min="0" :max="99999999" />
              <span class="unit-suffix">元</span>
            </el-form-item>
            <el-form-item :label="$t('components.sku.costPrice')" class="mt-4">
              <el-input-number :disabled="readonly" v-model="goodsSkuOne.costPrice" :precision="2" :step="0.1" :min="0" :max="99999999" />
              <span class="unit-suffix">元</span>
            </el-form-item>
            <el-form-item :label="$t('components.sku.stock')" class="mt-4">
              <el-input-number :disabled="readonly" v-model="goodsSkuOne.stock" :precision="0" :step="1" :min="0" :max="99999999" />
            </el-form-item>
            <el-form-item :label="$t('components.sku.weight')" class="mt-4">
              <el-input-number :disabled="readonly" v-model="goodsSkuOne.weight" :precision="2" :step="0.1" :min="0" :max="99999999" />
              <span class="unit-suffix">kg</span>
            </el-form-item>
            <el-form-item :label="$t('components.sku.volume')" class="mt-4">
              <el-input-number :disabled="readonly" v-model.number="goodsSkuOne.volume" :precision="2" :step="0.1" :min="0"
                :max="99999999" />
              <span class="unit-suffix">m³</span>
            </el-form-item>
          </el-form>
        </el-col>
      </el-row>
    </div>
    <!-- 多规格 -->
    <div v-if="specType == '1'" class="spec-multi-section">
      <div class="spec-section-header">
        <span class="spec-section-title">{{ $t('components.sku.itemSpec') }}</span>
        <span v-if="!readonly" class="spec-section-hint">
          先添加规格（如「颜色」），再给它添加规格值（如「红色」）；下方 SKU 表会按组合自动生成
        </span>
      </div>

      <!-- 一个规格一张卡：卡头是规格名（只读，改名去「规格管理」），卡身是规格值 chips -->
      <div v-for="(item, index) in localGoodsSpuSpec" :key="item.id ?? index" class="spec-card">
        <div class="spec-card__head">
          <span class="spec-card__tag">规格</span>
          <span class="spec-card__name">{{ item.value }}</span>
          <span class="spec-card__spacer" />
          <el-tooltip v-if="!readonly" effect="dark" content="删除该规格（含它的全部规格值）" placement="top">
            <span class="spec-card__del" @click="delGoodsSpuSpec(index)">
              <el-icon>
                <Delete />
              </el-icon>
            </span>
          </el-tooltip>
        </div>
        <div class="spec-card__vals">
          <el-tag v-for="(item2, index2) in item.leaf" :key="item2.id" :closable="!readonly"
            class="spec-value-tag" @close="delGoodsSpuSpecValue(+index, +index2)">
            {{ item2.value }}
          </el-tag>

          <!-- 就地输入：选中/回车新建后不关闭，可连续录入下一个值 -->
          <el-select v-if="valueEditingId === item.id" :ref="(el: any) => (valueSelectEl = el)"
            v-model="goodsSpecValueAdd" class="spec-inline-select" filterable allow-create default-first-option
            :placeholder="$t('components.sku.enterSpecValue')" :loading="valueOptionsLoading"
            @change="goodsSpecValueChange" @blur="onInlineBlur('value')" @keydown.capture.esc="closeEditors">
            <el-option v-for="opt in goodsSpecValue" :key="opt.id" :label="opt.name" :value="opt.id"
              :disabled="opt.disabled" />
            <template #empty>
              <div class="spec-inline-empty">输入后按回车即可新建</div>
            </template>
          </el-select>
          <span v-else-if="!readonly" class="spec-chip-add" @click="openValueEditor(item.id, index)">
            <el-icon>
              <Plus />
            </el-icon>{{ $t('components.sku.addSpecValue') }}
          </span>
        </div>
      </div>

      <!-- 添加规格：整宽虚线块，点开原地变输入 -->
      <template v-if="!readonly">
        <div v-if="specEditing" class="spec-add-inline">
          <el-select :ref="(el: any) => (specSelectEl = el)" v-model="goodsSpecAdd" class="spec-inline-select is-wide"
            filterable allow-create default-first-option :placeholder="`规格名，如 ${recommendedSpecNames}`"
            @change="goodsSpecChange" @blur="onInlineBlur('spec')" @keydown.capture.esc="closeEditors">
            <el-option v-for="opt in goodsSpec" :key="opt.id" :label="opt.name" :value="opt.id"
              :disabled="opt.disabled" />
            <template #empty>
              <div class="spec-inline-empty">输入后按回车即可新建</div>
            </template>
          </el-select>
          <span class="spec-inline-tip">
            规格名填「轴」，如 {{ recommendedSpecNames }}；具体的「红色」「XL」填到规格值里。列表没有可直接输入后回车新建
          </span>
        </div>
        <div v-else class="spec-add-block" @click="openSpecEditor">
          <el-icon>
            <Plus />
          </el-icon>{{ $t('components.sku.addSpec') }}
        </div>
      </template>

      <!-- SKU 表格 -->
      <div class="sku-table-section mt-4">
        <SkuTable :specData="goodsSpuSpecFilter" :goodsSku="goodsSku" :form="form" @getGoodsSku="getGoodsSku" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { addObj as apiAddSpec } from "@/api/mall/goodsspec";
import {
  addObj as apiAddSpecValue,
  getList as specValueList,
} from "@/api/mall/goodsspecvalue";
import SkuTable from "@/components/sku/sku-table.vue";
import {
  looksLikeSpecValue,
  specNamingWarning,
  RECOMMENDED_SPEC_NAMES,
} from "@/components/sku/specNaming";
import { appConfirm } from "@/components/overlay";
import { Delete, Plus } from '@element-plus/icons-vue';
import { computed, nextTick, ref, watch } from "vue";

// Props 定义
const props = defineProps<{
  form: Record<string, any>;
  goodsSpec: any[];
  goodsSpuSpec: any[];
  goodsSku: any[];
  specType: string;
  /** 只读展示（详情抽屉）：隐藏增删规格 / 规格值入口 */
  specTypeDisabled?: boolean;
}>();

const readonly = computed(() => !!props.specTypeDisabled);

// Emits 定义
const emit = defineEmits<{
  getGoodsSku: [value: any[], spec?: any[]];
}>();

// 响应式数据
const formRef = ref();
const goodsSpecAdd = ref<any>(null);
const goodsSpecValueAdd = ref<any>(null);
const goodsSpecValue = ref<any>(null);
const goodsSpuSpecIndex = ref<number | null>(null);
const goodsSkuOne = ref<any>(null);
const rules = ref({});

// 就地编辑（不用 el-popover）：
// 同一时刻只会有一个输入框，所以用单值状态而不是 Map。
// specEditing = 底部「添加规格」正在录入；valueEditingId = 哪张规格卡正在录入规格值。
const specEditing = ref(false);
const valueEditingId = ref<string | number | null>(null);
const valueOptionsLoading = ref(false);
const specSelectEl = ref<any>(null);
const valueSelectEl = ref<any>(null);
// 刚刚发生过一次「选中/新建」——此时 el-select 会先 blur 再被我们重新聚焦，
// 不能把这次 blur 当成「用户点到别处了」而收起输入框，否则连续录入就断了。
let justCommitted = false;

// 本地响应式副本，确保 goodsSpuSpec 永远不为 null
const localGoodsSpuSpec = ref<any[]>([]);
watch(
  () => props.goodsSpuSpec,
  (val) => {
    localGoodsSpuSpec.value = val || [];
  },
  { immediate: true }
);

// 推荐轴名
const recommendedSpecNames = RECOMMENDED_SPEC_NAMES.slice(0, 3).join(" / ");

// 计算属性：过滤掉属性名和属性值为空的数据规格项目
const goodsSpuSpecFilter = computed(() => {
  return localGoodsSpuSpec.value.filter(
    (item) => item.value && item.leaf != null && item.leaf.length
  );
});

// 将 localGoodsSpuSpec 的变更同步回父组件
function syncSpecToParent() {
  emit("getGoodsSku", props.goodsSku, localGoodsSpuSpec.value);
}

// 监听 form 变化
watch(
  () => props.form,
  (val) => {
    if (val) {
      if (props.goodsSku.length > 0) {
        goodsSkuOne.value = props.goodsSku[0];
        goodsSkuOne.value.enable =
          goodsSkuOne.value.enable || goodsSkuOne.value.enable == "0"
            ? goodsSkuOne.value.enable
            : "1";
      } else {
        goodsSkuOne.value = {
          salesPrice: 0,
          marketPrice: undefined,
          costPrice: undefined,
          stock: 0,
          weight: undefined,
          volume: undefined,
          enable: "1",
        };
      }
    }
  },
  { immediate: true }
);

// 监听 goodsSkuOne 变化
watch(
  goodsSkuOne,
  (newSkus) => {
    emit("getGoodsSku", [newSkus], localGoodsSpuSpec.value);
  },
  { deep: true, immediate: true }
);

// 方法
function getGoodsSku(val: any[]) {
  emit("getGoodsSku", val, localGoodsSpuSpec.value);
}

function delGoodsSpuSpecValue(indexSpec: number, indexSpecValue: number) {
  localGoodsSpuSpec.value[indexSpec].leaf.splice(indexSpecValue, 1);
  syncSpecToParent();
}

function delGoodsSpuSpec(index: number) {
  const id = localGoodsSpuSpec.value[index].id;
  localGoodsSpuSpec.value.splice(index, 1);
  (props.goodsSpec || []).forEach(function (val) {
    if (val.id == id) {
      val.disabled = false;
    }
  });
  syncSpecToParent();
}

/** 打开某张规格卡的「规格值」就地输入，并把该规格已有的候选值拉回来做建议 */
async function openValueEditor(specId: string | number, index: number) {
  specEditing.value = false;
  valueEditingId.value = specId;
  goodsSpuSpecIndex.value = index;
  goodsSpecValueAdd.value = null;
  goodsSpecValue.value = [];
  focusInline(() => valueSelectEl.value);

  valueOptionsLoading.value = true;
  try {
    const resp = await specValueList({ specId });
    const respData = resp.data;
    goodsSpecValue.value = respData?.data || respData || [];
    markPickedValues(specId);
  } finally {
    valueOptionsLoading.value = false;
  }
}

/** 已经加到本商品上的规格值在候选里置灰，避免重复添加 */
function markPickedValues(specId: string | number) {
  const spec = localGoodsSpuSpec.value.find((val) => val.id == specId);
  if (!spec) return;
  (goodsSpecValue.value || []).forEach((opt: any) => {
    opt.disabled = (spec.leaf || []).some((leaf: any) => leaf.id == opt.id);
  });
}

function openSpecEditor() {
  valueEditingId.value = null;
  specEditing.value = true;
  goodsSpecAdd.value = null;
  // 已经加过的规格在候选里置灰
  (props.goodsSpec || []).forEach((val) => {
    val.disabled = localGoodsSpuSpec.value.some((val2) => val.id == val2.id);
  });
  focusInline(() => specSelectEl.value);
}

function closeEditors() {
  specEditing.value = false;
  valueEditingId.value = null;
}

/** blur 收起输入框；但刚提交过一次的 blur 是我们自己重新聚焦造成的，跳过 */
function onInlineBlur(which: "spec" | "value") {
  window.setTimeout(() => {
    if (justCommitted) {
      justCommitted = false;
      return;
    }
    if (which === "spec") specEditing.value = false;
    else valueEditingId.value = null;
  }, 180);
}

/**
 * v-if 刚切过来时组件还没挂载，等两帧再聚焦。
 * focus() 只聚焦输入框、不展开候选列表，所以再调一次 toggleMenu —— 用户点的是
 * 那颗虚线 chip，期望是「点开就能看到有哪些值可选」，而不是先聚焦再自己点一下。
 * toggleMenu/expanded 是 el-select setup 暴露出来的，用可选链兜底：EP 换实现时
 * 最多退化成「只聚焦不展开」，不会报错。
 */
function focusInline(getEl: () => any) {
  nextTick(() => {
    nextTick(() => {
      const el = getEl();
      el?.focus?.();
      if (el && !el.expanded) el.toggleMenu?.();
    });
  });
}

/** 录入一条之后保持输入框打开，方便连续录入下一个 */
function keepEditing(getEl: () => any) {
  justCommitted = true;
  focusInline(getEl);
}

function goodsSpecValueChange(id: string | number) {
  goodsSpecValueAdd.value = null;
  let isNew = true;
  (goodsSpecValue.value || []).forEach((val: any) => {
    if (val.id == id) {
      isNew = false;
      val.disabled = true;
      localGoodsSpuSpec.value[goodsSpuSpecIndex.value!].leaf.push({
        id: val.id,
        value: val.name,
      });
      syncSpecToParent();
      keepEditing(() => valueSelectEl.value);
    }
  });
  if (isNew) {
    // 需新增
    apiAddSpecValue({
      specId: localGoodsSpuSpec.value[goodsSpuSpecIndex.value!].id,
      name: id,
    }).then((data: any) => {
      if (!Array.isArray(goodsSpecValue.value)) goodsSpecValue.value = [];
      goodsSpecValue.value.push({
        id: data.data.id,
        name: data.data.name,
        disabled: true,
      });
      localGoodsSpuSpec.value[goodsSpuSpecIndex.value!].leaf.push({
        id: data.data.id,
        value: data.data.name,
      });
      syncSpecToParent();
      keepEditing(() => valueSelectEl.value);
    });
  }
}

function goodsSpecChange(id: string | number) {
  goodsSpecAdd.value = null;
  const picked = (props.goodsSpec || []).find((val) => val.id == id);

  // 选中的是词表里已有的规格：本地挂上即可，不落库
  if (picked) {
    picked.disabled = true;
    localGoodsSpuSpec.value.push({
      id: picked.id,
      value: picked.name,
      leaf: [],
    });
    syncSpecToParent();
    afterSpecAdded(picked.id);
    return;
  }

  // allow-create 走到这里 = 要新建一条规格。先拦一道：
  // `goods_spec` 是全店共用的词表，一旦把「500g × 2袋」这种规格值写进来，
  // 所有商品的「添加规格」下拉里就多一条永久噪音。只提示不硬拦。
  const name = String(id ?? "").trim();
  if (!name) return;
  if (looksLikeSpecValue(name)) {
    appConfirm(specNamingWarning(name))
      .then(() => createSpec(name))
      // 「我改一下」：把输入框重新打开，让他接着改规格名
      .catch(() => openSpecEditor());
    return;
  }
  createSpec(name);
}

/** 落库新建规格，并把它挂到当前商品上 */
function createSpec(name: string) {
  apiAddSpec({ name }).then((data: any) => {
    // 规格库为空时父组件给的是 null（specList 还没回来 / 一条规格都没有），
    // 直接 push 会 TypeError，这里容错即可 —— 下次打开面板 specList 会带回新建的这条。
    if (Array.isArray(props.goodsSpec)) {
      props.goodsSpec.push({
        id: data.data.id,
        name: data.data.name,
        disabled: true,
      });
    }
    localGoodsSpuSpec.value.push({
      id: data.data.id,
      value: data.data.name,
      leaf: [],
    });
    syncSpecToParent();
    afterSpecAdded(data.data.id);
  });
}

/**
 * 加完一个规格就把录入焦点顺移到这张新卡的「规格值」上 —— 新规格没有值时
 * SKU 表还是空的，让用户接着填值是唯一有意义的下一步。
 */
function afterSpecAdded(specId: string | number) {
  specEditing.value = false;
  justCommitted = true;
  const index = localGoodsSpuSpec.value.findIndex((val) => val.id == specId);
  if (index >= 0) openValueEditor(specId, index);
}
</script>

<style lang="scss" scoped>
.sku-form .el-tag+.el-tag {
  margin-left: 10px;
}

.sku-form {
  margin-left: -70px;
}

.box-card {
  --el-card-border: 1px solid #e4e7ed;
}

.spec-type-form {
  :deep(.el-input-number__decrease) {
    border-right: none;
    border-radius: 6px 0 0 6px;
  }

  :deep(.el-input-number__increase) {
    border-left: none;
    border-radius: 0 6px 6px 0;
  }
}

.unit-suffix {
  position: absolute;
  left: 100%;
  margin-left: 8px;
  font-size: var(--dc-fs-13, 13px);
  color: var(--dc-text-2, #333);
}

// ===== 多规格区域样式（卡片式）=====
//
// 交互取舍：用 popover 加规格值要「点 + → 等 popover → 点下拉 → 输入 → 回车 → popover 关」，
// 加三个值就重复三遍，且两个 popover 会互相压住。所以用**就地输入**：
// chip 行末尾那颗虚线 chip 点一下原地变成 el-select，选中/回车新建后不收起，
// 可以连着录下一个，Esc 或点别处才收。
.spec-multi-section {
  padding: 16px 0;

  .spec-section-header {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    align-items: baseline;
    margin-bottom: 12px;

    .spec-section-title {
      font-size: var(--dc-fs-15, 15px);
      font-weight: 600;
      color: var(--dc-text-1, #1f2733);
    }

    // 「规格 → 规格值 → SKU」三级关系不写出来没人猜得到，空态时尤其
    .spec-section-hint {
      font-size: var(--dc-fs-12, 12px);
      color: var(--dc-text-3, #8a93a3);
    }
  }

  // ---- 规格卡 ----
  .spec-card {
    padding: 12px 14px;
    margin-bottom: 10px;
    background: var(--dc-surface, #fff);
    border: 1px solid var(--dc-border, #ebeef2);
    border-radius: var(--dc-radius-md, 6px);
    box-shadow: var(--dc-shadow-card, 0 1px 4px rgb(31 39 51 / 6%));
  }

  .spec-card__head {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 10px;
  }

  .spec-card__tag {
    padding: 2px 6px;
    font-size: var(--dc-fs-11, 11px);
    color: var(--dc-text-3, #8a93a3);
    background: var(--dc-divider, #f2f4f7);
    border-radius: var(--dc-radius-sm, 4px);
  }

  // 规格名只读（改名要去「商品管理 → 规格管理」）。不用 disabled 的 el-input 渲染：
  // 灰底灰字看起来像「输入框坏了」，容易被误以为「多规格编辑不了」。
  .spec-card__name {
    font-size: var(--dc-fs-14, 14px);
    color: var(--text-tertiary, #667085);
    text-align: center;
  }

  .spec-card__spacer {
    flex: 1;
  }

  .spec-card__del {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    color: var(--dc-text-4, #c0c7d1);
    cursor: pointer;
    border-radius: var(--dc-radius-sm, 4px);
    transition: all var(--dc-dur-micro, 150ms);

    &:hover {
      color: var(--dc-danger, #f2270c);
      background: var(--dc-danger-soft, #feefec);
    }
  }

  .spec-card__vals {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;

    :deep(.spec-value-tag) {
      height: 30px;
      padding: 0 10px;
      line-height: 30px;
      color: var(--dc-text-2, #3f4a59);
      background-color: var(--dc-bg-block, #f7f8fa);
      border: none;
      border-radius: var(--dc-radius-md, 6px);
    }

    :deep(.el-tag__close) {
      margin-left: 4px;
      color: var(--dc-text-4, #c0c7d1);
      background-color: transparent;

      &:hover {
        color: var(--dc-danger, #f2270c);
        background-color: transparent;
      }
    }
  }

  // ---- 末尾那颗虚线 chip：点一下原地变输入框 ----
  .spec-chip-add {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    height: 30px;
    padding: 0 10px;
    font-size: var(--dc-fs-13, 13px);
    color: var(--dc-brand, #3c6ef0);
    cursor: pointer;
    background: transparent;
    border: 1px dashed var(--dc-brand-border, #c7d6fb);
    border-radius: var(--dc-radius-md, 6px);
    transition: all var(--dc-dur-micro, 150ms);

    &:hover {
      background: var(--dc-brand-soft, #ebf0ff);
      border-style: solid;
    }
  }

  // ---- 底部整宽虚线块：添加规格 ----
  .spec-add-block {
    display: flex;
    gap: 6px;
    align-items: center;
    justify-content: center;
    height: 40px;
    font-size: var(--dc-fs-13, 13px);
    color: var(--dc-text-2, #3f4a59);
    cursor: pointer;
    background: var(--dc-surface, #fff);
    border: 1px dashed var(--dc-border-dashed, #c9d0da);
    border-radius: var(--dc-radius-md, 6px);
    transition: all var(--dc-dur-micro, 150ms);

    &:hover {
      color: var(--dc-brand, #3c6ef0);
      background: var(--dc-brand-soft, #ebf0ff);
      border-color: var(--dc-brand-border, #c7d6fb);
    }
  }

  .spec-add-inline {
    display: flex;
    gap: 10px;
    align-items: center;
    height: 40px;
    padding: 0 12px;
    background: var(--dc-surface, #fff);
    border: 1px solid var(--dc-border, #ebeef2);
    border-radius: var(--dc-radius-md, 6px);
  }

  .spec-inline-tip {
    font-size: var(--dc-fs-12, 12px);
    color: var(--dc-text-3, #8a93a3);
  }

  .spec-inline-select {
    width: 168px;

    &.is-wide {
      width: 220px;
    }

    :deep(.el-select__wrapper) {
      min-height: 30px;
      padding: 0 8px;
      font-size: var(--dc-fs-13, 13px);
      border-radius: var(--dc-radius-md, 6px);
    }
  }
}

/* 下拉空态里的「回车新建」提示 —— el-select 的 #empty 内容 teleport 到 body，
   套在 .spec-multi-section 下会一条都命不中（scoped 的 data-v 属性照样跟着走，
   所以单类名选择器有效）。 */
.spec-inline-empty {
  padding: 10px 12px;
  font-size: var(--dc-fs-12, 12px);
  color: var(--dc-text-3, #8a93a3);
}
</style>
