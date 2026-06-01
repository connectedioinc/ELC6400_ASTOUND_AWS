import createWrapper from '@tests/unit/mockFactory'
import Trap from '../../src/views/services/Trap.vue'
import TrapEdit from '../../src/views/services/TrapEdit.vue'

const validEvents = [
  ['Config', 'Config change'],
  ['DHCP', 'New DHCP client']
]

const validSubtypes = {
  'SIM switch': [
    ['all', 'All'],
    ['to SIM1', 'Changing to SIM1'],
    ['to SIM2', 'Changing to SIM2']
  ]
}

describe('Trap.vue', () => {
  it('returns ioPins', () => {
    const wrapper = createWrapper(Trap)
    wrapper.vm.$io.getFilteredPinsInfo = vi.fn().mockReturnValue([
      { id: 'acl0', name_with_pins: 'Some acl pin', type: 'acl' },
      { id: 'nein', name_with_pins: 'nein', type: 'nein' }
    ])
    expect(wrapper.vm.ioPins).toEqual([['acl0', 'Some acl pin']])
  })
  it('returns ioPinsObj', () => {
    const wrapper = createWrapper(Trap, {
      computed: {
        ...Trap.computed,
        ioPins: () => [
          ['acl0', 'ACL pin'],
          ['relay0', 'Relay pin']
        ]
      }
    })
    expect(wrapper.vm.ioPinsObj).toEqual({
      acl0: 'ACL pin',
      relay0: 'Relay pin'
    })
  })
  it('returns formOptions', () => {
    const wrapper = createWrapper(Trap, { computed: { ioPins: () => [] } })
    expect(wrapper.vm.getFormOptions()).toEqual({ modems: [], ioPins: [], events: [] })
  })
  it('invokes error message when bulk load request fails', async () => {
    const wrapper = createWrapper(Trap)
    wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('An unexpected error has occurred')
  })
  it('invokes error messages when bulk load requests return failed', async () => {
    const wrapper = createWrapper(Trap)
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([{ success: false }, { success: false }])
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('Failed to load modem info')
    expect(spy).toHaveBeenCalledWith('Failed to load I/O status')
  })
  it('loads data after successful bulk request', async () => {
    const wrapper = createWrapper(Trap)
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: true, data: [{}] },
      { success: true, data: [{}] }
    ])
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.modems).toEqual([{}])
    expect(wrapper.vm.ios).toEqual([{}])
  })
  it.each`
    res               | type
    ${'GSM'}          | ${'gsm'}
    ${'Input/Output'} | ${'iotrap'}
    ${'N/A'}          | ${'tester'}
  `('returns $res display type when value is $val', ({ res, type }) => {
    const wrapper = createWrapper(Trap)
    expect(wrapper.vm.displayType('', { uciSection: { type } })).toBe(res)
  })
  it.each`
    res                  | type           | name                  | event
    ${'Signal strength'} | ${'gsm'}       | ${'signalstrtrap'}    | ${undefined}
    ${'Network type'}    | ${'gsm'}       | ${'conntypetrap'}     | ${undefined}
    ${'N/A'}             | ${'gsm'}       | ${'test'}             | ${undefined}
    ${'Some pin'}        | ${'iotrap'}    | ${'acl0'}             | ${undefined}
    ${'N/A'}             | ${'iotrap'}    | ${'acl1'}             | ${undefined}
    ${'Connected'}       | ${'chilli'}    | ${'connectedtrap'}    | ${undefined}
    ${'Disconnected'}    | ${'chilli'}    | ${'disconnectedtrap'} | ${undefined}
    ${'N/A'}             | ${'chilli'}    | ${'test'}             | ${undefined}
    ${'Config change'}   | ${'eventtrap'} | ${'log_event'}        | ${'Config'}
    ${'N/A'}             | ${'nein'}      | ${'nein'}             | ${undefined}
  `('returns $res display name when type is $type and name is $name', ({ res, type, name, event }) => {
    const wrapper = createWrapper(Trap, {
      computed: { ioPinsObj: () => ({ acl0: 'Some pin' }) }
    })
    wrapper.vm.$eventsOptions = {
      getTypes: () => {
        return { Config: 'Config change' }
      }
    }
    expect(wrapper.vm.displayName('', { uciSection: { type, name, event } })).toBe(res)
  })
  it('does not invoke error message when type or name exists', () => {
    const wrapper = createWrapper(Trap)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const data = {
      uciSection: { type: 'test', name: 'test' },
      model: '1'
    }
    wrapper.vm.validateEnable(data)
    expect(spy).not.toHaveBeenCalled()
    expect(data.model).toBe('1')
  })
  it.each([
    ['with empty type, name options', 'Missing required options: Trap type, Trigger', { id: 'test1', enabled: '1', type: '', name: '' }],
    ['with empty singal option, when name is equal signalstrtrap', 'Missing required option: Signal strength', { id: 'test1', enabled: '1', type: 'gsm', name: 'signalstrtrap', signal: '' }],
    [
      'with empty from and to options, when name is equal acl',
      'Missing required options: State change, Min current, Max current',
      { id: 'test1', enabled: '1', type: 'iotrap', name: 'acl', from: '', to: '' }
    ],
    [
      'with empty from and to options, when name is equal adc',
      'Missing required options: Min voltage, Max voltage',
      { id: 'test1', enabled: '1', type: 'iotrap', state: 'stage', name: 'adc', from: '', to: '' }
    ],
    ['with empty name options, when type is equal eventtrap', 'Missing required options: Event, Event subtype', { id: 'test1', enabled: '1', type: 'eventtrap' }],
    ['with empty event and event_mark options, when type is equal chilli', 'Missing required option: Trigger', { id: 'test1', enabled: '1', type: 'chilli' }]
  ])('returns error message when %s', (text, message, sectionValues) => {
    const wrapper = createWrapper(Trap)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const data = {
      uciSection: sectionValues
    }
    wrapper.vm.validateEnable(data)
    expect(spy).toHaveBeenCalledWith(message)
  })
})

