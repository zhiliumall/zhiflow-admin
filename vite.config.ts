import { type ConfigEnv, loadEnv, type UserConfigExport } from "vite";
import { exclude, include } from "./build/optimize";
import { getPluginsList } from "./build/plugins";
import {
  __APP_INFO__,
  alias,
  pathResolve,
  root,
  warpperEnv,
} from "./build/utils";

/** 开发时转发到后端的接口前缀（与后端路由的一级前缀一致） */
const BACKEND_PREFIXES = [
  "/oauth2",
  "/auth",
  "/upms",
  "/mall",
  "/mallapi",
  "/pay",
  "/weixin",
  "/files",
];

export default ({ mode }: ConfigEnv): UserConfigExport => {
  const env = loadEnv(mode, root);
  const { VITE_PORT, VITE_PUBLIC_PATH } = warpperEnv(env);
  const proxyTarget =
    process.env.VITE_PROXY_TARGET ||
    env.VITE_PROXY_TARGET ||
    "http://127.0.0.1:8080";
  return {
    base: VITE_PUBLIC_PATH,
    root,
    resolve: {
      alias,
      dedupe: ["vue"],
    },
    server: {
      port: VITE_PORT,
      host: "0.0.0.0",
      // 本地跨域代理 https://cn.vitejs.dev/config/server-options.html#server-proxy
      proxy: Object.fromEntries(
        BACKEND_PREFIXES.map((prefix) => [
          `^${prefix}(?=/|$)`,
          { target: proxyTarget, changeOrigin: true },
        ]),
      ),
      // 预热文件以提前转换和缓存结果，降低启动期间的初始页面加载时长
      warmup: {
        clientFiles: ["./index.html", "./src/{views,components}/*"],
      },
    },
    plugins: getPluginsList(),
    // https://cn.vitejs.dev/config/dep-optimization-options.html
    optimizeDeps: {
      include,
      exclude,
    },
    build: {
      target: "es2020",
      sourcemap: false,
      chunkSizeWarningLimit: 2000,
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      cssCodeSplit: true,
      rollupOptions: {
        input: {
          index: pathResolve("./index.html", import.meta.url),
        },
        output: {
          chunkFileNames: "static/js/[name]-[hash].js",
          entryFileNames: "static/js/[name]-[hash].js",
          assetFileNames: "static/[ext]/[name]-[hash].[ext]",
          manualChunks: (id) => {
            // 图标库按需分包
            if (id.includes("/assets/iconfont/")) return "iconfont-core";
            if (id.includes("/assets/iconfont-ic/")) return "iconfont-ic";
            if (id.includes("/assets/iconfont-menu/")) return "iconfont-menu";

            if (id.includes("node_modules")) {
              if (
                id.includes("node_modules/echarts/") ||
                id.includes("node_modules/zrender/")
              ) {
                return "echarts";
              }
              if (
                id.includes("node_modules/vue/") ||
                id.includes("node_modules/vue-router/") ||
                id.includes("node_modules/pinia/") ||
                id.includes("node_modules/@vue/")
              ) {
                return "vue-core";
              }
              // 富文本编辑器是叶子库，单独成包，只有打开编辑器的页面才下载
              if (id.includes("node_modules/@wangeditor/")) {
                return "editor-wangeditor";
              }
              if (id.includes("node_modules/element-china-area-data/")) {
                return "lib-area-data";
              }
              if (id.includes("node_modules/vue-qr/")) return "lib-vueqr";
              // element-plus、avue、@vueuse 之间存在相互依赖，必须同在 vendor，
              // 单独拆包会产生循环依赖（运行时报 Cannot access '...' before initialization）
              return "vendor";
            }
          },
        },
      },
      copyPublicDir: true,
    },
    define: {
      __INTLIFY_PROD_DEVTOOLS__: false,
      __APP_INFO__: JSON.stringify(__APP_INFO__),
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: "modern-compiler",
          quietDeps: true,
          // element-plus 的 theme-chalk 仍用老式 sass if() 函数，按弃用 ID 静音
          silenceDeprecations: ["if-function"],
        },
      },
    },
  };
};
