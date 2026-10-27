import { CHUNK_RELOAD_KEY } from "@/utils/storageKeys";
import website from "@/config/website";
import { useI18n } from "@/locales/setupI18n";
import { useMultiTagsStoreHook } from "@/store/modules/multiTags";
import { usePermissionStoreHook } from "@/store/modules/permission";
import type { LoginInfo } from "@/utils/auth";
import { CACHE_KEY, removeToken } from "@/utils/auth";
import { loadIconfontsForRoute } from "@/utils/iconfont";
import NProgress from "@/utils/progress";
import { buildHierarchyTree } from "@/utils/tree";
import { isUrl, openLink, storageLocal } from "@pureadmin/utils";
import Cookies from "js-cookie";
import {
  createRouter,
  type RouteComponent,
  type RouteRecordRaw,
  type Router,
} from "vue-router";
import remainingRouter from "./modules/remaining";
import {
  ascending,
  findRouteByPath,
  formatFlatteningRoutes,
  formatTwoStageRoutes,
  getHistoryMode,
  getTopMenu,
  goFirstPage,
  handleAliveRoute,
  initRouter,
} from "./utils";

/** 自动导入全部静态路由，无需再手动引入！匹配 src/router/modules 目录（任何嵌套级别）中具有 .ts 扩展名的所有文件，除了 remaining.ts 文件
 * 如何匹配所有文件请看：https://github.com/mrmlnc/fast-glob#basic-syntax
 * 如何排除文件请看：https://cn.vitejs.dev/guide/features.html#negative-patterns
 */
const modules: Record<string, any> = import.meta.glob(
  ["./modules/**/*.ts", "!./modules/**/remaining.ts"],
  {
    eager: true,
  },
);

/** 原始静态路由（未做任何处理） */
const routes = [];

Object.keys(modules).forEach((key) => {
  routes.push(modules[key].default);
});

/** 导出处理后的静态路由（三级及以上的路由全部拍成二级） */
export const constantRoutes: Array<RouteRecordRaw> = formatTwoStageRoutes(
  formatFlatteningRoutes(buildHierarchyTree(ascending(routes.flat(Infinity)))),
);

/** 用于渲染菜单，保持原始层级 */
export const constantMenus: Array<RouteComponent> = ascending(
  routes.flat(Infinity),
).concat(...remainingRouter);

/** 不参与菜单的路由 */
export const remainingPaths = Object.keys(remainingRouter).map((v) => {
  return remainingRouter[v].path;
});

/** 创建路由实例 */
export const router: Router = createRouter({
  history: getHistoryMode(import.meta.env.VITE_ROUTER_HISTORY),
  routes: constantRoutes.concat(...(remainingRouter as any)),
  strict: true,
  scrollBehavior(to, from, savedPosition) {
    return new Promise((resolve) => {
      if (savedPosition) {
        return savedPosition;
      } else {
        if (from.meta.saveSrollTop) {
          const top: number =
            document.documentElement.scrollTop || document.body.scrollTop;
          resolve({ left: 0, top });
        }
      }
    });
  },
});

/** 重置路由 */
export function resetRouter() {
  router.getRoutes().forEach((route) => {
    const { name, meta } = route;
    if (name && router.hasRoute(name) && meta?.backstage) {
      router.removeRoute(name);
      router.options.routes = formatTwoStageRoutes(
        formatFlatteningRoutes(
          buildHierarchyTree(ascending(routes.flat(Infinity))),
        ),
      );
    }
  });
  usePermissionStoreHook().clearAllCachePage();
}

/** 路由白名单 */
const whiteList = website.whiteList;

const { VITE_HIDE_HOME } = import.meta.env;

