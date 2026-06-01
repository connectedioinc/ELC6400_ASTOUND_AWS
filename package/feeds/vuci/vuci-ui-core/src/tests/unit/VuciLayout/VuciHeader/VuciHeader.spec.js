import { reactive } from 'vue'
import VuciHeader from '@/components/VuciLayout/src/VuciHeader/VuciHeader.vue'
import createWrapper from '../../mockFactory'
import { createTestingPinia } from '@pinia/testing'
import { menu } from '@/plugins/menu'

const route = reactive({ path: '/test', meta: {} })
const router = {
  push: vi.fn()
}

vi.mock('vue-router', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRoute: () => route,
    useRouter: () => router
  }
})

vi.mock('@ui-core/plugins/axios', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    axios: {
      get: vi.fn().mockResolvedValue({ data: {} }),
      put: vi.fn().mockResolvedValue({ data: {} })
    }
  }
})

vi.mock('@/plugins/menu', async original => {
  const actual = await original()
  return { ...actual, findMenuItem: vi.fn() }
})

describe('VuciHeader.vue', () => {
  let wrapper
  beforeEach(() => {
    const pinia = createTestingPinia({
      initialState: {
        alerts: { alerts: [] },
        main: {
          profile: 'default',
          deviceInfo: {
            static: {
              fw_version: 'RUTX_T_F7452_00.07.04.28'
            }
          }
        }
      }
    })
    wrapper = createWrapper(VuciHeader, {
      global: {
        plugins: [pinia],
        mocks: {
          $menu: { findMenuItem: vi.fn() }
        }
      }
    })
  })
  it.each`
    readAccess | expectedResult
    ${true}    | ${false}
    ${false}   | ${true}
  `('isPathNotReadable: returns $expectedResult when $readAccess', ({ readAccess, expectedResult }) => {
    menu.findMenuItem = vi.fn().mockReturnValue({ read_access: readAccess })
    expect(wrapper.vm.isPathNotReadable()).toEqual(expectedResult)
  })
})
