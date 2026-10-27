<script setup lang="ts">
// noinspection TypeScriptCheckImport
import { cloneDeep } from "@pureadmin/utils";
import { type CSSProperties, computed, ref, toRef, watch } from "vue";
import { IC_GLYPHS, MENU_GLYPHS } from "./glyphs";
// 引入中文映射函数，用于根据图标英文名生成中文名称
import { getChineseName } from "@/components/re-icon/chinese-mapping";
import { normalizeIconName } from "./normalize";

type ParameterCSSProperties = (item?: string) => CSSProperties | undefined;
// @ts-ignore
defineOptions({
  name: "IconSelect",
});

const props = defineProps({
  modelValue: {
    require: false,
    type: String,
  },
  disabled: {
    require: false,
    default: true,
    type: Boolean,
  },
});
const emit = defineEmits<{ (e: "update:modelValue", v: string) }>();

const visible = ref(false);
const inputValue = toRef(props, "modelValue");
// 只提供本地图标库（离线可用）：键是前缀，值是去掉前缀后的图标名
const iconList = ref<Record<string, string[]>>({
  "icon-": MENU_GLYPHS.map((n) => n.slice("icon-".length)),
  ic_: IC_GLYPHS.map((n) => n.slice("ic_".length)),
});
const icon = ref("");
// 自定义icon前缀，以下划线 _ 区分
const iconPre = ref("icon-");
const currentActiveType = ref(iconPre);
// 深拷贝图标数据，前端做搜索
const copyIconList = cloneDeep(iconList.value);

const pageSize = ref(200);
const currentPage = ref(1);

// 搜索条件
const filterValue = ref("");

const tabsList = [
  {
    label: "商城图标",
    name: "icon-",
  },
  {
    label: "线性图标",
    name: "ic_",
  },
];

const pageList = computed(() => {
  // 使用中文映射增强筛选：支持按英文名与中文名匹配
  const keyword = filterValue.value?.trim() ?? "";
  const list = copyIconList[currentActiveType.value] ?? [];

  const filtered = list.filter((item) => {
    if (!keyword) return true;
    // 同时尝试无前缀与带前缀两种形式，兼容不同映射键
    const cn1 = getChineseName(item);
    const cn2 = getChineseName(currentActiveType.value + item);
    return (
      item.includes(keyword) ||
      cn1.includes(keyword) ||
      cn2.includes(keyword)
    );
  });

  // 自定义图标不分页，其他类型分页
  if (currentActiveType.value === "icon-") return filtered;

  if (currentPage.value === 1) {
    return filtered.slice(currentPage.value - 1, pageSize.value);
  }
  return filtered.slice(
    pageSize.value * (currentPage.value - 1),
    pageSize.value * (currentPage.value - 1) + pageSize.value,
  );
});

const iconItemStyle = computed((): ParameterCSSProperties => {
  return (item) => {
    if (normalizeIconName(inputValue.value) === currentActiveType.value + item) {
      return {
        borderColor: "var(--el-color-primary)",
        color: "var(--el-color-primary)",
      };
    }
  };
});

function handleClick({ props }) {
  currentPage.value = 1;
  currentActiveType.value = props.name;
  emit(
    "update:modelValue",
    currentActiveType.value + iconList.value[currentActiveType.value][0],
  );
  icon.value = iconList.value[currentActiveType.value][0];
}

function onChangeIcon(item) {
  icon.value = item;
  emit("update:modelValue", currentActiveType.value + item);
  visible.value = false;
}

function onCurrentChange(page) {
  currentPage.value = page;
}

watch(
  () => {
    return props.modelValue;
  },
  () => {
    const value = normalizeIconName(props.modelValue);
    if (value) {
      if (value.indexOf("_") !== -1) {
        currentActiveType.value = value.substring(0, value.indexOf("_") + 1);
        icon.value = value.substring(value.indexOf("_") + 1);
      } else if (value.indexOf("icon-") !== -1) {
        currentActiveType.value = "icon-";
        icon.value = value.substring(5); // 移除 "icon-" 前缀
      } else {
        currentActiveType.value = value.substring(0, value.indexOf(":") + 1);
        icon.value = value.substring(value.indexOf(":") + 1);
      }
    } else {
      icon.value = "";
    }
  },
);
watch(
  () => {
    return filterValue.value;
  },
  () => {
    currentPage.value = 1;
  },
);
watch(
  () => {
    return props.disabled;
  },
  () => {
    if (props.disabled) {
      visible.value = false;
    }
  },
);
const onClear = () => {
  emit("update:modelValue", "");
};
const showVisible = () => {
  if (!props.disabled) {
    visible.value = true;
  }
};
</script>

