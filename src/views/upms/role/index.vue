<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
  <div class="role-dc-page">
    <DcTableShell
      v-model:keyword="searchQ"
      storage-key="upms-role"
      :cols="tblCols"
      grid="1.1fr 1.3fr 1.8fr 1.1fr 1.4fr"
      q-ph="搜索角色名称 / 标识"
      :rows="list"
      :total="page.total"
      :loading="listLoading"
      :filtered="!!searchQ.trim()"
      empty-title="暂无角色"
      :empty-btn-text="permissions['sys:role:add'] ? '新增角色' : ''"
      export-file-name="角色列表"
      :row-class="rowClassOf"
      @search="handleQuery"
      @reset="handleReset"
      @refresh="refreshChange"
      @sort-change="onSort"
      @empty-action="onEmptyAction"
      @row-click="onRowClick"
    >
    <!-- ============ 顶部横幅 ============ -->
    <template #banner>
    <div class="role-dc__banner">
      <div class="role-dc__banner-tex" />
      <div class="role-dc__banner-glow" />
      <div class="role-dc__banner-title">角色管理</div>
      <div style="flex: 1" />
      <div class="role-dc__banner-art">
        <div class="role-dc__art-main">
          <svg width="84" height="56" viewBox="0 0 84 56" fill="none">
            <rect x="1.5" y="1.5" width="81" height="53" rx="6" fill="#FFFFFF" stroke="#3C6EF0" stroke-width="1.5" />
            <circle cx="20" cy="22" r="8" fill="#EBF0FF" stroke="#3C6EF0" stroke-width="1.3" />
            <circle cx="20" cy="20" r="2.6" fill="#3C6EF0" />
            <path d="M15 26c1.4-2.2 8.6-2.2 10 0" stroke="#3C6EF0" stroke-width="1.3" stroke-linecap="round" />
            <rect x="36" y="12" width="36" height="4" rx="2" fill="#9DB6F8" />
            <path d="M36 26l3 3 6-6" stroke="#3C6EF0" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            <rect x="48" y="25" width="24" height="3.5" rx="1.75" fill="#D4E1FB" />
            <path d="M36 38l3 3 6-6" stroke="#3C6EF0" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            <rect x="48" y="37" width="18" height="3.5" rx="1.75" fill="#D4E1FB" />
          </svg>
        </div>
        <div class="role-dc__art-key">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3C6EF0" stroke-width="1.7" stroke-linecap="round">
            <circle cx="8" cy="14" r="4.5" />
            <path d="M11.5 10.5L20 2M16 6l3 3" />
          </svg>
        </div>
        <span class="role-dc__art-dot" />
      </div>
      <div class="role-dc__banner-metric">
        <div class="role-dc__banner-metric-label">角色数</div>
        <div class="role-dc__banner-metric-val">{{ page.total }}</div>
      </div>
    </div>
    </template>

      <!-- 新增角色 -->
      <template #tools>
        <button
          v-if="permissions['sys:role:add']"
          class="dc-tbl__tool-btn dc-tbl__tool-btn--primary"
          @click="openRoleForm('add')"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
          新增角色
        </button>
      </template>

      <template #col-roleName="{ row }">
        <div class="role-dc__cell-text">{{ row.roleName || "—" }}</div>
      </template>

      <!-- 角色标识：mono + 复制 -->
      <template #col-roleCode="{ row }">
        <div class="role-dc__cell-mono">
          <span class="role-dc__mono">{{ row.roleCode }}</span>
          <span class="role-dc__copy" title="复制" @click.stop="copyCode(row)">
            <svg v-if="copiedId === row.id" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--dc-success)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
            <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
          </span>
        </div>
      </template>

      <template #col-roleDesc="{ row }">
        <div class="role-dc__cell-text">{{ row.roleDesc || "—" }}</div>
      </template>

      <template #col-createTime="{ row }">
        <div class="role-dc__cell-text">{{ fmtTime(row.createTime) }}</div>
      </template>

      <!-- 操作：权限分配 / 编辑 / 删除（最多 3 项，未超阈值不需 DcOverflowActions） -->
      <template #col-acts="{ row }">
        <div class="dc-tbl__acts">
          <span v-if="canPerm(row)" class="dc-tbl__act" @click.stop="openPerm(row)">{{ $t("upms.role.assignPermission") }}</span>
          <span v-if="canEdit(row)" class="dc-tbl__act" @click.stop="openRoleForm('edit', row)">{{ $t("commons.edit") }}</span>
          <span v-if="canDel(row)" class="dc-tbl__act dc-tbl__act--danger" @click.stop="openDelConfirm(row)">{{ $t("commons.delete") }}</span>
        </div>
      </template>

      <!-- 分页（单页隐藏） -->
      <template #pagination>
        <DcPager
          v-if="totalPages > 1"
          :total="page.total"
          :current="page.currentPage"
          :page-size="page.pageSize"
          :page-sizes="[10, 20, 50]"
          @change="onPageChange"
          @size-change="onSizeChange"
        />
      </template>

      <template #empty-art>
        <DcEmptyImage
          :src="emptyImg"
          alt="角色管理空状态插画"
        />
      </template>
    </DcTableShell>

    <!-- 隐藏的 avue-crud host：列表首屏加载由它的 @on-load 触发 -->
    <div class="role-dc__crud-host" aria-hidden="true">
      <avue-crud
        ref="crud"
        v-model:page="page"
        :option="tableOption"
        :data="list"
        :table-loading="listLoading"
        :permission="permissionList"
        @on-load="getPageF"
        @sort-change="sortChange"
        @search-change="searchChange"
        @refresh-change="refreshChange"
      >
      </avue-crud>
    </div>

    <!-- ============ 新增 / 编辑 角色弹窗 ============ -->
    <DcFormDialog
      v-model="formOpen"
      :title="formMode === 'add' ? '新增角色' : '编辑角色'"
      :mode="formMode"
      :width="640"
      :saving="formSaving"
      @cancel="formOpen = false"
      @save="saveRoleForm"
    >
      <div class="dcfd-section"><i /><span>角色信息</span></div>
      <div class="dcfd-field">
        <label class="dcfd-label"><em>*</em>角色名称</label>
        <div class="dcfd-control">
          <input v-model="roleForm.roleName" class="dcfd-input" :class="{ 'is-error': !!errName }" maxlength="20" placeholder="如 运营专员" @input="errName = ''">
          <span class="dcfd-counter">{{ roleForm.roleName.length }}/20</span>
        </div>
        <div v-if="errName" class="dcfd-error">{{ errName }}</div>
      </div>
      <div class="dcfd-field">
        <label class="dcfd-label"><em>*</em>角色标识</label>
        <input v-model="roleForm.roleCode" class="dcfd-input" :class="{ 'is-error': !!errCode }" :disabled="formMode === 'edit'" maxlength="20" placeholder="ROLE_ 开头" @input="errCode = ''">
        <div class="dcfd-helper">用于服务端 @PreAuthorize 鉴权码，创建后禁改</div>
        <div v-if="errCode" class="dcfd-error">{{ errCode }}</div>
      </div>
      <div class="dcfd-field dcfd-field--full">
        <label class="dcfd-label"><em>*</em>角色描述</label>
        <div class="dcfd-control">
          <textarea v-model="roleForm.roleDesc" class="dcfd-textarea" maxlength="60" placeholder="该角色的职责范围，会显示在用户管理的角色选择器中" @input="errDesc = ''" />
          <span class="dcfd-counter">{{ (roleForm.roleDesc || "").length }}/60</span>
        </div>
        <div v-if="errDesc" class="dcfd-error">{{ errDesc }}</div>
      </div>

      <div class="dcfd-helper dcfd-field--full">保存后在列表「权限分配」中配置菜单与按钮权限</div>
    </DcFormDialog>

    <!-- ============ 权限分配抽屉 ============ -->
    <el-drawer
      v-model="dialogPermissionVisible"
      :size="540"
      :with-header="false"
      class="role-dc-perm-drawer"
      append-to-body
    >
      <div class="role-dc-perm">
        <div class="role-dc-perm__head">
          <span class="role-dc-perm__title">{{ $t("upms.role.assignPermission") }}</span>
          <span v-if="permRoleName" class="role-dc-perm__role">{{ permRoleName }}</span>
          <span class="role-dc-perm__code">{{ roleCode }}</span>
          <div style="flex: 1" />
          <span class="role-dc-perm__close" @click="dialogPermissionVisible = false">✕</span>
        </div>
        <div class="role-dc-perm__body">
          <!-- 工具行：搜索（空格=并且，逗号=或者，-词=排除，"短语"=短语） + 全选/全不选/反选 -->
          <div class="role-dc-perm__tools">
            <div class="role-dc-perm__search">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--dc-text-3)" stroke-width="1.8" stroke-linecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                v-model="menuFilterText"
                :placeholder="menuFilterPlaceholder"
                @input="onMenuFilter"
              >
            </div>
            <button class="role-dc-perm__tbtn" @click="permCheckAll">全选</button>
            <button class="role-dc-perm__tbtn" @click="permCheckNone">全不选</button>
            <button class="role-dc-perm__tbtn" @click="permInvert">反选</button>
          </div>
          <div class="role-dc-perm__tree">
            <el-tree
              ref="menuTree"
              class="filter-tree"
              :data="treeData"
              :default-checked-keys="checkedKeysData"
              :check-strictly="false"
              node-key="id"
              highlight-current
              :props="defaultProps"
              show-checkbox
              :filter-node-method="filterNode"
              default-expand-all
              @check="onTreeCheck"
            />
          </div>
        </div>
        <div class="role-dc-perm__foot">
          <span class="role-dc-perm__count">已授权 <b>{{ permCheckedCount }}</b> 项权限</span>
          <div style="flex: 1" />
          <button class="role-dc-perm__cancel" @click="dialogPermissionVisible = false">取消</button>
          <button
            class="role-dc-perm__save"
            :class="{ 'is-loading': dialogLoading }"
            @click="!dialogLoading && updatePermession(id)"
          >{{ dialogLoading ? "保存中…" : $t("upms.role.update") }}</button>
        </div>
      </div>
    </el-drawer>


  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, getCurrentInstance, watch, nextTick } from "vue";
