<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<!-- 系统管理 · 管理员：后台账号的增删改查、角色分配与重置密码 -->
<template>
  <div class="userpage-dc goods-dc-page">
    <DcTableShell
      v-model:keyword="searchForm.username"
      storage-key="upms-user"
      :cols="tblCols"
      grid="1.5fr 1.2fr 0.85fr 1fr 1fr 1.35fr"
      q-ph="搜索用户名"
      :rows="visibleRows"
      :total="page.total"
      :loading="listLoading"
      :filtered="isFiltered"
      empty-title="没有匹配的账号"
      :empty-btn-text="permissions['sys:user:add'] ? '新增管理员' : ''"
      export-file-name="管理员列表"
      :row-class="rowClass"
      @search="handleQuery"
      @reset="handleReset"
      @refresh="refreshChange"
      @sort-change="onSort"
      @empty-action="onEmptyAction"
      @row-click="onRowClick"
    >
      <template #banner>
    <div class="goodsspu-dc__banner">
      <div class="goodsspu-dc__banner-grid" />
      <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--1" />
      <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--2" />
      <div class="goodsspu-dc__banner-head">
        <div class="goodsspu-dc__banner-title">管理员</div>
        <div class="goodsspu-dc__banner-sub">维护后台登录账号与角色分配，控制登录与访问权限</div>
      </div>
      <div style="flex: 1" />
      <div class="userpage-dc__banner-art" aria-hidden="true">
        <svg width="150" height="62" viewBox="0 0 150 62" fill="none" style="position: absolute; top: 2px; left: 26px">
          <path d="M75 16v10M75 26H37v8M75 26h38v8" stroke="#B9CDFB" stroke-width="1.6" />
          <circle cx="75" cy="10" r="8" fill="#FFFFFF" stroke="#3C6EF0" stroke-width="1.6" />
          <circle cx="75" cy="8" r="2.6" fill="#3C6EF0" />
          <path d="M70 14c1.2-2 8.8-2 10 0" stroke="#3C6EF0" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <div class="is-float" style="position: absolute; top: 36px; left: 36px">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#FFFFFF" stroke="#13C2C2" stroke-width="1.6" />
            <circle cx="12" cy="10" r="2.6" fill="#13C2C2" />
            <path d="M7 16.5c1.5-2.4 8.5-2.4 10 0" stroke="#13C2C2" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </div>
        <div class="is-float-b" style="position: absolute; top: 36px; left: 116px">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#FFFFFF" stroke="#722ED1" stroke-width="1.6" />
            <circle cx="12" cy="10" r="2.6" fill="#722ED1" />
            <path d="M7 16.5c1.5-2.4 8.5-2.4 10 0" stroke="#722ED1" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </div>
        <span class="is-blink-1" style="position: absolute; top: 12px; left: 12px; width: 5px; height: 5px; background: #3c6ef0; border-radius: 50%" />
        <span class="is-blink-2" style="position: absolute; top: 20px; left: 186px; width: 5px; height: 5px; background: #13c2c2; border-radius: 50%" />
      </div>
      <div class="goodsspu-dc__banner-stats">
        <div class="goodsspu-dc__stat">
          <div class="goodsspu-dc__stat-label">在册账号</div>
          <div class="goodsspu-dc__stat-num">{{ page.total }}</div>
        </div>
      </div>
    </div>
      </template>

      <template #filters>
        <el-select placeholder="全部角色" v-model="searchForm.roleId" class="userdc__filter-select dc-nsel" @change="handleQuery">
          <el-option value="" label="全部角色" />
          <el-option v-for="r in roleOptions" :key="r.id" :value="r.id" :label="r.name" />
        </el-select>
      </template>

      <template #tools>
        <button
          v-if="permissions['sys:user:add']"
          class="dc-tbl__tool-btn dc-tbl__tool-btn--primary"
          @click="openUserForm('add')"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
          新增管理员
        </button>
      </template>

      <!-- 用户：头像 + 用户名/昵称 -->
      <template #col-user="{ row, index }">
        <div class="userdc__user">
          <span class="userdc__avatar" :style="row.avatar ? '' : avatarStyle(index)">
            <img v-if="row.avatar" :src="row.avatar" alt="">
            <template v-else>{{ (row.username || "?").slice(0, 1) }}</template>
          </span>
          <span class="userdc__user-main">
            <span class="userdc__user-name">{{ row.username || "—" }}</span>
            <span class="userdc__user-sub">{{ row.nickName || "—" }}</span>
          </span>
        </div>
      </template>

      <template #col-role="{ row }">
        <div class="userdc__chips">
          <template v-if="roleNames(row).length">
            <span v-for="rn in roleNames(row)" :key="rn" class="userdc__chip">{{ rn }}</span>
          </template>
          <span v-else class="userdc__none">—</span>
        </div>
      </template>

      <!-- 允许登录（0=允许 / 9=禁止）：只读展示，通过「编辑」修改 -->
      <template #col-lock="{ row }">
        <span
          class="userdc__switch is-disabled"
          :class="{ 'is-on': String(row.lockFlag) === '0' }"
          :title="(String(row.lockFlag) === '0' ? '允许登录' : '禁止登录') + '（请通过「编辑」修改）'"
        ><span /></span>
      </template>

      <template #col-phone="{ row }">
        <div class="userdc__cell-text">{{ row.phone || "—" }}</div>
      </template>

      <template #col-createTime="{ row }">
        <div class="userdc__cell-time">{{ fmtTime(row.createTime) }}</div>
      </template>

      <template #col-acts="{ row }">
        <DcOverflowActions :actions="actsOf(row)" :row-key="row.id" />
      </template>

      <template #empty-art>
        <DcEmptyImage :src="emptyImg" alt="管理员空状态插画" />
      </template>

      <template #pagination>
        <DcPager
          v-if="list.length > 0"
          :total="page.total"
          :current="page.currentPage"
          :page-size="page.pageSize"
          :page-sizes="[10, 20, 50]"
          @change="onPageChange"
          @size-change="onSizeChange"
        />
      </template>
    </DcTableShell>

    <!-- ============ 新增 / 编辑 弹窗 ============ -->
    <DcFormDialog
      v-model="uOpen"
      :title="uMode === 'add' ? '新增管理员' : '编辑管理员'"
      :mode="uMode"
      :width="640"
      :saving="uSaving"
      @save="saveUserForm"
    >
      <div class="dcfd-section"><i /><span>账号信息</span></div>
      <div class="dcfd-field">
        <label class="dcfd-label"><em>*</em>用户名</label>
        <input v-model="userForm.username" class="dcfd-input" :class="{ 'is-error': !!uErr.username }"
          :disabled="uMode === 'edit'" maxlength="20" placeholder="登录账号，创建后禁改">
        <div v-if="uErr.username" class="dcfd-error">{{ uErr.username }}</div>
      </div>
      <div class="dcfd-field">
        <label class="dcfd-label"><em>*</em>昵称</label>
        <input v-model="userForm.nickName" class="dcfd-input" :class="{ 'is-error': !!uErr.nickName }" maxlength="20" placeholder="显示名称">
        <div v-if="uErr.nickName" class="dcfd-error">{{ uErr.nickName }}</div>
      </div>
      <div class="dcfd-field">
        <label class="dcfd-label"><em>*</em>角色</label>
        <el-select v-model="userForm.roleIds" multiple collapse-tags filterable placeholder="请选择角色">
          <el-option v-for="r in roleOptions" :key="r.id" :label="r.name" :value="r.id" />
        </el-select>
        <div v-if="uErr.roleIds" class="dcfd-error">{{ uErr.roleIds }}</div>
      </div>
      <div class="dcfd-field">
        <label class="dcfd-label"><em>*</em>允许登录</label>
        <div class="dcfd-pills">
          <span v-for="o in uLockOpts" :key="o.value" class="dcfd-pill"
            :class="{ 'is-active': String(userForm.lockFlag) === o.value }" @click="userForm.lockFlag = o.value">{{ o.label }}</span>
        </div>
      </div>
      <div class="dcfd-field">
        <label class="dcfd-label">手机号</label>
        <input v-model="userForm.phone" class="dcfd-input" :class="{ 'is-error': !!uErr.phone }" maxlength="11" placeholder="选填，11 位手机号">
        <div v-if="uErr.phone" class="dcfd-error">{{ uErr.phone }}</div>
      </div>
      <div class="dcfd-field">
        <label class="dcfd-label">邮箱</label>
        <input v-model="userForm.email" class="dcfd-input" :class="{ 'is-error': !!uErr.email }" placeholder="选填">
        <div v-if="uErr.email" class="dcfd-error">{{ uErr.email }}</div>
      </div>
      <div class="dcfd-field dcfd-field--full">
        <label class="dcfd-label">头像</label>
        <material-list v-model:value="userForm.avatar" type="image" :num="1" :width="120" :height="120" />
      </div>

      <template v-if="uMode === 'add'">
        <div class="dcfd-section"><i /><span>安全</span></div>
        <div class="dcfd-field dcfd-field--full">
          <label class="dcfd-label"><em>*</em>初始密码</label>
          <input v-model="userForm.password" class="dcfd-input" :class="{ 'is-error': !!uErr.password }" type="password" maxlength="32" placeholder="不少于 6 位">
          <div class="dcfd-helper">密码加盐存储，接口不回显</div>
          <div v-if="uErr.password" class="dcfd-error">{{ uErr.password }}</div>
        </div>
      </template>
    </DcFormDialog>

    <!-- ============ 用户详情抽屉（行点击打开） ============ -->
    <Teleport to="body">
      <div v-if="detailRow" class="userdc-drawer__mask" @click="closeUserDetail">
        <div class="userdc-drawer" @click.stop>
          <div class="userdc-drawer__head">
            <span class="userdc-drawer__avatar" :style="detailRow.avatar ? '' : avatarStyle(detailIndex)">
              <img v-if="detailRow.avatar" :src="detailRow.avatar" alt="">
              <template v-else>{{ (detailRow.nickName || detailRow.username || "?").slice(0, 1) }}</template>
            </span>
            <div class="userdc-drawer__who">
              <div class="userdc-drawer__name-row">
                <span class="userdc-drawer__name">{{ detailRow.nickName || detailRow.username }}</span>
              </div>
              <div class="userdc-drawer__account">{{ detailRow.username }}</div>
            </div>
            <div style="flex: 1" />
            <span class="userdc-drawer__close" @click="closeUserDetail">✕</span>
          </div>
          <div class="userdc-drawer__body">
            <div>
              <div class="userdc-drawer__sec-title">档案</div>
              <div class="userdc-drawer__profile">
                <div>
                  <div class="userdc-drawer__field-k">允许登录</div>
                  <div class="userdc-drawer__field-v" :class="String(detailRow.lockFlag) === '0' ? 'is-allow' : 'is-deny'">
                    {{ String(detailRow.lockFlag) === "0" ? "允许" : "禁止" }}
                  </div>
                </div>
                <div>
                  <div class="userdc-drawer__field-k">创建时间</div>
                  <div class="userdc-drawer__field-v is-num">{{ detailRow.createTime || "—" }}</div>
                </div>
                <div>
                  <div class="userdc-drawer__field-k">手机号</div>
                  <div class="userdc-drawer__field-v is-num">{{ detailRow.phone || "—" }}</div>
                </div>
                <div>
                  <div class="userdc-drawer__field-k">邮箱</div>
                  <div class="userdc-drawer__field-v">{{ detailRow.email || "—" }}</div>
                </div>
              </div>
            </div>
            <div>
              <div class="userdc-drawer__sec-title">角色</div>
              <div class="userdc-drawer__roles">
                <template v-if="roleNames(detailRow).length">
                  <span v-for="rn in roleNames(detailRow)" :key="rn" class="userdc-drawer__role-pill">{{ rn }}</span>
                </template>
                <span v-else class="userdc__none">—</span>
              </div>
            </div>
            <div>
              <div class="userdc-drawer__sec-title">最近登录</div>
              <div class="userdc-drawer__logins">
                <template v-if="detailLogins.length">
                  <div v-for="(lg, li) in detailLogins" :key="li" class="userdc-drawer__login">
                    <span class="userdc-drawer__login-dot" :class="lg.exception ? 'is-fail' : 'is-ok'" />
                    <span class="userdc-drawer__login-way">{{ grantText(lg.grantType) }}</span>
                    <span class="userdc-drawer__login-ip">{{ lg.remoteAddr || "—" }}</span>
                    <div style="flex: 1" />
                    <span class="userdc-drawer__login-time">{{ lg.createTime || "—" }}</span>
                  </div>
                </template>
                <div v-else class="userdc-drawer__login">
                  <span class="userdc-drawer__login-dot" />
                  <span class="userdc-drawer__login-way">暂无登录记录</span>
                  <span class="userdc-drawer__login-ip">—</span>
                  <div style="flex: 1" />
                  <span class="userdc-drawer__login-time">—</span>
                </div>
              </div>
            </div>
          </div>
          <div class="userdc-drawer__foot">
            <button v-if="permissions['sys:user:password']" class="userdc-drawer__btn" @click="detailResetPwd">重置密码</button>
            <button v-if="permissions['sys:user:edit']" class="userdc-drawer__btn userdc-drawer__btn--primary" @click="detailEdit">编辑用户</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ============ 重置密码弹窗（500 是插画件的原始规格） ============ -->
    <el-dialog v-model="dialogVisible" width="500px" append-to-body class="password-dialog"
      :close-on-click-modal="false">
      <template #header>
        <div class="password-dialog-header">
          <span class="dialog-title">{{ $t('upms.user.editUser') }}<span class="highlight-username">{{
            selectRow.username }}</span>{{ $t('upms.user.pwdSuffix') }}</span>
          <span class="dialog-subtitle">重置后该用户下次登录时须先修改密码</span>
        </div>
      </template>
      <div class="password-dialog-body">
        <el-form ref="passwordFormRef" :model="form2" :rules="passwordRules" label-width="100px" label-position="top">
          <el-form-item :label="$t('upms.user.newPwd')" prop="password" class="w-[260px]">
            <el-input v-model="form2.password" type="password" placeholder="请输入新密码" maxlength="32" show-password />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <div class="password-dialog-buttons">
          <el-button @click="form2.password = ''">清空</el-button>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitPasswordF">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { getPage as getLoginLogPage } from "@/api/upms/loglogin";
