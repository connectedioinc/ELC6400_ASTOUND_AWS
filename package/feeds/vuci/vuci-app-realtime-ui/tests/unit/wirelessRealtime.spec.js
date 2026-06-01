import { nextTick } from 'vue'
import wirelessRealtime from '../../src/views/status/WirelessRealtime.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('WirelessRealtime.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(wirelessRealtime)
  })
  it.each`
    string    | yAxisID | key          | expectedResult
    ${-100}   | ${'y'}  | ${'noise'}   | ${'-100 dBm (Typical)'}
    ${-100.1} | ${'y'}  | ${'noise'}   | ${'-100.10 dBm (Typical)'}
    ${-50}    | ${'y'}  | ${'signal'}  | ${'-50 dBm (Excellent)'}
    ${50}     | ${'y2'} | ${'quality'} | ${'50 % (Fair)'}
  `('Formats value #%#', ({ string, yAxisID, key, expectedResult }) => {
    expect(wrapper.vm.formatValue(string, yAxisID, key)).toEqual(expectedResult)
  })
  it('Calculates mesurements', () => {
    wrapper.vm.wifiIface = 'wlan2-2'
    wrapper.vm.rawLiveData = [
      {
        time: 100,
        value: [{ devices: [{ ifname: 'wlan1-1' }, { ifname: 'wlan2-2', noise: -100, signal: -20, quality: 50 }] }]
      },
      {
        time: 200,
        value: [{ devices: [] }]
      }
    ]
    expect(wrapper.vm.currentRawLiveData).toEqual([
      {
        time: 100,
        value: { noise: -100, signal: -20, quality: 50 }
      },
      {
        time: 200,
        value: { noise: null, signal: null, quality: null }
      }
    ])
  })
  it('gets name from given status', () => {
    const status = { ssid: 'good SSID', devices: [{ band: '2.4 GHz' }] }
    expect(wrapper.vm.getName(status)).toEqual('good SSID (2.4 GHz)')
  })
  it('gets name from current selection', () => {
    wrapper.vm.rawLiveData = [
      {
        time: 100,
        value: [
          { ssid: 'bad SSID', devices: [{ ifname: 'wlan2-2', band: '5 GHz' }] },
          {
            ssid: 'good SSID',
            devices: [
              { ifname: 'wlan1-2', band: '5 GHz' },
              { ifname: 'wlan1-1', band: '2.4 GHz' }
            ]
          }
        ]
      }
    ]
    wrapper.vm.wifiIface = 'wlan1-1'
    expect(wrapper.vm.getName()).toEqual('good SSID (2.4 GHz)')
  })
  it('every line is not shown', () => {
    expect(wrapper.vm.graphs).toEqual([expect.objectContaining({ show: false }), expect.objectContaining({ show: false }), expect.objectContaining({ show: false })])
  })
  it('every line is shown', async () => {
    wrapper.vm.rawLiveData = [
      {
        time: 100,
        value: [{ devices: [{ ifname: 'wlan1-1', quality: '100', signal: '1', noise: '1' }] }]
      }
    ]
    wrapper.vm.wifiIface = 'wlan1-1'
    await nextTick()
    expect(wrapper.vm.graphs).toEqual([expect.objectContaining({ show: true }), expect.objectContaining({ show: true }), expect.objectContaining({ show: true })])
  })
})
