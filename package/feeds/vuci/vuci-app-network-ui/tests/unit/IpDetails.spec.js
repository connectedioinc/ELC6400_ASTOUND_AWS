import Interfaces from '@/components/shared/IpDetails.vue'
import createWrapper, { combineDeep } from '@tests/unit/mockFactory'

describe('IpDetails.vue', () => {
  let wrapper
  const defaultOptions = {
    props: {
      status: {},
      config: {}
    }
  }

  it.each`
    content                                                              | data                                                                | result
    ${{}}                                                                | ${{}}                                                               | ${'-'}
    ${{}}                                                                | ${{ proto: 'static', ipaddr: '1.1.1.1', netmask: '255.255.255.0' }} | ${'1.1.1.1/24'}
    ${{ ipaddrs: ['192.168.1.1', '192.168.1.2'] }}                       | ${{}}                                                               | ${'192.168.1.1'}
    ${{ ip6addrs: ['f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13'] }}         | ${{}}                                                               | ${'f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13'}
    ${{ data: { bridge_ipaddr: '10.10.10.10', method: 'bridge' } }}      | ${{}}                                                               | ${'10.10.10.10'}
    ${{ data: { bridge_ipaddr: '10.10.10.10', method: 'passthrough' } }} | ${{}}                                                               | ${'10.10.10.10'}
  `('returns ipAddr when content is $content and data is $data', ({ content, data, result }) => {
    wrapper = createWrapper(
      Interfaces,
      combineDeep(defaultOptions, {
        props: {
          status: content,
          config: data
        }
      })
    )
    const res = wrapper.vm.ipDisplay
    expect(res).toBe(result)
  })

  it.each`
    content                                                                                                                                                                          | result
    ${{ ipaddrs: ['192.168.1.1'] }}                                                                                                                                                  | ${[]}
    ${{ ip6addrs: ['f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13'] }}                                                                                                                     | ${[]}
    ${{ ip6addrs: ['f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13', 'f184:bb18:a403:2fde:fd4a:4b8d:7125:6c15'] }}                                                                          | ${[{ info: ['f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13', 'f184:bb18:a403:2fde:fd4a:4b8d:7125:6c15'], title: 'IPv6' }]}
    ${{ ip6addrs: ['f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13', 'f184:bb18:a403:2fde:fd4a:4b8d:7125:6c15'], 'ipv6-prefix': [{ address: 'fde9:ef84:bd59:4::', mask: 62 }] }}            | ${[{ info: ['f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13', 'f184:bb18:a403:2fde:fd4a:4b8d:7125:6c15'], title: 'IPv6' }, { info: ['fde9:ef84:bd59:4::/62'], title: 'IPv6-PD' }]}
    ${{ ip6addrs: ['f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13', 'f184:bb18:a403:2fde:fd4a:4b8d:7125:6c15'], 'ipv6-prefix-assignment': [{ address: 'fde9:ef84:bd59:4::', mask: 62 }] }} | ${[{ info: ['f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13', 'f184:bb18:a403:2fde:fd4a:4b8d:7125:6c15'], title: 'IPv6' }, { info: ['fde9:ef84:bd59:4::/62'], title: 'IPv6-PD' }]}
    ${{ ipaddrs: ['192.168.1.1'], ip6addrs: ['f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13'] }}                                                                                           | ${[{ info: ['192.168.1.1'], title: 'IPv4' }, { info: ['f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13'], title: 'IPv6' }]}
  `('returns ipHint when content is $content', ({ content, result }) => {
    wrapper = createWrapper(
      Interfaces,
      combineDeep(defaultOptions, {
        props: {
          status: content
        }
      })
    )
    const res = wrapper.vm.ipHint
    expect(res).toEqual(result)
  })
})
