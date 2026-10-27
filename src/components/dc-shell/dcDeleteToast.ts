/**
 * dcDeleteToast —— 「删除 = 行滑出 + 5 秒可撤销 toast + 超时才真发 DELETE」原语
 *
 * 约定：
 *   - toast 形态：白底卡片 / 状态图标 / 末尾 --info 蓝字「撤销」
 *   - 停留时长：可撤销 5000ms，普通 2600ms
 *   - 撤销语义：撤销 = 恢复列表，且**根本没发过请求**
 *
 * ★ 与「先删后补」的关键区别：
 *   点删除**不立刻发 DELETE**。先本地把行标记为 gone（行滑出 .2s），弹可撤销 toast；
 *   5 秒内点「撤销」→ 行复原、一个请求都没发；5 秒到 → 才真正 `commit()` 发 DELETE。
 *   这样撤销是零成本的，不需要后端提供「恢复」接口。
 *
 * ────────────────────────── 用法示例 ──────────────────────────
 * ```vue
 * <script setup lang="ts">
 * import { useDcDeleteToast } from "@/components/dc-shell/dcDeleteToast";
 * import { delObj } from "@/api/upms/role";
 *
 * // rowKey 默认 "id"；主键字段不叫 id 的表要显式传
 * const { visibleRows, requestDelete } = useDcDeleteToast(() => tableData.value, { rowKey: "id" });
 *
 * function handleDel(row: any) {
 *   requestDelete(row, {
 *     // 真正的 DELETE —— 只有 5 秒内没被撤销才会被调用
 *     commit: () => delObj([row.id]),
 *     message: "已删除",
 *     // 提交成功后刷新列表（可选；不刷新也行，本地已经把行藏掉了）
 *     onCommitted: () => getList(page),
 *   });
 * }
 * </script>
 *
 * <template>
 *   <!-- ⚠ 表格 :rows 必须换成 visibleRows，否则行不会滑出 -->
 *   <DcTableShell :rows="visibleRows" :total="page.total" …>
 *     <template #col-acts="{ row }">
 *       <DcOverflowActions :actions="actsOf(row)" :row-key="row.id" />
 *     </template>
 *   </DcTableShell>
 * </template>
 * ```
 *
 * 高危对象（角色 / 机构…）先过 DangerConfirm 的 verify 闸门，再进本原语：
 * ```ts
 * // 确认框只有 title + desc（+ 高危时的 verify），不要传 actionName
 * await useDangerConfirm({ title: "删除确认(高危)", desc: "…", verify: row.name });
 * requestDelete(row, { commit: () => delObj(row.id) });
 * ```
 * ─────────────────────────────────────────────────────────────
 */
import { computed, onBeforeUnmount, ref } from "vue";
import type { Ref } from "vue";

/** 可撤销 toast 的停留时长（ms）；无撤销的普通 toast 用 DC_TOAST_MS */
export const DC_TOAST_UNDO_MS = 5000;
export const DC_TOAST_MS = 2600;
/** 行滑出动画时长（ms），与 CSS keyframes 保持一致 */
const ROW_OUT_MS = 200;

export type DcToastKind = "ok" | "err" | "warn";

const STYLE_ID = "dc-toast-style";

/** 一次性注入 toast / 行滑出的 keyframes（组件样式表不方便放，且要全局可用） */
function ensureStyle() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
@keyframes dc-toast-in { from { opacity:0; transform:translate(-50%,-8px); } to { opacity:1; transform:translate(-50%,0); } }
@keyframes dc-toast-out { from { opacity:1; transform:translate(-50%,0); } to { opacity:0; transform:translate(-50%,-8px); } }
/* 行滑出：.2s 向右淡出并压扁高度。页面把待删行加上这个 class 即可，
   实际由 useDcDeleteToast 通过 rowClass 自动挂。 */
