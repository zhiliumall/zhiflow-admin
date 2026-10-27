<script setup lang="ts">
import { useNav } from "@/layout/hooks/useNav";
import mdiKeyboardEsc from "@/assets/svg/keyboard_esc.svg?component";
import enterOutlined from "@/assets/svg/enter_outlined.svg?component";
import ArrowUpLine from "@iconify-icons/ri/arrow-up-line";
import ArrowDownLine from "@iconify-icons/ri/arrow-down-line";

const props = withDefaults(defineProps<{ total: number }>(), {
  total: 0,
});

const { device } = useNav();
</script>

<template>
  <div class="search-footer">
    <span class="search-footer-item">
      <enterOutlined class="icon" />
      {{ $t("buttons.pureConfirm") }}
    </span>
    <span class="search-footer-item">
      <IconifyIconOffline :icon="ArrowUpLine" class="icon" />
      <IconifyIconOffline :icon="ArrowDownLine" class="icon" />
      {{ $t("buttons.pureSwitch") }}
    </span>
    <span class="search-footer-item">
      <mdiKeyboardEsc class="icon" />
      {{ $t("buttons.pureClose") }}
    </span>
    <p
      v-if="device !== 'mobile' && props.total > 0"
      class="search-footer-total"
    >
      {{ `${$t("search.pureTotal")} ${props.total}` }}
    </p>
  </div>
</template>

<style lang="scss" scoped>
.search-footer {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: var(--overlay-ink-2, var(--dc-text-3));

  .search-footer-item {
    display: flex;
    align-items: center;
    margin-right: 16px;
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    margin-right: 4px;
    font-size: 12px;
    color: var(--overlay-ink-2, var(--dc-text-3));
    background: var(--overlay-head-bg, #f8fafc);
    border: 1px solid var(--overlay-border, #e2e8f0);
    border-radius: 4px;
  }

  .search-footer-total {
    position: absolute;
    right: 20px;
    color: var(--text-tertiary, var(--dc-text-3));
  }
}
</style>
