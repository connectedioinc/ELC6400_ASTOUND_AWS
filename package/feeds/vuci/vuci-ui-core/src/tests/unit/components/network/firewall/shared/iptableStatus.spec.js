import createWrapper from '@tests/unit/mockFactory'
import IptableStatus from '@/components/network/firewall/IptableStatus.vue'

describe('IptableStatus.vue', () => {
  let wrapper
  let wrapperOptions
  beforeEach(() => {
    wrapperOptions = {
      props: {
        statuses: [],
        enabled: '1',
        type: 'state'
      }
    }
    wrapper = createWrapper(IptableStatus, wrapperOptions)
  })

  it.each`
    type         | enabled | statuses                             | expectResult
    ${'state'}   | ${'1'}  | ${undefined}                         | ${'-'}
    ${'counter'} | ${'1'}  | ${undefined}                         | ${'-'}
    ${'state'}   | ${'1'}  | ${[]}                                | ${expect.objectContaining({ status: 'Starting' })}
    ${'counter'} | ${'1'}  | ${[]}                                | ${'-'}
    ${'counter'} | ${'1'}  | ${[{ bytes: '10000', pkts: '100' }]} | ${expect.objectContaining({ status: '100  packets' })}
    ${'state'}   | ${'1'}  | ${[{ bytes: '10000', pkts: '100' }]} | ${expect.objectContaining({ status: 'Active' })}
    ${'state'}   | ${'0'}  | ${[{ bytes: '10000', pkts: '100' }]} | ${expect.objectContaining({ status: 'Disabling' })}
    ${'state'}   | ${'0'}  | ${[]}                                | ${'Disabled'}
  `('parses status #%#', async ({ type, statuses, enabled, expectResult }) => {
    await wrapper.setProps({ type, statuses, enabled })
    expect(wrapper.vm.status).toEqual(expectResult)
  })

  it.each`
    value                                                                                                                                  | expectResult
    ${''}                                                                                                                                  | ${{}}
    ${'--sport 20 --dport 20 -m mac --mac-source 20:97:27:7a:fd:38 -j DNAT --to-destination 192.168.1.11:20'}                              | ${{ '--dport': '20', '--mac-source': '20:97:27:7a:fd:38', '--sport': '20', '--to-destination': '192.168.1.11:20', '-j': 'DNAT', '-m': 'mac' }}
    ${'--sport 20 --dport 20 -m mac --mac-source 20:97:27:7a:fd:38 -j DNAT --to-destination 192.168.1.11:20 --comment "!fw3: Allow-mDNS"'} | ${{ '--dport': '20', '--mac-source': '20:97:27:7a:fd:38', '--sport': '20', '--to-destination': '192.168.1.11:20', '-j': 'DNAT', '-m': 'mac', '--comment': '!fw3: Allow-mDNS' }}
    ${'--dport 20  --tcp-flags SYN,RST SYN --flag --icmpv6-type 143/0'}                                                                    | ${{ '--flag': 'set', '--dport': '20', '--tcp-flags': 'SYN,RST SYN', '--icmpv6-type': '143/0' }}
    ${'-m icmp6 --icmpv6-type 3 -m limit --limit 1000/sec'}                                                                                | ${{ '--icmpv6-type': '3', '-m': 'limit', '--limit': '1000/sec' }}
  `('parses extra options #%#', async ({ value, expectResult }) => {
    expect(wrapper.vm.parseOptions(value)).toEqual(expectResult)
  })

  it('parsed different values', async () => {
    const statuses = [
      { out: '192.168.1.1', in: '192.168.2.1', options: '--dport 80 --sport 100', bytes: 100, pkts: 200 },
      { out: '192.168.1.1', in: '192.168.3.1', options: '--dport 81 --sport 100', bytes: 123, pkts: 321 },
      { out: '192.168.1.1', in: '192.168.2.1', options: '--dport 81 --sport 100', bytes: 500, pkts: 258 },
      { out: '192.168.1.1', in: '192.168.3.1', options: '--dport 80 --sport 100', bytes: 111, pkts: 213 }
    ]
    const expectResult = [
      {
        key: 'in',
        values: [
          ['192.168.2.1', { bytes: 600, pkts: 458 }],
          ['192.168.3.1', { bytes: 234, pkts: 534 }]
        ]
      },
      {
        key: '--dport',
        values: [
          ['80', { bytes: 211, pkts: 413 }],
          ['81', { bytes: 623, pkts: 579 }]
        ]
      }
    ]
    await wrapper.setProps({ statuses })
    expect(wrapper.vm.differentValues).toEqual(expectResult)
  })
})
