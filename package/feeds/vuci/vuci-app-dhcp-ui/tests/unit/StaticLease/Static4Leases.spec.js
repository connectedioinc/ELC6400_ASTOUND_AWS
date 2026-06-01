import view from '../../../src/views/network/StaticLease/Static4Leases.vue'
import createWrapper from '@tests/unit/mockFactory'
import { ipv4Utils } from '@/utils/ipUtils'

describe('Static4Leases.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(view)
  })

  it('computes available addresses data', () => {
    wrapper.vm.ifaceDhcpConfig = [
      { ipaddr: '192.168.1.1', netmask: '255.255.255.0' },
      { ipaddr: '192.168.2.1', netmask: '255.255.255.128' },
      { ipaddr: '192.168.3.1', netmask: '255.255.0.0' }
    ]
    expect(wrapper.vm.availableAddresses).toEqual([
      {
        netmask: '255.255.255.0',
        broadcast: '192.168.1.255',
        endIp: '192.168.1.254',
        network: '192.168.1.0',
        startIp: '192.168.1.1'
      },
      {
        netmask: '255.255.255.128',
        broadcast: '192.168.2.127',
        endIp: '192.168.2.126',
        network: '192.168.2.0',
        startIp: '192.168.2.1'
      },
      {
        netmask: '255.255.0.0',
        broadcast: '192.168.255.255',
        endIp: '192.168.255.254',
        network: '192.168.0.0',
        startIp: '192.168.0.1'
      }
    ])
  })

  it.each`
    value              | response
    ${'192.168.1.50'}  | ${{ isValid: true }}
    ${'192.168.1.0'}   | ${{ isValid: false, message: 'A network address cannot be specified as a lease IP address.' }}
    ${'192.168.1.255'} | ${{ isValid: false, message: 'A broadcast address cannot be specified as a lease IP address.' }}
    ${'10.1.1.1'}      | ${{ isValid: false, message: 'This IP address is currently assigned to a mobile bridge and cannot be reserved.' }}
  `('check if checkIpErrors finds network and/or broadcast and/or mobile bridge errors when value is - $value', ({ value, response }) => {
    wrapper.vm.ifaceDhcpConfig = [{ ipaddr: '192.168.1.1', netmask: '255.255.255.0' }]
    wrapper.vm.ifaceStatus = [{ proto: 'wwan', data: { bridge_ipaddr: '10.1.1.1', method: 'bridge' } }]
    expect(wrapper.vm.checkIpErrors(value)).toEqual(response)
  })

  it('checkIpSubnetRange checks if entered IP is in subnet range and removes message', () => {
    const value = '192.168.1.50'
    wrapper.vm.ifaceDhcpConfig = [{ ipaddr: '192.168.1.1', netmask: '255.255.255.0' }]
    wrapper.vm.ipv4Utils = ipv4Utils
    wrapper.vm.validate = vi.fn()
    wrapper.vm.validate.mockReturnValueOnce()
    wrapper.vm.$VuciValidator.ip4addr = vi.fn()
    wrapper.vm.$VuciValidator.ip4addr.mockReturnValueOnce({ isValid: true })
    expect(wrapper.vm.checkIpSubnetRange(value)).toBeUndefined()
  })

  it('checkIpSubnetRange checks if entered IP is out of subnet range and provides message', () => {
    const value = '192.168.2.1'
    const msg = 'The lease will be inoperable due to the provided IP being outside of the subnet range. Available addresses: 192.168.1.1 - 192.168.1.254'
    wrapper.vm.ifaceDhcpConfig = [{ ipaddr: '192.168.1.1', netmask: '255.255.255.0' }]
    wrapper.vm.ipv4Utils = ipv4Utils
    wrapper.vm.validate = vi.fn()
    wrapper.vm.validate.mockReturnValueOnce()
    wrapper.vm.$VuciValidator.ip4addr = vi.fn()
    wrapper.vm.$VuciValidator.ip4addr.mockReturnValueOnce({ isValid: true })
    expect(wrapper.vm.checkIpSubnetRange(value)).toEqual(msg)
  })

  it('checkIpSubnetRange checks if entered IP is out of subnet range and provides message', () => {
    const value = '192.168.2.1'
    const msg = 'The lease will be inoperable due to no DHCPv4 servers existing on the device.'
    const wrapper = createWrapper(view, {
      computed: {
        availableAddresses() {
          return []
        }
      }
    })
    wrapper.vm.ipv4Utils = ipv4Utils
    wrapper.vm.validate = vi.fn()
    wrapper.vm.validate.mockReturnValueOnce()
    wrapper.vm.$VuciValidator.ip4addr = vi.fn()
    wrapper.vm.$VuciValidator.ip4addr.mockReturnValueOnce({ isValid: true })
    expect(wrapper.vm.checkIpSubnetRange(value)).toEqual(msg)
  })
  it.each`
    value                  | response
    ${'01:23:45:67:89:11'} | ${{ isValid: true }}
    ${'01:23:45:67:*:*'}   | ${{ isValid: true }}
    ${'01:23:45:67:*:1*'}  | ${{ isValid: false, message: 'Mac address of six groups of two hexadecimal digits are accepted (e.g., 01:23:45:67:89:AB).' }}
  `('check if mac with wildcard is valid #%#', async ({ value, response }) => {
    expect(await wrapper.vm.validateWildcardMac(value)).toEqual(response)
  })
})
