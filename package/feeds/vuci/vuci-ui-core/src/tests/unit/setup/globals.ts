import '@ui-core/utils/string-format'
import { config, VueWrapper, enableAutoUnmount } from '@vue/test-utils'

const DataTestIdPlugin = (wrapper: VueWrapper) => {
  function findByTestId(selector: string) {
    const dataSelector = `[test-id='${selector}']`
    return wrapper.find(dataSelector)
  }

  function findAllByTestId(selector: string) {
    const dataSelector = `[test-id='${selector}']`
    return wrapper.findAll(dataSelector)
  }

  function getByTestId(selector: string) {
    const dataSelector = `[test-id='${selector}']`
    return wrapper.get(dataSelector)
  }

  return {
    findByTestId,
    findAllByTestId,
    getByTestId
  }
}

config.plugins.VueWrapper.install(DataTestIdPlugin)

vi.stubGlobal(
  'IntersectionObserver',
  vi.fn(() => ({
    disconnect: vi.fn(),
    observe: vi.fn(),
    takeRecords: vi.fn(),
    unobserve: vi.fn()
  }))
)

vi.stubGlobal(
  'ResizeObserver',
  vi.fn(() => ({
    disconnect: vi.fn(),
    observe: vi.fn(),
    unobserve: vi.fn()
  }))
)

vi.stubGlobal(
  'structuredClone',
  vi.fn((data: unknown) => JSON.parse(JSON.stringify(data)))
)

vi.stubGlobal(
  'fetch',
  vi.fn(() => Promise.resolve({}))
)

vi.stubGlobal(
  'matchMedia',
  vi.fn(() => ({
    removeEventListener: vi.fn(),
    addEventListener: vi.fn()
  }))
)

vi.mock('vue-router', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ path: 'test' }))
  }
})

enableAutoUnmount(afterEach)
