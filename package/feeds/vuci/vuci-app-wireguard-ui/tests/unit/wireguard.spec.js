import Wireguard from '../../src/views/services/Wireguard.vue'
import WireguardEdit from '../../src/views/services/WireguardEdit.vue'
import WireguardPeerEdit from '../../src/views/services/WireguardPeerEdit.vue'
import createWrapper from '@tests/unit/mockFactory'
import { ipv4Utils, ipv6Utils } from '@/utils/ipUtils'
vi.mock('@/utils/ipUtils')

let data = []

beforeEach(() => {
  data = [
    { id: 'aa', '.type': 'aa', public_key: 'aa', private_key: 'aa' },
    { id: 'bb', '.type': 'bb', public_key: 'bb', private_key: 'bb' }
  ]
})
describe('Wireguard.vue', () => {
  it.each([
    ['all responses successful', { success: true, data: [{ id: 'interface1' }] }, { success: true, data: [{ status: 'active' }] }, { success: true, data: [{ id: 'peer1' }] }, [{ id: 'peer1' }], 0],
    ['peers response fails', { success: true, data: [{ id: 'interface1' }] }, { success: true, data: [{ status: 'active' }] }, { success: false, data: [] }, [], 1],
    ['interfaces response fails', { success: false, data: [] }, { success: true, data: [{ status: 'active' }] }, { success: true, data: [{ id: 'peer1' }] }, [{ id: 'peer1' }], 1],
    ['interface status response fails', { success: true, data: [{ id: 'interface1' }] }, { success: false, data: [] }, { success: true, data: [{ id: 'peer1' }] }, [{ id: 'peer1' }], 1],
    ['all responses fail', { success: false, data: [] }, { success: false, data: [] }, { success: false, data: [] }, [], 3]
  ])('test loadData then %s', async (text, interfacesData, interfaceStatusData, peersData, expectedWireguardPeers, errorTimes) => {
    const wrapper = createWrapper(Wireguard)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([interfacesData, interfaceStatusData, peersData])
    const res = await wrapper.vm.loadData({ wireguard: [{ id: 1 }] })
    expect(res).toEqual({ wireguard_peers: expectedWireguardPeers })
    expect(spy).toHaveBeenCalledTimes(errorTimes)
  })

  it('test loadData then response fails', async () => {
    const wrapper = createWrapper(Wireguard)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce({})
    const res = await wrapper.vm.loadData({ wireguard: [{ id: 1 }] })
    expect(res).toEqual(undefined)
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })

  it.each`
    index | res
    ${0}  | ${false}
    ${1}  | ${false}
  `('removes corresponding peers when wireguard interface is deleted', async ({ index, res }) => {
    const wrapper = createWrapper(Wireguard)
    const wireguardIfaces = data
    const uciData = {
      wireguard_peers: []
    }
    wireguardIfaces.forEach(iface => {
      uciData.wireguard_peers.push({
        '.type': `wireguard_${iface.id}`,
        id: `cfg${Date.now()}`
      })
    })
    const deletedSection = wireguardIfaces[index]
    wrapper.vm.deletePeers(deletedSection, uciData)
    const peersExist = uciData.wireguard_peers.some(peer => peer['.type'] === `wireguard_${deletedSection.id}`)
    expect(peersExist).toEqual(res)
  })
})

