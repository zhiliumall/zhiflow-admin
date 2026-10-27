/**
 * 图片上传传输层（唯一事实源）。
 *
 * 富文本编辑器等需要「直接上传图片拿 URL」的地方共用这一条链路。
 *
 * 注意：本模块**不做**任何前置校验。调用前必须先过 `./upload-guard`，
 * 否则会绕开 ≤2M / 类型白名单（历史缺陷复发点）。
 * 传输层原样透传 FormData、不做任何重编码 —— GIF 动画/SVG 矢量上传后不会被压平。
 */
import { http } from "@/utils/http";

const UPLOAD_URL = (dir: string) =>
  `/upms/file/upload?fileType=image&dir=${encodeURIComponent(dir)}`;

/**
 * 从上传响应里取出文件 URL。
 * 响应拦截器：body 含 data 键→返回 response.data；否则返回整个 axios response（body 在 res.data）。
 * 上传成功 body 形如 { link: "https://.../xxx.png" }，两种解包路径都兜住。
 */
export function pickUploadedUrl(res: any): string {
  const url =
    res?.data?.link ?? // 拦截器返回整个 response 时，真正 body 在 res.data
    res?.link ?? // 拦截器已解包到 body 时，link 在顶层
    res?.data?.url ??
    res?.url ??
    (typeof res?.data === "string" ? res.data : undefined);
  if (!url || typeof url !== "string") throw new Error("upload response has no url");
  return url;
}

/** 裁剪成品 Blob 上传到文件存储，返回可访问 URL。 */
export async function uploadBlob(blob: Blob, dir = "material/"): Promise<string> {
  const fd = new FormData();
  fd.append("file", blob, "crop.png");
  const res: any = await http.request("post", UPLOAD_URL(dir), { data: fd });
  return pickUploadedUrl(res);
}

/**
 * 本地文件上传到文件存储，带进度回调与取消。
 * 调用前必须先过 upload-guard 的前置校验。
 */
export async function uploadImageFile(
  file: File,
  opts: {
    dir?: string;
    onProgress?: (pct: number) => void;
    signal?: AbortSignal;
    /**
     * 整体超时（ms）。不传沿用 axios 实例的 website.timeout(30s)。
     * 富文本编辑器传 5MB 大图会顶到 30s，故那条链路显式放宽（见 EDITOR_DEFAULTS.imageUploadTimeoutMs）。
     */
    timeoutMs?: number;
  } = {},
): Promise<string> {
  const fd = new FormData();
  fd.append("file", file, file.name || "upload.png");
  const res: any = await http.request(
    "post",
    UPLOAD_URL(opts.dir || "material/"),
    { data: fd },
    {
      signal: opts.signal,
      ...(opts.timeoutMs ? { timeout: opts.timeoutMs } : {}),
      onUploadProgress: (e: any) => {
        if (!opts.onProgress) return;
        const total = e?.total || file.size || 0;
        if (!total) return;
        // 留 1% 给服务端响应，避免进度条卡在 100% 等接口
        opts.onProgress(Math.min(99, Math.round((e.loaded / total) * 100)));
      },
    } as any,
  );
  return pickUploadedUrl(res);
}
