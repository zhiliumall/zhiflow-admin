<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<!--
单选图片使用:
  <MaterialList
            :disabled="scope.type == 'view'"
            v-model:singleValue="form.picUrl"
            :num="1"
            :is-single="true"
            type="image"
            :width="100"
            :height="100"
          />
多选图片使用
 <MaterialList
            v-model:value="form.picUrls"
            :disabled="scope.type == 'view'"
            type="image"
            :num="5"
          />
-->
<template>
  <div ref="rootRef" :style="rootStyle">
    <ul v-for="(item, index) in visibleUrls" :key="index" class="el-upload-list el-upload-list--picture-card">
      <li tabindex="0" class="is-ready flex justify-center" :class="[
        showBorder ? 'el-upload-list__item ' : '',
        dragIndex === index ? 'dragging' : '',
        dragOverIndex === index ? 'drag-over' : ''
      ]" :style="mediaBoxStyle" :draggable="!disabled && !isSingle && urls.length > 0" @dragstart="onDragStart(index, $event)"
        @dragover.prevent="onDragOver(index, $event)" @drop="onDrop(index, $event)" @dragend="onDragEnd($event)">
        <div>
          <el-image v-if="type == 'image'" :src="item ? item : ''" alt=""
            class="el-upload-list__item-thumbnail" />

          <video v-if="type == 'video'" class="el-upload-list__item-thumbnail" :src="item" />
          <span class="el-upload-list__item-actions">
            <span class="el-upload-list__item-preview" @click="zoomMaterial(index)">
              <el-icon :size="18"><el-icon-zoom-in /></el-icon>
            </span>
            <!-- 替换：复用素材选择弹窗（整组重选语义） -->
            <span v-show="!disabled" class="el-upload-list__item-delete" @click="toSeleteMaterial">
              <el-icon :size="18"><el-icon-refresh /></el-icon>
            </span>
            <span v-show="!disabled" class="el-upload-list__item-delete" @click="deleteMaterial(index)">
              <el-icon :size="18"><el-icon-delete /></el-icon>
            </span>
          </span>
        </div>
      </li>
    </ul>
    <div v-if="num > visibleUrls.length" tabindex="0" class="el-upload el-upload--picture-card upload-dashed"
      :style="mediaBoxStyle" @click="toSeleteMaterial">
      <div class="upload-dashed-content">
        <el-icon :size="32" class="upload-dashed-icon">
          <PictureFilled v-if="type === 'image'" class="upload-dashed-icon-image" />
          <el-icon-video-play v-else-if="type === 'video'" />
          <el-icon-plus v-else />
        </el-icon>
        <div v-if="type === 'image' || type === 'video'" class="upload-dashed-text">
          上传{{ type === 'image' ? '图片' : '视频' }}
        </div>
      </div>
    </div>
  </div>

  <el-dialog v-model="dialogVisible" append-to-body width="560px" class="material-preview-dialog">
    <div class="preview-container">
      <span class="preview-nav left" v-if="!isSingle && (previewIndex ?? 0) > 0" @click="prevPreview">
        <el-icon><el-icon-back /></el-icon>
      </span>
      <span class="preview-nav right" v-if="!isSingle && (previewIndex ?? 0) < urls.length - 1" @click="nextPreview">
        <el-icon><el-icon-right /></el-icon>
      </span>
      <video v-if="dialogVisible && type == 'video'" controls
        style="width: 100%; max-height: 360px" :src="currentPreviewUrl" :key="currentPreviewUrl" />
      <img v-else :src="currentPreviewUrl" style="width: 100%; height: 100%" />
    </div>
  </el-dialog>

  <el-dialog
    v-model="listDialogVisible"
    append-to-body
    top="5px"
    width="min(1280px, calc(100vw - 32px))"
    class="material-list-selector-dialog"
  >
    <template #header>
      {{ $t("commons.material") }}
      <span>(已选{{ urlsSelect.length }}/{{ num }})</span></template>
    <!--使用素材页面组件（几何交给下方 .material-list-selector-dialog 样式块统一管，
        这里不再挂内联 padding/margin —— 内联优先级最高，会架空那套布局）-->
    <material-page v-model:value="urlsSelect" :checkMaterial="true"
      :selectType="typeVal" :num="num" :imgLimit="imgLimit" />
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="listDialogVisible = false">{{
          $t("commons.cancel")
          }}</el-button>
        <el-button type="primary" @click="sureUrls">选择</el-button>
      </span>
    </template>
  </el-dialog>