import { getList as getRoleList } from "@/api/upms/role";
import { addObj, delObj, editPassword, getCount, getPage, putObj } from "@/api/upms/user";
import MaterialList from "@/components/material/list.vue";
import DcTableShell from "@/components/dc-shell/DcTableShell.vue";
import DcPager from "@/components/dc-shell/DcPager.vue";
import DcOverflowActions from "@/components/dc-shell/DcOverflowActions.vue";
import { useDcDeleteToast } from "@/components/dc-shell/dcDeleteToast";
import { DcEmptyImage } from "@/components/dc-states";
import type { DcRowAction, DcSortPayload, DcTableCol } from "@/components/dc-shell/types";
import DcFormDialog from "@/components/dc-dialog/DcFormDialog.vue";
import { usePermissionStoreHook } from "@/store/modules/permission";
import { filterForm } from "@/utils/util";
import { computed, getCurrentInstance, onUnmounted, reactive, ref } from "vue";
import emptyImg from "@/assets/common/empty.png";

import "../../mall/goods-list-dc.scss";
import "../user-dc.scss";
import { appConfirm } from "@/components/overlay";

const { proxy } = getCurrentInstance()!;

const permissions = computed(() => usePermissionStoreHook()?.permissions);

// ==================== 列表 ====================
const page = ref({
  total: 0,
  currentPage: 1,
  pageSize: 20,
  descs: "",
  ascs: "",
});
const list = ref<any[]>([]);
const listLoading = ref(true);
// 当前生效的搜索条件：翻页 / 排序 / 刷新都要带上
const paramsSearch = ref<any>({});

