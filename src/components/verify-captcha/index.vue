<template>
  <Teleport to="body">
    <div v-if="visible" class="verify-wrap">
      <div class="verify-code">
        <svg class="close-icon" viewBox="0 0 24 24" aria-label="关闭" @click="handleClose">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
        <div class="verify-title">安全验证</div>
        <div class="verify-tip">拖动滑块，使图片角度为正</div>
        <div class="verify-content">
          <div class="verify-body" ref="verifyBodyRef">
            <!-- 加载骨架屏：形状对齐旋转圆盘，配合微光扫过，加载完可无缝过渡 -->
            <div v-if="imgLoading" class="verify-loading">
              <div class="loading-disc"></div>
              <div class="loading-shimmer"></div>
            </div>
            <!-- 加载失败：给出可点重试的明确出口，而不是留一个灰色空框 -->
            <div v-else-if="loadFailed" class="verify-failed" @click="refresh">
              <svg class="failed-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 8v5m0 3h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z"
                />
              </svg>
              <span class="failed-text">{{ errorText }}</span>
              <span class="failed-retry">点击重试</span>
            </div>
            <div class="verify-bg">
              <img
                ref="bgImgRef"
                :src="captchaData.backgroundImage"
                @load="onBgImgLoad"
                @error="onBgImgError"
              />
            </div>
            <div
              v-if="!imgLoading && !loadFailed"
              class="verify-slider"
              :style="sliderStyle"
            >
              <img ref="sliderImgRef" :src="captchaData.templateImage" />
            </div>
            <div v-if="isSuccess" class="check-status check-success">
              验证成功
            </div>
            <div v-if="isErr" class="check-status check-error">
              {{ errorText }}
            </div>
          </div>
          <div class="move-area" ref="moveAreaRef">
            <div class="move-block" :class="{ 'is-disabled': !interactive }">
              <div
                class="color-change"
                :style="{ width: colorWidth + 'px' }"
              ></div>
              <!-- 微光提示只在可拖动时出现，否则会被误读成「还在加载」 -->
              <div
                v-if="interactive && leftDistance === 0"
                class="move-shadow"
              ></div>
              <div
                class="block-button"
                :style="{
                  backgroundColor:
                    leftDistance > 0 ? 'var(--overlay-primary)' : '#A4B3C3',
                  boxShadow:
                    leftDistance > 0
                      ? '0 2px 3.2px 0 rgba(60, 110, 240, 0.40)'
                      : '0 2px 3.2px 0 rgba(154, 157, 166, 0.40)',
                  left: leftDistance + 'px',
                }"
                @mousedown.stop.prevent="onDragStart"
              >
                <svg class="block-button-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div class="verify-footer">
          <div class="footer-left">
            <svg class="footer-icon" viewBox="0 0 24 24" aria-hidden="true" :style="{ color: statusColor }">
              <circle cx="12" cy="12" r="9" />
              <path :d="statusIconPath" />
            </svg>
            <span class="footer-status" :style="{ color: statusColor }">
              {{ statusText }}
            </span>
          </div>
          <div class="footer-right" @click="refresh">
            <svg class="refresh-icon" viewBox="0 0 24 24" aria-label="刷新">
              <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount } from "vue";
import { apiUrl } from "@/utils/http/apiUrl";

const props = withDefaults(
  defineProps<{
    genUrl?: string;
    validateUrl?: string;
  }>(),
  {
    genUrl: "/mallapi/captcha/generate",
    validateUrl: "/mallapi/captcha/check",
  },
);

const emit = defineEmits<{
  (e: "success", token: string): void;
  (e: "close"): void;
}>();

const visible = ref(false);
const isSuccess = ref(false);
const isErr = ref(false);
const imgLoading = ref(true);
// 取图失败 / 图片下载失败。与 imgLoading 互斥，避免「转圈转到天荒地老」
const loadFailed = ref(false);
const errorText = ref("验证失败，请重新尝试！");
const leftDistance = ref(0);
const colorWidth = ref(48);
const dragging = ref(false);

// 图片始终拿不到时的兜底：超时后退出加载态并给出重试出口
const LOAD_TIMEOUT_MS = 10000;
let loadTimer: ReturnType<typeof setTimeout> | null = null;

function clearLoadTimer() {
  if (loadTimer) {
    clearTimeout(loadTimer);
    loadTimer = null;
  }
}

function failLoad(text: string) {
  clearLoadTimer();
  imgLoading.value = false;
  loadFailed.value = true;
  errorText.value = text;
}

