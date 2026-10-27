import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import { createApp, type Directive } from "vue";
// 国际化
import { localesLangData, setupI18n } from "@/locales/setupI18n";
// elementPlus 组件UI注册
import { useElementPlus } from "@/plugins/elementPlus";
import { setupStore } from "@/store";
// 给avue框架使用的
import { axios } from "@/utils/http";
import { injectResponsiveStorage } from "@/utils/responsive";
import App from "./App.vue";
import { getPlatformConfig } from "./config";
import router from "./router";
// 引入重置样式
import "./style/reset.scss";
// 数字字体：金额 / KPI / 编号
import "./assets/fonts/zf-num.css";
// 导入公共样式
import "./style/index.scss";
import "./style/zf-tokens.css";
import "element-plus/dist/index.css";
// 设计基座：需晚于 element-plus 默认样式加载，才能覆盖组件默认外观
import "./style/ds/tokens.css";
import "./style/ds/components.css";
import "./style/ds/animations.css";
import "./style/tailwind.css";
// 按需加载字体图标
(async () => {
  const { preloadCoreIconfonts, setupInteractionBasedLoading } = await import("@/utils/iconfont");
  preloadCoreIconfonts();
  setupInteractionBasedLoading();
})();

import "./style/utilities.scss";

// 设计体系：tokens + 旧变量桥接 + Element Plus 覆盖，须最后加载
import "./style/dc/tokens.css";
import "./style/dc/bridge.css";
import "./style/dc/element-plus.scss";
import "./style/dc/components.scss";
// 弹窗皮肤（仅作用于 .dc-form-dialog，avue dialogCustomClass 接入）
import "./style/dc/dialog.scss";
// 商品域页面通用样式（goods-dc-page / goods-dc-table-wrap / goods-dc-status 等）
import "./views/mall/goods-dc.scss";
// 主壳几何：顶栏与侧栏
import "./style/shell-mw.scss";
// 弹窗与反馈体系：全站 el-dialog / message-box / drawer / message 换皮
import "./style/overlay.scss";

const app = createApp(App);
// elementUI图标库
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// 自定义指令
import * as directives from "@/directives";

Object.keys(directives).forEach((key) => {
  app.directive(key, (directives as { [key: string]: Directive })[key]);
});

// 全局注册@iconify/vue图标库
import {
  FontIcon,
  IconifyIconOffline,
  IconifyIconOnline,
} from "./components/re-icon";

app.component("IconifyIconOffline", IconifyIconOffline);
app.component("IconifyIconOnline", IconifyIconOnline);
app.component("FontIcon", FontIcon);

import BasicContainer from "./components/basic-container/index.vue";

app.component("BasicContainer", BasicContainer);

import AmountText from "./components/amount-text/index.vue";

app.component("AmountText", AmountText);

// 全局注册 vue-tippy 提示条插件 https://vue-tippy.netlify.app/
import "tippy.js/dist/tippy.css";
import "tippy.js/themes/light.css";
import VueTippy from "vue-tippy";

app.use(VueTippy);

// 引入Avue
import Avue from "@smallwei/avue";
import "@smallwei/avue/lib/index.css";

getPlatformConfig(app).then(async (config) => {
  injectResponsiveStorage(app, config);
  await setupI18n(app);
  setupStore(app);
  app.use(router);
  await router.isReady();
  window.axios = axios;
  // Avue 的全局配置 https://avuejs.com/docs/global.html
  app.use(Avue, {
    axios,
    locale: localesLangData,
    formOption: {
      labelPosition: "left", // 表单label的位置默认左对齐
      labelWidth: 100, // 表单label的默认宽度
    },
    crudOption: {
      columnBtn: false, // 隐藏列显隐按钮
      filterBtn: false, // 隐藏筛选按钮
      gridBtn: false, // 隐藏表格/卡片切换按钮
      excelBtn: false, // 导出走后端接口，不用前端导出
      refreshBtn: true, // 保留刷新按钮
      searchBtn: true, // 保留搜索按钮
      printBtn: false, // 隐藏打印按钮
    },
  });
  app.use(useElementPlus);
  app.mount("#app");
});
