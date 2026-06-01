import TltFormAccordion from '@ui-core/tlt-design/form/TltFormAccordion.vue'
import createWrapper from '../../mockFactory'
const stubs = { 'tlt-icon': true, 'tlt-form-item-template': true, 'tlt-collapse-transition': true }
const overrides = { props: { name: 'test' }, global: { stubs, mocks: { $route: { path: '/network/lan' } } } }

describe('TltFormAccordion', () => {
  it('should initialize with the correct default data', () => {
    // Arrange
    const wrapper = createWrapper(TltFormAccordion, overrides)
    const { vm } = wrapper
    // Assert
    expect(vm.name).equal('test')
    expect(vm.show).equal(false)
    expect(vm.text).equal('Show advanced settings')
    expect(vm.storageKey).equal('network-lan-test-form-accordion')
  })

  it('onShowClick() should toggle the "show" data property', () => {
    const wrapper = createWrapper(TltFormAccordion, overrides)
    const { vm } = wrapper

    vm.onShowClick()
    expect(vm.show).equal(true)
    vm.onShowClick()
    expect(vm.show).equal(false)
  })

  // You can write more tests to cover other methods and computed properties.

  it('should persist "show" state in local storage', () => {
    // Arrange
    const wrapper = createWrapper(TltFormAccordion, overrides)
    const { vm } = wrapper

    vm.onShowClick()
    const storedShowState = localStorage.getItem(vm.storageKey)
    expect(storedShowState).equal('true')
  })
})
