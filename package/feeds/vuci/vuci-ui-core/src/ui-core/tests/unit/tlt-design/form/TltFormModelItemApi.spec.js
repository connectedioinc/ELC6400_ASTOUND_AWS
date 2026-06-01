import TltFormModelItemApi from '@ui-core/tlt-design/form/TltFormModelItemApi.vue'
import TltHint from '@ui-core/tlt-design/widgets/TltHint.vue'
import createWrapper from '../../mockFactory'

describe('TltFormModelItemApi.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(TltFormModelItemApi, {
      stubs: {
        TltHint
      }
    })
  })
  it('check if TltFormModelItemApi.vue component exists', () => {
    expect(wrapper.findComponent(TltFormModelItemApi).exists()).toBe(true)
  })
  it.each`
    propName                | propValue
    ${'rawhtml'}            | ${true}
    ${'help'}               | ${'Test'}
    ${'label'}              | ${'Formats the last inserted USB to format used by Network Share - NTFS'}
    ${'prop'}               | ${'Test'}
    ${'visible'}            | ${true}
    ${'rules'}              | ${{}}
    ${'tltInput'}           | ${true}
    ${'inputValue'}         | ${'Test'}
    ${'labelWidth'}         | ${'Test'}
    ${'validationMessages'} | ${[]}
    ${'valid'}              | ${true}
  `('check if $propName prop is passed', ({ propName, propValue }) => {
    wrapper = createWrapper(TltFormModelItemApi, { propsData: { [propName]: propValue }, stubs: { TltHint } })
    expect(wrapper.props()[propName]).toStrictEqual(propValue)
  })
  it('showMessage is true by default', () => {
    wrapper = createWrapper(TltFormModelItemApi, { propsData: { label: 'Test' }, stubs: { TltHint } })
    expect(wrapper.vm.showMessage).toBe(true)
  })
  it('check parseValues method when argument is props.label', async () => {
    wrapper = createWrapper(TltFormModelItemApi, { propsData: { label: 'Test' }, stubs: { TltHint } })
    const result = await wrapper.vm.parseValues(wrapper.props().label)
    expect(result).toEqual('Test')
  })
  it.each`
    value                         | type        | result
    ${'test'}                     | ${'string'} | ${'test'}
    ${['test', 'test2', 'test3']} | ${'array'}  | ${'test , test2 , test3'}
  `('check what returns parseValues if type is $type', async ({ value, result }) => {
    const res = await wrapper.vm.parseValues(value)
    expect(res).toBe(result)
  })
})
