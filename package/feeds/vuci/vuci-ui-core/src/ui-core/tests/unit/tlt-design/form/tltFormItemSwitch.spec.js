import tltFormItemSwitch from '@ui-core/tlt-design/form/tltFormItemSwitch.vue'
import tltFormItemTemplate from '@ui-core/tlt-design/form/tltFormItemTemplate.vue'
import TltFormModelItem from '@ui-core/tlt-design/form/TltFormModelItem.vue'
import TltCheckBox from '@ui-core/tlt-design/form/core/TltCheckBox.vue'
import tltSwitch from '@ui-core/tlt-design/form/core/tltSwitch.vue'
import TltHint from '@ui-core/tlt-design/widgets/TltHint.vue'
import createWrapper, { mergeDeep } from '../../mockFactory'

describe('tltFormItemSwitch.vue', () => {
  let wrapper
  function _createWrapper(overrides = {}) {
    return createWrapper(
      tltFormItemSwitch,
      mergeDeep({ shallow: false, props: { prop: 'test' }, global: { components: { tltFormItemTemplate, TltFormModelItem, TltHint, TltCheckBox, tltSwitch } } }, overrides)
    )
  }
  beforeEach(() => {
    wrapper = _createWrapper()
  })
  it('check if tltFormItemSwitch.vue component exists', () => {
    expect(wrapper.findComponent(tltFormItemSwitch).exists()).toBe(true)
  })
  it.each`
    propName        | propValue
    ${'label'}      | ${'test'}
    ${'modelValue'} | ${true}
    ${'checkbox'}   | ${false}
    ${'help'}       | ${'Test'}
    ${'rawhtml'}    | ${false}
    ${'trueValue'}  | ${1}
    ${'falseValue'} | ${0}
  `('check if $propName prop is passed', ({ propName, propValue }) => {
    wrapper = _createWrapper({ props: { [propName]: propValue } })
    expect(wrapper.props()[propName]).toBe(propValue)
  })
  it('inputValue is false by default', () => {
    expect(wrapper.vm.inputValue).toBe(false)
  })
  it('renders TltCheckBox when checkbox is true ', () => {
    wrapper = _createWrapper({ props: { checkbox: true } })
    expect(wrapper.findComponent(wrapper.vm.$.appContext.components.TltCheckBox).exists()).toBe(true)
  })
  it('renders tltSwitch when checkbox is false ', () => {
    wrapper = _createWrapper({ props: { checkbox: false } })
    expect(wrapper.findComponent(wrapper.vm.$.appContext.components.tltSwitch).exists()).toBe(true)
  })
  it('passes prop type to tltCheckbox when prop checkbox is true', () => {
    wrapper = _createWrapper({ props: { checkbox: true } })
    expect(wrapper.findComponent(wrapper.vm.$.appContext.components.TltCheckBox).props().type).toBe('checkbox')
  })
  it('updates checkbox value from false to true', async () => {
    wrapper = _createWrapper({ props: { checkbox: true } })
    wrapper.setData({ inputValue: true })
    const checkbox = wrapper.find('input[type="checkbox"]')
    await wrapper.vm.$nextTick()
    expect(checkbox.element.checked).toBe(true)
  })
  it('emits change event on _valueWatcher', async () => {
    wrapper.vm.$emit('change')
    wrapper.vm._valueWatcher()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('change')).toBeTruthy()
  })
})
