<!-- 管理后台登录页
     - 账号密码登录：OAuth2 password 授权，滑块验证码令牌作为 code 由后端二次校验
     - 首次登录 / 管理员重置口令后，后端返回 errCode=credentials_expired，页面弹出改密窗，改完用新密码自动登录
     - 样式全部在 ./styles/login-redesign.css，选择器挂 .hl-root 下，不动全局 -->
<template>
  <div class="hl-root" :class="{ 'hl-dark': dark }">
    <div class="hl-page">
      <div class="hl-header">
        <span class="hl-logo">
          <img v-if="brandLogo" :src="brandLogo" alt="" />
          <i v-else>{{ brandInitial }}</i>
        </span>
        <span class="hl-brandname">{{ brandName }}<i>管理后台</i></span>
        <span class="hl-headright">
          <span class="hl-themelabel">{{ dark ? "深色" : "浅色" }}</span>
          <button class="hl-themebtn" aria-label="主题切换" @click="toggleDark">
            <span class="hl-themeknob" />
          </button>
        </span>
      </div>

      <div class="hl-main" :class="{ 'is-narrow': narrow }">
        <LoginBrandPanel v-if="!narrow" />

        <div class="hl-card">
          <template v-if="!success">
            <h2>欢迎登录</h2>
            <div class="hl-card-sub">登录{{ brandName }}管理后台，管理商品与订单</div>

            <!-- 账号登录 -->
            <div class="hl-form">
              <div>
                <div class="hl-label">账号<i>*</i></div>
                <div class="hl-fieldwrap">
                  <span class="hl-ficon"><LoginIcon name="user" /></span>
                  <input
                    v-model="user"
                    class="hl-input"
                    :class="{ 'is-error': errU }"
                    placeholder="请输入账号"
                    autocomplete="username"
                    @input="errU = ''"
                  />
                </div>
                <div v-if="errU" class="hl-err">{{ errU }}</div>
              </div>

              <div>
                <div class="hl-label">密码<i>*</i></div>
                <div class="hl-fieldwrap">
                  <span class="hl-ficon"><LoginIcon name="lock" /></span>
                  <input
                    ref="pwdRef"
                    v-model="pwd"
                    class="hl-input hl-input--pwd"
                    :class="{ 'is-error': errP }"
                    :type="showPwd ? 'text' : 'password'"
                    placeholder="请输入密码"
                    autocomplete="current-password"
                    @input="errP = ''"
                  />
                  <button
                    class="hl-eyebtn"
                    aria-label="显示或隐藏密码"
                    @click="showPwd = !showPwd"
                  >
                    <LoginIcon
                      :name="showPwd ? 'eye' : 'eye-off'"
                      variant="eye"
                    />
                  </button>
                </div>
                <div v-if="errP" class="hl-err">{{ errP }}</div>
              </div>

              <label class="hl-remember">
                <input
                  type="checkbox"
                  :checked="remember"
                  @change="toggleRemember"
                />
                记住账号
              </label>

              <div v-if="errForm" class="hl-errform">{{ errForm }}</div>

              <button class="hl-primary" :disabled="loading" @click="onLogin">
                <template v-if="loading">
                  <span class="hl-spinner" /><span>登录中…</span>
                </template>
                <span v-else>登 录</span>
              </button>
            </div>

          </template>

          <!-- 登录成功态 -->
          <div v-else class="hl-success">
            <span class="hl-success-icon">✓</span>
            <div class="hl-success-title">登录成功</div>
          </div>
        </div>
      </div>

      <div class="hl-footer">{{ brandName }} · 基于 AGPL-3.0 开源</div>
    </div>

    <VerifyCaptcha
      ref="captchaRef"
      @success="onCapSuccess"
      @close="onCapClose"
    />

    <LoginExpiredPasswordDialog
      :open="expired.open"
      :username="expired.username"
      :password="expired.password"
      @close="expired.open = false"
      @changed="onPasswordChanged"
    />

    <LoginResultDialog
      :open="dlg.open"
      :icon="dlgVals.icon"
      :icon-bg="dlgVals.iconBg"
      :title="dlgVals.title"
      :desc="dlgVals.desc"
      :primary="dlgVals.primary"
      :secondary="dlgVals.secondary"
      @primary="dlgVals.onPrimary"
      @secondary="dlgVals.onSecondary"
    />

    <LoginToast :on="toast.on" :type="toast.type" :msg="toast.msg" />
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElNotification } from "element-plus";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
} from "vue";
import { useDataThemeChange } from "@/layout/hooks/useDataThemeChange";
import { useLayout } from "@/layout/hooks/useLayout";
import { goFirstPage, initRouter } from "@/router/utils";
import { useUserStoreHook } from "@/store/modules/user";
import VerifyCaptcha from "@/components/verify-captcha/index.vue";
import { useBrand } from "@/composables/useBrand";
import LoginBrandPanel from "./components/LoginBrandPanel.vue";
import LoginExpiredPasswordDialog from "./components/LoginExpiredPasswordDialog.vue";
import LoginIcon from "./components/LoginIcon.vue";
import LoginResultDialog from "./components/LoginResultDialog.vue";
import LoginToast from "./components/LoginToast.vue";
import "./styles/login-redesign.css";

