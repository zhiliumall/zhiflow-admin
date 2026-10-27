# 智流商城管理后台（ZhiFlow Admin）

智流商城的管理后台前端，与后端 zhiflow（智流商城后端，独立仓库）配套使用：单店铺电商，覆盖商品 → 订单 → 发货 → 会员 → 内容 → 系统配置的日常运营。

技术栈：Vue 3、Vite 5、TypeScript、Element Plus、Avue、Pinia、Vue Router、ECharts、wangEditor、Tailwind CSS。

## 功能

| 菜单 | 页面 |
| --- | --- |
| 商城首页 | 今日订单、今日销售额、在售商品、会员数，近 7 天订单趋势 |
| 商品管理 | 全部商品（发布、编辑、多规格 / SKU、库存与预警线、上下架、Excel 批量导入导出）、商品分类、规格管理、商品品牌、商品参数（参数模板）、素材库 |
| 订单管理 | 商城订单（查询、详情、发货、按条件导出、Excel 批量发货）、待发货订单、差错池（支付异常只读列表 + 标记已处理） |
| 会员 | 会员列表与详情（基础资料、订单、收货地址） |
| 内容 | 轮播图、热搜、协议管理（用户协议、隐私政策等） |
| 系统管理 | 管理员、角色、菜单、字典、操作日志、登录日志、系统参数、商城设置、支付配置（微信 H5 / JSAPI、支付宝 H5）、文件存储配置（本地 / MinIO）、微信网页授权配置 |

菜单由后端下发（`sys_menu`），页面按菜单的 `component` 字段加载 `src/views` 下对应的文件；按钮按角色的权限码显示。

## 不包含 / 已知限制

- 没有退款 / 售后页面：真实收款后如需退款，只能在微信支付 / 支付宝商户平台手工操作，系统里的订单状态不会随之变化。
- 没有运费模板，运费恒为 0。
- 发货只录快递公司和运单号，不提供物流轨迹查询。
- 支付配置只联调到「拉起渠道」为止，未与真实微信 / 支付宝商户做过端到端联调；上线前请用自己的商户号走一遍。
- 单店铺；不含营销、分销、多店铺。

## 对接后端

- 后端默认监听 `http://localhost:8080`，接口一级前缀为 `/oauth2`（登录）、`/auth`、`/upms`、`/mall`、`/mallapi`、`/pay`、`/weixin`，上传文件经 `/files/**` 访问。
- 后台请求默认与页面**同源**发出：
  - 开发时由 Vite 代理转发到 `.env.development` 的 `VITE_PROXY_TARGET`（默认 `http://127.0.0.1:8080`，也可以用同名环境变量临时覆盖）；
  - 部署时由 nginx 把上面这些前缀反代到后端（见下文「部署」）。
  - 接口要加前缀转发时（如后端仓库的一键部署把后台接口挂在 `/admin-api/` 下），构建时把 `VITE_API_BASE` 设成这个前缀。
    后端没有开跨域（CORS），页面与接口要经同一个域名的反向代理访问。
- 登录：账号密码 + 滑块验证码，OAuth2 客户端为后端基线自带的 `admin`。
- **首次登录**：后端首次启动时会为管理员 `admin` 生成随机口令，只在日志里打印一次（`docker compose logs app | grep -A4 首次启动`）。用它登录时页面会要求先修改密码，改完自动登录。管理员在「系统管理 › 管理员」里重置他人口令后，对方下次登录同样要先改密。
- `VITE_H5_URL`：H5 用户端地址，用于生成商品访问链接与二维码，可留空。

## 开发

需要 Node.js 20.19+ 或 22.12+，pnpm 9+（推荐 `corepack enable` 后使用 `package.json` 里锁定的版本）。

```bash
pnpm install
pnpm dev            # http://localhost:8082
```

后端不在本机 8080 时：

```bash
VITE_PROXY_TARGET=http://127.0.0.1:18090 pnpm dev
```

常用命令：

| 命令 | 说明 |
| --- | --- |
| `pnpm typecheck` | vue-tsc 类型检查 |
| `pnpm test` | 单元测试（vitest） |
| `pnpm lint` | oxlint 检查 |
| `pnpm build` | 生产构建，产物在 `dist/` |
| `pnpm preview` | 本地预览构建产物 |

依赖版本以仓库里的 `pnpm-lock.yaml` 为准，CI 与镜像构建使用 `pnpm install --frozen-lockfile`。

## 构建与部署

最省事的是用后端仓库的 Docker Compose 一键部署（三个仓库并排克隆，见后端 README「快速开始」）：
它从本仓库源码构建，后台放在 `/admin/`，接口经 `/admin-api/` 反代到后端（构建参数见本仓库 `Dockerfile` 开头的说明）。

单独构建：

```bash
pnpm install --frozen-lockfile
pnpm build
```

`dist/` 是纯静态文件，放到任意静态服务器即可。nginx 示例（后台与后端同域）：

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端接口与上传文件
    location ~ ^/(oauth2|auth|upms|mall|mallapi|pay|weixin|files)(/|$) {
        proxy_pass http://app:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 100m;
    }
}
```

也可以用仓库自带的 `Dockerfile` 从源码构建镜像：`docker build -t zhiflow-admin .`。

运行时可改的界面配置（标题、主题色、布局等）在 `public/platform-config.js`，改完无需重新构建。

## 目录结构

```
build/                构建插件与依赖预构建配置
public/               静态资源（platform-config.js 运行时配置、favicon）
src/
├── api/              接口封装（按后端模块分目录）
├── assets/           图标库（iconfont-ic、iconfont-menu）、字体、图片
├── components/       公共组件（富文本编辑器、素材库、SKU、表格壳、弹窗等）
├── config/           全局配置
├── const/            常量与 Avue 表格配置
├── directives/       自定义指令
├── layout/           主框架（顶栏、侧栏、标签页、登录页）
├── locales/          语言包（简体中文）
├── router/           路由（静态路由 + 后端菜单动态路由）
├── store/            Pinia 状态
├── style/            全局样式与设计变量
├── utils/            工具函数（http 请求、权限、存储键名等）
└── views/            业务页面（mall 商城、upms 系统、pay 支付、wxmp 微信、welcome 首页）
types/                全局类型声明
```

## 菜单图标

菜单图标取 `sys_menu.icon`：`ic_*` 与 `icon-*` 是 `src/assets/iconfont-ic`、`src/assets/iconfont-menu` 里的 SVG 图标，
`xx:yy` 形式需在 `src/components/re-icon/src/offlineIcon.ts` 本地注册。图标名为空或找不到时，侧栏按菜单名称显示一个默认线性图标。
「系统管理 › 菜单」编辑菜单时可以用图标选择器挑选。

## 参与贡献

目前暂不接受外部代码提交（Pull Request）。

## 许可证

本项目以 [GNU Affero General Public License v3.0](LICENSE)（AGPL-3.0-only）发布。第三方组件的许可见 [NOTICE](NOTICE)。

Copyright (C) 2024-2026 gaipharma.com
