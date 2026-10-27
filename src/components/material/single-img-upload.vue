<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
  <div class="material-single" :style="sizeVars">
    <el-upload
      v-if="!value"
      class="image-uploader"
      :action="actionUrl"
      :headers="headers"
      :limit="1"
      :on-success="uploadSuccess"
      :before-upload="beforeUpload"
    >
      <el-icon class="image-uploader-icon">
        <Plus />
      </el-icon>
    </el-upload>
    <div
      v-else
      class="material-single__preview el-upload-list el-upload-list--picture-card"
    >
      <div>
        <img class="el-upload-list__item-thumbnail" :src="value" alt="" />
        <span class="el-upload-list__item-actions">
          <span class="el-upload-list__item-preview" @click="handlePreview">
            <el-icon><zoom-in /></el-icon>
          </span>
          <span class="el-upload-list__item-delete" @click="handleRemove">
            <el-icon>
              <Delete />
            </el-icon>
          </span>
        </span>
      </div>
    </div>
    <el-dialog v-model="dialogVisible" append-to-body width="800px">
      <div
        v-if="value"
        style="display: flex; justify-content: center; text-align: center"
      >
        <img w-full :src="value" />
      </div>
    </el-dialog>
  </div>
</template>
<script lang="ts">
// 单图上传,不走素材库组件
import { computed, getCurrentInstance, onMounted, reactive, toRefs } from "vue";
import { getToken } from "@/utils/auth";
import website from "@/config/website";

export default {
  name: "MaterialSingle",
  props: {
    value: {
      type: String,
    },
    width: {
      type: [Number, String],
      default: 158,
    },
    height: {
      type: [Number, String],
      default: 128,
    },
    /**
     * @description 图片最大大小
     */
    fileSize: {
      type: Number,
      default: website.limitUploadImageSize,
    },
    actionUrl: {
      type: String,
      required: true,
    },
    needToken: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  setup(props, context) {
    const { proxy } = getCurrentInstance();
    const data = reactive({
      dialogVisible: false,
      headers: {
        Authorization: "",
      },
    });

    const sizeVars = computed(() => {
      const toCssSize = (val) => {
        if (typeof val === "number") return `${val}px`;
        if (typeof val === "string" && val.trim()) return val.trim();
        return "";
      };
      return {
        "--material-single-width": toCssSize(props.width),
        "--material-single-height": toCssSize(props.height),
      };
    });

    onMounted(() => {
      if (props.needToken) {
        if (getToken() && getToken().access_token) {
          data.headers.Authorization = "Bearer " + getToken().access_token;
        }
      }
    });

    function uploadSuccess(response) {
      context.emit("update:value", response.link);
    }

    const beforeUpload = (rawFile) => {
      if (rawFile.size / 1024 / 1024 > props.fileSize) {
        proxy.$message.error(
          `${proxy.$t("commons.notOut")}${props.fileSize}MB!`,
        );
        return false;
      }
      return true;
    };

    const handleRemove = () => {
      context.emit("update:value", "");
    };
    const handlePreview = () => {
      data.dialogVisible = true;
    };
    return {
      ...toRefs(data),
      sizeVars,
      uploadSuccess,
      beforeUpload,
      handleRemove,
      handlePreview,
    };
  },
};
</script>

<style lang="scss" scoped>
.material-single__preview {
  width: var(--material-single-width);
  height: var(--material-single-height);
  margin: 0;
}

.material-single__preview > div {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 6px;
}

.material-single__preview .el-upload-list__item-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>

<style>
.material-single .image-uploader .el-upload {
  position: relative;
  width: var(--material-single-width);
  height: var(--material-single-height);
  overflow: hidden;
  cursor: pointer;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  transition: var(--el-transition-duration-fast);
}

.material-single .image-uploader .el-upload:hover {
  border-color: var(--el-color-primary);
}

.material-single .el-icon.image-uploader-icon {
  width: var(--material-single-width);
  height: var(--material-single-height);
  font-size: 28px;
  color: var(--dc-text-3);
  text-align: center;
}
</style>
