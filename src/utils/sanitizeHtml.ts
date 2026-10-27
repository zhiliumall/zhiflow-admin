import DOMPurify from 'dompurify'

/**
 * 富文本净化（纵深防御 / 前端侧）。
 *
 * 说明：后端入库净化是根本防线；此工具是前端兜底，所有把富文本喂给
 * `v-html` / `dangerouslyInsertHtml` / contenteditable 的地方都应先经过它，
 * 避免存储型 XSS 在后台只读态、预览态或编辑态执行（如 <img onerror>、javascript: 链接）。
 *
 * ── 两个出口，**刻意反向不对称**（改动前务必读懂这段） ──
 *
 *   sanitizeRichText        渲染出口（v-html / 只读态 / 手机预览）
 *   sanitizeRichTextForEdit 编辑出口（写入 contenteditable / 编辑器载入）
 *
 * 差异只在 `<iframe>`（wangEditor 的第三方嵌入视频产物）上，且方向与直觉相反：
 *
 *   编辑出口「保留更宽、中和更狠」：**任何 host 的 iframe 都不删**。
 *     因为编辑态一旦丢内容就会被写回后端 —— 载入后 DOM 是净化过的，
 *     用户一编辑就会把 DOM 回写进表单，载入时丢掉的东西从此永久丢失。删节点 = 数据损坏，故只中和不删除。
 *
 *   渲染出口「保留更窄」：非白名单 host 的 iframe **换成可见占位块**。
 *     渲染只影响显示、不写回存储，可以从严；但也不能静默变空白 ——
 *     空白会让运营以为视频没了，进而去删掉或重传，反而制造真损坏。
 *
 * 两侧共同的硬中和（见 neutralizeIframe）：
 *   ① 强制 sandbox，不给 allow-same-origin / allow-top-navigation
 *   ② 剥 style —— 掐死 `position:fixed;opacity:.02` 全屏覆盖式 clickjacking
 *   ③ 剥 allow —— 它是 Permissions Policy 委派，`allow="camera; microphone"`
 *      会把顶层文档的设备权限下放给跨域 iframe，回显视频并不需要它
 *
 * ⚠ 不能用「写入方只有管理员」来免除上述约束：本工具存在的前提就是
 * 「内容可能已被污染」（历史数据 / 其它写入端 / 后端未净化）。同源策略只挡住
 * 「iframe 读取后台 DOM」，挡不住视觉层的钓鱼与点击劫持。
 *
 * ⚠ 前端没有配置 CSP，这里的 host 白名单与 sandbox 就是前端侧唯一防线，不要想当然放宽。
 */

/** iframe src 允许的 host（常见嵌入视频来源）。子域用后缀匹配；部署方可按需追加自有域名。 */
const IFRAME_HOST_ALLOWLIST = [
  'player.bilibili.com',
  'v.qq.com',
  'player.youku.com',
]

function isAllowedIframeHost(src: string): boolean {
  if (!src) return false
  try {
    const base =
      typeof window !== 'undefined' ? window.location.origin : 'https://localhost'
    const { hostname } = new URL(src, base)
    return IFRAME_HOST_ALLOWLIST.some(
      (h) => hostname === h || hostname.endsWith('.' + h),
    )
  } catch {
    return false
  }
}

const BASE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'span', 'strong', 'em', 'u', 's', 'sub', 'sup', 'blockquote',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ol', 'ul', 'li', 'a', 'img', 'video', 'source',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'pre', 'code', 'hr', 'div', 'input',
    // 区块与折叠结构
    'section', 'details', 'summary',
    // 第三方嵌入视频。放行的是「标签」，是否留下由各出口的 hook 决定。
    'iframe',
  ],
  // data-* 由 DOMPurify 的 ALLOW_DATA_ATTR（默认 true）放行，无需在此逐个列出
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'width', 'height', 'style', 'class',
    'target', 'rel', 'controls', 'poster', 'type', 'checked', 'disabled', 'colspan', 'rowspan',
    'open',
    // iframe 展示必需。**刻意不含 `allow`**（见文件头 ③）。
    'allowfullscreen', 'frameborder', 'sandbox',
  ],
  // data-* 本身不可执行（事件属性 / javascript: URI 仍被 DOMPurify 拦截）。DOMPurify 缺省即为 true，此处显式声明。
  ALLOW_DATA_ATTR: true,
  // 允许 http(s)/mailto/tel 及相对路径；禁止 javascript:、data:（图片除外由浏览器策略把关）
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  // ⚠ iframe **不在**此列：它由 ALLOWED_TAGS 放行、由 hook 收口。
  //   FORBID_TAGS 优先级高于 ALLOWED_TAGS，写进来会让 hook 永远拿不到节点。
  FORBID_TAGS: ['script', 'object', 'embed', 'form'],
}

/** 两侧共用的 iframe 硬中和：sandbox + 去定位 + 去权限委派 */
function neutralizeIframe(node: Element) {
  // 跨域内容，不给 allow-same-origin / allow-top-navigation
  node.setAttribute('sandbox', 'allow-scripts allow-presentation')
  node.removeAttribute('style')
  node.removeAttribute('allow')
}

/** 把 iframe 原地替换成可见占位块（仅渲染出口用，不写回存储） */
function replaceWithPlaceholder(node: Element) {
  const doc = node.ownerDocument
  const box = doc.createElement('div')
  box.setAttribute('class', 'zf-embed-blocked')
  box.setAttribute('data-zf-blocked-src', node.getAttribute('src') || '')
  box.textContent = '［外部嵌入内容未在允许列表内，预览已拦截］'
  node.parentNode?.replaceChild(box, node)
}

/** 惰性创建带 hook 的独立实例：hook 是实例级的，绝不能用全局 DOMPurify 挂，
 *  否则会污染同页其它 sanitize 调用。 */
let renderPurify: any = null
let editPurify: any = null

function getRenderPurify() {
  if (renderPurify) return renderPurify
  renderPurify = DOMPurify(window)
  renderPurify.addHook('afterSanitizeAttributes', (node: any) => {
    if (node.tagName !== 'IFRAME') return
    if (!isAllowedIframeHost(node.getAttribute('src') || '')) {
      replaceWithPlaceholder(node)
      return
    }
    neutralizeIframe(node)
  })
  return renderPurify
}

function getEditPurify() {
  if (editPurify) return editPurify
  editPurify = DOMPurify(window)
  editPurify.addHook('afterSanitizeAttributes', (node: any) => {
    if (node.tagName !== 'IFRAME') return
    // 编辑态不做 host 白名单删除：删掉的内容会在用户编辑时被回写成新的正文，等于静默数据损坏。只中和，不删除。
    neutralizeIframe(node)
  })
  return editPurify
}

/**
 * 渲染出口：净化富文本 HTML，返回可安全用于 v-html 的字符串。空输入返回空串。
 * 非白名单 host 的 iframe 会变成可见占位块。
 */
export function sanitizeRichText(html?: string | null): string {
  if (!html) return ''
  return getRenderPurify().sanitize(html, BASE_CONFIG) as string
}

/**
 * 编辑出口：写入 contenteditable / 编辑器载入前使用。
 * 保留任意 host 的 iframe（避免保存时数据损坏），但一律 sandbox + 去 style/allow。
 * **不要用于 v-html 渲染** —— 渲染请用 sanitizeRichText。
 */
export function sanitizeRichTextForEdit(html?: string | null): string {
  if (!html) return ''
  return getEditPurify().sanitize(html, BASE_CONFIG) as string
}