@keyframes dc-row-out { to { opacity:0; transform:translateX(24px); } }
.dc-row--gone { pointer-events:none; animation: dc-row-out ${ROW_OUT_MS}ms ease forwards; }
`;
  document.head.appendChild(el);
}

const ICONS: Record<DcToastKind, string> = {
  ok: '<circle cx="12" cy="12" r="10" fill="var(--dc-success)"></circle><path d="M7.5 12.5l3 3 6-6.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>',
  err: '<circle cx="12" cy="12" r="10" fill="var(--dc-danger)"></circle><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="#fff" stroke-width="2.2" stroke-linecap="round"></path>',
  warn: '<circle cx="12" cy="12" r="10" fill="var(--dc-warning)"></circle><path d="M12 7v6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"></path><path d="M12 16.4v.1" stroke="#fff" stroke-width="2.4" stroke-linecap="round"></path>',
};

/**
 * 当前屏幕上那一条 toast —— 同时只存在一条，新的会顶掉旧的。
 *
 * ⚠ `onSupersede`：被顶掉的那条**必须先把 onExpire 跑掉**。
 * 连删两行时第二条 toast 会顶掉第一条，若只是清定时器 + 移除 DOM，
 * 第一行的 DELETE 就永远发不出去 —— 用户看到行没了、刷新后又回来了。
 * 顶掉 = 提前到期（撤销窗口结束），不是取消。
 */
let activeToast: { el: HTMLElement; timers: number[]; onSupersede?: () => void } | null = null;

function killActiveToast(supersede = true) {
  if (!activeToast) return;
  const t = activeToast;
  activeToast = null;
  t.timers.forEach((id) => clearTimeout(id));
  t.el.remove();
  if (supersede) t.onSupersede?.();
}

export interface DcToastOptions {
  kind?: DcToastKind;
  /** 传了就出末尾的「撤销」蓝字；点它执行本回调并立刻收起 toast */
  undo?: () => void;
  /** toast 自然消失（= 未被撤销）时回调；撤销路径**不会**触发 */
  onExpire?: () => void;
  /** 覆盖停留时长；缺省按有无 undo 取 5000 / 2600 */
  duration?: number;
}

/**
 * 弹一条 DC 风格 toast（自绘 DOM，不走 ElMessage —— EP 皮肤没有「撤销」这一段，
 * 且顶部位置/阴影/圆角与设计体系对不上）。
 * 返回一个函数：调用它可提前收起（不触发 onExpire）。
 */
export function dcToast(text: string, options: DcToastOptions = {}): () => void {
  if (typeof document === "undefined") return () => {};
  ensureStyle();
  killActiveToast();

  const kind = options.kind || "ok";
  const dur = options.duration ?? (options.undo ? DC_TOAST_UNDO_MS : DC_TOAST_MS);

  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.style.cssText =
    "position:fixed;top:76px;left:50%;transform:translateX(-50%);z-index:2400;" +
    "display:flex;align-items:center;gap:8px;padding:9px 16px;font-size:14px;" +
    "color:var(--dc-text-1);background:var(--dc-surface);border:1px solid var(--dc-border);" +
    "border-radius:6px;box-shadow:0 8px 24px rgb(0 0 0 / 12%);animation:dc-toast-in 200ms ease;";
  el.innerHTML =
    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="flex:none;">${ICONS[kind]}</svg>` +
    `<span></span>`;
  // textContent 而不是 innerHTML：文案可能含后端返回的 msg，不能当 HTML 解析
  (el.lastElementChild as HTMLElement).textContent = text;

  const timers: number[] = [];
  /** 到期只能跑一次：自然到期 / 被顶掉 / flush() 三条路径共用这个闸 */
  let expired = false;
  function expire() {
    if (expired) return;
    expired = true;
    options.onExpire?.();
  }
  const self = { el, timers, onSupersede: expire };
  activeToast = self;

  /** 收起动画后移除；only 表示「这条还是当前这条」时才动手 */
  function dismiss() {
    if (activeToast !== self) return;
    el.style.animation = "dc-toast-out 185ms ease forwards";
    timers.push(
      window.setTimeout(() => {
        if (activeToast === self) {
          el.remove();
          activeToast = null;
        }
      }, 185),
    );
  }

  if (options.undo) {
    const btn = document.createElement("span");
    btn.textContent = "撤销";
    btn.style.cssText = "color:var(--dc-info);font-weight:400;cursor:pointer;white-space:nowrap;";
    btn.addEventListener("click", () => {
      // 先关死到期闸 + 掐掉定时器，避免撤销后 onExpire 仍然把 DELETE 发出去
      expired = true;
      timers.forEach((t) => clearTimeout(t));
      self.onSupersede = undefined;
      options.undo?.();
      dismiss();
    });
    el.appendChild(btn);
  }

  document.body.appendChild(el);

  timers.push(
    window.setTimeout(() => {
      expire();
      dismiss();
    }, dur),
  );

  /** 提前收起：**不**触发 onExpire（用于「已经在别处提交过了」的收尾） */
  return () => {
    expired = true;
    self.onSupersede = undefined;
    timers.forEach((t) => clearTimeout(t));
    dismiss();
  };
}