// 只有图已就位且没进终态时才允许拖动，滑轨的视觉也跟着这个开关走
const interactive = computed(
  () =>
    !imgLoading.value && !loadFailed.value && !isSuccess.value && !isErr.value,
);

const captchaData = ref({
  id: null as string | null,
  backgroundImage: "",
  templateImage: "",
  bgWidth: 0,
  bgHeight: 0,
  startTime: new Date(),
  trackArr: [] as { x: number; y: number; type: string; t: number }[],
  end: 0,
});

const moveAreaRef = ref<HTMLElement>();
const bgImgRef = ref<HTMLImageElement>();

// 旋转验证码：拖动距离映射为旋转角度（与移动端 tianai-mini-captcha 的 ROTATE 一致）
const sliderStyle = computed(() => {
  // 用滑块"满行程"(end = 滑轨宽−按钮宽48)映射 360°，而非背景图宽，
  // 否则按钮永远走不到背景宽，最多只能转 ~300° → 转不满一圈。
  const travel = captchaData.value.end || captchaData.value.bgWidth || 1;
  const f = Math.min(1, Math.max(0, leftDistance.value / travel));
  const angle = f * 360;
  return `transform: translate(100%, 0) rotate(${angle}deg);`;
});

/** 状态图标（圆圈内的符号）：成功 = 对勾，失败 = 叉，其余 = 提示 */
const statusIconPath = computed(() => {
  if (isSuccess.value) return "M8 12.5l2.5 2.5L16 9.5";
  if (isErr.value || loadFailed.value) return "M9 9l6 6M15 9l-6 6";
  return "M12 8v.01M12 11v5";
});

const statusText = computed(() => {
  if (isSuccess.value) return "验证成功";
  if (isErr.value) return "验证失败";
  if (loadFailed.value) return errorText.value;
  if (imgLoading.value) return "正在加载验证码";
  return "滑动和验证";
});

const statusColor = computed(() => {
  if (isSuccess.value) return "#26BF66";
  if (isErr.value || loadFailed.value) return "#FE0713";
  if (imgLoading.value) return "#909399";
  return "#000000";
});

function resetState() {
  clearLoadTimer();
  isSuccess.value = false;
  isErr.value = false;
  imgLoading.value = true;
  loadFailed.value = false;
  errorText.value = "验证失败，请重新尝试！";
  leftDistance.value = 0;
  colorWidth.value = 48;
  captchaData.value = {
    id: null,
    backgroundImage: "",
    templateImage: "",
    bgWidth: 0,
    bgHeight: 0,
    startTime: new Date(),
    trackArr: [],
    end: 0,
  };
}

function open() {
  resetState();
  visible.value = true;
  nextTick(() => getVerifyData());
}

function close() {
  visible.value = false;
  resetState();
}

function handleClose() {
  close();
  emit("close");
}

function refresh() {
  resetState();
  getVerifyData();
}

async function getVerifyData() {
  captchaData.value.startTime = new Date();
  captchaData.value.trackArr = [];
  clearLoadTimer();
  loadTimer = setTimeout(() => failLoad("验证码加载超时"), LOAD_TIMEOUT_MS);
  try {
    const res = await fetch(apiUrl(`${props.genUrl}?type=ROTATE`));
    // 非 2xx / 空 body 时直接 res.json() 会抛「Unexpected end of JSON input」，
    // 先校验状态与内容，拿文本安全解析，异常时提示重试而非崩溃。
    if (!res.ok) {
      throw new Error(`验证码接口返回 HTTP ${res.status}`);
    }
    const text = await res.text();
    if (!text) {
      throw new Error("验证码接口返回空响应");
    }
    const data = JSON.parse(text);
    captchaData.value.id = data.id;
    captchaData.value.backgroundImage = data.captcha?.backgroundImage || "";
    captchaData.value.templateImage = data.captcha?.templateImage || "";
    // 空 URL 不会触发 <img> 的 load/error，不显式收尾就会永远停在加载态
    if (!captchaData.value.backgroundImage) {
      failLoad("验证码图片为空");
    }
  } catch (e) {
    console.error("获取验证码失败", e);
    failLoad("验证码加载失败");
  }
}

function onBgImgLoad() {
  // 失败兜底已经收尾过，迟到的 load 不再翻回正常态
  if (loadFailed.value) return;
  clearLoadTimer();
  imgLoading.value = false;
  nextTick(() => {
    if (bgImgRef.value) {
      captchaData.value.bgWidth = bgImgRef.value.clientWidth;
      captchaData.value.bgHeight = bgImgRef.value.clientHeight;
    }
    if (moveAreaRef.value) {
      captchaData.value.end = moveAreaRef.value.clientWidth - 48;
    }
  });
}

