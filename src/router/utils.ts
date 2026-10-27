import { getConfig } from "@/config";
import website from "@/config/website";
import { type menuType, routerArrays } from "@/layout/types";
import { useMultiTagsStoreHook } from "@/store/modules/multiTags";
import { usePermissionStoreHook } from "@/store/modules/permission";
import { useUserStoreHook } from "@/store/modules/user";
import { buildHierarchyTree } from "@/utils/tree";
import {
  cloneDeep,
  intersection,
  isAllEmpty,
  storageLocal,
} from "@pureadmin/utils";
import { useTimeoutFn } from "@vueuse/core";
import { isProxy, toRaw } from "vue";
import {
  createWebHashHistory,
  createWebHistory,
  type RouteComponent,
  type RouteRecordRaw,
  type RouterHistory,
} from "vue-router";
import { filterEmptyPathRoutes } from "./emptyPathFilter";
import { router } from "./index";

const IFrame = () => import("@/layout/frameView.vue");
const Layout = () => import("@/layout/index.vue");
const Page404 = () => import("@/layout/error/404.vue");
// https://cn.vitejs.dev/guide/features.html#glob-import
const modulesRoutes = import.meta.glob("/src/views/**/*.{vue,tsx}");

// 动态路由
import { getAsyncRoutes } from "@/api/routes";

function handRank(routeInfo: any) {
  const { name, path, parentId, meta } = routeInfo;
  return isAllEmpty(parentId)
    ? !!(
        isAllEmpty(meta?.rank) ||
        (meta?.rank === 0 && name !== "Home" && path !== "/")
      )
    : false;
}

/** 按照路由中meta下的rank等级升序来排序路由 */
function ascending(arr: any[]) {
  arr.forEach((v, index) => {
    // 当rank不存在时，根据顺序自动创建，首页路由永远在第一位
    if (handRank(v) && v.meta) v.meta.rank = index + 2;
  });
  return arr.toSorted(
    (a: { meta: { rank: number } }, b: { meta: { rank: number } }) => {
      return a?.meta?.rank - b?.meta?.rank;
    },
  );
}

/** 过滤meta中showLink为false的菜单 */
function filterTree(data: RouteComponent[]) {
  const newTree = cloneDeep(data).filter(
    (v: { meta: { showLink: boolean } }) => v.meta?.showLink !== false,
  );
  newTree.forEach((v: { children }) => {
    if (v.children) {
      v.children = filterTree(v.children);
    }
  });
  return newTree;
}

/** 过滤children长度为0的的目录，当目录下没有菜单时，会过滤此目录，目录没有赋予roles权限，当目录下只要有一个菜单有显示权限，那么此目录就会显示 */
function filterChildrenTree(data: RouteComponent[]) {
  const newTree = cloneDeep(data).filter((v: any) => v?.children?.length);
  newTree.forEach((v: { children }) => {
    if (v.children) {
      v.children = filterTree(v.children);
    }
  });
  return newTree;
}

/** 判断两个数组彼此是否存在相同值 */
function isOneOfArray(a: Array<string>, b: Array<string>) {
  return Array.isArray(a) && Array.isArray(b)
    ? intersection(a, b).length > 0
    : true;
}

/** 从localStorage里取出当前登录用户的角色roles，过滤无权限的菜单 */
function filterNoPermissionTree(data: RouteComponent[]) {
  return filterChildrenTree(data);
}

/** 通过指定 `key` 获取父级路径集合，默认 `key` 为 `path` */
function getParentPaths(value: string, routes: RouteRecordRaw[], key = "path") {
  // 深度遍历查找
  function dfs(routes: RouteRecordRaw[], value: string, parents: string[]) {
    for (let i = 0; i < routes.length; i++) {
      const item = routes[i];
      // 返回父级path
      if (item[key] === value) return parents;
      // children不存在或为空则不递归
      if (!item.children || !item.children.length) continue;
      // 往下查找时将当前path入栈
      parents.push(item.path);

      if (dfs(item.children, value, parents).length) return parents;
      // 深度遍历查找未找到时当前path 出栈
      parents.pop();
    }
    // 未找到时返回空数组
    return [];
  }

  return dfs(routes, value, []);
}

