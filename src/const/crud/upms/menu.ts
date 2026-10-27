/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useI18n } from "@/locales/setupI18n";
import { DIALOG_W } from "@/const/crud/dialog-width";

const { $t } = useI18n();

export const tableOption = {
  dialogWidth: DIALOG_W.l,
  dialogDrag: true,
  headerAlign: "center",
  align: "center",
  border: true,
  viewBtn: true,
  labelPosition: "left",
  column: [
    {
      label: $t("upms.menu.parentId"),
      prop: "parentId",
      type: "tree",
      hide: true,
      span: 12,
      checkStrictly: true,
      props: {
        label: "name",
        value: "id",
      },
      rules: [
        {
          required: true,
          message: $t("upms.menu.parentId") + $t("commons.notNull"),
          trigger: "change",
        },
      ],
    },
    {
      label: $t("upms.menu.name"),
      prop: "name",
      align: "left",
      width: 260,
      offset: 1,
      span: 12,
      rules: [
        {
          required: true,
          message: $t("upms.menu.name") + $t("commons.notNull"),
          trigger: "blur",
        },
      ],
    },
    {
      label: $t("commons.type"),
      prop: "type",
      type: "select",
      span: 12,
      width: 100,
      value: "0",
      rules: [
        {
          required: true,
          message: $t("upms.menu.type") + $t("commons.notNull"),
          trigger: "blur",
        },
      ],
      dicData: [
        {
          label: $t("upms.menu.menu"),
          value: "0",
        },
        {
          label: $t("upms.menu.button"),
          value: "1",
        },
      ],
      control: (val, form) => {
        // 如果是菜单类型才能设置缓存
        if (form.type === "0") {
          return {
            keepAlive: {
              display: true,
            },
            path: {
              display: true,
              rules: [
                {
                  required: true,
                  message: $t("commons.notNull"),
                  trigger: "blur",
                },
              ],
            },
            component: {
              display: true,
              rules: [
                {
                  required: true,
                  message: $t("commons.notNull"),
                  trigger: "blur",
                },
              ],
            },
          };
        } else {
          return {
            keepAlive: {
              display: false,
            },
            path: {
              display: false,
            },
            component: {
              display: false,
            },
          };
        }
      },
    },
    {
      label: $t("upms.menu.permission"),
      offset: 1,
      span: 12,
      labelWidth: 100,
      labelTip: $t("upms.menu.buttonPermissionControl"),
      prop: "permission",
    },
    {
      label: $t("upms.menu.sort"),
      type: "number",
      width: 100,
      span: 12,
      prop: "sort",
      rules: [
        {
          required: true,
          message: $t("upms.menu.sort") + $t("commons.notNull"),
          trigger: "blur",
        },
      ],
    },
    {
      label: $t("upms.menu.icon"),
      width: 100,
      offset: 1,
      span: 12,
      prop: "icon",
    },
    {
      label: $t("upms.menu.component"),
      prop: "component",
      labelTip: $t("upms.menu.componentTip"),
      span: 12,
      tips: "Component",
    },
    {
      label: $t("upms.menu.path"),
      offset: 1,
      span: 12,
      prop: "path",
      tips: "Path",
    },
    {
      label: $t("upms.menu.keepAlive"),
      prop: "keepAlive",
      type: "radio",
      display: false,
      hide: true,
      span: 12,
      labelWidth: 120,
      value: "1",
      dicData: [
        {
          label: $t("upms.menu.cache"),
          value: "0",
        },
        {
          label: $t("upms.menu.noCache"),
          value: "1",
        },
      ],
    },
    {
      label: "是否启用",
      prop: "delFlag",
      type: "radio",
      span: 12,
      offset: 1,
      value: "0",
      dicData: [
        {
          label: "启用",
          value: "0",
        },
        {
          label: "禁用",
          value: "1",
        },
      ],
    },
    {
      label: $t("commons.createTime"),
      prop: "createTime",
      hide: true,
      editDisplay: false,
      addDisplay: false,
    },
    {
      label: $t("upms.menu.updateTime"),
      prop: "updateTime",
      hide: true,
      editDisplay: false,
      addDisplay: false,
    },
  ],
};