function onBgImgError() {
  // src 为空时浏览器也会打一发 error，此时不该覆盖掉更准确的文案
  if (!captchaData.value.backgroundImage) return;
  failLoad("验证码图片加载失败");
}

function onDragStart(e: MouseEvent) {
  if (!interactive.value) return;
  dragging.value = true;
  const startClientX = e.clientX;
  const startTime = captchaData.value.startTime;
  captchaData.value.trackArr.push({
    x: 0,
    y: 0,
    type: "down",
    t: Date.now() - startTime.getTime(),
  });

  const onMove = (ev: MouseEvent) => {
    if (!dragging.value) return;
    let moveX = ev.clientX - startClientX;
    const end = captchaData.value.end;
    if (moveX < 0) moveX = 0;
    else if (moveX > end) moveX = end;
    leftDistance.value = moveX;
    colorWidth.value = moveX + 48;
    captchaData.value.trackArr.push({
      x: ev.clientX - startClientX,
      y: 0,
      type: "move",
      t: Date.now() - startTime.getTime(),
    });
  };

  const onUp = (ev: MouseEvent) => {
    if (!dragging.value) return;
    dragging.value = false;
    captchaData.value.trackArr.push({
      x: ev.clientX - startClientX,
      y: 0,
      type: "up",
      t: Date.now() - startTime.getTime(),
    });
    submitValidation();
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  };

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

async function submitValidation() {
  // 后端判定固定为 lastTrack.x / bgImageWidth。与视觉同源：上报 bgImageWidth = 滑块行程(end)，
  // 最后一点 x = leftDistance，使 percentage = leftDistance/end = 视觉分数 f，对正即过、满圈可达。
  const trackList = captchaData.value.trackArr;
  if (trackList.length) {
    trackList[trackList.length - 1] = {
      ...trackList[trackList.length - 1],
      x: leftDistance.value,
    };
  }
  const dataForm = {
    id: captchaData.value.id,
    data: {
      bgImageWidth: captchaData.value.end,
      bgImageHeight: captchaData.value.bgHeight,
      startTime: captchaData.value.startTime,
      stopTime: new Date(),
      trackList: trackList,
    },
  };

  try {
    const res = await fetch(apiUrl(`${props.validateUrl}?type=ROTATE`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataForm),
    });
    const data = await res.json();

    if (["000000", 200].includes(data.code) && data.data) {
      isSuccess.value = true;
      setTimeout(() => {
        close();
        emit("success", data.data);
      }, 1000);
    } else {
      if (data.code === 4001) {
        isErr.value = true;
        errorText.value = "验证失败，请重新尝试！";
      } else if (data.code === 4000) {
        isErr.value = true;
        errorText.value = "验证码被黑洞吸走了！";
      } else {
        isErr.value = true;
        errorText.value = data.msg || "验证失败";
      }
      setTimeout(refresh, 300);
    }
  } catch {
    refresh();
  }
}

onBeforeUnmount(() => {
  clearLoadTimer();
  close();
});

defineExpose({ open, close, refresh });
</script>

