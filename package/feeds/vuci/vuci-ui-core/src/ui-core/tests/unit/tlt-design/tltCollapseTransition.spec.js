import tltCollapseTransition from '@ui-core/tlt-design/layout/tltCollapseTransition.vue'
import createWrapper from '../mockFactory'

const styles = {
  height: '0px',
  'padding-bottom': '0px',
  'padding-top': '0px'
}

const el = document.createElement('div')

describe('tltCollapseTransition.vue', () => {
  let wrapper = createWrapper(tltCollapseTransition)
  const methods = Object.keys(wrapper.vm)

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })
  it.each`
    method
    ${'_animatingCollapse'}
    ${'_unsetStyles'}
    ${'_getCurrentStyles'}
    ${'_getDimensions'}
    ${'_setTransition'}
    ${'_setOverflow'}
    ${'_setDimensions'}
    ${'_forceRepaint'}
    ${'_getStyleValue'}
  `('Component contains $method method', ({ method }) => {
    expect(methods.includes(method)).toBeTruthy()
    expect(typeof wrapper.vm[method]).toBe('function')
  })

  it('computes transition animation', () => {
    const result = 'height 400ms ease-in-out, padding-bottom 400ms ease-in-out, padding-top 400ms ease-in-out'
    wrapper = createWrapper(tltCollapseTransition)
    wrapper.vm.currentStyles = styles
    expect(wrapper.vm.transition).toBe(result)
  })

  it.each`
    collapse
    ${undefined}
    ${true}
    ${false}
  `('method _animatingCollapse. Animates section collapse when value is $collapse', ({ collapse }) => {
    const spy1 = vi.spyOn(tltCollapseTransition.methods, '_getCurrentStyles')
    const spy2 = vi.spyOn(tltCollapseTransition.methods, '_setDimensions')
    const spy3 = vi.spyOn(tltCollapseTransition.methods, '_setOverflow')
    const spy4 = vi.spyOn(tltCollapseTransition.methods, '_forceRepaint')
    const spy5 = vi.spyOn(tltCollapseTransition.methods, '_setTransition')
    const spy6 = vi.spyOn(tltCollapseTransition.methods, '_setDimensions')
    wrapper = createWrapper(tltCollapseTransition)
    wrapper.vm.currentStyles = styles
    const action = vi.fn()
    wrapper.vm._animatingCollapse(el, action, collapse)
    vi.advanceTimersByTime(400)
    expect(spy1).toHaveBeenCalledWith(el)
    expect(spy2).toHaveBeenCalledWith(el, collapse ? '0' : styles)
    expect(spy3).toHaveBeenCalledWith(el, 'hidden')
    expect(spy4).toHaveBeenCalledWith(el)
    expect(spy5).toHaveBeenCalledWith(el, wrapper.vm.transition)
    expect(spy6).toHaveBeenCalledWith(el, collapse ? styles : '0')
    expect(action).toHaveBeenCalled()
  })

  it('method _unsetStyles. Unsets transition styles', () => {
    const spy1 = vi.spyOn(tltCollapseTransition.methods, '_setOverflow')
    const spy2 = vi.spyOn(tltCollapseTransition.methods, '_setTransition')
    const spy3 = vi.spyOn(tltCollapseTransition.methods, '_setDimensions')
    wrapper = createWrapper(tltCollapseTransition)
    wrapper.vm.currentStyles = styles
    wrapper.vm._unsetStyles(el)
    expect(spy1).toHaveBeenCalledWith(el, '')
    expect(spy2).toHaveBeenCalledWith(el, '')
    expect(spy3).toHaveBeenCalledWith(el, '')
    expect(wrapper.vm.currentStyles).toBeNull()
  })

  it('method _getCurrentStyles. Returns when current styles are not null', () => {
    wrapper = createWrapper(tltCollapseTransition)
    wrapper.vm.currentStyles = styles
    wrapper.vm._getCurrentStyles(el)
    expect(wrapper.vm.currentStyles).toEqual(styles)
  })

  it('method _getCurrentStyles. Sets styles when current ones are null', () => {
    const spy = vi.spyOn(tltCollapseTransition.methods, '_getDimensions')
    wrapper = createWrapper(tltCollapseTransition)
    wrapper.vm.currentStyles = null
    wrapper.vm._getCurrentStyles(el)
    expect(spy).toHaveBeenCalledWith(el)
    expect(wrapper.vm.currentStyles).toEqual(styles)
  })

  it.each`
    collapseProperty | result
    ${'height'}      | ${{ height: '0px', 'padding-bottom': '0px', 'padding-top': '0px' }}
    ${'width'}       | ${{ 'padding-left': '', 'padding-right': '', width: '0px' }}
  `('method _getDimensions. Gets dimensions when collapse property is $collapseProperty', ({ collapseProperty, result }) => {
    wrapper = createWrapper(tltCollapseTransition, {
      propsData: {
        collapseProperty
      }
    })
    const res = wrapper.vm._getDimensions(el)
    expect(res).toEqual(result)
  })

  it('method _setTransition. Sets element transition style', () => {
    const value = 'linear'
    wrapper = createWrapper(tltCollapseTransition)
    wrapper.vm._setTransition(el, value)
    expect(el.style.transition).toBe(value)
  })

  it('method _setOverflow. Sets element overflow style', () => {
    const value = 'hidden'
    wrapper = createWrapper(tltCollapseTransition)
    wrapper.vm._setTransition(el, value)
    expect(el.style.transition).toBe(value)
  })

  it('method _setDimensions. Sets element dimensions', () => {
    const value = {
      height: '10px',
      'padding-bottom': '100px',
      'padding-top': '50px'
    }
    wrapper = createWrapper(tltCollapseTransition)
    wrapper.vm.currentStyles = styles
    wrapper.vm._setDimensions(el, value)
    Object.keys(wrapper.vm.currentStyles).forEach(key => {
      expect(el.style[key]).toBe(value[key])
    })
  })

  it('method _forceRepaint. Checks whether getComputedStyle was called', () => {
    const spy = vi.spyOn(window, 'getComputedStyle')
    wrapper = createWrapper(tltCollapseTransition)
    wrapper.vm._forceRepaint(el)
    expect(spy).toHaveBeenCalledWith(el)
  })

  it('method _getStyleValue. Checks whether getComputedStyle was called', () => {
    const spy = vi.spyOn(window, 'getComputedStyle')
    wrapper = createWrapper(tltCollapseTransition)
    wrapper.vm._getStyleValue(el)
    expect(spy).toHaveBeenCalledWith(el, null)
  })
})
