/**
 * W3C traceparent 请求头
 *
 * 每个请求生成一条新 trace：`00-<32 位小写 hex trace id>-<16 位 hex span id>-01`。
 * 网关延续这条 trace 并在响应头 `X-Trace-Id` 回写（以网关为准）；后端兜底报错文案里的
 * 「错误号」= trace id 末 8 位，拿到截图就能反查日志与链路。
 *
 * 只加请求头，不改任何请求行为；调用方已经带了 traceparent 的原样保留。
 * 最近一次失败请求的 trace id 记在模块变量里，并写进已有的 console 错误日志，不做任何 UI。
 */

const HEADER = "traceparent";
const TRACEPARENT_RE = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;
const TRACE_ID_RE = /^[0-9a-f]{32}$/;

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  const c: Crypto | undefined =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let hex = "";
  bytes.forEach((b) => {
    hex += b.toString(16).padStart(2, "0");
  });
  // W3C：全 0 的 trace id / span id 非法
  return /^0+$/.test(hex) ? `${hex.slice(0, -1)}1` : hex;
}

/** 生成一条新的 traceparent */
export function newTraceparent(): { traceparent: string; traceId: string } {
  const traceId = randomHex(16);
  return { traceparent: `00-${traceId}-${randomHex(8)}-01`, traceId };
}

/** 从 traceparent 取 trace id；格式不对返回 "" */
export function traceIdOfTraceparent(value: unknown): string {
  const m = TRACEPARENT_RE.exec(String(value || "").trim().toLowerCase());
  return m?.[1] ?? "";
}

/** axios 1.x 的 AxiosHeaders（大小写不敏感的 get/set/has）或普通对象 */
type HeaderBag =
  | {
      get?: (name: string) => unknown;
      set?: (name: string, value: string) => unknown;
      has?: (name: string) => boolean;
      [key: string]: unknown;
    }
  | null
  | undefined;

function readHeader(headers: HeaderBag, name: string): string {
  if (!headers || typeof headers !== "object") return "";
  let value: unknown;
  if (typeof headers.get === "function") {
    value = headers.get(name);
  } else {
    const lower = name.toLowerCase();
    const key = Object.keys(headers).find((k) => k.toLowerCase() === lower);
    value = key ? headers[key] : undefined;
  }
  return value === undefined || value === null ? "" : String(value).trim();
}

/**
 * 给请求头补 traceparent（原地修改）。已有则保留。
 * @returns 本次请求的 trace id
 */
export function ensureTraceparent(target: unknown): string {
  const headers = target as HeaderBag;
  if (!headers || typeof headers !== "object") return "";
  const existing = readHeader(headers, HEADER);
  if (existing) return traceIdOfTraceparent(existing);
  const { traceparent, traceId } = newTraceparent();
  if (typeof headers.set === "function") headers.set(HEADER, traceparent);
  else headers[HEADER] = traceparent;
  return traceId;
}

/** 读响应头（大小写不敏感）；取不到返回 "" */
export function readResponseHeader(headers: unknown, name: string): string {
  return readHeader(headers as HeaderBag, name);
}

/** 本次请求的 trace id：响应头 X-Trace-Id 优先（网关为准），否则用请求时发出的那个 */
export function resolveTraceId(
  responseHeaders: unknown,
  requestHeaders: unknown,
): string {
  const fromServer = readResponseHeader(responseHeaders, "X-Trace-Id").toLowerCase();
  if (TRACE_ID_RE.test(fromServer)) return fromServer;
  return traceIdOfTraceparent(readResponseHeader(requestHeaders, HEADER));
}

let lastTraceId = "";

/** 记下一次失败请求的 trace id，返回它（便于直接拼进日志） */
export function rememberFailedTrace(traceId: string): string {
  if (traceId) lastTraceId = traceId;
  return traceId;
}

/** 最近一次失败请求的 trace id（排查用） */
export function getLastTraceId(): string {
  return lastTraceId;
}
