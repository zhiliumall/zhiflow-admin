/**
 * 图片上传前置校验（唯一事实源）。
 *
 * 背景：素材上传的校验点在 `views/mall/material/index.vue::beforeUpload`，
 * 若只按 `website.limitUploadImageSize`(100M) 放行，就与 UI 声明的「≤2M」背离。
 *
 * 本模块把「类型白名单 + 体积上限 + 最小分辨率」收敛成一处，供 beforeUpload 调用；
 * 调用方通过 `imgLimit` 逐场景传入约束，**不传即保持历史行为**。
 *
 * 拦截文案共三条：类型、体积、分辨率。
 */
import { useI18n } from "@/locales/setupI18n";

/** 单场景图片约束；字段全部可选，缺省项不校验。 */
export interface UploadImgLimit {
  /** 体积上限（KB） */
  kb?: number;
  /**
   * GIF 专属体积上限（KB，可选）。声明后 **仅 image/gif** 走这一档，其它格式仍守 kb。
   *
   * 为什么要分档：动图天生比同尺寸静态图大一个数量级 —— 图标规格 200KB 时任何一张动图都过不去。
   * 但也不能把 kb 整体抬高：首屏一次要加载多个图标，静态图放宽等于白送首屏体积。
   * 故只给 GIF 单开一档，静态图上限逐字节不变。
   */
  gifKb?: number;
  /** MIME 白名单；缺省用 IMG_TYPES_DEFAULT */
  types?: string[];
  /** 最小宽（px），需异步量测 */
  minW?: number;
  /** 最小高（px），需异步量测 */
  minH?: number;
}

export interface GuardResult {
  ok: boolean;
  msg?: string;
}

/**
 * 类型白名单：png / jpg / webp / gif / bmp / svg。
 *
 * 与素材页历史分支（`views/mall/material/index.vue::beforeUpload` 未传约束时那段）逐项一致。
 * 同一个素材库只用一套规则，按「能传的都放进来」收敛（轮播动图是真实需求）。
 *
 * ⚠ svg 原样存入文件存储，**直接访问该文件链接**时其内嵌 script/onload 会执行（页面内 `<img>` 引用不会）。
 * 这条属于文件存储 / 后端响应头的事，前端白名单收紧也挡不住老入口 —— 不在此处代偿。
 */
export const IMG_TYPES_DEFAULT = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/svg+xml",
];

/** 默认体积上限：≤2M。没传规格的字段用它兜底。 */
export const IMG_KB_DEFAULT = 2048;

/** 体积友好格式：≥1M 显示 M（去尾零），否则显示 K。如「4.8M」「356K」。 */
function fmtSize(bytes: number): string {
  const m = bytes / 1024 / 1024;
  if (m >= 1) return `${Number(m.toFixed(1))}M`;
  return `${Math.max(1, Math.round(bytes / 1024))}K`;
}

/** 上限友好格式：2048KB → 「2M」，500KB → 「500K」。 */
function fmtLimit(kb: number): string {
  if (kb >= 1024) return `${Number((kb / 1024).toFixed(1))}M`;
  return `${kb}K`;
}

/**
 * 本次上传实际生效的体积上限（KB）：GIF 且规格声明了 gifKb → 走 gifKb，否则走 kb。
 * 返回 0/undefined 表示不校验体积（存量调用方不传 kb 的情形）。
 */
function capOf(file: File, limit: UploadImgLimit): number | undefined {
  if ((file.type || "").toLowerCase() === "image/gif" && limit.gifKb) return limit.gifKb;
  return limit.kb;
}

/**
 * 类型 + 体积校验（同步，前置拦截，不发请求）。
 * @param file 待上传文件
 * @param limit 场景约束；不传 kb 则不校验体积，不传 types 则用 IMG_TYPES_DEFAULT 白名单
 */
export function validImgFile(file: File, limit: UploadImgLimit = {}): GuardResult {
  const { $t } = useI18n();
  const types = limit.types || IMG_TYPES_DEFAULT;
  if (types.length && !types.includes((file.type || "").toLowerCase())) {
    return { ok: false, msg: $t("mall.material.blockImgType") };
  }
  const cap = capOf(file, limit);
  if (cap && file.size > cap * 1024) {
    return {
      ok: false,
      msg: $t("mall.material.blockImgSize", {
        name: file.name || "",
        size: fmtSize(file.size),
        limit: fmtLimit(cap),
      }),
    };
  }
  return { ok: true };
}

/**
 * 最小分辨率校验（异步量测；仅在 limit 声明 minW/minH 时才读图）。
 * 量测失败一律放行 —— 不因浏览器/解码问题误杀正常上传。
 */
export function validImgDimension(file: File, limit: UploadImgLimit = {}): Promise<GuardResult> {
  const { $t } = useI18n();
  const minW = limit.minW || 0;
  const minH = limit.minH || 0;
  if (!minW && !minH) return Promise.resolve({ ok: true });
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.addEventListener("load", () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      URL.revokeObjectURL(url);
      if ((minW && w < minW) || (minH && h < minH)) {
        resolve({
          ok: false,
          msg: $t("mall.material.blockImgDimension", {
            wh: `${w}×${h}`,
            min: `${minW || w}×${minH || h}`,
          }),
        });
        return;
      }
      resolve({ ok: true });
    });
    img.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      resolve({ ok: true });
    });
    img.src = url;
  });
}

/** 类型/体积（同步）+ 最小分辨率（异步）一次跑完；beforeUpload 直接 await 它。 */
export async function validImgAll(file: File, limit: UploadImgLimit = {}): Promise<GuardResult> {
  const basic = validImgFile(file, limit);
  if (!basic.ok) return basic;
  return validImgDimension(file, limit);
}
