/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * 订单卡头右侧倒计时的口径与格式化。
 *
 * - 待付款自动关闭：基准 = createTime + UNPAID_AUTO_CLOSE_MINUTES（与后端未支付订单自动关闭时长一致）。
 * - 承诺发货时限：后端没有「承诺发货截止时间」字段，按付款后 PROMISE_DELIVERY_HOURS 小时推算；
 *   后端将来若提供真实字段，把字段名加进 PROMISE_DELIVERY_FIELDS 即可自动优先生效。
 */

/** 未支付订单自动关闭时长 */
export const UNPAID_AUTO_CLOSE_MINUTES = 30;

/** 承诺发货时限：付款后 48 小时 */
export const PROMISE_DELIVERY_HOURS = 48;

/** 「承诺发货截止时间」候选字段名 —— 后端真实字段优先于常量推算（目前后端未提供） */
const PROMISE_DELIVERY_FIELDS = [
  "promiseDeliveryTime",
  "promisedDeliveryTime",
  "deliveryDeadline",
  "expectDeliveryTime",
];

/** 解析后端时间字段为时间戳；'YYYY-MM-DD HH:mm:ss' 在 Safari 下 new Date() 会 NaN，先换斜杠 */
export function parseOrderTime(value: any): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value).trim();
  const t = new Date(raw.includes("T") ? raw : raw.replace(/-/g, "/")).getTime();
  return Number.isNaN(t) ? null : t;
}

/** 待付款订单的自动关闭时刻（createTime + 30min） */
export function resolveUnpaidCloseAt(row: any): number | null {
  const created = parseOrderTime(row?.createTime);
  return created === null ? null : created + UNPAID_AUTO_CLOSE_MINUTES * 60000;
}

/**
 * 承诺发货截止时刻。后端真实字段优先；没有则按「付款时间 + 48 小时」推算。
 * paymentTime 缺失时退到 createTime（截止点偏早、提示更紧迫，方向上对商家是安全的）。
 * 两个时间都取不到才返回 null，调用方据此整段不渲染。
 */
export function resolvePromiseDeliveryAt(row: any): number | null {
  for (const key of PROMISE_DELIVERY_FIELDS) {
    const t = parseOrderTime(row?.[key]);
    if (t !== null) return t;
  }
  const paidAt = parseOrderTime(row?.paymentTime) ?? parseOrderTime(row?.createTime);
  return paidAt === null ? null : paidAt + PROMISE_DELIVERY_HOURS * 3600000;
}

/**
 * 是否「待发货」的行 —— 承诺发货倒计时只挂在这类单上。
 * 与卡片上「发货」主按钮的显示条件保持同一口径。
 */
export function isShipPending(row: any): boolean {
  return String(row?.status ?? "") === "1";
}

/**
 * 「即将超时」的提醒阈值：距承诺发货截止不足 6 小时。
 * 纯前端提醒口径，给页头统计用的展示阈值，改这里即全站生效。
 */
export const SHIP_SOON_OVERDUE_HOURS = 6;

/** 距承诺发货截止的剩余毫秒。非「快递待发货」行、或时间取不到时返回 null */
export function shipRemainMs(row: any, now: number): number | null {
  if (!isShipPending(row)) return null;
  const at = resolvePromiseDeliveryAt(row);
  return at === null ? null : at - now;
}

/** 即将超时：还没到点，但剩余时间已不足阈值 */
export function isShipSoonOverdue(row: any, now: number): boolean {
  const remain = shipRemainMs(row, now);
  return remain !== null && remain > 0 && remain <= SHIP_SOON_OVERDUE_HOURS * 3600000;
}

/** 已超承诺发货时限（与「即将超时」互斥，两者刻意不合并计数：一个是待办提醒、一个是已违约） */
export function isShipOverdue(row: any, now: number): boolean {
  const remain = shipRemainMs(row, now);
  return remain !== null && remain <= 0;
}

/** 待付款：`M 分 SS 秒后自动关闭`，到点转「已超时 · 自动关闭中」 */
export function formatUnpaidCountdown(remain: number): string {
  if (remain <= 0) return "已超时 · 自动关闭中";
  const m = Math.floor(remain / 60000);
  const s = Math.floor((remain % 60000) / 1000);
  return `${m} 分 ${String(s).padStart(2, "0")} 秒后自动关闭`;
}

/** 待发货：`承诺发货 剩 H 小时 M 分`，超时转「已超承诺发货时限」 */
export function formatShipCountdown(remain: number): string {
  if (remain <= 0) return "已超承诺发货时限";
  const h = Math.floor(remain / 3600000);
  const m = Math.floor((remain % 3600000) / 60000);
  return `承诺发货 剩 ${h} 小时 ${m} 分`;
}

/**
 * 本行是否需要秒级跳动。
 * OrderListPage 用它决定要不要起那唯一一个 setInterval —— 整页没有需要倒计时的订单时不必每秒重渲染。
 */
export function orderNeedsCountdown(row: any): boolean {
  if (isUnpaidPending(row)) return resolveUnpaidCloseAt(row) !== null;
  if (isShipPending(row)) return resolvePromiseDeliveryAt(row) !== null;
  return false;
}

/**
 * 是否「待付款」行。
 * 不能只认 status === '0'：后端待付款单的 status 是空的（is_pay = '0' 且 status 为 NULL），
 * 故按「未支付 且 status 为空或 '0'」判定，覆盖两种取值。
 * 已取消单（status '5'）同样未支付，靠 status 非空且不等于 '0' 被排除在外。
 */
export function isUnpaidPending(row: any): boolean {
  if (String(row?.isPay ?? "") !== "0") return false;
  const status = String(row?.status ?? "");
  return status === "" || status === "0";
}
