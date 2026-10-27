<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
  <div>
    <el-tabs v-model="switchStatus" type="border-card" style="

--el-tabs-header-width: fit-content" class="pill-tabs">
      <el-tab-pane :label="$t('upms.user.basicInfo')" name="userManager">
        <div class="user-basic">
          <el-form v-if="switchStatus === 'userManager'" ref="ruleFormRef" class="user-basic__form" :model="ruleForm"
            :rules="rulesBase" label-width="112px" label-position="left">
            <el-form-item prop="avatar">
              <template #label>
                <div class="user-basic__label">
                  <el-icon>
                    <User />
                  </el-icon>
                  <span class="user-basic__label-text">{{ $t("upms.user.avatar") }}</span>
                </div>
              </template>
              <div class="user-basic__avatar">
                <div class="user-basic__avatar-row">
                  <MaterialSingle v-model:value="ruleForm.avatar" :action-url="avatarUploadAction" :need-token="true"
                    :file-size="website.limitUploadImageSize" :width="88" :height="88" />
                  <div v-if="!ruleForm.avatar" class="user-basic__avatar-tip">
                    不能上传大于{{ website.limitUploadImageSize }}M的文件
                  </div>
                </div>
              </div>
            </el-form-item>

            <el-form-item prop="username">
              <template #label>
                <div class="user-basic__label">
                  <el-icon>
                    <User />
                  </el-icon>
                  <span class="user-basic__label-text">{{ $t("upms.user.username") }}</span>
                </div>
              </template>
              <el-input v-model="ruleForm.username" type="text" disabled />
            </el-form-item>

            <el-form-item prop="nickName">
              <template #label>
                <div class="user-basic__label">
                  <el-icon>
                    <EditPen />
                  </el-icon>
                  <span class="user-basic__label-text">{{ $t("upms.user.nickname") }}</span>
                </div>
              </template>
              <el-input v-model="ruleForm.nickName" maxlength="20" :placeholder="$t('upms.user.enterNickname')" />
            </el-form-item>

            <!-- 手机号 / 邮箱由管理员在「管理员」页维护，这里只读 -->
            <el-form-item>
              <template #label>
                <div class="user-basic__label">
                  <el-icon>
                    <Iphone />
                  </el-icon>
                  <span class="user-basic__label-text">{{ $t("upms.user.phone") }}</span>
                </div>
              </template>
              <el-input :model-value="userInfo.phone || '—'" disabled />
            </el-form-item>

            <el-form-item>
              <template #label>
                <div class="user-basic__label">
                  <el-icon>
                    <Message />
                  </el-icon>
                  <span class="user-basic__label-text">{{ $t("upms.user.email") }}</span>
                </div>
              </template>
              <el-input :model-value="userInfo.email || '—'" disabled />
            </el-form-item>

            <el-form-item>
              <div class="user-basic__submit">
                <el-button type="primary" :loading="loading" class="user-basic__submit-btn"
                  @click="submitForm(ruleFormRef, 'info')"><el-icon class="mr-2">
                    <Check />
                  </el-icon>
                  {{ $t("commons.submit") }}</el-button>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
      <el-tab-pane :label="$t('upms.user.changePwd')" name="passwordManager">
        <div class="user-password">
          <el-form v-if="switchStatus === 'passwordManager'" ref="ruleFormPwdRef" class="user-password__form"
            :model="pwdForm" :rules="rules" label-position="top">
            <div class="user-password__header">
              <h2 class="user-password__title">修改密码</h2>
              <p class="user-password__desc">
                修改成功后需要重新登录
              </p>
            </div>

            <el-form-item prop="password">
              <template #label>
                <div class="user-password__label">
                  <el-icon>
                    <Lock />
                  </el-icon>
                  <span>{{ $t("upms.user.oldPwd") }}</span>
                </div>
              </template>
              <el-input v-model="pwdForm.password" type="password" show-password
                :placeholder="$t('upms.user.oldPwd')" />
            </el-form-item>

            <el-form-item prop="newpassword1">
              <template #label>
                <div class="user-password__label">
                  <el-icon>
                    <Key />
                  </el-icon>
                  <span>{{ $t("upms.user.newPwd") }}</span>
                </div>
              </template>
              <el-input v-model="pwdForm.newpassword1" type="password" show-password
                :placeholder="$t('upms.user.newPwd')" />
            </el-form-item>

            <el-form-item prop="newpassword2">
              <template #label>
                <div class="user-password__label">
                  <el-icon>
                    <Key />
                  </el-icon>
                  <span>{{ $t("upms.user.confirmPwd") }}</span>
                </div>
              </template>
              <el-input v-model="pwdForm.newpassword2" type="password" show-password
                :placeholder="$t('upms.user.confirmPwd')" />
            </el-form-item>

            <el-form-item>
              <div class="user-password__submit">
                <el-button type="primary" :loading="loading" class="user-password__submit-btn"
                  @click="submitForm(ruleFormPwdRef, 'password')"><el-icon class="mr-2">
                    <Check />
                  </el-icon>
                  {{ $t("commons.submit") }}</el-button>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