function getPageF(pageVal: any) {
  listLoading.value = true;
  getPage(
    Object.assign(
      {
        current: pageVal.currentPage,
        size: pageVal.pageSize,
        descs: page.value.descs,
        ascs: page.value.ascs,
      },
      paramsSearch.value,
    ),
  )
    .then((response) => {
      list.value = response.data.records;
      page.value.total = response.data.total;
      page.value.currentPage = pageVal.currentPage;
      page.value.pageSize = pageVal.pageSize;
      listLoading.value = false;
    })
    .catch(() => {
      listLoading.value = false;
    });
}

function refreshChange() {
  getPageF(page.value);
}

const searchForm = reactive({ username: "", roleId: "" });
const isFiltered = computed(() => !!(searchForm.username.trim() || searchForm.roleId));
function handleQuery() {
  const p: Record<string, any> = {};
  if (searchForm.username.trim()) p.username = searchForm.username.trim();
  if (searchForm.roleId) p.roleId = searchForm.roleId;
  paramsSearch.value = filterForm(p);
  page.value.currentPage = 1;
  getPageF(page.value);
}
function handleReset() {
  searchForm.username = "";
  searchForm.roleId = "";
  paramsSearch.value = {};
  page.value.currentPage = 1;
  getPageF(page.value);
}