defineOptions({ name: "Login" });

/** 记住账号：只落账号，密码不落地（交给 autocomplete） */
const ACCOUNT_KEY = "zhiflow-login-account";

const { initStorage } = useLayout();
initStorage();
const { dataTheme, dataThemeChange } = useDataThemeChange();
dataThemeChange();

const dark = computed(() => !!dataTheme.value);

const brand = useBrand({ anonymous: true });
const brandName = brand.name;
const brandLogo = brand.logo;
// 没有 logo 时用品牌首字做字标；Array.from 取首字，避免把增补平面汉字劈成半个代理对
const brandInitial = computed(() => Array.from(brand.name.value)[0] ?? "");
function toggleDark() {
  dataTheme.value = !dataTheme.value;
  dataThemeChange();
}

const vw = ref(window.innerWidth);
const narrow = computed(() => vw.value < 1100);

const pwdRef = ref<HTMLInputElement>();
const user = ref("");
const pwd = ref("");
const showPwd = ref(false);
const remember = ref(true);
const errU = ref("");
const errP = ref("");
const errForm = ref("");
const loading = ref(false);
const success = ref(false);

const capOpen = ref(false);
const captchaRef = ref<{
  open: () => void;
  close: () => void;
  refresh: () => void;
}>();
const expired = reactive({ open: false, username: "", password: "" });
const toast = reactive({ on: false, type: "ok" as "ok" | "err", msg: "" });
const dlg = reactive({ open: false, type: "" });
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(type: "ok" | "err", msg: string) {
  if (toastTimer) clearTimeout(toastTimer);
  toast.on = true;
  toast.type = type;
  toast.msg = msg;
  toastTimer = setTimeout(() => {
    toast.on = false;
  }, 2600);
}

/* ---------------- 滑块验证 ---------------- */

function openCap() {
  capOpen.value = true;
  nextTick(() => captchaRef.value?.open());
}

function onCapSuccess(token: string) {
  capOpen.value = false;
  doLogin(token);
}

function onCapClose() {
  capOpen.value = false;
  captchaRef.value?.close();
}

/* ---------------- 账号登录 ---------------- */

function onLogin() {
  errU.value = user.value.trim() ? "" : "请输入账号";
  errP.value = pwd.value ? "" : "请输入密码";
  errForm.value = "";
  if (errU.value || errP.value || loading.value) return;
  openCap();
}

function persistAccount() {
  try {
    if (remember.value && user.value) {
      localStorage.setItem(ACCOUNT_KEY, user.value);
    } else {
      localStorage.removeItem(ACCOUNT_KEY);
    }
  } catch {
    // 存储不可用时忽略
  }
}

