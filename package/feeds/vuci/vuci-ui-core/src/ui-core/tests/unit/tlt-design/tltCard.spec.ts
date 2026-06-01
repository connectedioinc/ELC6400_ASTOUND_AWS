import { mount, type ComponentMountingOptions } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import TltCard from '@ui-core/tlt-design/layout/TltCard.vue'
import router from '@/router'
import TltHint from '@ui-core/tlt-design/widgets/TltHint.vue'
import TltOverflowHint from '@ui-core/tlt-design/widgets/tltOverflowHint.vue'

vi.mock('axios', () => ({
  default: {
    create: () => ({
      interceptors: {
        request: { use: () => {} },
        response: { use: () => {} }
      }
    })
  },
  isAxiosError: () => {}
}))

const componentFactory = (options: ComponentMountingOptions<typeof TltCard>) => {
  return mount(TltCard, {
    ...options,
    global: {
      plugins: [router, createTestingPinia()],
      stubs: {
        'tlt-icon': true,
        'tlt-collapse-transition': true,
        TltPopover: { template: '<div><slot /><slot name="hintBox" /></div>' }
      },
      components: {
        TltOverflowHint,
        TltHint
      }
    }
  })
}

describe('TltCard.vue', () => {
  it('renders title', () => {
    const title = 'Test Title'
    const wrapper = componentFactory({ props: { title } })
    expect(wrapper.text()).toContain(title)
  })

  it('toggles content visibility when toggleable', async () => {
    const wrapper = componentFactory({ props: { title: 'Test Title', toggleable: true } })
    const button = wrapper.findByTestId('button-toggle-section-test-title')
    expect(wrapper.vm.expanded).toBe(true)
    await button.trigger('click')
    expect(wrapper.vm.expanded).toBe(false)
    await button.trigger('click')
    expect(wrapper.vm.expanded).toBe(true)
  })

  it('does not toggle content visibility when not toggleable', async () => {
    const wrapper = componentFactory({ title: 'Test Title', toggleable: false })
    expect(wrapper.vm.expanded).toBe(true)
    await wrapper.trigger('click')
    expect(wrapper.vm.expanded).toBe(true)
  })

  it('renders help slot content', () => {
    const wrapper = componentFactory({
      props: { title: 'Test Title' },
      slots: {
        help: '<div class="help-content">Help Content</div>'
      }
    })
    expect(wrapper.html()).toContain('<div class="help-content">Help Content</div>')
  })

  it('sets expanded state based on localStorage', () => {
    localStorage.setItem('/:test_title', 'false')
    const wrapper = componentFactory({
      props: { title: 'Test Title', toggleable: true }
    })
    expect(wrapper.vm.expanded).toBe(false)
  })
})
