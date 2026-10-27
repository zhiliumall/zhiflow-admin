<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<!--金额显示组件-->
<template>
  <span
    class="lib-amount"
    :class="[amountClass, showCurrency ? 'lib-text-price' : '']"
    :style="{ color: color }"
  >
    {{ priceToThousands(Number(amount), { digit: digit }) }}
  </span>
</template>
<script lang="ts">
// noinspection TypeScriptCheckImport
import { priceToThousands } from "@pureadmin/utils";
import { type PropType, computed } from "vue";

export default {
  props: {
    /**
     * @description 显示金额
     */
    amount: {
      type: [Number, String],
      default: 0,
    },
    /**
     * @description 显示小数位数 默认2
     */
    digit: {
      type: Number,
      default: 2,
    },
    /**
     * @description 显示大小 xs xxs sm md lg xl xxl
     */
    size: {
      type: String as PropType<
        "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl"
      >,
    },
    /**
     * @description 显示颜色
     */
    color: {
      type: String,
      default: "",
    },
    /**
     * @description 是否加粗
     */
    b: {
      type: Boolean,
      default: true,
    },
    /**
     * @description 是否显示货币符号
     */
    showCurrency: {
      type: Boolean,
      default: true,
    },
  },
  setup(props) {
    const amountClass = computed(() => {
      return {
        "lib-amount-xxs": props.size === "xxs",
        "lib-amount-xs": props.size === "xs",
        "lib-amount-sm": props.size === "sm",
        "lib-amount-md": props.size === "md",
        "lib-amount-lg": props.size === "lg",
        "lib-amount-xl": props.size === "xl",
        "lib-amount-xxl": props.size === "xxl",
        "lib-amount-b": props.b === true,
      };
    });
    return {
      amountClass,
      priceToThousands,
    };
  },
};
</script>
