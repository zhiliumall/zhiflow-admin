# Copyright (C) 2026 gaipharma.com
# SPDX-License-Identifier: AGPL-3.0-only
#
# 管理后台镜像：从源码构建（两阶段），产物由 nginx 托管。
#   docker build -t zhiflow-admin .
# 与后端一起部署时由后端仓库的 docker-compose.yml 构建，构建参数把后台放在 /admin/、接口走 /admin-api：
#   VITE_PUBLIC_PATH  页面的访问路径前缀，默认 /
#   VITE_API_BASE     接口地址前缀，默认空（与页面同源，按后端原路径请求）
#   VITE_H5_URL       H5 用户端地址（后台首页的访问二维码），默认空

FROM node:20-alpine AS build-stage

WORKDIR /app
RUN corepack enable

COPY .npmrc package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
ARG VITE_PUBLIC_PATH=/
ARG VITE_API_BASE=
ARG VITE_H5_URL=
RUN pnpm build

FROM nginx:stable-alpine AS production-stage

RUN rm -rf /usr/share/nginx/html/*
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
