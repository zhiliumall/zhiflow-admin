<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
  <div class="basic-container" :style="styleName" :class="{ 'basic-container--block': block }">
    <!--    <el-card style="box-shadow: none; min-height: calc(100vh - 178px)">-->
    <el-card style="box-shadow: none">
      <slot />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

defineOptions({
  name: "BasicContainer",
});
const props = defineProps({
  background: { type: String },
  block: {
    type: Boolean,
    default: false,
  },
});
const styleName = computed(() => {
  return {
    background: props.background,
  };
});
</script>

<style lang="scss">
.basic-container {
  // padding: var(--basic-container-padding, 8px 15px);
  background-color: #fff;

  /* box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); */
  .el-card {
    border: 0 !important;
    border-radius: 0 !important;
  }

  .el-card__body {
    padding: 0;
  }

  &--block {
    height: 100%;

    .basic-container__card {
      height: 100%;
    }
  }

  .basic-container__card {
    height: 100%;

    .el-card__body {
      height: 100%;
    }
  }

  &__card {
    --el-card-border-color: #fff;
    --el-card-border-radius: 0;
    --el-card-padding: 0;

    width: 100%;
  }
}

::-webkit-scrollbar {
  display: none;
}
</style>
