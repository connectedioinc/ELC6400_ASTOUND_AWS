import tltFormItemPassword from '@ui-core/tlt-design/form/tltFormItemPassword.vue'
import tltFormItemTemplate from '@ui-core/tlt-design/form/tltFormItemTemplate.vue'
import TltFormModelItem from '@ui-core/tlt-design/form/TltFormModelItem.vue'
import TltInputPassword from '@ui-core/tlt-design/form/core/TltInputPassword.vue'
import tltInput from '@ui-core/tlt-design/form/core/tltInput.vue'
import TltHint from '@ui-core/tlt-design/widgets/TltHint.vue'
import createWrapper, { mergeDeep } from '../../mockFactory'

describe('tltFormItemPassword.vue', () => {
  let wrapper
  function _createWrapper(overrides = {}) {
    return createWrapper(
      tltFormItemPassword,
      mergeDeep({ shallow: false, props: { prop: 'test' }, global: { components: { tltFormItemTemplate, TltFormModelItem, TltHint, TltInputPassword, tltInput } } }, overrides)
    )
  }
  beforeEach(() => {
    wrapper = _createWrapper()
  })
  it('check if tltFormItemPassword.vue component exists', () => {
    expect(wrapper.findComponent(tltFormItemPassword).exists()).toBe(true)
  })
  it.each`
    propName             | propValue
    ${'label'}           | ${'test'}
    ${'modelValue'}      | ${'Test'}
    ${'help'}            | ${'Test'}
    ${'prop'}            | ${''}
    ${'placeholder'}     | ${''}
    ${'useAutocomplete'} | ${false}
  `('check if $propName prop is passed', ({ propName, propValue }) => {
    wrapper = _createWrapper({ props: { [propName]: propValue } })
    expect(wrapper.props()[propName]).toBe(propValue)
  })
  it('inputValue is empty string by default', () => {
    expect(wrapper.vm.inputValue).toBe('')
  })
  it('updates input value', async () => {
    wrapper.setData({ inputValue: 'test' })
    const inputPassword = wrapper.findComponent(wrapper.vm.$.appContext.components.TltInputPassword)
    await wrapper.vm.$nextTick()
    expect(inputPassword.vm.modelValue).toBe('test')
  })
  it('method resetType calls this.$refs.inputPassword.resetType() method', async () => {
    wrapper.vm.$refs.inputPassword.resetType = vi.fn().mockResolvedValue(true)
    const spy = vi.spyOn(wrapper.vm.$refs.inputPassword, 'resetType')
    wrapper.vm.resetType()
    expect(spy).toHaveBeenCalled()
  })
})
