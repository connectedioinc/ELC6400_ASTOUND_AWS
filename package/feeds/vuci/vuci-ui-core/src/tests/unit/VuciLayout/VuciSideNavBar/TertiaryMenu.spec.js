import TertiaryMenu from '@/components/VuciLayout/src/VuciSideNavBar/TertiaryMenu.vue'
import createWrapper from '../../mockFactory'

describe('TertiaryMenu.vue', () => {
  let wrapper
  const element = {
    offsetTop: 52,
    offsetHeight: 154
  }
  beforeEach(() => {
    wrapper = createWrapper(TertiaryMenu, {
      propsData: {
        activeMenus: []
      }
    })
    wrapper.vm.$resizeObserver = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }
  })
  it('returns select line height', () => {
    wrapper.vm.yMargin = 7.5
    wrapper.vm.elementHeight = 50
    expect(wrapper.vm.height).toEqual(35)
  })
  it('returns select line top posision', () => {
    wrapper.vm.yMargin = 7.5
    wrapper.vm.elementTop = 70
    expect(wrapper.vm.top).toEqual(77.5)
  })
  describe('activePath', () => {
    it('returns true if there is path in active paths', async () => {
      await wrapper.setProps({
        activeMenus: ['/services', '/services/cloud_solutions', '/services/cloud_solutions/rms']
      })
      wrapper.vm.activePath = '/services/cloud_solutions/rms'
      expect(wrapper.vm.isActiveShown).toEqual(true)
    })
    it('returns false if there is no path in active paths', async () => {
      await wrapper.setProps({
        activeMenus: ['/services', '/services/cloud_solutions', '/services/cloud_solutions/rms']
      })
      wrapper.vm.activePath = '/services/vpn/gre'
      expect(wrapper.vm.isActiveShown).toEqual(false)
    })
  })
  describe('active watcher', () => {
    it('do not call setActive when isActiveShown: true', () => {
      const spy = vi.spyOn(wrapper.vm, '_unsetObserver')
      wrapper.vm.$options.watch.isActiveShown.call(wrapper.vm, true)
      expect(spy).not.toBeCalled()
    })
    it('calls setActive when isActiveShown: false', () => {
      const spy = vi.spyOn(wrapper.vm, '_unsetObserver')
      wrapper.vm.$options.watch.isActiveShown.call(wrapper.vm, false)
      expect(spy).toBeCalled()
    })
  })
  it('disconnects observer', async () => {
    const spy = vi.spyOn(wrapper.vm.$resizeObserver, 'unobserve')
    wrapper.unmount()
    expect(spy).toBeCalled()
  })
  it('sets active element and path and sets observer', () => {
    const spy = vi.spyOn(wrapper.vm, '_setObserver')
    const path = '/services/cloud_solutions/rms'
    wrapper.vm.setActive(element, path)
    expect(spy).toBeCalledWith(element)
    expect(wrapper.vm.activeElement).toEqual(element)
    expect(wrapper.vm.activePath).toEqual(path)
  })
  it('sets observer', () => {
    const spy = vi.spyOn(wrapper.vm, '_setObserver')
    wrapper.vm.setSelected(element)
    expect(spy).toBeCalledWith(element)
  })
  it('sets dimentions from dimention observer', () => {
    const elements = {
      target: element
    }
    wrapper.vm.show = false
    wrapper.vm._setDimentions(elements)
    expect(wrapper.vm.elementTop).toEqual(elements.target.offsetTop)
    expect(wrapper.vm.elementHeight).toEqual(elements.target.offsetHeight)
    expect(wrapper.vm.show).toEqual(true)
  })
  describe('_deselect', () => {
    it('sets observer when active is shown', () => {
      const extraWrapper = createWrapper(TertiaryMenu, {
        propsData: {
          activeMenus: []
        },
        computed: {
          isActiveShown: () => true
        }
      })
      const spy = vi.spyOn(extraWrapper.vm, '_setObserver')
      extraWrapper.vm.activeElement = element
      extraWrapper.vm._deselect()
      expect(spy).toBeCalledWith(element)
    })
    it('unsets observer when active is not shown', () => {
      const extraWrapper = createWrapper(TertiaryMenu, {
        propsData: {
          activeMenus: []
        },
        computed: {
          isActiveShown: () => false
        }
      })
      const spy = vi.spyOn(extraWrapper.vm, '_unsetObserver')
      extraWrapper.vm._deselect()
      expect(spy).toBeCalled()
    })
  })
  it('disconnects old observers adds new', () => {
    wrapper.vm._setObserver(element)
    expect(wrapper.vm.$resizeObserver.unobserve).toBeCalled()
    expect(wrapper.vm.$resizeObserver.observe).toBeCalledWith(element, wrapper.vm._setDimentions)
  })
  it('disconnects old observers', () => {
    wrapper.vm._unsetObserver()
    expect(wrapper.vm.$resizeObserver.unobserve).toBeCalled()
  })
})
