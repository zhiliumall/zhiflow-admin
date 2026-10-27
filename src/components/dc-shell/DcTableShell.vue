<!--
  DcTableShell —— 列表页（kind:'table'）的整页外壳，全站列表页的唯一实现
  包含：筛选卡 / 工具栏 / 表头 / 行 / 空态

  ⚠ 本组件承载了所有列表页共用的「结构与像素」，页面侧只负责：
     ① 传 cols/grid/emptyTitle/qPh（页面的列、栅格、空态标题、搜索占位）
     ② 用 `#col-<key>` 作用域插槽画每一格
     ③ 用 #tools 插槽放主按钮（组件会把它放进筛选行右侧，不是工具栏）
  页面**不要**自己写筛选卡、工具栏、表头、空态 —— 否则各页样式会各自发散。
  同理：行操作 > 3 个用 `DcOverflowActions`（不要自绘 ··· 菜单）、状态 Tab 用 `DcTabs`
        （挂在 #tabs 插槽里）、行左侧状态红条用本组件的 `rowAccent` prop。

  ── 共享约定（全站一套）──
   · 生效筛选条件：传 `activeFilters`，壳在「共 N 条」右侧出品牌蓝 tag + ✕ + 「清除全部」
   · 空态重置：文案固定「清空筛选条件」、形态是**按钮**（不是蓝字链接）
   · 工具栏：密度 / 列设置 / 刷新 / 导出四件套 + 无边框文字重置钮；**不做**「存为常用」
   · 删除：配 `useDcDeleteToast`（行滑出 + 5 秒可撤销），把 `:rows` 换成它的 visibleRows、
     `:row-class` 换成它的 rowClass

  ────────────────────────── 用法示例 ──────────────────────────
  <script setup lang="ts">
  import DcTableShell from "@/components/dc-shell/DcTableShell.vue";
  import type { DcTableCol } from "@/components/dc-shell/types";

  const cols: DcTableCol[] = [
    { key: "roleName", t: "角色名称" },
    { key: "roleCode", t: "角色标识" },
    { key: "roleDesc", t: "角色描述" },
    { key: "createTime", t: "创建时间", sort: true },
    { key: "acts", t: "操作", al: "right", hideable: false },
  ];
  </script>

  <template>
    <DcTableShell
      storage-key="upms-role"
      v-model:keyword="searchForm.roleName"
      :cols="cols"
      grid="1.1fr 1.3fr 1.8fr 1.1fr 1.4fr"
      q-ph="搜索角色名称 / 标识"
      :rows="tableData"
      :total="page.total"
      :loading="loading"
      :filtered="isFiltered"
      empty-title="暂无角色"
      empty-btn-text="新增角色"
      export-file-name="角色列表"
      @search="handleQuery"
      @reset="handleReset"
      @refresh="refreshChange"
      @sort-change="onSort"
      @empty-action="openForm('add')"
    >
      <template #filters>
        <el-select v-model="searchForm.type" class="dc-tbl__select dc-nsel">…</el-select>
      </template>
      <template #tools>
        <button class="dc-tbl__tool-btn dc-tbl__tool-btn--primary" @click="openForm('add')">
          <svg …/>新增角色
        </button>
      </template>

      <template #col-roleName="{ row }">
        <div style="font-size: 14px;color:var(--dc-text-1);">{{ row.roleName }}</div>
      </template>
      <template #col-acts="{ row }">
        <div class="dc-tbl__acts">
          <span class="dc-tbl__act" @click="openForm('edit', row)">编辑</span>
          <span class="dc-tbl__act dc-tbl__act--danger" @click="handleDel(row)">删除</span>
        </div>
      </template>

      <template #pagination><el-pagination … /></template>
    </DcTableShell>
  </template>
  ─────────────────────────────────────────────────────────────