import { fetchMenuTree } from "@/api/upms/menu";
import {
  addObj,
  delObj,
  fetchRoleTree,
  getList,
  getPage,
  permissionUpd,
  putObj,
} from "@/api/upms/role";
import { tableOption } from "@/const/crud/upms/role";
import { usePermissionStoreHook } from "@/store/modules/permission";
import { filterForm } from "@/utils/util";
import DcFormDialog from "@/components/dc-dialog/DcFormDialog.vue";
import DcPager from "@/components/dc-shell/DcPager.vue";
import DcTableShell from "@/components/dc-shell/DcTableShell.vue";
import type { DcSortPayload, DcTableCol } from "@/components/dc-shell/types";
import { DcEmptyImage } from "@/components/dc-states";
import emptyImg from "@/assets/common/empty.png";

import "../role-dc.scss";

import { appDangerConfirm } from "@/components/overlay";

const { proxy } = getCurrentInstance()!;

const treeData = ref<any[]>([]);
const checkedKeys = ref<any[]>([]);
const checkedKeysData = ref<any[]>([]);
const defaultProps = ref({
  label: "name",
  value: "id",
});
const page = ref({
  total: 0,
  currentPage: 1,
  pageSize: 20,
  ascs: "",
  descs: "",
});
const menuIds = ref("");
const list = ref<any[]>([]);
const listLoading = ref(true);
const id = ref<any>(undefined);
const roleCode = ref<any>(undefined);
const dialogPermissionVisible = ref(false);
const dialogLoading = ref(false);
const menuFilterText = ref("");