// 排序：三态由壳维护，驼峰转下划线列名
function onSort(p: DcSortPayload) {
  const prop = p.order ? p.key.replace(/([A-Z])/g, "_$1").toLowerCase() : "";
  page.value.ascs = p.order === "asc" ? prop : "";
  page.value.descs = p.order === "desc" ? prop : "";
  getPageF(page.value);
}

function onPageChange(p: number) {
  page.value.currentPage = p;
  getPageF(page.value);
}
function onSizeChange(s: number) {
  page.value.pageSize = s;
  page.value.currentPage = 1;
  getPageF(page.value);
}

const tblCols: DcTableCol[] = [
  { key: "user", t: "用户", hideable: false, exportValue: (r: any) => `${r.username || ""} / ${r.nickName || ""}` },
  { key: "role", t: "角色", exportValue: (r: any) => roleNames(r).join(" / ") },
  { key: "lock", t: "允许登录", exportValue: (r: any) => (String(r.lockFlag) === "0" ? "允许" : "禁止") },
  { key: "phone", t: "手机号" },
  { key: "createTime", t: "创建时间", sort: true, exportValue: (r: any) => fmtTime(r.createTime) },
  { key: "acts", t: "操作", al: "right", hideable: false },
];

// 行操作：编辑 / 重置密码 / 删除
function actsOf(row: any): DcRowAction[] {
  return [
    { key: "edit", t: "编辑", on: () => openUserForm("edit", row), hidden: !permissions.value["sys:user:edit"] },
    { key: "pwd", t: "重置密码", on: () => editPasswordF(row), hidden: !permissions.value["sys:user:password"] },
    { key: "del", t: "删除", danger: true, on: () => handleDel(row), hidden: !permissions.value["sys:user:del"] },
  ];
}

