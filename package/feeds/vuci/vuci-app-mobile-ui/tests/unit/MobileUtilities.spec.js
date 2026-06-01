import MobileUtilities from '../../src/views/network/MobileUtilities.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('MobileUtilities.vue', () => {
  const modems = [{ id: '3-1', active_sim: 1, builtin: true, pinstate: 'Inserted' }]
  const simcards = [{ id: 'cfg01aa0e', modem: '3-1', sim: '1', pin_lock_enabled: '0', sms_limit_enabled: '0' }]

  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MobileUtilities, {
      global: {
        mocks: {
          $mobile: {
            showModemName: vi.fn().mockReturnValue(false),
            getSimLabel: vi.fn().mockReturnValue('1'),
            getFlightMode: vi.fn().mockReturnValue('Off'),
            adjustSimNumber: vi.fn().mockReturnValue('1'),
            modemLowPower: vi.fn().mockReturnValue(false)
          },
          $store: {
            deviceInfo: {
              static: {
                device_name: 'RUT'
              }
            }
          }
        }
      },
      computed: {
        tabs: () => [{ id: '3-1', name: 'Internal modem' }],
        simInserted: () => true,
        sectionModem: () => modems[0],
        sectionSim: () => simcards[0]
      }
    })
    wrapper.vm.modem = '3-1'
  })
  it('returns data when request is successful in getData', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: true, data: modems },
      { success: true, data: simcards }
    ])
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getData()
    expect(wrapper.vm.modemList).toEqual(modems)
    expect(wrapper.vm.simStatus).toEqual(simcards)
    expect(wrapper.vm.simLock).toEqual(false)
    spy.mockClear()
  })
  it('returns error message when request is unsuccessful in getData', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getData()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
    spy.mockClear()
  })
  it('check if sendUSSD method accomplishes post action', async () => {
    wrapper.vm.$axios.post = vi.fn().mockResolvedValueOnce({
      data: {
        timestamp: '',
        message: 'test',
        state_id: 1,
        coding_scheme: '15'
      }
    })
    wrapper.vm.ussd = '*999#'
    wrapper.vm.ussdParsedResponse = null
    wrapper.vm.ussdResponse = []
    wrapper.vm.$localDate = vi.fn().mockReturnValue('2024-06-07 12:34:56')
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    wrapper.vm.$refs.ussdForm.validate = vi.fn().mockResolvedValue({ valid: true })
    await wrapper.vm.sendUSSD()
    expect(spy).toHaveBeenCalledWith('USSD code sent successfully')
    expect(wrapper.vm.disableUSSD).toBe(false)
    expect(wrapper.vm.ussdResponse).toEqual([['2024-06-07 12:34:56', '*999#', 'test', 'Further user action required', '15']])
    expect(wrapper.vm.ussdParsedResponse).toEqual('2024-06-07 12:34:56 ; *999# ; test ; Further user action required ; 15')
    spy.mockClear()
  })
  it('invokes sendUSSD method and invokes error message when request fails', async () => {
    wrapper.vm.$axios.post = vi.fn().mockResolvedValueOnce({})
    wrapper.vm.ussd = '*999#'
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$refs.ussdForm.validate = vi.fn().mockResolvedValue({ valid: true })
    await wrapper.vm.sendUSSD()
    expect(spy).toHaveBeenCalledWith('Failed to send USSD code')
    spy.mockClear()
  })
  it('invokes sendUSSD method and invokes error message when ussd is empty', async () => {
    wrapper.vm.$refs.ussdForm.validate = vi.fn().mockResolvedValue({ valid: false })
    wrapper.vm.ussd = ''
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.sendUSSD()
    expect(spy).toHaveBeenCalledWith('USSD is invalid')
    spy.mockClear()
  })
  it('check if sendUSSD method accomplishes post action without ussd', async () => {
    wrapper.vm.$refs.ussdForm.validate = vi.fn().mockResolvedValue({ valid: false })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.sendUSSD()
    expect(spy).toHaveBeenCalledWith('USSD is invalid')
    spy.mockClear()
  })
  it('checks if clearUssd clears response values', () => {
    wrapper.vm.clearUssd()
    expect(wrapper.vm.ussdResponse).toEqual([])
    expect(wrapper.vm.ussdParsedResponse).toEqual(' ')
  })
  it('checks if exportUssd calls generateCsv function with correct arguments', () => {
    const spy = vi.spyOn(wrapper.vm.$utils, 'generateCsv')
    wrapper.vm.ussdResponse = []
    wrapper.vm.exportUssd()
    expect(spy).toHaveBeenCalledWith('ussd-data-sim1-RUT', [['Time', 'USSD', 'Response', 'State id', 'Coding scheme']])
    spy.mockClear()
  })
  it('returns sim lock modal content when sim lock is disabled', async () => {
    wrapper.vm.showLockModal = false
    await wrapper.vm.simLockModal()
    expect(wrapper.vm.lockModal).toEqual({
      content:
        'The correct PIN code is required to enable the SIM card lock (3 attempts allowed). Once the SIM card lock is enabled, the PIN code will be required on any device to use that SIM card.',
      okText: 'Lock',
      fieldText: 'SIM PIN',
      title: 'SIM card lock configuration'
    })
  })
  it('returns sim lock modal content when sim lock is enabled', async () => {
    const wrapper = createWrapper(MobileUtilities, {
      global: {
        mocks: {
          $mobile: {
            showModemName: vi.fn().mockReturnValue(false),
            getSimLabel: vi.fn().mockReturnValue('1'),
            getFlightMode: vi.fn().mockReturnValue('Off'),
            modemLowPower: vi.fn().mockReturnValue(false)
          }
        }
      },
      computed: {
        tabs: () => [{ id: '3-1', name: 'Internal modem' }],
        simInserted: () => true,
        sectionModem: () => modems[0],
        sectionSim: () => {
          return { ...simcards[0], pin_lock_enabled: '1' }
        }
      }
    })
    wrapper.vm.showLockModal = false
    await wrapper.vm.simLockModal()
    expect(wrapper.vm.lockModal).toEqual({
      content:
        'The correct PIN code is required to disable the SIM card lock (3 attempts allowed). Once the SIM card lock is disabled, the PIN code will not be required on any device to use that SIM card.',
      okText: 'Unlock',
      fieldText: 'SIM PIN',
      title: 'SIM card lock configuration'
    })
  })
  it('checks if values get updated when onSuccess is called', async () => {
    wrapper.vm.simStatus = simcards
    wrapper.vm.modem = '3-1'
    await wrapper.vm.onSuccess('1')
    expect(wrapper.vm.simLock).toEqual(true)
    expect(wrapper.vm.simStatus[0].pin_lock_enabled).toEqual('1')
  })
  it('check if saveModemConfig method accomplishes put action', async () => {
    wrapper.vm.$axios.put = vi.fn().mockResolvedValueOnce({})
    wrapper.vm.flightMode = '0'
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    wrapper.vm.$refs.modemForm.validate = vi.fn().mockResolvedValue({ valid: true })
    await wrapper.vm.saveModemConfig()
    expect(spy).toHaveBeenCalledWith('Configuration has been applied')
    spy.mockClear()
  })
  it('invokes saveModemConfig method and invokes error message when request fails', async () => {
    wrapper.vm.$axios.put = vi.fn().mockRejectedValueOnce({})
    wrapper.vm.flightMode = '1'
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$refs.modemForm.validate = vi.fn().mockResolvedValue({ valid: true })
    await wrapper.vm.saveModemConfig()
    expect(spy).toHaveBeenCalledWith('Failed to edit configuration')
    spy.mockClear()
  })
  it.each`
    modemList                         | simStatus                       | offline  | pinRequired | pukRequired | res
    ${[{ id: '3-1', active_sim: 1 }]} | ${[{ modem: '3-1', sim: '1' }]} | ${true}  | ${false}    | ${false}    | ${'Disabled because modem is blocked or disabled.'}
    ${[{ id: '3-1', active_sim: 1 }]} | ${[{ modem: '3-1', sim: '1' }]} | ${false} | ${false}    | ${false}    | ${'Disabled because SIM card is not inserted.'}
    ${[{ id: '3-1', active_sim: 1 }]} | ${[{ modem: '3-1', sim: '1' }]} | ${false} | ${true}     | ${false}    | ${'Disabled because SIM card is locked.'}
    ${[{ id: '3-1', active_sim: 1 }]} | ${[{ modem: '3-1', sim: '1' }]} | ${false} | ${false}    | ${true}     | ${'Disabled because SIM card is blocked.'}
  `('returns SIM state message #%#', ({ modemList, simStatus, offline, pinRequired, pukRequired, res }) => {
    const wrapper = createWrapper(MobileUtilities, {
      global: {
        mocks: {
          $mobile: {
            modemOffline: vi.fn().mockReturnValue(offline),
            shouldAllowSimUnlock: vi.fn().mockReturnValue(pinRequired),
            requiresPuk: vi.fn().mockReturnValue(pukRequired),
            getSimLabel: vi.fn().mockReturnValue('1'),
            modemLowPower: vi.fn().mockReturnValue(false)
          }
        }
      }
    })
    wrapper.vm.modem = '3-1'
    wrapper.vm.modemList = modemList
    wrapper.vm.simStatus = simStatus
    expect(wrapper.vm.disabledFieldMsg).toEqual(res)
  })
})