const crud = ref<any>(null);
const menuTree = ref<any>(null);

const permissions = computed(() => {
  return usePermissionStoreHook()?.permissions;
});

// 计算属性：搜索框占位规则说明
const menuFilterPlaceholder = computed(() => {
  return `${proxy.$t("commons.inputPlease")}关键词（空格=并且，逗号=或者，-词=排除，"短语"=短语匹配）`;
});

const permissionList = computed(() => {
  return {
    addBtn: !!permissions.value["sys:role:add"],
    delBtn: !!permissions.value["sys:role:del"],
    editBtn: !!permissions.value["sys:role:edit"],
    viewBtn: !!permissions.value["sys:role:get"],
  };
});

function sortChange(val: any) {
  const prop = val.prop
    ? val.prop.replace(/([A-Z])/g, "_$1").toLowerCase()
    : "";

  if (val.order === "ascending") {
    page.value.descs = "";
    page.value.ascs = prop;
  } else if (val.order === "descending") {
    page.value.ascs = "";
    page.value.descs = prop;
  } else {
    page.value.ascs = "";
    page.value.descs = "";
  }

  getPageF(page.value);
}

// 当前生效的搜索条件。必须存起来：翻页 / 排序 / 刷新都会重新调 getPageF，
// 若不带上，用户会看到搜索框仍有值、列表却已变回全量数据。
const paramsSearch = ref<any>({});

