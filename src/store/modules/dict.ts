/**
 * 字典数据缓存 Store
 * 用于缓存字典数据，避免重复请求
 */
import { defineStore } from "pinia";
import { store } from "../index";
// 必须用裸 HTTP 的 fetchDictType，不能用 remote()：remote() 就是转发到本 store 的
// 缓存入口，回调它会造成自委派死循环（详见 api/upms/dict.ts 注释）。
import { fetchDictType } from "@/api/upms/dict";

/**
 * 交出缓存副本，绝不交出缓存对象本体。
 * 消费方确实存在直接往字典项上写字段的用法（wxmp/wxautoreply 会写 item.disabled），
 * 若交出本体，这些写入会永久污染全局缓存并跨页传染。
 * 字典项是扁平对象，浅拷贝每一项即可。
 */
function cloneDict(list: any[] | undefined): any[] {
  return (list || []).map((item) =>
    item && typeof item === "object" ? { ...item } : item,
  );
}

export const useDictStore = defineStore({
  id: "pure-dict",
  state: () => ({
    // 字典数据缓存，key 为字典类型，value 为字典数据
    dictCache: new Map<string, any[]>(),
    // 加载中的字典类型
    loadingDicts: new Set<string>(),
  }),
  getters: {
    /**
     * 获取字典数据
     * @param state
     * @returns 返回获取字典数据的函数
     */
    getDict: (state) => {
      return (type: string) => {
        return state.dictCache.get(type) || [];
      };
    },
    /**
     * 检查字典是否已加载
     * @param state
     * @returns 返回检查函数
     */
    hasDict: (state) => {
      return (type: string) => {
        return state.dictCache.has(type);
      };
    },
  },
  actions: {
    /**
     * 获取字典数据（带缓存）
     * @param type 字典类型
     * @param forceRefresh 是否强制刷新
     * @returns Promise<any[]>
     */
    async fetchDict(type: string, forceRefresh = false): Promise<any[]> {
      // 如果已缓存且不强制刷新，直接返回缓存数据
      if (!forceRefresh && this.dictCache.has(type)) {
        return cloneDict(this.dictCache.get(type));
      }

      // forceRefresh 必须先于 in-flight 判断：否则强制刷新撞上一个正在进行的普通
      // 加载时，会被下面的等待分支接管并返回旧值，等于没刷新
      if (forceRefresh) {
        this.loadingDicts.delete(type);
      } else if (this.loadingDicts.has(type)) {
        // 等待加载完成（轮询检查）
        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            // 只等「加载结束」，不要求 dictCache 一定有值：
            // 请求失败时不会写缓存，若还要求 has(type) 会一直空转到 5s 超时
            if (!this.loadingDicts.has(type)) {
              clearInterval(checkInterval);
              resolve(cloneDict(this.dictCache.get(type)));
            }
          }, 50);
          // 超时保护（5秒）
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve([]);
          }, 5000);
        });
      }

      // 开始加载
      this.loadingDicts.add(type);
      try {
        const response = await fetchDictType(type);
        const dictData = response?.data || [];
        // 缓存数据
        this.dictCache.set(type, dictData);
        return cloneDict(dictData);
      } catch (error) {
        console.error(`加载字典数据失败 [${type}]:`, error);
        return [];
      } finally {
        // 移除加载中标记
        this.loadingDicts.delete(type);
      }
    },
    /**
     * 清除指定字典类型的缓存
     * @param type 字典类型，如果不传则清除所有缓存
     */
    clearCache(type?: string) {
      if (type) {
        this.dictCache.delete(type);
      } else {
        this.dictCache.clear();
      }
    },
    /**
     * 预加载常用字典数据
     */
    async preloadCommonDicts() {
      const commonTypes = ["product_category"];
      await Promise.all(
        commonTypes.map((type) => this.fetchDict(type))
      );
    },
  },
});

export function useDictStoreHook() {
  return useDictStore(store);
}
