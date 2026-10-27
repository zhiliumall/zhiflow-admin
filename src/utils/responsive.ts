// 响应式storage

import { responsiveStorageNameSpace } from "@/config";
import { routerArrays } from "@/layout/types";
import Storage from "responsive-storage";
import type { App } from "vue";

export const injectResponsiveStorage = (app: App, config: PlatformConfigs) => {
  const nameSpace = responsiveStorageNameSpace();
  const configObj = Object.assign(
    {
      // 国际化 默认中文zh
      locale: Storage.getData("locale", nameSpace) ?? {
        locale: config.Locale ?? "zh-CN",
      },
      // layout模式以及主题
      layout: Storage.getData("layout", nameSpace) ?? {
        layout: config.Layout ?? "elegant",
        theme: config.Theme ?? "cliklog",
        darkMode: config.DarkMode ?? false,
        sidebarStatus: config.SidebarStatus ?? true,
        sidebarCompact: true, // 侧栏默认紧凑图标栏
        epThemeColor: config.EpThemeColor ?? "#3C6EF0",
        themeColor: config.Theme ?? "cliklog", // 主题色（对应系统配置中的主题色，与theme不同的是它不会受到浅色、深色整体风格切换的影响，只会在手动点击主题色时改变）
        overallStyle: config.OverallStyle ?? "light", // 整体风格（浅色：light、深色：dark、自动：system）
      },
      // 系统配置-界面显示
      // 注意：默认 showModel 改为 'single'
      configure: Storage.getData("configure", nameSpace) ?? {
        grey: config.Grey ?? false,
        weak: config.Weak ?? false,
        hideTabs: config.HideTabs ?? false,
        hideFooter: config.HideFooter ?? true,
        showLogo: config.ShowLogo ?? true,
        showModel: config.ShowModel ?? "single",
        multiTagsCache: config.MultiTagsCache ?? false,
        stretch: config.Stretch ?? false,
      },
    },
    config.MultiTagsCache
      ? {
          // 默认显示顶级菜单tag
          tags: Storage.getData("tags", nameSpace) ?? routerArrays,
        }
      : {},
  );

  app.use(Storage, { nameSpace, memory: configObj });
};
