import tltFormItemTemplate from '@ui-core/tlt-design/form/tltFormItemTemplate.vue'
import createWrapper from '../../mockFactory'

describe('tltFormItemTemplate.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(tltFormItemTemplate, {
      global: { stubs: { 'tlt-form-model-item': true } }
    })
  })
  it('check if tltFormItemTemplate.vue component exists', () => {
    expect(wrapper.findComponent(tltFormItemTemplate).exists()).toBe(true)
  })
  it.each`
    propName           | propValue
    ${'visible'}       | ${false}
    ${'help'}          | ${'Test'}
    ${'label'}         | ${'test'}
    ${'prop'}          | ${''}
    ${'rules'}         | ${{}}
    ${'modelValue'}    | ${'Test'}
    ${'labelWidth'}    | ${''}
    ${'rawhtml'}       | ${false}
    ${'validatorHint'} | ${''}
    ${'maxlength'}     | ${'1000'}
    ${'minlength'}     | ${'1'}
    ${'datatype'}      | ${''}
    ${'required'}      | ${false}
    ${'depend'}        | ${true}
  `('check if $propName prop is passed', ({ propName, propValue }) => {
    wrapper = createWrapper(tltFormItemTemplate, {
      props: { [propName]: propValue },
      global: { stubs: { 'tlt-form-model-item': true } }
    })
    expect(wrapper.props()[propName]).toStrictEqual(propValue)
  })
  it('render slot with given text', () => {
    wrapper = createWrapper(tltFormItemTemplate, {
      slots: { default: 'Main Content' },
      global: { stubs: { 'tlt-form-model-item': { template: '<slot />' } } }
    })
    expect(wrapper.html()).toContain('Main Content')
  })
  it.each`
    visible  | result
    ${true}  | ${true}
    ${false} | ${false}
  `('render tlt-form-model-item component if props visible is $visible', ({ visible, result }) => {
    wrapper = createWrapper(tltFormItemTemplate, { props: { visible }, global: { stubs: { 'tlt-form-model-item': true } } })
    expect(wrapper.isVisible()).toBe(result)
  })
  it.each`
    valid    | result
    ${true}  | ${true}
    ${false} | ${false}
  `('when mocked value is $valid method validate returns $result', async ({ valid, result }) => {
    wrapper.vm.$refs.formItem.validate = () => new Promise(resolve => resolve(valid))
    const res = await wrapper.vm.validate()
    expect(res).toBe(result)
  })
})
