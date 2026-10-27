import { createApp, h, ref } from "vue";
import dangerConfirm from "./src/index.vue";
import type { DangerConfirmPayload } from "./src/index.vue";

/** 危险操作确认组件（模板内使用） */
export const DangerConfirm = dangerConfirm;

export type { DangerConfirmPayload };

export interface DangerConfirmOptions {
  /** 弹窗标题，默认「危险操作确认」；高危删除用「删除确认(高危)」 */
  title?: string;
  /** 操作名（醒目展示）；标准确认框没有这一行，一般不传 */
  actionName?: string;
  /** 影响面描述（旧 API，等价于 desc） */
  impact?: string;
  /** 必须逐字输入的指定名称（旧 API；传空串 = 闸门永久关闭） */
  requireTypedName?: string;
  /** 后果说明（渲染在标题下方） */
  desc?: string;
  /** 高危闸门文本；不传 = 无闸门 */
  verify?: string;
  confirmText?: string;
  cancelText?: string;
}

/**
 * 函数式调用危险操作确认弹窗。
 * 语义对齐 ElMessageBox.confirm：确认 resolve（附 { typedName, impact, ts }），
 * 取消/关闭 reject("cancel")，既有 `.catch(() => {})` / `error !== 'cancel'` 模式无需改动。
 * 本函数不做权限判断，只做交互闸门；服务端鉴权与 @SysLog 审计不受影响。
 *
 * ─── 高危删除用法 ───
 * ```ts
 * await useDangerConfirm({
 *   title: "删除确认(高危)",
 *   // desc 写清后果，不可恢复的要明说
 *   desc: "删除后该分组下的素材将一并移除,不可恢复。",
 *   verify: row.name,        // 用户必须逐字输入这个值，确认钮才可点
 *   confirmText: "确定",
 * });
 * // 通过闸门后再进删除撤销原语
 * requestDelete(row, { commit: () => delObj(row.id) });
 * ```
 * 普通删除（非高危对象）：不传 `verify` 即可，只出 desc + 确定/取消。
 */
export function useDangerConfirm(
  options: DangerConfirmOptions
): Promise<DangerConfirmPayload> {
  return new Promise((resolve, reject) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const visible = ref(true);
    let disposed = false;

    const dispose = () => {
      if (disposed) return;
      disposed = true;
      app.unmount();
      host.remove();
    };

    // closed（动画结束）为主路径；异常场景（jsdom 无动画等）用定时器兜底
    const scheduleDispose = () => {
      setTimeout(dispose, 1000);
    };

    const app = createApp({
      name: "DangerConfirmHost",
      setup() {
        return () =>
          h(dangerConfirm, {
            ...options,
            modelValue: visible.value,
            "onUpdate:modelValue": (value: boolean) => {
              visible.value = value;
            },
            onConfirm: (payload: DangerConfirmPayload) => {
              resolve(payload);
              scheduleDispose();
            },
            onCancel: () => {
              reject("cancel");
              scheduleDispose();
            },
            onClosed: dispose,
          });
      },
    });
    app.mount(host);
  });
}

export default DangerConfirm;
