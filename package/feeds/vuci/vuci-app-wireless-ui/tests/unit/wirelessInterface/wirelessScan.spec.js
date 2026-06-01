import createWrapper from '@tests/unit/mockFactory'
import WirelessScan from '../../../src/views/network/wirelessInterface/WirelessScan.vue'
import { FormDataKey } from '../../../src/views/network/wirelessInterface/WirelessInterfaceCommon'
import { retryRequest, axios } from '@ui-core/plugins/axios'
import { ref } from 'vue'
import { wireless } from '@/plugins/wireless'

vi.mock('@ui-core/plugins/axios', async () => {
  const actual = await vi.importActual('@ui-core/plugins/axios')
  return {
    ...actual,
    axios: { post: vi.fn().mockResolvedValue({}) },
    retryRequest: vi.fn().mockResolvedValue()
  }
})

const wrapperOptions = {
  props: {
    device: 'radio1',
    uciData: {},
    navigation: [],
    interfaces: []
  },
  global: {
    provide: {
      [FormDataKey]: ref({ wifiInterfaces: [] })
    }
  }
}
describe('WirelessScan2.vue', () => {
  const checkable = ['arr', 'val']
  let wrapper
  beforeEach(() => {
    // retryRequest.mockRestore()
    wrapper = createWrapper(WirelessScan, wrapperOptions)
    vi.clearAllMocks()
  })
  it('performs scan', async () => {
    // horrible workaround idk how to wait for mount to complete. Let's hope this doesn't break in CI
    await wrapper.vm.$nextTick()
    const spinSpy = vi.spyOn(wrapper.vm.store, 'spin')
    const messageSpy = vi.spyOn(wrapper.vm.message, 'error')
    retryRequest
      .mockResolvedValueOnce({
        data: { data: checkable }
      })
      .mockRejectedValue(new Error('error'))
    await wrapper.vm.performScan()
    expect(spinSpy).toHaveBeenCalledTimes(2)
    expect(wrapper.vm.scanResults).toEqual(checkable)
    await wrapper.vm.performScan()
    expect(messageSpy).toHaveBeenCalledWith('Failed to perform a scan')
    messageSpy.mockClear()
  })
  it('performs scan, when DFS channel is selected', async () => {
    retryRequest.mockReset().mockRejectedValue({ response: { data: { errors: [{ code: 3 }] } } })
    const messageSpy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.performScan()
    expect(messageSpy).toHaveBeenCalledWith('Wireless scan can not be performed when DFS channel and FCC regulatory domain is selected')
    messageSpy.mockClear()
  })
})

