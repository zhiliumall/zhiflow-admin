/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useI18n } from "@/locales/setupI18n";

const { $t } = useI18n();

/**
 * 商品分类新增 / 编辑表单（avue-crud 只当表单宿主用，列表是自绘树）。
 * 图片字段：picUrl 分类图标、mobilePicUrl 移动端大图、mobileAdImageUrl 分类页顶部广告图，
 * 三者都是 H5 用户端在读的字段。
 */
export const tableOption = {
  dialogDrag: true,
  dialogType: "drawer",
  dialogWidth: 650,
  border: true,
  stripe: false,
  maxHeight: "calc(100vh - 340px)",
  menuAlign: "center",
  align: "center",
  menuType: "text",
  searchShow: false,
  addBtn: false,
  viewBtn: false,
  delBtn: false,
  menuWidth: 250,
  searchMenuSpan: 6,
  labelWidth: 120,
  searchLabelPosition: "right",
  labelPosition: "left",
  column: [
    {
      label: $t("mall.goodscategory.parentId"),
      prop: "parentId",
      type: "tree",
      span: 24,
      hide: true,
      width: 200,
      props: {
        label: "name",
        value: "id",
      },
      rules: [
        {
          required: true,
          message: $t("mall.goodscategory.parentId") + $t("commons.notNull"),
          trigger: "change",
        },
      ],
    },
    {
      label: $t("mall.goodscategory.name"),
      prop: "name",
      align: "left",
      span: 24,
      width: 150,
      rules: [
        {
          required: true,
          message: $t("mall.goodscategory.name") + $t("commons.notNull"),
          trigger: "blur",
        },
        {
          max: 16,
          message: $t("commons.lengthTips", { length: 16 }),
        },
      ],
    },
    {
      label: $t("mall.goodscategory.enable"),
      prop: "enable",
      type: "radio",
      sortable: true,
      span: 24,
      width: 100,
      slot: true,
      rules: [
        {
          required: true,
          message: $t("mall.goodscategory.enable") + $t("commons.notNull"),
          trigger: "blur",
        },
      ],
      dicData: [
        {
          label: $t("commons.close"),
          value: "0",
        },
        {
          label: $t("commons.open"),
          value: "1",
        },
      ],
    },
    {
      label: $t("mall.goodscategory.sort"),
      type: "number",
      prop: "sort",
      span: 24,
      rules: [
        {
          required: true,
          message: $t("mall.goodscategory.sort") + $t("commons.notNull"),
          trigger: "blur",
        },
      ],
    },
    {
      label: $t("mall.goodscategory.picUrl"),
      prop: "picUrl",
      width: 150,
      span: 24,
      dataType: "array",
      type: "img",
      align: "center",
      slot: true,
      formslot: true,
      rules: [
        {
          required: true,
          message: $t("commons.notNull"),
          trigger: "change",
        },
      ],
    },
    {
      label: $t("mall.goodscategory.mobilePicUrl"),
      prop: "mobilePicUrl",
      width: 120,
      span: 24,
      dataType: "array",
      type: "img",
      align: "center",
      slot: true,
      formslot: true,
    },
    {
      label: $t("mall.goodscategory.mobileAdImageUrl"),
      prop: "mobileAdImageUrl",
      width: 120,
      span: 24,
      dataType: "array",
      type: "img",
      align: "center",
      slot: true,
      formslot: true,
    },
    {
      label: $t("commons.createTime"),
      prop: "createTime",
      width: 200,
      editDisplay: false,
      addDisplay: false,
    },
    {
      label: $t("mall.goodscategory.updateTime"),
      prop: "updateTime",
      width: 200,
      editDisplay: false,
      addDisplay: false,
    },
  ],
};
