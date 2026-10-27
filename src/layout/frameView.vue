<script setup lang="ts">
import { computed, nextTick, onMounted, ref, unref, watch } from "vue";
import { useRoute } from "vue-router";
import { getToken } from "@/utils/auth";
import { appConfirm } from "@/components/overlay";

/**
 * FrameView 该组件主要用于菜单数据的加载
 */
defineOptions({
  name: "FrameView",
});

const props = defineProps<{
  frameInfo?: {
    frameSrc?: string;
    fullPath?: string;
  };
}>();

const loading = ref(true);
const currentRoute = useRoute();
const frameSrc = ref<string>("");
const frameRef = ref<HTMLElement | null>(null);
const iframeSrcWithToken = computed(() => {
  const src = frameSrc.value;
  const accessToken = getToken()?.access_token;

  if (!src || !accessToken) {
    return src;
  }

  const [base, hash = ""] = src.split("#", 2);
  const separator = base.includes("?") ? "&" : "?";

  return `${base}${separator}token=${encodeURIComponent(accessToken)}${
    hash ? `#${hash}` : ""
  }`;
});
if (unref(currentRoute.meta)?.frameSrc) {
  frameSrc.value = unref(currentRoute.meta)?.frameSrc as string;
}
unref(currentRoute.meta)?.frameLoading === false && hideLoading();

function hideLoading() {
  loading.value = false;
}

function init() {
  nextTick(() => {
    openLinkByTargetBlank();
    const iframe = unref(frameRef);
    if (!iframe) return;
    const _frame = iframe as any;
    if (_frame.attachEvent) {
      _frame.attachEvent("onload", () => {
        try {
          hideLoading();
        } catch (e) {
          console.error(e);
          hideLoading();
        }
      });
    } else {
      iframe.onload = () => {
        try {
          hideLoading();
        } catch (e) {
          console.error(e);
          hideLoading();
        }
      };
    }
  });
}
/** 可直接内嵌、不弹外链提示的域名（部署方按需追加） */
const trustedIframeHosts: string[] = [];

function openLinkByTargetBlank() {
  const externalLink = frameSrc.value.indexOf("target=_blank") != -1;
  if (externalLink) {
    frameSrc.value = frameSrc.value.replace("?target=_blank", "");
    window.open(frameSrc.value, "_blank");
  } else if (
    trustedIframeHosts.some((host) => frameSrc.value.includes(host))
  ) {
    return;
  } else {
    appConfirm({
      intent: "confirm",
      title: "打开外链？",
      body: `当前为外链(${frameSrc.value})，如果页面加载失败，可能是外链本身错误！`,
      verb: "打开外链",
      cancelText: "关闭",
    })
      .then(() => {
        window.open(frameSrc.value, "_blank");
      })
      .catch(() => {});
  }
}

watch(
  () => currentRoute.fullPath,
  (path) => {
    if (
      currentRoute.name === "Redirect" &&
      path.includes(props.frameInfo?.fullPath)
    ) {
      frameSrc.value = path; // redirect时，置换成任意值，待重定向后 重新赋值
      loading.value = true;
    }
    // 重新赋值
    if (props.frameInfo?.fullPath === path) {
      frameSrc.value = props.frameInfo?.frameSrc;
    }
  },
);

onMounted(() => {
  init();
});
</script>

<template>
  <div style="position: relative">
    <div
      v-loading="loading"
      class="frame"
      :element-loading-text="$t('commons.hsLoad')"
    >
      <iframe ref="frameRef" :src="iframeSrcWithToken" class="frame-iframe" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.frame {
  position: absolute;
  inset: 0;

  .frame-iframe {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border: 0;
  }
}

.main-content {
  margin: 2px 0 0 !important;
}

#sub-frame-error-details {
  opacity: 1 !important;
}
</style>
