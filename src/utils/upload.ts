/**
 * 统一提取上传响应中的文件地址。
 *
 * 后端契约理想为 `{ code, msg, data: { link } }`；历史上部分端点/组件返回过
 * 扁平的 `{ link }`。此处收敛双取逻辑，并在命中旧结构时告警，便于后续推动
 * 后端统一后删除兼容分支。
 */
export function extractUploadUrl(res: any): string {
  const url = res?.data?.link ?? res?.link ?? ''
  if (res?.link && !res?.data?.link) {
    console.warn('[upload] 收到旧版扁平结构 res.link，建议后端统一为 res.data.link')
  }
  return url
}
