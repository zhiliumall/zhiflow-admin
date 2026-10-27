import { computed, reactive } from "vue";
import { getHomepageOverview, type HomepageOverview } from "@/api/mall/largescreen";
import { useUserStoreHook } from "@/store/modules/user";

const state = reactive<{
  data: HomepageOverview | null;
  loading: boolean;
  error: unknown | null;
  updatedAt: Date | null;
}>({ data: null, loading: false, error: null, updatedAt: null });

let scopeKey = "";
let inFlight: { key: string; promise: Promise<HomepageOverview | null> } | null = null;

/** 以登录用户区分缓存：换账号登录后丢弃上一个账号的数据和在途响应 */
function fingerprint() {
  const user = useUserStoreHook().userInfo as Record<string, unknown>;
  return String(user?.id ?? "");
}

async function load() {
  const key = fingerprint();
  if (scopeKey !== key) {
    scopeKey = key;
    state.data = null;
    state.error = null;
    state.updatedAt = null;
  }
  if (inFlight?.key === key) return inFlight.promise;

  state.loading = true;
  state.error = null;
  let request: Promise<HomepageOverview | null>;
  request = getHomepageOverview()
    .then(response => {
      if (scopeKey === key) {
        state.data = response.data;
        state.updatedAt = new Date();
      }
      return response.data;
    })
    .catch(error => {
      if (scopeKey === key) state.error = error;
      return null;
    })
    .finally(() => {
      if (inFlight?.promise === request) {
        inFlight = null;
        state.loading = false;
      }
    });
  inFlight = { key, promise: request };
  return request;
}

export function useHomepageOverview() {
  return {
    state,
    data: computed(() => state.data),
    loading: computed(() => state.loading),
    error: computed(() => state.error),
    updatedAt: computed(() => state.updatedAt),
    load,
    refresh: load,
  };
}