function toggleRemember() {
  remember.value = !remember.value;
  if (!remember.value) persistAccount();
}

function onLoginFailed() {
  // http 拦截器已弹过一条红条提示，这里改用失败弹窗，避免两套反馈叠加
  ElMessage.closeAll();
  dlg.open = true;
  dlg.type = "loginFail";
}

async function doLogin(token: string) {
  loading.value = true;
  errForm.value = "";
  try {
    await useUserStoreHook().loginByUsername({
      username: user.value.trim(),
      password: pwd.value,
      code: token,
      randomStr: "",
    });
  } catch (e: any) {
    if (e?.errCode === "credentials_expired") {
      // 首次登录 / 管理员重置口令后：先改密码
      expired.username = user.value.trim();
      expired.password = pwd.value;
      expired.open = true;
    } else {
      onLoginFailed();
    }
    return;
  } finally {
    loading.value = false;
  }
  onLoginSucceeded();
}

function onPasswordChanged(newPassword: string) {
  expired.open = false;
  pwd.value = newPassword;
  showToast("ok", "密码已修改，请再完成一次验证即可登录");
  openCap();
}

async function onLoginSucceeded() {
  persistAccount();
  success.value = true;
  showToast("ok", "登录成功，正在进入管理后台");
  try {
    await initRouter();
    goFirstPage(true);
  } catch {
    // 路由初始化失败：错误提示由 http 拦截器给出，页面停在成功态
  }
}

/* ---------------- 结果弹窗文案 ---------------- */

function closeDlg() {
  dlg.open = false;
  dlg.type = "";
}

const dlgVals = computed(() => {
  const map: Record<string, any> = {
    loginFail: {
      icon: "!",
      iconBg: "#dc2626",
      title: "登录失败",
      desc: "账号或密码错误，请检查后重新输入；忘记密码请联系管理员重置",
      primary: "重新输入",
      onPrimary: closeDlg,
      secondary: "",
      onSecondary: closeDlg,
    },
  };
  return (
    map[dlg.type] || {
      icon: "",
      iconBg: "#2563eb",
      title: "",
      desc: "",
      primary: "确定",
      onPrimary: closeDlg,
      secondary: "",
      onSecondary: closeDlg,
    }
  );
});

/* ---------------- 全局键盘 / 生命周期 ---------------- */

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    if (dlg.open) return closeDlg();
    if (capOpen.value) {
      onCapClose();
      return;
    }
    if (expired.open) expired.open = false;
    return;
  }
  if (
    e.key !== "Enter" ||
    success.value ||
    capOpen.value ||
    expired.open ||
    dlg.open ||
    loading.value
  ) {
    return;
  }
  onLogin();
}

function onResize() {
  vw.value = window.innerWidth;
}

onMounted(() => {
  let saved = "";
  try {
    saved = localStorage.getItem(ACCOUNT_KEY) || "";
  } catch {
    saved = "";
  }
  if (saved) {
    user.value = saved;
    remember.value = true;
    // 回填后聚焦密码框；等一帧，避开路由切换/首屏动画期间的焦点重置
    nextTick(() => requestAnimationFrame(() => pwdRef.value?.focus()));
  }
  document.addEventListener("keydown", onKeydown);
  window.addEventListener("resize", onResize);
  useBrowser();
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  window.removeEventListener("resize", onResize);
  if (toastTimer) clearTimeout(toastTimer);
});

/** 提示使用主流浏览器打开系统 */
function useBrowser() {
  const browser = navigator.userAgent.toLowerCase();
  const isIE = browser.includes("msie") || browser.includes("trident");
  if (!isIE) return;
  setTimeout(() => {
    ElNotification({
      title: "浏览器兼容提示",
      message: "请使用 Chrome、Edge、Safari、Firefox 等主流浏览器的最新版本，否则页面可能出现未知错误。",
      duration: 0,
      type: "warning",
    });
  }, 500);
}
</script>