export interface DcDeleteRequest {
  /** 真正的删除请求 —— **只有** 5 秒内未被撤销才会被调用 */
  commit: () => Promise<unknown>;
  /** toast 文案，缺省「已删除」；解绑等场景传「已解绑」 */
  message?: string;
  /** commit 成功后（一般用来重新拉列表 / 刷新 total） */
  onCommitted?: () => void;
  /** commit 失败后（原语已把行复原并弹了错误 toast，这里只做页面自己的收尾） */
  onFailed?: (e: unknown) => void;
}

export interface DcDeleteToastOptions {
  /** 行主键字段，缺省 "id" */
  rowKey?: string;
}

/**
 * 删除撤销原语的组合式封装。
 *
 * @param source 列表数据的取值函数（`() => tableData.value`）——不要传 ref 的 .value，
 *               否则换页后拿到的还是旧数组。
 * @returns
 *   - `visibleRows` 过滤掉「已 gone 且动画播完」的行，直接喂给 `DcTableShell :rows`
 *   - `rowClass`    传给 `DcTableShell :row-class`，负责给待删行挂滑出动画
 *   - `requestDelete(row, req)` 发起一次可撤销删除
 *   - `flush()`     立刻把所有待提交的删除提交掉（离开页面前壳内已自动调用）
 */
export function useDcDeleteToast(
  source: () => any[],
  options: DcDeleteToastOptions = {},
) {
  const rowKey = options.rowKey || "id";
  /** 正在滑出/待提交的行主键 */
  const goneKeys = ref<any[]>([]) as Ref<any[]>;
  /** 已提交/已彻底移除的行主键（滑出动画结束后进入，行才真正从列表里消失） */
  const removedKeys = ref<any[]>([]) as Ref<any[]>;
  /** key → 待执行的提交函数，flush() 与卸载时用 */
  const pending = new Map<any, () => void>();

  const visibleRows = computed(() =>
    source().filter((r) => !removedKeys.value.includes(r?.[rowKey])),
  );

  function rowClass(row: any) {
    return goneKeys.value.includes(row?.[rowKey]) ? "dc-row--gone" : "";
  }

  function requestDelete(row: any, req: DcDeleteRequest) {
    const key = row?.[rowKey];
    if (key === undefined || key === null || pending.has(key)) return;

    ensureStyle();
    // ① 本地标 gone → 行播 .2s 滑出，动画结束后从 visibleRows 里摘掉
    goneKeys.value = [...goneKeys.value, key];
    const outTimer = window.setTimeout(() => {
      removedKeys.value = [...removedKeys.value, key];
    }, ROW_OUT_MS);

    function restore() {
      clearTimeout(outTimer);
      pending.delete(key);
      goneKeys.value = goneKeys.value.filter((k) => k !== key);
      removedKeys.value = removedKeys.value.filter((k) => k !== key);
    }

    async function commit() {
      pending.delete(key);
      try {
        await req.commit();
        req.onCommitted?.();
      } catch (e) {
        // 请求失败 → 行复原，并把后端 msg 透出（只有非 Error 且带 msg 才补 toast）
        restore();
        if (typeof e === "object" && e !== null && !(e instanceof Error) && (e as any).msg) {
          dcToast(String((e as any).msg), { kind: "err" });
        }
        req.onFailed?.(e);
      }
    }

    pending.set(key, commit);

    // ② 5 秒可撤销 toast；③ 超时才真发 DELETE
    dcToast(req.message || "已删除", {
      kind: "ok",
      undo: restore,
      onExpire: commit,
    });
  }

  /** 把所有还没到期的删除立刻提交（防止用户切页导致「以为删了其实没删」） */
  function flush() {
    const fns = Array.from(pending.values());
    pending.clear();
    fns.forEach((fn) => fn());
  }

  onBeforeUnmount(() => {
    killActiveToast();
    flush();
  });

  return { visibleRows, rowClass, requestDelete, flush, goneKeys, removedKeys };
}
