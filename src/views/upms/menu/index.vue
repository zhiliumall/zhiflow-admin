<!--
  系统管理 · 菜单管理：整棵树一次取回（GET /upms/menu/all/tree），无分页、无筛选；
  同级顺序靠行拖拽调整，落位后按新次序回写 sort 并逐条 PUT。
-->
<template>
  <div class="menu-dc">
    <div class="goodsspu-dc__banner">
      <div class="goodsspu-dc__banner-grid" />
      <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--1" />
      <div class="goodsspu-dc__banner-glow goodsspu-dc__banner-glow--2" />
      <div class="goodsspu-dc__banner-head">
        <div class="goodsspu-dc__banner-title">菜单管理</div>
        <div class="goodsspu-dc__banner-sub">系统管理 · 菜单管理</div>
      </div>
      <div style="flex: 1" />
      <div v-if="metrics?.length" class="goodsspu-dc__banner-stats">
        <div
          v-for="(mt, i) in metrics"
          :key="i"
          class="goodsspu-dc__stat"
          :class="{ 'goodsspu-dc__stat--divider': i > 0 }"
        >
          <div class="goodsspu-dc__stat-label">{{ mt.label }}</div>
          <div class="goodsspu-dc__stat-num" :style="{ color: mt.color }">{{ mt.value }}</div>
        </div>
      </div>
    </div>

    <DcTableShell
      storage-key="upms-menu"
      :cols="cols"
      grid="1.35fr 66px 132px 58px 50px 150px 112px 70px 206px"
      :rows="flatRows"
      :total="flatRows.length"
      :loading="tableLoading"
      :searchable="false"
      :show-keyword="false"
      empty-title="没有符合条件的记录"
      :empty-btn-text="permissionList.addBtn ? '新增菜单' : ''"
      export-file-name="菜单管理"
      row-key="id"
      @refresh="refreshChange"
      @empty-action="openForm('add')"
    >
      <template #tools>
        <button
          v-if="permissionList.addBtn"
          class="dc-tbl__tool-btn dc-tbl__tool-btn--primary"
          @click="openForm('add')"
        >
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff"
            stroke-width="2.4" stroke-linecap="round"
          ><path d="M12 5v14M5 12h14" /></svg>新增菜单
        </button>
      </template>

      <!-- 菜单名称：树形缩进 + 折叠箭头 + 拖拽手柄 -->
      <template #col-name="{ row }">
        <div
          class="menu-dc__tree-cell"
          :style="{ paddingLeft: row.$depth * 20 + 'px' }"
          draggable="true"
          @dragstart="onDragStart(row)"
          @dragover.prevent="onDragOver(row, $event)"
          @drop.prevent="onDrop(row)"
          @dragend="onDragEnd"
        >
          <span class="menu-dc__handle" title="拖拽调整同级顺序">
            <svg
              width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round"
            ><path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01" /></svg>
          </span>
          <span
            v-if="row.$hasChildren"
            class="menu-dc__chev"
            :style="{ transform: expanded.has(row.id) ? 'rotate(90deg)' : 'none' }"
            @click.stop="toggleExpand(row.id)"
          >
            <svg
              width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
            ><path d="M9 6l6 6-6 6" /></svg>
          </span>
          <span v-else style="flex:none;width:10px;" />
          <span
            style="overflow:hidden;font-size: 14px;color:var(--dc-text-1);text-overflow:ellipsis;white-space:nowrap;"
            :style="{ fontWeight: row.$depth === 0 ? 600 : 400 }"
            :title="row.name"
          >{{ row.name }}</span>
        </div>
      </template>

      <template #col-type="{ row }">
        <span
          style="display:inline-flex;align-items:center;height:22px;padding:2px 8px;font-size: 14px;font-weight:500;border-radius:4px;"
          :style="String(row.type) === '1'
            ? { color: 'var(--dc-warning)', background: 'var(--dc-warning-soft, #FFF4E6)' }
            : { color: 'var(--dc-brand)', background: 'var(--dc-brand-soft)' }"
        >{{ typeLabel(row.type) }}</span>
      </template>

      <template #col-permission="{ row }">
        <div
          style="overflow:hidden;font-family:ui-monospace,'SF Mono',Consolas,monospace;font-size: 14px;color:var(--dc-text-2);text-overflow:ellipsis;white-space:nowrap;"
          :title="row.permission"
        >{{ row.permission || "—" }}</div>
      </template>

      <template #col-sort="{ row }">
        <div style="font-size: 14px;font-variant-numeric:tabular-nums;color:var(--dc-text-1);">{{ row.sort ?? "—" }}</div>
      </template>

      <template #col-icon="{ row }">
        <div style="display:flex;align-items:center;justify-content:center;color:var(--dc-text-2);">
          <template v-if="row.icon">
            <FontIcon
              v-if="String(row.icon).indexOf('_') !== -1 || String(row.icon).indexOf('icon-') !== -1"
              :icon="row.icon"
            />
            <IconifyIconOnline v-else :icon="row.icon" />
          </template>
          <span v-else style="font-size: 14px;color:var(--dc-text-3);">—</span>
        </div>
      </template>

      <template #col-component="{ row }">
        <div
          style="overflow:hidden;font-family:ui-monospace,'SF Mono',Consolas,monospace;font-size: 14px;color:var(--dc-text-2);text-overflow:ellipsis;white-space:nowrap;"
          :title="row.component"
        >{{ row.component || "—" }}</div>
      </template>

      <template #col-path="{ row }">
        <div
          style="overflow:hidden;font-family:ui-monospace,'SF Mono',Consolas,monospace;font-size: 14px;color:var(--dc-text-2);text-overflow:ellipsis;white-space:nowrap;"
          :title="row.path"
        >{{ row.path || "—" }}</div>
      </template>

      <template #col-delFlag="{ row }">
        <span
          style="display:inline-flex;align-items:center;height:22px;padding:2px 8px;font-size: 14px;font-weight:500;border-radius:4px;"
          :style="String(row.delFlag) === '1'
            ? { color: 'var(--dc-text-3)', background: '#F2F3F5' }
            : { color: 'var(--dc-success)', background: 'var(--dc-success-soft, #E8F8F0)' }"
        >{{ String(row.delFlag) === "1" ? "禁用" : "启用" }}</span>
      </template>

      <!-- 行操作：查看 / 编辑 / 删除 / 添加下级（可见 > 3 时折叠成前 2 个 + ···） -->
      <template #col-acts="{ row }">
        <DcOverflowActions :actions="actsOf(row)" :row-key="row.id" />
      </template>

      <template #empty-art>
        <DcEmptyImage
          :src="emptyImg"
          alt="菜单管理空状态插画"
        />
      </template>
    </DcTableShell>

    <!-- ══ 菜单表单（640 宽 / 两列） ══ -->
    <DcFormDialog
      :missing-count="missingCount"
      v-model="formVisible"
      :title="formTitle"
      :width="640"
      :columns="2"
      :saving="saving"
      @save="onSave"
    >
      <!-- 1 父菜单 -->
      <div class="dcfd-field">
        <label class="dcfd-label"><em v-if="!readonly">*</em>父菜单</label>
        <el-tree-select
          v-model="form.parentId"
          :data="parentTree"
          :props="parentTreeProps"
          check-strictly
          :disabled="readonly || formMode === 'sub'"
          node-key="id"
          :placeholder="$t('upms.menu.topLevel')"
        />
        <div v-if="errors.parentId" class="dcfd-error">{{ errors.parentId }}</div>
      </div>

      <!-- 2 菜单名称 -->
      <div class="dcfd-field">
        <label class="dcfd-label"><em v-if="!readonly">*</em>菜单名称</label>
        <div class="dcfd-control">
          <input v-model="form.name" class="dcfd-input" :class="{ 'is-error': !!errors.name }" :readonly="readonly">
        </div>
        <div v-if="errors.name" class="dcfd-error">{{ errors.name }}</div>
      </div>

      <!-- 3 类型 -->
      <div class="dcfd-field">
        <label class="dcfd-label"><em v-if="!readonly">*</em>类型</label>
        <div class="dcfd-pills">
          <span
            class="dcfd-pill"
            :class="{ 'is-active': form.type === '0' }"
            @click="!readonly && (form.type = '0')"
          >{{ $t("upms.menu.menu") }}</span>
          <span
            class="dcfd-pill"
            :class="{ 'is-active': form.type === '1' }"
            @click="!readonly && (form.type = '1')"
          >{{ $t("upms.menu.button") }}</span>
        </div>
        <div v-if="errors.type" class="dcfd-error">{{ errors.type }}</div>
      </div>

      <!-- 4 排序值 -->
      <div class="dcfd-field">
        <label class="dcfd-label"><em v-if="!readonly">*</em>排序值</label>
        <div class="dcfd-control">
          <input
            v-model="form.sort"
            class="dcfd-input"
            :class="{ 'is-error': !!errors.sort }"
            :readonly="readonly"
            inputmode="numeric"
          >
        </div>
        <div v-if="errors.sort" class="dcfd-error">{{ errors.sort }}</div>
        <div v-else class="dcfd-helper">数值越小越靠前</div>
      </div>

      <!-- 5 权限标识 -->
      <div class="dcfd-field">
        <label class="dcfd-label"><em v-if="!readonly && form.type === '1'">*</em>权限标识</label>
        <div class="dcfd-control">
          <input
            v-model="form.permission"
            class="dcfd-input"
            style="font-family:ui-monospace,'SF Mono',Consolas,monospace;"
            :class="{ 'is-error': !!errors.permission }"
            :readonly="readonly"
            placeholder="如 mall:goodsspu:index"
          >
        </div>
        <div v-if="errors.permission" class="dcfd-error">{{ errors.permission }}</div>
        <div v-else class="dcfd-helper">按钮类型必填,用于接口鉴权</div>
      </div>

      <!-- 6 前端URL（type=菜单 时必填，与 crud 的 control() 一致） -->
      <div class="dcfd-field">
        <label class="dcfd-label"><em v-if="!readonly && form.type === '0'">*</em>前端URL</label>
        <div class="dcfd-control">
          <input
            v-model="form.path"
            class="dcfd-input"
            style="font-family:ui-monospace,'SF Mono',Consolas,monospace;"
            :class="{ 'is-error': !!errors.path }"
            :readonly="readonly"
            placeholder="如 goodsspu"
          >
        </div>
        <div v-if="errors.path" class="dcfd-error">{{ errors.path }}</div>
      </div>

      <!-- 7 页面（整宽；type=菜单 时必填） -->
      <div class="dcfd-field dcfd-field--full">
        <label class="dcfd-label"><em v-if="!readonly && form.type === '0'">*</em>页面</label>
        <div class="dcfd-control">
          <input
            v-model="form.component"
            class="dcfd-input"
            style="font-family:ui-monospace,'SF Mono',Consolas,monospace;"
            :class="{ 'is-error': !!errors.component }"
            :readonly="readonly"
            placeholder="如 views/mall/goodsspu/index,目录填 Layout"
          >
        </div>
        <div v-if="errors.component" class="dcfd-error">{{ errors.component }}</div>
      </div>

      <!-- 8 是否开启缓存（仅菜单类型，与 crud control() 一致） -->
      <div v-if="form.type === '0'" class="dcfd-field">
        <label class="dcfd-label">是否开启缓存</label>
        <div class="dcfd-pills">
          <span
            class="dcfd-pill"
            :class="{ 'is-active': form.keepAlive === '0' }"
            @click="!readonly && (form.keepAlive = '0')"
          >{{ $t("upms.menu.cache") }}</span>
          <span
            class="dcfd-pill"
            :class="{ 'is-active': form.keepAlive === '1' }"
            @click="!readonly && (form.keepAlive = '1')"
          >{{ $t("upms.menu.noCache") }}</span>
        </div>
      </div>

      <!-- 9 是否启用 -->
      <div class="dcfd-field">
        <label class="dcfd-label">是否启用</label>
        <div class="dcfd-pills">
          <span
            class="dcfd-pill"
            :class="{ 'is-active': form.delFlag === '0' }"
            @click="!readonly && (form.delFlag = '0')"
          >启用</span>
          <span
            class="dcfd-pill"
            :class="{ 'is-active': form.delFlag === '1' }"
            @click="!readonly && (form.delFlag = '1')"
          >禁用</span>
        </div>
      </div>

      <!-- 图标（表格有「图标」列，表单里用图标选择器；后端 prop=icon） -->
      <div class="dcfd-field dcfd-field--full">
        <label class="dcfd-label">图标</label>
        <IconSelect v-model="form.icon" :disabled="readonly" />
      </div>

      <template v-if="readonly" #footer>
        <button class="dcfd-btn dcfd-btn--cancel" @click="formVisible = false">关闭</button>
      </template>
    </DcFormDialog>

    <!-- 隐藏 avue host：@on-load 是列表首屏唯一触发器。
         已摘掉 v-model="form" / @row-save / @row-update / @row-del / 表单槽。 -->
    <div style="display:none;">
      <avue-crud
        ref="crud"
        :option="tableOption"
        :data="tableData"
        :permission="permissionList"
        :table-loading="tableLoading"
        @on-load="getPageF"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { addObj, delObj, fetchAllMenuTree, putObj } from "@/api/upms/menu";
