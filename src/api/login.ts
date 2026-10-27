/*
 * Copyright (C) 2024 gaipharma.com
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import website from '@/config/website'
import { formatToken, getToken, type LoginInfo } from '@/utils/auth'
import { http } from '@/utils/http'
import type { resultType } from '@/utils/http/types'
import { stringify } from 'qs'

const scope = 'server'

/** 账号登录 */
export const loginByUsernameApi = data => {
  data.username = data.username.trim()

  const grant_type = 'password'
  // 参数放在请求体（application/x-www-form-urlencoded），避免口令出现在 URL 和访问日志里
  const formData = stringify({ ...data, grant_type, scope })
  return http.request<resultType<LoginInfo>>('post', '/oauth2/token', {
    data: formData,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + website.initToken,
      useToken: false,
    },
  })
}
export const refreshTokenApi = refresh_token => {
  const grant_type = 'refresh_token'
  // 使用 Request Body 传递参数
  const formData = stringify({ refresh_token, grant_type, scope })
  return http.request<resultType<LoginInfo>>('post', '/oauth2/token', {
    data: formData,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      useToken: false,
      Authorization: 'Basic ' + website.initToken,
    },
  })
}
export const getUserInfoApi = () => {
  return http.request<any>('get', '/upms/user/info')
}

export const logoutApi = () => {
  // 使用 useToken: false 防止触发 token 刷新逻辑，避免无限循环
  // 但仍然手动添加 Authorization header 以便服务器正确注销会话
  const tokenData = getToken();
  const headers: any = { useToken: false };
  if (tokenData?.access_token) {
    headers.Authorization = formatToken(tokenData.access_token);
  }
  return http.request<any>('delete', '/auth/token/logout', {}, { headers });
}
