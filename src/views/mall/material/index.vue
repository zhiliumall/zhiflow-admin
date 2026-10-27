<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
  <div class="goods-dc-page">
    <el-tabs v-model="materialType" type="border-card" @tab-change="tabClick"
      class="pill-tabs" style="

--el-tabs-header-width: fit-content">
      <el-tab-pane v-if="!selectType || selectType === '1'" name="1">
        <template v-slot:label>
          <span>{{ $t("commons.image") }}</span>
        </template>
      </el-tab-pane>
      <el-tab-pane v-if="!selectType || selectType === '2'" name="2">
        <template v-slot:label>
          <span>{{ $t("commons.video") }}</span>
        </template>
      </el-tab-pane>
      <el-row :gutter="20" class="material-content">
        <el-col class="group-sidebar-col" :span="4">
          <div class="group-sidebar">
            <!-- 标题 -->
            <div class="gs-header">{{ $t("mall.material.groupId") }}</div>
            <!-- 分组列表 -->
            <div class="gs-list-wrap">
              <div v-for="(item, idx) in visibleGroupFlatList" :key="item.id" class="gs-item"
                :class="{ 'gs-item--active': item.id === groupId }"
                :style="{ paddingLeft: (12 + (item._level || 0) * 18) + 'px' }" @click="onTreeNodeClick(item)">
                <span v-if="item._hasChildren" class="gs-caret"
                  :class="{ 'gs-caret--open': !collapsedGroupIds.includes(item.id) }"
                  :title="collapsedGroupIds.includes(item.id) ? '展开子分组' : '收起子分组'"
                  @click.stop="toggleGroupCollapse(item)">▸</span>
                <span v-else class="gs-caret gs-caret--placeholder" />
                <span class="gs-item-name">{{ item.name }}</span>
              </div>
              <div v-if="!materialgroupFlatList?.length" class="gs-empty">暂无分组</div>
            </div>
            <!-- 新增按钮 -->
            <div class="gs-footer">
              <button class="gs-add-btn" @click="addNode(null)">+ 新增分组</button>
            </div>
          </div>
        </el-col>
        <el-col :span="20">
          <el-card style="border: none" class="material-card-content">
            <template v-if="groupId" #header>
              <div>
                <el-row justify="space-between">
                  <div class="pl-[10px]">
                    <div class="flex items-center">
                      <span class="text-[18px] font-bold">{{
                        materialgroupObj.name
                      }}</span>
                      <span>
                        <el-button link icon="edit" type="primary" style="margin-left: 30px"
                          @click="materialgroupEditF(materialgroupObj)">{{
                            $t("mall.material.rename") }}</el-button>
                        <el-button link icon="delete" type="danger" style="margin-left: 10px"
                          @click="materialgroupDelete(materialgroupObj)">{{
                            $t("commons.delete") }}</el-button>
                      </span>
                    </div>
                  </div>
                  <div class="flex justify-end" style="
                      position: absolute;
                      right: 0;
                      z-index: 99;
                      float: right;
                      width: 300px;
                    ">
                    <el-button v-if="materialType === '2'" class="mr-5" size="small" type="primary" icon="plus"
                      @click="uploadVideoUrl">{{ $t("mall.material.videoUrlAdd") }}</el-button>
                    <el-upload ref="uploadRef" :action="uploadAction" :accept="materialType === '2' ? 'video/*' : 'image/*'" :headers="headers" :limit="12"
                      :multiple="materialType === '2' ? false : true" :file-list="[]" :http-request="customUpload"
                      :before-upload="beforeUpload" :on-success="handleSuccess" :on-error="handleError">
                      <el-button type="primary" icon="upload">
                        {{ $t("commons.uploadFIleClick") }}
                      </el-button>
                    </el-upload>
                  </div>
                </el-row>
              </div>
            </template>
            <!-- 筛选栏 -->
            <div v-if="groupId" class="filter-bar">
              <ProSearchForm :fields="searchFields" v-model="searchForm" :no-card="true" :columns="4" :fold-count="3"
                @search="onProSearch" @reset="onProReset" />
            </div>
            <!-- material-grid-wrap 是给弹窗形态用的样式钩子（网格区滚动 + 分页固定），
                 见 components/material/list.vue 底部 .material-list-selector-dialog 样式块。
                 整页形态下该类名不挂任何样式。 -->
            <div ref="gridWrapRef" v-loading="tableLoading" class="material-grid-wrap">
              <el-alert v-if="!groupId" :title="$t('mall.material.file')" type="error" :closable="false" center />
              <el-alert v-if="groupId && tableData.length <= 0" :title="$t('welcome.welcome.notData')" type="info"
                :closable="false" center show-icon />

              <el-row :gutter="10">
                <el-col v-for="(item, index) in tableData" :key="index" :span="6" :xs="12" :sm="8" :md="6" :lg="4">
                  <div class="material-card" :class="{ 'is-selected': isSelected(item.url) }"
                    :data-check="checkMaterial ? 'true' : undefined" @click="handleCardClick(item)">
                    <!-- 选中角标 -->
                    <div v-if="checkMaterial" class="mc-check-icon">
                      <svg v-if="isSelected(item.url)" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="11" fill="#3C6EF0" />
                        <path d="M9 12l2 2 4-4" stroke="#fff" stroke-width="2" stroke-linecap="round"
                          stroke-linejoin="round" />
                      </svg>
                      <div v-else class="mc-check-circle"></div>
                    </div>
                    <!-- 标题 -->
                    <div class="mc-title" :title="item.name">{{ item.name }}</div>
                    <!-- 预览区 -->
                    <div class="mc-preview">
                      <el-image v-if="item.type === '1'" style="width: 100%; height: 100%" :src="item.url" fit="contain"
                        :preview-teleported="true" :preview-src-list="[item.url]" />
                      <div v-else style="width: 100%; height: 100%">
                        <video style="width: 100%; height: 100%" controls preload="metadata" :src="item.url" />
                      </div>
                    </div>
                    <!-- 时间 -->
                    <div class="mc-time">{{ formatMaterialTime(item.createTime) }}</div>
                    <!-- 操作栏 -->
                    <div class="mc-actions">
                      <div class="mc-action" @click="materialRename(item)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                            fill="#3C6EF0" />
                        </svg>
                        <span>重命名</span>
                      </div>
                      <div class="mc-action mc-action-danger" @click="materialDel(item)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                            fill="#ff4d4f" />
                        </svg>
                        <span>删除</span>
                      </div>
                      <div class="mc-action">
                        <el-dropdown trigger="click" @command="handleCommand">
                          <span class="mc-dropdown-trigger">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path
                                d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"
                                fill="#3C6EF0" />
                            </svg>
                            <span>分组</span>
                          </span>
                          <template v-slot:dropdown>
                            <el-dropdown-menu style="max-height: 300px; overflow-y: auto">
                              <template v-for="item2 in materialgroupFlatList" :key="item2.id">
                                <el-dropdown-item :command="item.id + '-' + item2.id"
                                  :disabled="item.groupId === item2.id"
                                  :style="item2._level > 0 ? 'padding-left: ' + (20 + item2._level * 16) + 'px' : ''">
                                  {{ item2.parentId ? '└ ' : '' }}{{ item2.name }}
                                </el-dropdown-item>
                              </template>
                            </el-dropdown-menu>
                          </template>
                        </el-dropdown>
                      </div>
                      <div class="mc-action" @click="materialUrl(item)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"
                            fill="#3C6EF0" />
                        </svg>
                        <span>链接</span>
                      </div>
                    </div>
                  </div>
                </el-col>
              </el-row>
              <ProPagination v-model:current-page="page.currentPage" v-model:page-size="page.pageSize"
                :total="page.total" :page-sizes="[12, 24]" layout="->, total, sizes, prev, pager, next, jumper"
                @size-change="sizeChange" @page-change="currentChange" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-tabs>

    <!-- 自定义素材重命名弹窗 -->
    <el-dialog v-model="renameDialogVisible" :show-close="false" :close-on-click-modal="false"
      :close-on-press-escape="true" align-center width="560px" class="rename-pretty-dialog" append-to-body>
      <div class="rename-pretty">
        <div class="rename-pretty__content">
          <div class="rename-pretty__tag">
            <el-icon class="rename-pretty__tag-icon" aria-hidden="true"><InfoFilled /></el-icon>
            <span class="rename-pretty__tag-text">提示</span>
          </div>
          <h3 class="rename-pretty__title">素材名称</h3>
          <p class="rename-pretty__desc">请输入素材名以继续操作。</p>
          <el-input v-model="renameValue" class="rename-pretty__input" placeholder="请输入素材名"
            @keyup.enter="handleMaterialRenameConfirm" />
          <div class="rename-pretty__footer">
            <el-button class="rename-pretty__btn rename-pretty__btn--cancel"
              @click="renameDialogVisible = false">取消</el-button>
            <el-button class="rename-pretty__btn rename-pretty__btn--confirm"
              @click="handleMaterialRenameConfirm">保存</el-button>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>
