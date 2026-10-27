/**
 * `vite.config.ts` 的 `optimizeDeps` 依赖预构建配置：
 * include 里的模块在 vite 启动时预编译成 esm 并缓存到 node_modules/.vite，避免开发时切换页面卡顿。
 */
const include = [
  "qs",
  "mitt",
  "dayjs",
  "axios",
  "pinia",
  "echarts",
  "vue-i18n",
  "js-cookie",
  "vue-tippy",
  "sortablejs",
  "@vueuse/core",
  "@pureadmin/utils",
  "responsive-storage",
  "@vue/shared",
];

/** 在预构建中强制排除的依赖项：按需单个引入的本地图标模块 */
const exclude = ["@iconify-icons/ep", "@iconify-icons/ri", "@element-plus/icons-vue"];

export { include, exclude };
