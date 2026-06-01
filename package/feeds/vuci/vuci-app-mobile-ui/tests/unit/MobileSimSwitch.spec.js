import MobileSimSwitch from '../../src/views/network/MobileSimSwitch.vue'
import MobileSimSwitchEdit from '../../src/views/network/MobileSimSwitchEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

const simSections = [
  {
    id: 'cfg01aa0e',
    position: '1',
    modem: '3-1',
    primary: '1',
    opernum: '24602'
  },
  {
    id: 'cfg02aa0e',
    modem: '3-1',
    position: '2',
    enable_sms_limit: '1'
  }
]

const dataLimits = [
  {
    id: 'cfg01aa0e',
    modem: '3-1',
    sim: '1',
    enabled: '1'
  },
  {
    id: 'cfg02aa0e',
    modem: '3-1',
    sim: '2',
    enabled: '0'
  }
]

const interfaces = [
  {
    id: 'cfg01aa0e',
    proto: 'static'
  },
  {
    id: 'cfg02aa0e',
    proto: 'wwan',
    modem: '3-1'
  }
]

const successfulBulk = [
  {
    success: true,
    data: simSections
  },
  {
    success: true,
    data: dataLimits
  },
  {
    success: true,
    data: interfaces
  }
]

const failedSimcardBulk = [
  {
    success: false,
    data: simSections
  },
  {
    success: true,
    data: dataLimits
  },
  {
    success: true,
    data: interfaces
  }
]

const failedDataLimitBulk = [
  {
    success: true,
    data: simSections
  },
  {
    success: false,
    data: dataLimits
  },
  {
    success: true,
    data: interfaces
  }
]

const failedInterfaceBulk = [
  {
    success: true,
    data: simSections
  },
  {
    success: true,
    data: dataLimits
  },
  {
    success: false,
    data: interfaces
  }
]

