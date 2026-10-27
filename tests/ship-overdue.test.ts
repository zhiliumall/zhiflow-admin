import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PROMISE_DELIVERY_HOURS,
  SHIP_SOON_OVERDUE_HOURS,
  isShipOverdue,
  isShipSoonOverdue,
  shipRemainMs,
  resolveUnpaidCloseAt,
  orderNeedsCountdown,
} from '../src/views/mall/orderinfo/orderCountdown.ts'

const NOW = new Date('2026-08-04T12:00:00').getTime()
const H = 3600000

/** 按「距承诺发货截止还剩 hoursLeft 小时」造一个待发货单 */
function shipRow(hoursLeft: number, extra: Record<string, any> = {}) {
  const paidAt = NOW - (PROMISE_DELIVERY_HOURS - hoursLeft) * H
  const d = new Date(paidAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  const paymentTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  return { status: '1', paymentTime, ...extra }
}

test('即将超时只认「未超时且剩余不足阈值」的待发货单', () => {
  const soon = shipRow(SHIP_SOON_OVERDUE_HOURS - 2)
  assert.equal(isShipSoonOverdue(soon, NOW), true)
  assert.equal(isShipOverdue(soon, NOW), false)

  // 刚好等于阈值算即将超时（边界含等号）
  assert.equal(isShipSoonOverdue(shipRow(SHIP_SOON_OVERDUE_HOURS), NOW), true)
  // 超过阈值不算
  assert.equal(isShipSoonOverdue(shipRow(SHIP_SOON_OVERDUE_HOURS + 2), NOW), false)
})

test('待付款订单按下单时间 + 30 分钟自动关闭', () => {
  const row = { isPay: '0', status: '', createTime: '2026-08-04 10:00:00' }
  assert.equal(resolveUnpaidCloseAt(row), new Date('2026/08/04 10:30:00').getTime())
  assert.equal(orderNeedsCountdown(row), true)
  assert.equal(resolveUnpaidCloseAt({ isPay: '0' }), null)
})

test('已超时与即将超时互斥，不重复计数', () => {
  const overdue = shipRow(-2)
  assert.equal(isShipOverdue(overdue, NOW), true)
  assert.equal(isShipSoonOverdue(overdue, NOW), false)
})

test('只统计待发货单：已发货单、无时间的单一律不计', () => {
  assert.equal(isShipSoonOverdue(shipRow(1, { status: '2' }), NOW), false, '已发货')
  assert.equal(shipRemainMs({ status: '1' }, NOW), null, '付款/下单时间都没有')
  assert.equal(isShipSoonOverdue({ status: '1' }, NOW), false)
  assert.equal(isShipOverdue({ status: '1' }, NOW), false)
})

test('后端若提供真实的承诺发货截止字段，优先于「付款 + 48 小时」推算', () => {
  const row = shipRow(30, { promiseDeliveryTime: '2026-08-04 15:00:00' })
  assert.equal(shipRemainMs(row, NOW), 3 * H)
  assert.equal(isShipSoonOverdue(row, NOW), true)
})
