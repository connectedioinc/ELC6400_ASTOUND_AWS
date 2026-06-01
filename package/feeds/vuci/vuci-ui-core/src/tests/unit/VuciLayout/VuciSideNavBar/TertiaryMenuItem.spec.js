import TertiaryMenuItem from '@/components/VuciLayout/src/VuciSideNavBar/TertiaryMenuItem.vue'
import createWrapper from '../../mockFactory'
describe('TertiaryMenuItem.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(TertiaryMenuItem, {
      props: {
        name: 'RMS',
        active: false,
        path: 'services/cloud_solutions/rms',
        menuExports: {
          setActive: vi.fn(),
          setSelected: vi.fn()
        }
      }
    })
    vi.clearAllMocks()
  })
  describe('mounted()', () => {
    it('do not call setActive when not active', async () => {
      await wrapper.setProps({
        active: false
      })
      expect(wrapper.vm.menuExports.setActive).not.toBeCalled()
    })
    it('calls setActive when active', async () => {
      await wrapper.setProps({
        active: true
      })
      expect(wrapper.vm.menuExports.setActive).toBeCalled()
    })
  })
  describe('active watcher', () => {
    it('do not call setActive when not active', () => {
      wrapper.vm.$options.watch.active.call(wrapper.vm, false)
      expect(wrapper.vm.menuExports.setActive).not.toBeCalled()
    })
    it('calls setActive when active', () => {
      wrapper.vm.$options.watch.active.call(wrapper.vm, true)
      expect(wrapper.vm.menuExports.setActive).toBeCalled()
    })
  })
  it('calls _setSelected', () => {
    wrapper.vm._setSelected()
    expect(wrapper.vm.menuExports.setSelected).toBeCalled()
  })
})
