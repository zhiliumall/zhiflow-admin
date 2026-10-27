import { genMessage } from "../util";
// avue 语言包是 ESM 默认导出（不挂全局变量）；main.ts 会把整包 message 传给
// Avue 作为其内部语言包（整体替换、无合并），缺了这些 key 弹窗按钮就只剩图标
import zhLocaleAvue from "@smallwei/avue/lib/locale/lang/zh.js";
const modules = import.meta.glob("./zh-CN/**/*.json", { eager: true });
export default {
  message: {
    ...zhLocaleAvue,
    ...genMessage(modules as Recordable<Recordable>, "zh-CN"),
  },
};
