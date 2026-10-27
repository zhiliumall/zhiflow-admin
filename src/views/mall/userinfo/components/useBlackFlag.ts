import { ElMessage } from "element-plus";
import { putBlackFlag } from "@/api/mall/userinfo";
import { appConfirm } from "@/components/overlay";

/**
 * 会员拉黑 / 恢复（PUT /mall/userinfo/black）。
 * blackFlag：'1' 已拉黑，其余视为正常。拉黑需二次确认，恢复直接执行。
 */
export function useBlackFlag() {
  function isBlack(user: { blackFlag?: string } | null | undefined) {
    return user?.blackFlag === "1";
  }

  /** 切换黑名单状态；成功后就地更新 user.blackFlag。用户取消确认时 reject。 */
  async function toggleBlack(user: { id: string; blackFlag?: string }) {
    const next: "0" | "1" = isBlack(user) ? "0" : "1";
    if (next === "1") {
      await appConfirm({
        intent: "danger",
        title: "确定拉黑该会员吗？",
        body: "拉黑后该会员将无法下单，可随时恢复。",
        verb: "拉黑",
      });
    }
    await putBlackFlag({ id: user.id, blackFlag: next });
    user.blackFlag = next;
    ElMessage.success(next === "1" ? "已拉黑" : "已恢复");
  }

  return { isBlack, toggleBlack };
}
