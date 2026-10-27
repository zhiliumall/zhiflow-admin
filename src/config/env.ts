/**
 * 构建期常量。
 */

/** H5 用户端地址（用于生成商品 / 店铺的访问链接与二维码），在 .env 的 VITE_H5_URL 中配置 */
export const h5Url: string = (import.meta.env.VITE_H5_URL || "").replace(/\/+$/, "");
