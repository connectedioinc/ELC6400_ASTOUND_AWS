import connectionsRealtime from '../../src/views/status/ConnectionsRealtime.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('ConnectionsRealtime.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(connectionsRealtime)
  })
  it.each`
    string   | expectedResult
    ${100}   | ${'100'}
    ${100.1} | ${'100.10'}
  `('Formats value #%#', ({ string, expectedResult }) => {
    expect(wrapper.vm.formatValue(string)).toEqual(expectedResult)
  })
  it('Calculates mesurements', () => {
    wrapper.vm.rawLiveData = [
      {
        time: 100,
        value: [{ layer4: 'udp' }, { layer4: 'tcp' }, { layer4: 'udp' }, { layer4: 'icmp' }, { layer4: 'udp' }]
      }
    ]
    expect(wrapper.vm.currentRawLiveData).toEqual([
      {
        time: 100,
        value: { other: 1, tcp: 1, udp: 3 }
      }
    ])
  })
})
