import MobileConnection from '../../src/views/network/MobileConnection.vue'
import createWrapper from '@tests/unit/mockFactory'

const computedSectionModem = {
  id: '3-1',
  name: 'Internal modem',
  builtin: true,
  sim_count: 2,
  active_sim: 1,
  service_modes: {
    '2G': ['800', '900'],
    '3G': ['wcdma_850', 'wcdma_900', 'wcdma_1800', 'wcdma_2100'],
    '4G': ['1', '3', '5', '7', '8', '20', '28', '32', '38', '40', '41'],
    NB: ['1', '3', '5', '7', '8'],
    '5G_NSA': ['nsa_5g_n1', 'nsa_5g_n3', '5g_n1', '5g_n3', '5g_n5']
  },
  nr5gBands: ['nsa_5g_n1', 'nsa_5g_n3', '5g_n1', '5g_n3', '5g_n5']
}
const modemsData = [
  {
    service_modes: {
      '2G': ['800', '900'],
      '3G': ['wcdma_850', 'wcdma_900', 'wcdma_1800', 'wcdma_2100'],
      '4G': ['1', '3', '5', '7', '8', '20', '28', '32', '38', '40', '41']
    },
    sim_count: 2,
    id: '3-1',
    primary: true,
    builtin: true,
    name: 'Internal modem',
    desc: 'Quectel EG06',
    version: 'EG06ELAR04A04M4G'
  },
  { id: '1-2', name: 'External modem', builtin: false, sim_count: 1, service_modes: {} },
  { id: '1-3', name: 'External modem', builtin: false, sim_count: 1, service_modes: {} }
]
const existingData = {
  service_modes: {
    '2G': ['gsm_800', 'gsm_900'],
    '3G': ['wcdma_850', 'wcdma_900', 'wcdma_1800', 'wcdma_2100'],
    '4G': ['lte_b5', 'lte_b7'],
    '5G_NSA': [
      'nsa_5g_n1',
      'nsa_5g_n29',
      'nsa_5g_n30',
      'nsa_5g_n34',
      'nsa_5g_n65',
      'nsa_5g_n67',
      'nsa_5g_n71',
      'nsa_5g_n75',
      'nsa_5g_n78',
      'nsa_5g_n80',
      'nsa_5g_n85',
      'nsa_5g_n89',
      'nsa_5g_n90',
      'nsa_5g_n92',
      'nsa_5g_n95',
      'nsa_5g_n96',
      'nsa_5g_n99',
      'nsa_5g_n100',
      'nsa_5g_n101',
      'nsa_5g_n105',
      'nsa_5g_n257'
    ]
  }
}
const existingData2 = {
  service_modes: {
    '2G': ['gsm_850', 'gsm_900'],
    '3G': ['wcdma_850', 'wcdma_j850', 'wcdma_900', 'wcdma_1800', 'wcdma_2100'],
    '4G': ['lte_b5', 'lte_b7', 'lte_b29', 'lte_b30', 'lte_b32', 'lte_b33', 'lte_b54', 'lte_b65', 'lte_b67', 'lte_b68', 'lte_b69', 'lte_b70', 'lte_b75', 'lte_b85', 'lte_b106'],
    NB: ['lte_nb1', 'lte_nb2'],
    '5G_NSA': ['nsa_5g_n1']
  }
}
const noData = {
  service_modes: {}
}
const badResp = {
  service_modes: {},
  nr5gInfo: []
}
const resp = {
  gsmBands: [
    ['gsm_800', 'GSM-800'],
    ['gsm_900', 'GSM-900']
  ],
  gsmInfo: [
    { name: 'gsm_800', frequency: '800 MHz' },
    { name: 'gsm_900', frequency: '900 MHz' }
  ],
  lteBands: [
    ['lte_b5', 'B5'],
    ['lte_b7', 'B7']
  ],
  lteInfo: [
    { name: 'lte_b5', frequency: '5 MHz', bandMode: 'FDD' },
    { name: 'lte_b7', frequency: '7 MHz', bandMode: 'FDD' }
  ],
  nr5gBands: [
    ['1', 'n1'],
    ['29', 'n29'],
    ['30', 'n30'],
    ['34', 'n34'],
    ['65', 'n65'],
    ['67', 'n67'],
    ['71', 'n71'],
    ['75', 'n75'],
    ['78', 'n78'],
    ['80', 'n80'],
    ['85', 'n85'],
    ['89', 'n89'],
    ['90', 'n90'],
    ['92', 'n92'],
    ['95', 'n95'],
    ['96', 'n96'],
    ['99', 'n99'],
    ['100', 'n100'],
    ['101', 'n101'],
    ['105', 'n105'],
    ['257', 'n257']
  ],
  nr5gInfo: [
    { name: '1', frequency: '1 MHz', bandMode: 'FDD', nsa: true },
    { name: '29', frequency: '29 MHz', bandMode: 'SDL', nsa: true },
    { name: '30', frequency: '30 MHz', bandMode: 'FDD', nsa: true },
    { name: '34', frequency: '34 MHz', bandMode: 'TDD', nsa: true },
    { name: '65', frequency: '65 MHz', bandMode: 'FDD', nsa: true },
    { name: '67', frequency: '67 MHz', bandMode: 'SDL', nsa: true },
    { name: '71', frequency: '71 MHz', bandMode: 'FDD', nsa: true },
    { name: '75', frequency: '75 MHz', bandMode: 'SDL', nsa: true },
    { name: '78', frequency: '78 MHz', bandMode: 'TDD', nsa: true },
    { name: '80', frequency: '80 MHz', bandMode: 'SUL', nsa: true },
    { name: '85', frequency: '85 MHz', bandMode: 'FDD', nsa: true },
    { name: '89', frequency: '89 MHz', bandMode: 'SUL', nsa: true },
    { name: '90', frequency: '90 MHz', bandMode: 'TDD', nsa: true },
    { name: '92', frequency: '92 MHz', bandMode: 'FDD', nsa: true },
    { name: '95', frequency: '95 MHz', bandMode: 'SUL', nsa: true },
    { name: '96', frequency: '96 MHz', bandMode: 'TDD', nsa: true },
    { name: '99', frequency: '99 MHz', bandMode: 'SUL', nsa: true },
    { name: '100', frequency: '100 MHz', bandMode: 'FDD', nsa: true },
    { name: '101', frequency: '101 MHz', bandMode: 'TDD', nsa: true },
    { name: '105', frequency: '105 MHz', bandMode: 'FDD', nsa: true },
    { name: '257', frequency: '257 MHz', bandMode: 'TDD', nsa: true }
  ],
  nr5gNsaBands: [
    ['1', 'n1'],
    ['29', 'n29'],
    ['30', 'n30'],
    ['34', 'n34'],
    ['65', 'n65'],
    ['67', 'n67'],
    ['71', 'n71'],
    ['75', 'n75'],
    ['78', 'n78'],
    ['80', 'n80'],
    ['85', 'n85'],
    ['89', 'n89'],
    ['90', 'n90'],
    ['92', 'n92'],
    ['95', 'n95'],
    ['96', 'n96'],
    ['99', 'n99'],
    ['100', 'n100'],
    ['101', 'n101'],
    ['105', 'n105'],
    ['257', 'n257']
  ],
  service_modes: {
    '2G': ['gsm_800', 'gsm_900'],
    '3G': ['wcdma_850', 'wcdma_900', 'wcdma_1800', 'wcdma_2100'],
    '4G': ['lte_b5', 'lte_b7'],
    '5G_NSA': [
      'nsa_5g_n1',
      'nsa_5g_n29',
      'nsa_5g_n30',
      'nsa_5g_n34',
      'nsa_5g_n65',
      'nsa_5g_n67',
      'nsa_5g_n71',
      'nsa_5g_n75',
      'nsa_5g_n78',
      'nsa_5g_n80',
      'nsa_5g_n85',
      'nsa_5g_n89',
      'nsa_5g_n90',
      'nsa_5g_n92',
      'nsa_5g_n95',
      'nsa_5g_n96',
      'nsa_5g_n99',
      'nsa_5g_n100',
      'nsa_5g_n101',
      'nsa_5g_n105',
      'nsa_5g_n257'
    ]
  },
  umtsBands: [
    ['wcdma_850', 'B850'],
    ['wcdma_900', 'B900'],
    ['wcdma_1800', 'B1800'],
    ['wcdma_2100', 'B2100']
  ],
  umtsInfo: [
    { name: 'wcdma_850', frequency: '850 MHz' },
    { name: 'wcdma_900', frequency: '900 MHz' },
    { name: 'wcdma_1800', frequency: '1800 MHz' },
    { name: 'wcdma_2100', frequency: '2100 MHz' }
  ]
}
const resp2 = {
  gsmBands: [
    ['gsm_850', 'GSM-850'],
    ['gsm_900', 'GSM-900']
  ],
  gsmInfo: [
    { name: 'gsm_850', frequency: '850 MHz' },
    { name: 'gsm_900', frequency: '900 MHz' }
  ],
  lteBands: [
    ['lte_b5', 'B5'],
    ['lte_b7', 'B7'],
    ['lte_b29', 'B29'],
    ['lte_b30', 'B30'],
    ['lte_b32', 'B32'],
    ['lte_b33', 'B33'],
    ['lte_b54', 'B54'],
    ['lte_b65', 'B65'],
    ['lte_b67', 'B67'],
    ['lte_b68', 'B68'],
    ['lte_b69', 'B69'],
    ['lte_b70', 'B70'],
    ['lte_b75', 'B75'],
    ['lte_b85', 'B85'],
    ['lte_b106', 'B106']
  ],
  lteInfo: [
    { name: 'lte_b5', frequency: '5 MHz', bandMode: 'FDD' },
    { name: 'lte_b7', frequency: '7 MHz', bandMode: 'FDD' },
    { name: 'lte_b29', frequency: '29 MHz', bandMode: 'SDL' },
    { name: 'lte_b30', frequency: '30 MHz', bandMode: 'FDD' },
    { name: 'lte_b32', frequency: '32 MHz', bandMode: 'SDL' },
    { name: 'lte_b33', frequency: '33 MHz', bandMode: 'TDD' },
    { name: 'lte_b54', frequency: '54 MHz', bandMode: 'TDD' },
    { name: 'lte_b65', frequency: '65 MHz', bandMode: 'FDD' },
    { name: 'lte_b67', frequency: '67 MHz', bandMode: 'SDL' },
    { name: 'lte_b68', frequency: '68 MHz', bandMode: 'FDD' },
    { name: 'lte_b69', frequency: '69 MHz', bandMode: 'SDL' },
    { name: 'lte_b70', frequency: '70 MHz', bandMode: 'FDD' },
    { name: 'lte_b75', frequency: '75 MHz', bandMode: 'SDL' },
    { name: 'lte_b85', frequency: '85 MHz', bandMode: 'FDD' },
    { name: 'lte_b106', frequency: '106 MHz', bandMode: 'FDD' }
  ],
  nbBands: [
    ['lte_nb1', 'NB1'],
    ['lte_nb2', 'NB2']
  ],
  nbInfo: [
    { name: 'lte_nb1', frequency: '1 MHz', bandMode: 'FDD' },
    { name: 'lte_nb2', frequency: '2 MHz', bandMode: 'FDD' }
  ],
  nr5gBands: [['1', 'n1']],
  nr5gInfo: [{ name: '1', frequency: '1 MHz', bandMode: 'FDD', nsa: true }],
  nr5gNsaBands: [['1', 'n1']],
  service_modes: {
    '2G': ['gsm_850', 'gsm_900'],
    '3G': ['wcdma_850', 'wcdma_j850', 'wcdma_900', 'wcdma_1800', 'wcdma_2100'],
    '4G': ['lte_b5', 'lte_b7', 'lte_b29', 'lte_b30', 'lte_b32', 'lte_b33', 'lte_b54', 'lte_b65', 'lte_b67', 'lte_b68', 'lte_b69', 'lte_b70', 'lte_b75', 'lte_b85', 'lte_b106'],
    NB: ['lte_nb1', 'lte_nb2'],
    '5G_NSA': ['nsa_5g_n1']
  },
  umtsBands: [
    ['wcdma_850', 'B850'],
    ['wcdma_j850', 'BJ850'],
    ['wcdma_900', 'B900'],
    ['wcdma_1800', 'B1800'],
    ['wcdma_2100', 'B2100']
  ],
  umtsInfo: [
    { name: 'wcdma_850', frequency: '850 MHz' },
    { name: 'wcdma_j850', frequency: 'J850 MHz' },
    { name: 'wcdma_900', frequency: '900 MHz' },
    { name: 'wcdma_1800', frequency: '1800 MHz' },
    { name: 'wcdma_2100', frequency: '2100 MHz' }
  ]
}

