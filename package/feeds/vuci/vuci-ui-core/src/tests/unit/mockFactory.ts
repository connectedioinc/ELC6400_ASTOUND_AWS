/// <reference types="vite/client" />
import { isRef, reactive, type Component } from 'vue'
import { mount, RouterLinkStub, type ComponentMountingOptions, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useMainStore } from '@/stores/main'
import '@ui-core/utils/string-format'
import VuciFormStub from './VuciFormStub.vue'
import { utils as _utils } from '@/plugins/utils'
import io from '@/plugins/io'
import menu from '@/plugins/menu'
import mobile from '@/plugins/mobile'
import utils from '@/plugins/utils'
import wireless from '@/plugins/wireless'
import i18n from '@ui-core/plugins/i18n'
import session from '@ui-core/plugins/session'
import ports from '@/plugins/ports'
import date from '@ui-core/plugins/date'
import { setActivePinia } from 'pinia'
import networkDevices from '@/plugins/networkDevices'
import network from '@/plugins/network'

/**
 * Simple object check.
 */
export function isObject(item: any): item is object {
  return item && typeof item === 'object' && !Array.isArray(item)
}

/**
 * Deep merge two objects.
 */
export function mergeDeep<T extends Record<string | symbol, any>>(target: T, ...sources: Record<string | symbol, any>[]): T {
  if (!sources.length) return target
  const source = sources.shift()
  if (isObject(target) && isObject(source)) {
    const keys = Object.keys(source) as Array<string | symbol>
    const symbols = Object.getOwnPropertySymbols(source)
    keys.concat(symbols).forEach(key => {
      if (isObject(source[key]) && !isRef(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} })
        mergeDeep(target[key], source[key])
      } else {
        Object.assign(target, { [key]: source[key] })
      }
    })
  }

  return mergeDeep(target, ...sources)
}

/**
 * Deep merge without first object mutations
 */
export function combineDeep(...sources: any) {
  return mergeDeep({}, ...sources)
}

const components = Object.entries(import.meta.glob(['@ui-core/tlt-design/**/*vue', '!@ui-core/tlt-design/**/Icon*.vue'], { eager: true, import: 'default' })).reduce(
  (acc, [path, m]) => {
    const name = path.split('/').pop()?.replace('.vue', '')
    if (!name) return acc
    acc[name] = m
    return acc
  },
  {} as Record<string, any>
)
// const vuciFormStubs = Object.keys(import.meta.glob('@ui-core/vuci-form/**/*.vue')).map(k => k.split('/').pop()?.slice(0, -4))

const initialMainStoreState = {
  vuciRestart: false,
  board: {
    hwinfo: {
      gps: false
    },
    switch: {
      switch0: {
        ports: []
      }
    },
    network: {
      lan: {
        device: 'abc'
      },
      static: {}
    },
    network_options: {
      vlans: 16
    },
    wlan: {}
  },
  deviceInfo: {
    static: {
      hostname: 'test'
    }
  },
  device: 'RUTX',
  menus: [],
  collapsedMobileMenu: false,
  packages: []
}