import IconSelect from "@/components/re-icon/src/IconSelect.vue";
import { tableOption } from "@/const/crud/upms/menu";
import { usePermissionStoreHook } from "@/store/modules/permission";
import { computed, getCurrentInstance, reactive, ref } from "vue";
import DcTableShell from "@/components/dc-shell/DcTableShell.vue";
import type { DcTableCol, DcRowAction, DcPageMetric } from "@/components/dc-shell/types";
import DcOverflowActions from "@/components/dc-shell/DcOverflowActions.vue";
import DcFormDialog from "@/components/dc-dialog/DcFormDialog.vue";
import { DcEmptyImage } from "@/components/dc-states";
import emptyImg from "@/assets/common/empty.png";

import { appConfirm } from "@/components/overlay";

import "../../mall/goods-list-dc.scss";

defineOptions({ name: "menu" });

const { proxy } = getCurrentInstance()! as any;

/**
 * 列声明。全部 sort:false —— 顺序由行拖拽决定。
 */
const cols: DcTableCol[] = [
  { key: "name", t: "菜单名称", hideable: false },
  { key: "type", t: "类型", exportValue: (r) => typeLabel(r.type) },
  { key: "permission", t: "权限标识" },
  { key: "sort", t: "排序值", al: "center" },
  { key: "icon", t: "图标", al: "center" },
  { key: "component", t: "页面" },
  { key: "path", t: "前端URL" },
  { key: "delFlag", t: "是否启用", exportValue: (r) => (String(r.delFlag) === "1" ? "禁用" : "启用") },
  { key: "acts", t: "操作", al: "right", hideable: false },
];

