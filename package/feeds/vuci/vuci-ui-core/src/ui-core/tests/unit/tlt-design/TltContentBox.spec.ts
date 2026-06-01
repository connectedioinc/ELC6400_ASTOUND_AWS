import { mount, type ComponentMountingOptions } from '@vue/test-utils'
import TltContentBox from '@ui-core/tlt-design/layout/TltContentBox.vue'
import { mergeDeep } from '../mockFactory'

const createWrapper = (options: ComponentMountingOptions<typeof TltContentBox> = {}) => {
  return mount(
    TltContentBox,
    mergeDeep(
      {
        global: {
          stubs: {
            Teleport: { template: '<div><slot /></div>' }
          }
        }
      },
      options
    )
  )
}

describe('TltContentBox.vue', () => {
  it('renders correctly when open', async () => {
    const wrapper = createWrapper({
      props: {
        open: true,
        size: 'small'
      },
      slots: {
        default: '<div>Content</div>'
      }
    })

    expect(wrapper.find('.box').exists()).toBe(true)
    expect(wrapper.find('.box').text()).toBe('Content')
  })

  it('does not render when not open', async () => {
    const wrapper = createWrapper({
      props: {
        open: false
      }
    })

    expect(wrapper.find('.box').exists()).toBe(false)
  })

  it('emits update:open when clicked outside', async () => {
    document.body.innerHTML = '<div id="app"></div>'
    const wrapper = createWrapper({
      attachTo: '#app',
      props: {
        open: true,
        'onUpdate:open': () => {}
      }
    })

    global.dispatchEvent(new Event('click'))

    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
  })

  it('applies correct classes based on props', async () => {
    const wrapper = createWrapper({
      props: {
        open: true,
        size: 'big'
      }
    })

    const box = wrapper.find('.box')
    expect(box.classes()).toContain('big')
  })
})
