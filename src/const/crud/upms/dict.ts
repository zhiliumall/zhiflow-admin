/*
 * Copyright (C) 2025 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useI18n } from "@/locales/setupI18n";
import { DIALOG_W } from "@/const/crud/dialog-width";

const { $t } = useI18n();
export const tableOption = {
  dialogWidth: DIALOG_W.m,
  span: 24,
  dialogDrag: true,
  border: true,
  index: true,
  indexLabel: $t("commons.indexLabel"),
  stripe: true,
  menuAlign: "center",
  align: "center",
  showColumnBtn: false,
  viewBtn: true,
  menuType: "text",
  searchShow: false,
  searchMenuSpan: 12,
  labelWidth: 110,
  searchLabelPosition: "right",
  column: [
    {
      label: $t("commons.type"),
      prop: "type",
      search: true,
      searchSpan: 12,
      rules: [
        {
          required: true,
          message: $t("upms.dict.type") + $t("commons.notNull"),
          trigger: "blur",
        },
      ],
    },
    {
      label: $t("upms.dict.description"),
      prop: "description",
      rules: [
        {
          required: true,
          message: $t("upms.dict.description") + $t("commons.notNull"),
          trigger: "blur",
        },
      ],
    },
    {
      width: 150,
      label: $t("commons.createTime"),
      prop: "createTime",
      type: "datetime",
      addDisplay: false,
      editDisabled: true,
      sortable: true,
    },
  ],
};

export const tableOption2 = {
  dialogWidth: DIALOG_W.m,
  span: 24,
  border: true,
  stripe: true,
  menuAlign: "center",
  align: "center",
  refreshBtn: true,
  showColumnBtn: false,
  searchShow: false,
  maxHeight: 1400,
  column: [
    {
      label: $t("upms.dict.dataValue"),
      prop: "value",
      search: true,
      searchSpan: 18,
      rules: [
        {
          required: true,
          message: $t("upms.dict.enterDataValue"),
          trigger: "blur",
        },
      ],
    },
    {
      label: $t("upms.dict.tagName"),
      prop: "label",
      search: true,
      searchSpan: 18,
      rules: [
        {
          required: true,
          message: $t("upms.dict.enterTagName"),
          trigger: "blur",
        },
      ],
    },
    {
      label: "排序",
      prop: "sort",
      type: "number",
      rules: [
        {
          required: true,
          message: $t("upms.dict.enterSorting"),
          trigger: "blur",
        },
      ],
    },
    {
      label: $t("upms.dict.description"),
      prop: "description",
      rules: [
        {
          required: true,
          message: $t("upms.dict.description"),
          trigger: "blur",
        },
      ],
    },
  ],
};