describe('TrapEdit.vue', () => {
  it('returns modems', () => {
    const wrapper = createWrapper(TrapEdit, {
      global: {
        provide: {
          formOptions: () => ({ modems: [], ioPins: [] })
        },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue([])
          }
        }
      },
      props: { section: { event: 'Config' } }
    })
    wrapper.vm.$mobile.modemsOptions = vi.fn().mockReturnValueOnce([])
    expect(wrapper.vm.modems).toEqual([])
  })
  it('returns ioPins', () => {
    const wrapper = createWrapper(TrapEdit, {
      global: {
        provide: {
          formOptions: () => ({ modems: [], ioPins: [] })
        },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue([])
          }
        }
      },
      props: { section: {} }
    })
    expect(wrapper.vm.ioPins).toEqual([])
  })
  const allTypes = [
    ['eventtrap', 'Events log'],
    ['gsm', 'GSM'],
    ['iotrap', 'Input/Output'],
    ['chilli', 'Hotspot client']
  ]
  it.each`
    res                              | ios      | modems      | options
    ${[['eventtrap', 'Events log']]} | ${false} | ${[]}       | ${'none'}
    ${allTypes}                      | ${true}  | ${[{}, {}]} | ${'all'}
  `('returns $options trapTypes', ({ modems, ios, res }) => {
    const wrapper = createWrapper(TrapEdit, {
      global: {
        provide: {
          formOptions: () => ({ modems, ioPins: [] })
        },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue([])
          }
        }
      },
      props: { section: {} }
    })
    wrapper.vm.$store.board.hwinfo.ios = ios
    wrapper.vm.chilliInstalled = ios
    expect(wrapper.vm.trapTypes).toEqual(res)
  })
  const gsmNames = [
    ['signalstrtrap', 'Signal strength'],
    ['conntypetrap', 'Network type']
  ]
  const chilliNames = [
    ['connectedtrap', 'Connected'],
    ['disconnectedtrap', 'Disconnected']
  ]
  it.each`
    res            | type
    ${[]}          | ${'iotrap'}
    ${gsmNames}    | ${'gsm'}
    ${chilliNames} | ${'chilli'}
    ${[]}          | ${'?'}
  `('returns $type name field props', ({ type, res }) => {
    const wrapper = createWrapper(TrapEdit, {
      global: {
        provide: { formOptions: () => ({ modems: [], ioPins: [] }) },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue([])
          }
        }
      },
      computed: { ...TrapEdit.computed, ioPins: () => [] },
      props: { section: { type } }
    })
    expect(wrapper.vm.nameProps).toEqual(res)
  })
  it.each`
    res              | name
    ${'Min voltage'} | ${'adc0'}
    ${'Min voltage'} | ${'pwr0'}
    ${'Min current'} | ${'acl0'}
  `('returns $name from field props', ({ name, res }) => {
    const wrapper = createWrapper(TrapEdit, {
      global: {
        provide: { formOptions: () => ({ modems: [], ioPins: [] }) },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue([])
          }
        }
      },
      computed: { ...TrapEdit.computed, ioPins: () => [] },
      props: { section: { name } }
    })
    wrapper.vm.lessThan = vi.fn().mockReturnValue(5)
    expect(wrapper.vm.fromProps.label).toBe(res)
    const rules = wrapper.vm.fromProps.rules
    expect(rules[rules.length - 1]()).toBe(5)
  })
  it.each`
    res              | name
    ${'Max voltage'} | ${'adc0'}
    ${'Max voltage'} | ${'pwr0'}
    ${'Max current'} | ${'acl0'}
  `('returns $name to field props', ({ name, res }) => {
    const wrapper = createWrapper(TrapEdit, {
      global: {
        provide: { formOptions: () => ({ modems: [], ioPins: [] }) },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue([])
          }
        }
      },
      computed: { ...TrapEdit.computed, ioPins: () => [] },
      props: { section: { name } }
    })
    wrapper.vm.moreThan = vi.fn().mockReturnValue(5)
    expect(wrapper.vm.toProps.label).toBe(res)
    const rules = wrapper.vm.toProps.rules
    expect(rules[rules.length - 1]()).toBe(5)
  })
  it.each`
    name        | type        | res
    ${'conn'}   | ${'gsm'}    | ${[]}
    ${'test'}   | ${'iotrap'} | ${[['both', 'Both']]}
    ${'din1'}   | ${'iotrap'} | ${[['both', 'Both'], ['active', 'High level'], ['inactive', 'Low level']]}
    ${'relay0'} | ${'iotrap'} | ${[['both', 'Both'], ['open', 'Open'], ['closed', 'Closed']]}
    ${'dwi0'}   | ${'iotrap'} | ${[['both', 'Both'], ['rising', 'Rising'], ['falling', 'Falling']]}
    ${'adc0'}   | ${'iotrap'} | ${[['both', 'Both'], ['in_range', 'In range'], ['out_of_range', 'Out of range']]}
    ${'pwr0'}   | ${'iotrap'} | ${[['both', 'Both'], ['in_range', 'In range'], ['out_of_range', 'Out of range']]}
  `('returns $name pin state change options when type is $type and name is $name', ({ type, name, res }) => {
    const wrapper = createWrapper(TrapEdit, {
      global: {
        provide: { formOptions: () => ({ modems: [], ioPins: [] }) },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue([])
          }
        }
      },
      computed: { ...TrapEdit.computed, ioPins: () => [] },
      props: { section: { type, name } }
    })
    expect(wrapper.vm.stateChanges).toEqual(res)
  })
  const minValid = { isValid: true }
  const minInvalid = { isValid: false, message: 'Min value should be less than Max value.' }
  it.each`
    valid         | val    | bound  | isValid
    ${minInvalid} | ${'5'} | ${'3'} | ${false}
    ${minValid}   | ${'3'} | ${'5'} | ${true}
  `('returns lessThan isValid $isValid when value is $val and bound is $bound', ({ valid, val, bound }) => {
    const wrapper = createWrapper(TrapEdit, {
      global: {
        provide: {
          formOptions: () => ({ modems: [], ioPins: [] })
        },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue([])
          }
        }
      },
      props: { section: {} }
    })
    expect(wrapper.vm.lessThan(val, bound)).toEqual(valid)
  })
  const maxValid = { isValid: true }
  const maxInvalid = { isValid: false, message: 'Max value should be more than Min value.' }
  it.each`
    valid         | val    | bound  | isValid
    ${maxValid}   | ${'5'} | ${'3'} | ${true}
    ${maxInvalid} | ${'3'} | ${'5'} | ${false}
  `('returns moreThan isValid $isValid when value is $val and bound is $bound', ({ valid, val, bound }) => {
    const wrapper = createWrapper(TrapEdit, {
      global: {
        provide: {
          formOptions: () => ({ modems: [], ioPins: [] })
        },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue([])
          }
        }
      },
      props: { section: {} }
    })
    expect(wrapper.vm.moreThan(val, bound)).toEqual(valid)
  })
  it('returns eventType', async () => {
    const wrapper = createWrapper(TrapEdit, {
      global: {
        provide: {
          formOptions: () => ({ events: [], modems: [] })
        },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue([]),
            getTranslatedTypes: vi.fn().mockReturnValue(validEvents)
          }
        }
      },
      props: { section: {} }
    })
    const val = await wrapper.vm.eventType
    expect(val).toEqual(validEvents)
  })

  it('returns eventSubtypes', async () => {
    const wrapper = createWrapper(TrapEdit, {
      global: {
        provide: {
          formOptions: () => ({ events: [], modems: [] })
        }
      },
      computed: {
        ...TrapEdit.computed,
        translatedSubtypes: () => validSubtypes
      },
      props: { section: {} }
    })
    wrapper.vm.section.event = 'SIM switch'
    const val = await wrapper.vm.eventSubtypes
    expect(val).toEqual(validSubtypes['SIM switch'])
  })
  it('returns empty eventSubtypes', async () => {
    const wrapper = createWrapper(TrapEdit, {
      global: {
        provide: {
          formOptions: () => ({ events: [], modems: [] })
        }
      },
      computed: {
        ...TrapEdit.computed,
        translatedSubtypes: () => validSubtypes
      },
      props: { section: {} }
    })
    wrapper.vm.section.event = 'test'
    const val = await wrapper.vm.eventSubtypes
    expect(val).toEqual([])
  })
  it('returns translatedSubtypes', async () => {
    const wrapper = createWrapper(TrapEdit, {
      global: {
        provide: {
          formOptions: () => ({
            events: {
              'SIM switch': ['all', 'to SIM1', 'to SIM2']
            },
            modems: []
          })
        },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue(validSubtypes)
          }
        }
      },
      props: { section: {} }
    })
    const val = await wrapper.vm.translatedSubtypes
    expect(val).toEqual(validSubtypes)
  })
})
