import MobileGeneral from '../../src/views/network/MobileGeneral.vue'
import createWrapper from '@tests/unit/mockFactory'

const simSections = [
  {
    id: 'cfg01aa0e',
    position: '1',
    modem: '3-1',
    primary: '1',
    opernum: '24602',
    deny_roaming: '0'
  },
  {
    id: 'cfg02aa0e',
    modem: '1-2',
    position: '2'
  }
]
const computedSectionModem = {
  id: '3-1',
  name: 'Primary modem',
  builtin: true,
  sim_count: 2,
  service_modes: {
    '2G': ['test', 'test2'],
    '3G': ['wcdma_850', 'wcdma_900', 'wcdma_1800', 'wcdma_2100'],
    '4G': ['1', '3', '5', '7', '8', '20', '28', '32', '38', '40', '41'],
    NB: ['1', '3', '5', '7', '8'],
    '5G_NSA': ['nsa_5g_n1', 'nsa_5g_n3', '5g_n1', '5g_n3', '5g_n5']
  },
  nr5gBands: ['nsa_5g_n1', 'nsa_5g_n3', '5g_n1', '5g_n3', '5g_n5'],
  pinstate: 'Requires PUK'
}
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
const apnsData = [
  {
    modem: '3-1',
    apns: [
      { id: 478, apn: 'omnitel' },
      { id: 3201, apn: 'gprs.fix-ip.omnitel1.net' }
    ]
  }
]
const esimStatus = [
  {
    id: '3-1',
    eid: 'N/A',
    pending_jobs: []
  }
]

const simSwitchData = [
  {
    enabled: '1',
    modem: '3-1',
    interval: '30'
  }
]

const simStatus = [{ modem: '3-1', sim: '1', sms_limit_enabled: '1', sms_sent: '1', sms_limit: '1' }]

const dataLimitStatus = [{ id: 'mob1', enabled: '1', data_used: '100', data_limit: '100' }]