const tableData = ref<any[]>([]);
// el-tree-select 支持 value 键，但其类型声明沿用 el-tree 的 TreeOptionProps（无 value），这里放宽类型
const parentTreeProps: any = { label: "name", value: "id", children: "children" };
const tableLoading = ref(false);
const expanded = ref<Set<any>>(new Set());

/** 全量树的顶层节点数 */
const metrics = computed<DcPageMetric[]>(() => [
  { label: "一级菜单", value: tableData.value.length },
]);

const permissions = computed(() => usePermissionStoreHook()?.permissions);
const permissionList = computed(() => ({
  addBtn: permissions.value["sys:menu:add"] ? true : false,
  delBtn: permissions.value["sys:menu:del"] ? true : false,
  editBtn: permissions.value["sys:menu:edit"] ? true : false,
  viewBtn: permissions.value["sys:menu:get"] ? true : false,
}));

/**
 * 行操作链：
 *   ['view','edit','del',{k:'sub',t:'添加下级'}]
 */
function actsOf(row: any): DcRowAction[] {
  return [
    { key: "view", t: "查看", on: () => openForm("view", row), hidden: !permissionList.value.viewBtn },
    { key: "edit", t: "编辑", on: () => openForm("edit", row), hidden: !permissionList.value.editBtn },
    { key: "del", t: "删除", danger: true, on: () => handleDel(row), hidden: !permissionList.value.delBtn },
    { key: "sub", t: "添加下级", on: () => openForm("sub", row), hidden: !permissionList.value.addBtn },
  ];
}