describe('WireguardEdit.vue', () => {
  it('gets key pair from server and updates current section data', async () => {
    const props = { section: data[0] }
    const wrapper = createWrapper(WireguardEdit, { props })
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce({
      data: {
        public: 'generated_public_key',
        private: 'generated_private_key'
      }
    })
    await wrapper.vm.generateKeys()
    expect(wrapper.vm.section.public_key).toBe('generated_public_key')
    expect(wrapper.vm.section.private_key).toBe('generated_private_key')
  })
  it('validates if a peer with same name does not already exist', () => {
    const props = { section: data[0] }
    const wrapper = createWrapper(WireguardEdit, { props })
    wrapper.setData({ formData: { wireguard_peers: data } })
    expect(wrapper.vm.validatePeerName(data[0].id)).toEqual({
      isValid: false,
      message: 'Wireguard peer with same name already exists.'
    })
    expect(wrapper.vm.validatePeerName('wireguard_peer_new')).toEqual({
      isValid: true
    })
  })
  it.each([
    ['returns the initial IP when no interfaces are using it', [], ['10.5.0.1/24']],
    ['finds the next available IP when the initial IP is taken', [{ ipaddrs: ['10.5.0.1/24'] }], ['10.5.1.1/24']],
    ['returns the last possible IP when all IPs in range are taken', Array.from({ length: 254 }, (_, i) => ({ ipaddrs: [`10.5.${i}.1/24`] })), ['10.5.254.1/24']]
  ])('%s', (testName, interfaceStatus, expected) => {
    const props = {
      section: {
        addresses: []
      }
    }
    const wrapper = createWrapper(WireguardEdit, {
      props,
      global: {
        provide: {
          formOptions: () => ({
            interfaceStatus
          })
        }
      }
    })
    ipv4Utils.getIPRange.mockReturnValue(['10.5.0.1', '24'])
    ipv4Utils.checkIfInRange.mockReturnValue(true)
    const result = wrapper.vm.initialIp()
    expect(result).toEqual(expected)
  })
  it.each([
    ['returns valid when IP is not used by other interfaces', [], '192.168.1.1', true],
    ['returns invalid when IP is used by other interfaces', [{ ipaddrs: ['192.168.1.1'] }], '192.168.1.1', false],
    ['handles multiple interfaces', [{ ipaddrs: ['192.168.1.1', '192.168.1.2'] }, { ipaddrs: ['192.168.1.3'] }], '192.168.1.2', false],
    ['handles interface without ipaddrs', [{ ipaddrs: ['192.168.1.1'] }, {}], '192.168.1.2', true]
  ])('%s', (testName, interfaceStatus, ipToValidate, expectedIsValid) => {
    const props = { section: data[0] }
    const wrapper = createWrapper(WireguardEdit, {
      props,
      global: {
        provide: {
          formOptions: () => ({
            interfaceStatus
          })
        }
      }
    })
    const result = wrapper.vm.validateIp(ipToValidate)
    expect(result.isValid).toBe(expectedIsValid)
  })
})