<script lang="ts" setup>
/**
 * 个人信息：改资料（头像 / 昵称）与改密码，都走 PUT /upms/user/edit。
 * 后端按登录态取用户；改密时带原密码 password + 新密码 newpassword1，原密码不对会拒绝。
 */
import { editObj } from "@/api/upms/user";
import MaterialSingle from "@/components/material/single-img-upload.vue";
import website from "@/config/website";
import { useUserStoreHook } from "@/store/modules/user";
import { apiUrl } from "@/utils/http/apiUrl";
import { Check, EditPen, Iphone, Key, Lock, Message, User } from "@element-plus/icons-vue";
import { computed, getCurrentInstance, ref } from "vue";

defineOptions({ name: "UserInfo" })

const { proxy } = getCurrentInstance()!;

const userInfo = computed(() => useUserStoreHook().userInfo as any);

const switchStatus = ref("userManager");
const loading = ref(false);
const ruleFormRef = ref<any>();
const ruleFormPwdRef = ref<any>();

const ruleForm = ref<any>({
  username: userInfo.value.username,
  nickName: userInfo.value.nickName,
  avatar: userInfo.value.avatar != null ? userInfo.value.avatar : "",
});
const pwdForm = ref({
  password: "",
  newpassword1: "",
  newpassword2: "",
});

const validatePass = (rule: any, value: string, callback: any) => {
  if (!value) {
    callback(new Error(proxy?.$t("commons.notNull")));
  } else if (value !== pwdForm.value.newpassword1) {
    callback(new Error(proxy?.$t("upms.user.pwdNotMatch")));
  } else {
    callback();
  }
};

const rulesBase = ref({
  nickName: [
    {
      required: true,
      message: proxy?.$t("upms.user.enterNickname"),
      trigger: "blur",
    },
  ],
});
const rules = ref({
  password: [
    {
      required: true,
      min: 6,
      message: proxy?.$t("upms.user.oldPwdReq"),
      trigger: "change",
    },
  ],
  newpassword1: [
    {
      required: true,
      min: 6,
      message: proxy?.$t("upms.user.min6Chars"),
      trigger: "change",
    },
  ],
  newpassword2: [
    {
      required: true,
      validator: validatePass,
      trigger: "blur",
    },
  ],
});

const avatarUploadAction = apiUrl("/upms/file/upload?fileType=image&dir=user/");

function submitForm(formEl: any, kind: "info" | "password") {
  if (!formEl) return;
  formEl.validate((valid: boolean) => {
    if (!valid) return;
    loading.value = true;
    const payload =
      kind === "info"
        ? {
            nickName: ruleForm.value.nickName,
            avatar: ruleForm.value.avatar || "",
          }
        : {
            // 改密时资料字段原样带上，避免被置空
            nickName: userInfo.value.nickName,
            avatar: userInfo.value.avatar || "",
            password: pwdForm.value.password,
            newpassword1: pwdForm.value.newpassword1,
          };
    editObj(payload)
      .then(() => {
        loading.value = false;
        proxy?.$notify({
          title: proxy.$t("commons.success"),
          message: proxy.$t("commons.updateSuccess"),
          type: "success",
          duration: 2000,
        });
        if (kind === "password") {
          useUserStoreHook().logOut();
          location.reload();
        } else {
          useUserStoreHook().setUserInfoAction();
        }
      })
      .catch(() => {
        // 错误提示（如原密码错误）已由 http 拦截器弹出
        loading.value = false;
      });
  });
}
</script>
<style lang="scss" scoped>
.user-basic {
  padding: 20px 8px 28px;
}

