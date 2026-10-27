import { storageLocal } from '@pureadmin/utils'
import type { App } from 'vue'
import type { I18n, I18nOptions } from 'vue-i18n'
import { createI18n } from 'vue-i18n'

import { responsiveStorageNameSpace } from '@/config'
import { genMessage } from './util'

type LocaleCode = 'zh-CN'

/**
 * A number of route and page-builder configuration modules are evaluated
 * before the async i18n instance is installed on the app. Keep a synchronous
 * copy of the JSON messages available so those modules do not freeze raw
 * translation keys such as `mall.pagedevise.home` into their config objects.
 */
const earlyLocaleMessages: Record<LocaleCode, Record<string, any>> = {
  'zh-CN': genMessage(
    import.meta.glob('./lang/zh-CN/**/*.json', { eager: true }) as Record<
      string,
      Record<string, any>
    >,
    'lang/zh-CN'
  ),
}

/** 只提供简体中文 */
function normalizeLocale(_locale: string | undefined): LocaleCode {
  return 'zh-CN'
}

function getMessage(messages: Record<string, any>, key: string) {
  return key.split('.').reduce<any>((value, segment) => {
    if (value == null) return undefined
    return value[segment]
  }, messages)
}

function getStoredLocale() {
  const configuredNamespace = responsiveStorageNameSpace()
  const platformNamespace =
    typeof window !== 'undefined'
      ? (window as typeof window & { platformConfig?: PlatformConfigs }).platformConfig
          ?.ResponsiveStorageNameSpace
      : undefined
  const namespace = configuredNamespace || platformNamespace
  return storageLocal().getItem<StorageConfigs>(`${namespace ?? ''}locale`)?.locale
}

function translateBeforeInit(key: string): string {
  const locale = normalizeLocale(getStoredLocale())
  const value = getMessage(earlyLocaleMessages[locale], key)
  return typeof value === 'string' ? value : key
}

export let i18n: ReturnType<typeof createI18n>
// i18n lang data 当前的语言包
export let localesLangData = {}

// export async function setLocaleMessage(locale = 'zh-CN'){
//   const defaultLocal = await import('./lang/zh-CN');
//   const message = defaultLocal.default?.message ?? {};
//   i18n.global.setLocaleMessage(locale, message)
// }

async function createI18nOptions(): Promise<I18nOptions> {
  const storedLocale = getStoredLocale() ?? 'zh-CN'
  const locale = normalizeLocale(storedLocale)
  const defaultLocal = await import('./lang/zh-CN')
  const message = defaultLocal.default?.message ?? {}
  localesLangData = message
  return {
    legacy: false,
    locale: locale,
    fallbackLocale: 'zh',
    messages: {
      [locale]: message,
    },
    silentTranslationWarn: true, // true - warning off 控制台警告
    missingWarn: true,
    silentFallbackWarn: false,
    // fallbackWarn: false
  }
}

// setup i18n instance with glob
export async function setupI18n(app: App) {
  const options = await createI18nOptions()
  i18n = createI18n(options) as I18n
  app.use(i18n)
}

/**
 * Translate immediately when i18n is ready, otherwise use the synchronous
 * message snapshot above. The latter is required by static config modules
 * that are imported before `setupI18n` finishes.
 */
export const $t: I18nGlobalTranslation = (key: string, ...arg: any[]) => {
  if (!key) return ''
  if (i18n) {
    return (i18n.global.t as (arg0: string, ...args: any[]) => string)(
      key,
      ...arg
    )
  }
  return translateBeforeInit(key)
}
/*
  1. 通过useI18n获取i18n实例
  2. 通过$t获取翻译函数
 */
export function useI18n(namespace?: string): {
  $t: I18nGlobalTranslation
} {
  const normalFn = {
    $t: (key: string, ...arg: any[]) => {
      const normalizedKey = getKey(namespace, key)
      if (!normalizedKey) return ''
      if (!normalizedKey.includes('.') && !namespace) return normalizedKey
      if (i18n) {
        return (i18n.global.t as (arg0: string, ...args: any[]) => string)(
          normalizedKey,
          ...arg
        )
      }
      return translateBeforeInit(normalizedKey)
    }
  }

  if (!i18n) {
    return normalFn
  }

  const { t, ...methods } = i18n.global

  const tFn: I18nGlobalTranslation = (key: string, ...arg: any[]) => {
    if (!key) return ''
    if (!key.includes('.') && !namespace) return key

    return (
      t as (arg0: string, ...arg: I18nTranslationRestParameters) => string
    )(getKey(namespace, key), ...(arg as I18nTranslationRestParameters))
  }
  return {
    ...methods,
    $t: tFn
  }
}
function getKey(namespace: string | undefined, key: string) {
  if (!namespace) {
    return key
  }
  if (key.startsWith(namespace)) {
    return key
  }
  return `${namespace}.${key}`
}

type I18nGlobalTranslation = {
  (key: string): string
  (key: string, locale: string): string
  (key: string, locale: string, list: unknown[]): string
  (key: string, locale: string, named: Record<string, unknown>): string
  (key: string, list: unknown[]): string
  (key: string, named: Record<string, unknown>): string
}

type I18nTranslationRestParameters = [string, any]