describe('WireguardPeerEdit.vue', () => {
  let props = {}
  beforeEach(() => {
    props = {
      section: {
        ...data[1],
        id: 'changed'
      }
    }
  })
  it('validates if a peer with same public key does not already exist', () => {
    const wrapper = createWrapper(WireguardPeerEdit, { props })
    wrapper.setData({
      formData: {
        wireguard_peers: data
      }
    })
    expect(wrapper.vm.validateKey(data[0].public_key).isValid).toEqual(true)
    expect(wrapper.vm.validateKey(data[1].public_key)).toEqual({
      isValid: false,
      message: 'Public key cannot be the same between peers'
    })
  })
  it.each([
    ['ifname is lo', [{ ifname: 'lo' }], [['any', 'Any']]],
    [
      'proto is pppoe',
      [
        { ifname: 'test', id: 'test2', proto: 'pppoe' },
        { ifname: 'test1', id: 'test3', proto: 'static' },
        { ifname: 'test4', id: 'test5', proto: 'dhcp' }
      ],
      [
        ['any', 'Any'],
        ['test2', 'TEST2 (test)'],
        ['test3', 'TEST3 (test1)'],
        ['test5', 'TEST5 (test4)']
      ]
    ],
    [
      'proto is wwan',
      [{ ifname: 'new', id: 'again', proto: 'wwan' }],
      [
        ['any', 'Any'],
        ['again', 'AGAIN']
      ]
    ]
  ])('returns tunnel options when %s', (text, list, response) => {
    const options = {
      interfaces: []
    }
    options.interfaces = list
    const wrapper = createWrapper(WireguardPeerEdit, { props, global: { provide: { formOptions: () => options } } })
    const result = wrapper.vm.tunnelOptions
    expect(result).toEqual(response)
  })
  it.each([
    [
      'no valid interfaces',
      [
        { id: 'loopback', area_type: 'wan', ipaddrs: ['127.0.0.1/8'] },
        { id: 'ifmirror', area_type: 'wan', ipaddrs: ['192.168.1.1/24'] },
        { id: 'eth0', area_type: 'lan', ipaddrs: ['192.168.0.1/24'] }
      ],
      []
    ],
    [
      'one valid interface with IPv4',
      [
        { id: 'eth1', area_type: 'wan', ipaddrs: ['10.0.0.1/24'] },
        { id: 'loopback', area_type: 'wan', ipaddrs: ['127.0.0.1/8'] }
      ],
      [['10.0.0.1', 'ETH1 IPv4 (10.0.0.1)']]
    ],
    [
      'one valid interface with multiple IPv4 addresses',
      [{ id: 'eth1', area_type: 'wan', ipaddrs: ['10.0.0.1/24', '10.0.0.2/24'] }],
      [
        ['10.0.0.1', 'ETH1 IPv4 (10.0.0.1)'],
        ['10.0.0.2', 'ETH1 IPv4 (10.0.0.2)']
      ]
    ],
    [
      'multiple valid interfaces with IPv4',
      [
        { id: 'eth1', area_type: 'wan', ipaddrs: ['10.0.0.1/24', '10.0.0.2/24'] },
        { id: 'eth2', area_type: 'wan', ipaddrs: ['192.168.1.1/24'] },
        { id: 'eth3', area_type: 'lan', ipaddrs: ['192.168.0.1/24'] }
      ],
      [
        ['10.0.0.1', 'ETH1 IPv4 (10.0.0.1)'],
        ['10.0.0.2', 'ETH1 IPv4 (10.0.0.2)'],
        ['192.168.1.1', 'ETH2 IPv4 (192.168.1.1)']
      ]
    ],
    ['interface with IPv6 addresses', [{ id: 'eth1', area_type: 'wan', ipaddrs: [], ip6addrs: ['2001:db8::1/64'] }], [['2001:db8::1', 'ETH1 IPv6 (2001:db8::1)']]],
    [
      'interface with both IPv4 and IPv6',
      [
        {
          id: 'eth1',
          area_type: 'wan',
          ipaddrs: ['10.0.0.1/24'],
          ip6addrs: ['2001:db8::1/64', '2001:db8::2/64']
        }
      ],
      [
        ['10.0.0.1', 'ETH1 IPv4 (10.0.0.1)'],
        ['2001:db8::1', 'ETH1 IPv6 (2001:db8::1)'],
        ['2001:db8::2', 'ETH1 IPv6 (2001:db8::2)']
      ]
    ],
    [
      'multiple interfaces with mixed IPv4 and IPv6',
      [
        {
          id: 'eth1',
          area_type: 'wan',
          ipaddrs: ['10.0.0.1/24'],
          ip6addrs: ['2001:db8::1/64']
        },
        {
          id: 'eth2',
          area_type: 'wan',
          ipaddrs: ['192.168.1.1/24'],
          ip6addrs: []
        }
      ],
      [
        ['10.0.0.1', 'ETH1 IPv4 (10.0.0.1)'],
        ['2001:db8::1', 'ETH1 IPv6 (2001:db8::1)'],
        ['192.168.1.1', 'ETH2 IPv4 (192.168.1.1)']
      ]
    ]
  ])('returns correct interfaces when %s', (text, interfaceStatus, expected) => {
    const wrapper = createWrapper(WireguardPeerEdit, {
      props,
      global: {
        provide: {
          formOptions: () => ({
            interfaceStatus
          })
        }
      }
    })
    const result = wrapper.vm.getInterfaces
    expect(result).toEqual(expected)
  })
  it('returns correct parent when matching parent found', () => {
    const props = { section: { '.type': 'wireguard_test' } }
    const wrapper = createWrapper(WireguardPeerEdit, {
      props,
      data() {
        return {
          formData: {
            wireguard: [{ id: 'test' }, { id: 'test2' }]
          }
        }
      }
    })
    const result = wrapper.vm.getParent()
    expect(result).toEqual({ id: 'test' })
  })
  it.each([
    [
      'no LAN interfaces',
      [
        { id: 'loopback', area_type: 'wan', ipaddrs: ['127.0.0.1/8'] },
        { id: 'eth0', area_type: 'wan', ipaddrs: ['192.168.1.1/24'] }
      ],
      [],
      [],
      [
        ['0.0.0.0/0', 'All IPv4 (0.0.0.0/0)'],
        ['::/0', 'All IPv6 (::/0 )']
      ]
    ],
    [
      'one LAN interface with IPv4',
      [
        { id: 'eth0', area_type: 'lan', ipaddrs: ['192.168.1.1/24'], name: 'LAN1' },
        { id: 'eth1', area_type: 'wan', ipaddrs: ['10.0.0.1/8'] },
        { id: 'loopback', area_type: 'lan', ipaddrs: ['127.0.0.1/8'] }
      ],
      [['192.168.1.0']],
      [],
      [
        ['0.0.0.0/0', 'All IPv4 (0.0.0.0/0)'],
        ['::/0', 'All IPv6 (::/0 )'],
        ['192.168.1.0/24', 'LAN1 IPv4 (192.168.1.0/24)']
      ]
    ],
    [
      'multiple LAN interfaces with IPv4',
      [
        { id: 'eth0', area_type: 'lan', ipaddrs: ['192.168.1.1/24'], name: 'LAN1' },
        { id: 'eth1', area_type: 'lan', ipaddrs: ['10.0.0.1/8'], name: 'LAN2' },
        { id: 'eth2', area_type: 'wan', ipaddrs: ['203.0.113.1/24'] },
        { id: 'loopback', area_type: 'lan', ipaddrs: ['127.0.0.1/8'] }
      ],
      [['192.168.1.0'], ['10.0.0.0']],
      [],
      [
        ['0.0.0.0/0', 'All IPv4 (0.0.0.0/0)'],
        ['::/0', 'All IPv6 (::/0 )'],
        ['192.168.1.0/24', 'LAN1 IPv4 (192.168.1.0/24)'],
        ['10.0.0.0/8', 'LAN2 IPv4 (10.0.0.0/8)']
      ]
    ],
    [
      'LAN interface with both IPv4 and IPv6',
      [
        { id: 'eth0', area_type: 'lan', ipaddrs: ['192.168.1.1/24'], ip6addrs: ['fd17:19f6:835b::/64'], name: 'LAN1' },
        { id: 'eth1', area_type: 'wan', ipaddrs: ['10.0.0.1/8'] },
        { id: 'loopback', area_type: 'lan', ipaddrs: ['127.0.0.1/8'] }
      ],
      [['192.168.1.0']],
      [['fd17:19f6:835b::']],
      [
        ['0.0.0.0/0', 'All IPv4 (0.0.0.0/0)'],
        ['::/0', 'All IPv6 (::/0 )'],
        ['192.168.1.0/24', 'LAN1 IPv4 (192.168.1.0/24)'],
        ['fd17:19f6:835b::/64', 'LAN1 IPv6 (fd17:19f6:835b::/64)']
      ]
    ]
  ])('returns correct options when %s', (text, interfaceStatus, ipv4CidrRanges, ipv6CidrRanges, expected) => {
    const props = {
      section: {
        '.type': 'wireguard_test'
      }
    }
    const wrapper = createWrapper(WireguardPeerEdit, {
      props,
      global: {
        provide: {
          formOptions: () => ({
            interfaceStatus
          })
        }
      }
    })

    let ipv4RangeIndex = 0
    ipv4Utils.cidrToRange = vi.fn().mockImplementation(() => {
      return ipv4CidrRanges[ipv4RangeIndex++] || []
    })

    let ipv6RangeIndex = 0
    ipv6Utils.cidrToRange = vi.fn().mockImplementation(() => {
      return ipv6CidrRanges[ipv6RangeIndex++] || []
    })

    const result = wrapper.vm.peerAllowedIps()
    expect(result).toEqual(expected)
  })
  it('returns empty array when %s', () => {
    const props = {
      section: {
        '.type': 'wireguard_peer',
        id: 'peer1'
      }
    }
    const wrapper = createWrapper(WireguardPeerEdit, { props })
    wrapper.vm.getParent = vi.fn().mockReturnValue({ addresses: [] })
    expect(wrapper.vm.getNextAvailableIPs()).toEqual([])
  })
  it.each([
    ['returns IPs', ['10.0.0.3/32'], ['10.0.0.3/32']],
    ['handles undefined', undefined, []],
    ['handles null', null, []],
    ['handles empty array', [], []]
  ])('%s from getNextAvailableIPs', (scenario, mockReturn, expected) => {
    const props = {
      section: {
        '.type': 'wireguard_peer',
        id: 'peer1'
      }
    }
    const wrapper = createWrapper(WireguardPeerEdit, { props })
    wrapper.vm.getNextAvailableIPs = vi.fn().mockReturnValue(mockReturn)
    expect(wrapper.vm.tunnelAddress).toEqual(expected)
  })
})