describe('MobileSimSwitch.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MobileSimSwitch, {
      global: {
        mocks: {
          $mobile: {
            adjustSimNumber: vi.fn().mockReturnValueOnce('2'),
            modemLowPower: vi.fn().mockReturnValueOnce(false)
          }
        }
      }
    })
  })
  it.each`
    dataProperty    | expected
    ${'simcards'}   | ${simSections}
    ${'interfaces'} | ${interfaces}
    ${'dataLimits'} | ${dataLimits}
  `('check if afterLoad resolve "$dataProperty" data', async ({ dataProperty, expected }) => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(successfulBulk)
    await wrapper.vm.afterLoad()
    expect(wrapper.vm[dataProperty]).toEqual(expected)
  })
  it.each`
    response               | expectedError                              | data
    ${failedSimcardBulk}   | ${'Failed to load SIM card data'}          | ${'simcards'}
    ${failedInterfaceBulk} | ${'Failed to load network configurations'} | ${'interfaces'}
    ${failedDataLimitBulk} | ${'Failed to load data limit data'}        | ${'interfaces'}
  `('check if error is diplayed while loading "$data" data', async ({ response, expectedError }) => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(response)
    const spyError = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spyError).toHaveBeenCalledWith(expectedError)
  })
  it('check if displaySimSlot returns correct SIM slot', () => {
    wrapper.vm.$mobile.getSimLabel = vi.fn().mockReturnValue(2)
    expect(wrapper.vm.displaySimSlot({ position: '2' })).toEqual('SIM2')
  })
  it.each`
    text          | enabled  | section                                                                                                                                                               | switchStatus                                                                                                                                                 | response
    ${'enabled'}  | ${true}  | ${{ id: 'cfg02aa0e', enabled: '1', on_signal: '1', data_limit: '1', sms_limit: '1', roaming: '1', no_network: '1', denied: '1', fail_flag: '1', enable_back: '1' }}   | ${[{ id: 'cfg02aa0e', rules: [{ type: 0, max_fail: 3, fail_count: 1 }, { type: 1, max_fail: 3, fail_count: 2 }, { type: 3, max_fail: 2, fail_count: 2 }] }]} | ${['On weak signal (1/3)', 'On data limit', 'On SMS limit', 'On roaming', 'No network', 'On network denied', 'On data connection fail', 'Switch to next SIM after delay']}
    ${'disabled'} | ${false} | ${{ id: 'cfg02aa0e', enabled: '0', on_signal: '0', data_limit: '0', sms_limit: '0', roaming: '1', no_network: '1', denied: '1', fail_flag: '1', sim_not_ready: '0' }} | ${[{ id: 'cfg02aa0e', rules: [] }]}                                                                                                                          | ${['On weak signal', 'On data limit', 'On SMS limit', 'On SIM not inserted', 'On operator or country code', 'Switch to next SIM after delay']}
  `('check if getConditions returns $text rules list', ({ enabled, section, switchStatus, response }) => {
    wrapper.vm.switchStatus = switchStatus
    expect(wrapper.vm.getConditions(section, enabled)).toEqual(response)
  })
  it('check if disableSwitch returns error message when instance is not configured', () => {
    const section = { id: 'cfg02aa0e', enabled: '1', on_signal: '0', data_limit: '0', sms_limit: '0', roaming: '0', no_network: '0', denied: '0', fail_flag: '0' }
    expect(wrapper.vm.disableSwitch(section)).toEqual('Disabled because SIM switch is not configured')
  })
  it('check if disableSwitch returns false when switch_back enabled', () => {
    const section = {
      id: 'cfg02aa0e',
      enabled: '1',
      on_signal: '0',
      data_limit: '0',
      sms_limit: '0',
      roaming: '0',
      no_network: '0',
      denied: '0',
      fail_flag: '0',
      sim_not_ready: '0',
      enable_back: '1',
      switch_back: '5'
    }
    expect(wrapper.vm.disableSwitch(section)).toEqual(false)
  })
  it.each`
    instances                                                             | simcards                                                                                                             | section                                                             | res
    ${[{ modem: '3-1', position: '1', esim_profile: '1', enabled: '1' }]} | ${[{ primary: '1', modem: '3-1', position: '1', esim_profile: '1' }]}                                                | ${undefined}                                                        | ${true}
    ${[{ modem: '3-1', position: '1', esim_profile: '1', enabled: '1' }]} | ${[{ primary: '1', modem: '3-1', position: '2' }, { primary: '1', modem: '2-1', position: '1', esim_profile: '1' }]} | ${undefined}                                                        | ${false}
    ${[{ modem: '3-1', position: '1', enabled: '1' }]}                    | ${[{ primary: '1', modem: '3-1', position: '1', esim_profile: '1' }, { primary: '0', modem: '3-1', position: '2' }]} | ${undefined}                                                        | ${false}
    ${[]}                                                                 | ${[{ primary: '1', modem: '3-1', position: '1', esim_profile: '1' }]}                                                | ${{ enabled: '1', modem: '3-1', position: '1', esim_profile: '1' }} | ${true}
    ${[]}                                                                 | ${[{ primary: '1', modem: '3-1', position: '1', esim_profile: '2' }]}                                                | ${{ enabled: '1', modem: '3-1', position: '1', esim_profile: '1' }} | ${false}
  `('check if findDefaultSim finds default SIMs instance #%#', ({ instances, simcards, section, res }) => {
    wrapper.vm.modems = [{ id: '3-1' }]
    wrapper.vm.modem = '3-1'
    expect(wrapper.vm.findDefaultSim(instances, simcards, section)).toEqual(res)
  })
  it('check if enabledSmsLimits returns enabled SMS limits', () => {
    wrapper.vm.modems = [{ id: '3-1' }]
    wrapper.vm.modem = '3-1'
    wrapper.vm.simStatus = [
      { modem: '3-1', sms_limit_enabled: '1' },
      { modem: '3-1', sms_limit_enabled: '0' },
      { modem: '1-2', sms_limit_enabled: '1' }
    ]
    expect(wrapper.vm.enabledSmsLimits).toEqual([{ modem: '3-1', sms_limit_enabled: '1' }])
  })
  it('check if currentModemIfaces returns correct modem mobile interfaces', () => {
    wrapper.vm.modems = [{ id: '3-1' }]
    wrapper.vm.modem = '3-1'
    wrapper.vm.interfaces = [
      { modem: '3-1', id: 'mob1' },
      { modem: '3-1', id: 'mob2' },
      { modem: '1-2', id: 'mob3' }
    ]
    expect(wrapper.vm.currentModemIfaces).toEqual([
      { modem: '3-1', id: 'mob1' },
      { modem: '3-1', id: 'mob2' }
    ])
  })
  it('check if enabledDataLimits returns enabled data limits', () => {
    wrapper.vm.modems = [{ id: '3-1' }]
    wrapper.vm.modem = '3-1'
    wrapper.vm.interfaces = [
      { modem: '3-1', id: 'mob1' },
      { modem: '3-1', id: 'mob2' },
      { modem: '1-2', id: 'mob3' }
    ]
    wrapper.vm.limitStatus = [
      { enabled: '1', id: 'mob1' },
      { enabled: '0', id: 'mob2' },
      { enabled: '1', id: 'mob3' }
    ]
    expect(wrapper.vm.enabledDataLimits).toEqual([{ enabled: '1', id: 'mob1' }])
  })
  it('check if getStatus method return correct data', () => {
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: true, data: [{ id: '3-1' }] },
      { success: true, data: [{ modem: '3-1', sms_limit_enabled: '0' }] },
      { success: true, data: [{ enabled: '1', id: 'mob1' }] },
      { success: true, data: [{ id: 'cfg01aa0e', rules: [] }] }
    ])
    return wrapper.vm.getStatus().then(() => {
      expect(wrapper.vm.modems).toEqual([{ id: '3-1' }])
      expect(wrapper.vm.simStatus).toEqual([{ modem: '3-1', sms_limit_enabled: '0' }])
      expect(wrapper.vm.limitStatus).toEqual([{ enabled: '1', id: 'mob1' }])
      expect(wrapper.vm.switchStatus).toEqual([{ id: 'cfg01aa0e', rules: [] }])
    })
  })
  it.each`
    response                                                                                                                 | expectedError                         | data
    ${[{ success: false, data: [] }, { success: true, data: [] }, { success: true, data: [] }, { success: true, data: [] }]} | ${'Failed to load modem status'}      | ${'modems'}
    ${[{ success: true, data: [] }, { success: false, data: [] }, { success: true, data: [] }, { success: true, data: [] }]} | ${'Failed to load SIM status'}        | ${'simStatus'}
    ${[{ success: true, data: [] }, { success: true, data: [] }, { success: false, data: [] }, { success: true, data: [] }]} | ${'Failed to load data limit status'} | ${'limitStatus'}
    ${[{ success: true, data: [] }, { success: true, data: [] }, { success: true, data: [] }, { success: false, data: [] }]} | ${'Failed to load SIM switch status'} | ${'switchStatus'}
  `('check if getStatus error is diplayed while loading "$data" data', async ({ response, expectedError }) => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(response)
    const spyError = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getStatus()
    expect(spyError).toHaveBeenCalledWith(expectedError)
  })
  it.each`
    modems                                               | sim                                     | res
    ${[{ id: '3-1', active_sim: 1 }]}                    | ${{ position: '1' }}                    | ${true}
    ${[{ id: '3-1', active_sim: 2, esim_profile: '1' }]} | ${{ position: '2', esim_profile: '1' }} | ${true}
    ${[{ id: '3-1', active_sim: 1 }]}                    | ${{ position: '2', esim_profile: '2' }} | ${false}
  `('check if current SIM is active #%#', ({ modems, sim, res }) => {
    wrapper.vm.modems = modems
    expect(wrapper.vm.checkActiveSim(sim)).toEqual(res)
  })
  it.each`
    text      | sim                                     | res
    ${'eSIM'} | ${{ position: '2', esim_profile: '1' }} | ${'1'}
    ${'SIM'}  | ${{ position: '2' }}                    | ${'2'}
  `('check if simNumber returns $text number', ({ sim, res }) => {
    expect(wrapper.vm.simNumber(sim)).toEqual(res)
  })
  it.each`
    active   | sim                                     | res
    ${true}  | ${{ position: '1', esim_profile: '1' }} | ${6}
    ${false} | ${{ position: '2' }}                    | ${2}
  `('check if hintInfo returns correct number of hints when SIM is active: $active', ({ active, sim, res }) => {
    wrapper.vm.checkActiveSim = vi.fn().mockReturnValueOnce(active)
    wrapper.vm.$mobile.getOperatorState = vi.fn().mockReturnValueOnce('Disconnected')
    wrapper.vm.enabledSmsLimits = [{ id: 'mob1', modem: '3-1', sim: '2', enabled: '1' }]
    wrapper.vm.enabledDataLimits = [{ id: 'mob1', modem: '3-1', sim: '2', enabled: '1' }]
    wrapper.vm.currentModemIfaces = [{ id: 'mob1', modem: '3-1' }]
    expect(wrapper.vm.hintInfo(sim).length).toEqual(res)
  })
  it.each`
    code   | res
    ${113} | ${'No logs are available because the SIM switch might be turned off'}
    ${140} | ${'Failed to load SIM switch logs'}
  `('check if logsModal shows error #%#', async ({ code, res }) => {
    wrapper.vm.$axios.get = vi.fn().mockRejectedValueOnce({ response: { data: { errors: [{ code }] } } })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const spy2 = vi.spyOn(wrapper.vm, '$spin')
    await wrapper.vm.logsModal()
    expect(spy).toHaveBeenCalledWith(res)
    expect(spy2).toHaveBeenCalledWith(false)
  })
  it('check if beforeSave rejects when less than 2 instances enabled', async () => {
    wrapper.vm.modems = [{ id: '3-1' }]
    wrapper.vm.modem = '3-1'
    wrapper.vm.formData = {
      sim: [
        { id: 'cfg01aa0e', enabled: '1', modem: '3-1' },
        { id: 'cfg02aa0e', enabled: '1', modem: '2-1' }
      ]
    }
    await expect(wrapper.vm.beforeSave()).rejects.toEqual('At least 2 SIM switch instances must be enabled')
  })
  it('check if beforeSave resolves when no instances enabled', async () => {
    wrapper.vm.modems = [{ id: '3-1' }]
    wrapper.vm.modem = '3-1'
    wrapper.vm.formData = {
      sim: [
        { id: 'cfg01aa0e', enabled: '0', modem: '3-1' },
        { id: 'cfg02aa0e', enabled: '0', modem: '3-1' },
        { id: 'cfg03aa0e', enabled: '1', modem: '2-1' }
      ]
    }
    await expect(wrapper.vm.beforeSave()).resolves.toEqual(undefined)
  })
  it('check if logsModal return correct data', async () => {
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({ success: true, data: [{ timestamp: '1000', sim: '1', triggered_rules: [1] }] })
    wrapper.vm.logList = []
    const spy = vi.spyOn(wrapper.vm, '$spin')
    await wrapper.vm.logsModal()
    expect(wrapper.vm.logList).toEqual([{ timestamp: '1000', sim: '1', triggered_rules: [1] }])
    expect(spy).toHaveBeenCalledWith(false)
    spy.mockClear()
  })
  it('check if closeLogs close modal and cleans log list', () => {
    wrapper.vm.showLogs = true
    wrapper.vm.logList = [
      {
        triggered_rules: [9],
        timestamp: '1752492786',
        sim: 2,
        esim: 2
      }
    ]
    wrapper.vm.closeLogs()
    expect(wrapper.vm.showLogs).toBe(false)
    expect(wrapper.vm.logList).toEqual([])
  })

  it.each`
    s            | res
    ${undefined} | ${'Unknown condition'}
    ${[]}        | ${'No conditions'}
    ${[10]}      | ${'On SIM not inserted'}
    ${[0, 1]}    | ${'On weak signal, On data limit'}
    ${[6, 11]}   | ${'No network, On operator or country code'}
    ${[6, 12]}   | ${'No network, Unknown condition'}
  `('check if parseConditions returns parsed conditions #%#', ({ s, res }) => {
    expect(wrapper.vm.parseConditions(s)).toEqual(res)
  })
  it.each`
    text                                       | s                                       | res
    ${'true when only enable back is enabled'} | ${{ enable_back: '1' }}                 | ${true}
    ${'false when other conditions enabled'}   | ${{ enable_back: '1', on_signal: '1' }} | ${false}
  `('check if onlyEnableBack returns $text', ({ s, res }) => {
    expect(wrapper.vm.onlyEnableBack(s)).toEqual(res)
  })
  it.each`
    text                                                | s                                      | res
    ${'true when only data limit is enabled'}           | ${{ data_limit: '1' }}                 | ${true}
    ${'true when both data and SMS limits are enabled'} | ${{ data_limit: '1', sms_limit: '1' }} | ${true}
    ${'false when other conditions enabled'}            | ${{ data_limit: '1', on_signal: '1' }} | ${false}
  `('check if onlyLimitsEnabled returns $text', ({ s, res }) => {
    expect(wrapper.vm.onlyLimitsEnabled(s)).toEqual(res)
  })
})
describe('MobileSimSwitchEdit.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MobileSimSwitchEdit, {
      global: {
        provide: {
          interfaces: () => interfaces,
          dataLimits: () => dataLimits,
          simcards: () => simSections,
          initialSimSwitch: () => {
            return {
              sim: simSections
            }
          },
          promptContent: () => {},
          findDefaultSim: () => false,
          opListOptions: () => [['', 'No operator lists available']]
        },
        mocks: {
          $mobile: {
            getSimLabel: vi.fn().mockReturnValueOnce('2')
          }
        }
      },
      props: {
        section: { id: 'cfg02aa0e' }
      }
    })
  })
  it('check if beforeSave shows prompt when only one instance enabled', async () => {
    wrapper.vm.formData = {
      sim: [{ id: 'cfg02aa0e', enabled: '1', on_signal: '0', data_limit: '0', sms_limit: '0', roaming: '0', no_network: '0', denied: '0', fail_flag: '0' }]
    }
    await wrapper.setProps({
      section: { id: 'cfg02aa0e', enabled: '1', on_signal: '0', data_limit: '0', sms_limit: '0', roaming: '0', no_network: '0', denied: '0', fail_flag: '0' }
    })
    const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
    wrapper.vm.beforeSave()
    expect(spy).toHaveBeenCalledTimes(1)
  })
  it('check if data limit is configured', async () => {
    await wrapper.setProps({ section: { id: 'cfg02aa0e', enabled: '1', data_limit: '1' } })
    expect(wrapper.vm.dataLimitConfigured).toBe(true)
  })
  it('check if sms limit is configured', async () => {
    wrapper.vm.sectionName = 'cfg02aa0e'
    await wrapper.setProps({ section: { id: 'cfg02aa0e', enabled: '1', data_limit: '1', position: '2', modem: '3-1' } })
    wrapper.vm.simcards = simSections
    expect(wrapper.vm.smsLimitConfigured).toBe(true)
  })
})
