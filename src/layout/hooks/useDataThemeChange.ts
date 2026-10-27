import { getConfig } from "@/config";
import { routerArrays } from "@/layout/types";
import { resetRouter, router } from "@/router";
import { useAppStoreHook } from "@/store/modules/app";
import { useEpThemeStoreHook } from "@/store/modules/epTheme";
import { useMultiTagsStoreHook } from "@/store/modules/multiTags";
import { removeToken } from "@/utils/auth";
import { darken, lighten, storageLocal, useGlobal } from "@pureadmin/utils";
import { ref } from "vue";
import type { themeColorsType } from "../types";
import { useLayout } from "./useLayout";

/**
 * 主题色切换
 */
export function useDataThemeChange() {
  const { layoutTheme, layout, initStorage } = useLayout();
  const themeColors = ref<Array<themeColorsType>>([
    /* Cliklog 极简白 */
    { color: "#3C6EF0", themeColor: "cliklog" },
  ]);

  const { $storage } = useGlobal<GlobalPropertiesApi>();

  // 强制重新初始化存储，确保 cliklog 主题生效
  initStorage();

  const dataTheme = ref<boolean>($storage?.layout?.darkMode);
  const overallStyle = ref<string>($storage?.layout?.overallStyle);
  const body = document.documentElement as HTMLElement;

  function toggleClass(flag: boolean, clsName: string, target?: HTMLElement) {
    const targetEl = target || document.body;
    let { className } = targetEl;
    className = className.replace(clsName, "").trim();
    targetEl.className = flag ? `${className} ${clsName}` : className;
  }

  /** 设置导航主题色 */
  function setLayoutThemeColor(
    theme = getConfig().Theme ?? "cliklog",
    isClick = true,
  ) {
    layoutTheme.value.theme = theme;
    document.documentElement.setAttribute("data-theme", theme);

    // 如果非isClick，保留之前的themeColor
    const storageThemeColor = $storage.layout.themeColor;
    $storage.layout = {
      layout: layout.value,
      theme,
      darkMode: dataTheme.value,
      sidebarStatus: $storage.layout?.sidebarStatus,
      epThemeColor: $storage.layout?.epThemeColor,
      themeColor: isClick ? theme : storageThemeColor,
      overallStyle: overallStyle.value,
    };

    if (theme === "default" || theme === "light") {
      setEpThemeColor(getConfig().EpThemeColor);
    } else {
      const colors = themeColors.value.find((v) => v.themeColor === theme);
      if (colors) {
        setEpThemeColor(colors.color);
      }
    }
  }

  function setPropertyPrimary(mode: string, i: number, color: string) {
    // dark 系列语义为「加深一级」，与主题浅/深无关，统一 darken；
    // light 系列在深色 UI 下需要更亮的对比，故按原有 dataTheme 分支保持
    const value =
      mode === "dark"
        ? darken(color, i / 10)
        : dataTheme.value
          ? darken(color, i / 10)
          : lighten(color, i / 10);
    document.documentElement.style.setProperty(
      `--el-color-primary-${mode}-${i}`,
      value,
    );
  }

  /** 设置 `element-plus` 主题色 */
  const setEpThemeColor = (color: string) => {
    useEpThemeStoreHook().setEpThemeColor(color);
    document.documentElement.style.setProperty("--el-color-primary", color);

    for (let i = 1; i <= 2; i++) {
      setPropertyPrimary("dark", i, color);
    }
    for (let i = 1; i <= 9; i++) {
      setPropertyPrimary("light", i, color);
    }
  };

  /** 浅色、深色整体风格切换 */
  function dataThemeChange(overall?: string) {
    overallStyle.value = overall;
    if (useEpThemeStoreHook().epTheme === "light" && dataTheme.value) {
      setLayoutThemeColor("default", false);
    } else {
      setLayoutThemeColor(useEpThemeStoreHook().epTheme, false);
    }

    if (dataTheme.value) {
      document.documentElement.classList.add("dark");
    } else {
      if ($storage.layout.themeColor === "light") {
        setLayoutThemeColor("light", false);
      }
      document.documentElement.classList.remove("dark");
    }
  }

  /** 清空缓存并返回登录页 */
  function onReset() {
    removeToken();
    storageLocal().clear();
    const { Grey, Weak, MultiTagsCache, EpThemeColor, Layout } = getConfig();
    useAppStoreHook().setLayout(Layout);
    setEpThemeColor(EpThemeColor);
    useMultiTagsStoreHook().multiTagsCacheChange(MultiTagsCache);
    toggleClass(Grey, "html-grey", document.querySelector("html"));
    toggleClass(Weak, "html-weakness", document.querySelector("html"));
    router.push("/login");
    useMultiTagsStoreHook().handleTags("equal", [...routerArrays]);
    resetRouter();
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }

  // 强制设置 cliklog 主题，确保所有页面都使用此主题
  setLayoutThemeColor("cliklog", false);

  return {
    body,
    dataTheme,
    overallStyle,
    layoutTheme,
    themeColors,
    onReset,
    toggleClass,
    dataThemeChange,
    setEpThemeColor,
    setLayoutThemeColor,
  };
}
