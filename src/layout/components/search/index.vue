<script setup lang="ts">
import { useBoolean } from "../../hooks/useBoolean";
import { SearchModal } from "./components";

/**
 * inline：顶栏常驻输入框形态（200px 圆角浅底）。
 * 只是把「点图标」换成「点输入框」，打开的仍是同一个 SearchModal，搜索能力完全没动；
 * 不传 inline 时维持原来的图标入口（navbar 的 elegant / vertical 分支还在用）。
 */
withDefaults(defineProps<{ inline?: boolean }>(), { inline: false });

const { bool: show, toggle } = useBoolean();
function handleSearch() {
  toggle();
}
</script>

<template>
  <div>
    <div
      v-if="inline"
      class="search-container search-container--inline"
      @click="handleSearch"
    >
      <input
        class="search-inline-input"
        readonly
        placeholder="搜索菜单 / 功能"
      />
    </div>
    <div
      v-else
      class="search-container w-[40px] h-[48px] flex-c cursor-pointer navbar-bg-hover"
      @click="handleSearch"
    >
      <slot>
        <el-icon :size="20"><Search /></el-icon>
      </slot>
    </div>
    <SearchModal v-model:value="show" />
  </div>
</template>

<style scoped lang="scss">
.search-container--inline {
  position: relative;
  flex: 0 1 200px;
  min-width: 110px;
  cursor: pointer;
}

.search-inline-input {
  width: 200px;
  height: 34px;
  padding: 0 12px;
  font-size: 14px;
  color: var(--dc-text-1);
  cursor: pointer;
  background: #f6f8fb;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
  outline: none;

  &::placeholder {
    color: var(--text-placeholder, var(--dc-text-3));
  }
}
</style>