</template>
<script lang="ts">
import MaterialPage from "@/views/mall/material/index.vue";
import { PictureFilled } from "@element-plus/icons-vue";
import { cloneDeep } from "@pureadmin/utils";
import {
  computed,
  getCurrentInstance,
  onBeforeUnmount,
  reactive,
  ref,
  toRefs,
  watch,
  type PropType,
} from "vue";
import type { UploadImgLimit } from "./upload-guard";
import { appConfirm } from "@/components/overlay";
import { useLiftAboveHost } from "./lift-z";
export default {
  name: "MaterialList",
  components: {
    MaterialPage,
    PictureFilled,
  },
  props: {
    /**
     * 多选图片时用这个value
     */
    value: {
      type: Array as any,
      default() {
        return [];
      },
    },
    /**
     * 单选一张图用这个singleValue
     */
    singleValue: {
      type: String,
      default() {
        return "";
      },
    },
    /**
     * 无实际选中值时用于展示和预览的兜底素材，不参与素材弹窗的已选数量。
     */
    fallbackValue: {
      type: String,
      default: "",
    },
    /**
     * 是否单选一张图
     */
    isSingle: {
      type: Boolean,
      default() {
        return false;
      },
    },
    /**
     * 文件类型: image 或者 video
     */
    type: {
      type: String,
    },
    divStyle: {
      type: String,
    },
    num: {
      type: Number,
      default() {
        return 5;
      },
    },
    width: {
      type: [Number, String],
      default() {
        return 110;
      },
    },
    height: {
      type: [Number, String],
      default() {
        return 110;
      },
    },
    disabled: {
      type: Boolean,
      default() {
        return false;
      },
    },
    showBorder: {
      type: Boolean,
      default() {
        return true;
      },
    },
    /**
     * 图片上传约束 { kb, types, minW, minH }（可选），透传给素材页的上传前置校验。
     * 不传 = 历史行为（website.limitUploadImageSize），存量调用方零影响。
     */
    imgLimit: {
      type: Object as PropType<UploadImgLimit>,
      default: null,
    },
  },
  emits: ["sureSuccess", "deleteMaterial", "update:value", "update:singleValue"],

  setup(props, context) {
    const rootStyle = computed(() => props.divStyle ? props.divStyle : '')
    const mediaBoxStyle = computed(() =>
      props.divStyle
        ? props.divStyle
        : `width: ${props.width}px;height: ${props.height}px`,
    )
    const { proxy } = getCurrentInstance();
    // 本组件常被放进自绘的 fixed 遮罩弹窗（品牌、商城设置等），打开素材库、预览、删除确认前
    // 先把 EP 层级计数器推到宿主遮罩之上，否则这些弹窗开在遮罩下面点不到（见 lift-z.ts）。
    const rootRef = ref<HTMLElement | null>(null);
    const { liftAbove } = useLiftAboveHost();
    const data = reactive({
      typeVal: "",
      dialogVisible: false,
      url: undefined,
      // 当前预览索引；单选时固定为 0
      previewIndex: null as number | null,
      // 当前预览的地址
      currentPreviewUrl: undefined as string | undefined,
      // 是否已绑定键盘事件
      keyListenerAdded: false,
      listDialogVisible: false,
      materialgroupList: [],
      materialgroupObjId: "",
      materialgroupObj: {},
      materialgroupLoading: false,
      tableData: [],
      page: {
        total: 0,
        currentPage: 1,
        pageSize: 12,
        ascs: "",
        descs: "create_time",
      },
      tableLoading: false,
      groupId: null,
      urls: props.isSingle
        ? props.singleValue
          ? [props.singleValue]
          : []
        : props.value,
      urlsSelect: [], // 选中的图片
      // 拖拽中元素的索引；未拖拽时为 null
      dragIndex: null as number | null,
      // 当前拖拽悬停目标索引
      dragOverIndex: null as number | null,
    });
    const visibleUrls = computed(() =>
      data.urls.length > 0
        ? data.urls
        : props.fallbackValue
          ? [props.fallbackValue]
          : [],
    )

    // 根据type设置typeVal
    if (props.type == "image") {
      data.typeVal = "1";
    } else if (props.type == "video") {
      data.typeVal = "2";
    }
    watch(
      () => props.type,
      (val, oldVal) => {
        if (val != oldVal) {
          if (val == "image") {
            data.typeVal = "1";
          } else if (val == "video") {
            data.typeVal = "2";
          }
        }
      },
    );
    if (props.isSingle) {
      watch(
        () => props.singleValue,
        (val, oldVal) => {
          if (val != oldVal) {
            data.urls = props.singleValue ? [props.singleValue] : [];
          }
        },
      );
    }
    watch(
      () => props.value,
      (val, oldVal) => {
        if (val != oldVal) {
          data.urls = val || [];
        }
      },
    );

    /**
     * 分页页码变化
     * @param currentPage 当前页码
     */
    function currentChange(currentPage: number) {
      data.page.currentPage = currentPage;
    }

    /**
     * 移动素材位置（上下按钮）
     * @param index 当前索引
     * @param type 移动方向：'up' | 'down'
     */
    function moveMaterial(index: number, type: "up" | "down") {
      if (type == "up") {
        const tempOption = data.urls[index - 1];
        data.urls.splice(index - 1, 1, data.urls[index]);
        data.urls.splice(index, 1, tempOption as any);
      }

      if (type == "down") {
        const tempOption = data.urls[index + 1];
        data.urls.splice(index + 1, 1, data.urls[index]);
        data.urls.splice(index, 1, tempOption as any);
      }
      if (!props.isSingle) {
        context.emit("update:value", data.urls);
      }
    }
    // 预览
    function zoomMaterial(index: number) {
      liftAbove(rootRef.value);
      data.dialogVisible = true;
      if (props.isSingle) {
        data.previewIndex = 0;
        data.currentPreviewUrl = (props.singleValue || visibleUrls.value[index]) as any;
      } else {
        data.previewIndex = index;
        data.currentPreviewUrl = visibleUrls.value[index] as any;
      }
    }
    /**
     * 删除素材
     * @param index 当前索引
     */
    function deleteMaterial(index: number) {
      liftAbove(rootRef.value);
      appConfirm({
        intent: "delete",
        // 标题即「动词 + 宾语?」，不要泛化的「提示」+ 单独正文（app-confirm 规范）
        title: props.type === "video" ? "删除该视频？" : "删除该图片？",
        verb: "删除",
      }).then(function () {
        data.urls.splice(index, 1);
        if (props.isSingle) {
          context.emit(
            "update:singleValue",
            data.urls?.length > 0 ? data.urls[0] : "",
          );
        } else {
          context.emit("update:value", data.urls);
        }
        context.emit("deleteMaterial", data.urls);
        context.emit("sureSuccess", data.urls);
      });
    }

    function toSeleteMaterial() {
      liftAbove(rootRef.value);
      data.urlsSelect = cloneDeep(data.urls);
      data.listDialogVisible = true;
    }

    function sureUrls() {
      if (data.urlsSelect.length > props.num) {
        proxy.$message.error("只能选择" + props.num + "张图片");
        return;
      }
      // 复制一份再回写：不与素材选择页共用同一个数组（否则选择页里点一下就直接改到表单值）
      data.urls = [...data.urlsSelect] as any;
      // 判断图片数量是否超过选中的数量
      data.urlsSelect = [];
      if (props.isSingle) {
        context.emit(
          "update:singleValue",
          data.urls?.length > 0 ? data.urls[0] : "",
        );
      } else {
        context.emit("update:value", data.urls);
      }
      context.emit("sureSuccess", data.urls);
      data.listDialogVisible = false;
      // 同步更新预览地址
      if (!props.isSingle && data.previewIndex != null) {
        data.currentPreviewUrl = data.urls[data.previewIndex] as any;
      }
    }

    /**
     * 将数组元素从 fromIndex 移动到 toIndex
     * 输入：fromIndex、toIndex；输出：更新后的 urls 数组；副作用：触发父组件 v-model 更新
     * 示例：reorderUrls(0, 2) 会把第 1 项移到第 3 项
     */
    function reorderUrls(fromIndex: number, toIndex: number) {
      if (
        fromIndex === toIndex ||
        fromIndex == null ||
        toIndex == null ||
        props.isSingle
      ) {
        return;
      }
      const moved = data.urls.splice(fromIndex, 1)[0] as any;
      data.urls.splice(toIndex, 0, moved);
      context.emit("update:value", data.urls);
    }
    /**
     * 拖拽开始
     * @param index 开始拖拽的元素索引
     */
    function onDragStart(index: number, e: DragEvent) {
      if (props.disabled || props.isSingle) return;
      data.dragIndex = index;
      if (e?.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
      }
    }
    /**
     * 拖拽释放（放下）
     * @param toIndex 目标索引
     */
    function onDrop(toIndex: number, e: DragEvent) {
      if (props.disabled || props.isSingle) return;
      e?.preventDefault?.();
      if (data.dragIndex == null) return;
      reorderUrls(data.dragIndex, toIndex);
      data.dragIndex = null;
      data.dragOverIndex = null;
      // 如果预览打开且涉及当前预览项，更新预览索引与地址
      if (data.dialogVisible && data.previewIndex != null) {
        data.currentPreviewUrl = data.urls[data.previewIndex] as any;
      }
    }
    /**
     * 拖拽结束（无论成功与否）
     */
    function onDragEnd(e: DragEvent) {
      data.dragIndex = null;
      data.dragOverIndex = null;
    }
    function onDragOver(index: number, e: DragEvent) {
      if (props.disabled || props.isSingle) return;
      data.dragOverIndex = index;
      if (e?.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }
    }
    /**
     * 预览上一项
     */
    function prevPreview() {
      if (props.isSingle) return;
      if (data.previewIndex == null || data.previewIndex <= 0) return;
      data.previewIndex = data.previewIndex - 1;
      data.currentPreviewUrl = data.urls[data.previewIndex] as any;
    }
    /**
     * 预览下一项
     */
    function nextPreview() {
      if (props.isSingle) return;
      if (
        data.previewIndex == null ||
        data.previewIndex >= data.urls.length - 1
      )
        return;
      data.previewIndex = data.previewIndex + 1;
      data.currentPreviewUrl = data.urls[data.previewIndex] as any;
    }
    // 键盘左右键切换
    function handleKeydown(e: KeyboardEvent) {
      if (!data.dialogVisible || props.isSingle) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevPreview();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nextPreview();
      }
    }
    watch(
      () => data.dialogVisible,
      (val) => {
        if (val && !data.keyListenerAdded) {
          window.addEventListener("keydown", handleKeydown);
          data.keyListenerAdded = true;
        } else if (!val && data.keyListenerAdded) {
          window.removeEventListener("keydown", handleKeydown);
          data.keyListenerAdded = false;
        }
      },
    );
    onBeforeUnmount(() => {
      if (data.keyListenerAdded) {
        window.removeEventListener("keydown", handleKeydown);
        data.keyListenerAdded = false;
      }
    });

    return {
      rootRef,
      rootStyle,
      mediaBoxStyle,
      visibleUrls,
      ...toRefs(data),
      currentChange,
      moveMaterial,
      zoomMaterial,
      deleteMaterial,
      toSeleteMaterial,
      sureUrls,
      reorderUrls,
      onDragStart,
      onDragOver,
      onDrop,
      onDragEnd,
      prevPreview,
      nextPreview,
      handleKeydown,
    };
  },
};
</script>
<style lang="scss" scoped>
/* 小尺寸上传框（如 50×50 图标位）放不下"图标+文字"，只留缩小的图标 */
@container (width <= 64px) or (height <= 56px) {
  .upload-dashed-text {
    display: none;
  }

  .upload-dashed-icon-image {
    width: 24px;
  }
}

