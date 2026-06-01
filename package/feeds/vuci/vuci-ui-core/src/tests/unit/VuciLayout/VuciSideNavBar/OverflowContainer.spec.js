import OverflowContainer from '@/components/VuciLayout/src/VuciSideNavBar/OverflowContainer.vue'
import createWrapper from '../../mockFactory'

describe('OverflowContainer.vue', () => {
  it('returns empty hint', () => {
    const wrapper = createWrapper(OverflowContainer, {
      props: {
        text: 'Status'
      }
    })
    wrapper.vm.hasOverflow = false
    expect(wrapper.vm.hints).toEqual([])
  })
  it('returns filled hint', () => {
    const wrapper = createWrapper(OverflowContainer, {
      props: {
        text: 'Status'
      }
    })
    wrapper.vm.hasOverflow = true
    expect(wrapper.vm.hints).toEqual([{ info: 'Status' }])
  })
  it('observes text element', async () => {
    const wrapper = createWrapper(OverflowContainer, {
      props: {
        text: 'Status'
      }
    })
    expect(wrapper.vm.resizeObserver.observe).toBeCalled()
  })
  it('disconnects observer', async () => {
    const wrapper = createWrapper(OverflowContainer, {
      props: {
        text: 'Status'
      }
    })
    wrapper.unmount()
    expect(wrapper.vm.resizeObserver.disconnect).toBeCalled()
  })
  it('sets hasOverflow to false, when there is space left', () => {
    const wrapper = createWrapper(OverflowContainer, {
      props: {
        text: 'Status'
      }
    })
    wrapper.vm.$refs.text = {
      offsetWidth: 200,
      scrollWidth: 100
    }
    wrapper.vm.hasOverflow = true
    wrapper.vm._setOverflow()
    expect(wrapper.vm.hasOverflow).toBe(false)
  })
  it('sets hasOverflow to false, when element and space equal', () => {
    const wrapper = createWrapper(OverflowContainer, {
      props: {
        text: 'Status'
      }
    })
    wrapper.vm.$refs.text = {
      offsetWidth: 100,
      scrollWidth: 100
    }
    wrapper.vm.hasOverflow = true
    wrapper.vm._setOverflow()
    expect(wrapper.vm.hasOverflow).toBe(false)
  })
  it('sets hasOverflow to true', () => {
    const wrapper = createWrapper(OverflowContainer, {
      props: {
        text: 'Status'
      }
    })
    Object.defineProperties(wrapper.vm.$refs.text, {
      offsetWidth: {
        get() {
          return 100
        }
      },
      scrollWidth: {
        get() {
          return 200
        }
      }
    })
    wrapper.vm.hasOverflow = false
    wrapper.vm._setOverflow()
    expect(wrapper.vm.hasOverflow).toBe(true)
  })
})
