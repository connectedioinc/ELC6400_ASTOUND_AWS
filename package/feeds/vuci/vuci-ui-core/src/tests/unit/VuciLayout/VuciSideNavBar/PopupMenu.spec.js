import PopupMenu from '@/components/VuciLayout/src/VuciSideNavBar/PopupMenu.vue'
import createWrapper from '../../mockFactory'
describe('PopupMenu.vue', () => {
  const parent = {
    $el: {
      getBoundingClientRect: vi.fn().mockReturnValue({ right: 10 })
    }
  }
  let child
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(PopupMenu, {
      props: {
        parent: () => parent
      }
    })
    wrapper.vm.$parent.$el.getBoundingClientRect = vi.fn().mockReturnValue({ top: 5, height: 100 })
    child = {
      children: [{ title: 'system' }],
      element: {
        setSelected: vi.fn(),
        $el: {
          getBoundingClientRect: vi.fn().mockReturnValue({ top: 20 })
        }
      }
    }
  })
  it('returns left style', () => {
    window.scrollX = 3
    const result = wrapper.vm.leftStyle
    expect(result).toBe('7px')
  })
  it('returns top style when popup is within bounds', () => {
    wrapper.vm.objectWithDelay = child
    wrapper.vm.popupElement = {
      getBoundingClientRect: vi.fn().mockReturnValue({ height: 10 })
    }
    const result = wrapper.vm.topStyle
    expect(result).toBe('15px')
  })
  it('returns top style when popup is not within bounds', () => {
    wrapper.vm.objectWithDelay = child
    wrapper.vm.popupElement = {
      getBoundingClientRect: vi.fn().mockReturnValue({ height: 80 })
    }
    const result = wrapper.vm.topStyle
    expect(result).toBe('4px')
  })
  it('calls _applyWithDelay() and _applyChildrenSelected()', () => {
    wrapper.vm._applyWithDelay = vi.fn()
    wrapper.vm._applyChildrenSelected = vi.fn()
    const spy1 = vi.spyOn(wrapper.vm, '_applyWithDelay')
    const spy2 = vi.spyOn(wrapper.vm, '_applyChildrenSelected')
    wrapper.vm.$options.watch.objectNoDelay.call(wrapper.vm, {}, {})
    expect(spy1).toBeCalled()
    expect(spy2).toBeCalled()
  })
  it('sets objectNoDelay value', () => {
    wrapper.vm._applyWithDelay = vi.fn()
    wrapper.vm._applyChildrenSelected = vi.fn()
    wrapper.vm.display(child)
    expect(wrapper.vm.objectNoDelay).toEqual(child)
  })
  it('clears objectNoDelay value', () => {
    wrapper.vm.hide()
    expect(wrapper.vm.objectNoDelay).toEqual(null)
  })
  it('sets objectWithDelay value', () => {
    wrapper.vm._displayFinal(child)
    expect(wrapper.vm.objectWithDelay).toEqual(child)
  })
  it('clears objectWithDelay value', () => {
    wrapper.vm.objectWithDelay = child
    wrapper.vm.$options.watch.$route.call(wrapper.vm, { path: 'test1' }, { path: 'test2' })
    expect(wrapper.vm.objectWithDelay).toEqual(null)
  })
  it('does not clear objectWithDelay value', () => {
    wrapper.vm.objectWithDelay = child
    wrapper.vm.$options.watch.$route.call(wrapper.vm, { path: 'test' }, { path: 'test' })
    expect(wrapper.vm.objectWithDelay).toEqual(child)
  })
  describe('_applyWithDelay()', () => {
    beforeAll(() => {
      vi.useFakeTimers()
    })
    it('clears timeout', () => {
      const spy = vi.spyOn(global, 'clearTimeout')
      wrapper.vm._applyWithDelay(child)
      expect(spy).toBeCalled()
    })
    it.each`
      objectWithDelay | newObject
      ${null}         | ${child}
      ${child}        | ${child}
    `('instantly sets objectWithDelay when object do not exists or is same', async ({ objectWithDelay, newObject }) => {
      wrapper.vm.objectWithDelay = objectWithDelay
      const spy = vi.spyOn(global, 'setTimeout')
      wrapper.vm._applyWithDelay(newObject)
      expect(spy).not.toBeCalled()
    })
    it('sets timeout when object exists and it is different', () => {
      wrapper.vm.objectWithDelay = child
      const spy = vi.spyOn(global, 'setTimeout')
      wrapper.vm._applyWithDelay({ element: child.element, children: [{ title: 'Network' }] })
      wrapper.vm._applyWithDelay(child)
      expect(spy).toBeCalled()
    })
  })
  describe('_applyChildrenSelected()', () => {
    it('calls new and old objects when they exicsts', () => {
      const spy = vi.spyOn(child.element, 'setSelected')
      wrapper.vm._applyChildrenSelected(child, child)
      expect(spy).toBeCalledTimes(2)
    })
    it('does not call new and old objects when they do not exicst', () => {
      wrapper.vm._applyChildrenSelected(null, null)
    })
  })
  describe('_onChildrenSelect()', () => {
    it('displays if children selected', () => {
      const spy = vi.spyOn(wrapper.vm, 'display')
      wrapper.vm._onChildrenSelect(true)
      expect(spy).toBeCalled()
    })
    it('hides if children not selected, and this element is not hovered', () => {
      const spy = vi.spyOn(wrapper.vm, 'hide')
      wrapper.vm.hover = false
      wrapper.vm._onChildrenSelect(false)
      expect(spy).toBeCalled()
    })
    it('dooes nothing if children not selected, and this element is hovered', () => {
      const spy1 = vi.spyOn(wrapper.vm, 'hide')
      const spy2 = vi.spyOn(wrapper.vm, 'display')
      wrapper.vm.hover = true
      wrapper.vm._onChildrenSelect(false)
      expect(spy1).not.toBeCalled()
      expect(spy2).not.toBeCalled()
    })
  })
  it('sets hover and displays element', () => {
    const spy = vi.spyOn(wrapper.vm, 'display')
    wrapper.vm._onMouseEnter()
    expect(spy).toBeCalled()
    expect(wrapper.vm.hover).toBe(true)
  })
  it('unsets hover and hides element', () => {
    wrapper.vm.hover = true
    const spy = vi.spyOn(wrapper.vm, 'hide')
    wrapper.vm._onMouseLeave()
    expect(spy).toBeCalled()
    expect(wrapper.vm.hover).toBe(false)
  })
})
