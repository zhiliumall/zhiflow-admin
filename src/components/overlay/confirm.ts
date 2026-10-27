/**
 * 全站 · 二次确认单一入口（三级摩擦 × 四意图）
 *
 * 确认弹窗统一骨架：
 *   L1 appPopConfirm    行内轻操作气泡（AppPopConfirm.vue）
 *   L2 appConfirm       416 骨架，本文件主体
 *   L3 appDangerConfirm 460 逐字输入闸门（AppGate.vue），返回审计 payload
 *
 * 命名：这套统一件一律用 app* 前缀（appConfirm / appPopConfirm / appDangerConfirm）。
 *
 * 底座仍是 ElMessageBox：Promise 语义与既有 `.catch(() => {})` 写法完全一致
 * （取消 / 关闭 → reject），迁移不动业务分支。
 *
 * ⚠️ 不传 EP 的 `type`：传了会在正文行首另插一个图标，与 40px 意图圆重复。
 * ⚠️ `title` 必须传空串而非 undefined：EP 的 header 是 `v-if="title != null"`，
 *    而右上角 ✕ 长在 header 里，传 undefined 会连关闭钮一起消失。
 * ⚠️ `autofocus: false`：**危险主按钮不做默认焦点**，防回车误触。
 * ⚠️ 带输入变体必须传 `boxType: "prompt"`：EP 的 validate() 首行就是
 *    `if (props.boxType === "prompt")`，不传则 inputValidator 永不执行（空值直接放行）。
 */
import { ElMessageBox } from "element-plus";
import { defineComponent, h, nextTick, onMounted, ref, type VNode } from "vue";

import AppGate from "./AppGate.vue";
import AppPopConfirm from "./AppPopConfirm.vue";
import { FIXED_VERB, INTENT_ICON_PATHS, INTENT_OK_CLASS, type AppIntent } from "./intent";
import { mountOverlay } from "./mount";

export interface AppConfirmInput {
  placeholder?: string;
  /** 多行原因用 "textarea"（EP 原生能力，透传） */
  type?: "text" | "textarea";
  /** 默认 true：空值不可提交（原 8 处 prompt 的既有约束） */
  required?: boolean;
  /** 默认「请输入内容」 */
  errorText?: string;
  pattern?: RegExp;
  value?: string;
}

export interface AppConfirmOptions {
  /** 必填。选级规则见 intent.ts 的 INTENT_RULE */
  intent: AppIntent;
  /** 「动词 + 宾语?」，原样展示，禁止 .replace 改写 */
  title: string;
  /** 未传不显示，不自动补文案（不自动加恐吓性说明） */
  body?: string;
  /** 主按钮动词；intent=delete 时固定「删除」，传入值被忽略 */
  verb: string;
  cancelText?: string;
  /** 批量条数 → 正文追加「共 N 条」；≥20 请改走 appDangerConfirm */
  count?: number;
  /** 追加「该操作不可撤销。」 */
  irreversible?: boolean;
  /** delete 专用：**真实存在回收站时**才传，如「回收站保留 30 天」 */
  recycle?: string;
  /** 影响面红块，仅在真实存在影响面时传 */
  impact?: string;
  /** 传入即走带输入变体（替代 ElMessageBox.prompt） */
  input?: AppConfirmInput;
}

const ICON_SIZE = 19; // 40px 圆内嵌 19×19、stroke-width 2

function intentIcon(intent: AppIntent): VNode {
  return h("div", { class: "app-confirm__icon" }, [
    h(
      "svg",
      {
        width: ICON_SIZE,
        height: ICON_SIZE,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      },
      INTENT_ICON_PATHS[intent].map((d) => h("path", { d })),
    ),
  ]);
}

