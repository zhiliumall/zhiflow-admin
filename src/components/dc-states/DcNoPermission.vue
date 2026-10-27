<template>
  <div class="dc-state" :class="{ 'dc-state--static': !absolute }">
    <div class="dc-denied-art">
      <div class="dc-denied-art__body" />
      <div class="dc-denied-art__shackle" />
      <div class="dc-denied-art__hole" />
      <div class="dc-denied-art__stem" />
    </div>
    <div class="dc-state__title">暂无访问权限</div>
    <div class="dc-state__desc">{{ descText }}</div>
    <div class="dc-state__action">
      <el-button v-if="showApply" type="primary" @click="emit('apply')">申请开通</el-button>
      <span class="dc-state__link" @click="handleBack">返回上一页</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";

const props = withDefaults(
  defineProps<{
    moduleName?: string;
    showApply?: boolean;
    absolute?: boolean;
    autoBack?: boolean;
  }>(),
  { moduleName: "", showApply: true, absolute: true, autoBack: true },
);

const emit = defineEmits<{ apply: []; back: [] }>();
const router = useRouter();

const descText = computed(() =>
  props.moduleName
    ? `当前账号无「${props.moduleName}」模块权限，请联系管理员开通`
    : "当前账号无此模块权限，请联系管理员开通",
);

function handleBack() {
  emit("back");
  if (props.autoBack) router.back();
}
</script>
