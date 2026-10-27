/**
 * 开关乐观翻转 + 失败回滚（弹窗与反馈体系 · 全站）
 *
 *   点击立即翻转 → 行内忙态锁 → 成功落定 / 失败回滚 + error toast。
 *   影响前台可见性的开关（停业 / 停用），关闭方向先过 L2 确认。
 *
 * 解决的问题：`changeEnable(row).catch(() => {})`
 * 失败静默，UI 与服务端状态错位且不自愈。本 composable 把回滚与报错收进一处，
 * 页面不再手写。
 */
import { ref } from "vue";

import { appConfirm, type AppConfirmOptions } from "./confirm";
import { message } from "./message";

export interface OptimisticToggleOptions<T> {
  /** 读当前值 */
  get: (row: T) => boolean;
  /** 写入本地值（乐观翻转与回滚都走它） */
  set: (row: T, v: boolean) => void;
  /** 提交到服务端；reject 即回滚 */
  submit: (row: T, next: boolean) => Promise<unknown>;
  /** 行唯一键，用于行内忙态锁 */
  key: (row: T) => string | number;
  /** 失败提示文案，默认「操作失败，已恢复原状态」 */
  failText?: string | ((row: T, e: unknown) => string);
  /**
   * 关闭方向（true → false）的前置确认。影响前台可见性的开关必须传，
   * 此类关闭动作至少要过 L2 确认。
   */
  confirmOnOff?: (row: T) => AppConfirmOptions;
}

export function useOptimisticToggle<T>(o: OptimisticToggleOptions<T>) {
  /** 行内忙态：key → true */
  const pending = ref<Record<string, boolean>>({});

  const isPending = (row: T): boolean => !!pending.value[String(o.key(row))];

  async function toggle(row: T): Promise<void> {
    const k = String(o.key(row));
    if (pending.value[k]) return;

    const prev = o.get(row);
    const next = !prev;

    // 关闭方向前置确认（用户取消 → 什么都不做，UI 不翻转）
    if (!next && o.confirmOnOff) {
      try {
        await appConfirm(o.confirmOnOff(row));
      } catch {
        return;
      }
    }

    // 乐观翻转 + 行内忙态锁
    o.set(row, next);
    pending.value = { ...pending.value, [k]: true };

    try {
      await o.submit(row, next);
    } catch (e) {
      o.set(row, prev); // 回滚
      const text =
        typeof o.failText === "function"
          ? o.failText(row, e)
          : (o.failText ?? "操作失败，已恢复原状态");
      message.error(text);
    } finally {
      const rest = { ...pending.value };
      delete rest[k];
      pending.value = rest;
    }
  }

  return { toggle, isPending, pending };
}
