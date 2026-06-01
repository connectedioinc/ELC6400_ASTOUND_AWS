import VRF from '../../src/views/network/VRF.vue'
import VRFEdit from '../../src/views/network/VRFEdit.vue'
import createWrapper from '@tests/unit/mockFactory'
import { ref } from 'vue'
import { contextId } from '../../src/views/network/VrfCommon'

const devices = [
  {
    name: 'eth0'
  },
  {
    name: 'eth1'
  },
  {
    name: 'eth0.3',
    type: 'VLAN'
  },
  {
    name: 'wwan0'
  },
  {
    name: 'wlan1'
  },
  {
    name: 'br-lan',
    type: 'bridge',
    'bridge-members': ['eth0', 'eth0.3']
  },
  {
    name: 'br-lan.1',
    type: 'VLAN'
  },
  {
    name: 'gre4-gre_test',
    description: 'gre_test',
    type: 'VPN'
  }
]
describe('VRF.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(VRF)
  })

  it.each`
    s            | bgp             | res
    ${{ id: 1 }} | ${[{ vrf: 1 }]} | ${[{ info: "This instance can't be deleted because it is used in BGP configuration" }]}
    ${{ id: 2 }} | ${[{ vrf: 1 }]} | ${[]}
  `('tests deleteHints', ({ bgp, s, res }) => {
    wrapper.vm.bgp = bgp
    expect(wrapper.vm.deleteHints(s)).toEqual(res)
  })
  it.each`
    s            | bgp             | res
    ${{ id: 1 }} | ${[{ vrf: 1 }]} | ${true}
    ${{ id: 2 }} | ${[{ vrf: 1 }]} | ${false}
  `('tests deleteHints', ({ s, bgp, res }) => {
    wrapper.vm.bgp = bgp
    expect(wrapper.vm.usedInBgp(s)).toEqual(res)
  })
})

describe('VRFEdit.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(VRFEdit, { global: { provide: { [contextId]: { devices: ref(devices), getLinkNames: v => (v ? v.join(', ') : '') } } }, props: { section: { id: 'abs' } } })
  })
  it('computes device options', () => {
    wrapper.vm.store.allPortDevices = ['eth0', 'eth1']
    expect(wrapper.vm.devicesOptions).toEqual([
      ['br-lan', 'br-lan (eth0, eth0.3)'],
      ['br-lan.1', 'br-lan.1'],
      ['eth0', 'eth0'],
      ['eth0.3', 'eth0.3'],
      ['eth1', 'eth1'],
      ['gre4-gre_test', 'gre_test']
    ])
  })
  it.each`
    value  | res
    ${252} | ${{ isValid: true, message: '253-255 range is reserved for the default routing tables.' }}
    ${253} | ${{ isValid: false, message: '253-255 range is reserved for the default routing tables.' }}
    ${254} | ${{ isValid: false, message: '253-255 range is reserved for the default routing tables.' }}
    ${255} | ${{ isValid: false, message: '253-255 range is reserved for the default routing tables.' }}
    ${256} | ${{ isValid: true, message: '253-255 range is reserved for the default routing tables.' }}
  `('checks if value is not in range when value is $value', ({ value, res }) => {
    expect(wrapper.vm.checkReservedRange(value)).toEqual(res)
  })
  it('get VLAN warning', () => {
    const value = 'br-lan.1'
    expect(wrapper.vm.getLinkWarning([value])).toEqual(`VLAN(s) "${value}" must be assigned to an active interface to operate correctly.`)
  })
  it.each`
    value                 | res
    ${['eth1']}           | ${{ isValid: true, message: 'Port(s) "" already used in a bridge device.' }}
    ${['eth0', 'eth0.3']} | ${{ isValid: false, message: 'Port(s) "eth0, eth0.3" already used in a bridge device.' }}
    ${['br-lan.1']}       | ${{ isValid: true, message: 'Port(s) "" already used in a bridge device.' }}
    ${['br-lan']}         | ${{ isValid: false, message: 'Bridge(s) "br-lan" cannot be used because bridge VLAN(s) are created.' }}
    ${['gre4-gre_test']}  | ${{ isValid: true, message: 'Port(s) "" already used in a bridge device.' }}
  `('validates link for selected devices $value', ({ value, res }) => {
    expect(wrapper.vm.validateLink(value)).toEqual(res)
  })
  it.each`
    response                                                 | expectedError
    ${{ data: { errors: [] } }}                              | ${'Failed to edit configuration'}
    ${{ data: {} }}                                          | ${'Failed to edit configuration'}
    ${{ data: { errors: [{ source: 'id', code: 100 }] } }}   | ${'Failed to edit configuration'}
    ${{ data: { errors: [{ source: 'name', code: 103 }] } }} | ${'Dublicate VRF and interface names are not allowed'}
  `('return error depending on response #%#', ({ response, expectedError }) => {
    expect(wrapper.vm.handleErrors(response)).toEqual(expectedError)
  })
})
