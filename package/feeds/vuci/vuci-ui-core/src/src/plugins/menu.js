import { useMainStore } from '@/stores/main'
import router from '@/router'
import { i18n } from '@ui-core/plugins/i18n'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'
import { routes } from '@root/vuci-menu'
import { noop } from '@ui-core/utils/props'

export const menu = {}

menu._buildRoute = function (menuItem) {
  if (!import.meta.env.PROD && menuItem.view) {
    const splittedMenu = menuItem.view.split('/')
    splittedMenu[splittedMenu.length - 1] = splittedMenu[splittedMenu.length - 1].split('_')[0]
    menuItem.view = splittedMenu.join('/')
  }
  const r = {
    path: menuItem.path,
    component: menuItem.view ? () => menu._loadViewComponent(menuItem) : null,
    meta: {
      ...menuItem
    }
  }
  if (menuItem.redirect) r.redirect = menuItem.redirect
  else if (menuItem.children) r.redirect = menuItem.children[0].path
  return r
}

menu._loadViewComponent = async function (menuItem) {
  const store = useMainStore()
  const loadRemote = async error => {
    if (import.meta.env.DEV && error) console.error(error)
    menu._loadRemoteCss(menuItem)
    return await menu._loadRemoteScript(menuItem.view)
  }
  const component = routes.find(({ path }) => {
    const exactMatch = path === menuItem.path
    const paramRegex = /(:[a-zA-Z0-9-]*)/g
    if (exactMatch || path.search(paramRegex) === -1) return exactMatch
    const regex = new RegExp(path.replace(paramRegex, '[a-zA-Z0-9-]*'))
    const regexMatch = menuItem.path.match(regex)
    return regexMatch
  })
  if (!component) return loadRemote()
  let spinStarted = false
  const spinTimeout = setTimeout(() => {
    store.spin()
    spinStarted = true
  }, 500)
  try {
    const module = await component.component()
    return 'default' in module ? module.default : loadRemote('No default export in import')
  } catch (error) {
    return loadRemote(error)
  } finally {
    clearTimeout(spinTimeout)
    if (spinStarted) {
      spinStarted = false
      store.spin(false)
    }
  }
}

menu._loadRemoteScript = async function (viewUrl) {
  const message = useMessages()
  const fullUrl = `/views/${viewUrl}.js`
  return import(/* @vite-ignore */ fullUrl)
    .then(value => value.default)
    .catch(() => {
      message.error(i18n.t('Failed to load page: "%" is missing or could not be loaded').format(viewUrl))
    })
}

menu._loadRemoteCss = function (menuItem) {
  const cssId = menuItem.view
  if (document.getElementById(cssId) || !menuItem.css_exists) return
  const head = document.head
  const link = document.createElement('link')
  link.id = `${cssId}_css`
  link.rel = 'stylesheet'
  link.type = 'text/css'
  link.href = `/views/${menuItem.view}.css?v=1`
  link.media = 'all'
  head.appendChild(link)
}

menu._buildRoutes = function (menus) {
  const menusArray = Array.from(menu.menuIterator(menus))
  const route = {
    path: '/',
    component: () => import('@/components/VuciLayout/src/VuciLayout.vue'),
    redirect: () => menusArray.find(route => route.read_access).path,
    children: [{ path: '/404', component: () => import('@/views/404.vue'), name: 'not-found' }]
  }
  route.children.push(...menusArray.map(menuItem => menu._buildRoute(menuItem)))
  return route
}

// Filters menu and deletes childs if none are left
menu.filterMenus = function (menus, conditionFunction, routes = false) {
  const menusClone = JSON.parse(JSON.stringify(menus))
  // filter everyones children
  for (const menuItem of menu.menuIterator(menusClone)) {
    if (menuItem.children) {
      // when building routes we can't filter children based on if they have index or not since all the edit modal routes come without index
      menuItem.children = routes ? menuItem.children : menuItem.children.filter(conditionFunction)
      if (menuItem.children.length === 0) {
        delete menuItem.children
      }
    }
  }
  // filter base menus
  return menusClone.filter(conditionFunction)
}

