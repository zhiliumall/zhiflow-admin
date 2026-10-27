<!-- 首次登录 / 管理员重置口令后必须先改密码。
     后端登录接口对带「下次登录前必须修改密码」标记的账号返回 errCode=credentials_expired，
     登录页据此打开本弹窗；提交 `PUT /upms/user/password/expired`（免登录，凭原口令），成功后用新密码重新登录。 -->
<template>
  <div v-if="open" class="hl-mask hl-mask--forgot">
    <div class="hl-dialog hl-forgot">
      <div class="hl-forgot-head">
        <span>首次登录请修改密码</span>
        <button class="hl-closebtn" aria-label="关闭" @click="emit('close')">×</button>
      </div>
      <div class="hl-forgot-form">
        <input
          :value="username"
          class="hl-forgot-input"
          disabled
          autocomplete="username"
        />
        <input
          v-model="pwd"
          class="hl-forgot-input"
          type="password"
          placeholder="新密码（8～64 位）"
          autocomplete="new-password"
        />
        <input
          v-model="pwd2"
          class="hl-forgot-input"
          type="password"
          placeholder="再次输入新密码"
          autocomplete="new-password"
          @keydown.enter="submit"
        />
        <div v-if="err" class="hl-forgot-err">{{ err }}</div>
        <button class="hl-forgot-submit" :disabled="submitting" @click="submit">
          {{ submitting ? "提交中…" : "修改密码" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { changeExpiredPassword } from "@/api/upms/user";

defineOptions({ name: "LoginExpiredPasswordDialog" });

const props = defineProps<{
  open: boolean;
  username: string;
  /** 用户刚才输入的原口令（首启口令或管理员重置的口令） */
  password: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "changed", newPassword: string): void;
}>();

const pwd = ref("");
const pwd2 = ref("");
const err = ref("");
const submitting = ref(false);

watch(
  () => props.open,
  (v) => {
    if (v) {
      pwd.value = "";
      pwd2.value = "";
      err.value = "";
    }
  },
);

async function submit() {
  if (submitting.value) return;
  if (pwd.value.length < 8 || pwd.value.length > 64) {
    err.value = "新密码长度 8～64 位";
    return;
  }
  if (pwd.value !== pwd2.value) {
    err.value = "两次输入的新密码不一致";
    return;
  }
  if (pwd.value === props.password) {
    err.value = "新密码不能与原密码相同";
    return;
  }
  err.value = "";
  submitting.value = true;
  try {
    const res: any = await changeExpiredPassword({
      username: props.username,
      password: props.password,
      newPassword: pwd.value,
    });
    if (res?.code === 0) {
      emit("changed", pwd.value);
    } else {
      err.value = res?.msg || "修改失败";
    }
  } catch (e: any) {
    err.value =
      typeof e === "string" ? e : e?.data?.msg || e?.msg || "修改失败，请稍后重试";
  } finally {
    submitting.value = false;
  }
}
</script>
