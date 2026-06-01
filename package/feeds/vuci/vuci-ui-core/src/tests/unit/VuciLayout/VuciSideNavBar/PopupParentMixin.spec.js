import PopupParentMixin from '@/components/VuciLayout/src/VuciSideNavBar/PopupParentMixin.vue'
import createWrapper from '../../mockFactory'
describe('PopupParentMixin.vue', () => {
  let Component
  beforeAll(() => {
    Component = {
      render() {},
      mixins: [PopupParentMixin]
    }
  })
  it('emits "activeChange" event', () => {
    const wrapper = createWrapper(Component)
    wrapper.vm.$options.watch.selected.call(wrapper.vm, true, false)
    expect(wrapper.emitted()).toHaveProperty('activeChange')
  })
  describe('$_PopupParentMixin_onMouseEnter', () => {
    it('emits "mouseenter" event when not active or has children', async () => {
      const wrapper = createWrapper(Component, {
        props: {
          active: false,
          openOnActive: false,
          children: [{ title: 'System' }]
        }
      })
      wrapper.vm.$_PopupParentMixin_onMouseEnter()
      expect(wrapper.emitted()).toHaveProperty('mouseenter')
    })
    it.each`
      active   | openOnActive | children
      ${true}  | ${false}     | ${[{ title: 'System' }]}
      ${true}  | ${true}      | ${undefined}
      ${false} | ${false}     | ${undefined}
      ${true}  | ${false}     | ${undefined}
    `('emits "mouseenter" event when active: $active, openOnActive: $openOnActive children: $children', async ({ active, openOnActive, children }) => {
      const wrapper = createWrapper(Component, {
        props: {
          active,
          openOnActive,
          children
        }
      })
      wrapper.vm.$_PopupParentMixin_onMouseEnter()
      expect(wrapper.emitted()).toEqual({})
    })
  })
  describe('$_PopupParentMixin_onMouseLeave', () => {
    it('emits "mouseleave" event when not active or has children', async () => {
      const wrapper = createWrapper(Component, {
        props: {
          active: false,
          openOnActive: true,
          children: [{ title: 'System' }]
        }
      })
      wrapper.vm.$_PopupParentMixin_onMouseLeave()
      expect(wrapper.emitted()).toHaveProperty('mouseleave')
    })
    it.each`
      active   | openOnActive | children
      ${true}  | ${false}     | ${[{ title: 'System' }]}
      ${true}  | ${true}      | ${undefined}
      ${false} | ${false}     | ${undefined}
      ${true}  | ${false}     | ${undefined}
    `('emits "mouseleave" event when active: $active, openOnActive: $openOnActive, children: $children', async ({ active, openOnActive, children }) => {
      const wrapper = createWrapper(Component, {
        props: {
          active,
          openOnActive,
          children
        }
      })
      wrapper.vm.$_PopupParentMixin_onMouseLeave()
      expect(wrapper.emitted()).toEqual({})
    })
  })
  it.each`
    value
    ${true}
    ${false}
  `('sets selected value to $value', ({ value }) => {
    const wrapper = createWrapper(Component)
    wrapper.vm.setSelected(value)
    expect(wrapper.vm.selected).toBe(value)
  })
})