describe('WirelessScan.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(WirelessScan, wrapperOptions)
    vi.spyOn(wrapper.vm, 'performScan').mockResolvedValue()
  })
  it('scan card title changes when network is selected', () => {
    const name = 'My ssid'
    expect(wrapper.vm.scanTitle).toEqual('Wireless scan results')
    wrapper.vm.selectedNetwork = { ssid: name }
    expect(wrapper.vm.scanTitle).toEqual(`Joining network: ${name}`)
  })
  it("sets selected network and emits it's name when validation passes", () => {
    vi.spyOn(wireless, 'validateClient').mockReturnValue({ valid: true })
    vi.spyOn(wireless, 'validateRadios').mockReturnValue({ valid: true })
    const joinable = { ssid: 'home ssid', encryption: { enabled: true } }
    expect(wrapper.vm.selectedNetwork).toEqual(null)
    wrapper.vm.joinNetwork(joinable)
    expect(wrapper.emitted()['network-select']).toBeTruthy()
    expect(wrapper.vm.selectedNetwork).toEqual(joinable)
  })
  it('instantly joins network if it has no encryption', async () => {
    vi.spyOn(wireless, 'validateClient').mockReturnValue({ valid: true })
    vi.spyOn(wireless, 'validateRadios').mockReturnValue({ valid: true })
    const joinable = { ssid: 'home ssid', encryption: { enabled: false } }
    expect(wrapper.vm.selectedNetwork).toEqual(null)
    await wrapper.vm.joinNetwork(joinable)
    expect(wrapper.emitted()['network-joined']).toBeTruthy()
  })
  it('instantly joins network if it has no encryption', async () => {
    vi.spyOn(wireless, 'validateClient').mockReturnValue({ valid: true })
    vi.spyOn(wireless, 'validateRadios').mockReturnValue({ valid: true })
    const joinable = { ssid: 'home ssid', encryption: { enabled: true, authentication: ['802.1x'] } }
    expect(wrapper.vm.selectedNetwork).toEqual(null)
    await wrapper.vm.joinNetwork(joinable)
    expect(wrapper.emitted()['network-joined']).toBeTruthy()
  })
  it('does nothing if validation do not pass', async () => {
    vi.spyOn(wireless, 'validateClient').mockReturnValue({ valid: false })
    vi.spyOn(wireless, 'validateRadios').mockReturnValue({ valid: false })
    const joinable = { ssid: 'home ssid' }
    expect(wrapper.vm.selectedNetwork).toEqual(null)
    await wrapper.vm.joinNetwork(joinable)
    expect(wrapper.vm.selectedNetwork).toEqual(null)
  })
  it('formats signal according to given values', () => {
    const tests = [
      {
        input: { bssid: 'aas', quality: 15, quality_max: 100 },
        result: {
          scale: 15,
          signal: undefined,
          qval: 15,
          qmax: 100
        }
      },
      {
        input: { bssid: 'aas', quality: 14, quality_max: 100 },
        result: {
          scale: 14,
          signal: undefined,
          qval: 14,
          qmax: 100
        }
      },
      {
        input: { quality: 35, quality_max: 100 },
        result: {
          scale: 35,
          signal: undefined,
          qval: 35,
          qmax: 100
        }
      },
      {
        input: { bssid: 'aaaa', quality: 35, quality_max: 100 },
        result: {
          scale: 35,
          signal: undefined,
          qval: 35,
          qmax: 100
        }
      },
      {
        input: { bssid: 'aaaa', quality: 55, quality_max: 100 },
        result: {
          scale: 55,
          signal: undefined,
          qval: 55,
          qmax: 100
        }
      },
      {
        input: { bssid: 'aaaa', quality: 75, quality_max: 100 },
        result: {
          scale: 75,
          signal: undefined,
          qval: 75,
          qmax: 100
        }
      }
    ]
    tests.forEach(t => expect(wrapper.vm.formatSignal(t.input)).toEqual(t.result))
  })
  it('filters hidden ssids', () => {
    wrapper.vm.scanResults = [{ bssid: '20:97:27:13:06:70' }, { bssid: '20:97:27:13:06:71', ssid: '' }, { bssid: '20:97:27:13:06:72', ssid: 'myWifi' }]
    expect(wrapper.vm.filteredResults).toEqual([{ bssid: '20:97:27:13:06:72', ssid: 'myWifi' }])
  })
  it.each`
    mode              | expectedResult
    ${'Unknown'}      | ${'Unknown'}
    ${'Access Point'} | ${'Access Point'}
    ${'Ad-Hoc'}       | ${'Ad-Hoc'}
    ${'Test'}         | ${'Test'}
    ${null}           | ${'-'}
  `('returns translated mode #%#', ({ mode, expectedResult }) => {
    expect(wrapper.vm.modeTranslation(mode)).toEqual(expectedResult)
  })
  it('joins mesh network', async () => {
    const data = {
      ssid: 'mesh1',
      key: '12345678'
    }
    const network = {
      encryption: { authentication: ['sae'] }
    }
    vi.spyOn(wireless, 'getAutoNetworkName').mockReturnValue('wifi0')
    vi.spyOn(axios, 'post').mockResolvedValueOnce({ success: true, data })
    await wrapper.vm.joinMeshNetwork(data, network)
    expect(wrapper.emitted()['network-joined']).toBeTruthy()
    expect(wrapper.emitted()['network-joined'][0]).toEqual([data, network])
  })
  it('fails to join mesh network', async () => {
    vi.spyOn(axios, 'post').mockRejectedValueOnce({ success: false })
    await wrapper.vm.joinMeshNetwork({}, {})
    expect(wrapper.emitted()['network-joined']).toBeFalsy()
  })
})
