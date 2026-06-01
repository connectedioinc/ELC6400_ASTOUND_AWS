import ChannelAnalysis from '../../src/views/status/ChannelAnalysis.vue'
import VuciFormStub from '@tests/unit/VuciFormStub.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'

vi.mock('vue-router', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ path: 'test' })),
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn()
    })
  }
})

const scanResult2ghz = [
  {
    ssid: 'test2_4',
    channel: 1,
    ht_operation: {
      primary_channel: 1,
      channel_width: 2040,
      secondary_channel_offset: 'above'
    }
  },
  {
    ssid: 'test',
    channel: 5,
    ht_operation: {
      primary_channel: 5,
      channel_width: 40,
      secondary_channel_offset: 'above'
    }
  }
]
const scanResult5ghz = [
  {
    ssid: 'test5',
    channel: 36,
    vht_operation: {
      center_freq_1: 42,
      center_freq_2: 0,
      channel_width: 80
    }
  },
  {
    ssid: 'test2',
    channel: 60,
    vht_operation: {
      center_freq_1: 42,
      center_freq_2: 50,
      channel_width: 160
    }
  }
]

const scannedDevices = {
  data: [
    {
      ssid: 'test2_4',
      band: '2.4GHz',
      channel: 1,
      ht_operation: {
        primary_channel: 1,
        channel_width: 2040,
        secondary_channel_offset: 'above'
      }
    },
    {
      ssid: 'test',
      band: '2.4GHz',
      channel: 5,
      ht_operation: {
        primary_channel: 5,
        channel_width: 40,
        secondary_channel_offset: 'above'
      }
    },
    {
      ssid: 'test5',
      band: '5GHz',
      channel: 36,
      vht_operation: {
        channel_width: 80,
        center_freq_1: 42,
        center_freq_2: 0
      }
    },
    {
      ssid: 'test2',
      band: '5GHz',
      channel: 60,
      vht_operation: {
        channel_width: 160,
        center_freq_1: 42,
        center_freq_2: 50
      }
    }
  ],
  timestamp: 1709453419462
}
const scannedDevices24GHz = [
  {
    ssid: 'test2_4',
    band: '2.4GHz',
    channel: 1,
    channel_center: 3,
    channel_width: 40,
    ht_operation: {
      primary_channel: 1,
      channel_width: 2040,
      secondary_channel_offset: 'above'
    }
  },
  {
    ssid: 'test',
    band: '2.4GHz',
    channel: 5,
    channel_center: 7,
    channel_width: 40,
    ht_operation: {
      primary_channel: 5,
      channel_width: 40,
      secondary_channel_offset: 'above'
    }
  }
]
const scannedDevices5GHz = [
  {
    ssid: 'test5',
    band: '5GHz',
    channel: 36,
    channel_center: 42,
    channel_width: 80,
    vht_operation: {
      center_freq_1: 42,
      center_freq_2: 0,
      channel_width: 80
    }
  },
  {
    ssid: 'test2',
    band: '5GHz',
    channel_center: 50,
    channel_width: 160,
    channel: 60,
    vht_operation: {
      center_freq_1: 42,
      center_freq_2: 50,
      channel_width: 160
    }
  }
]

