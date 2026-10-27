/**
 * 存储配置 Endpoint 校验（只管 MinIO / S3 兼容存储，storageType=3）。
 *
 * MinIO 上传后的文件地址 = Endpoint + Bucket + 对象路径，后端原样拼出来存进商品图、签名确认书等字段，
 * 浏览器直接用它加载。所以 Endpoint 必须是**浏览器能访问的外部地址**：
 * 填容器名 / 内网地址（如 http://s3:9000）时上传本身成功，但图片全部打不开，且已写进库里的地址不会自动修正。
 * https 页面引用 http 图片还会被浏览器当混合内容拦截，所以 http 给提示。
 */
export const MINIO_STORAGE_TYPE = "3";

export interface EndpointCheck {
  /** 阻断保存的错误 */
  error?: string;
  /** 不阻断、但要提示的风险 */
  warn?: string;
}

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
  }
  // 没有点号的主机名 = docker 容器名 / 内网主机名，公网解析不到
  return !h.includes(".");
}

export function checkStorageEndpoint(storageType: unknown, endpoint: unknown): EndpointCheck {
  if (String(storageType ?? "") !== MINIO_STORAGE_TYPE) return {};
  const raw = String(endpoint ?? "").trim();
  if (!raw) return {};
  const m = raw.match(/^(https?):\/\/([^/:?#]+)/i);
  if (!m) {
    return { error: "MinIO 的 Endpoint 要写完整地址，以 https:// 或 http:// 开头，如 https://s3.example.com" };
  }
  if (isPrivateHost(m[2])) {
    return {
      error: `「${m[2]}」是内网 / 容器地址：图片地址由 Endpoint 直接拼出，浏览器打不开。请填浏览器可访问的外部地址（推荐 https 域名）`,
    };
  }
  if (m[1].toLowerCase() === "http") {
    return { warn: "建议使用 https：商城页面是 https，引用 http 图片会被浏览器当作混合内容拦截" };
  }
  return {};
}
