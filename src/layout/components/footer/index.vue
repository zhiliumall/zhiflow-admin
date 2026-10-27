<script lang="ts" setup>
import { getConfig } from "@/config";
const TITLE = getConfig("Title");
const Website: string = getConfig("Website") as string;
</script>

<template>
  <footer
    class="layout-footer text-[var(--dc-text-3)] dark:text-[rgba(220,220,242,0.8)]"
  >
    Copyright © 2023-2026
    <a class="hover:text-primary" :href="Website" target="_blank">
      &nbsp;{{ TITLE }}
    </a>
  </footer>
</template>

<style lang="scss" scoped>
.layout-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0 0 8px;
  font-size: 14px;
}
</style>
