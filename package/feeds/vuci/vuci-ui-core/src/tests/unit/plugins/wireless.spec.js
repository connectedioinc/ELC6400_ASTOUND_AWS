import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import wirelessPlugin, { wireless } from '@/plugins/wireless'
import '@ui-core/utils/string-format'
import { useMainStore } from '@/stores/main'
import i18n from '@ui-core/plugins/i18n'

vi.mock('@ui-core/plugins/messages')
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({
    path: ''
  })
}))

describe('wireless.js', () => {
  beforeEach(() => {
    const app = { config: { globalProperties: {} } }
    setActivePinia(createTestingPinia())
    wirelessPlugin.install(app)
    i18n.install(app)
    vi.restoreAllMocks()
  })
  it.each`
    mode          | response
    ${'ap'}       | ${'Access Point'}
    ${'sta'}      | ${'Client'}
    ${'adhoc'}    | ${'Ad-Hoc'}
    ${'mesh'}     | ${'Mesh'}
    ${'monitor'}  | ${'Monitor'}
    ${'new-mode'} | ${'new-mode'}
    ${null}       | ${'-'}
    ${''}         | ${'-'}
  `('getMode returns "$response" mode when mode is $mode', async ({ mode, response }) => {
    expect(wireless.getMode(mode)).toEqual(response)
  })
  it.each`
    errorMessages                                                                                       | radios                  | expectedResult
    ${[]}                                                                                               | ${['radio0', 'radio1']} | ${{ valid: true, isValid: true }}
    ${[{ limit: 4, band: '2.4GHz', radioId: 'radio0' }]}                                                | ${['radio0', 'radio1']} | ${{ valid: true, isValid: true }}
    ${[{ limit: 4, band: '2.4GHz', radioId: 'radio0' }, { limit: 4, band: '5GHz', radioId: 'radio1' }]} | ${['radio0', 'radio1']} | ${{ valid: false, isValid: false, message: 'A maximum number of 4 interfaces on 2.4GHz radio is allowed. A maximum number of 4 interfaces on 5GHz radio is allowed.' }}
    ${[]}                                                                                               | ${['radio0', 'radio1']} | ${{ valid: true, isValid: true }}
    ${[{ limit: 4, band: '2.4GHz', radioId: 'radio0' }]}                                                | ${['radio0']}           | ${{ valid: false, isValid: false, message: 'A maximum number of 4 interfaces on 2.4GHz radio is allowed.' }}
  `('validates ssid cound on one radio #%#', ({ errorMessages, radios, expectedResult }) => {
    vi.spyOn(wireless, 'allRadios').mockReturnValue(radios)
    vi.spyOn(wireless, 'getAllRadioMaxSsid').mockReturnValue([])
    vi.spyOn(wireless, 'getSsidCountErrors').mockReturnValue(errorMessages)
    expect(wireless.validateRadios([])).toEqual(expectedResult)
  })
  it.each`
    testRadio               | radioInterfaces | expectedResult
    ${['radio0']}           | ${[3, 4]}       | ${[]}
    ${['radio0']}           | ${[4, 3]}       | ${[{ limit: 4, band: '2.4GHz', radioId: 'radio0' }]}
    ${['radio0', 'radio1']} | ${[4, 4]}       | ${[{ limit: 4, band: '2.4GHz', radioId: 'radio0' }, { limit: 4, band: '5GHz', radioId: 'radio1' }]}
  `('returns ssid count errors #%#', ({ testRadio, radioInterfaces, expectedResult }) => {
    const store = useMainStore()
    store.board = {
      wlan: {
        wlan0: { bssid_limit: 4 },
        wlan1: { bssid_limit: 4 }
      }
    }
    const wifiInterfaces = [
      ...Array.from({ length: radioInterfaces[0] }, (_, id) => ({ id, device: ['radio0'] })),
      ...Array.from({ length: radioInterfaces[1] }, (_, id) => ({ id, device: ['radio1'] }))
    ]
    expect(wireless.getSsidCountErrors(wifiInterfaces, testRadio, undefined, [4, 4])).toEqual(expectedResult)
  })
  it.each`
    testRadio               | wifiInterfaces                                                                                               | expectedResult
    ${['radio0']}           | ${[{ id: 'test1', device: ['radio0'], mode: 'ap' }]}                                                         | ${[]}
    ${['radio0', 'radio1']} | ${[{ id: 'test1', device: ['radio0'], mode: 'sta' }]}                                                        | ${[{ band: '2.4GHz', radioId: 'radio0', limit: 1 }]}
    ${['radio0', 'radio1']} | ${[{ id: 'test1', device: ['radio0'], mode: 'sta' }, { id: 'test2', device: ['radio1'], mode: 'multi_ap' }]} | ${[{ band: '2.4GHz', radioId: 'radio0', limit: 1 }, { band: '5GHz', radioId: 'radio1', limit: 1 }]}
  `('returns client count errors #%#', ({ testRadio, wifiInterfaces, expectedResult }) => {
    vi.spyOn(wireless, 'radioOptions').mockReturnValue([
      ['radio0', '2.4GHz'],
      ['radio1', '5GHz']
    ])
    expect(wireless.getSsidCountErrors(wifiInterfaces, testRadio, ['sta', 'multi_ap'], 1)).toEqual(expectedResult)
  })
  it.each`
    errorMessages                                                                                       | expectedResult
    ${[]}                                                                                               | ${{ valid: true, isValid: true }}
    ${[{ band: '2.4GHz', radioId: 'radio0', limit: 1 }, { band: '5GHz', radioId: 'radio1', limit: 1 }]} | ${{ valid: false, isValid: false, message: '2.4GHz, 5GHz radio(s) already have one client or Multi AP. To specify few possible APs for client use single Multi AP.' }}
    ${[{ band: '2.4GHz', radioId: 'radio0', limit: 1 }]}                                                | ${{ valid: false, isValid: false, message: '2.4GHz radio(s) already have one client or Multi AP. To specify few possible APs for client use single Multi AP.' }}
  `('validates sta count on one radio #%#', ({ errorMessages, expectedResult }) => {
    vi.spyOn(wireless, 'allRadios').mockReturnValue(['radio0', 'radio1'])
    vi.spyOn(wireless, 'getSsidCountErrors').mockReturnValue(errorMessages)
    expect(wireless.validateClient([])).toEqual(expectedResult)
  })

  it.each`
    wifiInterfaces                                             | expectedResult
    ${[{ id: 'test1', device: ['radio0'], mode: 'ap' }]}       | ${{ valid: true, isValid: true }}
    ${[{ id: 'test1', device: ['radio0'], mode: 'multi_ap' }]} | ${{ valid: false, isValid: false, message: 'There is already one Multi AP created.' }}
  `('validates multi_ap count #%#', ({ wifiInterfaces, expectedResult }) => {
    const store = useMainStore()
    store.board = { wlan: {} }
    expect(wireless.validateMultiAP(wifiInterfaces)).toEqual(expectedResult)
  })

  it.each`
    wirelessStauts                                                                                                                                                                                              | expectedResult
    ${{ mode: 'sta', ssid: 'myWifi', clients: [{ expires: 1000, ipaddr: '192.168.1.1', hostname: 'RUTX11', tx_rate: 1000, rx_rate: 1000, band: '2.4GHz', macaddr: '01:23:45:67:89:01', signal: '-100 dBm' }] }} | ${[{ expires: 1000, ipaddr: '192.168.1.1', hostname: 'RUTX11', tx_rate: '1 Kbit/s', rx_rate: '1 Kbit/s', band: '2.4GHz', macaddr: '01:23:45:67:89:01', signal: '-100 dBm', ssid: 'myWifi' }]}
    ${{ mode: 'sta', clients: [{ tx_rate: 1000, rx_rate: 1000, band: '2.4GHz', macaddr: '01:23:45:67:89:01', signal: '-100 dBm' }] }}                                                                           | ${[{ expires: '-', ipaddr: '-', hostname: '-', tx_rate: '1 Kbit/s', rx_rate: '1 Kbit/s', band: '2.4GHz', macaddr: '01:23:45:67:89:01', signal: '-100 dBm', ssid: '-' }]}
    ${{ mode: 'mesh', assoclist: { '01:23:45:67:89:01': { device: 'radio0', tx_rate: 1000, rx_rate: 1000, signal: -100 } } }}                                                                                   | ${[{ expires: '-', ipaddr: '-', hostname: '-', tx_rate: '1 Kbit/s', rx_rate: '1 Kbit/s', band: '2.4GHz', macaddr: '01:23:45:67:89:01', signal: '-100 dBm', ssid: '-' }]}
  `('Parses ap client %#%', ({ wirelessStauts, expectedResult }) => {
    expect(wireless.getParsedClients(wirelessStauts)).toEqual(expectedResult)
  })

  it.each`
    board                         | ifaceConfigs                                                                                                                                                                   | expectedResult
    ${{ hwinfo: { dsa: true } }}  | ${[{ name: 'br-lan', bridge: '1' }, { name: 'eth0.10', bridge: '0', device: 'eth0.10' }, { name: 'vlan1', bridge: '1' }, { name: 'eth1.20', bridge: '0', device: 'eth1.20' }]} | ${[['br-lan', 'br-lan'], ['vlan1', 'vlan1'], ['eth0.10', 'eth0.10 (VLAN ID: 10)'], ['eth1.20', 'eth1.20 (VLAN ID: 20)']]}
    ${{ hwinfo: { dsa: true } }}  | ${[{ name: 'eth0.10', bridge: '0', device: 'eth0.10' }, { name: 'eth1.20', bridge: '0', device: 'eth1.20' }]}                                                                  | ${[['eth0.10', 'eth0.10 (VLAN ID: 10)'], ['eth1.20', 'eth1.20 (VLAN ID: 20)']]}
    ${{ hwinfo: { dsa: true } }}  | ${[{ name: 'eth0', bridge: '1', device: 'eth0' }, { name: 'eth2', bridge: '0', device: 'eth2' }, { name: 'eth3.abc', bridge: '0', device: 'eth3.abc' }]}                       | ${[['eth0', 'eth0']]}
    ${{ hwinfo: { dsa: false } }} | ${[{ name: 'br-lan', bridge: '1' }, { name: 'eth0', bridge: '0' }, { name: 'vlan1', bridge: '1' }]}                                                                            | ${[['br-lan', 'br-lan'], ['vlan1', 'vlan1']]}
    ${{ hwinfo: { dsa: false } }} | ${[{ name: 'eth0', bridge: '0' }, { name: 'eth1', bridge: '0' }]}                                                                                                              | ${[]}
  `('retrieves available networks for PPSK config %#', ({ board, ifaceConfigs, expectedResult }) => {
    const store = useMainStore()
    store.board = board
    const result = wireless.getAvailableNetworks(ifaceConfigs)
    expect(result).toEqual(expectedResult)
  })
})
