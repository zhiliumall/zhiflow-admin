import { useI18n } from '@/locales/setupI18n'

const { $t } = useI18n()

export default {
  path: '/error',
  redirect: '/error/403',
  meta: {
    icon: 'ri:information-line',
    showLink: false,
    title: $t('menus.hsabnormal'),
    // showLink: false,
    rank: 9,
  },
  children: [
    {
      path: '/error/403',
      name: '403',
      component: () => import('@/layout/error/403.vue'),
      meta: {
        icon: 'informationLine',
        title: '403',
      },
    },
    {
      path: '/404',
      name: '404',
      component: () => import('@/layout/error/404.vue'),
      meta: {
        icon: 'informationLine',
        showLink: false,
        title: '404',
      },
    },
    {
      path: '/error/404',
      name: '404',
      component: () => import('@/layout/error/404.vue'),
      meta: {
        icon: 'informationLine',
        showLink: false,
        title: '404',
      },
    },
    {
      path: '/error/500',
      name: '500',
      component: () => import('@/layout/error/500.vue'),
      meta: {
        icon: 'informationLine',
        title: '500',
      },
    },
  ],
} satisfies RouteConfigsTable