function onRowClick(row: any) {
  openUserDetail(row, list.value.indexOf(row));
}
function onEmptyAction(filtered: boolean) {
  if (filtered) handleReset();
  else openUserForm("add");
}

// ==================== 删除（5 秒内可撤销） ====================
const { visibleRows, rowClass, requestDelete } = useDcDeleteToast(() => list.value);
function handleDel(row: any) {
  appConfirm({ intent: "delete", title: `删除账号「${row.username}」？`, verb: "删除" })
    .then(() => {
      requestDelete(row, {
        commit: () => delObj(row.id),
        message: proxy.$t("commons.delSuccess"),
        onCommitted: () => getPageF(page.value),
      });
    })
    .catch(() => {
      // 用户取消确认框
    });
}

// ==================== 角色字典 ====================
const roleMap = ref<Record<string, string>>({});
const roleOptions = computed(() =>
  Object.entries(roleMap.value).map(([id, name]) => ({ id, name })),
);
function loadRoles() {
  getRoleList(undefined)
    .then((res: any) => {
      // /upms/role/list 直接返回数组，不包在 data 里
      const rows = Array.isArray(res) ? res : res?.data || [];
      const m: Record<string, string> = {};
      rows.forEach((r: any) => (m[r.id] = r.roleName));
      roleMap.value = m;
    })
    .catch(() => {});
}
function roleNames(row: any): string[] {
  const raw = row?.roleIds;
  const ids = Array.isArray(raw) ? raw : raw ? String(raw).split(",") : [];
  return ids.map((id: any) => roleMap.value[id]).filter(Boolean);
}

