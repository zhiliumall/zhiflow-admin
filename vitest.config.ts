import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

/**
 * 单元测试配置：与 vite.config.ts 解耦，不加载自动注册组件、压缩等构建插件。
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@root": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    // router/index.ts 直接读 import.meta.env.VITE_ROUTER_HISTORY
    env: {
      VITE_ROUTER_HISTORY: "hash",
    },
    include: ["src/**/*.spec.ts"],
  },
});
