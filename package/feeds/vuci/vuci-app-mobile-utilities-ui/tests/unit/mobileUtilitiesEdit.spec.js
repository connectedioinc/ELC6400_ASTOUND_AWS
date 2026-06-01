import { ref } from 'vue'
import createWrapper from '@tests/unit/mockFactory'
import UtilitiesEdit from '@/components/shared/MobileUtilities/MobileUtilitiesEditSection.vue'
import { getAllParameters } from '@/utils/message-parameters'
import { mobile } from '@/plugins/mobile'
vi.mock('@/utils/message-parameters')

describe('UtilitiesEdit.vue', () => {
  const stubs = {
    'tlt-tabs': { template: '<div />' }
  }

  const props = {
    uciData: ref({}),
    section: ref({}),
    endpoint: ref(''),
    title: ref(''),
    dataKey: ref('')
  }

  it.each`
    title                 | ios                                              | result
    ${'no ios are given'} | ${undefined}                                     | ${[]}
    ${'ios are given'}    | ${[{ name_with_pins: 'gpio', io_param: 'out' }]} | ${['gpio - %out']}
  `('returns io hint options when $title', ({ ios, result }) => {
    const wrapper = createWrapper(UtilitiesEdit, {
      props,
      global: {
        stubs,
        provide: {
          mobileUtilitiesOptions: ref({
            ios
          })
        }
      }
    })
    expect(wrapper.vm.ioHints).toEqual(result)
  })

  it.each`
    action      | gpios               | result
    ${'io_set'} | ${[{ id: 'gpio' }]} | ${true}
    ${'relay'}  | ${[{ id: 'gpio' }]} | ${false}
  `('returns gpio depends when action is $action', ({ action, result }) => {
    const wrapper = createWrapper(UtilitiesEdit, {
      props: {
        ...props,
        section: {
          io: 'gpio',
          action
        }
      },
      global: {
        stubs,
        provide: {
          mobileUtilitiesOptions: ref({
            ios: [{ id: 'gpio', type: 'gpio', direction: 'out', bi_dir: '1' }]
          })
        }
      }
    })
    expect(wrapper.vm.gpioDepends).toEqual(result)
  })

  it.each`
    action      | relays               | result
    ${'io_set'} | ${[{ id: 'relay' }]} | ${true}
    ${'relay'}  | ${[{ id: 'relay' }]} | ${true}
  `('returns relay depends when action is $action', ({ action, result }) => {
    const wrapper = createWrapper(UtilitiesEdit, {
      props: {
        ...props,
        section: {
          io: 'relay',
          action
        }
      },
      global: {
        stubs,
        provide: {
          mobileUtilitiesOptions: ref({
            ios: [{ id: 'relay', type: 'relay', direction: 'out', bi_dir: '1' }]
          })
        }
      }
    })
    expect(wrapper.vm.relayDepends).toEqual(result)
  })

  it.each`
    action      | result
    ${'mobile'} | ${'vuci-form-item-switch'}
    ${'test'}   | ${'vuci-form-item-select'}
  `('returns state type when action is $action', ({ action, result }) => {
    const wrapper = createWrapper(UtilitiesEdit, {
      props: {
        ...props,
        section: {
          action: action
        }
      },
      global: {
        stubs
      }
    })
    expect(wrapper.vm.stateType).toEqual(result)
  })

  it.each`
    relayDepends | gpioDepends | result
    ${true}      | ${false}    | ${{ help: 'State of the relay.', options: [['0', 'Closed'], ['1', 'Open']] }}
    ${false}     | ${true}     | ${{ help: 'State of the I/O.', options: [['0', 'Low'], ['1', 'High']] }}
    ${false}     | ${false}    | ${{ help: 'State of the rule. It can be turned on or off.', depend: false }}
  `('returns state props when relayDepends is $relayDepends and gpioDepends is $gpioDepends', ({ relayDepends, gpioDepends, result }) => {
    const wrapper = createWrapper(UtilitiesEdit, {
      props: {
        ...props,
        section: {
          io: 'test',
          action: relayDepends ? 'relay' : gpioDepends ? 'io_set' : ''
        }
      },
      global: {
        stubs,
        provide: {
          mobileUtilitiesOptions: ref({
            ios: [{ type: 'relay' }, { type: 'gpio', id: 'test', direction: 'out', bi_dir: '1' }]
          })
        }
      }
    })
    wrapper.vm.getActionDepends = vi.fn().mockReturnValueOnce(false)
    expect(wrapper.vm.stateProps).toEqual(result)
  })

  it.each`
    action        | ios                                                                                                      | result
    ${'relay'}    | ${[{ name_with_pins: 'Input (3)', io_param: 'g2' }]}                                                     | ${'Router name - %rn; WAN IPv4 - %wi; Data Connection state - %cs; Network type - %ct; Signal strength - %ss;'}
    ${'iostatus'} | ${[{ name_with_pins: 'Input (3)', io_param: 'g2' }]}                                                     | ${'Input (3) - %g2'}
    ${'iostatus'} | ${[{ name_with_pins: 'Input (3)', io_param: 'g2' }, { name_with_pins: 'Relay (5,10)', io_param: 'g7' }]} | ${'Input (3) - %g2; Relay (5,10) - %g7'}
  `('returns message placeholder when action is $action and ioHint is $ioHints', ({ action, ios, result }) => {
    const wrapper = createWrapper(UtilitiesEdit, {
      props: {
        ...props,
        section: { action }
      },
      global: {
        stubs,
        provide: {
          mobileUtilitiesOptions: ref({
            ios
          })
        }
      }
    })
    expect(wrapper.vm.messagePlaceholder).toEqual(result)
  })

  it.each`
    title               | isSmsEdit | result
    ${'SMS Utilities'}  | ${true}   | ${{ depend: false }}
    ${'Call Utilities'} | ${false}  | ${{ depend: false }}
  `('returns message props when section is $title', ({ isSmsEdit, result }) => {
    const wrapper = createWrapper(UtilitiesEdit, {
      props,
      global: {
        stubs,
        provide: {
          isSmsView: isSmsEdit
        }
      }
    })
    wrapper.vm.getActionDepends = vi.fn().mockReturnValueOnce(false)
    expect(wrapper.vm.messageProps).toEqual(result)
  })

  const modemOptions = [
    ['3-1', 'Primary modem'],
    ['3-2', 'Secondary modem']
  ]

  it.each`
    mobileModems       | expectedResult
    ${[{ id: '3-1' }]} | ${modemOptions}
    ${undefined}       | ${[]}
  `('returns modem options', ({ mobileModems, expectedResult }) => {
    const wrapper = createWrapper(UtilitiesEdit, {
      global: {
        stubs,
        provide: {
          mobileUtilitiesOptions: ref({
            mobileModems
          })
        }
      },
      props
    })
    mobile.modemsOptions = vi.fn().mockReturnValueOnce(expectedResult)
    expect(wrapper.vm.modems).toEqual(expectedResult)
  })

  it.each`
    mobileModems       | expectedResult
    ${[{ mode: '1' }]} | ${modemOptions}
    ${[{ mode: '0' }]} | ${[]}
  `('returns disabled modem options', ({ mobileModems, expectedResult }) => {
    const wrapper = createWrapper(UtilitiesEdit, {
      global: {
        stubs,
        provide: {
          mobileUtilitiesOptions: ref({
            mobileModems
          })
        }
      },
      props
    })
    mobile.modemsOptions = vi.fn().mockReturnValue(expectedResult)
    expect(wrapper.vm.disabledModems).toEqual(expectedResult)
  })

  it('returns receiving modem options', () => {
    const wrapper = createWrapper(UtilitiesEdit, {
      global: {
        stubs
      },
      props
    })
    mobile.modemsOptions = vi.fn().mockReturnValue([['primary', 'Primary']])
    expect(wrapper.vm.receivingModem).toEqual([
      ['both', 'Both modems'],
      ['primary', 'Primary']
    ])
  })

  it.each`
    mobileModems                               | results
    ${[{ version: 'EC25AFFD', offline: '0' }]} | ${[...modemOptions, ['both', 'Both modems']]}
    ${[{ version: 'test', offline: '1' }]}     | ${[...modemOptions, ['both', 'Both modems']]}
    ${[{ version: 'test', offline: '0' }]}     | ${[['both', 'Both modems']]}
    ${undefined}                               | ${[['both', 'Both modems']]}
  `('returns disabled receiving modem options', ({ mobileModems, results }) => {
    const wrapper = createWrapper(UtilitiesEdit, {
      global: {
        stubs,
        provide: {
          mobileUtilitiesOptions: ref({
            mobileModems
          })
        }
      },
      props
    })
    mobile.modemOffline = vi.fn().mockReturnValue(mobileModems?.[0]?.offline === '1')
    mobile.modemsOptions = vi.fn().mockReturnValueOnce(results)
    expect(wrapper.vm.disabledReceivingModem).toEqual(results)
  })

  it.each`
    title               | isSmsEdit | result
    ${'SMS Utilities'}  | ${true}   | ${{ help: 'Modem, which is used to get information from or managed for change mobile settings action.', disabledOptions: [] }}
    ${'Call Utilities'} | ${false}  | ${{ help: 'Modem, which is used to get information from or managed for switch mobile data action.', disabledOptions: 'testOption' }}
  `('returns infoModemProps when section is $title', ({ isSmsEdit, result }) => {
    const wrapper = createWrapper(UtilitiesEdit, {
      global: {
        stubs,
        provide: {
          isSmsView: isSmsEdit
        }
      },
      props
    })
    mobile.modemsOptions = vi.fn().mockReturnValue('testOption')
    expect(wrapper.vm.infoModemProps).toEqual(result)
  })

  it.each`
    title               | isSmsEdit | result
    ${'SMS Utilities'}  | ${true}   | ${{ depend: false, disabledOptions: [] }}
    ${'Call Utilities'} | ${false}  | ${{ depend: false, disabledOptions: 'testOption' }}
  `('returns sendModemProps when section is $title', ({ isSmsEdit, result }) => {
    const wrapper = createWrapper(UtilitiesEdit, {
      global: {
        stubs,
        provide: {
          isSmsView: isSmsEdit
        }
      },
      props
    })
    mobile.modemsOptions = vi.fn().mockReturnValue('testOption')
    expect(wrapper.vm.sendModemProps).toEqual(result)
  })

  it.each`
    code   | result
    ${1}   | ${'Unable to edit "I/O set" rule. Output scheduler is enabled for selected output pin'}
    ${103} | ${'Such sms text already exists'}
    ${21}  | ${'An unexpected error occurred'}
  `('returns getHandleError when error code is $code', ({ code, result }) => {
    const wrapper = createWrapper(UtilitiesEdit, {
      props,
      global: {
        stubs
      }
    })
    const err = {
      data: {
        errors: [{ code }]
      }
    }
    expect(wrapper.vm.getHandleError(err)).toEqual(result)
  })

  it('returns action depend', () => {
    const wrapper = createWrapper(UtilitiesEdit, {
      props,
      global: {
        stubs
      }
    })
    expect(wrapper.vm.getActionDepends('stateType', 'mobile')).toEqual(true)
  })

  it('returns formated parameters', () => {
    const wrapper = createWrapper(UtilitiesEdit, {
      props,
      global: {
        stubs
      }
    })
    getAllParameters.mockReturnValue([
      ['rn', 'Router name'],
      ['wi', 'WAN IP address']
    ])
    expect(wrapper.vm.formattedParameters).toEqual([
      { description: 'Router name', parameter: '%rn' },
      { description: 'WAN IP address', parameter: '%wi' }
    ])
  })
})
