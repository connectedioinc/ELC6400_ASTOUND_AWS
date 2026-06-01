import IoJugglerConditions from '../../src/views/services/IoJugglerConditions.vue'
import createWrapper from '@tests/unit/mockFactory'
const typeOptions = [
  ['io', 'I/O'],
  ['minute', 'Minute'],
  ['hour', 'Hour'],
  ['weekday', 'Week day'],
  ['monthday', 'Month day'],
  ['yearday', 'Year day'],
  ['bool', 'Boolean group']
]
const typeOptionsWithAdc = [...typeOptions].concat([['analog', 'Analog voltage']])
const typeOptionsWithAdcAcl = [...typeOptions].concat([['analog', 'ADC/ACL']])

describe('IoJugglerConditions.vue', () => {
  it.each([
    [false, false, 'analog', 'Analog voltage'],
    [true, true, 'analog', 'ADC/ACL']
  ])('formats type value', (adc, acl, value, result) => {
    const wrapper = createWrapper(IoJugglerConditions, {
      computed: {
        hasAdc() {
          return adc
        },
        hasAcl() {
          return acl
        }
      }
    })
    expect(wrapper.vm.displayType(value)).toEqual(result)
  })
  it.each([
    [[], { valid: true }],
    [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], { valid: false, message: 'Condition limit reached, no more than 10 can be created' }],
    [[{ ui_name: 'test' }, { ui_name: 'test' }], { valid: false, message: 'Condition with the same name already exists' }]
  ])('check if no more than 10 elements added ', (value, result) => {
    const wrapper = createWrapper(IoJugglerConditions, {
      computed: {
        filteredIoData() {
          return []
        }
      }
    })
    expect(wrapper.vm.addValidate({ ui_name: 'test' }, value)).toEqual(result)
  })
  it.each([
    [false, false, typeOptions],
    [true, false, typeOptionsWithAdc],
    [true, true, typeOptionsWithAdcAcl]
  ])('loads type options', async (adc, acl, result) => {
    const wrapper = createWrapper(IoJugglerConditions, {
      computed: {
        filteredIoData() {
          return []
        }
      }
    })
    const options = wrapper.vm.typeOptions(adc, acl)
    expect(options).toEqual(result)
  })
  it('loads io status from api', async () => {
    const wrapper = createWrapper(IoJugglerConditions, {
      computed: {
        filteredIoData() {
          return []
        }
      }
    })
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({})
    await wrapper.vm.afterLoad()
  })
  it('fails to load io status from api', async () => {
    const wrapper = createWrapper(IoJugglerConditions, {
      computed: {
        filteredIoData() {
          return []
        }
      }
    })
    wrapper.vm.$axios.get = vi.fn().mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalled()
  })
  it.each([
    [[{ type: 'test' }], false],
    [[{ type: 'acl' }], true]
  ])('checks if acl supported', (ioInfo, result) => {
    const wrapper = createWrapper(IoJugglerConditions, {
      global: {
        mocks: {
          $io: {
            getFilteredPinsInfo: vi.fn().mockReturnValueOnce(ioInfo)
          }
        }
      }
    })
    const modems = wrapper.vm.hasAcl
    expect(modems).toEqual(result)
  })
  it('returns filtered io data', () => {
    const wrapper = createWrapper(IoJugglerConditions, {})
    wrapper.vm.$io.getFilteredPinsInfo = vi.fn()
    wrapper.vm.$io.getFilteredPinsInfo.mockReturnValueOnce('test')
    expect(wrapper.vm.filteredIoData).toEqual('test')
  })
  it.each([
    [[{ type: 'test' }], false],
    [[{ type: 'adc' }], true]
  ])('checks if adc supported', (ioInfo, result) => {
    const wrapper = createWrapper(IoJugglerConditions, {
      global: {
        mocks: {
          $io: {
            getFilteredPinsInfo: vi.fn().mockReturnValueOnce(ioInfo)
          }
        }
      }
    })
    const modems = wrapper.vm.hasAdc
    expect(modems).toEqual(result)
  })
})