describe('MobileConnection.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MobileConnection, {
      data: () => ({ formData: { simcards: [{}] } }),
      global: {
        mocks: {
          $route: {
            path: '/network/mobile/general/cfg01aa0e'
          }
        }
      },
      computed: { ...MobileConnection.computed, sectionModem: () => computedSectionModem }
    })
    const na = vi.fn().mockImplementation(value => {
      return value || 'N/A'
    })
    wrapper.vm.$mobile.lte5gBandToFrequency = na
    wrapper.vm.$mobile.umtsFrequencyToBand = na
  })
  it('returns sectionName with correct data', () => {
    wrapper.vm.$route.path = '/network/mobile/general/cfg02aa0e'
    expect(wrapper.vm.sectionName).toEqual('cfg02aa0e')
  })
  it('returns sectionModem with data when modems are loaded', () => {
    const wrapper = createWrapper(MobileConnection)
    wrapper.vm.modemList = modemsData
    wrapper.vm.formData.simcards = [{ modem: '1-3' }]
    expect(wrapper.vm.sectionModem).toEqual({ id: '1-3', name: 'External modem', builtin: false, sim_count: 1, service_modes: {} })
  })
  it('returns sectionModem correct data when modems are loaded but section modem is missing', () => {
    const wrapper = createWrapper(MobileConnection)
    wrapper.vm.modemList = modemsData
    wrapper.vm.formData.simcards = [{ modem: '' }]
    expect(wrapper.vm.sectionModem).toEqual({})
  })
  it('returns serviceModeHint without services', () => {
    const wrapper = createWrapper(MobileConnection, {
      computed: { ...MobileConnection.computed, sectionModem: () => ({ id: '3-1', sim_count: 2, active_sim: 2 }) }
    })
    expect(wrapper.vm.serviceModeHint).toBe(
      'Specify your preferred network type. If your mobile network is compatible with  standards, you may choose the preferred network type to which the device should attempt to connect.'
    )
  })
  it('returns serviceModeHint with loaded modem data', () => {
    wrapper.vm.modemList = modemsData
    expect(wrapper.vm.serviceModeHint).toBe(
      'Specify your preferred network type. If your mobile network is compatible with 5G, 4G, 3G, 2G standards, you may choose the preferred network type to which the device should attempt to connect.'
    )
  })
  it.each([
    [
      '5G/4G/3G/2G',
      { '2G': ['gsm_900'], '3G': ['wcdma_850'], '4G': ['1'], '5G_NSA': ['nsa_5g_n1'] },
      [
        ['nr5g_pref', '5G/4G/3G/2G auto'],
        ['lte_pref', '4G/3G/2G auto'],
        ['3g_pref', '3G/2G auto'],
        ['lte', '4G only'],
        ['3g', '3G only'],
        ['2g', '2G only']
      ]
    ],
    [
      '5G/4G/3G/2G',
      { '2G': ['gsm_900'], '3G': ['wcdma_850'], '4G': ['1'], '5G_NSA': ['nsa_5g_n1'] },
      [
        ['nr5g_pref', '5G/4G/3G/2G auto'],
        ['lte_pref', '4G/3G/2G auto'],
        ['3g_pref', '3G/2G auto'],
        ['lte', '4G only'],
        ['3g', '3G only'],
        ['2g', '2G only']
      ]
    ],
    [
      '5G/4G/3G',
      { '3G': ['wcdma_850'], '4G': ['1'], '5G_NSA': ['nsa_5g_n1'] },
      [
        ['nr5g_pref', '5G/4G/3G auto'],
        ['lte_pref', '4G/3G auto'],
        ['lte', '4G only'],
        ['3g', '3G only']
      ]
    ],
    [
      '4G/3G/2G',
      { '2G': ['gsm_900'], '3G': ['wcdma_850'], '4G': ['1'] },
      [
        ['lte_pref', '4G/3G/2G auto'],
        ['3g_pref', '3G/2G auto'],
        ['lte', '4G only'],
        ['3g', '3G only'],
        ['2g', '2G only']
      ]
    ],
    [
      '4G/3G',
      { '3G': ['wcdma_850'], '4G': ['1'] },
      [
        ['lte_pref', '4G/3G auto'],
        ['lte', '4G only'],
        ['3g', '3G only']
      ]
    ],
    [
      '3G/2G',
      { '2G': ['gsm_900'], '3G': ['wcdma_850'] },
      [
        ['3g_pref', '3G/2G auto'],
        ['3g', '3G only'],
        ['2g', '2G only']
      ]
    ],
    ['2G', { '2G': ['gsm_900'] }, [['2g', '2G only']]]
  ])('returns serviceModes when modems supports: %s', (text, serviceModes, response) => {
    const data = { ...computedSectionModem, service_modes: serviceModes }
    const wrapper = createWrapper(MobileConnection, {
      data: () => ({ formData: { simcards: [{}] } }),
      computed: {
        ...MobileConnection.computed,
        sectionModem: () => data
      }
    })
    expect(wrapper.vm.serviceModes).toEqual(response)
    expect(wrapper.vm.hasServiceModes).toBe(true)
  })

  it('returns false when device has no service modes', () => {
    const wrapper = createWrapper(MobileConnection, {
      data: () => ({ formData: { simcards: [{}] } }),
      computed: { ...MobileConnection.computed, sectionModem: () => ({}) }
    })
    expect(wrapper.vm.has4G).toBe(false)
    expect(wrapper.vm.hasServiceModes).toBe(false)
  })
  it('returns false when device has no 4g', () => {
    const wrapper = createWrapper(MobileConnection, {
      data: () => ({ formData: { simcards: [{}] } }),
      computed: { ...MobileConnection.computed, sectionModem: () => ({ id: '3-1', sim_count: 2, active_sim: 1, service_modes: { '3G': [] } }) }
    })
    expect(wrapper.vm.has4G).toBe(false)
  })
  it('returns true when device has 4g', () => {
    const wrapper = createWrapper(MobileConnection, {
      global: { mocks: { $mobile: { modemLowPower: vi.fn().mockReturnValueOnce(false) } } },
      data: () => ({ formData: { simcards: [{}] } }),
      computed: { ...MobileConnection.computed, sectionModem: () => ({ id: '3-1', sim_count: 2, active_sim: 1, service_modes: { '4G': ['1'] } }) }
    })
    expect(wrapper.vm.has4G).toBe(true)
  })
  it('returns serviceModes when no modems are available', () => {
    const wrapper = createWrapper(MobileConnection, {
      data: () => ({ formData: { simcards: [{}] } }),
      computed: { ...MobileConnection.computed, sectionModem: () => ({ service_mode_names: [] }) }
    })
    expect(wrapper.vm.serviceModes).toEqual([])
  })
  it('check if afterLoad method return correct data', async () => {
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({ success: true, data: modemsData })
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.modemList).toEqual(modemsData)
  })
  it('invokes error message when request fails', async () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.get = vi.fn().mockRejectedValueOnce({})
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('Failed to load modem options')
  })
  it('check if loadBands method return modified modem', async () => {
    const bandsModemsData = [
      {
        id: '3-1',
        name: 'Internal modem',
        builtin: true,
        sim_count: 2,
        active_sim: 1,
        service_modes: {
          '2G': ['800', '900'],
          '3G': ['wcdma_850', 'wcdma_900', 'wcdma_1800', 'wcdma_2100'],
          '4G': ['1', '3', '5', '7', '8', '20', '28', '32', '38', '40', '41'],
          '5G_NSA': ['nsa_5g_n1', 'nsa_5g_n3', '5g_n1', '5g_n3', '5g_n5']
        }
      },
      { id: '1-2', name: 'external', builtin: false, sim_count: 1 },
      { id: '1-3', name: 'external', builtin: false, sim_count: 1 }
    ]
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({ success: true, data: bandsModemsData })
    wrapper.vm.loadBands = vi.fn()
    await wrapper.vm.loadBands(wrapper.vm.sectionModem)
    expect(wrapper.vm.sectionModem).toEqual({
      id: '3-1',
      name: 'Internal modem',
      nr5gBands: ['nsa_5g_n1', 'nsa_5g_n3', '5g_n1', '5g_n3', '5g_n5'],
      builtin: true,
      sim_count: 2,
      active_sim: 1,
      service_modes: {
        '2G': ['800', '900'],
        '3G': ['wcdma_850', 'wcdma_900', 'wcdma_1800', 'wcdma_2100'],
        '4G': ['1', '3', '5', '7', '8', '20', '28', '32', '38', '40', '41'],
        NB: ['1', '3', '5', '7', '8'],
        '5G_NSA': ['nsa_5g_n1', 'nsa_5g_n3', '5g_n1', '5g_n3', '5g_n5']
      }
    })
  })
  it.each([
    ['all service modes exist', existingData, {}, resp],
    ['all service modes exist and bands includes all value', existingData2, { gsm: ['all'], umts: ['all'], lte: ['all'], lte_nb: ['all'], nr5g: ['all'] }, resp2],
    ['service modes dont exists', noData, {}, badResp]
  ])('returns loaded bands when %s', (text, data, section, response) => {
    wrapper.vm.formData.simcards = [section]
    const val = wrapper.vm.loadBands(data)
    expect(val).toEqual(response)
  })
  it.each([
    ['band not found', [], 'B1', []],
    ['band is 5G', [{ name: 'n1', frequency: '1 MHz', bandMode: 'FDD', nsa: true }], 'n1', ['1 MHz', 'FDD', 'NSA']],
    ['band is 4G', [{ name: 'lte_b5', frequency: '5 MHz', bandMode: 'FDD' }], 'lte_b5', ['5 MHz', 'FDD']],
    ['band is 3G', [{ name: 'wcdma_850', frequency: '850 MHz' }], 'wcdma_850', ['850 MHz']]
  ])('returns band info list when %s', (text, list, key, response) => {
    expect(wrapper.vm.bandInfoList(key, list)).toEqual(response)
  })
  it('check if reset5gBands resets values when band is manual', () => {
    const form = { band: 'manual' }
    wrapper.vm.reset5gBands(form)
    expect(form).toEqual({ band: 'manual', fiveG: [], nr5g: [], nr5g_sa: [] })
  })
  it.each([
    ['nsa', { nr5g_mode: 'nsa' }, { nr5gNsaBands: [['1', 'n1']], nr5gSaBands: [], nr5gBands: [['1', 'n1']] }, [['1', 'n1']]],
    [
      'sa',
      { nr5g_mode: 'sa' },
      {
        nr5gNsaBands: [['1', 'n1']],
        nr5gSaBands: [['2', 'n2']],
        nr5gBands: [
          ['1', 'n1'],
          ['2', 'n2']
        ]
      },
      [['2', 'n2']]
    ],
    [
      'auto',
      { nr5g_mode: 'auto' },
      {
        nr5gNsaBands: [['1', 'n1']],
        nr5gSaBands: [['2', 'n2']],
        nr5gBands: [
          ['1', 'n1'],
          ['2', 'n2']
        ]
      },
      [
        ['1', 'n1'],
        ['2', 'n2']
      ]
    ]
  ])('returns fiveGBandsOptions when 5G mode: %s', (text, mode, nr5g, response) => {
    const data = { ...computedSectionModem, ...nr5g }
    const wrapper = createWrapper(MobileConnection, {
      data: () => ({ formData: { simcards: [{}] } }),
      computed: {
        ...MobileConnection.computed,
        sectionModem: () => data
      }
    })
    expect(wrapper.vm.fiveGBandsOptions(mode)).toEqual(response)
  })
})
