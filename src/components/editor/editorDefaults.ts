/**
 * 编辑器行为默认值（唯一常量源，WangEditorAdapter 按这里的值行事）。
 */

/** 视频插入策略。当前工具栏挂了 insertVideo(外链) + uploadVideo(上传)，故为 external+upload。 */
export type VideoPolicy = 'material-only' | 'external+upload' | 'forbidden'

export interface EditorDefaults {
  /** 图片上传体积上限（KB） */
  imageMaxKb: number
  /** 视频上传体积上限（KB） */
  videoMaxKb: number
  /**
   * 图片上传整体超时（ms）。不用「N 秒内没有 progress 事件就中止」的策略：请求体发完后
   * 后端还要转存，这段时间没有进度事件，按进度判超时会把已经成功的上传掐断。
   */
  imageUploadTimeoutMs: number
  /** 粘贴是否自动清理格式（去 Word 冗余样式 / 过净化白名单）。 */
  pasteCleanup: boolean
  /** 正文默认字号（px）。显式设置，否则「默认字号」这一项无法如实展示。 */
  bodyFontSizePx: number
  /** 视频插入策略。 */
  videoPolicy: VideoPolicy
}

export const EDITOR_DEFAULTS: EditorDefaults = {
  imageMaxKb: 5000,
  videoMaxKb: 100000,
  imageUploadTimeoutMs: 120000,
  pasteCleanup: true,
  bodyFontSizePx: 14,
  videoPolicy: 'external+upload',
}

