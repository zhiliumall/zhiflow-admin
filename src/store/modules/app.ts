import { defineStore } from "pinia";
import {
  type appType,
  store,
  getConfig,
  storageLocal,
  deviceDetection,
  responsiveStorageNameSpace,
} from "../utils";

export const useAppStore = defineStore({
  id: "pure-app",
  state: (): appType => ({
    sidebar: {
      opened:
        storageLocal().getItem<StorageConfigs>(
          `${responsiveStorageNameSpace()}layout`,
        )?.sidebarStatus ?? getConfig().SidebarStatus,
      withoutAnimation: false,
      isClickCollapse: false,
    },
    // 这里的layout用于监听容器拖拉后恢复对应的导航模式
    layout:
      storageLocal().getItem<StorageConfigs>(
        `${responsiveStorageNameSpace()}layout`,
      )?.layout ?? getConfig().Layout,
    // 侧栏二级栏紧凑图标栏模式：默认 true（紧凑），持久化在 layout storage
    sidebarCompact:
      storageLocal().getItem<StorageConfigs>(
        `${responsiveStorageNameSpace()}layout`,
      )?.sidebarCompact ?? true,
    device: deviceDetection() ? "mobile" : "desktop",
    // 浏览器窗口的可视区域大小
    viewportSize: {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    },
    sortSwap: null as any,
    sidebarPreviewPath: null,
  }),
  getters: {
    getSidebarStatus(state) {
      return state.sidebar.opened;
    },
    getSidebarCompact(state) {
      return state.sidebarCompact;
    },
    getSidebarPreviewPath(state) {
      return state.sidebarPreviewPath;
    },
    getDevice(state) {
      return state.device;
    },
    getViewportWidth(state) {
      return state.viewportSize.width;
    },
    getViewportHeight(state) {
      return state.viewportSize.height;
    },
  },
  actions: {
    TOGGLE_SIDEBAR(opened?: boolean, resize?: string) {
      const layout = storageLocal().getItem<StorageConfigs>(
        `${responsiveStorageNameSpace()}layout`,
      );
      if (opened && resize) {
        this.sidebar.withoutAnimation = true;
        this.sidebar.opened = true;
        layout.sidebarStatus = true;
      } else if (!opened && resize) {
        this.sidebar.withoutAnimation = true;
        this.sidebar.opened = false;
        layout.sidebarStatus = false;
      } else if (!opened && !resize) {
        this.sidebar.withoutAnimation = false;
        this.sidebar.opened = !this.sidebar.opened;
        this.sidebar.isClickCollapse = !this.sidebar.opened;
        layout.sidebarStatus = this.sidebar.opened;
      }
      storageLocal().setItem(`${responsiveStorageNameSpace()}layout`, layout);
    },
    async toggleSideBar(opened?: boolean, resize?: string) {
      await this.TOGGLE_SIDEBAR(opened, resize);
    },
    /** 切换侧栏二级栏 紧凑 ⇄ 展开，并持久化到 layout storage */
    toggleSidebarCompact(value?: boolean) {
      this.sidebarCompact =
        typeof value === "boolean" ? value : !this.sidebarCompact;
      const layout =
        storageLocal().getItem<StorageConfigs>(
          `${responsiveStorageNameSpace()}layout`,
        ) ?? ({} as StorageConfigs);
      layout.sidebarCompact = this.sidebarCompact;
      storageLocal().setItem(`${responsiveStorageNameSpace()}layout`, layout);
    },
    toggleDevice(device: string) {
      this.device = device;
    },
    setLayout(layout) {
      this.layout = layout;
    },
    setViewportSize(size) {
      this.viewportSize = size;
    },
    setSortSwap(val) {
      this.sortSwap = val;
    },
    setSidebarPreviewPath(path: string | null) {
      this.sidebarPreviewPath = path;
    },
  },
});

export function useAppStoreHook() {
  return useAppStore(store);
}
