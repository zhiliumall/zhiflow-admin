import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { visualizer } from "rollup-plugin-visualizer";
import type { PluginOption } from "vite";
import removeConsole from "vite-plugin-remove-console";
import removeNoMatch from "vite-plugin-router-warn";
import svgLoader from "vite-svg-loader";
import { pathResolve } from "./utils";

import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
// 自动导入组件插件
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import Components from "unplugin-vue-components/vite";

export function getPluginsList(): PluginOption[] {
  const lifecycle = process.env.npm_lifecycle_event;
  return [
    vue(),
    // jsx、tsx语法支持
    vueJsx(),
    VueI18nPlugin({
      jitCompilation: true,
      include: [pathResolve("/src/locales/lang/**")],
    }),
    /**
     * 开发环境下移除非必要的 vue-router 动态路由警告 No match found for location with path
     * 见 https://github.com/vuejs/router/issues/521 和 https://github.com/vuejs/router/issues/359
     */
    removeNoMatch(),
    // svg组件化支持
    svgLoader(),
    // 线上环境删除console
    removeConsole({
      external: [
        "src/assets/iconfont/iconfont.js",
        "src/assets/iconfont-ic/iconfont.js",
        "src/assets/iconfont-menu/iconfont.js",
      ],
    }),
    // 打包分析：pnpm report
    lifecycle === "report"
      ? visualizer({ open: true, brotliSize: true, filename: "report.html" })
      : (null as any),
    Components({
      // 自动导入 src/components 下的组件
      dirs: ["src/components"],
      extensions: ["vue", "tsx"],
      dts: "types/auto-components.d.ts",
      resolvers: [
        ElementPlusResolver({
          importStyle: "sass",
        }),
      ],
    }),
  ];
}