<template>
  <div class="selector">
    <el-input
      v-model="inputValue"
      :disabled="disabled"
      clearable
      @clear="onClear"
    >
      <template #prepend>
        <div class="flex justify-center items-center">
          <FontIcon
            v-if="
              modelValue &&
              (modelValue.includes('_') || modelValue.includes('icon-'))
            "
            class="tabicon"
            :icon="modelValue"
          />
          <IconifyIconOffline v-else-if="modelValue" :icon="modelValue" />
        </div>
      </template>
      <template #append>
        <el-popover
          :width="350"
          trigger="click"
          popper-class="pure-popper"
          :popper-options="{
            placement: 'auto',
          }"
          :visible="visible"
        >
          <template #reference>
            <div
              v-show="!disabled"
              class="w-[40px] h-[32px] cursor-pointer flex justify-center items-center"
              @click="showVisible"
            >
              <el-icon><Search /></el-icon>
            </div>
          </template>

          <el-input
            v-model="filterValue"
            class="p-2"
            placeholder="搜索图标"
            clearable
          />
          <el-divider border-style="dashed" />

          <el-tabs class="default-el-tabs" v-model="currentActiveType" @tab-click="handleClick">
            <el-tab-pane
              v-for="(pane, index) in tabsList"
              :key="index"
              :label="pane.label"
              :name="pane.name"
            >
              <el-divider class="tab-divider" border-style="dashed" />
              <el-scrollbar height="220px">
                <ul class="flex flex-wrap px-2 ml-2">
                  <li
                    v-for="(item, key) in pageList"
                    :key="key"
                    :title="item"
                    class="icon-item p-2 w-[1/10] cursor-pointer mr-2 mt-1 flex justify-center items-center border border-solid"
                    :style="iconItemStyle(item)"
                    @click="onChangeIcon(item)"
                  >
                    <FontIcon
                      v-if="
                        pane.name.includes('_') || pane.name.includes('icon-')
                      "
                      :icon="currentActiveType + item"
                    />
                    <IconifyIconOffline
                      v-else
                      :icon="currentActiveType + item"
                    />
                  </li>
                </ul>
              </el-scrollbar>
            </el-tab-pane>
          </el-tabs>
          <el-divider border-style="dashed" />

          <el-pagination
            small
            :total="copyIconList[currentActiveType]?.length"
            :page-size="pageSize"
            :current-page="currentPage"
            background
            layout="prev, pager, next"
            class="flex items-center justify-center h-10"
            @current-change="onCurrentChange"
          />
        </el-popover>
      </template>
    </el-input>
  </div>
</template>

<style lang="scss" scoped>
.el-divider--horizontal {
  margin: 1px auto !important;
}

.tab-divider.el-divider--horizontal {
  margin: 0 !important;
}

.icon-item {
  &:hover {
    color: var(--el-color-primary);
    border-color: var(--el-color-primary);
    transition: all 0.4s;
    transform: scaleX(1.05);
  }
}

:deep(.el-tabs__nav-next) {
  font-size: 15px;
  line-height: 32px;
  box-shadow: -5px 0 5px -6px #ccc;
}

:deep(.el-tabs__nav-prev) {
  font-size: 15px;
  line-height: 32px;
  box-shadow: 5px 0 5px -6px #ccc;
}

:deep(.el-input-group__append) {
  padding: 0;
}

:deep(.el-tabs__item) {
  height: 30px;
  font-size: 14px;
  font-weight: normal;
  line-height: 30px;
}

:deep(.el-tabs__header),
:deep(.el-tabs__nav-wrap) {
  position: static;
  margin: 0;
}
</style>