menu._filterMenus4 = function (menu) {
  const menusClone = JSON.parse(JSON.stringify(menu))
  for (const [key, paths] of Object.entries(menusClone)) {
    const newPaths = paths.filter(child => child.index !== undefined && child.read_access === true)
    if (newPaths.length !== 0) {
      menusClone[key] = newPaths
    } else {
      delete menusClone[key]
    }
  }
  return menusClone
}
menu.removeRoutes = noop
menu.loadMenu = async function (reset = false) {
  const store = useMainStore()
  const message = useMessages()
  try {
    const {
      data: { menu: menuData }
    } = await axios.get('/api/ui/config/menu', { preventCancel: true })
    if (!menuData.length) throw new Error()
    menu._forEach(menuData[0], (item, parent) => {
      item.meta = { route: [...(parent?.meta?.route || []), { title: item.title, path: item.path }] }
    })
    const menus = menuData[0]
    const menu4 = menuData[1]
    const filteredMenus = menu.filterMenus(menus, menuItem => menuItem.index !== undefined, true)
    const filteredMenus4 = menu._filterMenus4(menu4)
    const routes = menu._buildRoutes(filteredMenus)
    store.$patch(state => {
      state.menus = filteredMenus
      state.subMenus = filteredMenus4 || {}
      state.routes = routes || {}
    })
    if (reset) menu.removeRoutes()
    menu.removeRoutes = router.addRoute(routes)
  } catch (err) {
    message.error(i18n.t('Failed to load menu data'))
    throw err
  }
}

/**
 * Finds the next (or previous) available step in the setup wizard.
 *
 * @param {string} currentPath - Current wizard route (e.g., '/system/wizard/step_pwd').
 * @param {boolean} [reverse=false] - If true, searches for the previous step instead of the next.
 * @returns {string|false} - The path of the next (or previous) step (e.g., '/system/wizard/step_lan'), or false if not found.
 */
menu.setupWizardNextStep = function (currentPath, reverse) {
  const steps = menu.findMenuItem('/system/wizard').children.filter(i => i.read_access)
  const currentIndex = steps.findIndex(steps => steps.path === currentPath)
  const nextIndex = currentIndex + (reverse ? -1 : +1)
  return steps[nextIndex]?.path || false
}

/**
 * Finds menu item from menu in store
 * @param {string} path
 * @returns {MenuItem | null}
 */
menu.findMenuItem = function (path) {
  const store = useMainStore()
  const menusArray = Array.from(menu.menuIterator(store.menus))
  return menusArray.find(menuItem => menuItem.path === path)
}

menu.menuIterator = function* (menuArray) {
  for (const menuItem of menuArray) {
    if (menuItem.children) {
      yield* menu.menuIterator(menuItem.children)
    }
    yield menuItem
  }
}
/**
 * @typedef MenuItem
 * @prop {MenuItem[]} [children]
 * @prop {string} title
 * @prop {string} path
 * @prop {boolean} read_access
 * @prop {boolean} write_access
 * @prop {string} [view]
 * @prop {string} [redirect]
 * @prop {string} [route]
 * @prop {number} [index]
 * @prop {boolean} [css_exists]
 * @prop {{route: {title: string, path: string}[]}} meta
 */

/**
 * Invokes a given callback on every menu item
 * @param {MenuItem[]} menuArray
 * @param {(item: MenuItem, parent: MenuItem) => void} callback
 * @param {string[]} [route] - route to the MenuItem.
 */
menu._forEach = (menuArray, callback, parent = null) => {
  menuArray.forEach(item => {
    callback(item, parent)
    if (item.children) menu._forEach(item.children, callback, item)
  })
}

export default {
  install(app) {
    app.config.globalProperties.$menu = menu
  }
}
