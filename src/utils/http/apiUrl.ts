/**
 * 拼出后端完整地址：给不经过 axios 的请求用（fetch、上传组件的 action、编辑器上传地址、下载链接）。
 * 前缀取 .env 的 VITE_API_BASE，留空表示与后台同源。
 */
export function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");
  return `${base}${path}`;
}
