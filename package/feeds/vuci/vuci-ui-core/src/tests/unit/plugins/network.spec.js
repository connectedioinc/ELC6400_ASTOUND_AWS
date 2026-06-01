import { network } from '@/plugins/network'
import '@ui-core/utils/string-format'
import { useMessages } from '@/stores/messages'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import i18n from '@ui-core/plugins/i18n'
import { useMainStore } from '@/stores/main'

vi.mock('@ui-core/plugins/messages')

describe('network.js', () => {
  beforeEach(() => {
    const app = { config: { globalProperties: {} } }
    setActivePinia(createTestingPinia())
    i18n.install(app)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  describe('network.js', () => {
    it.each`
      test                            | extraPorts       | resultLength
      ${'no extraPorts are provided'} | ${[]}            | ${16}
      ${'extraPort are provided'}     | ${[['', 'Any']]} | ${17}
    `('returns getPortOptions when $test', ({ extraPorts, resultLength }) => {
      expect(network.getPortOptions(...extraPorts).length).toEqual(resultLength)
    })

    it.each`
      test                                 | data                                            | extraIp          | expectResult
      ${'no extra Ips are provided'}       | ${[['192.168.1.1', 'host.lt']]}                 | ${[]}            | ${[['192.168.1.1', '192.168.1.1 (host.lt)']]}
      ${'extraPort are provided'}          | ${[['192.168.1.1', 'host.lt']]}                 | ${[['', 'Any']]} | ${[['', 'Any'], ['192.168.1.1', '192.168.1.1 (host.lt)']]}
      ${'data from whole routes endpoint'} | ${{ ipv4_hints: [['192.168.1.1', 'host.lt']] }} | ${[]}            | ${[['192.168.1.1', '192.168.1.1 (host.lt)']]}
    `('returns getPortOptions when $test', ({ data, extraIp, expectResult }) => {
      expect(network.getIpOptions(data, ...extraIp)).toEqual(expectResult)
    })

    it.each`
      test                                 | data                                                    | extraMac         | expectResult
      ${'no extra Ips are provided'}       | ${[['aa:aa:aa:aa:aa:aa:aa', 'host.lt']]}                | ${[]}            | ${[['aa:aa:aa:aa:aa:aa:aa', 'aa:aa:aa:aa:aa:aa:aa (host.lt)']]}
      ${'extraPort are provided'}          | ${[['aa:aa:aa:aa:aa:aa:aa', 'host.lt']]}                | ${[['', 'Any']]} | ${[['', 'Any'], ['aa:aa:aa:aa:aa:aa:aa', 'aa:aa:aa:aa:aa:aa:aa (host.lt)']]}
      ${'data from whole routes endpoint'} | ${{ mac_hints: [['aa:aa:aa:aa:aa:aa:aa', 'host.lt']] }} | ${[]}            | ${[['aa:aa:aa:aa:aa:aa:aa', 'aa:aa:aa:aa:aa:aa:aa (host.lt)']]}
    `('returns getPortOptions when $test', ({ data, extraMac, expectResult }) => {
      expect(network.getMacOptions(data, ...extraMac)).toEqual(expectResult)
    })

    it.each`
      type         | result
      ${undefined} | ${'-'}
      ${'-'}       | ${'-'}
      ${'mobile'}  | ${'Mobile'}
    `('returns networkType when type is $type', ({ type, result }) => {
      const res = network.parseNetworkType(type)
      expect(res).toBe(result)
    })

    it.each`
      status                                                                             | expectedResult
      ${{ ipv4_status: 'Untracked', ipv6_status: 'Untracked', dns_status: 'Untracked' }} | ${[{ title: 'IPv4 status', slotName: 'ipv4_status', info: 'Untracked' }, { title: 'IPv6 status', slotName: 'ipv6_status', info: 'Untracked' }, { title: 'DNS status', slotName: 'dns_status', info: 'Untracked' }]}
      ${{ ipv4_status: 'Online', ipv6_status: 'Online', dns_status: 'Online' }}          | ${[{ title: 'IPv4 status', slotName: 'ipv4_status', info: 'Online', style: 'success' }, { title: 'IPv6 status', slotName: 'ipv6_status', info: 'Online', style: 'success' }, { title: 'DNS status', slotName: 'dns_status', info: 'Available', style: 'success' }]}
      ${{ ipv4_status: 'Offline', ipv6_status: 'Offline', dns_status: 'Offline' }}       | ${[{ title: 'IPv4 status', slotName: 'ipv4_status', info: 'Offline', style: 'error' }, { title: 'IPv6 status', slotName: 'ipv6_status', info: 'Offline', style: 'error' }, { title: 'DNS status', slotName: 'dns_status', info: 'Unavailable', style: 'error' }]}
    `('returns parseInternetStatus when $status', ({ status, expectedResult }) => {
      expect(network.parseInternetStatus(status)).toEqual(expectedResult)
    })

    it('returns interface options', () => {
      const interfaces = [
        {
          device: 'wlan1',
          data: {
            leasetime: 43200,
            hostname: 'Teltonika-RUTX11'
          },
          interface: 'guest_123',
          name: 'guest_123',
          subdevices: []
        },
        {
          device: 'br-lan',
          interface: 'lan',
          name: 'lan',
          subdevices: ['eth0', 'wlan0', 'wlan1-1']
        },
        {
          device: 'lo',
          interface: 'loopback',
          name: 'loopback',
          subdevices: []
        },
        {
          interface: 'mob1s1a1',
          name: 'mob1s1a1',
          subdevices: []
        },
        {
          interface: 'mob1s2a1',
          name: 'mob1s2a1',
          subdevices: []
        },
        {
          device: 'eth1',
          interface: 'wan',
          name: 'wan',
          subdevices: []
        },
        {
          interface: 'wan6',
          name: 'wan6',
          device: 'eth1',
          subdevices: []
        }
      ]
      const expectedResult = [
        ['br-lan', 'br-lan (lan)'],
        ['eth0', 'eth0 (lan)'],
        ['eth1', 'eth1 (wan, wan6)'],
        ['wlan0', 'wlan0 (lan)'],
        ['wlan1', 'wlan1 (guest_123)'],
        ['wlan1-1', 'wlan1-1 (lan)']
      ]
      const result = network.interfaceOptions(interfaces)
      expect(result).toEqual(expectedResult)
    })
    it.each`
      section                                             | resultEnable | isErrorCalled
      ${{ enable_dhcpv6: '0' }}                           | ${'0'}       | ${false}
      ${{ enable_dhcpv6: '1' }}                           | ${'0'}       | ${true}
      ${{ enable_dhcpv6: '1', ra: '', dhcpv6: '' }}       | ${'0'}       | ${true}
      ${{ enable_dhcpv6: '1', ra: 'server', dhcpv6: '' }} | ${'1'}       | ${false}
      ${{ enable_dhcpv6: '1', ra: '', dhcpv6: 'server' }} | ${'1'}       | ${false}
    `('validates if dhcpv6 can be enabled #%#', ({ section, resultEnable, isErrorCalled }) => {
      const message = useMessages()
      network.validateDhcpV6Enable(section)
      expect(section.enable_dhcpv6).toEqual(resultEnable)
      if (isErrorCalled) expect(message.error).toBeCalled()
      else expect(message.error).not.toBeCalled()
    })

    it('return interface and vpn options', () => {
      const data = [
        { proto: 'static', id: 'lan1', name: 'interface' },
        { proto: 'l2tp', id: 'l2tp_client', name: 'l2tp_client', description: 'L2TP client' },
        { proto: 'l2tpv3', id: 'l2tpv3_client', name: 'l2tpv3_client' },
        { proto: 'pptp', id: 'pptp_client', name: 'pptp_client', description: 'PPTP client' },
        { proto: 'gre', id: 'gre', name: 'gre' },
        { proto: 'wireguard', id: 'wireguard', name: 'wireguard' },
        { proto: 'sstp', id: 'sstp', name: 'sstp' },
        { proto: 'openconnect', id: 'openconnect', name: 'openconnect' }
      ]
      const res = network.parseInterfaceAndVpnOptions(data)
      expect(res).toEqual([
        ['interface', 'interface'],
        ['l2tp_client', 'L2TP client'],
        ['l2tpv3_client', 'l2tpv3_client'],
        ['pptp_client', 'PPTP client'],
        ['gre_static', 'gre'],
        ['wireguard', 'wireguard'],
        ['sstp', 'sstp'],
        ['openconnect', 'openconnect']
      ])
    })

    it.each`
      options                  | expectedResult
      ${undefined}             | ${[['lan', 'LAN (eth0)'], ['wan', 'WAN (eth1)'], ['wan6', 'WAN6 (eth1)'], ['mob1s1a1', 'MOB1S1A1']]}
      ${{ includeAll: true }}  | ${[['lan', 'LAN (eth0)'], ['wan', 'WAN (eth1)'], ['wan6', 'WAN6 (eth1)'], ['mob1s1a1', 'MOB1S1A1']]}
      ${{ addSuffix: 'ipv4' }} | ${[['lan', 'LAN (eth0)'], ['wan', 'WAN (eth1)'], ['wan6', 'WAN6 (eth1)'], ['mob1s1a1_4', 'MOB1S1A1']]}
      ${{ addSuffix: 'ipv6' }} | ${[['lan', 'LAN (eth0)'], ['wan', 'WAN (eth1)'], ['wan6', 'WAN6 (eth1)'], ['mob1s1a1_6', 'MOB1S1A1']]}
    `('returns correct tunnel options for different configs #%#', ({ options, expectedResult }) => {
      const mockInterfaces = [
        {
          ifname: 'eth0',
          id: 'lan',
          proto: 'static',
          name: 'lan'
        },
        {
          ifname: 'eth1',
          id: 'wan',
          proto: 'dhcp',
          name: 'wan'
        },
        {
          ifname: 'eth1',
          id: 'wan6',
          proto: 'dhcpv6',
          name: 'wan6'
        },
        {
          ifname: '',
          id: 'mob1s1a1',
          proto: 'wwan',
          name: 'mob1s1a1'
        },
        {
          ifname: 'lo',
          id: 'loopback',
          proto: 'static',
          name: 'loopback'
        }
      ]
      const result = network.createTunnelOptions(mockInterfaces, options)
      expect(result).toEqual(expectedResult)
    })

    it.each`
      interfaces                                                     | expectedResult
      ${[{ id: 'test', proto: 'static', name: 'test' }]}             | ${[['test', 'TEST (No physical interface)']]}
      ${[{ ifname: 'lo', id: 'loop', proto: 'static', name: 'lo' }]} | ${[]}
      ${[]}                                                          | ${[]}
    `('handles edge cases correctly #%#', ({ interfaces, expectedResult }) => {
      const result = network.createTunnelOptions(interfaces)
      expect(result).toEqual(expectedResult)
    })

    it.each`
      isSwitch | dhcpv4                                                                                                         | interfaces                                                                                         | section                               | multiDeviceDhcpMsg
      ${false} | ${[]}                                                                                                          | ${[]}                                                                                              | ${{ id: 'lan1', enable_dhcpv4: '0' }} | ${''}
      ${false} | ${[{ id: 'lan', enable_dhcpv4: '0' }, { id: 'lan1', enable_dhcpv4: '0' }]}                                     | ${[{ id: 'lan', bridge: '1', ifname: ['br-lan'] }]}                                                | ${{ id: 'lan', enable_dhcpv4: '1' }}  | ${''}
      ${false} | ${[{ id: 'lan', enable_dhcpv4: '1' }, { id: 'lan1', enable_dhcpv4: '1' }]}                                     | ${[{ id: 'lan', bridge: '1', ifname: ['br-lan'] }, { id: 'lan1', bridge: '0', ifname: [] }]}       | ${{ id: 'lan', enable_dhcpv4: '1' }}  | ${''}
      ${false} | ${[{ id: 'lan', enable_dhcpv4: '1' }, { id: 'lan1', enable_dhcpv4: '1' }]}                                     | ${[{ id: 'lan', bridge: '0', ifname: ['lan1'] }]}                                                  | ${{ id: 'lan', enable_dhcpv4: '1' }}  | ${''}
      ${false} | ${[{ id: 'lan', enable_dhcpv4: '1' }, { id: 'lan1', enable_dhcpv4: '0' }, { id: 'lan2', enable_dhcpv4: '1' }]} | ${[{ id: 'lan1', bridge: '0', ifname: ['br-lan'] }, { id: 'lan2', bridge: '0', ifname: [] }]}      | ${{ id: 'lan', enable_dhcpv4: '1' }}  | ${''}
      ${false} | ${[{ id: 'lan', enable_dhcpv4: '1' }, { id: 'lan1', enable_dhcpv4: '1' }]}                                     | ${[{ id: 'lan', bridge: '1', ifname: ['br-lan'] }, { id: 'lan1', bridge: '0', ifname: 'br-lan' }]} | ${{ id: 'lan', enable_dhcpv4: '1' }}  | ${'Interfaces that share the same device (br-lan) and have DHCPv4 enabled will cause server conflicts.'}
      ${true}  | ${[{ id: 'lan', enable_dhcpv4: '1' }, { id: 'lan1', enable_dhcpv4: '1' }]}                                     | ${[{ id: 'lan', vlan_id: '1' }, { id: 'lan1', vlan_id: '2' }]}                                     | ${{ id: 'lan', enable_dhcpv4: '1' }}  | ${''}
      ${true}  | ${[{ id: 'lan', enable_dhcpv4: '1' }, { id: 'lan1', enable_dhcpv4: '0' }]}                                     | ${[{ id: 'lan', vlan_id: '1' }, { id: 'lan1', vlan_id: '1' }]}                                     | ${{ id: 'lan', enable_dhcpv4: '1' }}  | ${''}
      ${true}  | ${[{ id: 'lan', enable_dhcpv4: '0' }, { id: 'lan1', enable_dhcpv4: '0' }]}                                     | ${[{ id: 'lan', vlan_id: '1' }, { id: 'lan1', vlan_id: '1' }]}                                     | ${{ id: 'lan', enable_dhcpv4: '0' }}  | ${''}
      ${true}  | ${[{ id: 'lan', enable_dhcpv4: '1' }, { id: 'lan1', enable_dhcpv4: '1' }, { id: 'lan2', enable_dhcpv4: '1' }]} | ${[{ id: 'lan', vlan_id: '1' }, { id: 'lan1', vlan_id: '1' }, { id: 'lan2', vlan_id: '3' }]}       | ${{ id: 'lan2', enable_dhcpv4: '1' }} | ${''}
      ${true}  | ${[{ id: 'lan', enable_dhcpv4: '1' }, { id: 'lan1', enable_dhcpv4: '1' }]}                                     | ${[{ id: 'lan', vlan_id: '1' }, { id: 'lan1', vlan_id: '1' }]}                                     | ${{ id: 'lan', enable_dhcpv4: '1' }}  | ${'Interfaces that share the same device (VLAN1) and have DHCPv4 enabled will cause server conflicts.'}
    `('returns multiple interface used device message #%#', async ({ isSwitch, dhcpv4, interfaces, section, multiDeviceDhcpMsg }) => {
      const networkDevices = [
        { id: 'br_lan', name: 'br-lan', type: 'bridge', 'bridge-members': ['eth0'], virtual: false, macaddr: '00:1e:42:29:c4:88' },
        { id: 'eth0', name: 'eth0', type: 'Network device', virtual: false, macaddr: '00:1e:42:29:c4:66' },
        { id: 'eth1', name: 'eth1', type: 'Network device', virtual: false, macaddr: '00:1e:42:29:c4:99' },
        { id: 'eth0.2', name: 'eth0.2', type: 'VLAN', virtual: false, macaddr: '00:1e:42:29:c4:77' }
      ]
      const store = useMainStore()
      store.isSwitch = isSwitch
      expect(network.getMultiDeviceDhcpMsg(interfaces, dhcpv4, section, networkDevices)).toEqual(multiDeviceDhcpMsg)
    })

    it.each`
      status                                                                               | ip                | expectedResult
      ${[{ proto: 'wwan', data: { method: 'bridge', bridge_ipaddr: '10.10.10.1' } }]}      | ${'10.10.10.1'}   | ${true}
      ${[{ proto: 'wwan', data: { method: 'passtrough', bridge_ipaddr: '10.10.10.1' } }]}  | ${'10.10.10.1'}   | ${true}
      ${[{ proto: 'connm', data: { method: 'passtrough', bridge_ipaddr: '10.10.10.1' } }]} | ${'10.10.10.1'}   | ${true}
      ${[{ proto: 'wwan', data: { method: 'bridge', bridge_ipaddr: '10.10.10.1' } }]}      | ${'192.168.10.1'} | ${false}
      ${[{ proto: 'wwan', data: { method: 'nat', bridge_ipaddr: '10.10.10.1' } }]}         | ${'10.10.10.1'}   | ${false}
      ${[{ proto: 'static' }]}                                                             | ${'10.10.10.1'}   | ${false}
    `('returns isMobileBridgeIp #%#', ({ status, ip, expectedResult }) => {
      expect(network.isMobileBridgeIp(status, ip)).toBe(expectedResult)
    })
  })
})
