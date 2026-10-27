import { onScopeDispose, ref, watch, type Ref } from "vue";

export type LoadingStage = "none" | "spinner" | "skeleton";

/**
 * 加载反馈分级（设计规范）：
 * 0–300ms 无反馈 → 300ms–1s 转圈（12px/2px 描边/0.7s 每转）→ >1s 骨架屏
 */
export function useLoadingStage(loading: Ref<boolean>) {
  const stage = ref<LoadingStage>("none");
  let spinnerTimer: number | undefined;
  let skeletonTimer: number | undefined;

  const clearTimers = () => {
    window.clearTimeout(spinnerTimer);
    window.clearTimeout(skeletonTimer);
  };

  watch(
    loading,
    (val) => {
      clearTimers();
      stage.value = "none";
      if (val) {
        spinnerTimer = window.setTimeout(() => {
          stage.value = "spinner";
        }, 300);
        skeletonTimer = window.setTimeout(() => {
          stage.value = "skeleton";
        }, 1000);
      }
    },
    { immediate: true },
  );

  onScopeDispose(clearTimers);
  return { stage };
}
