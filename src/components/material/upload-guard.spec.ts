/**
 * 图片上传前置校验回归测试。
 *
 * 盯死一件事：规格声明的 kb 上限必须真的拦得住（UI 写「≤2M」就不能放行 100M）。
 */
import { describe, expect, it } from "vitest";
import {
  IMG_KB_DEFAULT,
  IMG_TYPES_DEFAULT,
  validImgFile,
  validImgDimension,
} from "./upload-guard";

/** 造一个指定体积/类型的假文件（不落盘，只测校验分支） */
function fakeFile(bytes: number, type = "image/png", name = "x.png"): File {
  const f = new File([""], name, { type });
  Object.defineProperty(f, "size", { value: bytes });
  return f;
}

const MB = 1024 * 1024;

describe("validImgFile 体积上限", () => {
  it("2M 上限：4.8M 被拦截（历史缺陷：曾按 100M 放行）", () => {
    const r = validImgFile(fakeFile(4.8 * MB, "image/jpeg", "photo-4k.jpg"), {
      kb: IMG_KB_DEFAULT,
    });
    expect(r.ok).toBe(false);
  });

  it("2M 上限：1.2M 正常放行", () => {
    expect(validImgFile(fakeFile(1.2 * MB), { kb: IMG_KB_DEFAULT }).ok).toBe(true);
  });

  it("边界：恰好等于上限放行，超 1 字节即拦", () => {
    expect(validImgFile(fakeFile(2048 * 1024), { kb: 2048 }).ok).toBe(true);
    expect(validImgFile(fakeFile(2048 * 1024 + 1), { kb: 2048 }).ok).toBe(false);
  });

  it("更严的规格生效：icon 200KB 拦下 300KB", () => {
    expect(validImgFile(fakeFile(300 * 1024), { kb: 200 }).ok).toBe(false);
    expect(validImgFile(fakeFile(150 * 1024), { kb: 200 }).ok).toBe(true);
  });

  it("不传 kb 时不校验体积（存量调用方零影响）", () => {
    expect(validImgFile(fakeFile(50 * MB), { types: IMG_TYPES_DEFAULT }).ok).toBe(true);
  });
});

describe("validImgFile 类型白名单", () => {
  it("放行白名单全部类型", () => {
    for (const t of IMG_TYPES_DEFAULT) {
      expect(validImgFile(fakeFile(1024, t), { kb: 2048 }).ok).toBe(true);
    }
  });

  it("gif / bmp / svg 在白名单内（轮播动图 + 矢量图标）", () => {
    for (const t of ["image/gif", "image/bmp", "image/svg+xml"]) {
      expect(IMG_TYPES_DEFAULT).toContain(t);
      expect(validImgFile(fakeFile(1024, t), { kb: 2048 }).ok).toBe(true);
    }
  });

  it("白名单外的图片类型仍拦（heic / tiff / ico）", () => {
    for (const t of ["image/heic", "image/tiff", "image/x-icon"]) {
      expect(validImgFile(fakeFile(1024, t), { kb: 2048 }).ok).toBe(false);
    }
  });

  it("类型先于体积拦截", () => {
    const r = validImgFile(fakeFile(99 * MB, "image/heic"), { kb: 2048 });
    expect(r.ok).toBe(false);
  });

  it("体积上限对 gif 同样生效（放开类型≠放开体积）", () => {
    expect(validImgFile(fakeFile(5 * MB, "image/gif"), { kb: IMG_KB_DEFAULT }).ok).toBe(false);
  });
});

/**
 * GIF 分档：icon 规格（静态 200KB）下动图必然超限 —— 这是「GIF 传不上」的原因。
 * gifKb 只放宽 image/gif，静态图逐字节不变。
 */
describe("validImgFile GIF 专属上限（gifKb）", () => {
  const iconLimit = { kb: 200, gifKb: 500 };

  it("400KB 的 gif 放行（走 gifKb 500KB 档）", () => {
    expect(validImgFile(fakeFile(400 * 1024, "image/gif", "nav.gif"), iconLimit).ok).toBe(true);
  });

  it("600KB 的 gif 仍拦（gifKb 是上限，不是免检）", () => {
    expect(validImgFile(fakeFile(600 * 1024, "image/gif", "nav.gif"), iconLimit).ok).toBe(false);
  });

  it("同体积的静态图仍按 kb 拦（放宽只对 gif 生效）", () => {
    for (const t of ["image/png", "image/jpeg", "image/webp"]) {
      expect(validImgFile(fakeFile(400 * 1024, t), iconLimit).ok).toBe(false);
    }
  });

  it("不声明 gifKb 时 gif 与静态图同档（存量规格零变化）", () => {
    expect(validImgFile(fakeFile(400 * 1024, "image/gif"), { kb: 200 }).ok).toBe(false);
  });
});

describe("validImgDimension", () => {
  it("未声明 minW/minH 时直接放行，不读图", async () => {
    expect((await validImgDimension(fakeFile(1024), {})).ok).toBe(true);
  });
});

/**
 * 文案与插值校验：用真实 zh-CN 词条渲染，确认拦截文案逐字符合预期。
 * （测试环境 i18n 实例未初始化，useI18n 回落为「返回 key」，故这里手动做一次插值渲染。）
 */
describe("拦截文案", () => {
  const zh = require("../../locales/lang/zh-CN/mall/material.json");
  const render = (key: string, p: Record<string, string>) =>
    String(zh[key.replace("mall.material.", "")]).replace(
      /\{(\w+)\}/g,
      (_, k) => p[k] ?? "",
    );

  it("体积超限文案", () => {
    expect(
      render("blockImgSize", { name: "photo-4k.jpg", size: "4.8M", limit: "2M" }),
    ).toBe("✕ 已拦截：photo-4k.jpg 4.8M 超过 2M 上限");
  });

  it("类型不支持文案（斜杠两侧有空格）", () => {
    expect(render("blockImgType", {})).toBe(
      "✕ 已拦截：仅支持 png / jpg / webp / gif / bmp / svg",
    );
  });

  it("低于最小分辨率文案", () => {
    expect(render("blockImgDimension", { wh: "32×32", min: "300×300" })).toBe(
      "✕ 已拦截：32×32 低于最小分辨率 300×300",
    );
  });
});