<style scoped lang="scss">
.verify-wrap {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: rgb(0 0 0 / 50%);

  .verify-code {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 9999;
    width: 320px;
    padding: 20px 0 10px;
    overflow: hidden;
    background-color: #fff;
    border-radius: 10px;
    box-shadow: 0 0 5px rgb(227 227 227 / 70%);
    transform: translate(-50%, -50%);

    .close-icon {
      position: absolute;
      top: 14px;
      right: 14px;
      z-index: 10000;
      width: 16px;
      height: 16px;
      cursor: pointer;
      fill: none;
      stroke: var(--dc-text-3, #909399);
      stroke-linecap: round;
      stroke-width: 2;
    }

    .verify-title {
      font-size: 14px;
      font-weight: 400;
      color: var(--dc-text-3);
      text-align: center;
    }

    .verify-tip {
      padding: 0 10px;
      font-size: 17px;
      font-weight: 400;
      color: var(--dc-text-1);
      text-align: center;
    }

    .verify-content {
      box-sizing: border-box;
      width: 100%;
      padding: 10px;
      overflow: hidden;
      background-color: #fff;

      .verify-body {
        position: relative;
        width: 100%;
        height: 180px;
        overflow: hidden;
        background-color: #e8e8e8;
        border-radius: 6px;

        // 骨架屏用「圆盘轮廓 + 微光扫过」，形状与加载完成后的旋转盘一致，
        // 图片就位时是原地填充而不是整块闪一下换掉
        .verify-loading {
          @keyframes shimmer {
            from {
              transform: translateX(-100%);
            }

            to {
              transform: translateX(100%);
            }
          }

          @keyframes disc-breath {
            0%,
            100% {
              opacity: 0.55;
            }

            50% {
              opacity: 1;
            }
          }

          position: absolute;
          inset: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: linear-gradient(180deg, #eef1f6 0%, #e6eaf1 100%);

          .loading-disc {
            width: 110px;
            height: 110px;
            background: rgb(255 255 255 / 55%);
            border: 2px dashed rgb(148 163 184 / 55%);
            border-radius: 50%;
            animation: disc-breath 1.6s ease-in-out infinite;
          }

          .loading-shimmer {
            position: absolute;
            inset: 0;
            background: linear-gradient(
              90deg,
              transparent 0%,
              rgb(255 255 255 / 65%) 50%,
              transparent 100%
            );
            animation: shimmer 1.4s ease-in-out infinite;
          }
        }

        // 加载失败：整块可点重试，不再让用户对着灰框猜发生了什么
        .verify-failed {
          position: absolute;
          inset: 0;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: linear-gradient(180deg, #eef1f6 0%, #e6eaf1 100%);

          .failed-icon {
            width: 30px;
            height: 30px;
            fill: none;
            stroke: #9aa3b2;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 1.8;
          }

          .failed-text {
            font-size: 14px;
            color: #5a6b8c;
          }

          .failed-retry {
            font-size: 14px;
            color: var(--overlay-primary);
          }

          &:hover .failed-retry {
            text-decoration: underline;
          }
        }

        .verify-bg {
          position: absolute;
          width: 100%;
          height: 100%;

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }

        .verify-slider {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;

          img {
            position: relative;
            // 等价于移动端 uniapp <image mode="heightFix">：高度固定、宽度按原图宽高比自适应，
            // 保证 200×360 的旋转圆盘渲染成正圆而非竖椭圆
            width: auto;
            height: 100%;
            overflow: hidden;
          }
        }
      }

      .move-area {
        width: 100%;
        height: 48px;
        margin-top: 10px;
        overflow: hidden;

        .move-block {
          @keyframes moveAnimate {
            0% {
              left: 0;
              opacity: 0.5;
            }

            50% {
              left: 50%;
              opacity: 1;
            }

            100% {
              left: 100%;
              opacity: 0.5;
            }
          }

          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background-color: #f4f4f4;
          border-radius: 50px;
          transition: opacity 0.2s;

          // 图没就位时滑轨整体压暗并锁住，避免用户空拖
          &.is-disabled {
            pointer-events: none;
            opacity: 0.5;
          }

          .move-shadow {
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background-color: rgb(255 255 255 / 50%);
            border-radius: 50%;
            box-shadow: 1px 1px 1px #fff;
            animation: moveAnimate 2s linear infinite;
          }

          .color-change {
            position: absolute;
            top: 0;
            left: 0;
            z-index: 2;
            height: 48px;
            background-color: #ccf9e0;
            border-radius: 50px;
          }

          .block-button {
            position: absolute;
            top: 0;
            z-index: 3;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            cursor: grab;
            user-select: none;
            border-radius: 50px;
            transition: background-color 0.2s;

            &:active {
              cursor: grabbing;
            }

            .block-button-icon {
              width: 22px;
              height: 22px;
              pointer-events: none;
              fill: none;
              stroke: #fff;
              stroke-linecap: round;
              stroke-linejoin: round;
              stroke-width: 2.2;
            }
          }
        }
      }

      .check-status {
        position: absolute;
        right: 0;
        bottom: -1px;
        left: 0;
        width: 100%;
        height: 25px;
        font-size: 14px;
        line-height: 25px;
        color: #fff;
        text-align: center;

        &.check-success {
          background: #5ac725;
        }

        &.check-error {
          background: #f56c6c;
        }
      }
    }

    .verify-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 5px 0;
      margin: 0 10px;

      .footer-left {
        display: flex;
        align-items: center;

        .footer-icon {
          width: 15px;
          height: 15px;
          margin-right: 4px;
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 2;
        }

        .footer-status {
          font-size: 14px;
        }
      }

      .footer-right {
        cursor: pointer;

        .refresh-icon {
          width: 16px;
          height: 16px;
          fill: none;
          stroke: var(--dc-text-3, #909399);
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 2;
        }
      }
    }
  }
}
</style>