/** 正文行：body → 回收站承诺 → 共 N 条 → 不可撤销 */
function bodyRows(o: AppConfirmOptions): VNode[] {
  const rows: VNode[] = [];
  if (o.body) rows.push(h("div", o.body));
  if (o.intent === "delete" && o.recycle) rows.push(h("div", o.recycle));
  if (typeof o.count === "number") {
    rows.push(h("div", { class: "app-confirm__count" }, ["共 ", h("b", String(o.count)), " 条"]));
  }
  if (o.irreversible) {
    rows.push(h("div", { class: "app-confirm__irreversible" }, "该操作不可撤销。"));
  }
  return rows;
}

/** 副文案块：超长时 clamp 三行 + 「详情」展开（最多三行，超出折叠）。
 * 是否真的需要「详情」按实际渲染是否溢出三行判定（scrollHeight vs clientHeight），
 * 不再按字符数猜——字符数阈值对中日文/全角标点的实际占宽误差很大，56 字这种边界文案
 * 常常本来就没超三行，点「详情」也不会多出内容。 */
const ConfirmBody = defineComponent({
  name: "AppConfirmBody",
  props: {
    rows: { type: Array as () => VNode[], required: true },
  },
  setup(props) {
    const expanded = ref(false);
    const overflowed = ref(false);
    const bodyRef = ref<HTMLElement | null>(null);

    onMounted(() => {
      void nextTick(() => {
        const el = bodyRef.value;
        if (el) overflowed.value = el.scrollHeight > el.clientHeight + 1;
      });
    });

    return () =>
      h("div", null, [
        h(
          "div",
          {
            ref: bodyRef,
            class: ["app-confirm__body", !expanded.value ? "app-confirm__body--clamp" : ""],
          },
          props.rows,
        ),
        overflowed.value
          ? h(
              "div",
              {
                class: "app-confirm__more",
                onClick: () => (expanded.value = !expanded.value),
              },
              expanded.value ? "收起" : "详情",
            )
          : null,
      ]);
  },
});

function buildMessage(o: AppConfirmOptions): VNode {
  const children: VNode[] = [
    h("div", { class: "app-confirm__headline" }, [
      intentIcon(o.intent),
      h("div", { class: "app-confirm__title" }, o.title),
    ]),
  ];

  const rows = bodyRows(o);
  if (rows.length) children.push(h(ConfirmBody, { rows }));
  if (o.impact) children.push(h("div", { class: "app-confirm__impact" }, o.impact));

  return h("div", { class: "app-confirm__inner" }, children);
}

function buildValidator(input: AppConfirmInput) {
  const required = input.required !== false;
  const errorText = input.errorText ?? "请输入内容";

  return (value: string): boolean | string => {
    const v = (value ?? "").trim();
    if (required && !v) return errorText;
    if (input.pattern && !input.pattern.test(v)) return errorText;
    return true;
  };
}

/**
 * discard 主次反转（「修改尚未保存」件）：
 *   主按钮 =「继续编辑」（primary + 默认焦点），次按钮走普通取消钮样式
 *   （常规 app-confirm__cancel 灰底/蓝底hover，与其它弹窗的「取消」钮保持统一）。
 * 对外仍保持「resolve = 执行 verb（放弃修改）」，与其余三个 intent 一致，
 * 免得调用方为单个 intent 反着写分支。
 * ESC / ✕ / 遮罩 → 'close'（distinguishCancelAndClose: true），一律按安全动作
 * 「继续编辑」处理 → reject。
 */
function discardConfirm(o: AppConfirmOptions): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    ElMessageBox({
      title: "",
      message: buildMessage(o),
      customClass: "app-confirm app-confirm--discard",
      modalClass: "app-confirm-mask",
      showClose: true,
      showCancelButton: true,
      confirmButtonText: "继续编辑",
      cancelButtonText: o.verb || "放弃修改",
      confirmButtonClass: INTENT_OK_CLASS.discard,
      cancelButtonClass: "app-confirm__cancel",
      autofocus: true, // 反转后主按钮是安全动作，可默认聚焦
      distinguishCancelAndClose: true,
      closeOnClickModal: true,
      closeOnPressEscape: true,
    })
      .then(() => reject("keep-editing"))
      .catch((action) => (action === "cancel" ? resolve() : reject(action)));
  });
}

