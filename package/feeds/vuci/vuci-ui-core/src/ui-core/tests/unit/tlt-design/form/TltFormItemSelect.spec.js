import TltFormItemSelect from '@ui-core/tlt-design/form/TltFormItemSelect.vue'
import tltFormItemTemplate from '@ui-core/tlt-design/form/tltFormItemTemplate.vue'
import TltFormModelItem from '@ui-core/tlt-design/form/TltFormModelItem.vue'
import TltHint from '@ui-core/tlt-design/widgets/TltHint.vue'
import TltSelect from '@ui-core/tlt-design/form/core/select/TltSelect.vue'
import tltInput from '@ui-core/tlt-design/form/core/tltInput.vue'
import createWrapper from '../../mockFactory'

describe('TltFormItemSelect.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(TltFormItemSelect, {
      props: { prop: '' },
      global: { stubs: { tltFormItemTemplate, TltFormModelItem, TltHint, TltSelect, tltInput, 'tlt-select-option-list': { template: '<slot :options="{}" />' } } }
    })
  })
  it('check if TltFormItemSelect.vue component exists', () => {
    expect(wrapper.findComponent(TltFormItemSelect).exists()).toBe(true)
  })
  it.each`
    propName             | propValue
    ${'custom'}          | ${false}
    ${'label'}           | ${'test'}
    ${'rawhtml'}         | ${false}
    ${'help'}            | ${'Test'}
    ${'modelValue'}      | ${'Test'}
    ${'options'}         | ${[]}
    ${'multiple'}        | ${false}
    ${'allowCreate'}     | ${false}
    ${'disabledOptions'} | ${[]}
    ${'rules'}           | ${[]}
  `('check if $propName prop is passed', ({ propName, propValue }) => {
    wrapper = createWrapper(TltFormItemSelect, {
      props: { [propName]: propValue, prop: '' },
      global: { stubs: { tltFormItemTemplate, TltFormModelItem, TltHint, TltSelect, tltInput, 'tlt-select-option-list': { template: '<slot :options="{}" />' } } }
    })
    expect(wrapper.props()[propName]).toEqual(propValue)
  })
  it.each`
    options                                                    | result
    ${['1', '2', '3']}                                         | ${[{ key: '1', value: '1' }, { key: '2', value: '2' }, { key: '3', value: '3' }]}
    ${['test1', 'test2', 'test3']}                             | ${[{ key: 'test1', value: 'test1' }, { key: 'test2', value: 'test2' }, { key: 'test3', value: 'test3' }]}
    ${[3, 2, 1]}                                               | ${[3, 2, 1]}
    ${[['a', 'b'], ['c', 'd'], ['e', 'f']]}                    | ${[{ key: 'a', value: 'b', depend: undefined }, { key: 'c', value: 'd', depend: undefined }, { key: 'e', value: 'f', depend: undefined }]}
    ${[['a', 'b', true], ['c', 'd', false], ['e', 'f', true]]} | ${[{ key: 'a', value: 'b', depend: true }, { key: 'c', value: 'd', depend: false }, { key: 'e', value: 'f', depend: true }]}
  `('returns computed convertedDataSource when prop options is $options', ({ options, result }) => {
    wrapper = createWrapper(TltFormItemSelect, {
      props: { options, prop: '' },
      global: { stubs: { tltFormItemTemplate, TltFormModelItem, TltHint, TltSelect, tltInput, 'tlt-select-option-list': { template: '<slot :options="{}" />' } } }
    })
    expect(wrapper.vm.convertedDataSource).toStrictEqual(result)
  })
  it.each`
    disabledOptions                                            | result
    ${['1', '2', '3']}                                         | ${[{ key: '1', value: '1' }, { key: '2', value: '2' }, { key: '3', value: '3' }]}
    ${['test1', 'test2', 'test3']}                             | ${[{ key: 'test1', value: 'test1' }, { key: 'test2', value: 'test2' }, { key: 'test3', value: 'test3' }]}
    ${[3, 2, 1]}                                               | ${[3, 2, 1]}
    ${[['a', 'b'], ['c', 'd'], ['e', 'f']]}                    | ${[{ key: 'a', value: 'b', depend: undefined }, { key: 'c', value: 'd', depend: undefined }, { key: 'e', value: 'f', depend: undefined }]}
    ${[['a', 'b', true], ['c', 'd', false], ['e', 'f', true]]} | ${[{ key: 'a', value: 'b', depend: true }, { key: 'c', value: 'd', depend: false }, { key: 'e', value: 'f', depend: true }]}
  `('returns computed convertedDisabled when prop options is $disabledOptions', ({ disabledOptions, result }) => {
    wrapper = createWrapper(TltFormItemSelect, {
      props: { disabledOptions, prop: '' },
      global: { stubs: { tltFormItemTemplate, TltFormModelItem, TltHint, TltSelect, tltInput, 'tlt-select-option-list': { template: '<slot :options="{}" />' } } }
    })
    expect(wrapper.vm.convertedDisabled).toStrictEqual(result)
  })
  it.each`
    value                                                      | result
    ${['1', '2', '3']}                                         | ${[{ key: '1', value: '1' }, { key: '2', value: '2' }, { key: '3', value: '3' }]}
    ${['test1', 'test2', 'test3']}                             | ${[{ key: 'test1', value: 'test1' }, { key: 'test2', value: 'test2' }, { key: 'test3', value: 'test3' }]}
    ${[3, 2, 1]}                                               | ${[3, 2, 1]}
    ${[['a', 'b'], ['c', 'd'], ['e', 'f']]}                    | ${[{ key: 'a', value: 'b', depend: undefined }, { key: 'c', value: 'd', depend: undefined }, { key: 'e', value: 'f', depend: undefined }]}
    ${[['a', 'b', true], ['c', 'd', false], ['e', 'f', true]]} | ${[{ key: 'a', value: 'b', depend: true }, { key: 'c', value: 'd', depend: false }, { key: 'e', value: 'f', depend: true }]}
  `('check convertToRequiredArr when given argument is $value', ({ value, result }) => {
    wrapper = createWrapper(TltFormItemSelect, {
      props: { prop: '' },
      global: { stubs: { tltFormItemTemplate, TltFormModelItem, TltHint, TltSelect, tltInput, 'tlt-select-option-list': { template: '<slot :options="{}" />' } } }
    })
    expect(wrapper.vm.convertToRequiredArr(value)).toStrictEqual(result)
  })
})
