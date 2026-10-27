<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
  <!-- 退出登录 -->
  <el-dropdown trigger="click" placement="bottom-end" :popper-options="HEADER_MENU_POPPER_OPTIONS" :show-arrow="false"
    popper-class="header-menu-popper header-user-popper">
    <span class="el-dropdown-link dc-user select-none">
      <!-- 26×26 头像（有头像图则用图，否则蓝底首字母） + 用户名 + 下拉箭头 -->
      <img v-if="avatar" class="dc-user__avatar" :src="avatar" alt="avatar" />
      <span v-else class="dc-user__avatar dc-user__avatar--initial">{{ userInitial }}</span>
      <span v-if="username" class="dc-user__name">{{ username }}</span>
      <span class="dc-user__chevron">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </span>
    <template #dropdown>
      <el-dropdown-menu class="logout">
        <el-dropdown-item>
          <router-link to="/info/index">
            <el-icon>
              <User />
            </el-icon>{{ $t("buttons.personalCenter") }}</router-link>
        </el-dropdown-item>
        <el-dropdown-item @click="showMenuTree">
          <el-icon>
            <Medal />
          </el-icon>{{ $t("buttons.myAuthority") }}
        </el-dropdown-item>
        <el-dropdown-item @click="logout">
          <el-icon>
            <SwitchButton />
          </el-icon>
          {{ $t("buttons.hsLoginOut") }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
  <el-dialog v-model="dialogMenuTree" :title="$t('layout.myPermissions')" append-to-body>
    <el-tree ref="menuTreeRef" :data="menuTree" node-key="id" highlight-current />
  </el-dialog>
</template>
<script setup lang="ts">
import { HEADER_MENU_POPPER_OPTIONS } from '@/layout/components/header-menu'
import { fetchMenuTree } from '@/api/upms/menu'
import { useNav } from '@/layout/hooks/useNav'
import { useUserStoreHook } from '@/store/modules/user'
import { computed, ref } from 'vue'

const { logout, username, avatarsStyle } = useNav()
const dialogMenuTree = ref(false)
const menuTree = ref([])
const userInfo = computed(() => {
  return useUserStoreHook()?.userInfo
})
const avatar = computed(() => {
  return userInfo.value.avatar
})
// 无头像图时显示用户名首字母（大写）
const userInitial = computed(() => {
  const name = username?.value || userInfo.value?.name || ''
  return name ? name.charAt(0).toUpperCase() : 'U'
})
function showMenuTree() {
  fetchMenuTree().then(response => {
    menuTree.value = response.data ?? []
    dialogMenuTree.value = true
  })
}
</script>

<style lang="scss" scoped>
/* 头像区 = 26×26 头像 + 用户名 + 下拉箭头 */
.dc-user {
  display: flex;
  flex: none;
  gap: 7px;
  align-items: center;
  padding: 3px 8px 3px 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;

  &:hover {
    background: var(--dc-bg-page); // #F5F6FA
  }

  &__avatar {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    object-fit: cover;
    border-radius: 50%;

    &--initial {
      font-size: 12px;
      font-weight: 800;
      color: #fff;
      background: var(--dc-brand);
    }
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: var(--dc-text-2);
    white-space: nowrap;
  }

  &__chevron {
    display: flex;
    color: var(--dc-text-3);
  }
}
</style>
