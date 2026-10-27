// 使用 axios 官方模块入口
import website from "@/config/website";
import errorCode from "@/const/errorCode";
import { useI18n } from "@/locales/setupI18n";
import { useUserStoreHook } from "@/store/modules/user";
import { formatToken, getToken, getUserInfo } from "@/utils/auth";
import { message } from "@/utils/message";
import Axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type CustomParamsSerializer,
} from "axios";
import { stringify } from "qs";
import NProgress from "../progress";
import {
  ensureTraceparent,
  rememberFailedTrace,
  resolveTraceId,
} from "./traceparent";
import type {
  PureHttpError,
  PureHttpRequestConfig,
  PureHttpResponse,
  RequestMethods,
} from "./types.d";
// 相关配置请参考：www.axios-js.com/zh-cn/docs/#axios-request-config-1
const defaultConfig: AxiosRequestConfig = {
  // 后端地址前缀：留空表示与后台同源（开发时由 vite 代理转发，部署时由 nginx 反代）
  baseURL: import.meta.env.VITE_API_BASE || "",
  // 请求超时时间
  timeout: website.timeout,
  headers: {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  // 数组格式参数序列化（https://github.com/axios/axios/issues/5142）
  paramsSerializer: {
    serialize: stringify as unknown as CustomParamsSerializer,
  },
};

/** 认证无法续期：调用方应结束实时通道，不能再按网络故障重试。 */
export class AccessTokenSessionError extends Error {}

/** 会话已改变：取消旧工作，但不能登出新的会话。 */
export class AccessTokenContextChangedError extends Error {}

class PureHttp {
  constructor() {
    this.httpInterceptorsRequest();
    this.httpInterceptorsResponse();
  }

  /** HTTP 与 SSE 共用的单飞刷新；失效时立即结算所有等待者。 */
  private static tokenRefresh: {
    promise: Promise<string>;
    isCurrent: () => boolean;
    isResponseCurrent: () => boolean;
    reject: (error: unknown) => void;
  } | null = null;

  private static sessionGeneration = 0;

  /** 在 user action 的 setToken 之前拒绝旧会话的刷新响应。 */
  private static refreshResponseGuards = new WeakMap<
    PureHttpRequestConfig,
    () => boolean
  >();

  /** 刷新token失败次数 */
  private static refreshFailedCount = 0;

  /** 最大刷新重试次数 */
  private static maxRefreshRetries = 1;

  /** 是否正在登出中，防止重复登出 */
  private static isLoggingOut = false;

  /** 初始化配置对象 */
  private static initConfig: PureHttpRequestConfig = {};

  /** 保存当前`Axios`实例对象 */
  private static axiosInstance: AxiosInstance = Axios.create(defaultConfig);

  /** 请求去重：存储正在进行的请求，key 为请求唯一标识，value 为 { promise, controller } */
  private static pendingRequests = new Map<
    string,
    { promise: Promise<any>; controller: AbortController }
  >();

  /**
   * 语义上是「查询」但用了 POST 的接口 —— 一并纳入 in-flight 去重。
   *
   * 判定标准很严：**必须是纯读、无任何副作用**，仅仅因为入参是数组/复杂对象才用 POST。
   * 往这里加东西前先打开后端方法确认它不写库，否则会把「两次提交」合并成一次。
   */
  private static dedupePostPatterns = [
    /^\/mall\/goodsspu\/listbyids/, // 批量按 id 查商品
    /^\/mall\/userinfo\/batch/, // 批量按 id 查用户
  ];

  /** 明确不参与去重的路径（「GET 但有副作用」的接口在修好之前先登记在这里） */
  private static dedupeExcludePatterns: RegExp[] = [];

  /** 支持 HTTP Etag 缓存的接口路径 */
  private static etagCacheUrlPatterns = [
    /^\/mall\/goodscategory\/tree/,
  ];

  /** 获取缓存的 Etag 值 */
  private static getCachedEtag(url: string): string | null {
    try {
      const key = `http_etag_${url}`;
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /** 保存 Etag 值到缓存 */
  private static setCachedEtag(url: string, etag: string): void {
    try {
      const key = `http_etag_${url}`;
      sessionStorage.setItem(key, etag);
    } catch {
      // 忽略存储错误（如存储空间不足）
    }
  }

  /** 清除缓存的 Etag 值 */
  private static clearCachedEtag(url: string): void {
    try {
      const key = `http_etag_${url}`;
      sessionStorage.removeItem(key);
    } catch {
      // 忽略清除错误
    }
  }

  /** 判断接口是否支持 Etag 缓存 */
  private static shouldUseEtagCache(config: PureHttpRequestConfig): boolean {
    const url = config.url || "";
    return PureHttp.etagCacheUrlPatterns.some((pattern) => {
      if (pattern instanceof RegExp) {
        return pattern.test(url);
      }
      return url.includes(pattern);
    });
  }

  /** 生成请求唯一标识（Method + URL + Params + Data） */
  private static generateRequestKey(config: PureHttpRequestConfig): string {
    const method = (config.method || "get").toUpperCase();
    const url = config.url || "";
    // 合并 params 和 data，生成唯一标识
    const params = config.params
      ? stringify(config.params, {
          sort: (a: string, b: string) => a.localeCompare(b),
        })
      : "";
    const data = config.data
      ? typeof config.data === "string"
        ? config.data
        : JSON.stringify(config.data)
      : "";
    return `${method}:${url}:${params}:${data}`;
  }

  /**
   * 该请求是否参与 in-flight 去重：GET 默认去重，POST 只对登记过的纯读接口去重。
   * 这不是缓存：请求结束后立即清除，只在「前一个还没回来」的窗口内复用同一个 Promise。
   */
  private static shouldDedupe(config: PureHttpRequestConfig): boolean {
    const url = config.url || "";
    if (PureHttp.dedupeExcludePatterns.some((p) => p.test(url))) {
      return false;
    }
    const method = (config.method || "get").toLowerCase();
    if (method === "get") {
      return true;
    }
    if (method === "post") {
      return PureHttp.dedupePostPatterns.some((p) => p.test(url));
    }
    return false;
  }

  /** 重置刷新token失败计数 (登录成功后调用) */
  public static resetRefreshFailedCount() {
    PureHttp.refreshFailedCount = 0;
    PureHttp.isLoggingOut = false;
  }

  /** 捕获当前会话，允许同一会话正常轮换 token。 */
  public static captureAccessTokenContext(): () => boolean {
    const generation = PureHttp.sessionGeneration;
    const identity = () => {
      const user = getUserInfo()?.sysUser;
      return JSON.stringify([
        user?.id,
        user?.username,
      ]);
    };
    const initialIdentity = identity();
    return () =>
      !PureHttp.isLoggingOut &&
      generation === PureHttp.sessionGeneration &&
      initialIdentity === identity() &&
      !!getToken()?.access_token;
  }

  public static invalidateAccessTokenRefresh(): void {
    PureHttp.sessionGeneration++;
    const refresh = PureHttp.tokenRefresh;
    PureHttp.tokenRefresh = null;
    refresh?.reject(new AccessTokenContextChangedError("认证上下文已改变"));
  }

  /** 安全登出，防止重复调用 */
  public static safeLogOut() {
    if (PureHttp.isLoggingOut) {
      return;
    }
    PureHttp.invalidateAccessTokenRefresh();
    PureHttp.isLoggingOut = true;
    const generation = PureHttp.sessionGeneration;
    setTimeout(() => {
      if (PureHttp.isLoggingOut && generation === PureHttp.sessionGeneration) {
        useUserStoreHook().logOut();
      }
    }, 10);
  }

  /** HTTP 只在过期时刷新；SSE 可对一次被拒绝的 token 强制刷新。 */
  public static async ensureFreshAccessToken(
    options: {
      force?: boolean;
      rejectedToken?: string;
    } = {},
  ): Promise<string> {
    const data = getToken();
    if (PureHttp.isLoggingOut || !data?.access_token) {
      PureHttp.safeLogOut();
      throw new AccessTokenSessionError("登录已过期");
    }
    const isCurrent = PureHttp.captureAccessTokenContext();
    const activeRefresh = PureHttp.tokenRefresh;
    if (activeRefresh?.isCurrent()) {
      return activeRefresh.promise;
    }
    const expired = Number(data.expires_in) - Date.now() <= 0;
    // 同时到达的 401/424 可能已由另一请求完成续期，直接复用新 token。
    const needsForcedRefresh =
      options.force &&
      (!options.rejectedToken || data.access_token === options.rejectedToken);
    if (!expired && !needsForcedRefresh) {
      return data.access_token;
    }
    if (
      !data.refresh_token ||
      PureHttp.refreshFailedCount >= PureHttp.maxRefreshRetries
    ) {
      PureHttp.safeLogOut();
      throw new AccessTokenSessionError("Token无法续期");
    }

    let resolveRefresh: (token: string) => void;
    let rejectRefresh: (error: unknown) => void;
    const promise = new Promise<string>((resolve, reject) => {
      resolveRefresh = resolve;
      rejectRefresh = reject;
    });
    const isResponseCurrent = () =>
      isCurrent() &&
      getToken()?.access_token === data.access_token &&
      getToken()?.refresh_token === data.refresh_token;
    const refresh = {
      promise,
      isCurrent,
      isResponseCurrent,
      reject: rejectRefresh!,
    };
    PureHttp.tokenRefresh = refresh;
    Promise.resolve()
      .then(() => {
        if (!isCurrent())
          throw new AccessTokenContextChangedError("认证上下文已改变");
        return useUserStoreHook().handRefreshToken(
          data.refresh_token,
          isResponseCurrent,
        );
      })
      .then((res) => {
        if (!isCurrent())
          throw new AccessTokenContextChangedError("认证上下文已改变");
        if (
          !res?.access_token ||
          getToken()?.access_token !== res.access_token
        ) {
          throw new AccessTokenSessionError("Token刷新结果无效");
        }
        PureHttp.refreshFailedCount = 0;
        resolveRefresh(res.access_token);
        return res.access_token;
      })
      .catch((error) => {
        if (error instanceof AccessTokenContextChangedError || !isCurrent()) {
          rejectRefresh(new AccessTokenContextChangedError("认证上下文已改变"));
          return;
        }
        if (!PureHttp.isRefreshAuthenticationError(error)) {
          // 刷新链路的断网/超时/5xx 不代表凭证无效：结算等待者，由 SSE 原退避重试。
          // 不累计认证失败次数，恢复网络后仍可使用当前 refresh token 续期。
          rejectRefresh(error);
          return;
        }
        PureHttp.refreshFailedCount++;
        rejectRefresh(new AccessTokenSessionError("Token刷新失败"));
        if (PureHttp.refreshFailedCount >= PureHttp.maxRefreshRetries) {
          PureHttp.refreshFailedCount = 0;
          PureHttp.safeLogOut();
        }
      })
      .finally(() => {
        if (PureHttp.tokenRefresh === refresh) PureHttp.tokenRefresh = null;
      });
    return promise;
  }

  private static isRefreshAuthenticationError(error: unknown): boolean {
    if (error instanceof AccessTokenSessionError) return true;
    if (!error || typeof error !== "object") return false;
    const failure = error as {
      status?: number;
      data?: { error?: string; data?: unknown };
      response?: { status?: number; data?: { error?: string; data?: unknown } };
    };
    const response = failure.response ?? failure;
    const status = Number(response.status);
    if (status >= 500) return false;
    return [401, 403, 424].includes(status) ||
      (status === 400 && ["invalid_grant", "invalid_token"].includes(response.data?.error)) ||
      response.data?.data === "invalid_token";
  }

  private static isRefreshTokenRequest(
    config?: PureHttpRequestConfig,
  ): boolean {
    return (
      !!config?.url?.includes("/oauth2/token") &&
      typeof config.data === "string" &&
      config.data.includes("grant_type=refresh_token")
    );
  }

  private static assertRefreshResponseCurrent(config?: PureHttpRequestConfig) {
    const guard = config && PureHttp.refreshResponseGuards.get(config);
    if (guard && !guard()) {
      throw new AccessTokenContextChangedError(
        "认证上下文已改变，丢弃旧刷新响应",
      );
    }
  }

  /** 请求拦截 */
  private httpInterceptorsRequest(): void {
    PureHttp.axiosInstance.interceptors.request.use(
      async (config: PureHttpRequestConfig): Promise<any> => {
        // 继续处理 config（添加 token 等）
        return this.processRequest(config);
      },
      (error) => {
        return Promise.reject(error);
      },
    );
  }

  /** 处理请求（原有逻辑） */
  private async processRequest(config: PureHttpRequestConfig): Promise<any> {
    // 开启进度条动画
    NProgress.start();

    // W3C traceparent：每个请求一条新 trace（调用方已带则保留）。放在所有提前 return 之前
    ensureTraceparent(config.headers);

    // FormData 走 multipart：清掉默认的 application/json，交由浏览器按 boundary 自动设置 Content-Type，
    // 否则后端会报 "Current request is not a multipart request"（如图片裁剪上传 uploadBlob）。
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      const h = config.headers as any;
      if (h) {
        if (typeof h.delete === "function") h.delete("Content-Type");
        delete h["Content-Type"];
        delete h["content-type"];
      }
    }

    // HTTP Etag 缓存：为支持缓存的接口添加 If-None-Match 头
    if (
      PureHttp.shouldUseEtagCache(config) &&
      config.method?.toLowerCase() === "get"
    ) {
      const cachedEtag = PureHttp.getCachedEtag(config.url || "");
      if (cachedEtag) {
        config.headers = config.headers || {};
        config.headers["If-None-Match"] = cachedEtag;
      }
    }

    // 优先判断post/get等方法是否传入回掉，否则执行初始化设置等回掉
    if (typeof config.beforeRequestCallback === "function") {
      config.beforeRequestCallback(config);
      // return config;
    }

    if (PureHttp.initConfig.beforeRequestCallback) {
      PureHttp.initConfig.beforeRequestCallback(config);
      return config;
    }
    /** 请求白名单，放置一些不需要token的接口（通过设置请求白名单，防止token过期后再请求造成的死循环问题） */
    const whiteList = website.whiteList;
    /** 请求白名单，放置一些不需要token的接口的页面 */
    if (PureHttp.isRefreshTokenRequest(config)) {
      const token = getToken();
      // action 与 Axios interceptor 之间也可能已退出/重登，不能把旧 refresh
      // 请求当成新会话请求捕获，更不能在其响应到达后写入旧 token。
      const requestedRefreshToken = new URLSearchParams(
        config.data as string,
      ).get("refresh_token");
      if (
        !token?.refresh_token ||
        requestedRefreshToken !== token.refresh_token
      ) {
        throw new AccessTokenContextChangedError("刷新请求所属会话已改变");
      }
      const isCurrent = PureHttp.captureAccessTokenContext();
      const guard =
        PureHttp.tokenRefresh?.isResponseCurrent ??
        (() =>
          isCurrent() &&
          getToken()?.access_token === token.access_token &&
          getToken()?.refresh_token === token.refresh_token);
      if (!guard())
        throw new AccessTokenContextChangedError("刷新请求所属会话已改变");
      PureHttp.refreshResponseGuards.set(config, guard);
    }
    if (whiteList.some((v) => config.url === v)) {
      return config;
    }
    const data = getToken();
    const useToken = (config.headers || {}).useToken !== false;
    if (data && useToken) {
      const isCurrent = PureHttp.captureAccessTokenContext();
      const token = await PureHttp.ensureFreshAccessToken();
      if (!isCurrent())
        throw new AccessTokenContextChangedError("认证上下文已改变");
      config.headers["Authorization"] = formatToken(token);
    }
    return config;
  }

  /** 响应拦截 */
  private httpInterceptorsResponse(): void {
    const instance = PureHttp.axiosInstance;
    instance.interceptors.response.use(
      (response: PureHttpResponse) => {
        const { $t } = useI18n();
        // 请求成功拦截
        const $config = response.config;
        // 关闭进度条动画
        NProgress.done();
        PureHttp.assertRefreshResponseCurrent($config);

        // HTTP Etag 缓存处理
        if (PureHttp.shouldUseEtagCache($config)) {
          const url = $config.url || "";
          const etag = response.headers?.["etag"] || response.headers?.["ETag"];

          // 处理 304 Not Modified 响应
          if (response.status === 304) {
            // 304 响应没有数据体，使用缓存的响应数据
            // 注意：Axios 默认会处理 304，但我们需要确保使用缓存的 Etag
            console.log(`[HTTP] 304 Not Modified: ${url}，使用缓存数据`);
            // 返回缓存的响应（这里需要从缓存中获取，但 Axios 已经处理了）
            return response;
          }

          // 保存新的 Etag 值
          if (etag) {
            PureHttp.setCachedEtag(url, etag);
          }
        }

        // 请求去重：清除已完成的请求记录（如果存在）
        if (PureHttp.shouldDedupe($config)) {
          const requestKey = PureHttp.generateRequestKey($config);
          const pendingRequest = PureHttp.pendingRequests.get(requestKey);
          if (pendingRequest) {
            // 通知所有等待的 Promise
            pendingRequest.promise.then(() => {}).catch(() => {});
            PureHttp.pendingRequests.delete(requestKey);
          }
        }
        const status = Number(response.status) || 200;
        const msg =
          (response.data.msg === "Access Denied"
            ? $t(errorCode["403"])
            : response.data.msg) ||
          $t(errorCode[status]) ||
          $t(errorCode["default"]);

        if (status !== 200 || response.data.code === 1) {
          // 失败请求的 trace id（后端报错文案里的「错误号」= 末 8 位）
          rememberFailedTrace(resolveTraceId(response.headers, $config.headers));
          message(msg, {
            type: "error",
            duration: 5000,
          });
          // 保留刷新响应状态/载荷供共享续期入口区分认证拒绝与服务端暂时故障。
          return Promise.reject(PureHttp.isRefreshTokenRequest($config) ? response : msg);
        }
        // 优先判断post/get等方法是否传入回调，否则执行初始化设置等回调
        if (typeof $config.beforeResponseCallback === "function") {
          $config.beforeResponseCallback(response);
          if (Object.prototype.hasOwnProperty.call(response.data, "data")) {
            return response.data;
          } else return response; //兼容非统一返回格式
        }
        if (PureHttp.initConfig.beforeResponseCallback) {
          PureHttp.initConfig.beforeResponseCallback(response);
          if (Object.prototype.hasOwnProperty.call(response.data, "data")) {
            return response.data;
          } else return response; //兼容非统一返回格式
        }
        if (Object.prototype.hasOwnProperty.call(response.data, "data")) {
          return response.data;
        } else return response; //兼容非统一返回格式
      },
      (error: PureHttpError) => {
        const { $t } = useI18n();
        const $error = error;
        if (
          error instanceof AccessTokenSessionError ||
          error instanceof AccessTokenContextChangedError
        ) {
          NProgress.done();
          return Promise.reject(error);
        }
        try {
          PureHttp.assertRefreshResponseCurrent(error.config);
        } catch (staleError) {
          NProgress.done();
          return Promise.reject(staleError);
        }

        // 500 等刷新失败可能已由内层拦截器转换为 response，外层原请求
        // 再进入此处时仍须原样拒绝，不能误取 response.response 变成 undefined。
        if (PureHttp.isRefreshTokenRequest(error.config) && !error.response && Number(error.status) >= 400) {
          NProgress.done();
          return Promise.reject(error);
        }

        // 所有的响应异常 区分来源为取消请求/非取消请求-根据需要自行处理
        // $error.isCancelRequest = true;
        $error.isCancelRequest = Axios.isCancel($error);
        // 关闭进度条动画
        NProgress.done();
        // 失败请求的 trace id（后端报错文案里的「错误号」= 末 8 位）；主动取消的不算失败
        const traceId = $error.isCancelRequest
          ? ""
          : rememberFailedTrace(
              resolveTraceId(error.response?.headers, error.config?.headers),
            );

        // 请求去重：清除已失败的请求记录（如果存在）
        if (error.config && PureHttp.shouldDedupe(error.config)) {
          const requestKey = PureHttp.generateRequestKey(error.config);
          PureHttp.pendingRequests.delete(requestKey);
        }
        // 超时 或 跨域 或 网络错误
        if ($error.code === "ECONNABORTED" || $error.code === "ERR_NETWORK") {
          // 如果是关键接口的网络错误（可能是CORS或重定向问题），触发登出
          const url = error.config?.url || "";
          if (url.includes("/upms/user/info") || url.includes("/upms/menu")) {
            console.error(
              "[HTTP] 关键接口网络错误，可能是CORS或重定向问题，登出",
              `traceId=${traceId}`,
            );
            message("网络异常，请重新登录", {
              type: "error",
              duration: 3000,
            });
            PureHttp.safeLogOut();
            return Promise.reject($error);
          }
          message($error.message, {
            type: "error",
            duration: 5000,
          });
          return Promise.reject($error);
        }
        const response = error.response;
        const status = Number(error.status) || response?.status || 200;
        // 调用方声明为「预期内」的状态码（如新接口在老后端上 404）：不弹提示，原样 reject 给调用方降级
        const quietStatuses = (error.config as PureHttpRequestConfig | undefined)?.quietStatuses;
        if (quietStatuses?.includes(status)) {
          return Promise.reject(response ?? $error);
        }
        let msg = $t(errorCode[status]) || $t(errorCode["default"]);
        let data = undefined;
        if (response) {
          data = response.data;
          msg = data.msg ? data.msg : msg;
          if (msg === "Access Denied") {
            msg = $t(errorCode["403"]);
          }
        }

        // 特殊处理: /oauth2/token 返回 401 时，必须区分「初始登录失败」和「token 刷新失败」。
        // 两者打的是同一个接口，只有 grant_type 不同：不区分就会把「密码输错」当成
        // 「登录已过期」，把正在输密码的人当场登出。
        if (
          status === 401 &&
          error.config?.url?.includes("/oauth2/token")
        ) {
          const requestData = error.config?.data;
          const grantTypeSource = `${
            typeof requestData === "string" ? requestData : ""
          }${error.config?.url ?? ""}`;
          const isRefreshTokenRequest =
            grantTypeSource.includes("grant_type=refresh_token");

          if (isRefreshTokenRequest) {
            // token 刷新失败 → 登出（同时防止刷新接口 401 引发无限循环）
            console.error(
              "[HTTP] 刷新token接口返回401，清除认证信息并登出",
              `traceId=${traceId}`,
            );
            message("登录已过期，请重新登录", {
              type: "error",
              duration: 3000,
            });
            PureHttp.safeLogOut();
            return Promise.reject(new Error("刷新token失败"));
          }

          // 初始登录失败（密码错误等）→ 不登出；errCode 交给登录页分支处理
          // （credentials_expired = 首次登录 / 管理员重置后必须先改密，由登录页弹改密窗，不弹红条）
          const loginError = Object.assign(new Error(msg || "登录失败"), {
            errCode: data?.errCode as string | undefined,
          });
          if (loginError.errCode !== "credentials_expired") {
            message(msg || "用户名或密码错误", {
              type: "error",
              duration: 3000,
            });
          }
          return Promise.reject(loginError);
        }

        // 特殊处理: 关键接口返回400，说明token无效或请求异常，应该登出
        if (
          status === 400 &&
          (error.config?.url?.includes("/upms/user/info") ||
            error.config?.url?.includes("/upms/menu"))
        ) {
          console.error(
            "[HTTP] 关键接口返回400，清除认证信息并登出",
            `traceId=${traceId}`,
          );
          message("登录信息异常，请重新登录", {
            type: "error",
            duration: 3000,
          });
          PureHttp.safeLogOut();
          return Promise.reject(new Error("登录信息异常"));
        }

        if (status === 503 || status === 502) {
          message(`${msg ? msg : ""}`, {
            type: "error",
            duration: 5000,
          });
          return Promise.reject($error);
        }
        // 刷新请求的5xx优先按服务端暂时故障处理，即使错误载荷含 invalid_token。
        // 保留500等既有response拒绝形状；普通业务请求仍沿用下方登录失效策略。
        if (status >= 500 && PureHttp.isRefreshTokenRequest(error.config)) {
          message(msg, { type: "error" });
          return Promise.reject(response ?? $error);
        }
        // 登录过期
        if (status === 424 || data?.data === "invalid_token") {
          message(`${status}${msg ? msg : ""}`, {
            type: "error",
            duration: 5000,
          });
          PureHttp.safeLogOut();
          return Promise.reject(new Error(msg));
        }
        if (msg && (status !== 200 || data?.code === 1)) {
          message(msg, {
            type: "error",
          });
          // ⚠ 这里原本对 500 走 Promise.resolve(response)（自首次提交沿用，无设计意图记录）。
          // 后果：后端 500 时调用方进入 .then() 分支 —— 先弹一条错误 toast，紧接着弹
          // 「保存成功」、关弹窗、刷列表，而数据根本没写进去。表单页全中。
          // 统一按 4xx 同样的形状 reject（reject(response)），调用方对 4xx 的处理即可复用。
          return Promise.reject(response);
        }
        if (response?.data && Object.prototype.hasOwnProperty.call(response.data, "data")) {
          return Promise.reject(response.data);
        }
        return Promise.reject($error);
      },
    );
  }

  /** 通用请求工具函数 */
  public request<T>(
    method: RequestMethods,
    url: string,
    param?: AxiosRequestConfig,
    axiosConfig?: PureHttpRequestConfig,
  ): Promise<T> {
    const config = {
      method,
      url,
      ...param,
      ...axiosConfig,
    } as PureHttpRequestConfig;

    // 请求去重：检查是否有相同的请求正在进行
    if (PureHttp.shouldDedupe(config)) {
      const requestKey = PureHttp.generateRequestKey(config);
      const pendingRequest = PureHttp.pendingRequests.get(requestKey);

      if (pendingRequest) {
        // 如果存在相同的请求，返回已有的 Promise
        // 改成默认对 GET 去重后命中率大幅上升，用 debug 级别避免刷屏；
        // 排查「为什么这个请求没发出去」时打开控制台 verbose 就能看到。
        console.debug(`[HTTP] 请求去重(复用在途请求): ${method.toUpperCase()} ${url}`);
        return pendingRequest.promise as Promise<T>;
      }

      // 创建新的请求 Promise 并存储
      const requestPromise = new Promise<T>((resolve, reject) => {
        PureHttp.axiosInstance
          .request(config)
          .then((response: any) => {
            if (response.status && response.status !== 200) {
              // 兼容特殊格式响应的接口返回
              reject(response);
            } else {
              resolve(response);
            }
          })
          .catch((error) => {
            reject(error);
          })
          .finally(() => {
            // 请求完成后清除记录
            PureHttp.pendingRequests.delete(requestKey);
          });
      });

      PureHttp.pendingRequests.set(requestKey, {
        promise: requestPromise,
        controller: new AbortController(),
      });

      return requestPromise;
    }

    // 非去重请求，继续原有流程
    return new Promise((resolve, reject) => {
      PureHttp.axiosInstance
        .request(config)
        .then((response: any) => {
          if (response.status && response.status !== 200) {
            // 兼容特殊格式响应的接口返回
            reject(response);
          } else {
            resolve(response);
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  /** 单独抽离的`post`工具函数 */
  public post<T, P>(
    url: string,
    params?: AxiosRequestConfig<P>,
    config?: PureHttpRequestConfig,
  ): Promise<T> {
    return this.request<T>("post", url, params, config);
  }

  /** 单独抽离的`get`工具函数 */
  public get<T, P>(
    url: string,
    params?: AxiosRequestConfig<P>,
    config?: PureHttpRequestConfig,
  ): Promise<T> {
    return this.request<T>("get", url, params, config);
  }
  /** 原axios对象,用于AVUE获取字典数据 */
  public getAxios() {
    return PureHttp.axiosInstance;
  }
}

export const http = new PureHttp();

export const axios = http.getAxios();

/** 重置刷新token失败计数 - 用于登录成功后重置 */
export const resetRefreshFailedCount = PureHttp.resetRefreshFailedCount;

/** SSE 与 HTTP 共享续期及统一会话终止策略。 */
export const ensureFreshAccessToken = PureHttp.ensureFreshAccessToken;
export const captureAccessTokenContext = PureHttp.captureAccessTokenContext;
export const invalidateAccessTokenRefresh =
  PureHttp.invalidateAccessTokenRefresh;
export const terminateAccessTokenSession = PureHttp.safeLogOut;
