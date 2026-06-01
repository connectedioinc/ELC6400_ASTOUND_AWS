import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import menuPlugin, { menu } from '@/plugins/menu'
import { axios } from '@ui-core/plugins/axios'
import * as router from '@/router'
import { i18n } from '@ui-core/plugins/i18n'
import { useMainStore } from '@/stores/main'

vi.mock('@ui-core/plugins/i18n')
vi.mock('@root/vuci-menu', () => ({
  routes: [{ component: async () => {} }]
}))
const obj = { render: () => '' }

vi.mock('/views/services/TestPage.js', () => {
  return { default: () => obj }
})
describe('menu.js', () => {
  let store
  beforeEach(() => {
    const app = { config: { globalProperties: {} } }
    setActivePinia(createTestingPinia())
    menuPlugin.install(app)
    store = useMainStore()
    menu.removeRoutes = vi.fn()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  describe('test setupWizardNextStep with all pages', () => {
    it.each`
      currentPath                   | reverse  | access                                | result
      ${'/system/wizard/step_pwd'}  | ${false} | ${[true, true, true, true, true]}     | ${'/system/wizard/step_lan'}
      ${'/system/wizard/step_pwd'}  | ${false} | ${[true, false, true, true, true]}    | ${'/system/wizard/step_wan'}
      ${'/system/wizard/step_pwd'}  | ${false} | ${[true, false, false, false, true]}  | ${'/system/wizard/step_rms'}
      ${'/system/wizard/step_pwd'}  | ${false} | ${[true, false, false, false, true]}  | ${'/system/wizard/step_rms'}
      ${'/system/wizard/step_pwd'}  | ${true}  | ${[true, false, false, false, false]} | ${false}
      ${'/system/wizard/step_wan'}  | ${true}  | ${[false, false, true, false, false]} | ${false}
      ${'/system/wizard/step_wifi'} | ${true}  | ${[true, true, true, true, false]}    | ${'/system/wizard/step_wan'}
      ${'/system/wizard/step_rms'}  | ${true}  | ${[true, false, false, false, true]}  | ${'/system/wizard/step_pwd'}
    `('tests setupWizardNextStep', ({ currentPath, reverse, access, result }) => {
      const menus = [
        {
          title: 'System',
          path: '/system',
          children: [
            {
              title: 'Setup Wizard',
              path: '/system/wizard',
              children: [
                { title: 'General', path: '/system/wizard/step_pwd', read_access: access[0] },
                { title: 'LAN', path: '/system/wizard/step_lan', read_access: access[1] },
                { title: 'Mobile', path: '/system/wizard/step_wan', read_access: access[2] },
                { title: 'Wireless', path: '/system/wizard/step_wifi', read_access: access[3] },
                { title: 'RMS', path: '/system/wizard/step_rms', read_access: access[4] }
              ]
            }
          ]
        }
      ]
      store.menus = menus
      const res = menu.setupWizardNextStep(currentPath, reverse)
      expect(result).toEqual(res)
    })
  })
  describe('_buildRoute()', () => {
    it('build route not in production', async () => {
      const menuItem = {
        css_exists: true,
        view: 'service/AWSJobs_gbd58a',
        path: 'services/cloud_solutions/aws/jobs'
      }
      global.process.env.NODE_ENV = 'testing'
      const result = menu._buildRoute(menuItem)
      expect(result).toEqual({
        path: 'services/cloud_solutions/aws/jobs',
        component: expect.any(Function),
        meta: {
          ...menuItem,
          view: 'service/AWSJobs'
        }
      })
    })
    it('build route in production', () => {
      const menuItem = {
        css_exists: true,
        view: 'service/AWSJobs_gbd58a',
        path: 'services/cloud_solutions/aws/jobs'
      }
      global.process.env.PROD = true
      const result = menu._buildRoute(menuItem)
      expect(result).toEqual({
        path: 'services/cloud_solutions/aws/jobs',
        component: expect.any(Function),
        meta: {
          ...menuItem,
          view: 'service/AWSJobs_gbd58a'
        }
      })
      global.process.env.PROD = false
    })
    it('build route with redirect', () => {
      const menuItem = {
        css_exists: true,
        view: 'service/AWSJobs_gbd58a',
        path: 'services/cloud_solutions/aws/jobs',
        redirect: 'services/modbus/modbus_server'
      }
      global.process.env.PROD = true
      const result = menu._buildRoute(menuItem)
      expect(result).toEqual({
        path: 'services/cloud_solutions/aws/jobs',
        component: expect.any(Function),
        meta: {
          ...menuItem,
          view: 'service/AWSJobs_gbd58a'
        },
        redirect: 'services/modbus/modbus_server'
      })
      global.process.env.PROD = false
    })
  })
  // don't think that require can be mocked XC
  it("load view component when it doesn't excists", () => {
    const script = {
      render: () => {}
    }
    // vi.spyOn(menu, '_loadRemoteCss').mockReturnValue({})
    vi.spyOn(menu, '_loadRemoteScript').mockResolvedValue(script)
    const result = menu._loadViewComponent({ view: 'AWSJobs_gbd58a' })
    return expect(result).resolves.toEqual(script)
  })
  describe('_loadRemoteScript()', () => {
    it('returns loaded script if it does not exist', async () => {
      const result = await menu._loadRemoteScript('services/TestPage')
      expect(result()).toEqual(obj)
    })
  })
  it('iterates menu from leaves to root', () => {
    const menus = [
      {
        title: 'Status',
        children: [
          {
            title: 'Network',
            children: [{ title: 'Mobile' }]
          },
          { title: 'System' }
        ]
      },
      { title: 'Service' }
    ]
    const iterator = menu.menuIterator(menus)
    const result = Array.from(iterator)
    expect(result).toEqual([
      { title: 'Mobile' },
      { children: [{ title: 'Mobile' }], title: 'Network' },
      { title: 'System' },
      { children: [{ children: [{ title: 'Mobile' }], title: 'Network' }, { title: 'System' }], title: 'Status' },
      { title: 'Service' }
    ])
  })
  it('returns item from menu', () => {
    const menus = [
      {
        title: 'Status',
        path: '/status',
        children: [
          {
            title: 'Network',
            path: '/status/network',
            children: [{ title: 'Mobile', path: '/status/network/mobile' }]
          },
          { title: 'System', path: '/status/system' }
        ]
      },
      { title: 'Service', path: '/status/system' }
    ]
    store.menus = menus
    const result = menu.findMenuItem('/status/network/mobile')
    expect(result).toEqual({ title: 'Mobile', path: '/status/network/mobile' })
  })
  describe('loadMenu()', () => {
    it('loads data to store on success and does not reset router', async () => {
      const data = {
        menu: [
          [{ path: '/status' }],
          {
            '/network/mobile/sim_switch': [{ view: 'network/MobileSimSwitch' }]
          }
        ]
      }
      const routesData = [
        {
          path: '/',
          children: [{ path: '/status' }]
        }
      ]
      vi.spyOn(menu, 'filterMenus').mockImplementation(e => e)
      vi.spyOn(menu, '_filterMenus4').mockImplementation(e => e)
      vi.spyOn(menu, '_buildRoutes').mockReturnValue(routesData)
      const addSpy = vi.spyOn(router.default, 'addRoute')
      const resetSpy = vi.spyOn(menu, 'removeRoutes')
      vi.spyOn(axios, 'get').mockResolvedValue({ data })
      await menu.loadMenu()
      expect(store.menus).toEqual(data.menu[0])
      expect(store.subMenus).toEqual(data.menu[1])
      expect(store.routes).toEqual(routesData)
      expect(addSpy).toBeCalled()
      expect(resetSpy).not.toBeCalled()
    })
    it('loads data to store on success and resets router', async () => {
      const data = {
        menu: [
          [{ path: '/status' }],
          {
            '/network/mobile/sim_switch': [{ view: 'network/MobileSimSwitch' }]
          }
        ]
      }
      const routesData = [
        {
          path: '/',
          children: [{ path: '/status' }]
        }
      ]
      vi.spyOn(menu, 'filterMenus').mockImplementation(e => e)
      vi.spyOn(menu, '_filterMenus4').mockImplementation(e => e)
      vi.spyOn(menu, '_buildRoutes').mockReturnValue(routesData)
      const addSpy = vi.spyOn(router.default, 'addRoute')
      const resetSpy = vi.spyOn(menu, 'removeRoutes')
      vi.spyOn(axios, 'get').mockResolvedValue({ data })
      await menu.loadMenu(true)
      expect(store.menus).toEqual(data.menu[0])
      expect(store.subMenus).toEqual(data.menu[1])
      expect(store.routes).toEqual(routesData)
      expect(addSpy).toBeCalled()
      expect(resetSpy).toBeCalled()
    })
    it('shows message on error', async () => {
      vi.spyOn(axios, 'get').mockRejectedValue({})
      const spy = vi.spyOn(i18n, 't')
      await expect(menu.loadMenu()).rejects.toThrow()
      expect(spy).toBeCalledWith('Failed to load menu data')
    })
  })
  it('returns filtered menu4', () => {
    const menu4 = {
      '/network/mobile/general': [
        { index: 1, read_access: true },
        { index: undefined, read_access: true }
      ],
      '/network/mobile/operators': [
        { index: undefined, read_access: false },
        { index: undefined, read_access: true }
      ]
    }
    const result = menu._filterMenus4(menu4)
    expect(result).toEqual({ '/network/mobile/general': [{ index: 1, read_access: true }] })
  })
  it('returns filtered menu', () => {
    const menus = [
      {
        title: 'Status',
        children: [
          {
            title: 'Network',
            children: [{ title: 'Mobile' }]
          },
          { title: 'System' }
        ]
      },
      {
        title: 'Service',
        children: [{ title: 'RMS' }]
      }
    ]
    const result = menu.filterMenus(menus, menuItem => menuItem.title === 'Service' || menuItem.title === 'RMS')
    expect(result).toEqual([{ title: 'Service', children: [{ title: 'RMS' }] }])
  })
  it('returns built route', () => {
    const menus = [
      {
        title: 'Service',
        children: [{ title: 'RMS' }]
      }
    ]
    vi.spyOn(menu, '_buildRoute').mockImplementation(e => e)
    const result = menu._buildRoutes(menus)
    expect(result).toEqual({
      path: '/',
      component: expect.any(Function),
      children: [
        {
          path: '/404',
          name: 'not-found',
          component: expect.any(Function)
        },
        {
          title: 'RMS'
        },
        {
          children: [
            {
              title: 'RMS'
            }
          ],
          title: 'Service'
        }
      ],
      redirect: expect.any(Function)
    })
  })
})
