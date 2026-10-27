import { $t } from "@/locales/setupI18n";

const Layout = () => import("@/layout/index.vue");

// 不需要权限校验的页面，必须在 config/website.ts 的 whiteList 中配置
export default [
  {
    path: "/login",
    name: "Login",
    component: () => import("@/layout/login/index.vue"),
    meta: {
      title: $t("menus.hslogin"),
      showLink: false,
      rank: 101,
    },
  },
  {
    path: "/redirect",
    component: Layout,
    meta: {
      icon: "homeFilled",
      title: $t("menus.hshome"),
      showLink: false,
      rank: 102,
    },
    children: [
      {
        path: "/redirect/:path(.*)",
        name: "Redirect",
        component: () => import("@/layout/redirect.vue"),
      },
    ],
  },
  {
    path: "/info",
    component: Layout,
    redirect: "/info/index",
    meta: {
      title: "个人信息",
      showLink: false,
      rank: 1100,
    },
    children: [
      {
        path: "/info/index",
        name: "UserInfo",
        meta: {
          title: "个人信息",
          hiddenTag: false,
          showLink: true,
        },
        component: () => import("@/views/upms/user/info.vue"),
      },
    ],
  },
  {
    path: "/mall/goods/goodstmp/detail",
    component: Layout,
    meta: {
      title: "参数模板详情",
      showLink: false,
    },
    children: [
      {
        path: "",
        name: "goodsTmpDetail",
        meta: {
          title: "参数模板详情",
          activePath: "/mall/goods/goodstmp",
        },
        component: () => import("@/views/mall/goodstmp/detail.vue"),
      },
    ],
  },
  {
    path: "/mall/order/orderdetail",
    component: Layout,
    meta: {
      title: "订单详情",
      showLink: false,
    },
    children: [
      {
        path: "",
        name: "mallOrderDetail",
        meta: {
          title: "订单详情",
          activePath: "/mall/order/orderinfo",
        },
        component: () => import("@/views/mall/orderdetail/detail.vue"),
      },
    ],
  },
] satisfies Array<RouteConfigsTable>;
