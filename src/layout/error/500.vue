<script setup lang="ts">
import noServer from "@/assets/status/500.svg";

import { goFirstPage } from "@/router/utils";
defineOptions({
  name: "500",
});
</script>

<template>
  <div class="flex justify-center items-center h-[640px]">
    <noServer />
    <div class="ml-12">
      <p
        v-motion
        class="font-medium text-4xl mb-4 dark:text-white"
        :initial="{
          opacity: 0,
          y: 100,
        }"
        :enter="{
          opacity: 1,
          y: 0,
          transition: {
            delay: 100,
          },
        }"
      >
        500
      </p>
      <p
        v-motion
        class="mb-4" style="color: var(--dc-text-3)"
        :initial="{
          opacity: 0,
          y: 100,
        }"
        :enter="{
          opacity: 1,
          y: 0,
          transition: {
            delay: 300,
          },
        }"
      >
        抱歉，服务器出错了
      </p>
      <el-button
        v-motion
        type="primary"
        :initial="{
          opacity: 0,
          y: 100,
        }"
        :enter="{
          opacity: 1,
          y: 0,
          transition: {
            delay: 500,
          },
        }"
        @click="goFirstPage"
      >
        返回首页
      </el-button>
    </div>
  </div>
</template>