router.beforeEach((to: ToRouteType, _from, next) => {
  if (to.meta?.keepAlive) {
    handleAliveRoute(to, "add");
    // 页面整体刷新和点击标签页刷新
    if (_from.name === undefined || _from.name === "Redirect") {
      handleAliveRoute(to);
    }
  }
  const userInfo = storageLocal().getItem<LoginInfo>(CACHE_KEY.SESSION);
  NProgress.start();
  const { $t } = useI18n();
  const externalLink = isUrl(to?.name as string);
  if (!externalLink) {
    to.matched.some((item) => {
      if (!item.meta.title) return "";
      const key = item.meta.title as string;
      document.title = $t(key);
    });
  }

  /** 如果已经登录并存在登录信息后不能跳转到路由白名单，而是继续保持在当前页面 */
  function toCorrectRoute() {
    next(whiteList.includes(to.fullPath) ? _from.fullPath : undefined);
  }
  if (Cookies.get(CACHE_KEY.MULTIPLE_TABS_KEY) && userInfo) {
    // 无权限跳转403页面
    // if (to.meta?.roles && !isOneOfArray(to.meta?.roles, userInfo?.roles)) {
    //   next({ path: "/error/403" });
    // }
    // 开启隐藏首页后在浏览器地址栏手动输入首页welcome路由则跳转到404页面
    if (VITE_HIDE_HOME === "true" && to.fullPath === "/welcome") {
      next({ path: "/error/404" });
    }
    if (_from?.name) {
      // name为超链接
      if (externalLink) {
        openLink(to?.name as string);
        NProgress.done();
      } else {
        toCorrectRoute();
      }
    } else {
      // 刷新
      if (
        usePermissionStoreHook().wholeMenus.length === 0 &&
        to.path !== "/login" &&
        whiteList.indexOf(to.path) === -1
      ) {
        initRouter()
          .then((router: Router) => {
            if (usePermissionStoreHook().wholeMenus.length === 0) {
              removeToken();
              next({ path: "/login" });
              return;
            }
            // 把首页的标签加上tags
            getTopMenu(true);
            const { path } = to;
            if (!to.fullPath || to.fullPath === "/") {
              goFirstPage(true);
            } else if (!useMultiTagsStoreHook().getMultiTagsCache) {
              if (!to.fullPath || to.fullPath === "/") {
                goFirstPage(true);
              } else {
                const route = findRouteByPath(
                  path,
                  router.options.routes as any,
                );
                router.push(to.fullPath);
                // query、params模式路由传参数的标签页不在此处处理
                if (route?.meta?.title) {
                  useMultiTagsStoreHook().handleTags("push", {
                    query: route.query,
                    path: route.path,
                    name: route.name,
                    meta: route.meta,
                  });
                }
              }
            } else {
              router.push(to.fullPath);
            }
          })
          .catch(() => {
            removeToken();
            next({ path: "/login" });
          });
          return; // Prevent falling through to toCorrectRoute
      }

      toCorrectRoute();
    }
  } else {
    if (to.path !== "/login") {
      if (whiteList.indexOf(to.path) !== -1) {
        next();
      } else {
        removeToken();
        next({ path: "/login" });
      }
    } else {
      next();
    }
  }
});

/**
 * 懒加载 chunk 取不到时自动恢复。
 *
 * 为什么需要：前端每次部署都会换掉带 hash 的 chunk 文件名并删掉旧文件。已经开着后台的
 * 标签页，其路由表里记的还是旧文件名 —— 点菜单时 `import()` 拿不到文件就 reject，
 * 而这条 reject 之前没人接：侧边栏还在、内容区却永久空白、后续切菜单也不再发任何请求。
 * 用户感受是「点了没反应 / 特别慢」，实际是坏了。若 nginx 把旧 chunk fallback 成
 * index.html 返回 200，浏览器会因 MIME 不符报错，建议静态资源目录缺文件时直接返回 404。
 *
 * 处置：整页 reload 一次即可拿到新版本的路由表与 chunk。
 *
 * 防死循环：只在「距上次自动刷新超过 RELOAD_GUARD_MS」时才刷。若刷完仍失败（例如新版本
 * 本身就有问题），第二次不再刷，把错误留在控制台，避免无限刷新把人锁在白屏里。
 */
const RELOAD_GUARD_MS = 30_000;

router.onError((error) => {
  const message = String((error as Error)?.message ?? error);
  // 各浏览器文案不同：Chrome/Edge 是 Failed to fetch dynamically imported module，
  // Safari 是 Importing a module script failed，Firefox 是 error loading dynamically imported module
  const isChunkLoadFailure =
    /failed to fetch dynamically imported module/i.test(message) ||
    /importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message);
  if (!isChunkLoadFailure) return;

  let lastReloadAt = 0;
  try {
    lastReloadAt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0);
  } catch {
    // 隐私模式下 sessionStorage 可能抛异常：降级为「没刷过」，最多多刷一次
  }
  if (Date.now() - lastReloadAt < RELOAD_GUARD_MS) {
    console.error("[router] chunk 加载失败，且刚刚已自动刷新过，不再重试：", message);
    return;
  }
  try {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    /* 同上，存不下就算了 */
  }
  console.warn("[router] 检测到新版本已发布（chunk 已失效），正在刷新页面…");
  NProgress.done();
  location.reload();
});

router.afterEach((to) => {
  NProgress.done();

  // 登录成功后，异步加载业务图标（避免登录页加载）
  // 检查是否已登录（不在登录页且不在白名单中）
  const userInfo = storageLocal().getItem<LoginInfo>(CACHE_KEY.SESSION);
  if (userInfo && to.path !== '/login' && !website.whiteList.includes(to.path)) {
    // 动态导入并加载业务图标（只加载一次，避免重复加载）
    import('@/utils/iconfont').then(({ preloadBusinessIconfonts, isIconfontLoaded }) => {
      // 检查业务图标是否已加载，避免重复加载
      if (!isIconfontLoaded('ic') || !isIconfontLoaded('menu')) {
        preloadBusinessIconfonts();
      }
    });
  }
  // 根据路由智能加载对应的图标包
  loadIconfontsForRoute(to.path);
});

export default router;
