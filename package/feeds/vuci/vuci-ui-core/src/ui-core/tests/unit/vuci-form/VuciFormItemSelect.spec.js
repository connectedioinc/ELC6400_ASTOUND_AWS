import VuciFormItemSelect from '@ui-core/vuci-form/src/VuciFormItemSelect'
import createWrapper from '../mockFactory'

const defaultVuciSection = {
  sectionId: 'cfg1123',
  name: 'point',
  uciData: {
    id: 'certificate'
  },
  dataKey: 'id',
  getEndpoint: () => 'test',
  registerInput: () => {},
  dependForm: {}
}

describe('VuciFormItemSelect.vue', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each`
    options                      | data                                                                                                                | result
    ${[]}                        | ${{}}                                                                                                               | ${[]}
    ${sections => sections.data} | ${{ data: [['section1', 'data1', 'depend1'], ['section2', 'data2', 'depend2'], ['section3', 'data3', 'depend3']] }} | ${[{ depend: 'depend1', key: 'section1', value: 'data1' }, { depend: 'depend2', key: 'section2', value: 'data2' }, { depend: 'depend3', key: 'section3', value: 'data3' }]}
    ${sections => sections.data} | ${{ data: ['section1', 'data1'] }}                                                                                  | ${[{ key: 'section1', value: 'section1' }, { key: 'data1', value: 'data1' }]}
    ${sections => sections.data} | ${{ data: [10, 5, 20] }}                                                                                            | ${[10, 5, 20]}
  `('computes convertedDataSource when options is $options', ({ options, data, result }) => {
    wrapper = createWrapper(VuciFormItemSelect, {
      props: {
        options,
        uciSection: data
      }
    })
    expect(wrapper.vm.convertedDataSource).toEqual(result)
  })

  it.each`
    disabledOptions           | result
    ${[]}                     | ${[]}
    ${['server', 'Server']}   | ${[{ key: 'server', value: 'server' }, { key: 'Server', value: 'Server' }]}
    ${[['server', 'Server']]} | ${[{ key: 'server', value: 'Server' }]}
    ${[1, 50, 20]}            | ${[1, 50, 20]}
  `('computes convertedDisabled when disabledOptions is $disabledOptions', ({ disabledOptions, result }) => {
    wrapper = createWrapper(VuciFormItemSelect, {
      props: {
        disabledOptions
      }
    })
    expect(wrapper.vm.convertedDisabled).toEqual(result)
  })

  it.each`
    model          | tempValue      | result
    ${'testModel'} | ${'testModel'} | ${false}
    ${'testModel'} | ${''}          | ${true}
  `('computes availableModel when model is $model and tempValue is $tempValue', ({ model, tempValue, result }) => {
    wrapper = createWrapper(VuciFormItemSelect, {
      computed: {
        ...VuciFormItemSelect.computed,
        model() {
          return model
        }
      }
    })
    wrapper.setData({ tempValue })
    expect(wrapper.vm.availableModel).toBe(result)
  })

  it.each`
    multiple | value                      | converted
    ${false} | ${'testValue'}             | ${'testValue'}
    ${true}  | ${'testValue1 testValue2'} | ${['testValue1', 'testValue2']}
  `('method convertUciValue. Returns converted value of $converted when multiple $multiple and value %value', async ({ multiple, value, converted }) => {
    wrapper = createWrapper(VuciFormItemSelect, {
      props: {
        multiple
      }
    })
    const result = wrapper.vm.convertUciValue(value)
    expect(result).toEqual(converted)
  })

  it('method initializeItem. Returns when item is invisible', () => {
    wrapper = createWrapper(VuciFormItemSelect, {
      computed: {
        ...VuciFormItemSelect.computed,
        visible() {
          return false
        }
      }
    })
    wrapper.vm.registerInput = vi.fn()
    wrapper.vm.initializeItem()
    expect(wrapper.vm.registerInput).not.toHaveBeenCalled()
  })

  it.each`
    model        | initial | dataSource
    ${''}        | ${'0'}  | ${undefined}
    ${null}      | ${'1'}  | ${undefined}
    ${undefined} | ${''}   | ${[{ key: 1 }]}
  `('method initializeItem. Initializes item when model is $model and initial is $initial', ({ model, initial, dataSource }) => {
    const name = 'testSelect'
    const uciSection = {
      cfg1123: {}
    }
    wrapper = createWrapper(VuciFormItemSelect, {
      global: {
        provide: {
          vuciSection: defaultVuciSection
        }
      },
      props: {
        initial,
        name,
        uciSection
      }
    })
    vi.spyOn(wrapper.vm, 'convertedDataSource', 'get').mockReturnValue(dataSource)
    const spy = vi.spyOn(wrapper.vm.vuciSection, 'registerInput')
    wrapper.vm.model = model
    wrapper.vm.initializeItem()
    expect(wrapper.vm.model).toBe(initial || dataSource?.[0].key)
    expect(spy).toHaveBeenCalledWith(uciSection[defaultVuciSection.sectionId], wrapper.vm)
    expect(wrapper.vm.uciSection.testSelect).toBe(initial || dataSource?.[0].key)
  })
})