/** 查找对应 `path` 的路由信息 */
function findRouteByPath(path: string, routes: RouteRecordRaw[]) {
  let res = routes.find((item: { path: string }) => item.path === path);
  if (res) {
    return isProxy(res) ? toRaw(res) : res;
  } else {
    for (let i = 0; i < routes.length; i++) {
      if (Array.isArray(routes[i].children) && routes[i].children.length > 0) {
        res = findRouteByPath(path, routes[i].children);
        if (res) {
          return isProxy(res) ? toRaw(res) : res;
        }
      }
    }
    return null;
  }
}

function addPathMatch() {
  if (!router.hasRoute("pathMatch")) {
    router.addRoute({
      path: "/:pathMatch(.*)",
      name: "pathMatch",
      redirect: "/error/404",
    });
  }
}

/** 判断是否为外链 */
function isURL(s) {
  return /^http[s]?:\/\/.*/.test(s);
}

//获取path中的参数
function parsePathParams(path: string) {
  const params = {};
  const questionMarkIndex = path.indexOf("?");

  if (questionMarkIndex !== -1) {
    const queryString = path.slice(questionMarkIndex + 1);
    const paramPairs = queryString.split("&");

    for (const pair of paramPairs) {
      const [key, value] = pair.split("=").map(decodeURIComponent);
      params[key] = value;
    }
  }
  return params;
}

//去掉path中的参数
function removePathParams(path: string) {
  return path.replace(/(\?|&)[^&]*$/, "");
}

/**
 * 修改菜单数据格式 - 处理
 * @param menus
 */