function createWrapper<T extends Component>(page: T, overrides: ComponentMountingOptions<T> = {}) {
  const pinia = createTestingPinia({ initialState: { main: initialMainStoreState } })
  setActivePinia(pinia)
  const store = useMainStore()
  // @ts-expect-error
  store.modalOpen = false
  // @ts-expect-error
  store.isSwitch = false
  // @ts-expect-error
  store.loadPackages = true
  // @ts-expect-error
  store.anyPoe = false
  // @ts-expect-error
  store.anySfp = false
  store.isPoe = vi.fn(() => false)
  store.hasPackages = vi.fn(() => true)

  const defaultMountingOptions: typeof overrides = {
    shallow: true,
    global: {
      renderStubDefaultSlot: true,
      plugins: [pinia, io, menu, utils, wireless, i18n, session, ports, date, networkDevices, network],
      components,
      stubs: {
        'tlt-icon': true,
        'tlt-tooltip': true,
        'tlt-popover': true,
        RouterLink: RouterLinkStub,
        'vuci-form': {
          ...VuciFormStub,
          provide: {
            setUciData: () => {}
          },
          data() {
            return {
              editableData: { '.name': 'test' },
              uciData: {}
            }
          }
        },
        'vuci-named-section': {
          template: '<div><slot :s="{}" /></div>'
        },
        'vuci-typed-section': {
          template: '<div><slot :s="{}" /></div>',
          provide: {
            setSection: () => {}
          }
        }
      },
      mocks: {
        $axios: {
          get: () => {
            return new Promise(resolve =>
              resolve({
                success: true,
                data: []
              })
            )
          },
          put: () => Promise.resolve({}),
          post: () => Promise.resolve({}),
          bulkGet: () => Promise.resolve([])
        },
        $mobile: {
          loadModems: () => new Promise(resolve => resolve([])),
          modemsOptions: () => [],
          parseModems: (data: any) => data,
          modemOffline: () => {},
          getModemById: () => {},
          getSimLabel: vi.fn(),
          getSimstate: vi.fn()
        },
        $wireless: {
          getGHz: () => '',
          getMode: () => '-',
          getName: () => '',
          allRadios: () => [],
          radioOptions: () => [],
          getSsidCountErrors: () => [],
          validateRadios: () => ({}),
          getClientCountErrors: () => [],
          validateClient: () => ({}),
          validateMultiAP: () => ({}),
          getRadioUseOptions: () => []
        },
        $resizeObserver: {
          observe: () => {},
          unobserve: () => {}
        },
        $message: {
          success: () => {},
          error: () => {},
          info: () => {},
          warning: () => {},
          remove: () => {}
        },
        $alert: {
          alerts: [],
          alert: () => {},
          info: () => {},
          error: () => {},
          warning: () => {},
          remove: () => {},
          toNotification: () => {}
        },
        $notification: {
          notifications: [],
          newNotifications: [],
          unreadNotifications: [],
          modalNotifications: [],
          newModalNotifications: [],
          unreadModalNotifications: [],
          notify: () => {},
          info: () => {},
          error: () => {},
          warning: () => {},
          remove: () => {},
          setAllStatus: () => {}
        },
        $prompt: {
          show: vi.fn()
        },
        $reconnect: () => {},
        $ubus: {
          call: () => new Promise(resolve => resolve({}))
        },
        $route: reactive({ path: 'test', meta: {}, query: {}, fullPath: 'test' }),
        $router: { push: vi.fn(async () => {}) },
        $uci: {
          load: () => {},
          get: () => {},
          state: {}
        },
        $VuciValidator: {
          compile: () => {},
          value: '',
          ip4addr: () => {},
          netmask: () => {},
          irange: () => {},
          fieldvalidation: () => {},
          hostname: () => ({}),
          ipaddr: () => {},
          subnet4: () => {},
          uinteger: () => Promise.resolve({})
        },
        $timer: {
          start: vi.fn(),
          stop: vi.fn(),
          update: vi.fn(),
          stopAll: vi.fn(),
          startAll: vi.fn(),
          clear: vi.fn()
        },
        $spin: () => {},
        $i18n: {
          loadLang: () => {}
        },
        $t: (msg: string) => msg,
        $store: store,
        $io: {
          getPinsInfo: () => Promise.resolve({}),
          filterIO: () => Promise.resolve({}),
          getFilteredPinsInfo: () => []
        },
        $utils: {
          ..._utils,
          downloadFileApi: () => {
            return Promise.resolve({})
          },
          getNavTestId: () => '',
          getUniqueId: () => 0
        },
        $brand: () => 'test',
        $bus: {
          on: vi.fn(),
          off: vi.fn(),
          emit: vi.fn()
        },
        $session: {
          logout: () => Promise.resolve(),
          _logout: () => Promise.resolve(),
          updateACLs: () => {},
          login: () => {},
          jwtPayload: () => ({}),
          hasAccess: () => true
        },
        $menu: {
          loadMenu: () => {
            return Promise.resolve({})
          },
          loadOptions: () => Promise.resolve(),
          filterMenus: () => [],
          findMenuItem: () => ({}),
          menuIterator: () => []
        },
        $serial: {
          deviceDisplayValue: () => '',
          validateBeforeSave: () => {
            return Promise.resolve({})
          },
          handleExternalDeviceErrors: () => {
            return Promise.resolve({})
          },
          filterOptions: () => Promise.resolve({}),
          canDeviceBeUsed: () => false,
          getDeviceMessage: () => ['', ''],
          listDeviceNameTuples: () => []
        },
        $scheduler: {
          convertWeekdayPeriodToText: () => {},
          convertMonthDaysPeriodToText: () => {}
        },
        $eventsOptions: {
          getTypes: () => {},
          getSubTypes: () => {},
          getTranslatedTypes: () => {},
          getTranslatedSubtypes: () => {},
          addSwitchEvents: () => {}
        },
        $capitalize: (s: string) => s,
        $xss: (string: string) => string,
        $analytics: {
          state: {}
        }
      }
    }
  }
  return mount(page, mergeDeep(defaultMountingOptions, overrides))
}
export default createWrapper

/** Use when testing composables that need lifetime hooks or other plugins */
export function createComposableWrapper<T>(composable: () => T): [T, VueWrapper] {
  let result: T
  const app = createWrapper({
    setup() {
      result = composable()
      return () => {}
    }
  })
  // @ts-expect-error result is assinged inside setup()
  return [result, app]
}
