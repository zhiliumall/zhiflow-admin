import { h, defineComponent } from "vue";
import { isSpriteIcon, normalizeIconName } from "./normalize";

// 封装iconfont组件，默认`font-class`引用模式，支持`unicode`引用、`font-class`引用、`symbol`引用 （https://www.iconfont.cn/help/detail?spm=a313x.7781069.1998910419.20&helptype=code）
export default defineComponent({
  name: "FontIcon",
  props: {
    icon: {
      type: String,
      default: "",
    },
  },
  render() {
    const attrs = this.$attrs;
    const icon = normalizeIconName(this.icon);
    if (Object.keys(attrs).includes("uni") || attrs?.iconType === "uni") {
      return h(
        "i",
        {
          ...attrs,
          class: ["iconfont", attrs?.class].filter(Boolean).join(" "),
        },
        icon,
      );
    } else if (
      Object.keys(attrs).includes("svg") ||
      attrs?.iconType === "svg" ||
      isSpriteIcon(icon)
    ) {
      const svgBaseClass = [
        "icon-svg",
        isSpriteIcon(icon) ? "lib-icon-svg" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return h(
        "svg",
        {
          ...attrs,
          class: [svgBaseClass, attrs?.class].filter(Boolean).join(" "),
          "aria-hidden": true,
        },
        {
          default: () => [
            h("use", {
              "xlink:href": `#${icon}`,
            }),
          ],
        },
      );
    } else {
      const baseClass = ["iconfont", icon].filter(Boolean).join(" ");
      return h("i", {
        ...attrs,
        class: [baseClass, attrs?.class].filter(Boolean).join(" "),
      });
    }
  },
});
