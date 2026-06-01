import { mount, flushPromises, type ComponentMountingOptions } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import TltTabs from '../TltTabs.vue'
import TltDropdown from '@ui-core/tlt-design/layout/TltDropdown.vue'
import ListLayout from '@ui-core/components/layout/ListLayout.vue'
import utils from '@/plugins/utils'
import ConditionalWrapper from '@ui-core/components/ConditionalWrapper.vue'
import TltOptionGroup from '@ui-core/tlt-design/layout/TltOptionGroup.vue'
import TltContentBox from '@ui-core/tlt-design/layout/TltContentBox.vue'
import { useRoute } from 'vue-router'
import type { Mock } from 'vitest'
import TabContent from '../TabContent.vue'

vi.mock('vue-router', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...(actual as any),
    useRoute: vi.fn(() => ({
      path: '',
      query: {} as Record<string, any>
    }))
  }
})

document.body.innerHTML = `
  <div id="app"></div>
`

window.HTMLElement.prototype.scrollIntoView = vi.fn()

type MountingOptions = ComponentMountingOptions<typeof TltTabs>

function createWrapper({ props = {}, slots = {} }: { props?: Partial<MountingOptions['props']>; slots?: MountingOptions['slots'] } = {}) {
  return mount(TltTabs, {
    attachTo: document.getElementById('app') as HTMLElement,
    global: {
      stubs: {
        TltIcon: true,
        Transition: false,
        TltHint: { template: '<div><slot/></div>' }
      },
      components: {
        TltDropdown,
        ListLayout,
        ConditionalWrapper,
        TltOptionGroup,
        TltContentBox,
        TabContent
      },
      plugins: [createTestingPinia(), utils],
      mocks: {
        $t: (key: string) => key
      }
    },
    props: {
      tabs: [
        { name: '1', title: 'Tab 1' },
        { name: '2', title: 'Tab 2' },
        { name: '3', title: 'Tab 3' }
      ],
      ...props
    },
    slots
  })
}

