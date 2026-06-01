import TltFormModel from '@ui-core/tlt-design/form/TltFormModel.vue'
import createWrapper from '../../mockFactory'

describe('TltFormModel.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(TltFormModel)
  })
  it('check if TltFormModel.vue component exists', () => {
    expect(wrapper.findComponent(TltFormModel).exists()).toBe(true)
  })
  it.each`
    propName   | propValue
    ${'model'} | ${{}}
    ${'rules'} | ${{}}
  `('check if $propName prop is passed', ({ propName, propValue }) => {
    wrapper = createWrapper(TltFormModel, { props: { [propName]: propValue } })
    expect(wrapper.props()[propName]).toStrictEqual(propValue)
  })
  it('render slot', () => {
    wrapper = createWrapper(TltFormModel, { slots: { default: 'Main Content' } })
    expect(wrapper.html()).toContain('Main Content')
  })
  it('method getFieldsData return object', async () => {
    const res = await wrapper.vm.getFieldsData()
    await wrapper.vm.$nextTick()
    expect(res).toStrictEqual({})
  })
  it('if not vm.$slots.default not exitst method validate resolves object only with valid', async () => {
    const res = await wrapper.vm.validate()
    expect(res.message).not.toBe(true)
    expect(res.valid).toBe(true)
  })
})
