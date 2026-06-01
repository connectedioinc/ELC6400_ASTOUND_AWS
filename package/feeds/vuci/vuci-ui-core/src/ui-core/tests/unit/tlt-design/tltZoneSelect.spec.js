import TltZoneSelect from '@ui-core/tlt-design/form/core/TltZoneSelect.vue'
import createWrapper from '../mockFactory'

describe('VuciFormItemZoneSelect.vue', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each`
    options                                                                                                   | result
    ${[]}                                                                                                     | ${[]}
    ${[['section1', 'data1', 'depend1'], ['section2', 'data2', 'depend2'], ['section3', 'data3', 'depend3']]} | ${[{ key: 'section1', network: 'zone', value: 'data1' }, { key: 'section2', network: 'zone', value: 'data2' }, { key: 'section3', network: 'zone', value: 'data3' }]}
    ${['section1', 'section2']}                                                                               | ${[{ key: 'section1', network: 'zone', value: 'section1' }, { key: 'section2', network: 'zone', value: 'section2' }]}
    ${[10, 5, 20]}                                                                                            | ${[10, 5, 20]}
  `('computes convertedDataSource when options is $options', ({ options, result }) => {
    wrapper = createWrapper(TltZoneSelect, {
      propsData: {
        options,
        zones: [
          { name: 'section1', network: 'zone' },
          { name: 'section2', network: 'zone' },
          { name: 'section3', network: 'zone' }
        ]
      }
    })
    expect(wrapper.vm.convertedDataSource).toEqual(result)
  })
})