describe('MobileGeneral.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MobileGeneral, {
      data: () => ({ formData: { simcards: [{}], interfaces: [] } }),
      global: {
        stubs: {
          'tlt-tabs': { template: '<div />' },
          'vuci-form-item-input': { template: '<div />' },
          'vuci-form-item-switch': { template: '<div />' }
        },
        mocks: {
          $bus: {
            on: vi.fn()
          },
          $route: {
            path: '/network/mobile/general/3-1'
          }
        }
      },
      computed: { ...MobileGeneral.computed, sectionModem: () => computedSectionModem }
    })
    wrapper.vm.$mobile.getSimModemLabel = vi.fn().mockReturnValueOnce('1')
    wrapper.vm.$mobile.adjustSimNumber = vi.fn().mockReturnValueOnce('1')
  })
  it('returns modemId with correct data', () => {
    wrapper.vm.$route.path = '/network/mobile/general/1-1.2'
    expect(wrapper.vm.modemId).toEqual('1-1.2')
  })

  it('returns sectionModem with data when modems are loaded', () => {
    wrapper.vm.$route.path = '/network/mobile/general/3-1'
    wrapper.vm.modemList = modemsData
    expect(wrapper.vm.sectionModem).toEqual(computedSectionModem)
  })

  it('returns sectionModem correct data when modems are loaded but section modem is missing', () => {
    const wrapper = createWrapper(MobileGeneral, {
      data: () => ({ formData: { simcards: [{ modem: '' }], interfaces: [] } }),
      global: {
        stubs: {
          'tlt-tabs': { template: '<div />' },
          'vuci-form-item-input': { template: '<div />' },
          'vuci-form-item-switch': { template: '<div />' }
        },
        mocks: {
          $bus: {
            on: vi.fn()
          },
          $route: {
            path: '/network/mobile/general/'
          }
        }
      }
    })
    wrapper.vm.modemList = modemsData
    expect(wrapper.vm.sectionModem).toEqual({})
  })
  it('returns servicesPath', () => {
    wrapper.vm.formData.simcards = simSections
    wrapper.vm.filterInterface = vi.fn().mockReturnValue({ id: 'mob1s1a1' })
    wrapper.vm.$mobile.modemOffline = vi.fn().mockReturnValue(true)
    expect(wrapper.vm.servicesPath).toEqual('/network/wan?edit=mob1s1a1')
  })
  it('returns modemOffline', () => {
    wrapper.vm.$mobile.getBlockedText = vi.fn().mockReturnValue('unreachable')
    expect(wrapper.vm.modemOffline).toEqual('Status cannot be retrieved since the modem is unreachable')
  })
  it('check if afterLoad method return correct data', () => {
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: true, data: apnsData },
      { success: true, data: simSwitchData },
      { success: true, data: esimStatus }
    ])
    wrapper.vm.formData.simcards = simSections
    wrapper.vm.$route.path = '/network/mobile/general/3-1'
    return wrapper.vm.afterLoad().then(() => {
      expect(wrapper.vm.apnList).toEqual(apnsData[0].apns)
      expect(wrapper.vm.simSwitch).toEqual(simSwitchData)
      expect(wrapper.vm.esimStatus).toEqual(esimStatus)
    })
  })
  it('invokes modem error messages when requests fail in afterLoad', () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const spy2 = vi.spyOn(wrapper.vm.$message, 'error')
    const spy3 = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([{ success: false }, { success: false }, { success: false }])
    return wrapper.vm.afterLoad().then(() => {
      expect(wrapper.vm.apnList).toEqual([])
      expect(wrapper.vm.simSwitch).toEqual([])
      expect(wrapper.vm.esimStatus).toEqual([])
      expect(spy2).toHaveBeenCalledWith('Failed to load APN list')
      expect(spy).toHaveBeenCalledWith('Failed to load SIM switch data')
      expect(spy3).toHaveBeenCalledWith('Failed to load eSIM status')
    })
  })
  it('invokes error messages when bulk request fails in afterLoad', () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValueOnce({})
    return wrapper.vm.afterLoad().then(() => {
      expect(wrapper.vm.modemList).toEqual([])
      expect(wrapper.vm.apnList).toEqual([])
      expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
    })
  })
  it('check if loadModemStatus method return correct data', () => {
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: true, data: modemsData },
      { success: true, data: apnsData },
      { success: true, data: esimStatus },
      { success: true, data: simStatus },
      { success: true, data: dataLimitStatus }
    ])
    wrapper.vm.formData.simcards = simSections
    wrapper.vm.$route.path = '/network/mobile/general/3-1'
    return wrapper.vm.loadModemStatus().then(() => {
      expect(wrapper.vm.modemList).toEqual(modemsData)
      expect(wrapper.vm.apnList).toEqual(apnsData[0].apns)
      expect(wrapper.vm.esimStatus).toEqual(esimStatus)
      expect(wrapper.vm.simStatus).toEqual(simStatus)
      expect(wrapper.vm.dataLimitStatus).toEqual(dataLimitStatus)
    })
  })
  it('invokes modem error messages when requests fail in loadModemStatus', () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const spy2 = vi.spyOn(wrapper.vm.$message, 'error')
    const spy3 = vi.spyOn(wrapper.vm.$message, 'error')
    const spy4 = vi.spyOn(wrapper.vm.$message, 'error')
    const spy5 = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([{ success: false }, { success: false }, { success: false }, { success: false }, { success: false }])
    return wrapper.vm.loadModemStatus().then(() => {
      expect(wrapper.vm.modemList).toEqual([])
      expect(wrapper.vm.apnList).toEqual([])
      expect(wrapper.vm.esimStatus).toEqual([])
      expect(wrapper.vm.simStatus).toEqual([])
      expect(wrapper.vm.dataLimitStatus).toEqual([])
      expect(spy).toHaveBeenCalledWith('Failed to load modem status')
      expect(spy2).toHaveBeenCalledWith('Failed to load APN list')
      expect(spy3).toHaveBeenCalledWith('Failed to load eSIM status')
      expect(spy4).toHaveBeenCalledWith('Failed to load SIM status')
      expect(spy5).toHaveBeenCalledWith('Failed to load data limit status')
    })
  })
  it('invokes error messages when bulk request fails in loadModemStatus', () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValueOnce({})
    return wrapper.vm.loadModemStatus().then(() => {
      expect(wrapper.vm.modemList).toEqual([])
      expect(wrapper.vm.apnList).toEqual([])
      expect(wrapper.vm.esimStatus).toEqual([])
      expect(wrapper.vm.simStatus).toEqual([])
      expect(wrapper.vm.dataLimitStatus).toEqual([])
      expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
    })
  })
  it.each([
    [[{ id: 'cfg01aa0e', position: '1', modem: '3-1' }], { id: 'mob1', proto: 'wwan', modem: '3-1', sim: '1', enabled: '1' }],
    [[{ id: 'cfg01aa0e', position: '2', modem: '1-2', esim_profile: '1' }], { id: 'mob2', proto: 'wwan', modem: '1-2', sim: '2', esim_profile: '1', enabled: '1' }]
  ])('returns filtered interfaces #%#', (simcards, section) => {
    wrapper.vm.formData.simcards = simcards
    expect(wrapper.vm.filterInterface([section])).toEqual(section)
  })
  it.each([
    [
      { id: 'cfg01aa0e', position: '1', modem: '3-1' },
      { id: 'cfg01aa0e', modem: '3-1', sim: '1', enabled: '1', sms_limit: '0', data_limit: '0' },
      [{ modem: '3-1', sim: '1', sms_limit_enabled: '1', sms_sent: '1', sms_limit: '1' }],
      [{ id: 'mob1', enabled: '1', data_used: '100', data_limit: '100' }],
      [{ id: 'mob1', enabled: '1', sim: '1', modem: '3-1' }],
      ''
    ],
    [
      { id: 'cfg01aa0e', position: '1', modem: '3-1' },
      { id: 'cfg01aa0e', modem: '3-1', sim: '1', enabled: '1', sms_limit: '1', data_limit: '1' },
      [{ modem: '3-1', sim: '1', sms_limit_enabled: '1', sms_sent: '1', sms_limit: '1' }],
      [{ id: 'mob1', enabled: '1', data_used: '100', data_limit: '100' }],
      [{ id: 'mob1', enabled: '1', sim: '1', modem: '3-1' }],
      'data and SMS limits'
    ],
    [
      { id: 'cfg01aa0e', position: '1', modem: '3-1' },
      { id: 'cfg01aa0e', modem: '3-1', sim: '1', enabled: '1', sms_limit: '1', data_limit: '0' },
      [{ modem: '3-1', sim: '1', sms_limit_enabled: '1', sms_sent: '1', sms_limit: '1' }],
      [{ id: 'mob1', enabled: '1', data_used: '100', data_limit: '100' }],
      [{ id: 'mob1', enabled: '1', sim: '1', modem: '3-1' }],
      'SMS limit'
    ],
    [
      { id: 'cfg01aa0e', position: '1', esim_profile: '2', modem: '3-1' },
      { id: 'cfg01aa0e', modem: '3-1', sim: '1', esim_profile: '2', enabled: '1', sms_limit: '1', data_limit: '0' },
      [{ modem: '3-1', sim: '1', esim_profile: '2', sms_limit_enabled: '1', sms_sent: '1', sms_limit: '1' }],
      [{ id: 'mob1', enabled: '0' }],
      [{ id: 'mob1', enabled: '1', sim: '1', modem: '3-1' }],
      'SMS limit'
    ],
    [
      { id: 'cfg01aa0e', position: '1', modem: '3-1' },
      { id: 'cfg01aa0e', modem: '3-1', sim: '1', enabled: '1', sms_limit: '0', data_limit: '1' },
      [{ modem: '3-1', sim: '1', sms_limit_enabled: '0', sms_sent: '1', sms_limit: '1' }],
      [{ id: 'mob1', enabled: '1', data_used: '100', data_limit: '100' }],
      [{ id: 'mob1', enabled: '1', sim: '1', modem: '3-1' }],
      'data limit'
    ]
  ])('returns limits types which reached their limits #%#', (section, switchSection, simStatus, dataLimitStatus, currentIfaces, res) => {
    wrapper.vm.simStatus = simStatus
    wrapper.vm.dataLimitStatus = dataLimitStatus
    wrapper.vm.formData.interfaces = currentIfaces
    expect(wrapper.vm.getReachedLimit(section, switchSection)).toEqual(res)
  })
  it.each([
    [{ response: { data: { errors: [{ code: 2 }] } } }, 'Failed to change active SIM, modem not found'],
    [{ response: { data: { errors: [{ code: 4 }] } } }, 'Failed to change active SIM, modem not ready'],
    [{}, 'Failed to change active SIM']
  ])('invokes error message when changing active SIM request fail in makeActive #%#', (error, msg) => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const spy2 = vi.spyOn(wrapper.vm, '$spin')
    wrapper.vm.$axios.post = vi.fn().mockRejectedValueOnce(error)
    return wrapper.vm.makeActive().then(() => {
      expect(spy).toHaveBeenCalledWith(msg)
      expect(spy2).toHaveBeenCalledWith(false)
    })
  })
  it('invokes success message when changing active SIM request succeeds in makeActive', () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    const spy2 = vi.spyOn(wrapper.vm, '$spin')
    wrapper.vm.$axios.post = vi.fn().mockResolvedValueOnce({})
    return wrapper.vm.makeActive().then(() => {
      expect(spy).toHaveBeenCalledWith('Active SIM has been changed')
      expect(spy2).toHaveBeenCalledWith(false)
    })
  })
  it('invokes error message when changing default SIM request fail in makeDefault', () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const spy2 = vi.spyOn(wrapper.vm, '$spin')
    wrapper.vm.$axios.put = vi.fn().mockRejectedValueOnce({})
    return wrapper.vm.makeDefault().then(() => {
      expect(spy).toHaveBeenCalledWith('Failed to change default SIM')
      expect(spy2).toHaveBeenCalledWith(false)
    })
  })
  it('check if makeDefault updates data when request is successful', () => {
    wrapper.vm.formData.simcards = [{ id: 'cfg01aa0e', modem: '3-1', position: '1', primary: '0' }]
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    const spy2 = vi.spyOn(wrapper.vm, '$spin')
    wrapper.vm.$axios.put = vi.fn().mockResolvedValueOnce({})
    return wrapper.vm.makeDefault('1', 'cfg01aa0e').then(() => {
      expect(spy).toHaveBeenCalledWith('Default SIM has been changed to SIM1')
      expect(spy2).toHaveBeenCalledWith(false)
      expect(wrapper.vm.formData.simcards[0].primary).toEqual('1')
    })
  })
})
