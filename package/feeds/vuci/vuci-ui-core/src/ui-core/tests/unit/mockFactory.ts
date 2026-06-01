import { RouterLinkStub, mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import '@ui-core/utils/string-format'
import { utils as _utils } from '@/plugins/utils'
import { useMainStore } from '@/stores/main'
import io from '@/plugins/io'
import menu from '@/plugins/menu'
import mobile from '@/plugins/mobile'
import utils from '@/plugins/utils'
import wireless from '@/plugins/wireless'
import axios from '@ui-core/plugins/axios'
import i18n from '@ui-core/plugins/i18n'
import session from '@ui-core/plugins/session'

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject(item: unknown) {
  return item && typeof item === 'object' && !Array.isArray(item)
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function mergeDeep(target: any, ...sources: any) {
  if (!sources.length) return target
  const source = sources.shift()

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} })
        mergeDeep(target[key], source[key])
      } else {
        Object.assign(target, { [key]: source[key] })
      }
    }
  }

  return mergeDeep(target, ...sources)
}

const initialMainStoreState = {
  modalOpen: false,
  vuciRestart: false,
  board: {
    hwinfo: {
      gps: false
    }
  },
  device: 'RUTX',
  packages: []
}
const components = Object.entries(import.meta.glob(['@ui-core/tlt-design/**/*vue', '@ui-core/vuci-form/**/*vue', '!@ui-core/tlt-design/**/Icon*.vue'], { eager: true, import: 'default' })).reduce(
  (acc, [path, m]) => {
    const name = path.split('/').pop()?.replace('.vue', '')
    if (!name) return acc
    acc[name] = m
    return acc
  },
  {} as Record<string, any>
)

type shallowMountArgs = typeof mount extends (...args: infer R) => infer RT ? { args: R; return: RT } : never
function createWrapper(page: shallowMountArgs['args']['0'], overrides: shallowMountArgs['args']['1']): shallowMountArgs['return'] {
  const pinia = createTestingPinia({ initialState: { main: initialMainStoreState } })
  const store = useMainStore()
  // @ts-expect-error
  store.modalOpen = false
  // @ts-expect-error
  store.loadPackages = true
  store.hasPackages = vi.fn(() => true)

  const global = {
    renderStubDefaultSlot: true,
    plugins: [pinia, axios, io, menu, mobile, utils, wireless, i18n, session],
    components,
    stubs: {
      'tlt-icon': true,
      'tlt-popover': true,
      'tlt-tooltip': true,
      'tlt-overflow-hint': true,
      'tlt-routing-icons': true,
      'tlt-button': true,
      RouterLink: RouterLinkStub
    },
    mocks: {
      $log: (e: any) => console.error(e),
      $xss: (string: string) => string,
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
        bulkGet: () => Promise.resolve([]),
        bulk: () => Promise.resolve([])
      },
      $t: (msg: string) => msg,
      $menu: {
        load: () => {
          return Promise.resolve({})
        },
        reloadMenu: () => {}
      },
      $route: {
        path: 'test',
        fullPath: 'tes',
        params: {},
        hash: null,
        query: {}
      },
      $router: { push: vi.fn(async () => {}) },
      $resizeObserver: {
        observe: () => {},
        unobserve: () => {}
      },
      $message: {
        success: (t: string) => t,
        warning: (t: string) => t,
        error: (t: string) => t
      },
      $notification: {
        alerts: [],
        menuAlerts: [],
        modalToastAlerts: [],
        modalMenuAlerts: [],
        custom: () => {},
        info: () => {},
        error: () => {},
        remove: () => {}
      },
      $prompt: {
        show: vi.fn()
      },
      $VuciValidator: {
        compile: () => {}
      },
      $spin: () => {},
      $MD5: {
        hex_md5: () => {}
      },
      $store: store,
      $session: {
        hasAccess: () => true
      },
      $utils: {
        ..._utils,
        getUniqueId: () => 0,
        clamp: () => 0,
        mapRange: () => 0
      },
      $wireless: {
        getName: () => ''
      }
    },
    provide: {
      vuciForm: {},
      vuciSection: {
        registerInput: () => {},
        unregisterInput: () => {}
      },
      configName: {}
    }
  }
  const defaultMountingOptions = {
    global,
    shallow: true,
    props: {
      name: 'test',
      uciSection: {
        '.name': 'test',
        '.type': 'test'
      }
    },
    slots: {
      default: 'Test'
    }
  }
  return mount(page, mergeDeep(defaultMountingOptions, overrides))
}

export default createWrapper
