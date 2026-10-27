import { addIcon } from "@iconify/vue/dist/offline";
import type { IconifyIcon } from "@iconify/vue/dist/offline";

/**
 * 本地注册的 iconify 图标（离线可用，不访问 iconify 在线接口）。
 * 后端菜单 icon 字段可以写这里注册的名字；在 src/layout/index.vue 中加载。
 */
import UbuntuFill from "@iconify-icons/ri/ubuntu-fill";
import Menu from "@iconify-icons/ep/menu";
import Edit from "@iconify-icons/ep/edit";
import InformationLine from "@iconify-icons/ri/information-line";
import SetUp from "@iconify-icons/ep/set-up";
import TerminalWindowLine from "@iconify-icons/ri/terminal-window-line";
import Guide from "@iconify-icons/ep/guide";
import HomeFilled from "@iconify-icons/ep/home-filled";
import BankCardLine from "@iconify-icons/ri/bank-card-line";
import ListCheck from "@iconify-icons/ri/list-check";
import Histogram from "@iconify-icons/ep/histogram";
import Ppt from "@iconify-icons/ri/file-ppt-2-line";
import CheckboxCircleLine from "@iconify-icons/ri/checkbox-circle-line";
import FlUser from "@iconify-icons/ri/admin-line";
import Role from "@iconify-icons/ri/admin-fill";
import Setting from "@iconify-icons/ri/settings-3-line";
import Dept from "@iconify-icons/ri/git-branch-line";
import Lollipop from "@iconify-icons/ep/lollipop";
import Monitor from "@iconify-icons/ep/monitor";
import TruckLine from "@iconify-icons/ri/truck-line";

const OFFLINE_ICONS: Record<string, IconifyIcon> = {
  ubuntuFill: UbuntuFill,
  menu: Menu,
  edit: Edit,
  informationLine: InformationLine,
  setUp: SetUp,
  terminalWindowLine: TerminalWindowLine,
  guide: Guide,
  homeFilled: HomeFilled,
  bankCard: BankCardLine,
  listCheck: ListCheck,
  histogram: Histogram,
  ppt: Ppt,
  checkboxCircleLine: CheckboxCircleLine,
  flUser: FlUser,
  role: Role,
  setting: Setting,
  dept: Dept,
  lollipop: Lollipop,
  monitor: Monitor,
  // 菜单种子「待发货订单」用的图标名
  "fa:truck": TruckLine,
};

for (const [name, icon] of Object.entries(OFFLINE_ICONS)) addIcon(name, icon);

/** 已本地注册的 iconify 图标名 */
export const OFFLINE_ICON_NAMES: ReadonlySet<string> = new Set(Object.keys(OFFLINE_ICONS));
