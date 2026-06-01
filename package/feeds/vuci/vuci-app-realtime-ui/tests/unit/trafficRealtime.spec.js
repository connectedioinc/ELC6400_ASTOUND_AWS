import trafficRealtime from '../../src/views/status/TrafficRealtime.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('TrafficRealtime.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(trafficRealtime)
  })
  it.each`
    string  | scaleY     | expectedResult
    ${100}  | ${'live'}  | ${'100 b/s'}
    ${1000} | ${'month'} | ${'1 KB/day'}
  `('Formats value #%#', ({ string, scaleY, expectedResult }) => {
    wrapper.vm.scaleY = scaleY
    expect(wrapper.vm.formatValue(string)).toEqual(expectedResult)
  })
  it('Calculates mesurements', () => {
    wrapper.vm.currTab = 'interface/iflan1'
    wrapper.vm.rawLiveData = [
      {
        time: 100,
        value: [
          { name: 'iflan2', tx_bytes: 25, rx_bytes: 147 },
          { name: 'iflan1', up: true, carrier: true, tx_bytes: 1000, rx_bytes: 200 }
        ]
      },
      {
        time: 200,
        value: [
          { name: 'iflan2', tx_bytes: 25, rx_bytes: 147 },
          { name: 'iflan1', up: false, carrier: false, tx_bytes: 1000, rx_bytes: 200 }
        ]
      },
      {
        time: 300,
        value: [{ name: 'iflan2', tx_bytes: 25, rx_bytes: 147 }]
      }
    ]
    expect(wrapper.vm.currentRawLiveData).toEqual([
      {
        time: 100,
        value: { tx: 8000, rx: 1600 }
      },
      {
        time: 200,
        value: { tx: null, rx: null }
      },
      {
        time: 300,
        value: { tx: null, rx: null }
      }
    ])
  })
  it('returns available tabs', () => {
    wrapper.vm.networkInterfaces = [
      { name: 'LAN', device: 'br-lan' },
      { id: 'mob1s1a1', name: 'MOBILE' }
    ]
    wrapper.vm.wirelessInterfaces = [
      {
        ssid: 'my SSID',
        devices: [
          { ifname: 'wlan1-1', band: '2.4GHz' },
          { ifname: 'wlan1-2', band: '5GHz' }
        ]
      }
    ]
    expect(wrapper.vm.tabs).toEqual([
      { name: 'device/br-lan', title: 'LAN' },
      { name: 'interface/mob1s1a1', title: 'MOBILE' },
      { name: 'device/wlan1-1', title: 'my SSID (2.4GHz)' },
      { name: 'device/wlan1-2', title: 'my SSID (5GHz)' }
    ])
  })
})
