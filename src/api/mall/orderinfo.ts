/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http } from '@/utils/http'
import { message } from '@/utils/message'

export function getPage(query) {
  return http.request<any>('get', '/mall/orderinfo/page', { params: query })
}
/** 订单详情：data = { orderInfo, logistic, machineState, actions } */
export function getObj(id) {
  return http.request<any>('get', '/mall/orderinfo/' + id)
}
export function orderCancel(id) {
  return http.request<any>('put', '/mall/orderinfo/cancel/' + id)
}

/** 人工处理（状态修正）的请求体：targetState 是后端状态机枚举名，不能是 LEGACY_INVALID */
export interface OrderManualFixBody {
  targetState: string
  /** 必填，写清处理原因（后端写进审计日志） */
  reason: string
}

/** 人工处理成功的回执：from 恒为 LEGACY_INVALID，to 为改后的状态，logId 为审计日志主键 */
export interface OrderManualFixResult {
  from: string
  to: string
  logId: string
}

/**
 * 人工处理：把状态机判为 LEGACY_INVALID（status 与 is_pay 拼出了不合法组合）的订单改到一个合法状态。
 * 权限复用 mall:orderinfo:edit。订单不是 LEGACY_INVALID、原因为空等拒绝以 code != 0 + msg 返回。
 */
export function manualFixOrderState(id: string, data: OrderManualFixBody) {
  return http.request<{ code: number; msg?: string; data: OrderManualFixResult }>(
    'put',
    `/mall/orderinfo/${encodeURIComponent(id)}/manual-fix`,
    { data },
  )
}
/**
 * 各状态订单数量，一次返回：{"0": 待付款, "1": 待发货, "2": 待收货, "3": 已完成, "5": 已取消}
 */
export function getBulkOrderCount(query) {
  return http.request<any>('get', '/mall/orderinfo/bulkCount', {
    params: query,
  })
}

/** 发货参数（后端 OrderDeliveryDTO）。快递发货必填物流公司编码（字典 express_company）与运单号 */
export interface OrderDeliveryBody {
  orderId: string
  /** 本次发货的商品项 id，逗号分隔；不传 = 本单全部待发商品 */
  orderItemIds?: string
  /** 1 = 快递发货 */
  deliveryType: string
  logisticsCode: string
  logisticsNo: string
  recName: string
  recTel: string
  recAddress: string
}
export function delivery(data: OrderDeliveryBody) {
  return http.request<any>('put', '/mall/orderinfo/delivery', { data })
}

/** 订单备注 */
export function putremark(obj: { id: string; remark: string }) {
  return http.request<any>('put', '/mall/orderinfo/remark', { data: obj })
}
/** 批量备注（逐订单返回 UPDATED/UNCHANGED/FAILED）。每次 1～100 单 */
export function putRemarkBatch(data: { orderIds: string[]; remark: string }) {
  return http.request<any>('put', '/mall/orderinfo/remark/batch', { data })
}

/** 修改收货地址 */
export function putaddress(obj: { id: string; recName: string; recTel: string; recAddress: string }) {
  return http.request<any>('put', '/mall/orderinfo/address', { data: obj })
}

/**
 * 按条件导出订单（后端生成 Excel，一单一行，单次最多 1 万单）。
 * 查询参数与列表 /page 相同，即「列表筛出什么导什么」。
 */
export function exportOrders(query: Record<string, any>) {
  return http.request<any>('get', '/mall/orderinfo/export', {
    params: query,
    responseType: 'blob',
  })
}

/** 批量发货模板（Excel：订单号 / 物流公司 / 运单号，附可选物流公司表） */
export function downloadBatchDeliveryTemplate() {
  return http.request<any>('get', '/mall/orderinfo/batch-delivery/template', {
    responseType: 'blob',
  })
}

/** 批量发货的逐行结果（后端 BatchResult：成功的行号 / 失败的行号与原因） */
export interface BatchDeliveryResult {
  total: number
  successCount: number
  failCount: number
  succeeded: string[]
  failed: Array<{ id: string; code: string; reason: string }>
}

/** 上传 Excel 批量发货：逐行处理、逐行回结果，单行失败不影响其他行 */
export function batchDelivery(file: File) {
  const form = new FormData()
  form.append('file', file)
  return http.request<{ code: number; msg?: string; data: BatchDeliveryResult }>(
    'post',
    '/mall/orderinfo/batch-delivery',
    { data: form, headers: { 'Content-Type': 'multipart/form-data' } },
  )
}

/**
 * 把下载接口的响应存成文件。
 *
 * 响应拦截器只在 `response.data` 上有 `data` 字段时才解包，Blob 上没有，
 * 所以这里拿到的可能是 Blob 本身，也可能是整个 AxiosResponse，两种都收。
 * 后端业务报错（如导出超过上限）在 blob 请求下会以 JSON 返回，这里读出原话提示，不存成坏文件。
 *
 * @returns 是否真的存了文件
 */
export async function saveDownload(res: any, fileName: string): Promise<boolean> {
  const raw = res instanceof Blob ? res : res?.data
  if (raw instanceof Blob && raw.type.includes('json')) {
    try {
      const body = JSON.parse(await raw.text())
      message(body?.msg || '下载失败', { type: 'error' })
    } catch {
      message('下载失败', { type: 'error' })
    }
    return false
  }
  const data = raw instanceof Blob
    ? raw
    : new Blob([raw], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  return true
}
