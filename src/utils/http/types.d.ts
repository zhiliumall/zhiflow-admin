import type {
  Method,
  AxiosError,
  AxiosResponse,
  AxiosRequestConfig,
} from "axios";

export type resultType<T> = {
  code: number;
  msg: string;
  data?: T;
  ok: boolean;
};
export type RequestMethods = Extract<
  Method,
  "get" | "post" | "put" | "delete" | "patch" | "option" | "head"
>;

export interface PureHttpError extends AxiosError {
  isCancelRequest?: boolean;
}

export interface PureHttpResponse extends AxiosResponse {
  config: PureHttpRequestConfig;
}

export interface PureHttpRequestConfig extends AxiosRequestConfig {
  beforeRequestCallback?: (request: PureHttpRequestConfig) => void;
  beforeResponseCallback?: (response: PureHttpResponse) => void;
  /** 这些 HTTP 状态码不弹全局错误提示（仍然 reject，由调用方自己处理）。 */
  quietStatuses?: number[];
}

export default class PureHttp {
  request<T>(
    method: RequestMethods,
    url: string,
    param?: AxiosRequestConfig,
    axiosConfig?: PureHttpRequestConfig,
  ): Promise<T>;
  post<T, P>(
    url: string,
    params?: T,
    config?: PureHttpRequestConfig,
  ): Promise<P>;
  get<T, P>(
    url: string,
    params?: T,
    config?: PureHttpRequestConfig,
  ): Promise<P>;
}