function formatMenuData(menus: any[]) {
  const propsDefault = website.menu;
  menus.map((item: any) => {
    item.children = item[propsDefault.children] || [];
    if (item.children && item.children.length > 0) {
      item.showParent = true;
      formatMenuData(item.children);
    }
    item.path = item[propsDefault.path];
    item.name = item[propsDefault.path].replace(/\//g, "");
    item.query = item[propsDefault.query];
    item.meta = item[propsDefault.meta];
    item.meta = {
      title: item[propsDefault.label],
      icon: item[propsDefault.icon],
      rank: item[propsDefault.sort],
      showLink: true,
    };
    // 「商品详情」是从商品列表进入的编辑页，不在侧栏显示
    if (item.id === "1918234193515667458") {
      item.meta.showLink = false;
    }
    // 国际化的key
    item.meta.title = item.label;
    if (item.type === 1) {
      // type 0:菜单 1:按钮
      item.meta.showLink = false;
    }
    item.auths = item[propsDefault.permission];
    if (isURL(item.path)) {
      item.component = IFrame;
      item.meta.keepAlive = false;
      item.meta.frameSrc = item.path;
      item.path = "/" + encodeURI(item.label);
    } else if (item.path.indexOf("/") === -1) {
      // 保证数据格式正确
      item.path = "/" + item.path;
      if (item.component.indexOf("/") === -1) {
        item.component = "/" + item.component;
      }
    }
  });
}

/**
 * 第一次处理
 * 格式化菜单路径path，把单独的菜单路径转换为带父级路径的菜单路径
 * path: /a/b/c
 */
function formatPath(ele: any, first?: boolean) {
  const propsDefault = website.menu;
  const icon = ele[propsDefault.icon];
  ele[propsDefault.icon] = !icon ? propsDefault.iconDefault : icon;
  ele.meta = ele.meta || {};
  const isChild = !!(
    ele[propsDefault.children] && ele[propsDefault.children].length !== 0
  );
  if (!isChild && first) {
    if (isURL(ele[propsDefault.href])) {
      const href = ele[propsDefault.href];
      ele.component = IFrame;
      ele.meta.frameSrc = href;
    }
  } else {
    const data = ele[propsDefault.children];
    if (data?.length) {
      data.forEach((child) => {
        if (isURL(child[propsDefault.href])) {
          const href = child[propsDefault.href];
          ele.component = IFrame;
          ele.meta.frameSrc = href;
        } else {
          // 修复路径中的双斜杠问题，同时避免破坏 URL 协议（如 http://）
          const mergedPath = `${ele[propsDefault.path]}/${child[propsDefault.path]}`;
          child[propsDefault.path] = isURL(mergedPath)
            ? mergedPath
            : mergedPath.replace(/\/+/g, "/");

          const query = parsePathParams(child[propsDefault.path]);
          if (query) {
            child[propsDefault.query] = query;
            // 去掉path中的参数，保证path的正确性
            child[propsDefault.path] = removePathParams(
              child[propsDefault.path],
            );
          }
          formatPath(child);
        }
      });
    }
  }
}

/** 规范化后端返回的菜单路由 */
export function sanitizeAsyncRoutes(routeList: any[]) {
  // 先剔空 path，再拼路径 —— 顺序不能反，理由见 filterEmptyPathRoutes 注释
  const cleaned = filterEmptyPathRoutes(
    routeList,
    website.menu.path,
    website.menu.label,
  );
  cleaned.forEach((ele) => formatPath(ele, true));
  formatMenuData(cleaned);
  return cleaned;
}

/** 处理动态路由（后端返回的路由） */
function handleAsyncRoutes(routeList) {
  const sanitizedRoutes =
    routeList.length === 0 ? [] : sanitizeAsyncRoutes(routeList);
  if (sanitizedRoutes.length === 0) {
    usePermissionStoreHook().handleWholeMenus(sanitizedRoutes);
  } else {
    formatFlatteningRoutes(addAsyncRoutes(sanitizedRoutes)).map(
      (v: RouteRecordRaw) => {
        // 防止重复添加路由
        if (
          router.options.routes[0].children.findIndex(
            (value) => value.path === v.path,
          ) !== -1
        ) {
          return;
        } else {
          // 切记将路由push到routes后还需要使用addRoute，这样路由才能正常跳转
          if (router.options.routes[0].children) {
            router.options.routes[0].children.push(v);
            // 最终路由进行升序
            ascending(router.options.routes[0].children);
            if (!router.hasRoute(v?.name)) router.addRoute(v);
            const flattenRouters: any = router
              .getRoutes()
              .find((n) => n.path === "/");
            router.addRoute(flattenRouters);
          }
        }
      },
    );
    usePermissionStoreHook().handleWholeMenus(sanitizedRoutes);
  }
  if (!useMultiTagsStoreHook().getMultiTagsCache) {
    useMultiTagsStoreHook().handleTags("equal", [
      ...routerArrays,
      ...usePermissionStoreHook().flatteningRoutes.filter(
        (v) => v?.meta?.fixedTag,
      ),
    ]);
  }
  addPathMatch();
  return sanitizedRoutes;
}

/** 初始化路由（`new Promise` 写法防止在异步请求中造成无限循环）*/
function initRouter() {
  const key = "async-routes";
  if (getConfig()?.CachingAsyncRoutes) {
    // 开启动态路由缓存本地localStorage
    const asyncRouteList = storageLocal().getItem(key) as any;
    if (asyncRouteList && asyncRouteList?.length > 0) {
      return new Promise((resolve) => {
        const sanitized = handleAsyncRoutes(asyncRouteList);
        storageLocal().setItem(key, sanitized);
        resolve(router);
      });
    }
  }
  return new Promise((resolve) => {
    useUserStoreHook()
      .setUserInfoAction()
      .then(() => {
        getAsyncRoutes()
          .then((res) => {
            if (res.data) {
              const sanitized = handleAsyncRoutes(cloneDeep(res.data));
              storageLocal().setItem(key, sanitized);
            } else {
              handleAsyncRoutes([]);
            }
            resolve(router);
          })
          .catch(() => {
            resolve(router);
          });
      })
      .catch(() => {
        resolve(router);
      });
  });
}

/**
 * 将多级嵌套路由处理成一维数组
 * @param routesList 传入路由
 * @returns 返回处理后的一维路由
 */
function formatFlatteningRoutes(routesList: RouteRecordRaw[]) {
  if (routesList.length === 0) return routesList;
  let hierarchyList = buildHierarchyTree(routesList);
  for (let i = 0; i < hierarchyList.length; i++) {
    if (hierarchyList[i].children) {
      hierarchyList = hierarchyList
        .slice(0, i + 1)
        .concat(hierarchyList[i].children, hierarchyList.slice(i + 1));
    }
  }
  return hierarchyList;
}

/**
 * 一维数组处理成多级嵌套数组（三级及以上的路由全部拍成二级，keep-alive 只支持到二级缓存）
 * https://github.com/pure-admin/vue-pure-admin/issues/67
 * @param routesList 处理后的一维路由菜单数组
 * @returns 返回将一维数组重新处理成规定路由的格式
 */
function formatTwoStageRoutes(routesList: RouteRecordRaw[]) {
  if (routesList.length === 0) return routesList;
  const newRoutesList: RouteRecordRaw[] = [];
  routesList.forEach((v: RouteRecordRaw) => {
    if (v.path === "/") {
      newRoutesList.push({
        component: v.component,
        name: v.name,
        path: v.path,
        redirect: v.redirect,
        meta: v.meta,
        children: [],
      });
    } else {
      newRoutesList[0]?.children.push({ ...v });
    }
  });
  return newRoutesList;
}

/** 处理缓存路由（添加、删除、刷新） */
function handleAliveRoute({ name }: ToRouteType, mode?: string) {
  switch (mode) {
    case "add":
      usePermissionStoreHook().cacheOperate({
        mode: "add",
        name,
      });
      break;
    case "delete":
      usePermissionStoreHook().cacheOperate({
        mode: "delete",
        name,
      });
      break;
    case "refresh":
      usePermissionStoreHook().cacheOperate({
        mode: "refresh",
        name,
      });
      break;
    default:
      usePermissionStoreHook().cacheOperate({
        mode: "delete",
        name,
      });
      useTimeoutFn(() => {
        usePermissionStoreHook().cacheOperate({
          mode: "add",
          name,
        });
      }, 100);
  }
}

/** 过滤后端传来的动态路由 重新生成规范路由 */
function addAsyncRoutes(arrRoutes: any[]) {
  if (!arrRoutes || !arrRoutes.length) return;
  const modulesRoutesKeys = Object.keys(modulesRoutes);
  arrRoutes.forEach((v: any) => {
    // 将backstage属性加入meta，标识此路由为后端返回路由
    v.meta.backstage = true;
    // 父级的redirect属性取值：如果子级存在且父级的redirect属性不存在，默认取第一个子级的path；如果子级存在且父级的redirect属性存在，取存在的redirect属性，会覆盖默认值
    if (v?.children?.length && !v.redirect) v.redirect = v.children[0].path;
    // 父级的name属性取值：如果子级存在且父级的name属性不存在，默认取第一个子级的name；如果子级存在且父级的name属性存在，取存在的name属性，会覆盖默认值（注意：测试中发现父级的name不能和子级name重复，如果重复会造成重定向无效（跳转404），所以这里给父级的name起名的时候后面会自动加上`Parent`，避免重复）
    if (v?.children?.length && !v.name)
      v.name = (v.children[0].name as string) + "Parent";
    if (v.meta?.frameSrc) {
      v.component = IFrame;
    } else {
      // 对后端传component组件路径和不传做兼容（如果后端传component组件路径，那么path可以随便写，如果不传，component组件路径会跟path保持一致）
      const index = v?.component
        ? modulesRoutesKeys.findIndex((ev) => ev.includes(v.component as any))
        : modulesRoutesKeys.findIndex((ev) => ev.includes(v.path));

      const componentLoader = modulesRoutes[modulesRoutesKeys[index]] as any;

      if (typeof v.component === "string" && v.component === "Layout") {
        v.component = Layout;
      } else if (componentLoader) {
        // 强制组件名称与路由名称一致，解决 KeepAlive 缓存问题
        v.component = () =>
          componentLoader().then((module: any) => {
            const component = module.default || module;
            // 使用 Object.assign 确保 name 属性被正确设置，避免 defineComponent 引用错误
            return {
              ...component,
              name: v.name,
            };
          });
      } else if (
        typeof v.component === "string" &&
        (v.component.includes("frameView.vue") ||
          v.component.includes("iframe/index"))
      ) {
        // 特殊处理 /src/layout/frameView.vue 和 iframe 相关组件
        v.component = IFrame;
      } else {
        v.component = Page404;
      }
    }
    if (v?.children?.length) {
      addAsyncRoutes(v.children);
    }
  });
  return arrRoutes;
}

/** 获取路由历史模式 https://next.router.vuejs.org/zh/guide/essentials/history-mode.html */
function getHistoryMode(routerHistory): RouterHistory {
  // len为1 代表只有历史模式 为2 代表历史模式中存在base参数 https://next.router.vuejs.org/zh/api/#%E5%8F%82%E6%95%B0-1
  const historyMode = routerHistory.split(",");
  const leftMode = historyMode[0];
  const rightMode = historyMode[1];
  // no param
  if (historyMode.length === 1) {
    if (leftMode === "hash") {
      return createWebHashHistory("");
    } else if (leftMode === "h5") {
      return createWebHistory("");
    }
  } //has param
  else if (historyMode.length === 2) {
    if (leftMode === "hash") {
      return createWebHashHistory(rightMode);
    } else if (leftMode === "h5") {
      return createWebHistory(rightMode);
    }
  }
}

function handleTopMenu() {
  // 查找第一个页面的路径
  const route = {
    path: "/404",
    name: "",
    query: undefined,
    value: undefined,
    meta: {},
  } as menuType;
  const wholeMenus = usePermissionStoreHook().wholeMenus;
  if (wholeMenus && wholeMenus.length > 0) {
    const firstPage = wholeMenus[0];
    if (firstPage) {
      route.path = firstPage.redirect || firstPage.path;
      route.name = firstPage.name;
      route.meta = firstPage.meta;
      route.query = firstPage.query;
    }
  }
  return route;
}

/** 获取所有菜单中的第一个菜单（顶级菜单）*/
function getTopMenu(tag = false): menuType {
  const topMenu = handleTopMenu();
  if (tag) pushTag(topMenu.path);
  return topMenu;
}
function pushTag(pagePath: string) {
  const firstPageRoute = findRouteByPathRedirect(
    pagePath,
    usePermissionStoreHook().wholeMenus,
  );
  if (firstPageRoute)
    useMultiTagsStoreHook().handleTags("push", {
      query: firstPageRoute.query,
      path: firstPageRoute.path,
      name: firstPageRoute.name,
      meta: firstPageRoute.meta,
    });
}
/**
 * 打开第一个页面
 */
function goFirstPage(tag?) {
  // 查找第一个页面的路径
  const firstPagePath = getTopMenu(tag).path;
  if (firstPagePath) {
    router.push(firstPagePath);
  } else {
    router.push("/404");
  }
}
/**
 * 查找页面地址的真正 route， redirect转发的也能找到
 * @param path
 * @param routes
 */
function findRouteByPathRedirect(path, routes) {
  let pagePathRoute = null;
  do {
    pagePathRoute = findRouteByPath(path, routes);
    path =
      pagePathRoute && pagePathRoute.redirect !== pagePathRoute.path
        ? pagePathRoute.redirect
        : path;
    routes = pagePathRoute?.children;
  } while (
    pagePathRoute?.redirect &&
    pagePathRoute.redirect !== pagePathRoute.path &&
    pagePathRoute.children
  );
  return pagePathRoute;
}

export {
  addAsyncRoutes,
  addPathMatch,
  ascending,
  filterNoPermissionTree,
  filterTree,
  findRouteByPath,
  formatFlatteningRoutes,
  formatTwoStageRoutes,
  getHistoryMode,
  getParentPaths,
  getTopMenu,
  goFirstPage,
  handleAliveRoute,
  initRouter,
  isOneOfArray,
};
