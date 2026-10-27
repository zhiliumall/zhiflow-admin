import { useI18n } from "@/locales/setupI18n";

const { $t } = useI18n();

/**
 * 商品编辑表单（avue-form 分组 = 向导步骤）。
 * 列表页是自绘表格，不读这里的列配置；新建 / 编辑抽屉与只读详情抽屉共用 group。
 */
export const tableOption = {
  tabs: true,
  tabsActive: 1,
  labelWidth: 110,
  labelPosition: "left",
  menuPosition: "center",
  submitText: "保存",
  emptyText: "取消",
  group: [
    // 基本信息
    {
      label: $t("commons.baseInfo"),
      prop: "group11",
      arrow: false,
      column: [
        {
          label: $t("mall.goodsspu.name"),
          prop: "name",
          labelWidth: 140,
          span: 24,
          rules: [
            {
              required: true,
              message: $t("mall.goodsspu.name") + $t("commons.notNull"),
              trigger: "blur",
            },
            {
              max: 100,
              message: $t("commons.lengthTips", { length: 100 }),
            },
          ],
        },
        {
          label: $t("mall.goodsspu.sellPoint"),
          prop: "sellPoint",
          labelWidth: 140,
          span: 24,
          type: "textarea",
          minRows: 2,
          maxRows: 5,
          maxlength: 500,
          showWordLimit: true,
          rules: [
            {
              max: 500,
              message: $t("commons.lengthTips", { length: 500 }),
            },
          ],
        },
        {
          label: $t("mall.goodsspu.picUrls"),
          prop: "picUrls",
          labelWidth: 140,
          span: 24,
          slot: true,
          listType: "picture-card",
          type: "upload",
          labelTip: $t("mall.goodsspu.picUrlsFirstTip"),
          rules: [
            {
              required: true,
              message: $t("mall.goodsspu.picUrls") + $t("commons.notNull"),
              trigger: "blur",
            },
          ],
        },
        {
          label: $t("mall.goodsspu.videoUrl"),
          type: "video",
          prop: "videoUrl",
          dataType: "string",
          slot: true,
          labelWidth: 140,
          span: 24,
          labelTip: $t("mall.goodsspu.videoUrlTip"),
        },
        {
          label: $t("mall.goodsspu.categoryId"),
          prop: "categoryId",
          type: "cascader",
          labelWidth: 140,
          span: 12,
          filterable: true,
          checkStrictly: true,
          props: {
            label: "name",
            value: "id",
          },
          dicUrl: "/mall/goodscategory/tree",
          rules: [
            {
              required: true,
              message: $t("mall.goodsspu.categoryId") + $t("commons.notNull"),
              trigger: "blur",
            },
          ],
        },
        {
          label: $t("mall.goodsspu.brandId"),
          prop: "brandId",
          labelWidth: 140,
          labelPosition: "right",
          span: 12,
          formslot: true,
        },
        {
          label: $t("mall.goodsspu.spuCode"),
          prop: "spuCode",
          labelWidth: 140,
          span: 12,
          labelTip: $t("mall.goodsspu.saleNumTip2"),
          rules: [
            {
              required: true,
              message: $t("mall.goodsspu.spuCode") + $t("commons.notNull"),
              trigger: "blur",
            },
            {
              max: 32,
              message: $t("commons.lengthTips", { length: 32 }),
            },
          ],
        },
        {
          label: $t("mall.goodsspu.saleNum"),
          prop: "saleNum",
          labelWidth: 140,
          labelPosition: "right",
          span: 12,
          type: "number",
          min: 0,
          labelTip: $t("mall.goodsspu.saleNumTip"),
        },
        {
          label: $t("mall.goodsspu.stockWarnLine"),
          prop: "stockWarnLine",
          labelWidth: 140,
          span: 12,
          type: "number",
          min: 0,
          labelTip: $t("mall.goodsspu.stockWarnLineTip"),
        },
        {
          label: $t("mall.goodsspu.shelf"),
          prop: "shelf",
          type: "radio",
          labelWidth: 140,
          labelPosition: "right",
          span: 12,
          value: "1",
          rules: [
            {
              required: true,
              message: $t("mall.goodsspu.shelf") + $t("commons.notNull"),
              trigger: "blur",
            },
          ],
          dicData: [
            {
              label: $t("mall.goodsspu.shelf1"),
              value: "1",
            },
            {
              label: $t("mall.goodsspu.shelf0"),
              value: "0",
            },
          ],
        },
      ],
    },
    // 规格
    {
      label: $t("mall.goodsspu.specInfo"),
      prop: "group21",
      column: [
        {
          label: "",
          prop: "specType",
          labelWidth: 50,
          type: "radio",
          value: "0",
          rules: [
            {
              required: true,
              message: $t("mall.goodsspu.specType") + $t("commons.notNull"),
              trigger: "blur",
            },
          ],
          dicData: [
            {
              label: $t("mall.goodsspu.specType0"),
              value: "0",
            },
            {
              label: $t("mall.goodsspu.specType1"),
              value: "1",
            },
          ],
        },
        {
          prop: "skus",
          formslot: true,
          span: 24,
        },
      ],
    },
    // 参数模版
    {
      label: $t("mall.goodsspu.tmp"),
      prop: "group91",
      column: [
        {
          label: $t("mall.goodsspu.selecttmp"),
          prop: "selecttmp",
          labelPosition: "right",
          span: 24,
        },
      ],
    },
    // 商品详情
    {
      label: $t("mall.goodsspu.description"),
      prop: "group51",
      column: [
        {
          label: $t("mall.goodsspu.description"),
          labelPosition: "top",
          prop: "description",
          formslot: true,
          span: 24,
        },
      ],
    },
  ],
};
