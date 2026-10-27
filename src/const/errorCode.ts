import { useI18n } from '@/locales/setupI18n'

const { $t } = useI18n()
export default {
  '000': $t('commons.operationTooFrequent'),
  '401': $t('commons.loginExpired'),
  '403': $t('commons.noPermission'),
  '404': $t('commons.resourceNotFound'),
  '417': $t('commons.unboundAccount'),
  '426': $t('commons.incorrectUsernameOrPassword'),
  '428': $t('commons.incorrectVerificationCode'),
  '429': $t('commons.requestTooFrequent'),
  '503': $t('commons.serviceUnavailable'),
  '500': $t('commons.serverError'),
  default: $t('commons.unknownError'),
}