describe('TltTabs.vue', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Tab buttons', () => {
    it('renders tab buttons', () => {
      const wrapper = createWrapper({ props: { inner: false } })

      const tabList = wrapper.find('[role="tablist"]')
      expect(tabList.element.childElementCount).toBe(3 + 1) // 3 tabs + 1 dropdown

      expect(wrapper.findByTestId('selected-tab-1').exists()).toBe(true)
      expect(wrapper.findByTestId('tab-2').exists()).toBe(true)
      expect(wrapper.findByTestId('tab-3').exists()).toBe(true)
    })

    it('renders inner tab buttons', () => {
      const wrapper = createWrapper()

      const tabList = wrapper.find('[role="tablist"]')
      expect(tabList.element.childElementCount).toBe(3 + 1 + 1) // 3 tabs + 1 dropdown + 1 inner tab line

      expect(wrapper.findByTestId('selected-tab-1').exists()).toBe(true)
      expect(wrapper.findByTestId('tab-2').exists()).toBe(true)
      expect(wrapper.findByTestId('tab-3').exists()).toBe(true)
    })
  })

  describe('Tab content', () => {
    it('renders tab content', async () => {
      const wrapper = createWrapper({
        slots: {
          '1': '<div>Tab 1</div>',
          '2': '<div>Tab 2</div>',
          '3': '<div>Tab 3</div>'
        }
      })

      await flushPromises()

      const tabContent1 = wrapper.findByTestId('selected-tab-content-1')
      const tabContent2 = wrapper.findByTestId('tab-content-2')
      const tabContent3 = wrapper.findByTestId('tab-content-3')

      expect(tabContent1.isVisible()).toBe(true)
      expect(tabContent2.isVisible()).toBe(false)
      expect(tabContent3.isVisible()).toBe(false)

      await wrapper.getByTestId('tab-3').trigger('click')

      expect(tabContent1.isVisible()).toBe(false)
      expect(tabContent2.isVisible()).toBe(false)
      expect(tabContent3.isVisible()).toBe(true)

      expect(tabContent1.text()).toContain('Tab 1')
      expect(tabContent2.text()).toContain('Tab 2')
      expect(tabContent3.text()).toContain('Tab 3')
    })

    it('renders single slot when using default slot', () => {
      const wrapper = createWrapper({
        slots: {
          default: '<div test-id="single-slot-content">Single Slot Content</div>'
        }
      })

      const singleSlotContent = wrapper.findByTestId('single-slot-content')

      expect(singleSlotContent.exists()).toBe(true)
      expect(singleSlotContent.text()).toContain('Single Slot Content')
    })
  })

  describe('Tab dropdown', () => {
    it('renders dropdown when there are many tabs', () => {
      const wrapper = createWrapper({
        props: {
          tabs: Array.from({ length: 50 }, (_, i) => ({
            name: `${i + 1}`,
            title: `Tab ${i + 1}`
          }))
        }
      })

      expect(wrapper.findComponent(TltDropdown).exists()).toBe(true)
    })
  })

  describe('Inner tabs line', () => {
    it('renders inner tabs line when `inner` prop is true', () => {
      const wrapper = createWrapper({ props: { inner: true } })

      const innerTabsLine = wrapper.findByTestId('tab-line')
      expect(innerTabsLine.exists()).toBe(true)
    })

    it('does not render inner tabs line when `inner` prop is false', () => {
      const wrapper = createWrapper({ props: { inner: false } })

      const innerTabsLine = wrapper.findByTestId('tab-line')
      expect(innerTabsLine.exists()).toBe(false)
    })
  })

  it('emits selected tab update event on tab select', async () => {
    const wrapper = createWrapper()
    const tab2 = wrapper.findByTestId('tab-2')

    expect(wrapper.emitted('update:selected')?.[0][0]).toBe('1')

    await tab2.trigger('click')

    expect(wrapper.emitted('update:selected')?.[1][0]).toBe('2')
  })

  it('selects tab from query params', async () => {
    ;(useRoute as Mock).mockReturnValue({
      query: { tab: '2' }
    })

    const wrapper = createWrapper()

    await flushPromises()

    expect(wrapper.emitted('update:selected')?.[1][0]).toBe('2')
  })

  describe('Tab indicators', () => {
    it('renders tab indicator', () => {
      const wrapper = createWrapper({
        props: {
          indicators: {
            '3': { type: 'success' }
          }
        }
      })

      const tab3 = wrapper.findByTestId('tab-3')
      const icon = tab3.find('[icon="info"]')

      expect(icon.exists()).toBe(true)
    })

    it('removes indicator when tab is removed', async () => {
      const wrapper = createWrapper({
        props: {
          indicators: {
            '3': { type: 'success' }
          }
        }
      })

      let tab3 = wrapper.findByTestId('tab-3')
      let icon = tab3.find('[icon="info"]')

      expect(icon.exists()).toBe(true)

      await wrapper.setProps({
        tabs: [
          { name: '1', title: 'Tab 1' },
          { name: '2', title: 'Tab 2' }
        ]
      })

      tab3 = wrapper.findByTestId('tab-3')
      expect(tab3.exists()).toBe(false)

      await wrapper.setProps({
        tabs: [
          { name: '1', title: 'Tab 1' },
          { name: '2', title: 'Tab 2' },
          { name: '3', title: 'Tab 3' }
        ]
      })

      tab3 = wrapper.findByTestId('tab-3')
      icon = tab3.find('[icon="info"]')
      expect(icon.exists()).toBe(false)
    })

    it('does not add an indicator for currently selected tab', async () => {
      const wrapper = createWrapper()

      await wrapper.setProps({
        indicators: {
          '1': { type: 'success' },
          '2': { type: 'info' }
        }
      })

      const tab1 = wrapper.findByTestId('selected-tab-1')
      const tab2 = wrapper.findByTestId('tab-2')

      expect(tab1.find('[icon="info"]').exists()).toBe(false)
      expect(tab2.find('[icon="info"]').exists()).toBe(true)
    })

    it('removes indicator when tab is selected', async () => {
      const wrapper = createWrapper({
        props: {
          indicators: {
            '3': { type: 'success' }
          }
        }
      })

      let tab3 = wrapper.findByTestId('tab-3')
      let icon = tab3.find('[icon="info"]')

      expect(icon.exists()).toBe(true)

      await wrapper.setProps({
        selected: '3'
      })

      tab3 = wrapper.findByTestId('selected-tab-3')
      icon = tab3.find('[icon="info"]')

      expect(icon.exists()).toBe(false)
    })
  })
})