function getPageF(pageVal: any, params?: any) {
  listLoading.value = true;
  getPage(
    Object.assign(
      {
        current: page.value.currentPage,
        size: page.value.pageSize,
        descs: page.value.descs,
        ascs: page.value.ascs,
      },
      params,
      paramsSearch.value
    )
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

function searchChange(param: any, done: () => void) {
  paramsSearch.value = filterForm(param);
  page.value.currentPage = 1;
  getPageF(page.value);
  done();
}

function handlePermission(row: any) {
  listLoading.value = true;
  fetchRoleTree(row.id)
    .then((response) => {
      checkedKeys.value = [];
      checkedKeysData.value = [];
      checkedKeys.value = response.data;
      return fetchMenuTree();
    })
    .then((response) => {
      treeData.value = response.data;
      checkedKeysData.value = resolveAllEunuchNodeId(
        treeData.value,
        checkedKeys.value,
        []
      );
      dialogPermissionVisible.value = true;
      id.value = row.id;
      roleCode.value = row.roleCode;
      listLoading.value = false;
    })
    .catch(() => {
      listLoading.value = false;
    });
}

function resolveAllEunuchNodeId(json: any[], idArr: any[], temp: any[]) {
  for (let i = 0; i < json.length; i++) {
    const item = json[i];
    if (item.children && item.children.length !== 0) {
      resolveAllEunuchNodeId(item.children, idArr, temp);
    } else {
      temp.push(idArr.filter((idItem) => idItem === item.id));
    }
  }

  return temp;
}

// 统一的查询解析：支持 OR（逗号/中文逗号分隔）与 AND（空格分隔），支持 NOT（前缀-），支持短语（双引号包裹）
function parseQuery(rawText: string) {
  const text = String(rawText || "")
    .toLowerCase()
    .trim();
  if (!text) return [];
  // 将文本按 OR 分组：逗号或中文逗号分隔
  const orGroups = text.split(/[，,]+/).filter(Boolean);
  return orGroups.map((group) => {
    // 在组内按 AND 拆分：空格分隔，同时保留双引号短语
    const tokens = (group.match(/"([^"]+)"|\S+/g) || []).map((t) =>
      t.replace(/^"|"$/g, "")
    );
    const and = tokens.filter((t) => !!t && !t.startsWith("-"));
    const not = tokens.filter((t) => t.startsWith("-")).map((t) => t.slice(1));
    return { and, not };
  });
}

// 组匹配：必须包含所有 AND 词，同时不包含 NOT 词
function matchGroup(label: string, group: { and: string[]; not: string[] }) {
  const andOk = group.and.every((t) => label.includes(t));
  const notOk = group.not.every((t) => !label.includes(t));
  return andOk && notOk;
}

// 树节点过滤方法
function filterNode(value: string, nodeData: any) {
  if (!value) return true;
  const labelKey = defaultProps.value?.label || "name";
  const label = String(nodeData?.[labelKey] || "").toLowerCase();
  const groups = parseQuery(value);
  if (groups.length === 0) return true;
  const selfMatch = groups.some((g) => matchGroup(label, g));
  return selfMatch || nodeData?.__matchAncestor === true;
}

// 搜索输入时触发过滤
function onMenuFilter() {
  const text = menuFilterText.value?.trim() || "";
  clearMatchFlags(treeData.value);
  if (text) {
    const labelKey = defaultProps.value?.label || "name";
    const groups = parseQuery(text);
    markAncestorForChildren(treeData.value, groups, labelKey);
  }
  menuTree.value?.filter(text);
}

// 递归清理匹配标记
function clearMatchFlags(list: any[]) {
  if (!Array.isArray(list)) return;
  list.forEach((node) => {
    if (node && Object.hasOwn(node, "__matchAncestor")) {
      delete (node as any).__matchAncestor;
    }
    if (Array.isArray(node?.children)) clearMatchFlags(node.children);
  });
}

// 若某节点命中，则为其所有子节点打标
function markAncestorForChildren(
  list: any[],
  groups: { and: string[]; not: string[] }[],
  labelKey: string
) {
  if (!Array.isArray(list)) return;
  list.forEach((node) => {
    const label = String(node?.[labelKey] || "").toLowerCase();
    const hit = groups.some((g) => matchGroup(label, g));
    if (hit) {
      markDescendants(node);
    }
    if (Array.isArray(node?.children))
      markAncestorForChildren(node.children, groups, labelKey);
  });
}

function markDescendants(node: any) {
  if (!Array.isArray(node?.children)) return;
  node.children.forEach((child: any) => {
    child.__matchAncestor = true;
    markDescendants(child);
  });
}

function updatePermession(idVal: any) {
  dialogLoading.value = true;
  menuIds.value = "";
  menuIds.value = menuTree.value
    .getCheckedKeys()
    .join(",")
    .concat(",")
    .concat(menuTree.value.getHalfCheckedKeys().join(","));
  permissionUpd({
    roleId: idVal,
    menuId: menuIds.value,
  })
    .then(() => {
      dialogLoading.value = false;
      dialogPermissionVisible.value = false;
      fetchMenuTree()
        .then(() => {
          return fetchRoleTree(idVal);
        })
        .then(() => {
          proxy.$notify({
            title: proxy.$t("commons.success"),
            message: proxy.$t("commons.updateSuccess"),
            type: "success",
            duration: 2000,
          });
        });
    })
    .catch(() => {
      dialogLoading.value = false;
    });
}

// ==================== 行内操作权限 ====================
// 内置管理员角色（ROLE_ADMIN）拥有全部菜单，后端拒绝修改 / 删除 / 改权限，前端不出入口
const ADMIN_ROLE_CODE = "ROLE_ADMIN";
function canEdit(row: any) {
  return row.roleCode !== ADMIN_ROLE_CODE && !!permissions.value["sys:role:edit"];
}
function canDel(row: any) {
  return row.roleCode !== ADMIN_ROLE_CODE && !!permissions.value["sys:role:del"];
}
function canPerm(row: any) {
  return row.roleCode !== ADMIN_ROLE_CODE && !!permissions.value["sys:role:perm"];
}

// 搜索：按角色名称精确匹配（后端 /upms/role/page 不接受模糊条件，关键词透传 roleName）
const searchQ = ref("");
function handleQuery() {
  searchChange({ roleName: searchQ.value.trim() }, () => {});
}
function handleReset() {
  searchQ.value = "";
  paramsSearch.value = {}; // 必须一并清空，否则「重置」后翻页仍带着旧条件
  page.value.currentPage = 1;
  getPageF(page.value);
}

// 创建时间去秒（YYYY-MM-DD HH:mm:ss → YYYY-MM-DD HH:mm）
function fmtTime(t: any) {
  return t ? String(t).slice(0, 16) : "—";
}

// ---- 列声明 ----
const tblCols: DcTableCol[] = [
  { key: "roleName", t: "角色名称" },
  { key: "roleCode", t: "角色标识" },
  { key: "roleDesc", t: "角色描述" },
  { key: "createTime", t: "创建时间", sort: true, exportValue: (r: any) => fmtTime(r.createTime) },
  { key: "acts", t: "操作", al: "right", hideable: false },
];

// 无权限进入权限分配的行不做点击态
function rowClassOf(row: any) {
  return canPerm(row) ? "" : "role-dc__row--static";
}
// 行点击 = 打开权限分配
function onRowClick(row: any) {
  if (canPerm(row)) openPerm(row);
}
// 空态主按钮：有筛选条件时壳文案变「清空筛选条件」
function onEmptyAction(filtered: boolean) {
  if (filtered) handleReset();
  else openRoleForm("add");
}

// ==================== 新增 / 编辑 弹窗 ====================
const formOpen = ref(false);
const formMode = ref<"add" | "edit">("add");
const formSaving = ref(false);
const errName = ref("");
const errCode = ref("");
const errDesc = ref("");
const roleForm = reactive<any>({
  id: "",
  roleName: "",
  roleCode: "",
  roleDesc: "",
});

function openRoleForm(mode: "add" | "edit", row?: any) {
  formMode.value = mode;
  errName.value = "";
  errCode.value = "";
  errDesc.value = "";
  window.openType = mode;
  if (mode === "add") {
    Object.assign(roleForm, {
      id: "",
      roleName: "",
      roleCode: "",
      roleDesc: "",
    });
  } else {
    Object.assign(roleForm, {
      id: row.id,
      roleName: row.roleName || "",
      roleCode: row.roleCode || "",
      roleDesc: row.roleDesc || "",
    });
  }
  formOpen.value = true;
}

/** 新增时的重名 / 重标识校验（编辑态不校验）。/upms/role/list 直接返回数组，不包在 data 里 */
async function checkRoleDuplicate(): Promise<boolean> {
  if (formMode.value === "edit") return true;
  try {
    const [byName, byCode] = await Promise.all([
      getList({ roleName: roleForm.roleName.trim() }),
      getList({ roleCode: roleForm.roleCode.trim() }),
    ]);
    const listOf = (r: any) => (Array.isArray(r) ? r : r?.data || []);
    let ok = true;
    if (listOf(byName).length > 0) {
      errName.value = proxy.$t("upms.role.roleNameExists");
      ok = false;
    }
    if (listOf(byCode).length > 0) {
      errCode.value = proxy.$t("upms.role.roleCodeExists");
      ok = false;
    }
    return ok;
  } catch {
    // 查重接口本身失败时不阻断保存，交给后端兜底（与原 rules 的宽松语义一致）
    return true;
  }
}

async function saveRoleForm() {
  // 一次性全量校验 + 字段级内联报错
  errName.value = !roleForm.roleName.trim() ? "角色名称为必填项" : "";
  errCode.value = !roleForm.roleCode.trim() ? "角色标识为必填项" : "";
  errDesc.value = !String(roleForm.roleDesc || "").trim() ? "角色描述为必填项" : "";
  if (errName.value || errCode.value || errDesc.value) return;

  formSaving.value = true;
  if (!(await checkRoleDuplicate())) {
    formSaving.value = false;
    return;
  }

  // 只有菜单权限、没有数据权限：dsType 是后端必填列，固定 0（全部数据）
  const payload: any = { ...roleForm, dsType: 0, dsScope: "" };
  // 剔除 avue 注入的视图态键；新增不带 id
  Object.keys(payload).forEach((k) => {
    if (k.startsWith("$")) delete payload[k];
  });
  if (formMode.value === "add") delete payload.id;

  const req = formMode.value === "add" ? addObj(payload) : putObj(payload);
  req
    .then(() => {
      proxy.$notify({
        title: proxy.$t("commons.success"),
        message:
          formMode.value === "add"
            ? proxy.$t("commons.addSuccess")
            : proxy.$t("commons.updateSuccess"),
        type: "success",
        duration: 2000,
      });
      formOpen.value = false;
      formSaving.value = false;
      getPageF(page.value);
    })
    .catch((e: any) => {
      formSaving.value = false;
      // 拦截器已经弹过 toast 了：业务错误 reject 字符串、网络/超时/5xx reject Error
      // 或 axios 响应对象，都不该再补一条。只有 reject 出裸 {msg} 那条路径没弹过。
      if (e && typeof e === "object" && !(e instanceof Error) && e.msg) {
        proxy.$message?.({ showClose: true, message: e.msg, type: "error" });
      }
    });
}

// 排序（三态由 DcTableShell 维护）
function onSort(p: DcSortPayload) {
  sortChange({
    prop: p.order ? p.key : "",
    order: p.order === "asc" ? "ascending" : p.order === "desc" ? "descending" : "",
  });
}

// mono 单元格 hover 复制✓
const copiedId = ref<any>(null);
let copiedTimer: any = null;
function copyCode(row: any) {
  navigator.clipboard?.writeText(row.roleCode || "");
  copiedId.value = row.id;
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => {
    copiedId.value = null;
  }, 1500);
}

