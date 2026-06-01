import { defineComponent, nextTick } from 'vue'
import { mount, type ComponentMountingOptions } from '@vue/test-utils'
import { mergeDeep } from '@root/vuci-ui-core/src/tests/unit/mockFactory'
import TltPositioner from '../TltPositioner.vue'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const testComponent = defineComponent({
  components: { TltPositioner },
  props: {
    ...TltPositioner.props
  },
  template: `
    <button id="ref-btn">Reference</button>
    <TltPositioner v-bind="$props">
      <slot name="content" />
    </TltPositioner>
  `
})

const createWrapper = (options: ComponentMountingOptions<typeof testComponent> = {}) =>
  mount(
    testComponent,
    mergeDeep(
      {
        attachTo: document.body,
        global: {
          stubs: {
            Teleport: { template: '<div><slot /></div>' }
          }
        }
      },
      options
    )
  )

describe('TltPositioner', () => {
  it('sets aria-describedby on reference element when opened', async () => {
    const wrapper = createWrapper({
      props: {
        target: '#ref-btn',
        id: 'positioner-id',
        show: true
      }
    })

    expect(wrapper.find('#ref-btn').attributes('aria-describedby')).toBe('positioner-id')
  })

  it('opens and closes with delay on hover', async () => {
    const wrapper = createWrapper({
      props: {
        target: '#ref-btn',
        id: 'positioner-id',
        openDelay: 1000,
        closeDelay: 1000,
        triggers: 'hover'
      }
    })

    await nextTick()

    const button = wrapper.find('#ref-btn')
    await button.trigger('mouseenter')

    expect(wrapper.findByTestId('floating-positioner-id').exists()).toBe(false)

    await vi.advanceTimersByTimeAsync(500)

    expect(wrapper.findByTestId('floating-positioner-id').exists()).toBe(false)

    await vi.advanceTimersByTimeAsync(1000)

    expect(wrapper.findByTestId('floating-positioner-id').exists()).toBe(true)

    await button.trigger('mouseleave')

    await vi.advanceTimersByTimeAsync(500)

    expect(wrapper.findByTestId('floating-positioner-id').exists()).toBe(true)

    await vi.advanceTimersByTimeAsync(500)

    expect(wrapper.findByTestId('floating-positioner-id').exists()).toBe(false)
  })

  it('toggles on click without delay', async () => {
    const wrapper = createWrapper({
      props: {
        target: '#ref-btn',
        id: 'positioner-id',
        openDelay: 1000,
        closeDelay: 1000,
        triggers: 'click'
      }
    })

    await nextTick()

    const button = wrapper.find('#ref-btn')
    await button.trigger('click')

    expect(wrapper.findByTestId('floating-positioner-id').exists()).toBe(true)

    await vi.advanceTimersByTimeAsync(1500)

    expect(wrapper.findByTestId('floating-positioner-id').exists()).toBe(true)
    await button.trigger('click')

    expect(wrapper.findByTestId('floating-positioner-id').exists()).toBe(false)
  })
})
