import Jool from '../../src/views/network/Jool.vue'
import JoolEdit from '../../src/views/network/JoolEdit.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'
import { ref } from 'vue'

describe('Jool.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(Jool)
  })

  it('extraLoad retrieves interfaces status', async () => {
    const data = [{ name: 'lan' }, { name: 'wan' }]
    axios.get = vi.fn().mockResolvedValue({ data })
    await wrapper.vm.extraLoad()
    expect(wrapper.vm.ifacesStatus).toEqual(data)
  })

  it('checks if extraLoad return error message', async () => {
    const message = useMessages()
    axios.get = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.extraLoad()
    expect(spy).toHaveBeenCalledWith('Failed to load interface status')
  })

  it('loads afterLoad data', async () => {
    const zones = [{ name: 'lan' }, { name: 'wan' }]
    const ipv4Hints = [
      ['192.168.1.100', 'RUT'],
      ['192.168.2.200', 'TAP']
    ]
    const ipv6Hints = [
      ['::1', 'RUT'],
      ['aaaa:bbbb:fafa:ffff::cccc:1111', 'TAP']
    ]
    axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: true, data: zones },
      { success: true, data: ipv4Hints },
      { success: true, data: ipv6Hints }
    ])
    await wrapper.vm.afterLoad()
  })

  it('checks if afterLoad return error message', async () => {
    const message = useMessages()
    axios.bulkGet = vi.fn().mockResolvedValueOnce([{ success: false }, { success: false }, { success: false }])
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenNthCalledWith(1, 'Failed to load zones config')
    expect(spy).toHaveBeenNthCalledWith(2, 'Failed to load IPv4 hints data')
    expect(spy).toHaveBeenNthCalledWith(3, 'Failed to load IPv6 hints data')
  })

  it('displays matched firewall rules', () => {
    wrapper.vm.formData.jool = [
      {
        id: 'jool_1',
        proto: ['tcp', 'udp'],
        src: 'wan',
        dest_ipv4: ['192.168.1.0/24'],
        src_ipv6: ['aaaa:bbbb:fafa:ffff::cccc:1111'],
        dest_ipv6: ['aaaa:bbbb:fafa:ffff::cccc:1111'],
        src_port: ['80', '443'],
        dest_port: ['80', '443']
      }
    ]
    const result = {
      jool_1: {
        destIpv4Values: [
          {
            name: 'IPs',
            values: [
              {
                hint: '192.168.1.0 - 192.168.1.255',
                prefix: undefined,
                value: '192.168.1.0/24'
              }
            ]
          },
          {
            name: 'ports',
            values: [
              {
                hint: 'HTTP',
                prefix: undefined,
                value: '80'
              },
              {
                hint: 'HTTPS',
                prefix: undefined,
                value: '443'
              }
            ]
          }
        ],
        destIpv6Values: [
          {
            name: 'IP',
            values: [
              {
                hint: undefined,
                prefix: undefined,
                value: 'aaaa:bbbb:fafa:ffff::cccc:1111'
              }
            ]
          },
          {
            name: 'ports',
            values: [
              {
                hint: 'HTTP',
                prefix: undefined,
                value: '80'
              },
              {
                hint: 'HTTPS',
                prefix: undefined,
                value: '443'
              }
            ]
          }
        ],
        protoValues: [
          {
            name: 'IPv6',
            values: [
              {
                prefix: undefined,
                value: 'TCP'
              },
              {
                prefix: undefined,
                value: 'UDP'
              }
            ]
          }
        ],
        srcValues: [
          {
            name: 'IP',
            values: [
              {
                hint: undefined,
                prefix: undefined,
                value: 'aaaa:bbbb:fafa:ffff::cccc:1111'
              }
            ]
          },
          {
            name: 'ports',
            values: [
              {
                hint: 'HTTP',
                prefix: undefined,
                value: '80'
              },
              {
                hint: 'HTTPS',
                prefix: undefined,
                value: '443'
              }
            ]
          }
        ],
        srcZone: 'wan'
      }
    }
    expect(wrapper.vm.formattedMatches).toEqual(result)
  })
})

describe('JoolEdit.vue', () => {
  let wrapper
  let wrapperData = {}
  beforeEach(() => {
    wrapperData = {
      props: {
        section: { id: '1', name: 'test' }
      },
      global: {
        provide: {
          zones: ref([{ name: 'lan' }, { name: 'wan' }])
        }
      }
    }
    wrapper = createWrapper(JoolEdit, wrapperData)
  })

  it('computes available source zones', () => {
    const result = [['', 'Device (output)'], ['*', 'Any zone (forward)'], 'lan', 'wan']
    expect(wrapper.vm.srcZones).toEqual(result)
  })

  it.each`
    proto               | result
    ${['tcp', 'udp']}   | ${true}
    ${['icmp']}         | ${false}
    ${['icmp6', 'tcp']} | ${false}
  `('checks if protocol is valid for ports', ({ proto, result }) => {
    expect(wrapper.vm.portDepends({ proto })).toEqual(result)
  })
})
