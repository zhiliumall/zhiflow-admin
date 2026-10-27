<script setup lang="ts">
import noExist from "@/assets/status/404.svg";
import { goFirstPage } from "@/router/utils";

defineOptions({
  name: "404",
});
</script>

<template>
  <div class="flex justify-center items-center h-[640px]">
    <noExist />
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
        404
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
        抱歉，你访问的页面不存在
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