// 分页
const totalPages = computed(() =>
  Math.max(1, Math.ceil(page.value.total / page.value.pageSize))
);
function onPageChange(p: number) {
  page.value.currentPage = p;
  getPageF(page.value);
}
function onSizeChange(s: number) {
  page.value.pageSize = s;
  page.value.currentPage = 1;
  getPageF(page.value);
}

// 权限抽屉
const permRoleName = ref("");
const permCheckedCount = ref(0);
function openPerm(row: any) {
  permRoleName.value = row.roleName;
  handlePermission(row);
}
function syncPermCount() {
  permCheckedCount.value = menuTree.value
    ? menuTree.value.getCheckedKeys().length
    : 0;
}
function onTreeCheck() {
  syncPermCount();
}
function collectAllIds(nodes: any[], out: any[] = []) {
  if (!Array.isArray(nodes)) return out;
  nodes.forEach((n) => {
    out.push(n.id);
    if (Array.isArray(n.children)) collectAllIds(n.children, out);
  });
  return out;
}
function collectLeafIds(nodes: any[], out: any[] = []) {
  if (!Array.isArray(nodes)) return out;
  nodes.forEach((n) => {
    if (Array.isArray(n.children) && n.children.length > 0) {
      collectLeafIds(n.children, out);
    } else {
      out.push(n.id);
    }
  });
  return out;
}
function permCheckAll() {
  menuTree.value?.setCheckedKeys(collectAllIds(treeData.value));
  syncPermCount();
}
function permCheckNone() {
  menuTree.value?.setCheckedKeys([]);
  syncPermCount();
}
function permInvert() {
  if (!menuTree.value) return;
  const checked = new Set(menuTree.value.getCheckedKeys());
  const inverse = collectLeafIds(treeData.value).filter(
    (nid) => !checked.has(nid)
  );
  menuTree.value.setCheckedKeys(inverse);
  syncPermCount();
}
watch(dialogPermissionVisible, async (v) => {
  if (v) {
    await nextTick();
    syncPermCount();
  }
});

// 高危删除确认：逐字输入角色名解锁
function openDelConfirm(row: any) {
  appDangerConfirm({
    name: String(row.roleName || ""),
    title: `删除角色「${row.roleName}」？`,
    verb: "删除",
    impact: "该角色的全部权限点会被移除，使用它的账号将失去对应访问能力。",
    intent: "delete",
  })
    .then(() => delObj(row.id))
    .then(() => {
      getPageF(page.value);
      proxy.$message({
        showClose: true,
        message: proxy.$t("commons.delSuccess"),
        type: "success",
      });
    })
    .catch(() => {});
}
</script>