<script lang="ts">
import { addObj, delObj, getPage, putObj } from '@/api/mall/material'
import {
  addObj as materialgroupAdd,
  delObj as materialgroupDel,
  putObj as materialgroupEdit,
  getPage as materialgroupPage,
} from '@/api/mall/materialgroup'
import ProPagination from '@/components/ProTable/ProPagination.vue'
import ProSearchForm from '@/components/ProTable/ProSearchForm.vue'
import website from '@/config/website'
import { usePermissionStoreHook } from '@/store/modules/permission'
import { getToken } from '@/utils/auth'
import { apiUrl } from '@/utils/http/apiUrl'
import { filterForm } from '@/utils/util'
import {
  validImgFile,
  type UploadImgLimit,
} from '@/components/material/upload-guard'
import { appConfirm } from '@/components/overlay'
import {
  computed,
  getCurrentInstance,
  nextTick,
  onMounted,
  reactive,
  ref,
  toRefs,
  watch,
  type PropType,
} from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'

/** 素材所属类型：0 = 商城素材（单店铺只有这一种） */
const MATERIAL_OF_TYPE = '0'

export default {
  components: {
    InfoFilled,
    ProPagination,
    ProSearchForm,
  },
  props: {
    selectType: {
      // 1:image 2:video 为空时为全部
      type: String,
    },
    value: {
      type: Array,
      default() {
        return []
      },
    },
    num: {
      type: Number,
      default() {
        return 5
      },
    },
    checkMaterial: {
      type: Boolean,
      default() {
        return false
      },
    },
    /**
     * 图片上传约束 { kb, types, minW, minH }（可选）。
     * 传入时按规格前置拦截（如 ≤2M / logo 500KB / icon 200KB）；
     * 不传时保持历史行为（website.limitUploadImageSize），存量调用方零影响。
     */
    imgLimit: {
      type: Object as PropType<UploadImgLimit>,
      default: null,
    },
  },
  setup(props, context) {
    const { proxy } = getCurrentInstance() as any
    /** 素材网格外层容器，弹窗形态下要在换页/换分组后把它内部的滚动区归零 */
    const gridWrapRef = ref<HTMLElement | null>(null)
    const data = reactive({
      materialType: props.selectType || '1',
      headers: {
        Authorization: 'Bearer ' + getToken().access_token,
      },
      dialogVisible: false,
      listDialogVisible: false,
      materialgroupList: [], // 扁平列表（原始数据）
      materialgroupTree: [], // 树形结构数据
      materialgroupFlatList: [], // 带层级的扁平列表（用于下拉选择）
      // 侧栏里被折叠起来的分组 id。二级分组默认收起：分组一多，全展开的侧栏要滚很久才找到下一个一级分组。
      collapsedGroupIds: [] as string[],
      materialgroupObjId: '',
      materialgroupObj: {
        name: '',
      },
      materialgroupLoading: false,
      tableData: [],
      page: {
        total: 0,
        currentPage: 1,
        pageSize: 12,
        ascs: '',
        descs: 'create_time',
      },
      tableLoading: false,
      groupId: null,
      // 筛选相关
      searchName: '',
      sortOrder: 'create_time_desc',
      searchForm: { name: '', sortOrder: 'create_time_desc' } as Record<string, any>,
      urls: props.value || ([] as any),
      width: 150,
      height: 150,
      type: 'image',
      // 自定义素材重命名弹窗状态
      renameDialogVisible: false,
      renameValue: '',
      renameRow: null as any,
    })
    const permissions = computed(() => {
      return usePermissionStoreHook()?.permissions
    })

    // el-upload 自己发 XHR、不经 axios，地址要拼后端前缀（VITE_API_BASE）
    const uploadAction = computed(() =>
      apiUrl(`/upms/file/upload?fileType=${data.materialType === '2' ? 'video' : 'image'}&dir=material/`)
    )

    // 选择器形态：已选状态必须跟随父组件传入的 value（每次打开 = 当前表单值）。
    // 以前 data.urls 只在创建时取一次 props.value，且与父组件共用同一个数组：
    // 弹窗不销毁，第二次打开显示的仍是上次的勾选，点同一张图会被当成「取消选中」，
    // 而且 splice 直接改到表单的图片数组上——图片被悄悄清空。
    // 这里每次 value 变化都复制一份，选中/取消只改自己的副本，点「选择」后才回写。
    watch(
      () => props.value,
      val => {
        if (!props.checkMaterial) return
        if (val === data.urls) return
        data.urls = Array.isArray(val) ? [...val] : ([] as any)
      }
    )
    if (props.checkMaterial && Array.isArray(props.value)) {
      data.urls = [...props.value] as any
    }

    onMounted(() => {
      materialgroupPageF()
    })

    function currentChange(currentPage) {
      data.page.currentPage = currentPage
      getPageF(data.page)
    }
    // 获取素材分组
    function materialgroupPageF() {
      data.materialgroupLoading = true
      materialgroupPage(
        filterForm({
          total: 0,
          current: 1,
          size: 999,
          ascs: 'create_time',
          materialType: data.materialType, //素材类型（1：图片；2：视频）
        })
      ).then(response => {
        data.materialgroupLoading = false
        const list = response.data.records || []
        data.materialgroupList = list
        // 构建树形结构
        data.materialgroupTree = buildGroupTree(list)
        // 构建带层级的扁平列表（用于下拉选择）
        data.materialgroupFlatList = flattenGroupTree(data.materialgroupTree)
        // 二级分组默认收起：凡是有子分组的节点，初始都折叠
        data.collapsedGroupIds = data.materialgroupFlatList
          .filter((item: any) => item._hasChildren)
          .map((item: any) => item.id)
        data.groupId = null
        data.page.currentPage = 1
        data.page.total = 0
        // 查询第一个分组数据
        if (list.length > 0) {
          groupTreeRefLoad(list[0])
        } else {
          data.tableData = []
        }
      })
    }

    // 将扁平分组列表组装为树形结构
    function buildGroupTree(list: any[]) {
      const map = {}
      const tree: any[] = []
      // 先建立 id -> node 映射
      list.forEach(item => {
        map[item.id] = { ...item, children: [] }
      })
      // 组装树
      list.forEach(item => {
        if (item.parentId && map[item.parentId]) {
          map[item.parentId].children.push(map[item.id])
        } else {
          tree.push(map[item.id])
        }
      })
      // 清理空 children 并按名称 A-Z 排序（后端返回顺序不稳定，分组多了找不着）
      const byName = (a: any, b: any) =>
        (a.name || '').localeCompare(b.name || '', 'zh-Hans-CN', { numeric: true })
      function clean(nodes: any[]) {
        nodes.forEach(n => {
          if (n.children.length === 0) {
            delete n.children
          } else {
            n.children.sort(byName)
            clean(n.children)
          }
        })
      }
      tree.sort(byName)
      clean(tree)
      return tree
    }

    // 将树形结构扁平化为带层级标记的列表（用于下拉菜单）
    function flattenGroupTree(tree: any[], level = 0): any[] {
      const result: any[] = []
      tree.forEach(node => {
        const hasChildren = !!(node.children && node.children.length > 0)
        result.push({ ...node, _level: level, _hasChildren: hasChildren })
        if (hasChildren) {
          result.push(...flattenGroupTree(node.children, level + 1))
        }
      })
      return result
    }

    /**
     * 侧栏实际渲染用的分组列表：祖先链上任一节点被折叠就不显示。
     * 下拉菜单（移动素材到分组）仍用全量 materialgroupFlatList，不受折叠影响。
     */
    const visibleGroupFlatList = computed(() => {
      const collapsed = new Set(data.collapsedGroupIds)
      if (collapsed.size === 0) return data.materialgroupFlatList
      const byId = new Map<string, any>(
        data.materialgroupFlatList.map((item: any) => [item.id, item])
      )
      return data.materialgroupFlatList.filter((item: any) => {
        let parentId = item.parentId
        while (parentId) {
          if (collapsed.has(parentId)) return false
          parentId = byId.get(parentId)?.parentId
        }
        return true
      })
    })

    function toggleGroupCollapse(item: any) {
      const idx = data.collapsedGroupIds.indexOf(item.id)
      if (idx === -1) data.collapsedGroupIds.push(item.id)
      else data.collapsedGroupIds.splice(idx, 1)
    }

    function materialgroupDelete(materialgroupObj) {
      appConfirm({
        intent: 'delete',
        title: '删除该分组？',
        verb: '删除',
        impact: '请先确认分组内的素材已移动到其他分组。',
      })
        .then(() => {
          // 检查是否有子分组
          const hasChildren = data.materialgroupList.some(
            item => item.parentId === materialgroupObj.id
          )
          if (hasChildren) {
            proxy.$message({
              type: 'error',
              message: '请先删除子分组',
            })
            return
          }
          if (data.tableData.length > 0) {
            proxy.$message({
              type: 'error',
              message: proxy.$t('mall.material.moveMaterialsFirst'),
            })
            return
          }
          materialgroupDel(materialgroupObj.id).then(() => {
            materialgroupPageF()
          })
        })
    }

    function materialgroupEditF(materialgroupObj) {
      appConfirm({
        intent: 'confirm',
        title: proxy.$t('mall.material.enterGroupNamePrompt'),
        verb: '保存',
        input: { value: materialgroupObj.name, required: false },
      })
        .then(({ value }: any) => {
          materialgroupEdit({
            id: materialgroupObj.id,
            name: value,
          }).then(() => {
            materialgroupObj.name = value
            tabClick()
            // data.materialgroupList[materialgroupObj.index] = materialgroupObj;
          })
        })
    }

    function treeFormBeforeOpen() { }
    // 添加分组（parentId 为 null 时创建一级分组，否则创建子分组）
    function addNode(parentId: string | null) {
      appConfirm({
        intent: 'confirm',
        title: proxy.$t('mall.material.enterGroupNamePrompt'),
        verb: '创建',
        input: { pattern: /[\S]/, errorText: proxy.$t('commons.notNull') },
      })
        .then(({ value }: any) => {
          materialgroupAdd({
            name: value,
            ofType: MATERIAL_OF_TYPE,
            materialType: data.materialType,
          }).then(() => {
            materialgroupPageF()
          })
        })
    }

    function tabClick() {
      data.page.currentPage = 1
      data.page.total = 0
      materialgroupPageF()
    }

    const groupTreeRef = ref(null)
    // 默认选择第一个分组
    function groupTreeRefLoad(node) {
      proxy.$nextTick(() => {
        groupTreeRef.value?.setCurrentKey(node.id)
        nodeClick(node)
      })
    }

    // el-tree 节点点击
    function onTreeNodeClick(data) {
      nodeClick(data)
    }

    function nodeClick(form) {
      data.materialgroupObj = form
      data.materialgroupObjId = form.id
      data.page.currentPage = 1
      data.page.total = 0
      if (form.id) {
        data.groupId = form.id
        getPageF(data.page)
      }
    }

    // 获取素材列表数据
    /**
     * 换页 / 换分组 / 搜索后把素材网格滚回顶部。
     * 弹窗形态下网格区自己是滚动容器（见 components/material/list.vue 底部的
     * .material-list-selector-dialog 样式块），不归零的话翻完页还停在上一屏的位置，
     * 新一页的第一行看不到。整页形态下该容器不滚动，判断落空、不做事。
     */
    function scrollGridTop() {
      nextTick(() => {
        const scroller = gridWrapRef.value?.querySelector('.el-row') as HTMLElement | null
        if (scroller && scroller.scrollHeight > scroller.clientHeight) {
          scroller.scrollTop = 0
        }
      })
    }

    function getPageF(page) {
      data.tableLoading = true
      // 构建排序参数
      const sortParams: any = {}
      if (data.sortOrder === 'create_time_desc') {
        sortParams.descs = 'create_time'
        sortParams.ascs = ''
      } else if (data.sortOrder === 'create_time_asc') {
        sortParams.ascs = 'create_time'
        sortParams.descs = ''
      } else if (data.sortOrder === 'name_asc') {
        sortParams.ascs = 'name'
        sortParams.descs = ''
      } else if (data.sortOrder === 'name_desc') {
        sortParams.descs = 'name'
        sortParams.ascs = ''
      }
      // 构建请求参数（后端按字段等值匹配：name 需与素材名称完全一致）
      const reqParams = filterForm({
        current: page.currentPage,
        size: page.pageSize,
        groupId: data.groupId,
        name: data.searchName || undefined,
        ...sortParams,
      })
      getPage(reqParams)
        .then(response => {
          const tableData = response.data.records
          data.page.total = response.data.total
          data.page.currentPage = page.currentPage
          data.page.pageSize = page.pageSize
          data.tableData = tableData
          data.tableLoading = false
          scrollGridTop()
        })
        .catch(() => {
          data.tableLoading = false
        })
    }

    function sizeChange(val) {
      data.page.currentPage = 1
      data.page.pageSize = val
      getPageF(data.page)
    }

    function materialRename(item) {
      data.renameRow = item
      data.renameValue = item.name || ''
      data.renameDialogVisible = true
    }

    function handleMaterialRenameConfirm() {
      const item = data.renameRow
      const value = (data.renameValue || '').trim()
      if (!value) {
        ; (proxy as any).$message({ message: proxy.$t('commons.notNull'), type: 'warning' })
        return
      }
      if (!item) {
        data.renameDialogVisible = false
        return
      }
      putObj({
        id: item.id,
        name: value,
      }).then(() => {
        getPageF(data.page)
        data.renameDialogVisible = false
      })
    }

    function materialUrl(item) {
      appConfirm({
        intent: 'confirm',
        title: proxy.$t('mall.material.materialLink'),
        verb: '复制链接',
        input: { value: item.url, required: false },
      })
        .then(() => {
          // 将素材链接复制到剪贴板
          if (navigator.clipboard?.writeText) {
            // 使用现代 Clipboard API
            navigator.clipboard
              .writeText(item.url)
              .then(() => {
                proxy.$message.success('链接已复制到剪贴板')
              })
              .catch(() => {
                // 如果现代API失败，使用降级方案
                fallbackCopyToClipboard(item.url)
              })
          } else {
            // 直接使用降级方案
            fallbackCopyToClipboard(item.url)
          }
        })

      // 降级复制方法
      function fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        proxy.$message.success('链接已复制到剪贴板')
      }
    }

    function materialDel(item) {
      appConfirm({ intent: 'delete', title: '删除该素材？', verb: '删除' })
        .then(() => {
          delObj(item.id).then(() => {
            getPageF(data.page)
          })
        })
    }

    function handleCommand(command) {
      const s = command.split('-')
      putObj({
        id: s[0],
        groupId: s[1],
      }).then(() => {
        getPageF(data.page)
      })
    }

    function handleProgress() { }

    const uploadRef = ref(null)

    // ============ 上传并发控制 ============
    const MAX_CONCURRENT_UPLOADS = 2
    let activeUploadCount = 0
    const uploadQueue: Array<() => void> = []

    function processQueue() {
      while (activeUploadCount < MAX_CONCURRENT_UPLOADS && uploadQueue.length > 0) {
        const next = uploadQueue.shift()
        if (next) {
          activeUploadCount++
          next()
        }
      }
    }

    // 返回 Promise：el-upload 在 resolve / reject 时自己回调 on-success / on-error
    function customUpload(options: any): Promise<unknown> {
      const { action, file, headers, onProgress } = options
      return new Promise((resolve, reject) => {
        const task = () => {
          const formData = new FormData()
          formData.append('file', file)
          const xhr = new XMLHttpRequest()
          xhr.open('POST', action, true)
          Object.keys(headers || {}).forEach((key) => {
            xhr.setRequestHeader(key, headers[key])
          })
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              onProgress({ percent: (e.loaded / e.total) * 100 })
            }
          }
          const finish = () => {
            activeUploadCount--
            processQueue()
          }
          xhr.onload = () => {
            finish()
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText))
              } catch (e) {
                reject(e)
              }
            } else {
              reject(new Error(xhr.responseText))
            }
          }
          xhr.onerror = () => {
            finish()
            reject(new Error('Upload failed'))
          }
          xhr.timeout = 300000 // 5分钟超时
          xhr.ontimeout = () => {
            finish()
            reject(new Error('Upload timed out'))
          }
          xhr.onabort = () => {
            finish()
            reject(new Error('Upload aborted'))
          }
          xhr.send(formData)
        }

        if (activeUploadCount < MAX_CONCURRENT_UPLOADS) {
          activeUploadCount++
          task()
        } else {
          uploadQueue.push(task)
        }
      })
    }

    function handleSuccess(response, file) {
      // data.uploadProgress = 0;
      if (!response.link) {
        proxy.$message.error(proxy.$t('mall.material.urlNotNull'))
        return
      }

      addObj({
        type: data.materialType,
        groupId: data.groupId,
        name: file.name,
        url: response.link,
        ofType: MATERIAL_OF_TYPE,
      }).then(() => {
        getPageF(data.page)
        // 1秒后关闭文件显示
        setTimeout(() => {
          uploadRef.value?.clearFiles()
        }, 2000)
      })
    }

    function handleError(err: Error) {
      try {
        const errorMsg = err.message ? JSON.parse(err.message).msg : err.message
        proxy.$message.error(errorMsg)
      } catch (e) { }
    }

    //为保证图片url合法性，只支持视频链接
    function uploadVideoUrl() {
      appConfirm({
        intent: 'confirm',
        title: proxy.$t('mall.material.enterVideoLink'),
        verb: '添加',
        input: { pattern: /[\S]/, errorText: proxy.$t('mall.material.videoLinkRequired') },
      })
        .then(({ value }: any) => {
          addObj({
            type: data.materialType,
            groupId: data.groupId,
            name: value,
            url: value,
            ofType: MATERIAL_OF_TYPE,
          }).then(() => {
            getPageF(data.page)
          })
        })
    }

    function beforeUpload(file) {
      // groupId不能为空
      if (!data.groupId) {
        proxy.$message.error(proxy.$t('mall.material.selectGroup'))
        return false
      }
      if (data.materialType === '2') {
        const isVideo =
          file.type === 'video/mp4' ||
          file.type === 'video/avi' ||
          file.type === 'video/mpeg' ||
          file.type === 'video/quicktime' ||
          file.type === 'video/x-ms-wmv' ||
          file.type === 'video/x-msvideo' ||
          file.type === 'video/x-flv'
        const isLt2M = file.size / 1024 / 1024 < website.limitUploadFileSize // 视频不能超过100M
        // 提示不能超过100M
        if (!isLt2M) {
          proxy.$message.error(
            proxy.$t('mall.material.uplaodFileSizeTip', {
              size: website.limitUploadFileSize,
            })
          )
          return false
        }
        return isVideo && isLt2M
      } else {
        // 调用方传了规格约束 → 按规格前置拦截：
        // 类型白名单（IMG_TYPES_DEFAULT，与下面历史分支同一套）+ 体积上限（≤2M，含更严的 500KB/200KB 规格）。
        if (props.imgLimit) {
          const res = validImgFile(file, props.imgLimit)
          if (!res.ok) {
            proxy.$message.error(res.msg)
            return false
          }
          return true
        }
        // 未传约束 → 保持历史行为（website.limitUploadImageSize），兼容存量调用方。
        const isPic =
          file.type === 'image/jpeg' ||
          file.type === 'image/png' ||
          file.type === 'image/gif' ||
          file.type === 'image/bmp' ||
          file.type === 'image/webp' ||
          file.type === 'image/svg+xml'
        const isLtLimit = file.size / 1024 / 1024 < website.limitUploadImageSize
        if (!isLtLimit) {
          proxy.$message.error(
            proxy.$t('mall.material.uplaodFileSizeTip', {
              size: website.limitUploadImageSize,
            })
          )
          return false
        }
        return isPic && isLtLimit
      }
    }

    function checkMaterialChange() {
      context.emit('update:value', data.urls)
    }

    // 判断素材是否已选中
    const isSelected = (url: string) => {
      return data.urls.includes(url)
    }

    // 点击卡片切换选中状态
    const handleCardClick = (item: any) => {
      if (!props.checkMaterial) return
      const url = item.url
      const index = data.urls.indexOf(url)
      if (index > -1) {
        data.urls.splice(index, 1)
      } else {
        if (data.urls.length >= props.num) {
          // 单选位（num=1，品牌 Logo / 商城 Logo 等「替换」入口）：点新图 = 换掉旧图。
          if (props.num === 1) {
            data.urls.splice(0, data.urls.length, url)
            checkMaterialChange()
            return
          }
          proxy.$message.warning(`最多选择 ${props.num} 个，请先取消已选的再选`)
          return
        }
        data.urls.push(url)
      }
      checkMaterialChange()
    }

    // 搜索
    function handleSearch() {
      data.page.currentPage = 1
      getPageF(data.page)
    }

    // 重置筛选
    function handleReset() {
      data.searchName = ''
      data.sortOrder = 'create_time_desc'
      data.page.currentPage = 1
      getPageF(data.page)
    }

    // 格式化素材时间
    const formatMaterialTime = (time: string | number | Date) => {
      if (!time) return '';
      const d = new Date(time);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${y}.${m}.${day} ${h}:${min}`;
    };

    // ProSearchForm 搜索字段配置
    const searchFields: any[] = [
      {
        prop: 'name',
        label: proxy.$t('mall.material.name'),
        component: 'input' as const,
        placeholder: proxy.$t('mall.material.enterMaterialName'),
      },
      {
        prop: 'sortOrder',
        label: proxy.$t('mall.material.sortLabel'),
        component: 'select' as const,
        defaultValue: 'create_time_desc',
        options: [
          { label: proxy.$t('mall.material.sortLatest'), value: 'create_time_desc' },
          { label: proxy.$t('mall.material.sortEarliest'), value: 'create_time_asc' },
          { label: proxy.$t('mall.material.sortNameAsc'), value: 'name_asc' },
          { label: proxy.$t('mall.material.sortNameDesc'), value: 'name_desc' },
        ],
      },
    ]

    // ProSearchForm 事件处理
    function onProSearch(params: Record<string, any>) {
      data.searchName = params.name || ''
      data.sortOrder = params.sortOrder || 'create_time_desc'
      handleSearch()
    }

    function onProReset() {
      data.searchName = ''
      data.sortOrder = 'create_time_desc'
      data.page.currentPage = 1
      getPageF(data.page)
    }

    return {
      ...toRefs(data),
      permissions,
      groupTreeRef,
      gridWrapRef,
      uploadRef,
      uploadAction,
      customUpload,
      currentChange,
      materialgroupPageF,
      materialgroupDelete,
      materialgroupEditF,
      addNode,
      treeFormBeforeOpen,
      onTreeNodeClick,
      visibleGroupFlatList,
      toggleGroupCollapse,
      nodeClick,
      tabClick,
      getPageF,
      sizeChange,
      materialRename,
      handleMaterialRenameConfirm,
      materialUrl,
      materialDel,
      handleCommand,
      handleProgress,
      handleSuccess,
      handleError,
      beforeUpload,
      checkMaterialChange,
      uploadVideoUrl,
      handleSearch,
      handleReset,
      searchFields,
      onProSearch,
      onProReset,
      formatMaterialTime,
      isSelected,
      handleCardClick,
    }
  },
}
</script>
<style lang="scss" scoped>

/* ========== 素材卡片 ========== */
.material-card {
  position: relative;

  /* 行间距：与 el-row :gutter="10" 的列间距对齐，纵横一致 */
  margin-bottom: 10px;
  overflow: hidden;
  cursor: default;
  background: #fff;
  border: 2px solid #eceffa;
  border-radius: 10px;
  transition: box-shadow 0.2s, border-color 0.2s;

  &.is-selected {
    border-color: var(--dc-brand);
    box-shadow: 0 4px 16px rgb(59 85 196 / 20%);
  }

  &[data-check="true"] {
    cursor: pointer;
  }

  &:hover:not(.is-selected) {
    border-color: var(--dc-brand);
    box-shadow: 0 4px 16px rgb(59 85 196 / 10%);
  }
}

/* 选中角标 */
.mc-check-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  width: 22px;
  height: 22px;

  .mc-check-circle {
    box-sizing: border-box;
    width: 18px;
    height: 18px;
    background: rgb(255 255 255 / 85%);
    border: 2px solid #dcdfe6;
    border-radius: 50%;
    transition: all 0.2s;
  }

  &:hover .mc-check-circle {
    border-color: var(--dc-brand);
  }
}

.material-content {
  margin: 0 !important;
}

.mc-title {
  padding: 8px 12px 6px;
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5715;
  color: var(--dc-text-1);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mc-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 4 / 3;
  margin: 2px 10px;
  overflow: hidden;
  background: #f2f2f2;
  border-radius: 6px;

  :deep(.el-image) {
    width: 100%;
    height: 100%;
  }

  :deep(img) {
    object-fit: contain !important;
  }
}

.mc-time {
  min-height: 18px;
  padding: 4px 12px;
  font-size: 14px;
  line-height: 1.5715;
  color: var(--text-tertiary, #667085);
  white-space: nowrap;
}

.mc-actions {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 6px 0;
  background: #eceffa;
  border-top: 1px solid #cdd6f2;
}

.mc-action {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  color: var(--dc-brand);
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.7;
  }

  span {
    font-size: 14px;
    line-height: 1.5715;
  }

  &.mc-action-danger {
    color: var(--dc-danger);
  }
}

.mc-dropdown-trigger {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  color: var(--dc-brand);
  cursor: pointer;

  span {
    font-size: 14px;
  }
}

.material-name {
  display: flex;
  align-items: center;
  width: 100%;
  height: 16px;
  padding: 0 5px;
  margin-top: 10px;
  overflow: hidden;
  font-size: 14px;
  line-height: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compile {
  padding-top: 5px;
  padding-bottom: 5px;
}

.col-do {
  text-align: center;
}

.button-do {
  padding: unset !important;
  font-size: 14px;
}

.pagination {
  margin-top: 20px;
}

.el-card.is-always-shadow {
  box-shadow: none;
}

:deep(.el-card__header) {
  padding: 9px 0 !important;
  margin: 0 20px;
}

/* 分页条：整页形态下它跟在网格后面，默认 16px 上边距是最后一段能省的高度。
   弹窗形态由 list.vue 的 `.material-grid-wrap > .pro-pagination`（0,4,0）接管。 */
.material-grid-wrap {
  :deep(.pro-pagination) {
    padding: 14px 0 0;
  }
}

:deep(.el-upload-list) {
  position: absolute;
  top: 0;
  right: 150px;
  width: 300px;
}

/* ========== 左侧分组侧栏 ========== */
.group-sidebar-col {
  max-height: 600px;
  padding: 0 !important;
}

.material-card-content {
  background: #fafafa;
  border-radius: 8px;

  /* el-card 默认 body padding 20px：顶部这 20px 直接把筛选栏和网格往下压。
     弹窗形态里 list.vue 用 `.material-card-content > .el-card__body`（0,4,0）另有
     一套，优先级高过这里的 scoped（0,3,0），互不打架。 */
  :deep(.el-card__body) {
    padding: 12px 20px 14px;
  }
}

.group-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border: 1px solid #F1F3F8;
  border-radius: 8px;
}

.gs-header {
  flex-shrink: 0;
  padding: 18px 16px 12px;
  font-size: 16px;
  font-weight: 600;
  color: var(--dc-brand);
}

.gs-list-wrap {
  flex: 1;
  padding: 4px 0;
  overflow-y: auto;
}

.gs-caret {
  display: inline-block;
  width: 14px;
  margin-right: 2px;
  font-size: 12px;
  color: var(--dc-text-3);
  text-align: center;
  transition: transform 0.15s;

  &--open {
    transform: rotate(90deg);
  }

  &--placeholder {
    color: transparent;
  }
}

.gs-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  font-size: 14px;
  color: var(--dc-text-1);
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: background 0.15s, border-color 0.15s;

  .gs-item-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    background: #f8f9fa;
  }

  &--active {
    font-weight: 500;
    color: var(--dc-text-1);
    background: #F7F9FE;
    border-left-color: var(--dc-brand);
  }
}

.gs-empty {
  padding: 30px 16px;
  font-size: 14px;
  color: var(--text-tertiary, #667085);
  text-align: center;
}

.gs-footer {
  flex-shrink: 0;
  padding: 12px 16px 16px;
}

.gs-add-btn {
  width: 100%;
  padding: 10px 0;
  font-size: 14px;
  color: #fff;
  cursor: pointer;
  background: var(--dc-brand);
  border: none;
  border-radius: 6px;
  transition: background 0.2s, opacity 0.2s;

  &:hover {
    background: var(--dc-brand-hover);
    opacity: 0.95;
  }
}

.filter-bar {
  padding: 12px 0 0;

  /* 与下面第一行卡片之间要留出可辨认的分隔，贴太近筛选框会像卡片的一部分 */
  margin-bottom: 16px;

  /* 列数四档全部写成互斥的媒体查询，不留「无条件基线 + 窄屏覆盖」的写法：
     媒体查询不增加特异性，基线与窄屏档同为 (0,3,0)，谁写在后面谁赢——改前基线
     写在两个 @media 之后，窄屏那两档一直是死的（等于没响应式）。
     宽屏是 5 条轨道而不是 4 条：创建时间那项配了 span:2，4 轨的话「素材名 + 创建
     时间 + 排序」正好占满一行，搜索/重置只能换行，白白多吃一行（约 55px）；第 5
     条 auto 轨专门留给操作区，三个筛选项和按钮并成一行。 */
  @media (width > 1100px) {
    :deep(.pro-search-form__grid) {
      grid-template-columns:
        minmax(140px, 1fr) minmax(120px, 0.9fr) minmax(120px, 0.9fr)
        minmax(110px, 0.7fr) auto;
    }
  }

  @media (width <= 1100px) {
    :deep(.pro-search-form__grid) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (width <= 960px) {
    :deep(.pro-search-form__grid) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (width <= 640px) {
    :deep(.pro-search-form__grid) {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .material-date-range {
    width: 100%;
    min-width: 0;
  }

  :deep(.pro-search-form__item--actions) {
    min-width: max-content;
  }
}
</style>

<!-- 全局样式：append-to-body 的弹窗壳被 teleport 出去，挂不上 data-v-*，只能写非 scoped -->
<style lang="scss">
/* 图片预览层级不要在这里写死：image-viewer 自己走 EP 的 nextZIndex() 并写内联 style，
   本文件整页被内嵌进素材选择弹窗（components/material/list.vue），一旦在这里写
   `z-index: N !important` 就会盖掉内联值，把预览层永久钉在固定值上，后开的弹窗反而压不住它。
   原先那条 6000 !important 是为了逃出 style/index.scss 把选择器钉在 5004 的补丁，
   随那组补丁一起移除。 */

/* ========== 自定义重命名弹窗（append-to-body，不能 scoped） ========== */
.rename-pretty-dialog.el-dialog {
  background: transparent !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.rename-pretty-dialog .el-dialog__header {
  display: none;
}

.rename-pretty-dialog .el-dialog__body {
  padding: 0;
  background: transparent;
}

/* 纯白卡片，高度由内容决定 */
.rename-pretty {
  position: relative;
  background: var(--overlay-surface, #fff);
  border-radius: var(--overlay-radius, 12px);
}

.rename-pretty__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 24px 28px;
}

.rename-pretty__tag {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 14px;
}

.rename-pretty__tag-icon {
  font-size: 18px;
  color: var(--overlay-primary, #3c6ef0);
}

.rename-pretty__tag-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--dc-brand);
}

.rename-pretty__title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--dc-text-1);
}

.rename-pretty__desc {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-tertiary, #667085);
}

.rename-pretty__input.el-input .el-input__wrapper {
  height: 38px;
  padding: 0 12px;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #c9cdd4 inset;
  transition: box-shadow 0.2s;
}

.rename-pretty__input.el-input .el-input__wrapper:hover {
  box-shadow: 0 0 0 1px var(--dc-brand) inset;
}

.rename-pretty__input.el-input.is-focus .el-input__wrapper,
.rename-pretty__input.el-input .el-input__wrapper.is-focus {
  box-shadow: 0 0 0 1px var(--dc-brand) inset !important;
}

.rename-pretty__input.el-input .el-input__inner {
  font-size: 14px;
  color: var(--dc-text-1);
}

.rename-pretty__footer {
  display: flex;
  gap: 12px;
  margin-top: 18px;
}

.rename-pretty__btn.el-button {
  min-width: 78px;
  height: 36px;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 400;
  border-radius: 8px;
}

.rename-pretty__btn--cancel.el-button {
  color: var(--dc-text-1);
  background: #fff;
  border: 1px solid #e5e6eb;
}

.rename-pretty__btn--cancel.el-button:hover {
  color: var(--overlay-primary);
  background: var(--overlay-primary-soft);
  border-color: var(--overlay-primary-border);
}

.rename-pretty__btn--confirm.el-button {
  color: #fff;
  background: var(--overlay-primary);
  border: 1px solid var(--overlay-primary);
}

.rename-pretty__btn--confirm.el-button:hover {
  color: #fff;
  background: var(--overlay-primary-hover);
  border-color: var(--overlay-primary-hover);
}
</style>
