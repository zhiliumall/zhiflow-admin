import { h, defineComponent } from "vue";
import { Icon as IconifyIcon } from "@iconify/vue";
import { Icon as IconifyIconLocal } from "@iconify/vue/dist/offline";
import { OFFLINE_ICON_NAMES } from "./offlineIcon";

// Iconify 图标：已在 offlineIcon.ts 本地注册的名字直接离线渲染，其余才走 iconify 在线接口
export default defineComponent({
  name: "IconifyIconOnline",
  components: { IconifyIcon },
  props: {
    icon: {
      type: String,
      default: "",
    },
  },
  render() {
    const attrs = this.$attrs;
    const Comp = OFFLINE_ICON_NAMES.has(this.icon) ? IconifyIconLocal : IconifyIcon;
    return h(
      Comp,
      {
        icon: `${this.icon}`,
        style: attrs?.style
          ? Object.assign(attrs.style, { outline: "none" })
          : { outline: "none" },
        ...attrs,
      },
      {
        default: () => [],
      },
    );
  },
});