-->
<template>
  <div class="dc-tbl">
    <!-- Banner（页面顶部提示条，可选） -->
    <slot name="banner" />

    <!-- 状态 Tab（有状态分栏的页面用；无 tab 的页面不要传） -->
    <slot name="tabs" />

    <!-- ══════════ 筛选卡 ══════════ -->
    <!-- 无搜索框、无 filters、无 tools 时整张卡不渲染（否则留一张空白卡） -->
    <div
      v-if="searchable || showKeywordBox || !!$slots.filters || !!$slots.tools"
      class="dc-tbl__filter"
      style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px 16px;color:var(--dc-text-2);background:var(--dc-surface);border:1px solid var(--dc-border);border-radius:8px;box-shadow:0 1px 2px rgb(0 0 0 / 4%);"
    >
      <!-- 260px 无 label 搜索框：放大镜内嵌左侧（28px 左内边距），有值时右侧 ✕ -->
      <div v-if="showKeywordBox" style="position:relative;flex:none;">
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--dc-text-3)"
          stroke-width="1.8" stroke-linecap="round"
          style="position:absolute;top:10px;left:9px;pointer-events:none;"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          :value="keyword"
          :placeholder="qPh"
          :disabled="keywordDisabled"
          :title="keywordDisabled ? keywordDisabledTip : undefined"
          class="dc-tbl__q"
          :class="{ 'is-disabled': keywordDisabled }"
          style="width:260px;height:32px;padding:0 26px 0 28px;font-size: 14px;color:var(--dc-text-2);background:var(--dc-surface);border:1px solid var(--dc-border);border-radius:4px;outline:none;"
          @input="onKeywordInput"
          @keyup.enter="emit('search')"
        >
        <span
          v-if="String(keyword ?? '').length > 0"
          title="清除"
          style="position:absolute;top:8px;right:8px;display:flex;align-items:center;justify-content:center;width:16px;height:16px;font-size:10px;color:#fff;cursor:pointer;background:var(--dc-text-4);border-radius:50%;"
          @click="onKeywordClear"
        >✕</span>
      </div>

      <!-- 页面自有的筛选下拉 / 日期；没有就不要传 -->
      <slot name="filters" />

      <button
        v-if="searchable"
        class="dc-tbl__btn-search"
        style="flex:none;width:68px;height:32px;font-family:inherit;font-size: 14px;font-weight:400;color:#fff;cursor:pointer;background:var(--dc-brand);border:none;border-radius:4px;"
        @click="emit('search')"
      >查询</button>
      <!-- 重置 = 无边框文字按钮（不是 ghost 描边钮） -->
      <button
        v-if="searchable"
        class="dc-tbl__btn-reset"
        style="flex:none;height:32px;padding:0 6px;font-family:inherit;font-size: 14px;color:var(--dc-text-2);cursor:pointer;background:transparent;border:none;"
        @click="onReset"
      >重置</button>

      <div style="flex:1;" />
      <!-- ⚠ tools[] 主按钮在这一行、右对齐 —— 不在下面的工具栏 -->
      <slot name="tools" />
    </div>

    <!-- ══════════ 工具栏行 ══════════
         全站一套形态：
           右侧固定五件：密度切换 / 列设置 / 刷新 / 导出（+ #toolbar-extra 页面自有项）
           重置钮在筛选卡里、是**无边框文字钮**（不是描边钮）
           **不提供**「存为常用」（收藏筛选条件）—— 后端没有「常用筛选」存储接口。
         页面不要再往这一行里塞主按钮：主按钮在筛选卡右侧的 #tools 插槽。 -->
    <div
      style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;min-height:48px;padding:8px 16px;margin-top:12px;background:var(--dc-surface);border:1px solid var(--dc-border);border-bottom:none;border-radius:8px 8px 0 0;"
    >
      <!-- 全选（selectable 的页面） -->
      <div v-if="selectable" style="display:flex;gap:8px;align-items:center;margin-right:4px;">
        <div
          style="display:flex;flex:none;align-items:center;justify-content:center;width:16px;height:16px;cursor:pointer;border-radius:4px;transition:all .12s ease;"
          :style="{
            border: '1px solid ' + (allChecked ? 'var(--dc-brand)' : 'var(--dc-border)'),
            background: allChecked ? 'var(--dc-brand)' : 'var(--dc-surface)',
          }"
          @click="toggleAll"
        >
          <svg
            v-if="allChecked" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff"
            stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"
          ><path d="M4 12.5l5 5L20 6.5" /></svg>
        </div>
        <span style="font-size: 14px;color:var(--dc-text-2);">全选<span
          v-if="selected.length"
          style="font-weight:600;color:var(--dc-brand);"
        > {{ selected.length }}</span></span>
      </div>

      <!-- ⚠ 固定文案「共 N 条」——任何页面都不许改写成「共 N 个保障项」之类 -->
      <span style="font-size: 14px;color:var(--text-tertiary, #667085);">共 <span
        style="font-weight:700;font-variant-numeric:tabular-nums;color:var(--dc-text-1);"
      >{{ total }}</span> 条</span>

      <!-- ══ 生效筛选条件 tag ══
           位置严格在「共 N 条」右侧；品牌蓝底 + #B9CDFB 描边 + 24px 高 + ✕ 单条移除，
           末尾一条 --info 蓝字「清除全部」（点它等价于工具栏「重置」）。 -->
      <span
        v-for="f in activeFilters"
        :key="f.key"
        style="display:inline-flex;gap:5px;align-items:center;height:24px;padding:0 4px 0 8px;font-size: 14px;color:var(--dc-brand);white-space:nowrap;background:var(--dc-brand-soft);border:1px solid #B9CDFB;border-radius:5px;"
      >{{ f.label }}<span
        class="dc-tbl__af-x"
        title="移除该筛选条件"
        style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;cursor:pointer;border-radius:4px;"
        @click="onRemoveFilter(f)"
      >
        <svg
          width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.4" stroke-linecap="round"
        ><path d="M6 6l12 12M18 6L6 18" /></svg>
      </span></span>
      <span
        v-if="activeFilters.length"
        class="dc-tbl__af-clear"
        style="font-size: 14px;color:var(--dc-info);cursor:pointer;"
        @click="onReset"
      >清除全部</span>

      <div style="flex:1;" />
      <slot name="toolbar-extra" />

      <!-- 密度切换 -->
      <div
        class="dc-tbl__tb-btn"
        title="表格密度"
        style="display:flex;gap:4px;align-items:center;height:28px;padding:0 8px;font-size: 14px;color:var(--dc-text-2);cursor:pointer;user-select:none;background:var(--dc-surface);border:1px solid var(--dc-border);border-radius:4px;"
        @click="toggleDensity"
      >
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.5" stroke-linecap="round"
        ><path d="M4 6h16M4 12h16M4 18h16" /></svg>{{ density === "compact" ? "紧凑" : "舒适" }}
      </div>

      <!-- 列设置 -->
      <div style="position:relative;" @click.stop>
        <div
          class="dc-tbl__tb-btn"
          title="列设置"
          style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;color:var(--dc-text-2);cursor:pointer;background:var(--dc-surface);border:1px solid var(--dc-border);border-radius:4px;"
          @click="colMenuOpen = !colMenuOpen"
        >
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.5" stroke-linecap="round"
          ><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M10 4v16M16 4v16" /></svg>
        </div>
        <div
          v-if="colMenuOpen"
          style="position:absolute;top:34px;right:0;z-index:60;width:160px;padding:6px 0;background:var(--dc-surface);border:1px solid var(--dc-border);border-radius:4px;box-shadow:0 4px 12px rgb(0 0 0 / 8%);"
        >
          <div
            v-for="c in hideableCols"
            :key="c.key"
            class="dc-tbl__col-opt"
            style="display:flex;gap:8px;align-items:center;height:30px;padding:0 12px;font-size: 14px;color:var(--dc-text-1);cursor:pointer;"
            @click="toggleCol(c.key)"
          >
            <span
              style="display:inline-flex;flex:none;align-items:center;justify-content:center;width:13px;height:13px;border-radius:4px;"
              :style="{
                border: '1px solid ' + (isColVisible(c.key) ? 'var(--dc-brand)' : 'var(--dc-border)'),
                background: isColVisible(c.key) ? 'var(--dc-brand)' : 'var(--dc-surface)',
              }"
            >
              <svg
                v-if="isColVisible(c.key)" width="9" height="9" viewBox="0 0 24 24" fill="none"
                stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"
              ><path d="M4 12.5l5 5L20 6.5" /></svg>
            </span>{{ c.t }}
          </div>
        </div>
      </div>

      <!-- 刷新 -->
      <div
        class="dc-tbl__tb-btn"
        title="刷新"
        style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;color:var(--dc-text-2);cursor:pointer;background:var(--dc-surface);border:1px solid var(--dc-border);border-radius:4px;"
        @click="onRefresh"
      >
        <span style="display:flex;" :class="{ 'dc-tbl__spin': spinning }">
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
          ><path d="M21 12a9 9 0 1 1-2.6-6.3" /><path d="M21 3v6h-6" /></svg>
        </span>
      </div>

      <!-- 导出（前端 CSV，导出当前 rows 的可见列） -->
      <button
        class="dc-tbl__tb-btn"
        style="display:inline-flex;gap:5px;align-items:center;height:28px;padding:0 12px;font-family:inherit;font-size: 14px;color:var(--dc-text-2);cursor:pointer;background:var(--dc-surface);border:1px solid var(--dc-border);border-radius:4px;"
        @click="onExport"
      >
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
        ><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 19h16" /></svg>导出
      </button>
    </div>

    <!-- ══════════ 表头 ══════════ -->
    <div
      class="dc-tbl__head"
      style="display:grid;gap:12px;align-items:center;height:40px;padding:0 16px;font-size: 14px;font-weight:600;color:var(--dc-text-1);background:var(--dc-bg-header);border:1px solid var(--dc-border);"
      :style="{ gridTemplateColumns: effectiveGrid }"
    >
      <span v-if="selectable" />
      <span v-for="c in visibleCols" :key="c.key" style="min-width:0;" :style="{ textAlign: c.al || 'left' }">
        <span
          v-if="c.sort"
          class="dc-tbl__sort"
          style="display:inline-flex;gap:4px;align-items:center;cursor:pointer;user-select:none;"
          @click="onSort(c.key)"
        >{{ c.t }}
          <span style="display:inline-flex;flex-direction:column;gap:1px;">
            <svg width="8" height="5" viewBox="0 0 8 5" :fill="sortKey === c.key && sortOrder === 'asc' ? 'var(--dc-brand)' : '#D3D6DC'"><path d="M4 0l4 5H0z" /></svg>
            <svg width="8" height="5" viewBox="0 0 8 5" :fill="sortKey === c.key && sortOrder === 'desc' ? 'var(--dc-brand)' : '#D3D6DC'"><path d="M4 5L0 0h8z" /></svg>
          </span>
        </span>
        <template v-else>{{ c.t }}</template>
      </span>
    </div>

    <!-- ══════════ 行区 ══════════
         圆角/底边必须跟着「下面有没有分页器」变：
         有分页器时行区不能自己收口，否则「工具栏(8 8 0 0) + 行区(0 0 12 12) + 分页器(0 0 8 8)」
         会渲染成**两张卡**——上面一张圆角封底、下面一张平顶，中间一道缝。
         有分页槽 → 行区去掉下圆角与底边，由分页器收口；无分页槽 → 行区自己收口。
         注意圆角值统一 8px，与工具栏、分页器一致。 -->
    <div
      :style="`overflow:visible;background:var(--dc-surface);border:1px solid var(--dc-border);border-top:none;${
        $slots.pagination
          ? 'border-bottom:none;border-radius:0;'
          : 'border-radius:0 0 8px 8px;'
      }`"
    >
      <!-- 骨架屏 -->
      <template v-if="loading && !rows.length">
        <div
          v-for="s in skeletonRows"
          :key="'sk' + s"
          style="display:flex;gap:16px;align-items:center;padding:16px;border-bottom:1px solid var(--dc-divider);"
        >
          <div class="dc-tbl__shimmer" style="flex:none;width:36px;height:36px;border-radius:50%;" />
          <div style="flex:1;">
            <div class="dc-tbl__shimmer" style="width:52%;height:12px;border-radius:4px;" />
            <div class="dc-tbl__shimmer" style="width:30%;height:11px;margin-top:8px;border-radius:4px;" />
          </div>
          <div class="dc-tbl__shimmer" style="flex:none;width:64px;height:20px;border-radius:4px;" />
          <div class="dc-tbl__shimmer" style="flex:none;width:120px;height:12px;border-radius:4px;" />
        </div>
      </template>

      <!-- 数据行 -->
      <div
        v-for="(row, ri) in rows"
        :key="rowKeyOf(row, ri)"
        class="dc-tbl__row"
        :class="[rowClass ? rowClass(row, ri) : '']"
        style="display:grid;gap:12px;align-items:center;border-bottom:1px solid var(--dc-divider);transition:background .12s ease;"
        :style="{
          gridTemplateColumns: effectiveGrid,
          padding: density === 'compact' ? '8px 16px' : '12px 16px',
          minHeight: density === 'compact' ? '44px' : '60px',
          // 左侧 3px 强调条（如登录日志的异常行红条）。
          // 用 box-shadow inset 而不是 border-left —— border 会挤掉 16px 左内边距，
          // 使有条/无条的行文字对不齐。
          boxShadow: accentOf(row, ri) ? `inset 3px 0 0 0 ${accentOf(row, ri)}` : undefined,
        }"
        @click="emit('row-click', row)"
      >
        <div
          v-if="selectable"
          style="display:flex;flex:none;align-items:center;justify-content:center;width:16px;height:16px;cursor:pointer;border-radius:4px;transition:all .12s ease;"
          :style="{
            border: '1px solid ' + (isChecked(row, ri) ? 'var(--dc-brand)' : 'var(--dc-border)'),
            background: isChecked(row, ri) ? 'var(--dc-brand)' : 'var(--dc-surface)',
          }"
          @click.stop="toggleRow(row, ri)"
        >
          <svg
            v-if="isChecked(row, ri)" width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"
          ><path d="M4 12.5l5 5L20 6.5" /></svg>
        </div>
        <div v-for="c in visibleCols" :key="c.key" style="min-width:0;" :style="{ textAlign: c.al || 'left' }">
          <slot :name="'col-' + c.key" :row="row" :index="ri" :col="c">
            <div
              style="overflow:hidden;font-size: 14px;color:var(--dc-text-1);text-overflow:ellipsis;"
            >{{ defaultCellText(row, c) }}</div>
          </slot>
        </div>
      </div>

      <!-- ══════════ 空态：SVG → 标题 → 按钮（⚠ 没有描述文字那一行） ══════════ -->
      <div
        v-if="!loading && !rows.length"
        style="display:flex;flex-direction:column;align-items:center;padding:56px 0 60px;"
      >
        <slot name="empty-art">
          <svg width="96" height="76" viewBox="0 0 96 76" fill="none">
            <rect x="18" y="10" width="60" height="44" rx="8" stroke="#DDE3EC" stroke-width="2" />
            <path d="M18 36h16l6 8h16l6-8h16" stroke="#DDE3EC" stroke-width="2" stroke-linejoin="round" />
            <path d="M32 21h32M32 28h18" stroke="#EBEFF5" stroke-width="2.4" stroke-linecap="round" />
            <circle cx="68" cy="52" r="11" :fill="emptyTint1" :stroke="emptyTint2" stroke-width="2" />
            <path d="M76 60l8 8" :stroke="emptyTint2" stroke-width="2.4" stroke-linecap="round" />
            <path d="M63.5 52h9M68 47.5v9" :stroke="emptyTint2" stroke-width="2" stroke-linecap="round" />
          </svg>
        </slot>
        <!-- 空态标题由页面传入 -->
        <div style="margin-top:12px;font-size:14px;color:var(--dc-text-1);">{{ emptyTitle }}</div>
        <!-- 空态重置：文案固定「清空筛选条件」，形态是**按钮**（不是蓝字链接）。
             按钮配色：
               filtered=true  → border 1px var(--border) / bg var(--bg-card) / color var(--text-2)
               filtered=false → border none / bg var(--brand) / color #fff（主按钮文案 = emptyBtnText）
             即「有筛选条件」这一支是描边钮、不是实心填充钮。 -->
        <button
          v-if="filtered || emptyBtnText"
          class="dc-tbl__empty-btn"
          style="height:28px;padding:0 14px;margin-top:14px;font-family:inherit;font-size: 14px;cursor:pointer;border-radius:4px;"
          :style="filtered
            ? { border: '1px solid var(--dc-border)', background: 'var(--dc-surface)', color: 'var(--dc-text-2)' }
            : { border: 'none', background: 'var(--dc-brand)', color: '#fff' }"
          @click="onEmptyAction"
        >{{ filtered ? "清空筛选条件" : emptyBtnText }}</button>
      </div>
    </div>

    <!-- ══════════ 分页 ══════════ -->
    <slot name="pagination" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { DcActiveFilter, DcDensity, DcSortPayload, DcTableCol } from "./types";

defineOptions({ name: "DcTableShell" });

const props = withDefaults(
  defineProps<{
    /** 列声明；key 决定作用域插槽名 `col-<key>` */
    cols: DcTableCol[];
    /** grid-template-columns 原始比例字符串 */
    grid: string;
    /** 当前页数据 */
    rows: any[];
    /** 总条数（渲染成固定文案「共 N 条」） */
    total?: number;
    /** 搜索框 placeholder */
    qPh?: string;
    /** 搜索框值（v-model:keyword） */
    keyword?: string;
    /** 是否显示「查询 / 重置」两个按钮（个别无搜索的页面可关） */
    searchable?: boolean;
    /**
     * 是否显示 260px 关键字搜索框。缺省跟随 searchable。
     * 拆出来是因为有一类筛选卡是「label + 控件」成对、**没有搜索框但有 查询/重置**
     * —— 否则只能整块关掉 searchable 后在 #filters 里各页自绘一套按钮，样式会发散。
     */
    showKeyword?: boolean;
    /**
     * 搜索框禁用态（照常渲染但不可输入）。
     * 用于「页面需要搜索框位置，但后端确实没有该查询字段」的页面 —— 若用
     * `:show-keyword="false"` 把框藏掉，而同页的筛选下拉走的却是「照常渲染 + disabled」，
     * 两种降级方式不一致，视觉上等于凭空少了一个控件。
     * 配 `keywordDisabledTip` 给出 title 提示，说明为何不可用。
     */
    keywordDisabled?: boolean;
    /** 禁用态搜索框的 title 提示文案 */
    keywordDisabledTip?: string;
    /** 空态标题 */
    emptyTitle?: string;
    /** 空态主按钮文案（一般与 #tools 主按钮一致）；有筛选条件时自动变「清空筛选条件」+ ghost */
    emptyBtnText?: string;
    /** 当前是否带筛选条件（决定空态按钮形态）；由页面自行判断关键字/下拉是否有值 */
    filtered?: boolean;
    /** 空态插画 tint（浅色底 / 描边色） */
    emptyTint1?: string;
    emptyTint2?: string;
    /** 出全选与行勾选 */
    selectable?: boolean;
    /** 选中行（v-model:selected），元素为 rowKey 取到的值 */
    selected?: any[];
    /** 行主键字段；缺省 'id' */
    rowKey?: string;
    /** 加载中 → 出骨架屏 */
    loading?: boolean;
    /**
     * 生效筛选条件 tag。渲染在「共 N 条」右侧，末尾自动带「清除全部」。
     *
     * - `key`      唯一标识（一般用筛选字段名），用于 v-for key
     * - `label`    tag 文案。格式是 `label + ': ' + value`，例：`状态: 启用`
     * - `onRemove` 点 ✕ 的回调：页面把该字段清空后**重新查一次**（组件不代劳，
     *              因为清哪个变量、要不要 pageNo=1 只有页面自己知道）
     *
     * 建议用 computed 从筛选表单派生，别手工维护数组：
     * ```ts
     * const activeFilters = computed<DcActiveFilter[]>(() => {
     *   const out: DcActiveFilter[] = [];
     *   if (form.status !== "") out.push({
     *     key: "status", label: `状态: ${statusText(form.status)}`,
     *     onRemove: () => { form.status = ""; page.currentPage = 1; getList(); },
     *   });
     *   return out;
     * });
     * ```
     * ⚠ 关键字搜索框**不要**再做成 tag —— 它自己右侧已有 ✕，重复出两个清除入口。
     */
    activeFilters?: DcActiveFilter[];
    /** 密度/列设置的持久化命名空间；建议用页面路由名，如 "upms-role" */
    storageKey?: string;
    /** 导出 CSV 的文件名（不含扩展名） */
    exportFileName?: string;
    /** 骨架屏行数 */
    skeletonRows?: number;
    /**
     * 行左侧 3px 强调条的颜色；返回空串/undefined = 不画。
     * 典型场景：登录日志的**异常登录行有一条左侧红条**。
     * 例：`:row-accent="r => String(r.status) === '0' ? 'var(--dc-danger)' : ''"`
     * ⚠ 只表达「行级状态」，不要拿它当装饰用；同一页最多一种语义。
     */
    rowAccent?: (row: any, index: number) => string | undefined | null;
    /**
     * 行附加 class（需要 hover 变色、斑马纹等 inline style 表达不了的行级样式时用）。
     * 例：`:row-class="r => r.unread ? 'my-page__row--unread' : ''"`
     */
    rowClass?: (row: any, index: number) => string | undefined | null;
  }>(),
  {
    total: 0,
    qPh: "",
    keyword: "",
    searchable: true,
    // 必须显式给 undefined，抵消 Vue 对 Boolean prop 的隐式转型（详见 showKeywordBox 注释）
    showKeyword: undefined,
    emptyTitle: "暂无相关记录",
    emptyBtnText: "",
    filtered: false,
    emptyTint1: "#E8F1FF",
    emptyTint2: "#3C6EF0",
    selectable: false,
    selected: () => [],
    rowKey: "id",
    loading: false,
    activeFilters: () => [],
    storageKey: "",
    exportFileName: "导出数据",
    skeletonRows: 3,
  },
);

const emit = defineEmits<{
  "update:keyword": [v: string];
  "update:selected": [v: any[]];
  /** 点「查询」或搜索框回车 */
  search: [];
  /** 点「重置」；组件已清空 keyword，页面只需清自己的 filters 并重查 */
  reset: [];
  /** 点刷新 */
  refresh: [];
  /** 排序切换（三态：asc → desc → null） */
  "sort-change": [p: DcSortPayload];
  /** 空态主按钮；filtered=true 时页面应清空筛选条件后重查 */
  "empty-action": [filtered: boolean];
  /** 行点击 */
  "row-click": [row: any];
}>();

// ────────── 搜索 ──────────
/**
 * 搜索框显隐：显式传 showKeyword 时以它为准，否则跟随 searchable（向后兼容）。
 *
 * ⚠ 必须在 withDefaults 里显式写 `showKeyword: undefined`，否则这里恒为 false：
 * Vue 对声明为 Boolean 的 prop 有**隐式转型** —— 没传时值是 `false` 而不是 `undefined`，
 * `props.showKeyword === undefined` 永远不成立，于是**所有没显式传 show-keyword 的页面
 * 搜索框全都不渲染**（即使传了 q-ph 与 v-model:keyword，DOM 里也没有 .dc-tbl__q）。
 * typecheck 与单测都发现不了这类问题，因为它是运行期语义。
 */
const showKeywordBox = computed(() =>
  props.showKeyword === undefined ? props.searchable : props.showKeyword,
);

function onKeywordInput(e: Event) {
  emit("update:keyword", (e.target as HTMLInputElement).value);
}
function onKeywordClear() {
  emit("update:keyword", "");
  emit("search");
}
function onReset() {
  emit("update:keyword", "");
  sortKey.value = "";
  sortOrder.value = null;
  emit("reset");
}

// ────────── 生效筛选 tag ──────────
/**
 * 移除单条筛选条件：只调页面给的 onRemove，组件不猜「移除后要不要重查」。
 * 「清除全部」复用 onReset（= 工具栏重置：清空 keyword + 清排序 + emit reset）。
 */
function onRemoveFilter(f: DcActiveFilter) {
  f.onRemove?.();
}

// ────────── 说明条 ──────────
const noteOpen = ref(false);

// ────────── 密度 ──────────
const density = ref<DcDensity>("comfortable");
const lsKey = (suffix: string) => `dc-tbl:${props.storageKey || "default"}:${suffix}`;
function toggleDensity() {
  density.value = density.value === "compact" ? "comfortable" : "compact";
  try {
    localStorage.setItem(lsKey("density"), density.value);
  } catch {
    /* 隐私模式下 localStorage 不可写，忽略即可 */
  }
}

// ────────── 列设置 ──────────
const colMenuOpen = ref(false);
const hiddenCols = ref<string[]>([]);
const hideableCols = computed(() => props.cols.filter((c) => c.hideable !== false));
function isColVisible(key: string) {
  return !hiddenCols.value.includes(key);
}
function toggleCol(key: string) {
  const next = isColVisible(key)
    ? [...hiddenCols.value, key]
    : hiddenCols.value.filter((k) => k !== key);
  // 至少保留一列，避免把表格点没
  if (next.length >= props.cols.length) return;
  hiddenCols.value = next;
  try {
    localStorage.setItem(lsKey("hidden"), JSON.stringify(next));
  } catch {
    /* 同上 */
  }
}
function closeColMenu() {
  colMenuOpen.value = false;
}

/**
 * 从 localStorage 载入本 storageKey 的密度 / 列显隐偏好。
 * ⚠ 必须随 storageKey 变化重载，不能只在 onMounted 跑一次：
 *   多 tab 页切 tab 时只换 storageKey、组件并不重建，
 *   若不重读就会把上一个 tab 的列设置继续用在下一个 tab 上。
 *   不要靠外层 `:key` 强制 remount 绕开，代价是 #tabs 插槽里的
 *   DcTabs 一起重建（吸顶条重挂、闪一下）。
 */
function loadPrefs() {
  try {
    const d = localStorage.getItem(lsKey("density"));
    density.value = d === "compact" || d === "comfortable" ? d : "comfortable";
    const h = localStorage.getItem(lsKey("hidden"));
    if (h) {
      const parsed = JSON.parse(h);
      hiddenCols.value = Array.isArray(parsed)
        ? parsed.filter((k) => typeof k === "string")
        : [];
    } else {
      hiddenCols.value = props.cols.filter((c) => c.defaultHidden).map((c) => c.key);
    }
  } catch {
    /* 读不到就用默认值 */
  }
}

watch(() => props.storageKey, loadPrefs);

onMounted(() => {
  loadPrefs();
  document.addEventListener("click", closeColMenu);
});
onBeforeUnmount(() => document.removeEventListener("click", closeColMenu));

const visibleCols = computed(() => props.cols.filter((c) => isColVisible(c.key)));

/**
 * 有效 grid：把 grid 串按空白切成 track，隐藏列对应的 track 一并去掉。
 * 约定 track 数 = (selectable ? 1 : 0) + cols.length。
 * 数量对不上时直接回退原串，宁可不支持隐藏也不要把布局搞崩。
 */
const effectiveGrid = computed(() => {
  const tracks = props.grid.trim().split(/\s+/);
  const lead = props.selectable ? 1 : 0;
  if (tracks.length !== lead + props.cols.length) return props.grid;
  const kept = tracks.slice(0, lead);
  props.cols.forEach((c, i) => {
    if (isColVisible(c.key)) kept.push(tracks[lead + i]);
  });
  return kept.join(" ");
});

// ────────── 排序（三态） ──────────
const sortKey = ref("");
const sortOrder = ref<"asc" | "desc" | null>(null);
function onSort(key: string) {
  if (sortKey.value !== key) {
    sortKey.value = key;
    sortOrder.value = "asc";
  } else if (sortOrder.value === "asc") {
    sortOrder.value = "desc";
  } else if (sortOrder.value === "desc") {
    sortKey.value = "";
    sortOrder.value = null;
  } else {
    sortOrder.value = "asc";
  }
  emit("sort-change", { key: sortOrder.value ? key : "", order: sortOrder.value });
}

// ────────── 刷新 ──────────
const spinning = ref(false);
let spinTimer: ReturnType<typeof setTimeout> | null = null;
function onRefresh() {
  spinning.value = true;
  if (spinTimer) clearTimeout(spinTimer);
  spinTimer = setTimeout(() => (spinning.value = false), 600);
  emit("refresh");
}
onBeforeUnmount(() => {
  if (spinTimer) clearTimeout(spinTimer);
});

// ────────── 选择 ──────────
function rowKeyOf(row: any, i: number) {
  const v = row?.[props.rowKey];
  return v === undefined || v === null || v === "" ? i : v;
}
function isChecked(row: any, i: number) {
  return props.selected.includes(rowKeyOf(row, i));
}
function toggleRow(row: any, i: number) {
  const k = rowKeyOf(row, i);
  emit(
    "update:selected",
    props.selected.includes(k) ? props.selected.filter((x) => x !== k) : [...props.selected, k],
  );
}
const allChecked = computed(
  () => props.rows.length > 0 && props.rows.every((r, i) => props.selected.includes(rowKeyOf(r, i))),
);
function toggleAll() {
  emit("update:selected", allChecked.value ? [] : props.rows.map((r, i) => rowKeyOf(r, i)));
}
// 换页/换数据后清掉已不在列表里的选中项，避免跨页串档
watch(
  () => props.rows,
  () => {
    if (!props.selectable || !props.selected.length) return;
    const keys = props.rows.map((r, i) => rowKeyOf(r, i));
    const kept = props.selected.filter((k) => keys.includes(k));
    if (kept.length !== props.selected.length) emit("update:selected", kept);
  },
);

// ────────── 空态 ──────────
function onEmptyAction() {
  if (props.filtered) emit("update:keyword", "");
  emit("empty-action", props.filtered);
}

// ────────── 行强调条 ──────────
/** 取该行的左侧强调色；未传 rowAccent 或返回空 → 不画 */
function accentOf(row: any, index: number): string {
  return (props.rowAccent ? props.rowAccent(row, index) : "") || "";
}

// ────────── 单元格默认文本 / CSV ──────────
function defaultCellText(row: any, c: DcTableCol) {
  const v = c.exportValue ? c.exportValue(row) : row?.[c.key];
  return v === undefined || v === null || v === "" ? "—" : String(v);
}
function csvCell(v: unknown) {
  const raw = v === undefined || v === null ? "" : String(v);
  const s = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${s.replace(/"/g, '""')}"`;
}
function onExport() {
  const cols = visibleCols.value;
  const lines = [cols.map((c) => csvCell(c.t)).join(",")];
  props.rows.forEach((row) => {
    lines.push(
      cols.map((c) => csvCell(c.exportValue ? c.exportValue(row) : row?.[c.key])).join(","),
    );
  });
  // ﻿ = UTF-8 BOM：Excel 少了它打开中文 CSV 会乱码
  const blob = new Blob([`﻿${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${props.exportFileName}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

defineExpose({ density, visibleCols, exportCsv: onExport });
</script>

<style lang="scss">


@keyframes dc-tbl-shimmer {
  0% { background-position: 100% 0; }

  100% { background-position: 0 0; }
}

@keyframes dc-tbl-spin {
  from { transform: rotate(0deg); }

  to { transform: rotate(360deg); }
}

.dc-tbl {
  &__q::placeholder {
    color: var(--text-tertiary, #667085);
  }

  &__q:focus {
    border-color: var(--dc-brand) !important;
    box-shadow: var(--dc-focus-ring);
  }

  /* 禁用态搜索框：与同页筛选下拉的禁用降级保持一致（灰底 + not-allowed） */
  &__q.is-disabled {
    color: var(--dc-text-4) !important;
    cursor: not-allowed;
    background: var(--dc-bg-page) !important;
  }

  &__btn-search:hover { background: var(--dc-brand-hover) !important; }

  &__btn-reset:hover { color: var(--dc-text-1) !important; }

  &__tb-btn:hover {
    color: var(--dc-brand) !important;
    border-color: var(--dc-brand) !important;
  }

  &__col-opt:hover { background: var(--dc-row-hover); }

  /* 生效筛选 tag：✕ hover 底色与「清除全部」下划线 */
  &__af-x:hover { background: #d7e2fd; }

  &__af-clear:hover { text-decoration: underline; }

  &__sort:hover { color: var(--dc-text-1); }

  &__row:hover { background: var(--dc-row-hover); }

  &__empty-btn:hover { opacity: 0.88; }

  /* 行内操作链（--info / 常规字重 / gap 12） */
  &__acts {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: flex-end;
  }

  &__act {
    padding: 3px 6px;
    margin: -3px -4px;
    font-size: 14px;
    font-weight: 400;
    color: var(--dc-info);
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    border-radius: 4px;

    &:hover { background: var(--dc-bg-page); }

    &--danger { color: var(--dc-danger-link); }
  }

  /* 筛选卡里的下拉。
     ⚠ #filters 里的下拉统一用 el-select（带 dc-nsel 标记），规格连同禁用态都在
     style/dc/element-plus.scss 的 `.el-select.dc-nsel` / `.el-select.dc-tbl__select`
     —— el-select 的边框是 inset box-shadow、高度由内部 wrapper 承载，这里再留一份
     针对原生元素的 height/border 规则只会和那边互相覆盖。
     下面的 input 规则只给筛选行里的原生 <input> 用。 */
  &__select {
    flex: none;
    max-width: 180px;
  }

  input#{&}__select {
    height: 32px;
    padding: 0 6px;
    font-size: 14px;
    color: var(--dc-text-2);
    background: var(--dc-surface);
    border: 1px solid var(--dc-border);
    border-radius: 4px;
    outline: none;
  }

  /* tools[] 主按钮 */
  &__tool-btn {
    display: inline-flex;
    gap: 5px;
    align-items: center;
    height: 32px;
    padding: 0 14px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 400;
    color: var(--dc-text-2);
    cursor: pointer;
    background: var(--dc-surface);
    border: 1px solid var(--dc-border);
    border-radius: 4px;
    transition: all 0.12s ease;

    &:hover { opacity: 0.88; }

    &:active { transform: scale(0.97); }

    &--primary {
      font-weight: 400;
      color: #fff;
      background: var(--dc-brand);
      border: none;
    }

    /* 禁用态：否则禁用的主按钮（如「所有协议类型均已创建 → 禁用新增」）
       只有 title 提示、外观与可用态完全一致 */
    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;

      &:hover { opacity: 0.6; }

      &:active { transform: none; }
    }
  }

  &__shimmer {
    background: linear-gradient(
      90deg,
      var(--dc-divider) 25%,
      var(--dc-bg-header) 50%,
      var(--dc-divider) 75%
    );
    background-size: 400% 100%;
    animation: dc-tbl-shimmer 1.2s linear infinite;
  }

  &__spin { animation: dc-tbl-spin 0.6s linear; }
}

/* 仅承载 hover / focus / 动效等 inline style 表达不了的部分；
   一切可量化的尺寸与颜色都写在模板的 inline style 上。 */
</style>
