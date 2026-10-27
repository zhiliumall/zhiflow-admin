/**
 * 空 path 菜单过滤测试。
 *
 * 回归目标：按钮类 sys_menu 的 `path` 为空，前端 `formatPath` 用模板字符串拼
 * `${parent.path}/${child.path}` 时 null 会被拼成字符串 "null"，多个兄弟节点拿到同一个
 * `/mall/goods/goodsspu/null`，抢占父路由 `/mall/goods/goodsspu`，点菜单 404。
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  filterEmptyPathRoutes,
  hasUsablePath,
} from "../../src/router/emptyPathFilter.ts";

test("剔除 path 为 null / 空串 / 纯空白的菜单节点", () => {
  const menus = [
    {
      id: "8300000",
      label: "全部商品",
      path: "/mall/goods/goodsspu",
      children: [
        { id: "9000012", label: "商品SKU", path: null },
        { id: "9000013", label: "商品规格值", path: "" },
        { id: "9000099", label: "空白 path", path: "   " },
        { id: "8300001", label: "商品详情", path: "/mall/goods/goodsspuDetail" },
      ],
    },
  ];

  const cleaned = filterEmptyPathRoutes(menus);

  assert.equal(cleaned.length, 1);
  assert.deepEqual(
    cleaned[0].children.map((c: any) => c.id),
    ["8300001"],
    "只应保留有真实 path 的子菜单",
  );
});

test("父路由不再被 /xxx/null 抢占：拼出的 path 全局唯一", () => {
  const menus = [
    {
      id: "8500000",
      label: "商品管理",
      path: "/mall/goods",
      children: [
        { id: "9000011", label: "商品推荐", path: null },
        { id: "9000003", label: "疾病管理", path: null },
        { id: "8300000", label: "全部商品", path: "goodsspu" },
      ],
    },
  ];

  const cleaned = filterEmptyPathRoutes(menus);
  const childPaths = cleaned[0].children.map(
    (c: any) => `${cleaned[0].path}/${c.path}`,
  );

  assert.deepEqual(childPaths, ["/mall/goods/goodsspu"]);
  assert.equal(
    new Set(childPaths).size,
    childPaths.length,
    "不应出现重复 path（原 bug 里两个节点都拼成 /mall/goods/null）",
  );
  assert.ok(
    !childPaths.some((p: string) => p.includes("null")),
    "不应再有 null 段",
  );
});

test("按钮节点（type === 1）path 本就为空，必须放行", () => {
  // 按钮节点的 path 全部为空（null 或空串），
  // 一刀切按 path 剔除会把它们全删掉。
  const menus = [
    {
      id: "1261170252735008769",
      label: "店铺管理",
      path: "/mall/shop",
      children: [
        { id: "1261170652447985665", label: "店铺列表", path: null, type: 1 },
        { id: "1729401385228279810", label: "开户、关闭店铺", path: "", type: 1 },
        { id: "9000010", label: "商品分类店铺", path: null, type: 0 },
      ],
    },
  ];

  const cleaned = filterEmptyPathRoutes(menus);

  assert.deepEqual(
    cleaned[0].children.map((c: any) => c.id),
    ["1261170652447985665", "1729401385228279810"],
    "按钮保留，空 path 的菜单节点剔除",
  );
});

test("hasUsablePath 边界", () => {
  assert.equal(hasUsablePath({ path: "/a" }), true);
  assert.equal(hasUsablePath({ path: null }), false);
  assert.equal(hasUsablePath({ path: "" }), false);
  assert.equal(hasUsablePath({ path: "  " }), false);
  assert.equal(hasUsablePath({ path: null, type: 1 }), true);
  assert.equal(hasUsablePath(undefined), false);
  assert.equal(hasUsablePath({}), false);
});

test("正常菜单树原样通过，不误伤", () => {
  const menus = [
    {
      id: "1000000",
      label: "系统管理",
      path: "/sys",
      children: [
        { id: "1100000", label: "用户管理", path: "user" },
        { id: "1300000", label: "角色管理", path: "role" },
      ],
    },
  ];

  const cleaned = filterEmptyPathRoutes(menus);
  assert.equal(cleaned.length, 1);
  assert.equal(cleaned[0].children.length, 2);
});

test("空数组 / 非数组入参不炸", () => {
  assert.deepEqual(filterEmptyPathRoutes([]), []);
  assert.deepEqual(filterEmptyPathRoutes(null as any), []);
  assert.deepEqual(filterEmptyPathRoutes(undefined as any), []);
});
