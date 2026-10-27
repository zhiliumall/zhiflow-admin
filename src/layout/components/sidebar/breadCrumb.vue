<script setup lang="ts">
import { isEqual } from "@pureadmin/utils";

import { useI18n } from "@/locales/setupI18n";
const { $t } = useI18n();
import { useRoute, useRouter } from "vue-router";
import { ref, watch, onMounted, toRaw } from "vue";
import { getParentPaths, findRouteByPath } from "@/router/utils";
import { useMultiTagsStoreHook } from "@/store/modules/multiTags";

const route = useRoute();
const levelList = ref([]);
const router = useRouter();
const routes: any = router.options.routes;
const multiTags: any = useMultiTagsStoreHook().multiTags;

const getBreadcrumb = (): void => {
  // 当前路由信息
  let currentRoute;

  if (Object.keys(route.query).length > 0) {
    multiTags.forEach((item) => {
      if (isEqual(route.query, item?.query)) {
        currentRoute = toRaw(item);
      }
    });
  } else if (Object.keys(route.params).length > 0) {
    multiTags.forEach((item) => {
      if (isEqual(route.params, item?.params)) {
        currentRoute = toRaw(item);
      }
    });
  } else {
    currentRoute = findRouteByPath(router.currentRoute.value.path, routes);
  }

  // 当前路由的父级路径组成的数组
  const parentRoutes = getParentPaths(
    router.currentRoute.value.name as string,
    routes,
    "name",
  );
  // 存放组成面包屑的数组
  const matched = [];

  // 获取每个父级路径对应的路由信息
  parentRoutes.forEach((path) => {
    if (path !== "/") matched.push(findRouteByPath(path, routes));
  });

  matched.push(currentRoute);

  matched.forEach((item, index) => {
    if (currentRoute?.query || currentRoute?.params) return;
    if (item?.children) {
      item.children.forEach((v) => {
        if (v?.meta?.title === item?.meta?.title) {
          matched.splice(index, 1);
        }
      });
    }
  });

  levelList.value = matched.filter(
    (item) => item?.meta && item?.meta.title !== false,
  );
};

const handleLink = (item) => {
  const { redirect, name, path } = item;
  if (redirect) {
    router.push(redirect as any);
  } else {
    if (name) {
      if (item.query) {
        router.push({
          name,
          query: item.query,
        });
      } else if (item.params) {
        router.push({
          name,
          params: item.params,
        });
      } else {
        router.push({ name });
      }
    } else {
      router.push({ path });
    }
  }
};

onMounted(() => {
  getBreadcrumb();
});

watch(
  () => route.path,
  () => {
    getBreadcrumb();
  },
  {
    deep: true,
  },
);
const getMenuName = (key: any) => {
  let title = $t(key);
  // 如果title是 menus. 开头的表示没有国际化,就截取后面的值
  if (title.startsWith("menus.")) {
    title = title.substring(6);
  }
  return title;
};
</script>

<template>
  <div class="custom-breadcrumb select-none">
    <div
      v-for="(item, index) in levelList"
      :key="item.path"
      class="breadcrumb-button"
      :class="{ 'is-last': index === levelList.length - 1 }"
      @click="handleLink(item)"
    >
      {{ getMenuName(item.meta.title) }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.custom-breadcrumb {
  display: flex !important;
  align-items: center !important;
  height: 50px !important;

  .breadcrumb-button {
    display: inline-flex !important;
    align-items: center !important;
    height: 32px !important;
    padding: 0 16px !important;
    margin-right: 8px !important;
    font-size: 14px !important;
    color: #fff !important;
    cursor: pointer !important;
    user-select: none !important;
    background-color: #409eff !important;
    border: 1px solid #409eff !important;
    border-radius: 4px !important;
    transition: all 0.3s !important;

    &:hover {
      background-color: #66b1ff !important;
      border-color: #66b1ff !important;
    }

    &.is-last {
      font-weight: 500 !important;
      background-color: #409eff !important;
    }
  }
}
</style>
