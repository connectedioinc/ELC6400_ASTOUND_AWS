import createWrapper from '@tests/unit/mockFactory'
import StepWan from '../../src/views/system/StepWan.vue'

const modemsData = [
  {
    service_modes: {
      '2G': ['test', 'test2'],
      '3G': ['wcdma_850', 'wcdma_900', 'wcdma_1800', 'wcdma_2100'],
      '4G': ['1', '3', '5', '7', '8', '20', '28', '32', '38', '40', '41']
    },
    sim_count: 2,
    id: '3-1',
    primary: true,
    builtin: true,
    name: 'Primary modem',
    desc: 'Quectel EG06',
    version: 'EG06ELAR04A04M4G',
    pinstate: 'Requires PUK'
  },
  { id: '1-2', name: 'External modem', builtin: false, sim_count: 1, service_modes: {} },
  { id: '1-3', name: 'External modem', builtin: false, sim_count: 1, service_modes: {} }
]

const esimStatus = [
  { modem: '3-1', iccid: '8986002210001234567', errors: [] },
  { modem: '1-2', iccid: 'N/A', errors: [] }
]

describe('StepWan.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(StepWan)
  })
  it('loads data when interface status request is successful', async () => {
    const status = [{ interface: 'test', data: [{ id: 1, carrier: 'test', apn: 'test' }] }]
    const modems = [{ id: '3-1', builtin: true, name: 'Internal modem' }]
    const apns = [
      {
        modem: '3-1',
        apns: [
          {
            password: '',
            apn: 'wap',
            user: '',
            id: 479,
            carrier: 'Bite Internet',
            pdptype: '0',
            auth: 'none'
          }
        ]
      }
    ]
    const esim = [{ modem: '3-1', iccid: '8986002210001234567', errors: [] }]
    const esimStatus = [{ modem: '3-1', iccid: '8986002210001234567', errors: [] }]
    const simSwitch = [{ modem: '3-1', sim: '1', esim_profile: '1', enabled: '0' }]
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: true, data: status },
      { success: true, data: modems },
      { success: true, data: apns },
      { success: true, data: esim },
      { success: true, data: esimStatus },
      { success: true, data: simSwitch }
    ])
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.statuses).toEqual(status)
    expect(wrapper.vm.modems).toEqual(modems)
    expect(wrapper.vm.apns).toEqual(apns)
    expect(wrapper.vm.esimData).toEqual(esim)
    expect(wrapper.vm.esimStatus).toEqual(esimStatus)
    expect(wrapper.vm.simSwitchData).toEqual(simSwitch)
  })
  it('invokes error message when interface status request fails', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('invokes error message when bulk requests are unsuccessful', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([{ success: false }, { success: false }, { success: false }, { success: false }, { success: false }, { success: false }])
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('Failed to load interfaces status')
    expect(spy).toHaveBeenCalledWith('Failed to load eSIM profiles')
    expect(spy).toHaveBeenCalledWith('Failed to load modem data')
    expect(spy).toHaveBeenCalledWith('Failed to load APN list')
    expect(spy).toHaveBeenCalledWith('Failed to load eSIM status')
    expect(spy).toHaveBeenCalledWith('Failed to load SIM switch data')
  })
  it.each([
    [
      { esim_profile: '1' },
      'Bootstrap eSIM profile detected. This profile provides limited mobile connectivity, intended only for downloading a new eSIM profile. Currently eSIM is active. If you want to use a physical SIM instead, please switch to it.'
    ],
    [{}, 'Bootstrap eSIM profile detected. This profile provides limited mobile connectivity, intended only for downloading a new eSIM profile. Please switch to eSIM to proceed with the download.']
  ])('check if bootstrapMsg returns correct message #%#', (iface, res) => {
    expect(wrapper.vm.bootstrapMsg(iface)).toEqual(res)
  })
  it('returns modem options', () => {
    wrapper.vm.modems = []
    wrapper.vm.$mobile.modemsOptions = vi.fn().mockReturnValue([{ id: '3-1', name: 'Internal modem' }])
    expect(wrapper.vm.modemOptions).toEqual([{ id: '3-1', name: 'Internal modem' }])
  })
  it('returns filtered apn list', () => {
    const apns = [
      {
        apns: [
          {
            password: '',
            apn: 'wap',
            user: '',
            id: 479,
            carrier: 'Bite Internet',
            pdptype: '0',
            auth: 'none'
          }
        ],
        modem: '3-1'
      },
      {
        apns: [
          {
            password: '',
            apn: 'gprs.fix-ip.omnitel1.net',
            user: '',
            id: 3201,
            carrier: 'Telia',
            pdptype: '0',
            auth: 'none'
          }
        ],
        modem: '1-1.3'
      }
    ]
    wrapper.vm.apns = apns
    expect(wrapper.vm.filterModemApnList({ modem: '3-1' })).toEqual(apns[0].apns)
  })
  it.each([
    [{ modem: '3-1', sim: '1' }, [{ id: '3-1', builtin: true, name: 'Internal modem', sim_count: 2 }], false, ' (SIM1)'],
    [
      { modem: '1-1.3', sim: '1' },
      [
        { id: '3-1', builtin: true, name: 'Internal modem', sim_count: 2 },
        { id: '1-1.3', builtin: false, name: 'External modem 1', sim_count: 1 }
      ],
      true,
      ' (External modem 1)'
    ],
    [{ modem: '3-1', sim: '1' }, [{ id: '3-1', builtin: true, name: 'Primary modem', sim_count: 1 }], true, ' (Primary modem)'],
    [{ modem: '3-1', sim: '1' }, [{ id: '3-1', builtin: true, name: 'Internal modem', sim_count: 1 }], false, ''],
    [{ modem: '1-1.3', sim: '1' }, [{ id: '3-1', builtin: true, name: 'Primary modem', sim_count: 1 }], true, '']
  ])('returns modem name when %s', (iface, modems, showName, response) => {
    wrapper.vm.modems = modems
    wrapper.vm.$mobile.shouldShowModemName = vi.fn().mockReturnValue(showName)
    wrapper.vm.$mobile.getSimLabel = vi.fn().mockReturnValue('1')
    expect(wrapper.vm.modemSimText(iface)).toEqual(response)
  })
  it('returns mobiles interfaces list', () => {
    wrapper.vm.$mobile.shouldShowModemName = vi.fn()
    wrapper.vm.$mobile.modemOffline = vi.fn()
    wrapper.vm.initialModems = [
      { id: '3-1', sim: '1' },
      { id: '1-1.3', sim: '1', esim_profile: '1' }
    ]
    wrapper.vm.modems = [{ id: '3-1' }, { id: '1-1.3' }]
    wrapper.vm.formData.interfaces = [
      { id: 'mob1s1a1', proto: 'wwan', modem: '3-1', sim: '1', apn: 'wap' },
      { id: 'mob2s1a1', proto: 'connm', modem: '1-1.3', sim: '1', esim_profile: '1', apn: '' },
      { id: 'test', proto: 'static' }
    ]
    expect(wrapper.vm.mobileInterfaces).toEqual([
      { id: 'mob1s1a1', modem: '3-1', sim: '1', esim_profile: undefined, apn: 'wap' },
      { id: 'mob2s1a1', modem: '1-1.3', sim: '1', esim_profile: '1', apn: '' }
    ])
  })

  it.each([
    [{ event_id: 5 }, 'error', ''],
    [{ event_id: 6, status: 14 }, 'error', ''],
    [{ event_id: 6, status: 0 }, 'success', ''],
    [{ event_id: 6, status: 4 }, 'error', 'Failed to add eSIM profile']
  ])('check if profileEvent returns correct message #%#', async (data, type, res) => {
    const spy = vi.spyOn(wrapper.vm.$message, type)
    wrapper.vm.$mobile.getFailedEsimMessage = vi.fn().mockReturnValue('Failed to add eSIM profile')
    wrapper.vm.$refs.form.loadData = vi.fn().mockResolvedValue()
    wrapper.vm.profileDownloaded = false
    await wrapper.vm.profileEvent(data)
    if (res) expect(spy).toHaveBeenCalledWith(res)
    else expect(spy).not.toHaveBeenCalled()
    if (type === 'success') expect(wrapper.vm.profileDownloaded).toEqual(true)
  })
  it('check if updateData method return correct data', () => {
    wrapper.vm.modems = []
    const status = [{ interface: 'test', data: [{ id: 1, carrier: 'test', apn: 'test' }] }]
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: true, data: status },
      { success: true, data: modemsData },
      { success: true, data: esimStatus }
    ])
    return wrapper.vm.updateData().then(() => {
      expect(wrapper.vm.statuses).toEqual(status)
      expect(wrapper.vm.modems).toEqual(modemsData)
      expect(wrapper.vm.esimStatus).toEqual(esimStatus)
    })
  })
  it('invokes modem error messages when requests fail in updateData', () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce()
    return wrapper.vm.updateData().then(() => {
      expect(wrapper.vm.statuses).toEqual([])
      expect(wrapper.vm.modems).toEqual([])
      expect(wrapper.vm.esimStatus).toEqual([])
      expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
    })
  })
  it.each([
    ['3-1', true, 'Default SIM switched to physical SIM'],
    ['3-1', false, 'Default SIM switched to eSIM']
  ])('check if changeDefaultSim changes default SIM #%#', (modemId, currentEsim, res) => {
    wrapper.vm.initialModems = [{ id: '3-1', sim: '2', esim_profile: '2' }]
    wrapper.vm.formData = { simcards: [{ modem: '3-1', position: '1', esim_profile: '1' }], interfaces: [] }
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    const spy2 = vi.spyOn(wrapper.vm, '$spin')
    wrapper.vm.$axios.bulk = vi.fn().mockResolvedValueOnce({})
    return wrapper.vm.changeDefaultSim(modemId, currentEsim).then(() => {
      expect(spy).toHaveBeenCalledWith(res)
      expect(spy2).toHaveBeenCalledWith(false)
      expect(wrapper.vm.initialModems).toEqual([{ id: '3-1', sim: '1', esim_profile: '1' }])
    })
  })
  it.each([
    [true, 'Failed to switch default SIM to eSIM'],
    [false, 'Failed to switch default SIM to physical SIM']
  ])('check if switchErrorMsg returns correct error message #%#', async (currentEsim, res) => {
    const spyError = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.switchErrorMsg(currentEsim)
    expect(spyError).toHaveBeenCalledWith(res)
  })
  it.each([
    [
      true,
      {
        title: 'Switch to SIM?',
        content: 'After switch, default SIM will become physical SIM and SIM switch rules used for bootstrap profile will be enabled.',
        okText: 'Proceed',
        cancelText: 'Cancel',
        onOk: expect.any(Function)
      }
    ],
    [
      false,
      {
        title: 'Switch to eSIM?',
        content: 'After switch, default SIM will become eSIM and SIM switch rules used for bootstrap profile will be disabled.',
        okText: 'Proceed',
        cancelText: 'Cancel',
        onOk: expect.any(Function)
      }
    ]
  ])('check if switchPrompt returns correct prompt #%#', async (currentEsim, res) => {
    const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
    await wrapper.vm.switchPrompt('3-1', currentEsim)
    expect(spy).toHaveBeenCalledWith(res)
  })
})
