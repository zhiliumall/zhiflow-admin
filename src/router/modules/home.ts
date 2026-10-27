import { useI18n } from '@/locales/setupI18n'

const { $t } = useI18n()
const { VITE_HIDE_HOME } = import.meta.env
const Layout = () => import('@/layout/index.vue')

export default {
  path: '/',
  name: 'Home',
  component: Layout,
  meta: {
    icon: 'ep:home-filled',
    title: $t('menus.hshome'),
    rank: 0,
    showLink: VITE_HIDE_HOME === 'true' ? false : true,
  },
  children: [],
} satisfies RouteConfigsTable
