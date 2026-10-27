/**
 * 平台全局配置文件
 * 该文件在应用启动时加载，挂载到 window.platformConfig
 */
(function(window) {
  window.platformConfig = {
    // 版本号
    "Version": "1.0.0",
    // 网站标题
    "Title": "智流商城管理后台",
    // 是否固定头部
    "FixedHeader": true,
    // 是否隐藏侧边栏
    "HiddenSideBar": false,
    // 是否缓存多标签页
    "MultiTagsCache": false,
    // 是否开启 KeepAlive 缓存
    "KeepAlive": true,
    // 默认语言
    "Locale": "zh-CN",
    // 布局模式：elegant (默认), vertical, horizontal 等
    "Layout": "mix",
    // 主题：default
    "Theme": "cliklog",
    // 是否开启暗黑模式
    "DarkMode": false,
    // 整体风格：light (亮色), dark (暗色), auto (自动)
    "OverallStyle": "light",
    // 灰色模式（如哀悼日使用）
    "Grey": false,
    // 色弱模式
    "Weak": false,
    // 是否隐藏标签页
    "HideTabs": false,
    // 是否隐藏页脚
    "HideFooter": true,
    // 是否拉伸显示
    "Stretch": false,
    // 侧边栏状态
    "SidebarStatus": true,
    // Element Plus 主题色
    "EpThemeColor": "#2456f5",
    // 是否显示 Logo
    "ShowLogo": true,
    // 显示模式：smart (灵动), card (卡片)
    "ShowModel": "smart",
    // 菜单箭头图标是否无过渡动画
    "MenuArrowIconNoTransition": false,
    // 是否缓存异步路由
    "CachingAsyncRoutes": false,
    // Tooltip 效果：light, dark
    "TooltipEffect": "light",
    // 本地响应式存储的命名空间
    "ResponsiveStorageNameSpace": "zhiflow-",
    // 菜单搜索历史记录数量
    "MenuSearchHistory": 6,
    // 是否开启 Suspense 过渡效果
    // true:  先跳转再加载。点击菜单立即跳转，页面显示 Loading 骨架屏直到内容加载完成（体验流畅，适合大部分场景）
    // false: 等加载完再跳转。点击菜单后页面停留在当前页，顶部进度条走完后才跳转（防止页面抖动，适合对视觉稳定性要求高的场景）
    "EnableSuspense": true
  };
})(window);
