import { storageLocal } from '@pureadmin/utils'
import { defineStore } from 'pinia'
import { getUserInfoApi, loginByUsernameApi, logoutApi, refreshTokenApi } from '@/api/login'
import { routerArrays } from '@/layout/types'
import { resetRouter, router } from '@/router'
import { store } from '@/store'
import { useMultiTagsStoreHook } from '@/store/modules/multiTags'
import { CACHE_KEY, getToken, type LoginInfo, removeToken, setToken, setUserInfo } from '@/utils/auth'
import { AccessTokenContextChangedError, AccessTokenSessionError } from '@/utils/http'
import type { resultType } from '@/utils/http/types'
import type { userInfo, userInfoType } from '../types'

export const useUserStore = defineStore({
  id: 'pure-user',
  state: (): userInfoType => ({
    username: storageLocal().getItem<userInfoType>(CACHE_KEY.SESSION)?.username ?? '',
    roles: storageLocal().getItem<userInfoType>(CACHE_KEY.SESSION)?.roles ?? [],
    permissions: [],
    userInfo: {
      id: '',
      username: '',
    } as userInfoType,
  }),
  actions: {
    /** 存储用户名 */
    SET_USERNAME(username: string) {
      this.username = username
    },
    /** 存储用户信息 */
    SET_USERINFO(userInfo: userInfo) {
      this.userInfo = userInfo
    },
    /** 存储角色 */
    SET_ROLES(roles: Array<string>) {
      this.roles = roles
    },
    /** 账号密码登录（密码明文提交，传输安全靠 HTTPS） */
    loginByUsername(data) {
      return new Promise<LoginInfo>((resolve, reject) => {
        loginByUsernameApi({ ...data })
          .then(response => {
            setToken(response.data)
            resolve(response.data)
          })
          .catch(error => {
            reject(error)
          })
      })
    },
    async setUserInfoAction() {
      if (!getToken()) {
        this.logOut()
        return null
      }
      try {
        const data: resultType<userInfoType> = await getUserInfoApi()
        setUserInfo(data.data)
      } catch (error) {
        console.log(error)
      }
    },
    /** 前端登出 */
    logOut() {
      logoutApi()
        .then(() => {})
        .catch(() => {})
        .finally(() => {
          this.username = ''
          this.roles = []
          this.userInfo = {}
          removeToken()
          useMultiTagsStoreHook().handleTags('equal', [...routerArrays])
          resetRouter()
          router.push('/login')
          // 保证数据切换成功，刷新一下页面
          setTimeout(() => {
            window.location.reload()
          }, 100)
        })
    },
    /** 刷新`token` */
    async handRefreshToken(data, isCurrent?: () => boolean): Promise<LoginInfo> {
      const res = await refreshTokenApi(data)
      // HTTP 已返回到 action 的微任务窗口里也可能已退出登录；写 token 前再核对。
      if (isCurrent && !isCurrent()) {
        throw new AccessTokenContextChangedError('认证上下文已改变')
      }
      if (!res?.data?.access_token) {
        throw new AccessTokenSessionError('Token刷新结果无效')
      }
      setToken(res.data)
      return res.data
    },
  },
})

export function useUserStoreHook() {
  return useUserStore(store)
}
