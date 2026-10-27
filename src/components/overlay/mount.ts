/**
 * 命令式挂载 overlay 组件（L1 气泡 / L3 闸门用）
 *
 * 这两件不走 ElMessageBox：
 *   · L1 气泡要按触发元素定位，MessageBox 只能居中；
 *   · L3 闸门要「逐字输入前主按钮禁用」，MessageBox 的按钮态不可控。
 * 故自建挂载点，组件通过 onResolve / onReject 回传结果，用完即卸载。
 */
import { createApp, type Component } from "vue";

export function mountOverlay<T>(
  comp: Component,
  props: Record<string, unknown> = {},
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    let closed = false;
    const teardown = () => {
      if (closed) return;
      closed = true;
      // 让离场动画跑完再卸载
      setTimeout(() => {
        app.unmount();
        host.remove();
      }, 160);
    };

    const app = createApp(comp, {
      ...props,
      onResolve: (v: T) => {
        teardown();
        resolve(v);
      },
      onReject: (reason?: unknown) => {
        teardown();
        reject(reason ?? "cancel");
      },
    });

    app.mount(host);
  });
}
