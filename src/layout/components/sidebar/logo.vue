<script setup lang="ts">
/** 侧栏 / 顶栏 logo：显示「商城设置」里的商城名称与 logo，取不到时显示「智流商城」 */
import { useBrand } from "@/composables/useBrand";
import { useLayout } from "@/layout/hooks/useLayout";
import { ref } from "vue";

const props = defineProps({
  collapse: Boolean,
  title: String,
});
const { layout } = useLayout();
const title = ref(props.title);
const brand = useBrand();
const showInfo = brand.info;
</script>

<template>
  <div v-if="layout == 'elegant'" class="sidebar-logo-container-elegant" :class="{ collapses: props.collapse }">
    <transition name="sidebarLogoFade">
      <div v-if="layout == 'elegant'" class="flex content-center ml-[15px]">
        <div key="props.collapse" :title="title" class="sidebar-logo-link">
          <el-image v-if="showInfo.logo" fit="fill" style="width: 33px; height: 33px; border-radius: 6px"
            class="mr-[6px]" :src="showInfo.logo" />
        </div>
        <div class="ml-[5px] h-[60px] flex content-center">
          <div style="margin: auto" class="flex items-center">
            <span class="h-[30px] leading-[30px] font-semibold text-[16px] whitespace-nowrap">
              {{ showInfo.name }}
            </span>
          </div>
        </div>
      </div>
    </transition>
  </div>
  <!-- logo 区：蓝底圆角方块（内含店铺图标）+ 商城名称 + 营业中徽章 -->
  <div v-else class="dc-logo" :title="title">
    <!-- 商城设置里配置了 logo 则优先显示 -->
    <img v-if="showInfo.logo" class="dc-logo__img" :src="showInfo.logo" width="28" height="28" />
    <div v-else class="dc-logo__tile">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M4.2 4h15.6" /><path d="M3.6 8.6h16.8" /><path d="M5.6 8.6V20h12.8V8.6" /><path d="M9.8 20v-4.6h4.4V20" />
      </svg>
    </div>
    <span class="dc-logo__name">{{ showInfo.name }}</span>
    <span class="dc-logo__status">
      <span class="dc-logo__status-dot"></span>
      营业中
    </span>
  </div>
</template>

<style lang="scss" scoped>


@keyframes dc-logo-breath {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.45;
    transform: scale(0.8);
  }
}

.dc-logo {
  display: flex;
  gap: 10px;
  align-items: center;
  height: 100%;
  padding-left: 6px;
  white-space: nowrap;

  /* ⚠️ 重置全局 sidebar.scss `.horizontal-header .horizontal-header-left span{height:32px;...}`（3-class 特异性）
     那条旧规则会把本区所有 span 压成 32px 高、白字、带左margin —— 用 !important 确保压过 */
  span {
    height: auto !important;
    margin: 0 !important;
    overflow: visible !important;
    font-size: inherit !important;
    font-weight: inherit !important;
    line-height: normal !important;
    color: inherit !important;
  }

  &__tile {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: var(--zf-menu-brand, var(--dc-brand));
    border-radius: 8px;
  }

  &__img {
    flex: none;
    width: 28px;
    height: 28px;
    object-fit: cover;
    border-radius: 7px;
  }

  &__name {
    font-size: 15px !important;
    font-weight: 600 !important;
    line-height: 1.4 !important;
    color: var(--dc-text-1) !important;
  }

  .dc-logo__status {
    display: flex !important;
    flex: none;
    gap: 5px;
    align-items: center;
    height: auto !important;
    padding: 2px 10px !important;
    font-size: 12px !important;
    font-weight: 500 !important;
    line-height: 1.4 !important;
    color: #1f8a4c !important;
    background: #e5f8ec;
    border-radius: 999px;
  }

  .dc-logo__status-dot {
    /* !important 必须：上面通用 `.dc-logo span{height:auto!important}` 会把圆点压成 0 高 → 消失 */
    flex: none;
    width: 6px !important;
    height: 6px !important;
    background: #1f8a4c;
    border-radius: 50%;
    animation: dc-logo-breath 2s ease-in-out infinite;
  }
}

.sidebar-logo-container-elegant {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 100px;
  overflow: hidden;
  text-align: center;
  cursor: pointer;

  .sidebar-logo-link {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    .sidebar-title {
      display: block;
      margin-top: 10px;
      overflow: hidden;
      font-size: 20px;
      font-weight: 600;
      color: var(--dc-brand);
      text-align: left;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .collapses {
    .sidebar-logo {
      margin-right: 0;
    }
  }
}


.sidebar-logo-container {
  position: relative;
  width: 100%;
  height: 48px;
  overflow: hidden;
  text-align: center;
  cursor: pointer;

  .sidebar-logo-link {
    height: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    .sidebar-title {
      display: block;
      width: 160px;
      margin-top: 10px;
      overflow: hidden;
      font-size: 20px;
      font-weight: 600;
      color: var(--dc-brand);
      text-align: left;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .collapses {
    .sidebar-logo {
      margin-right: 0;
    }
  }
}


/* logo 区 */
</style>
