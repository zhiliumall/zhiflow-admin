/**
 * 差错池：渠道已确认收款、但订单正常流程入不了账的钱（只读列表 + 标记已处理）。
 *
 * 后端：mall-admin `PayExceptionController`（网关前缀 /mall）。读接口要 `mall:orderinfo:index`；
 * 唯一写接口「标记已处理」要 `mall:orderinfo:edit`，必填备注、只标「待处理」。退款由人在支付渠道商户后台做。
 * 文案 / 金额 / 时间的展示口径见 `@/const/payException`。
 */
import { http } from "@/utils/http";

export interface ApiResult<T> {
  code: number;
  msg?: string;
  data: T;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
}

export interface PayException {
  id: string;
  /** LATE_PAID / DUP_PAY / AMOUNT_MISMATCH */
  type: string;
  /** OPEN / RESOLVED */
  status: string;
  orderId?: string | null;
  orderNo?: string | null;
  payOrderId?: string | null;
  /** 渠道码，与 pay_config.type 同值（1=微信支付，2=支付宝） */
  channel?: string | null;
  channelTxnId?: string | null;
  /** 渠道确认的金额，最小单位（分 / 仙）；后端 Long */
  amountMinor?: number | string | null;
  /** ISO 4217，如 CNY */
  currency?: string | null;
  callbackLogId?: string | null;
  dedupeKey?: string | null;
  /** 入池时的上下文，给人工处置看 */
  detail?: string | null;
  resolution?: string | null;
  resolvedBy?: string | null;
  resolvedTime?: string | null;
  resolveReason?: string | null;
  /** timestamptz → 带偏移的 ISO 串 */
  createTime?: string | null;
  updateTime?: string | null;
}

export interface PayExceptionQuery {
  current: number;
  size: number;
  type?: string;
  status?: string;
  /** 精确匹配（后端 eq） */
  orderNo?: string;
}

/**
 * 端点在当前环境不存在（后端版本不含差错池）。页面据此显示「暂不可用」而不是「暂无数据」，也不给重试。
 * 拦截器对非 200 reject(response)，少数分支 reject axios error，两种都认。
 */
export const isPayExceptionEndpointMissing = (error: unknown): boolean => {
  const e = error as { status?: number; response?: { status?: number } } | null;
  return e?.status === 404 || e?.response?.status === 404;
};

/** 差错池分页（后端固定按入池时间倒序） */
export function getPayExceptionPage(query: PayExceptionQuery) {
  return http.request<ApiResult<PageResult<PayException>>>(
    "get",
    "/mall/payexception/page",
    {
      params: {
        current: query.current,
        size: query.size,
        type: query.type || undefined,
        status: query.status || undefined,
        orderNo: query.orderNo?.trim() || undefined,
      },
    },
  );
}

/** 差错详情 */
export function getPayException(id: string) {
  return http.request<ApiResult<PayException | null>>(
    "get",
    `/mall/payexception/${encodeURIComponent(id)}`,
  );
}

/** 标记已处理（人工在渠道后台退款 / 核实后回来标记；备注必填） */
export function resolvePayException(id: string, note: string) {
  return http.request<ApiResult<boolean>>(
    "put",
    `/mall/payexception/${encodeURIComponent(id)}/resolve`,
    { data: { note } },
  );
}