function typeLabel(v: any) {
  return String(v) === "1" ? proxy.$t("upms.menu.button") : proxy.$t("upms.menu.menu");
}

/**
 * 「共 N 条」取**当前可见的扁平行数**（即树展开后的扁平行）。
 * Banner 上的指标是另一回事，不是工具栏的「共 N 条」。
 */

/** 树 → 扁平行（只展开 expanded 里的节点）；$depth/$hasChildren/$siblings 供渲染与拖拽使用 */
const flatRows = computed(() => {
  const out: any[] = [];
  const walk = (nodes: any[], depth: number, siblings: any[]) => {
    nodes.forEach((n) => {
      const hasChildren = Array.isArray(n.children) && n.children.length > 0;
      out.push({
        ...n,
        $depth: depth,
        $hasChildren: hasChildren,
        // $siblings 保留的是**原树里的数组引用**，拖拽时直接在它上面重排
        $siblings: siblings,
        $node: n,
      });
      if (hasChildren && expanded.value.has(n.id)) walk(n.children, depth + 1, n.children);
    });
  };
  walk(tableData.value, 0, tableData.value);
  return out;
});

/** 父菜单下拉的数据源：顶级菜单 + 全树（与原 crud.DIC.parentId 一致） */
const parentTree = computed(() => [
  {
    id: "0",
    name: proxy.$t("upms.menu.topLevel"),
    parentId: "0",
    children: tableData.value,
  },
]);

