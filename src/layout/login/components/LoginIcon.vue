<!-- 登录页 16px 线性图标。
     直接内联 src/assets/login/icons/ 下的 5 个 SVG（几何不动）。
     原 SVG 把描边写死成浅色模式的 --ink3(#7b849c)，这里换成 currentColor，
     让图标跟随 --ink3 在深/浅色下同步。 -->
<template>
  <span :class="wrapClass" v-html="svg" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import iconEyeOff from "@/assets/login/icons/icon-eye-off.svg?raw";
import iconEye from "@/assets/login/icons/icon-eye.svg?raw";
import iconLock from "@/assets/login/icons/icon-lock.svg?raw";
import iconPhone from "@/assets/login/icons/icon-phone.svg?raw";
import iconUser from "@/assets/login/icons/icon-user.svg?raw";

defineOptions({ name: "LoginIcon" });

const SVGS: Record<string, string> = {
  user: iconUser,
  lock: iconLock,
  phone: iconPhone,
  eye: iconEye,
  "eye-off": iconEyeOff,
};

const props = withDefaults(
  defineProps<{
    name: "user" | "lock" | "phone" | "eye" | "eye-off";
    /** field：输入框前置 16×16；eye：密码可见性 18×12 */
    variant?: "field" | "eye";
  }>(),
  { variant: "field" },
);

const svg = computed(() => SVGS[props.name].replace(/#7b849c/g, "currentColor"));
const wrapClass = computed(() =>
  props.variant === "eye" ? "hl-svg hl-svg--eye" : "hl-svg",
);
</script>
