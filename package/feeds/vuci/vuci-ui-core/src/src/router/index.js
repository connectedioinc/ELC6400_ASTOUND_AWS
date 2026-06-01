import { createRouter as _createRouter, createWebHistory } from 'vue-router'
import { session } from '@ui-core/plugins/session'
import { useMainStore } from '@/stores/main'
import { useMessages } from '@/stores/messages'
import { i18n } from '@ui-core/plugins/i18n'
import { menu } from '@/plugins/menu'
import { reconnect } from '@ui-core/plugins/helper'
import { axios } from '@ui-core/plugins/axios'
import { isArray, isBoolean } from '@ui-core/utils/inspect'

const createRouter = () =>
  _createRouter({
    history: createWebHistory(),
    routes: [
      ...storyComponents(),
      {
        path: '/login',
        component: () => import('@/views/Login.vue'),
        async beforeEnter(to, from, next) {
          session.stopHeartbeat()
          if (await session.isAuthenticated()) next(getLastVisitedPath())
          else next()
        }
      },
      {
        path: '/:pathMatch(.*)*',
        component: () => import('@/components/VuciLayout/src/VuciLayout'),
        async beforeEnter(to, from, next) {
          const store = useMainStore()
          try {
            if (store.menus.length === 0) {
              await menu.loadMenu()
              return next(to)
            }
            // if menus are already loaded and did not match any route go to 404.
            return next('/404')
          } catch {
            return session.logout(i18n.t('The device is unreachable. Please check the connection and try again.'), next)
          }
        }
      }
    ]
  })

function storyComponents() {
  if (import.meta.env.PROD) return []
  const baseComponents = import.meta.glob('../../ui-core/stories/**/*.story.vue', { eager: false })
  const children = Object.entries(baseComponents).map(([path, component]) => {
    let _path = path
      .replace('../../ui-core/stories/', '')
      .split('/')
      .filter(r => r)
    const name = _path.pop().replace('.story.vue', '')
    _path = _path.join('/')
    return {
      path: `/__dev/${name.toLowerCase()}`,
      group: (_path || 'main').toUpperCase().replace(/_/g, ' '),
      component,
      name
    }
  })
  return [{ path: '/__dev', component: () => import('@ui-core/stories/ComponentReview.vue'), children, redirect: children[0] }]
}

const router = createRouter()

export function changeLANIP() {
  const store = useMainStore()
  const message = useMessages()

  const ipaddr = store.lanIP
  store.lanIP = null
  return axios
    .put('/api/interfaces/config/lan', { data: { ipaddr } })
    .then(() => {
      reconnect(i18n.t('Reconnecting...'), { address: ipaddr, params: { ipChanged: 1 }, logout: false })
    })
    .catch(() => {
      message.error(i18n.t('Failed to apply LAN changes'))
    })
}

/*
 * @description redirects to:
 * - the same group if available (should always be true, but who knows)
 * - first accessible route
 * - current route
 */
function nextAvailableRoute(route) {
  const path = route.path
  const category = path.slice(0, path.indexOf('/', 1))
  const accessible = router.getRoutes().filter(r => r.meta.read_access && r.components)
  return accessible.find(r => r.path.startsWith(category)) || accessible[0] || false
}

// store previous path to ensure navigation occurs when beforeEach is called in quick succession (e.g. when routes are reset and navigation occurs at the same time)
let previousUnresolvedPath = null
router.beforeEach(async (to, from, next) => {
  if (import.meta.env.DEV && to.path.startsWith('/__dev')) return next()
  if (to.path === from.path && from.hash !== to.hash) return next()
  const store = useMainStore()
  const message = useMessages()
  if (from.path !== '/login' && to.path !== from.path) {
    if (to.path.meta?.read_access) previousUnresolvedPath = to.path
    axios.cancelRequests('navigation')
    store.formState.loading = 0
    if (to.query.persistSpinState !== 'true') store.spinner.spinning = 0
    delete to.query.persistSpinState
  }
  if (store.lanIP && !to.path.includes('/wizard/')) return changeLANIP()
  if (to.path === '/login') return next()
  updateRedirect(to.path)
  if (!(await session.isAuthenticated())) return next('/login')
  i18n.loadLang(store.lang)
  if (to.path === from.path) {
    if (previousUnresolvedPath && to.path !== previousUnresolvedPath) {
      return next(previousUnresolvedPath)
    }
    return next()
  }
  if ('read_access' in to.meta && !to.meta.read_access) {
    if (from.path === '/login' || from.path === '/') return next(nextAvailableRoute(to))
    else {
      message.error({ title: i18n.t('Access to the page denied.'), text: i18n.t('You do not have permission to view this page.') })
      return next(false)
    }
  }
  const result = await store.loadMainData()
  if (isBoolean(result) && !result) return next('/login')
  session.startHeartbeat()
  if (!session.sessionTimeoutStarted()) session.startSessionTimeout()
  if (isArray(result) && result.length > 0) result.forEach(message.error)
  if (!session.aclCache) return session.updateACLs().then(next)
  next()
})

router.beforeResolve((to, from, next) => {
  const pageComponent = to.matched[1]?.components?.default
  const layout = pageComponent?.layout ?? 'default'
  if (layout) to.meta.layout = layout

  if (to.path === from.path && from.hash !== to.hash) return next()
  const store = useMainStore()
  store.readOnlyPage = 'write_access' in to.meta && !to.meta.write_access
  next()
})

router.afterEach(() => {
  previousUnresolvedPath = null
})

const nonAllowedRedirects = ['/system/flashops/general', '/404']

function updateRedirect(path) {
  nonAllowedRedirects.includes(path) ? sessionStorage.removeItem('redirect-path') : sessionStorage.setItem('redirect-path', path)
}

export function getLastVisitedPath() {
  const store = useMainStore()
  const localRedirect = sessionStorage.getItem('redirect-path')
  const redirectPage = localRedirect ?? '/'
  sessionStorage.removeItem('redirect-path')
  const toSetupWizard = store.firstLogin && store.hasPackages('vuci-app-setup-wizard-ui')
  return toSetupWizard ? '/system/wizard/step_pwd' : redirectPage
}

router.onError(err => {
  if (err.code !== 'MODULE_NOT_FOUND') return
  router.push('/404').then()
})

export default router
