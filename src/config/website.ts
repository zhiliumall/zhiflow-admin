/**
 * @description 数据请求配置
 */
export default {
  whiteList: [
    //配置无权限可以访问的页面和接口
    '/login',
    // "/404",
    // "/401",
    '/lock',
    '/refreshToken',
    '/mallapi/captcha/generate',
    '/mallapi/captcha/check',
    '/upms/user/password/expired',
  ],
  // 后台 OAuth2 客户端（admin:admin 的 base64），与后端基线种子 sys_oauth_client 一致
  initToken: 'YWRtaW46YWRtaW4=',
  whiteTagList: ['/login', '/404', '/401', '/lock'],
  timeout: 30000, // 请求超时时间 默认30秒
  statusWhiteList: [428], //http的status默认放行不才用统一处理的,
  limitUploadImageSize: 100, // 配置统一素材限制上传图片大小 默认 100 M
  limitUploadFileSize: 100, // 配置统一限制上传文件(除了图片外)大小 默认 100 M
  //动态配置菜单的key(此处为兼容pureadmin脚手架 https://yiming_chang.gitee.io/pure-admin-doc/pages/routerMenu/)
  menu: {
    iconDefault: '',
    label: 'label', // 名称
    path: 'path',
    icon: 'icon',
    children: 'children',
    query: 'query',
    sort: 'sort',
    permission: 'permission',
    href: 'path',
    meta: 'meta',
  },
}
