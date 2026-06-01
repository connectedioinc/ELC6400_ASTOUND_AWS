import { mount } from '@vue/test-utils'
import tltProgressBar from '@ui-core/tlt-design/widgets/tltProgressBar.vue'
import '@ui-core/utils/string-format'

describe('tltProgressBar.vue', () => {
  it('renders progress with default header', () => {
    const wrapper = mount(tltProgressBar, {
      props: { progress: 42.1234 }
    })

    expect(wrapper.text()).toContain('42.12%')
  })

  it('renders progress with name', () => {
    const wrapper = mount(tltProgressBar, {
      props: { progress: 55.5, name: 'Test' }
    })

    expect(wrapper.text()).toContain('Test: (55.50%)')
  })

  it('hides header when noHeader is true', () => {
    const wrapper = mount(tltProgressBar, {
      props: { progress: 10, noHeader: true, name: 'Hidden' }
    })

    expect(wrapper.html()).not.toContain('Hidden')
  })

  it('sets progress bar width style correctly', () => {
    const wrapper = mount(tltProgressBar, {
      props: { progress: 33.3333 }
    })

    const innerBar = wrapper.find('[style]')

    expect(innerBar.attributes('style')).toContain('width: 33.33%')
  })

  it('renders slot content if provided', () => {
    const wrapper = mount(tltProgressBar, {
      props: { progress: 10 },
      slots: {
        default: '<span class="custom-slot">Custom Slot</span>'
      }
    })

    expect(wrapper.find('.custom-slot').exists()).toBe(true)
    expect(wrapper.text()).toContain('Custom Slot')
  })
})
