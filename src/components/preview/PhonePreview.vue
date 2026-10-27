<template>
  <!-- 手机预览容器：用于在页面中模拟手机外观并渲染传入的 HTML 内容 -->
  <div class="phone-frame">
    <div class="phone-body">
      <div class="phone-notch">
        <span class="notch-speaker" />
        <span class="notch-camera" />
      </div>
      <div class="phone-screen" :style="{ width: screenWidth + 'px' }">
        <div class="status-bar">
          <span class="status-time">{{ displayTime }}</span>
          <div class="status-icons">
            <span class="icon-signal"><i></i><i></i><i></i><i></i></span>
            <span class="icon-battery"><i class="level"></i></span>
          </div>
        </div>
        <!-- 预览内容区：安全清洗后的 HTML，通过 v-html 渲染 -->
        <div class="preview-content" ref="previewContentRef" v-html="safeHtml" />
        <div class="home-indicator" />
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { sanitizeRichText } from '@/utils/sanitizeHtml';

export default {
  props: {
    /** 待预览的原始 HTML 字符串（组件内部会进行基础安全清洗） */
    html: { type: String, default: '' },
    /** 状态栏时间（不传则默认使用当前本地时间，格式 HH:mm） */
    time: { type: String, default: '' },
    /** 滚动联动比例（0~1）：用于与外部编辑器滚动同步，设置后按比例滚动预览内容 */
    scrollRatio: { type: Number, default: 0 },
    /** 屏幕最大宽度（像素）：用于限制手机屏幕在宽度上的上限 */
    maxWidth: { type: Number, default: 460 },
    /** 视口高度的偏移量（像素）：用于控制随视口高度自适应时的保留空间，数值越大屏幕越矮 */
    vhOffset: { type: Number, default: 280 },
  },
  setup(props) {
    const previewContentRef = ref<HTMLElement | null>(null)
    const screenWidth = ref<number>(props.maxWidth)

    // 格式化时间为 HH:mm
    const formatTime = (d: Date) => {
      const h = d.getHours().toString().padStart(2, '0')
      const m = d.getMinutes().toString().padStart(2, '0')
      return `${h}:${m}`
    }
    const displayTime = computed(() => props.time || formatTime(new Date()))

    // 预览内容渲染前统一净化（与编辑器只读态复用同一净化工具）
    const safeHtml = computed(() => sanitizeRichText(props.html || ''))

    // 将比例映射为滚动位置并应用到预览内容区
    const applyScroll = (ratio: number) => {
      const el = previewContentRef.value
      if (!el) return
      const total = el.scrollHeight - el.clientHeight
      const top = Math.max(0, total * (ratio || 0))
      el.scrollTo({ top })
    }

    // 计算屏幕宽度：基于视口高度与比例系数（19.5:9 → 宽高系数约 0.46154）
    const updateWidth = () => {
      const base = (window.innerHeight - (props.vhOffset || 280)) * 0.46154
      const target = Math.max(260, base)
      screenWidth.value = Math.min(props.maxWidth || 460, target)
    }

    watch(
      () => props.scrollRatio,
      r => applyScroll(r),
      { immediate: true }
    )

    onMounted(() => {
      updateWidth()
      applyScroll(props.scrollRatio)
      window.addEventListener('resize', updateWidth)
    })
    watch(() => props.maxWidth, updateWidth)
    watch(() => props.vhOffset, updateWidth)

    return { previewContentRef, displayTime, safeHtml, screenWidth }
  },
}
</script>
<style lang="scss" scoped>
/* 手机机身外观（灵动岛外壳） */
.phone-frame {
  display: inline-block;
  height: 100%;
  padding: 8px;
  background: #101318;
  border-radius: 40px;
  box-shadow:
    0 0 0 1.5px #3a414b,
    0 18px 44px rgb(15 20 28 / 26%),
    0 4px 12px rgb(15 20 28 / 12%);
}

.phone-body {
  position: relative;
  height: 100%;
}

/* 灵动岛（Dynamic Island，替代旧刘海） */
.phone-notch {
  position: absolute;
  top: 8px;
  left: 50%;
  z-index: 2;
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  width: 86px;
  height: 24px;
  background: #0b0d10;
  border-radius: 12px;
  transform: translateX(-50%);
}

.notch-speaker {
  display: none;
}

.notch-camera {
  width: 7px;
  height: 7px;
  background: radial-gradient(circle at 30% 30%, #2a3340, #0b0d10 65%);
  border-radius: 50%;
}

/* 屏幕主体（固定 19.5:9 比例，高度随宽度自动适配） */
.phone-screen {
  height: 100%;
  // aspect-ratio: 9 / 19.5;
  overflow: hidden;
  background: var(--dc-surface, #fff);
  border-radius: 32px;
}

/* 顶部状态栏（时间与简单图标） */
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 42px;
  padding: 0 18px;
}

.status-time {
  font-size: 14px;
  font-weight: 600;
  color: var(--dc-text-1);
}

.status-icons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.icon-signal i {
  display: inline-block;
  width: 3px;
  margin-right: 2px;
  background: #333;
  border-radius: 1px;
}

.icon-signal i:nth-child(1) {
  height: 6px;
}

.icon-signal i:nth-child(2) {
  height: 8px;
}

.icon-signal i:nth-child(3) {
  height: 10px;
}

.icon-signal i:nth-child(4) {
  height: 12px;
}

.icon-battery {
  position: relative;
  display: inline-block;
  width: 18px;
  height: 10px;
  border: 1.5px solid #333;
  border-radius: 2px;
}

.icon-battery::after {
  position: absolute;
  top: 3px;
  right: -3px;
  width: 2px;
  height: 4px;
  content: '';
  background: #333;
  border-radius: 1px;
}

.icon-battery .level {
  position: absolute;
  inset: 2px;
  background: #2ecc71;
  border-radius: 1px;
}

/* 内容区与底部 Home 条 */
.preview-content {
  height: calc(100% - 62px);
  padding: 8px;
  overflow-y: auto;
}

.home-indicator {
  width: 110px;
  height: 4px;
  margin: 8px auto;
  background: var(--dc-text-1, #1f2733);
  border-radius: 999px;
  opacity: 0.9;
}
</style>
