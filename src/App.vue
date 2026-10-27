<template>
  <el-config-provider :locale="currentLocale">
    <router-view />
  </el-config-provider>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { ElConfigProvider } from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import plusZhCn from "@/locales/lang/zh-CN";

export default defineComponent({
  name: "app",
  components: {
    [ElConfigProvider.name]: ElConfigProvider,
  },
  computed: {
    currentLocale() {
      return { ...zhCn, ...plusZhCn };
    },
  },
});
</script>
<style>
.el-menu {
  height: var(--el-menu-height, auto) !important;
}
</style>
