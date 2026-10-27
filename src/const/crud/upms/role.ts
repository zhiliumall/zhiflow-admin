/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useI18n } from "@/locales/setupI18n";
const { $t } = useI18n();
//系统页面
export const tableOption = {
  dialogDrag: true,
  dialogWidth: 520,
  dialogClickModal: false,
  dialogCustomClass: "dc-form-dialog",
  submitText: "保存",
  border: true,
  index: true,
  indexLabel: $t("commons.indexLabel"),
  indexWidth: 80,
  stripe: true,
  menuAlign: "center",
  align: "center",
  editBtn: false,
  delBtn: false,
  viewBtn: true,
  excelBtn: true,
  printBtn: false,
  menuType: "text",
  labelWidth: 130,
  labelPosition: "top",
  searchMenuSpan: 6,
  column: [
    {
      label: $t("upms.role.roleName"),
      prop: "roleName",
      span: 24,
      rules: [
        {
          required: true,
          message: $t("upms.role.roleName") + $t("commons.notNull"),
          trigger: "blur",
        },
        {
          min: 2,
          max: 20,
          message: $t("commons.lengthRangeTip", { min: 2, max: 20 }),
          trigger: "blur",
        },
      ],
    },
    {
      label: $t("upms.role.roleCode"),
      prop: "roleCode",
      span: 24,
      rules: [
        {
          required: true,
          message: $t("upms.role.roleCode") + $t("commons.notNull"),
          trigger: "blur",
        },
        {
          max: 20,
          message: $t("commons.lengthTips", { length: 20 }),
          trigger: "blur",
        },
      ],
    },
    {
      label: $t("upms.role.roleDesc"),
      prop: "roleDesc",
      overHidden: true,
      span: 24,
      rules: [
        {
          required: true,
          message: $t("upms.role.roleDesc") + $t("commons.notNull"),
          trigger: "blur",
        },
      ],
    },
    {
      label: $t("commons.createTime"),
      prop: "createTime",
      type: "datetime",
      format: "YYYY-MM-DD HH:mm",
      valueFormat: "YYYY-MM-DD HH:mm:ss",
      editDisplay: false,
      addDisplay: false,
      sortable: true,
      span: 24,
    },
  ],
};
