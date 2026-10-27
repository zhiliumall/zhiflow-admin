import type { App } from 'vue'

let config: object = {}
export const setConfig = (cfg?: unknown) => {
  config = Object.assign(config, cfg)
}

export const getConfig = (key?: string): PlatformConfigs => {
  if (typeof key === 'string') {
    const arr = key.split('.')
    if (arr?.length) {
      let data = config
      arr.forEach(v => {
        if (data && typeof data[v] !== 'undefined') {
          data = data[v]
        } else {
          data = null
        }
      })
      return data
    }
  }
  return config
}

/** 获取项目动态全局配置 */
export const getPlatformConfig = async (app: App): Promise<undefined> => {
  app.config.globalProperties.$config = getConfig()
  return new Promise((resolve) => {
    let config = window.platformConfig
    let $config = app.config.globalProperties.$config
    // 自动注入系统配置
    if (app && $config && typeof config === 'object') {
      $config = Object.assign($config, config)
      app.config.globalProperties.$config = $config
      // 设置全局配置
      setConfig($config)
    }
    resolve($config)
  })
}

/** 本地响应式存储的命名空间 */
export const responsiveStorageNameSpace = () => getConfig().ResponsiveStorageNameSpace