// ==================== 展示辅助 ====================
const AV_GRADIENTS = [
  "linear-gradient(135deg,#3C6EF0,#5A86F5)",
  "linear-gradient(135deg,#07C160,#3ED483)",
  "linear-gradient(135deg,#FA8C16,#FFB35C)",
  "linear-gradient(135deg,#722ED1,#9A5CE6)",
  "linear-gradient(135deg,#13C2C2,#4DD6D6)",
  "linear-gradient(135deg,#EB2F96,#F67AB7)",
];
function avatarStyle(i: number) {
  return { background: AV_GRADIENTS[Math.max(i, 0) % 6] };
}
// 创建时间去秒（YYYY-MM-DD HH:mm:ss → YYYY-MM-DD HH:mm）
function fmtTime(t: any) {
  return t ? String(t).slice(0, 16) : "—";
}
const GRANT_LABEL: Record<string, string> = { password: "账号密码", refresh_token: "刷新令牌" };
function grantText(v: any) {
  if (v == null || v === "") return "—";
  return GRANT_LABEL[v] || String(v);
}

// ==================== 新增 / 编辑 ====================
const uOpen = ref(false);
const uMode = ref<"add" | "edit">("add");
const uSaving = ref(false);
const uErr = reactive<Record<string, string>>({});
// 打开编辑时的原始手机号 / 邮箱：只有改动过才查重
const uOriginal = reactive({ phone: "", email: "" });
const userForm = reactive<any>({
  id: "",
  username: "",
  password: "",
  nickName: "",
  roleIds: [] as any[],
  lockFlag: "0",
  phone: "",
  email: "",
  avatar: [] as any[], // MaterialList 用数组，保存时取第一个
});
const uLockOpts = [
  { value: "0", label: "允许" },
  { value: "9", label: "禁止" },
];

function openUserForm(mode: "add" | "edit", row?: any) {
  uMode.value = mode;
  Object.keys(uErr).forEach((k) => delete uErr[k]);
  if (mode === "add") {
    Object.assign(userForm, {
      id: "",
      username: "",
      password: "",
      nickName: "",
      roleIds: [],
      lockFlag: "0",
      phone: "",
      email: "",
      avatar: [],
    });
  } else {
    const raw = row.roleIds;
    Object.assign(userForm, {
      id: row.id,
      username: row.username || "",
      password: "",
      nickName: row.nickName || "",
      roleIds: Array.isArray(raw) ? [...raw] : raw ? String(raw).split(",") : [],
      lockFlag: String(row.lockFlag ?? "0"),
      phone: row.phone || "",
      email: row.email || "",
      avatar: row.avatar ? [row.avatar] : [],
    });
  }
  uOriginal.phone = userForm.phone;
  uOriginal.email = userForm.email;
  uOpen.value = true;
}

/** 唯一性与格式校验：用户名仅新增时校验；手机号 / 邮箱在填写且发生变化时查重。查重接口失败不阻断，交后端兜底 */
async function checkUserDuplicate(): Promise<boolean> {
  const checks: Promise<void>[] = [];
  const isAdd = uMode.value === "add";
  const phone = userForm.phone.trim();
  const email = userForm.email.trim();

  if (isAdd) {
    checks.push(
      getCount({ username: userForm.username.trim() })
        .then((r: any) => {
          if ((r?.data || 0) > 0) uErr.username = "用户名已被占用";
        })
        .catch(() => {}),
    );
  }
  if (phone && (isAdd || phone !== uOriginal.phone)) {
    checks.push(
      getCount({ phone })
        .then((r: any) => {
          if ((r?.data || 0) > 0) uErr.phone = "手机号已被占用";
        })
        .catch(() => {}),
    );
  }
  if (email && (isAdd || email !== uOriginal.email)) {
    checks.push(
      getCount({ email })
        .then((r: any) => {
          if ((r?.data || 0) > 0) uErr.email = proxy.$t("upms.user.emailAlreadyExists");
        })
        .catch(() => {}),
    );
  }
  await Promise.all(checks);
  return !Object.keys(uErr).length;
}

