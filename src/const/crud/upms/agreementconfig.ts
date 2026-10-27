import { DIALOG_W } from '@/const/crud/dialog-width';
import { useI18n } from '@/locales/setupI18n'

const { $t } = useI18n()
// 系统管理
export const tableOption = {
  dialogWidth: DIALOG_W.m,
  span: 24,
  dialogDrag: true,
  border: true,
  stripe: true,
  menuAlign: 'center',
  align: 'center',
  menuType: 'text',
  searchShow: false,
  excelBtn: true,
  printBtn: false,
  viewBtn: true,
  addBtn: true,
  searchMenuSpan: 6,
  menuWidth: 330,
  labelWidth: 110,
  column: [
    {
      label: $t('upms.agreementconfig.agreementType'),
      prop: 'agreementType',
      type: 'select',
      sortable: true,
      editDisabled: true,
      props: {
        label: 'label',
        value: 'value',
        desc: 'desc',
      },
      rules: [
        {
          required: true,
          message: $t('commons.inputPlease') + $t('upms.agreementconfig.agreementType'),
          trigger: 'blur',
        },
        {
          max: 2,
          message: $t('commons.lengthTips', { length: 2 }),
        },
      ],
      dicUrl: '/upms/dict/type/agreement_type',
    },
    {
      label: $t('upms.agreementconfig.agreementName'),
      prop: 'agreementName',
      sortable: true,
      rules: [
        {
          required: true,
          message: $t('commons.inputPlease') + $t('upms.agreementconfig.agreementName'),
          trigger: 'blur',
        },
        {
          max: 100,
          message: $t('commons.lengthTips', { length: 100 }),
        },
      ],
    },
    {
      label: $t('upms.agreementconfig.agreementContent'),
      prop: 'agreementContent',
      span: 24,
      hide: true,
      rules: [
        {
          max: 65535,
          message: $t('commons.lengthTips', { length: 65535 }),
        },
      ],
    },
  ],
}