:deep(.el-upload-list__item) {
  margin-bottom: 0 !important;
}

:deep(.el-upload-list--picture-card) {
  padding-top: 0 !important;
}

.preview-container {
  position: relative;
}

.preview-nav {
  position: absolute;
  top: 50%;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  font-size: 22px;
  color: #fff;
  cursor: pointer;
  background: rgb(0 0 0 / 40%);
  border-radius: 50%;
  transform: translateY(-50%);
}

.preview-nav.left {
  right: calc(100% + 26px);
}

.preview-nav.right {
  left: calc(100% + 26px);
}

.is-ready {
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.dragging {
  box-shadow: 0 6px 18px rgb(0 0 0 / 25%);
  opacity: 0.85;
  transform: scale(0.96);
}

.drag-over {
  box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
  transform: scale(1.02);
}

.add-group {
  position: absolute;
  right: 20px;
  z-index: 10;
  display: flex;
  margin-right: 15px;
  line-height: 35px;
}

.material-name {
  display: -webkit-box;
  height: 20px;
  padding: 0 5px;
  margin-top: 10px;
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.compile {
  padding-top: 5px;
}

.col-do {
  text-align: center;
}

.button-do {
  padding: unset !important;
  font-size: 14px;
}

.upload-dashed-content {
  line-height: normal;
  color: var(--text-secondary, #3f4a59);
  text-align: center;
}

.upload-dashed-icon-image {
  width: 32px;
  height: 32px;
  color: var(--dc-text-3, #8a93a3);
}

/* 默认态：虚线框，悬停转主色 */
.upload-dashed {
  container-type: size;
  overflow: hidden;
  background: var(--zf-bg-gray, #fafbfa);
  border: 1.5px dashed var(--zf-border, #c9d4cc);
  border-radius: 8px;
  transition: border-color 0.25s, color 0.25s;
}

.upload-dashed:hover {
  border-color: var(--zf-green, #3C6EF0);
}

.upload-dashed:hover .upload-dashed-content {
  color: var(--dc-brand);
}

.upload-dashed-text {
  font-size: 14px;
}
</style>

<style lang="scss">
.material-preview-dialog {
  overflow: var(--preview-dialog-overflow, visible) !important;
}

/* ============================================================
   素材选择大弹窗的版式（弹窗形态专属，整页 /mall/material 不受影响）

   改前两个毛病：
   1. 分页看不见 —— 全局 `src/style/overlay.scss:182` 给所有 `.el-dialog__body`
      钉了 `max-height:80vh; overflow:auto`，弹窗 body 自己是滚动容器；而分页
      `ProPagination`（views/mall/material/index.vue 末尾）挂在内容流最后，跟卡片
      网格一起滚。12 条 / 6 列 → 两行卡片就超出 80vh，最后一行被 body 底边拦腰
      截断，分页落在截断处下方，要继续滚才出现。
   2. 顶部空白 —— 弹窗标题到分组名之间有五层内边距串联：body 20 + material-page
      内联 padding-top 5 + 「所属素材库」行的 el-form-item 默认 margin-bottom 18
      + el-tabs(border-card) content 15 + el-card body 20。

   修法：整条链改成 flex 列，滚动**下沉**到卡片网格那一层，分页作为兄弟节点留在
   滚动区外，天然固定；同时逐层收掉重复内边距。

   ⚠️ 为什么不用 `position:sticky` 做分页：sticky 会相对最近的滚动祖先定位，而
   `.el-card` 带 EP 默认的 `overflow:hidden`（本身就构成 scrollport 但不滚动），
   sticky 会停在卡片内容底部而不是可视区底部，等于没做。

   ⚠️ 为什么不改全局那条 80vh：它是 146 个 avue 弹窗共用的基线，波及面过大。
   这里靠 `.material-list-selector-dialog`（0,2,0 起步，压过它的 0,1,0）只在本弹
   窗内覆盖。padding 那条源规则带 `!important`，所以本块对应的几行也必须带。

   ⚠️ 每一层都要 `min-height:0`：flex 子项默认 `min-height:auto`，不写就撑破容器，
   滚动条会跑到最外层，分页照样滚出去。
   ============================================================ */
.material-list-selector-dialog.el-dialog {
  /* 弹窗本体吃满 top=5px 之下的可用高度，底部同样留 5px */
  display: flex;
  flex-direction: column;
  height: calc(100vh - 10px);
  margin-bottom: 5px;

  .el-dialog__header,
  .el-dialog__footer {
    flex: none;
  }

  /* body 自己不再滚（改由内部网格区滚），并让出顶部空白 */
  .el-dialog__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    max-height: none;
    padding: 4px 16px 0 !important;
    overflow: hidden;
  }

  /* ---- material-page 内部逐层撑满 ---- */

  .goods-dc-page {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  /* 「所属素材库」行：弹窗里只剩「商城素材」一个单选，占位压到最小。
     整页形态给这行留了 8/12 的上下外边距（离顶栏、离 tabs），弹窗高度吃紧、
     标题栏本来就有留白，这里收掉。 */
  .goods-dc-page > .flex {
    flex: none;
    margin: 0;

    .el-form-item {
      margin-bottom: 0;
    }
  }

  .el-tabs {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .el-tabs__header {
    flex: none;
  }

  .el-tabs__content {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 8px 0 0;
  }

  /* 图片/视频两个 el-tab-pane 是空壳（只提供 label，真正内容是它们的兄弟
     el-row.material-content），空壳仍会渲染进 content 占位，收掉 */
  .el-tab-pane:empty {
    display: none;
  }

  .material-content {
    flex: 1;
    min-height: 0;
  }

  .material-content > .el-col {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  /* 左侧分组栏：整页态是死高 600px，弹窗里跟着弹窗高度走 */
  .group-sidebar-col {
    max-height: none;
  }

  .material-card-content.el-card {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .material-card-content > .el-card__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 0 20px;
  }

  .filter-bar {
    flex: none;
  }

  /* ---- 核心：网格区滚动，分页留在滚动区外 ---- */

  .material-grid-wrap {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .material-grid-wrap > .el-alert {
    flex: none;
  }

  .material-grid-wrap > .el-row {
    flex: 1;
    align-content: flex-start;
    min-height: 0;
    padding-right: 4px; /* 给滚动条留位，避免压住卡片右边 */
    overflow-y: auto;
  }

  .material-grid-wrap > .pro-pagination {
    flex: none;
    padding: 10px 0 6px;
    background: #fafafa; /* 与 .material-card-content 底色一致，滚动内容不透出 */
    border-top: 1px solid #ececec;
  }
}
</style>