export function appConfirm(o: AppConfirmOptions & { input: AppConfirmInput }): Promise<{ value: string }>;
export function appConfirm(o: AppConfirmOptions): Promise<void>;
export function appConfirm(o: AppConfirmOptions): Promise<void | { value: string }> {
  // 降级链第 2 级：未声明 intent → 回落原生 ElMessageBox，不换皮不改文案
  // ——宁可样式旧，不可语义错。
  if (!o.intent) {
    console.warn("[appConfirm] 未声明 intent，已回落原生 ElMessageBox", o.title);
    return ElMessageBox.confirm(o.body ?? "", o.title, {
      confirmButtonText: o.verb,
      cancelButtonText: o.cancelText ?? "取消",
    }).then(() => undefined);
  }

  if (o.intent === "discard") return discardConfirm(o);

  return ElMessageBox({
    title: "",
    message: buildMessage(o),
    customClass: `app-confirm app-confirm--${o.intent}`,
    modalClass: "app-confirm-mask",
    showClose: true,
    showCancelButton: true,
    confirmButtonText: FIXED_VERB[o.intent] ?? o.verb,
    cancelButtonText: o.cancelText ?? "取消",
    confirmButtonClass: INTENT_OK_CLASS[o.intent],
    cancelButtonClass: "app-confirm__cancel",
    // 危险主按钮不做默认焦点；ESC / 遮罩 / ✕ 三者等价「取消」
    autofocus: false,
    distinguishCancelAndClose: false,
    closeOnClickModal: true,
    closeOnPressEscape: true,
    ...(o.input
      ? {
          // ⚠️ boxType 必须显式给 'prompt'：EP 的 validate() 首行就是
          // `if (props.boxType === 'prompt')`，通用 ElMessageBox() 调用不带 boxType，
          // inputValidator 根本不会执行 —— 空值点主按钮会直接关窗放行
          // （「原因必填」之类的校验会失效）。
          boxType: "prompt",
          showInput: true,
          inputType: o.input.type ?? "text",
          inputPlaceholder: o.input.placeholder,
          inputValue: o.input.value,
          inputValidator: buildValidator(o.input),
        }
      : {}),
  }).then((res) => (o.input ? { value: String(res.value ?? "") } : undefined));
}

/* ============================================================
   L3 · 危险闸门（460 逐字输入解锁）
   触发规则：不可逆 / 资金 / 批量 ≥20 / 影响前台可见性
   ============================================================ */
export interface AppGateOptions {
  /** 需要逐字输入的名称（活动名 / 用户名 / 单号…） */
  name: string;
  /** 影响面，必填：闸门级操作必须写清后果 */
  impact: string;
  /** 默认「停用「name」?」 */
  title?: string;
  /** 主按钮动词，默认「停用」 */
  verb?: string;
  /** 图标形状与配色，默认 danger（停用/电源）；物理删除请传 "delete"（红色垃圾桶） */
  intent?: AppIntent;
}

export interface AppGateResult {
  typedName: string;
  impact: string;
  ts: number;
}

/** resolve 的 payload 供调用方随请求落审计日志 */
export function appDangerConfirm(o: AppGateOptions): Promise<AppGateResult> {
  return mountOverlay<AppGateResult>(AppGate, {
    name: o.name,
    impact: o.impact,
    title: o.title ?? `停用「${o.name}」？`,
    verb: o.verb ?? "停用",
    intent: o.intent ?? "danger",
  });
}

/* ============================================================
   L1 · 行内气泡（轻操作，锚定触发元素）
   ============================================================ */
export interface AppPopOptions {
  title: string;
  verb: string;
  cancelText?: string;
}

export function appPopConfirm(anchorEl: HTMLElement, o: AppPopOptions): Promise<void> {
  return mountOverlay<void>(AppPopConfirm, {
    anchor: anchorEl,
    title: o.title,
    verb: o.verb,
    cancelText: o.cancelText ?? "取消",
  });
}