.user-basic__form {
  padding: 26px 22px 10px;
  background: #fff;
  background-image: url("@/assets/status/user-basic-bg.jpg");
  background-repeat: no-repeat;
  background-position: left 600px center;
  background-size: 600px auto;
  border-radius: 16px;
}

:deep(.user-basic__form .el-form-item__content) {
  max-width: 520px;
}

.user-basic__label {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  color: var(--dc-text-1);
}

.user-basic__label-text {
  font-weight: normal;
}

:deep(.user-basic__label .el-icon) {
  color: var(--dc-brand);
}

:deep(.user-basic__form .el-form-item__label) {
  justify-content: flex-start;
  text-align: left;
}

:deep(.user-basic__form .el-form-item) {
  margin-bottom: 18px;
}

:deep(.user-basic__form .el-input__wrapper),
:deep(.user-basic__form .avue-input-tree .el-input__wrapper) {
  min-height: 36px;
  border-radius: 10px;
}




.user-basic__avatar {
  width: 100%;
}

.user-basic__avatar-row {
  display: flex;
  gap: 16px;
  align-items: center;
}

.user-basic__avatar-tip {
  font-size: 14px;
  color: var(--dc-text-description);
}

:deep(.user-basic__avatar .image-uploader .el-upload) {
  background: rgb(60 110 240 / 4%);
  border-color: rgb(0 0 0 / 16%);
  border-radius: 14px;
}

:deep(.user-basic__avatar .image-uploader .el-upload:hover) {
  border-color: var(--dc-brand);
}

:deep(.user-basic__avatar .el-icon.image-uploader-icon) {
  font-size: 22px;
  color: var(--dc-brand);
}

.user-basic__submit {
  display: flex;
  justify-content: center;
  width: 100%;
  padding-top: 6px;
}

.user-basic__submit-btn {
  width: 240px;
  height: 44px;
  font-weight: 600;
  border-radius: 10px;
}

.user-password {
  padding: 20px 8px 28px;
}

.user-password__form {
  padding: 26px 22px 10px;
  background: #fff;
  background-image: url("@/assets/status/user-password-bg.png");
  background-repeat: no-repeat;
  background-position: left 600px center;
  background-size: 600px auto;
  border-radius: 16px;
}

.user-password__header {
  margin-bottom: 10px;
}

.user-password__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--dc-text-1);
}

.user-password__desc {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--dc-text-3);
}

.user-password__label {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  color: var(--dc-text-3);
}

:deep(.user-password__label .el-icon) {
  color: var(--dc-brand);
}

:deep(.user-password__form .el-form-item__label) {
  display: flex;
  justify-content: flex-start;
  padding: 0 0 8px;
  line-height: 1.2;
  text-align: left;
}

:deep(.user-password__form .el-form-item) {
  align-items: flex-start;
  margin-bottom: 18px;
}

:deep(.user-password__form .el-input__wrapper) {
  min-height: 44px;
  border-radius: 10px;
}

:deep(.user-password__form .el-form-item__content) {
  width: 100%;
  max-width: 520px;
}

.user-password__submit {
  display: flex;
  justify-content: center;
  width: 100%;
  padding-top: 6px;
}

.user-password__submit-btn {
  width: 240px;
  height: 44px;
  font-weight: 600;
  border-radius: 10px;
}

@media (width <= 992px) {
  .user-password__form {
    background-image: none;
  }

  :deep(.user-password__form .el-form-item__content) {
    max-width: none;
  }
}

.avatar-uploader .el-upload {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
}

.avatar-uploader .el-upload:hover {
  border-color: #165DFF;
}

@media (width <= 992px) {
  .user-basic__form {
    background-image: none;
  }

  :deep(.user-basic__form .el-form-item__content) {
    max-width: none;
  }
}
</style>
