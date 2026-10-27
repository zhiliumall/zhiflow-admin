/**
 * 图标库按需加载，避免应用启动时一次性加载全部图标。
 *
 * - core：框架自带的少量图标（登录页、标签页）
 * - ic：通用线性图标（`ic_` 前缀，菜单与按钮用）
 * - menu：商城业务图标（`icon-` 前缀，菜单用）
 */
export type IconfontType = 'core' | 'ic' | 'menu'

const loadedIconfonts = new Set<IconfontType>()

export async function loadIconfont(type: IconfontType) {
  if (loadedIconfonts.has(type)) return
  try {
    switch (type) {
      case 'core':
        await import('@/assets/iconfont/iconfont.js')
        await import('@/assets/iconfont/iconfont.css')
        break
      case 'ic':
        await import('@/assets/iconfont-ic/iconfont.js')
        break
      case 'menu':
        await import('@/assets/iconfont-menu/iconfont.js')
        break
    }
    loadedIconfonts.add(type)
  } catch (error) {
    console.error(`图标库 ${type} 加载失败:`, error)
  }
}

/** 预加载核心图标（登录页只需要这一份） */
export function preloadCoreIconfonts() {
  loadIconfont('core')
}

/** 登录后在浏览器空闲时加载菜单与业务图标 */
export function preloadBusinessIconfonts() {
  const run = () => {
    loadIconfont('menu')
    loadIconfont('ic')
  }
  if ('requestIdleCallback' in window) {
    requestIdleCallback(run)
  } else {
    setTimeout(run, 500)
  }
}

/** 进入任何后台页面都需要菜单图标 */
export function loadIconfontsForRoute(_routePath: string) {
  loadIconfont('core')
}

/** 用户首次交互后预加载其余图标 */
export function setupInteractionBasedLoading() {
  let hasInteracted = false
  const handleFirstInteraction = () => {
    if (hasInteracted) return
    hasInteracted = true
    preloadBusinessIconfonts()
    document.removeEventListener('click', handleFirstInteraction)
    document.removeEventListener('scroll', handleFirstInteraction)
    document.removeEventListener('keydown', handleFirstInteraction)
  }
  document.addEventListener('click', handleFirstInteraction, { passive: true })
  document.addEventListener('scroll', handleFirstInteraction, { passive: true })
  document.addEventListener('keydown', handleFirstInteraction, { passive: true })
}

export function isIconfontLoaded(type: IconfontType): boolean {
  return loadedIconfonts.has(type)
}