describe('ChannelAnalysis.vue', () => {
  let wrapper
  beforeEach(() => {
    window.localStorage.clear()
    wrapper = createWrapper(ChannelAnalysis, {
      stubs: {
        'tlt-tabs': {
          ...VuciFormStub
        }
      },
      mocks: {
        $axios: {
          bulk: () => Promise.resolve([])
        }
      }
    })
    wrapper.vm.scannedDevices = scannedDevices
  })

  it.each`
    radioDevices                                  | res
    ${[]}                                         | ${[{ name: 'band2_4', title: '2.4 GHz' }, { name: 'band5', title: '5 GHz', show: false }, { name: 'rating', title: 'Rating' }]}
    ${[['radio0', '2.4GHz']]}                     | ${[{ name: 'band2_4', title: '2.4 GHz' }, { name: 'band5', title: '5 GHz', show: false }, { name: 'rating', title: 'Rating' }]}
    ${[['radio1', '5GHz'], ['radio0', '2.4GHz']]} | ${[{ name: 'band2_4', title: '2.4 GHz' }, { name: 'band5', title: '5 GHz', show: true }, { name: 'rating', title: 'Rating' }]}
  `('computes tabs when radio devices are $radioDevices', ({ radioDevices, res }) => {
    wrapper.vm.radioDevices = radioDevices
    expect(wrapper.vm.tabs).toEqual(res)
  })

  it('computes scanned devices with 2.4GHz band', () => {
    expect(wrapper.vm.scannedDevices24GHz).toEqual(scannedDevices24GHz)
  })

  it('computes scanned devices with 5GHz band', () => {
    expect(wrapper.vm.scannedDevices5GHz).toEqual(scannedDevices5GHz)
  })

  describe('method parseChannelWidth()', () => {
    it.each`
      device                                                                                                                                     | res
      ${{ band: '2.4GHz', ht_operation: { channel_width: 20, secondary_channel_offset: 'no secondary' }, vht_operation: { channel_width: 40 } }} | ${20}
      ${{ band: '2.4GHz', ht_operation: { channel_width: 2040, secondary_channel_offset: 'above' }, vht_operation: { channel_width: 80 } }}      | ${80}
      ${{ band: '2.4GHz', vht_operation: { channel_width: 40 } }}                                                                                | ${40}
      ${{ band: '2.4GHz' }}                                                                                                                      | ${20}
      ${{ band: '5GHz', ht_operation: { channel_width: 20 }, vht_operation: { channel_width: 40 } }}                                             | ${40}
      ${{ band: '5GHz', ht_operation: { channel_width: 20 }, vht_operation: { channel_width: 80 } }}                                             | ${80}
      ${{ band: '5GHz', ht_operation: { channel_width: 2040 } }}                                                                                 | ${40}
      ${{ band: '5GHz' }}                                                                                                                        | ${20}
    `("parses $device device's channel width", ({ device, res }) => {
      expect(wrapper.vm.parseChannelWidth(device)).toBe(res)
    })
  })

  describe('method scanWifi()', () => {
    it('scans wifi devices', async () => {
      const timestamp = 1709453419463
      Date.now = () => timestamp
      wrapper.vm.radioDevices = [
        ['radio0', '2.4GHz'],
        ['radio1', '5GHz']
      ]
      vi.spyOn(axios, 'bulk').mockResolvedValue([
        { success: true, data: scanResult2ghz },
        { success: true, data: scanResult5ghz }
      ])
      const spy = vi.spyOn(wrapper.vm.store, 'spin')
      await wrapper.vm.scanWifi()
      expect(spy).toHaveBeenCalledWith('Scanning...')
      expect(wrapper.vm.scannedDevices).toEqual({ data: scannedDevices.data, timestamp })
    })
    it('shows error', async () => {
      wrapper.vm.radioDevices = [
        ['radio0', '2.4GHz'],
        ['radio1', '5GHz']
      ]
      vi.spyOn(axios, 'bulk').mockResolvedValue([
        { success: false, errors: [{ code: 1 }] },
        { success: false, errors: [{ code: 3 }] }
      ])

      const spy = vi.spyOn(wrapper.vm.store, 'spin')
      const spy2 = vi.spyOn(wrapper.vm.message, 'error')
      await wrapper.vm.scanWifi()
      expect(spy).toHaveBeenCalledWith('Scanning...')
      expect(spy2).toHaveBeenNthCalledWith(1, 'Failed to load 2.4GHz networks data')
      expect(spy2).toHaveBeenNthCalledWith(2, 'Wireless scan cannot be performed for 5GHz network when DFS channel and FCC regulatory domain is selected')
    })
  })
})
