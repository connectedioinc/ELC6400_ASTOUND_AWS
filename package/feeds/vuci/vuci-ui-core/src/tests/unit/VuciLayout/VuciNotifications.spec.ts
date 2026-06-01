import { RouterLinkStub, mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import VuciNotifications, { type Props } from '@/components/VuciLayout/src/VuciNotifications.vue'
import TltButton from '@ui-core/tlt-design/form/core/TltButton.vue'
import TltIcon from '@ui-core/tlt-design/icons/TltIcon.vue'
import TltAlert from '@/components/Messenger/TltAlert.vue'
import { localDate } from '@ui-core/plugins/date'

vi.mock('vue-router', async importOriginal => {
  const actual = (await importOriginal()) as any
  return {
    ...actual,
    useRoute: () => ({})
  }
})

function factory(props: Partial<Props> = {}) {
  const pinia = createTestingPinia()
  return mount(VuciNotifications, {
    props: { notifications: [], backButton: false, ...props },
    global: {
      components: { TltButton, TltIcon },
      plugins: [pinia],
      mocks: {
        $t: (str: string) => str,
        $localDate: localDate
      },
      stubs: {
        RouterLink: RouterLinkStub
      }
    }
  })
}

describe('VuciNotifications.vue', () => {
  it('should not render back button when backButton prop is false', () => {
    const wrapper = factory()
    expect(wrapper.find('button[test-id="button-back"]').exists()).toBe(false)
  })

  it('should render back button when backButton prop is true', () => {
    const wrapper = factory({ backButton: true })
    expect(wrapper.find('button[test-id="button-back"]').exists()).toBe(true)
  })

  it('should not render clear all button when there are no notifications', () => {
    const wrapper = factory({ notifications: [] })
    expect(wrapper.find('button[test-id="button-clear-all"]').exists()).toBe(false)
  })

  it('should render clear all button when there is at least one notification', () => {
    const wrapper = factory({ notifications: [{ id: 1, text: 'test', type: 'info' }] })
    expect(wrapper.find('button[test-id="button-clear-all"]').exists()).toBe(true)
  })

  it('should not render any alert components and render info text when there are no notifications', () => {
    const wrapper = factory({ notifications: [] })
    expect(wrapper.text()).toContain('You currently have no notifications')
    expect(wrapper.findAllComponents(TltAlert).length).toBe(0)
  })

  it('should render alert components', () => {
    const wrapper = factory({
      notifications: [
        { id: 1, text: 'test', type: 'info' },
        { id: 2, text: 'test', type: 'info' },
        { id: 3, text: 'test', type: 'info' }
      ]
    })
    expect(wrapper.findAllComponents(TltAlert).length).toBe(3)
  })

  it('should render notification timestamp in HH:mm format', () => {
    const wrapper = factory({
      notifications: [{ id: 1, text: 'test', type: 'info', timestamp: 1718284813000 }]
    })
    expect(wrapper.text()).toContain('Jun, 13 13:20')
  })
})
