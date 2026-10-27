import type { Config } from "tailwindcss";

// yudao 风格 px 间距工具类（如 w-560px / h-50px / mt-20px）非标准 TW3 类，
// 在 spacing scale 注入 0-1000px 让这类 class 可用；JIT 只 emit 实际用到的。
const pxSpacing = Object.fromEntries(
  Array.from({ length: 1001 }, (_, i) => [`${i}px`, `${i}px`])
);

export default {
  darkMode: "class",
  corePlugins: {
    preflight: false
  },
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg_color: "var(--el-bg-color)",
        primary: "var(--el-color-primary)",
        text_color_primary: "var(--el-text-color-primary)",
        text_color_regular: "var(--el-text-color-regular)"
      },
      spacing: pxSpacing
    }
  }
} satisfies Config;
