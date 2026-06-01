import { ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { createPinia, setActivePinia } from 'pinia'
import { useMainStore } from '@/stores/main'
import { mount } from '@vue/test-utils'
import { mergeDeep } from '../../mockFactory'

import VuciSearch from '@/components/VuciLayout/src/VuciHeader/search/VuciSearch.vue'
import TltContentBox from '@ui-core/tlt-design/layout/TltContentBox.vue'
import TltTooltip from '@ui-core/components/tooltip/TltTooltip.vue'
import { useSearchStore } from '@/stores/search'
import { escapeHTML, highlight } from '@ui-core/utils/search'

vi.mock('vue-router', async importOriginal => {
  const original = await importOriginal<any>()
  return {
    ...original,
    useRouter: () => ({
      push: vi.fn()
    }),
    useRoute: () => ({
      path: ''
    })
  }
})

vi.mock('@ui-core/plugins/axios', async importOriginal => {
  const original = await importOriginal<any>()
  return {
    ...original,
    get: vi.fn(async () => ({ data: {} }))
  }
})

vi.mock('@vueuse/core', async importOriginal => {
  const original = await importOriginal<any>()
  return {
    ...original,
    useLocalStorage: vi.fn(() => ref([]))
  }
})

Element.prototype.scrollIntoView = vi.fn()

const createWrapper = (options = {}) =>
  mount(
    VuciSearch,
    mergeDeep(
      {
        props: { expanded: false },
        global: {
          stubs: {
            TltIcon: true,
            Transition: false
          },
          components: { TltContentBox, TltTooltip },
          mocks: { $store: { spinning: 0 }, $t: (str: string) => str }
        }
      },
      options
    )
  )

beforeEach(() => {
  setActivePinia(createPinia())
  window.localStorage.removeItem('recent-searches')
})

afterEach(() => {
  vi.clearAllMocks()
})

async function open(wrapper: ReturnType<typeof createWrapper>) {
  const button = wrapper.findByTestId('search-button')
  await button.trigger('click')

  const searchWrapper = wrapper.find('.search')
  await searchWrapper.trigger('transitionend')

  const resultsBox = wrapper.findComponent(TltContentBox)
  await resultsBox.trigger('afterEnter')
}

describe('VuciSearch.vue', () => {
  it('renders', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  it('displays message when no results are found', async () => {
    const wrapper = createWrapper()

    await open(wrapper)
    const input = wrapper.findByTestId('input-search')
    await input.setValue('test')

    expect(wrapper.text()).toContain("Your search for 'test' did not match any results.")
  })

  it('displays some matched results', async () => {
    const mainStore = useMainStore()
    mainStore.menus = [
      {
        title: 'test1',
        path: 'path1',
        read_access: true,
        write_access: true,
        meta: { route: [{ title: 'Home', path: '/' }] },
        view: 'SomeView',

        acls: [],
        index: 0,
        children: [
          { title: 'test2', path: 'test2', read_access: true, write_access: true, meta: { route: [{ title: 'Home', path: '/test2' }] }, view: 'SomeView', children: [], acls: [], index: 0 },
          { title: 'test3', path: 'path3', read_access: true, write_access: true, meta: { route: [{ title: 'Home', path: '/test3' }] }, view: 'SomeView', children: [], acls: [], index: 0 }
        ]
      }
    ]

    const wrapper = createWrapper()

    await open(wrapper)
    const input = wrapper.find('input')
    await input.setValue('test2')

    const searchStore = useSearchStore()
    await searchStore.loadProviders()

    expect(wrapper.getByTestId('search-results').exists()).toBe(true)
    expect(wrapper.text()).toContain('Results found')
    expect(wrapper.text()).toContain('test2')
    expect(wrapper.text()).not.toContain('test3')
  })

  it('displays recent searches when input is focused and no search text', async () => {
    const mainStore = useMainStore()
    mainStore.menus = [
      {
        title: 'test',
        path: 'path',
        read_access: true,
        write_access: true,
        meta: { route: [{ title: 'Home', path: '/' }] },
        view: 'SomeView',

        acls: [],
        index: 0,
        children: [
          { title: 'test1', path: 'path1', read_access: true, write_access: true, meta: { route: [{ title: 'Home', path: '/test2' }] }, view: 'SomeView', children: [], acls: [], index: 0 },
          { title: 'test2', path: 'path2', read_access: true, write_access: true, meta: { route: [{ title: 'Home', path: '/test3' }] }, view: 'SomeView', children: [], acls: [], index: 0 }
        ]
      }
    ]
    const items = ref(['path1', 'path2'])
    vi.mocked(useLocalStorage).mockReturnValue(items)

    const wrapper = createWrapper()

    await open(wrapper)
    const searchStore = useSearchStore()
    await searchStore.loadProviders()

    expect(wrapper.text()).toContain('Recent searches')
    expect(wrapper.text()).toContain('test1')
    expect(wrapper.text()).toContain('test2')
  })

  it.each([
    ['test1', 'test1'],
    ['test<br/>', 'test&lt;br/&gt;'],
    ['test<br/>test<a>tt</a>123', 'test&lt;br/&gt;test&lt;a&gt;tt&lt;/a&gt;123'],
    ['test&lt;br/&gt;', 'test&amp;lt;br/&amp;gt;']
  ])('%s escaped to %s', (text, expected) => {
    expect(escapeHTML(text)).toBe(expected)
  })

  it.each([
    ['', '', ''],
    ['test', 't', '<mark>t</mark>est'],
    ['aaa', 'aa', '<mark>a</mark><mark>a</mark>a'],
    ['123<br/>test<script>alert("test")</script>456', 'test', '123&lt;br/&gt;<mark>t</mark><mark>e</mark><mark>s</mark><mark>t</mark>&lt;script&gt;alert("test")&lt;/script&gt;456'],
    ['Date & Time', 'a', 'D<mark>a</mark>te &amp; Time']
  ])('highlights search text', (input, search, expected) => {
    expect(highlight(input, search)).toBe(expected)
  })
})