async function saveUserForm() {
  Object.keys(uErr).forEach((k) => delete uErr[k]);
  const username = userForm.username.trim();
  if (!username) uErr.username = "用户名为必填项";
  else if (uMode.value === "add" && !/^[a-zA-Z0-9]+$/.test(username)) uErr.username = "用户名只能包含字母和数字";
  if (uMode.value === "add" && userForm.password.trim().length < 6) uErr.password = "初始密码不少于 6 位";
  if (!userForm.nickName.trim()) uErr.nickName = "昵称为必填项";
  if (!userForm.roleIds?.length) uErr.roleIds = "角色为必填项";
  if (userForm.phone.trim() && !/^1\d{10}$/.test(userForm.phone.trim())) uErr.phone = "请输入 11 位手机号";
  if (Object.keys(uErr).length) return;

  uSaving.value = true;
  if (!(await checkUserDuplicate())) {
    uSaving.value = false;
    return;
  }

  const payload: any = {
    id: userForm.id,
    username,
    nickName: userForm.nickName.trim(),
    roleIds: userForm.roleIds,
    lockFlag: userForm.lockFlag,
    phone: userForm.phone.trim(),
    email: userForm.email.trim(),
    avatar: userForm.avatar?.length ? userForm.avatar[0] : "",
  };
  if (uMode.value === "add") {
    delete payload.id;
    payload.password = userForm.password;
  }
  const req = uMode.value === "add" ? addObj(payload) : putObj(payload);
  req
    .then(() => {
      proxy.$notify({
        title: proxy.$t("commons.success"),
        message: uMode.value === "add" ? proxy.$t("commons.addSuccess") : proxy.$t("commons.updateSuccess"),
        type: "success",
        duration: 2000,
      });
      uOpen.value = false;
      uSaving.value = false;
      getPageF(page.value);
    })
    .catch((e: any) => {
      uSaving.value = false;
      // 拦截器已弹过 toast；只有 reject 裸 {msg} 那条路径没弹过
      if (e && typeof e === "object" && !(e instanceof Error) && e.msg) {
        proxy.$message?.({ showClose: true, message: e.msg, type: "error" });
      }
    });
}

// ==================== 重置密码（PUT /upms/user/password；后端会要求该用户下次登录先改密） ====================
const dialogVisible = ref(false);
const selectRow = ref({ id: "", username: "" });
const form2 = ref({ password: "" });
const passwordFormRef = ref();
const passwordRules = computed(() => ({
  password: [
    {
      required: true,
      min: 6,
      message: proxy.$t("upms.user.min6Chars"),
      trigger: "change",
    },
  ],
}));
function editPasswordF(row: any) {
  selectRow.value = row;
  form2.value.password = "";
  dialogVisible.value = true;
}
function submitPasswordF() {
  passwordFormRef.value?.validate((valid: boolean) => {
    if (!valid) return;
    editPassword({ id: selectRow.value.id, password: form2.value.password })
      .then(() => {
        proxy.$notify({
          title: proxy.$t("commons.success"),
          message: proxy.$t("commons.updateSuccess"),
          type: "success",
          duration: 2000,
        });
        dialogVisible.value = false;
        form2.value.password = "";
      })
      .catch(() => {
        // 错误已在 http 拦截器中处理
      });
  });
}

// ==================== 详情抽屉（最近登录：登录日志按 createId 取 3 条） ====================
const detailRow = ref<any>(null);
const detailIndex = ref(0);
const detailLogins = ref<any[]>([]);
function openUserDetail(row: any, i: number) {
  detailRow.value = row;
  detailIndex.value = i;
  detailLogins.value = [];
  document.body.style.overflow = "hidden";
  getLoginLogPage({
    current: 1,
    size: 3,
    descs: "create_time",
    ascs: "",
    createId: row.id,
  })
    .then((res) => {
      detailLogins.value = res?.data?.records || [];
    })
    .catch(() => {
      detailLogins.value = [];
    });
}
function closeUserDetail() {
  detailRow.value = null;
  document.body.style.overflow = "";
}
function detailResetPwd() {
  const row = detailRow.value;
  closeUserDetail();
  editPasswordF(row);
}
function detailEdit() {
  const row = detailRow.value;
  closeUserDetail();
  openUserForm("edit", row);
}
onUnmounted(() => {
  document.body.style.overflow = "";
});

loadRoles();
getPageF(page.value);
</script>
