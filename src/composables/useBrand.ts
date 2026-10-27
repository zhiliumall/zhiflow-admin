/**
 * 品牌统一取值入口。
 *
 * 登录前（登录页）只用静态品牌「智流商城」；登录后读「系统管理 › 商城设置」里的商城名称与 logo，
 * 取不到时回落到静态品牌。整个会话只请求一次。
 */
import { getObj as getShopInfo } from "@/api/mall/shopinfo";
import { getToken } from "@/utils/auth";
import { computed, ref } from "vue";

/** 默认店铺 id（单店铺，后端基线固定为 1） */
export const DEFAULT_SHOP_ID = "1";

export const BRAND = {
  name: "智流商城",
  nameEn: "ZhiFlow",
};

const state = ref({ name: "", logo: "" });
let loader: Promise<void> | null = null;

function load(): Promise<void> {
  if (loader) return loader;
  if (!getToken()?.access_token) return Promise.resolve();
  loader = getShopInfo(DEFAULT_SHOP_ID)
    .then((res: any) => {
      const d = res?.data;
      state.value = { name: d?.name || "", logo: d?.imgUrl || "" };
    })
    .catch(() => {
      // 取不到就用静态品牌，不能因为品牌取值失败影响页面
    });
  return loader;
}

export function useBrand(options?: { anonymous?: boolean }) {
  if (!options?.anonymous) load();
  const name = computed(() => (options?.anonymous ? "" : state.value.name) || BRAND.name);
  const logo = computed(() => (options?.anonymous ? "" : state.value.logo));
  return {
    name,
    logo,
    info: computed(() => ({ name: name.value, logo: logo.value })),
  };
}

/** 非组件上下文（如 document.title）用的同步取值 */
export function currentBrandName(): string {
  return state.value.name || BRAND.name;
}

/** 修改商城设置后重新拉取 */
export function refreshBrand(): Promise<void> {
  loader = null;
  return load();
}