function toggleExpand(id: any) {
  const s = new Set(expanded.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  expanded.value = s;
}

function getPageF() {
  tableLoading.value = true;
  fetchAllMenuTree()
    .then((response: any) => {
      tableData.value = response.data ?? [];
      tableLoading.value = false;
    })
    .catch(() => {
      tableLoading.value = false;
    });
}

function refreshChange() {
  getPageF();
}

// ────────── 行拖拽：仅同级重排，落位后回写 sort ──────────
const dragRow = ref<any>(null);
function onDragStart(row: any) {
  dragRow.value = row;
}
function onDragOver(_row: any, e: DragEvent) {
  if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
}
function onDragEnd() {
  dragRow.value = null;
}
function onDrop(target: any) {
  const src = dragRow.value;
  dragRow.value = null;
  if (!src || !target || src.id === target.id) return;
  // 只允许同一父级（同一 siblings 数组）内重排 —— 跨级移动请走「编辑 → 父菜单」
  if (src.$siblings !== target.$siblings) {
    proxy.$message({
      showClose: true,
      message: "只能在同级之间拖拽排序;跨级移动请用「编辑」修改父菜单",
      type: "warning",
    });
    return;
  }
  const arr: any[] = src.$siblings;
  const from = arr.findIndex((n) => n.id === src.id);
  const to = arr.findIndex((n) => n.id === target.id);
  if (from < 0 || to < 0) return;
  const moved = arr.splice(from, 1)[0];
  arr.splice(to, 0, moved);

  // 重编 sort（10 递增），只 PUT 真正变化的节点
  const changed: any[] = [];
  arr.forEach((n, i) => {
    const next = (i + 1) * 10;
    if (Number(n.sort) !== next) {
      n.sort = next;
      changed.push(n);
    }
  });
  if (!changed.length) return;

  tableLoading.value = true;
  Promise.all(
    changed.map((n) => {
      const payload: any = { ...n };
      delete payload.children;
      Object.keys(payload).forEach((k) => {
        if (k.startsWith("$")) delete payload[k];
      });
      return putObj(payload);
    }),
  )
    .then(() => {
      proxy.$message({
        showClose: true,
        message: proxy.$t("commons.updateSuccess"),
        type: "success",
      });
      getPageF();
    })
    .catch((e: any) => {
      tableLoading.value = false;
      if (e && typeof e === "object" && !(e instanceof Error) && e.msg) {
        proxy.$message({ showClose: true, message: e.msg, type: "error" });
      }
      getPageF();
    });
}

// ────────── 自绘表单 ──────────
const formVisible = ref(false);
/** sub = 「添加下级」，本质是父菜单锁死的新增 */
const formMode = ref<"add" | "edit" | "view" | "sub">("add");
const saving = ref(false);
const originalRow = ref<any>({});
const form = reactive<any>({
  parentId: "0",
  name: "",
  type: "0",
  sort: "10",
  permission: "",
  path: "",
  component: "",
  keepAlive: "1",
  delFlag: "0",
  icon: "",
});
const errors = reactive<Record<string, string>>({});
/**
 * 必填项缺失计数 —— 传给 DcFormDialog，壳在头部下方渲染通栏红色定位条
 * 「仍有 N 个必填项未填写,请补全后再保存」，点它滚到第一个 .is-error。
 * 计数用 Object.values(...).filter(Boolean) 而非 Object.keys().length：全站清空 errors 有
 * delete 与赋 "" 两种写法，只统计**非空错误文案**才在两种写法下都准。
 * errors 仅在点过一次保存（validate()）后才有值，故新增弹窗打开时不会先红一片。
 */
const missingCount = computed(() => Object.values(errors).filter(Boolean).length);

const readonly = computed(() => formMode.value === "view");
const formTitle = computed(() =>
  formMode.value === "view"
    ? "菜单详情"
    : formMode.value === "edit"
      ? "编辑菜单"
      : formMode.value === "sub"
        ? "添加下级菜单"
        : "新增菜单",
);

function openForm(mode: "add" | "edit" | "view" | "sub", row?: any) {
  formMode.value = mode;
  Object.keys(errors).forEach((k) => delete errors[k]);
  const isNew = mode === "add" || mode === "sub";
  originalRow.value = isNew ? {} : { ...(row?.$node ?? row) };
  const src = isNew ? null : (row?.$node ?? row);

  form.parentId = mode === "sub" ? row.id : (src?.parentId ?? "0");
  form.name = src?.name ?? "";
  form.type = String(src?.type ?? "0");
  form.sort = String(src?.sort ?? "10");
  form.permission = src?.permission ?? "";
  form.path = src?.path ?? "";
  form.component = src?.component ?? "";
  form.keepAlive = String(src?.keepAlive ?? "1");
  form.delFlag = String(src?.delFlag ?? "0");
  form.icon = src?.icon ?? "";
  formVisible.value = true;
}

/**
 * avue rules 手工搬运：
 *   parentId / name / type / sort 必填；
 *   crud 的 control()：type==='0'（菜单）时 path 与 component 变必填，
 *   按钮类型的权限标识也必填 ⇒ type==='1' 时 permission 必填。
 * 一次全校验 + 字段级内联。
 */
function validate() {
  Object.keys(errors).forEach((k) => delete errors[k]);
  let ok = true;
  const fail = (k: string, msg: string) => {
    errors[k] = msg;
    ok = false;
  };
  const notNull = (label: string) => proxy.$t(label) + proxy.$t("commons.notNull");

  if (form.parentId === "" || form.parentId == null) fail("parentId", notNull("upms.menu.parentId"));
  if (!String(form.name || "").trim()) fail("name", notNull("upms.menu.name"));
  if (!form.type) fail("type", notNull("upms.menu.type"));
  if (String(form.sort ?? "") === "" || !Number.isFinite(Number(form.sort))) {
    fail("sort", notNull("upms.menu.sort"));
  }
  if (form.type === "0") {
    if (!String(form.path || "").trim()) fail("path", proxy.$t("commons.notNull"));
    if (!String(form.component || "").trim()) fail("component", proxy.$t("commons.notNull"));
  } else if (!String(form.permission || "").trim()) {
    fail("permission", "按钮类型必须填写权限标识");
  }
  return ok;
}

function onSave() {
  if (readonly.value) return;
  if (!validate()) return;
  saving.value = true;
  const patch: any = {
    parentId: form.parentId,
    name: form.name,
    type: form.type,
    sort: Number(form.sort),
    permission: form.permission,
    path: form.path,
    component: form.component,
    keepAlive: form.type === "0" ? form.keepAlive : "1",
    delFlag: form.delFlag,
    icon: form.icon,
  };
  const isEdit = formMode.value === "edit";
  // payload：编辑时合并原行、剔除 $ 前缀字段、新增时去掉 id
  const payload: any = isEdit ? { ...originalRow.value, ...patch } : { ...patch };
  delete payload.children;
  Object.keys(payload).forEach((k) => {
    if (k.startsWith("$")) delete payload[k];
  });
  if (!isEdit) delete payload.id;

  const req = isEdit ? putObj(payload) : addObj(payload);
  req
    .then(() => {
      saving.value = false;
      formVisible.value = false;
      proxy.$message({
        showClose: true,
        message: proxy.$t(isEdit ? "commons.updateSuccess" : "commons.addSuccess"),
        type: "success",
      });
      // 添加下级后自动展开父节点，让新行可见
      if (formMode.value === "sub") expanded.value = new Set([...expanded.value, form.parentId]);
      getPageF();
    })
    .catch((e: any) => {
      saving.value = false;
      if (e && typeof e === "object" && !(e instanceof Error) && e.msg) {
        proxy.$message({ showClose: true, message: e.msg, type: "error" });
      }
    });
}

/** 删除统一直调 handleDel(row) */
function handleDel(row: any) {
  appConfirm({ intent: "delete", title: "删除该菜单？", verb: "删除", impact: "该菜单下的子菜单与按钮权限会一并删除。" })
    .then(() => delObj(row.id))
    .then(() => {
      proxy.$message({
        showClose: true,
        message: proxy.$t("commons.delSuccess"),
        type: "success",
      });
      getPageF();
    })
    .catch((e: any) => {
      if (e && typeof e === "object" && !(e instanceof Error) && e.msg) {
        proxy.$message({ showClose: true, message: e.msg, type: "error" });
      }
    });
}
</script>

<style lang="scss">
.menu-dc {
  &__tree-cell {
    display: flex;
    gap: 6px;
    align-items: center;
    min-width: 0;
    cursor: grab;

    &:active { cursor: grabbing; }
  }

  &__handle {
    display: inline-flex;
    flex: none;
    align-items: center;
    color: var(--dc-text-4);
    opacity: 0;
    transition: opacity 0.12s ease;
  }

  .dc-tbl__row:hover &__handle { opacity: 1; }

  &__chev {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 10px;
    color: var(--dc-text-3);
    cursor: pointer;
    transition: transform 0.15s ease;

    &:hover { color: var(--dc-brand); }
  }
}
</style>
