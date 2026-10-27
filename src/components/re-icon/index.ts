import iconifyIconOffline from "./src/iconifyIconOffline";
import iconifyIconOnline from "./src/iconifyIconOnline";
import fontIcon from "./src/iconfont";

/**
 * 图标组件使用方法
<FontIcon
  :icon="scope.row.icon"
/>
<IconifyIconOnline :icon="scope.row.icon" />
 */
/** 本地图标组件 */
const IconifyIconOffline = iconifyIconOffline;
/** 在线图标组件 */
const IconifyIconOnline = iconifyIconOnline;
/** iconfont组件 */
const FontIcon = fontIcon;

export { IconifyIconOffline, IconifyIconOnline, FontIcon };
