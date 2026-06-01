import Iptables from '../../../src/views/status/Iptables.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'

vi.mock('vue-router', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ hash: '' }))
  }
})

describe('Iptables.vue', () => {
  let wrapper
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(axios, 'bulkGet').mockResolvedValue(Array.from({ length: 5 }, () => ({ success: true, data: [] })))
    wrapper = createWrapper(Iptables, {
      props: {
        ipv: 'ipv4'
      }
    })
  })
  it('returns parsed tables', () => {
    wrapper.vm.status = [{ table: 'nat', chains: [] }]
    expect(wrapper.vm.parsedTables).toEqual([
      {
        table: 'nat',
        chains: []
      }
    ])
  })
  it('returns references', () => {
    const table = {
      chains: [
        { chain: 'OUTPUT', rules: [{ target: 'output_rule' }, { target: 'common_rule' }] },
        { chain: 'PREROUTING', rules: [{ target: 'prerouting_rule' }] },
        { chain: 'POSTROUTING', rules: [{ target: 'common_rule' }, { target: 'common_rule' }] }
      ]
    }
    const chain = { chain: 'common_rule' }
    const expectedResult = {
      references: [
        { chain: 'OUTPUT', count: 1 },
        { chain: 'POSTROUTING', count: 2 }
      ],
      referenceCount: 3
    }
    expect(wrapper.vm.getReferences(table, chain)).toEqual(expectedResult)
  })
  it('returns parsed chains', () => {
    const data = [
      {
        chain: 'OUTPUT',
        bytes: '100',
        pkts: '11',
        policy: 'ACCEPT',
        rules: []
      },
      {
        chain: 'OUTPUT',
        rules: []
      }
    ]
    const expectedResult = [
      {
        chain: 'OUTPUT',
        bytes: '100',
        pkts: '11',
        rules: [],
        references: [],
        referenceCount: 0,
        ruleCount: 0,
        policy: 'ACCEPT',
        table: 'nat'
      },
      {
        chain: 'OUTPUT',
        references: [],
        referenceCount: 0,
        rules: [],
        ruleCount: 0,
        policy: '-',
        table: 'nat'
      }
    ]
    expect(wrapper.vm.parseChains({ table: 'nat', chains: data })).toEqual(expectedResult)
  })
  it('returns parsed rules', () => {
    const data = [
      {
        rule: 'route_traffic',
        bytes: '100',
        pkts: '11',
        in: 'eth',
        out: 'lan1',
        destination: '100.100.100.100',
        source: '100.100.100.100',
        options: 'ctstate DNAT',
        comments: 'Accept port redirections'
      },
      {
        rule: 'route_traffic'
      }
    ]
    const expectedResult = [
      {
        table: 'nat',
        chain: 'custom dnat',
        rule: 'route_traffic',
        bytes: '100',
        pkts: '11',
        options: 'ctstate DNAT',
        comments: 'Accept port redirections',
        in: 'eth',
        out: 'lan1',
        destination: '100.100.100.100',
        source: '100.100.100.100',
        linkToConfig: '-'
      },
      {
        table: 'nat',
        chain: 'custom dnat',
        rule: 'route_traffic',
        linkToConfig: '-'
      }
    ]
    expect(wrapper.vm.parseRules({ chain: 'custom dnat', rules: data }, 'nat')).toEqual(expectedResult)
  })
  it.each`
    value         | expectedResult
    ${'anywhere'} | ${'*'}
    ${'1.1.1.1'}  | ${'1.1.1.1'}
  `('returns parsed ip #%#', ({ value, expectedResult }) => {
    expect(wrapper.vm.parseIp(value)).toEqual(expectedResult)
  })
  it.each`
    value     | expectedResult
    ${'eth1'} | ${'eth1'}
    ${'any'}  | ${'*'}
  `('returns parsed device #%#', ({ value, expectedResult }) => {
    expect(wrapper.vm.parseDevice(value)).toEqual(expectedResult)
  })
  it.each`
    value    | expectedResult
    ${'any'} | ${'*'}
    ${'udp'} | ${'udp'}
  `('returns parsed proto #%#', ({ value, expectedResult }) => {
    expect(wrapper.vm.parseProto(value)).toEqual(expectedResult)
  })
  it('opens modal on mount', async () => {
    wrapper.vm.route.hash = '#chain=zone_lan_helper&table=raw&rule=4'
    wrapper.vm.chainModalRef.openModal = vi.fn()
    vi.spyOn(axios, 'bulkGet').mockResolvedValue([
      {
        success: true,
        data: [
          { table: 'raw', chains: [{ chain: 'zone_lan_helper', rules: [{ comment: 'rule #1' }, { comment: 'rule #2' }, { comment: 'rule #3' }, { comment: 'rule #4' }, { comment: 'rule #5' }] }] }
        ]
      },
      { success: true, data: [] },
      { success: true, data: [] },
      { success: true, data: [] },
      { success: true, data: [] }
    ])
    await wrapper.vm.onMounted()
    expect(wrapper.vm.chainModalRef.openModal).toBeCalledWith({ comment: 'rule #5', linkToConfig: 'rule #5', table: 'raw', chain: 'zone_lan_helper' }, true)
  })
  it('does not open modal on mount', async () => {
    wrapper.vm.route.hash = '#chain=zone_wan_helper&table=raw&rule=4'
    wrapper.vm.chainModalRef.openModal = vi.fn()
    vi.spyOn(axios, 'bulkGet').mockResolvedValue([
      {
        success: true,
        data: [
          { table: 'raw', chains: [{ chain: 'zone_lan_helper', rules: [{ comment: 'rule #1' }, { comment: 'rule #2' }, { comment: 'rule #3' }, { comment: 'rule #4' }, { comment: 'rule #5' }] }] }
        ]
      },
      { success: true, data: [] },
      { success: true, data: [] },
      { success: true, data: [] },
      { success: true, data: [] }
    ])
    await wrapper.vm.onMounted()
    expect(wrapper.vm.chainModalRef.openModal).not.toBeCalled()
  })
  describe('requests', () => {
    describe('getStatus', () => {
      it('shows error', async () => {
        vi.spyOn(axios, 'bulkGet').mockRejectedValue()
        const spy = vi.spyOn(wrapper.vm.message, 'error')
        await wrapper.vm.getStatus()
        expect(spy).toBeCalled()
      })
      it('shows errors', async () => {
        vi.spyOn(axios, 'bulkGet').mockResolvedValue(Array.from({ length: 5 }, () => ({ success: false })))
        const spy = vi.spyOn(wrapper.vm.message, 'error')
        await wrapper.vm.getStatus()
        expect(spy).toBeCalledTimes(5)
      })
      it('sets data', async () => {
        const status = { success: true, data: [{ table: 'nat', chains: [] }] }
        const traffic_rules = { success: true, data: [{ id: '1', name: 'traffic rule' }] }
        const nat_rules = { success: true, data: [{ id: '1', name: 'nat rule' }] }
        const port_forwards = { success: true, data: [{ id: '1', name: 'forward rule' }] }
        const jool_rule = { success: true, data: [{ id: '1', name: 'jool rule' }] }
        vi.spyOn(axios, 'bulkGet').mockResolvedValue([status, traffic_rules, nat_rules, port_forwards, jool_rule])
        await wrapper.vm.getStatus()
        expect(wrapper.vm.status).toEqual(status.data)
        expect(wrapper.vm.rules).toEqual(traffic_rules.data)
        expect(wrapper.vm.natRules).toEqual(nat_rules.data)
        expect(wrapper.vm.portForwards).toEqual(port_forwards.data)
        expect(wrapper.vm.joolConfigs).toEqual(jool_rule.data)
      })
    })
    describe('resetCounter', () => {
      it('shows error', async () => {
        vi.spyOn(axios, 'post').mockRejectedValue()
        const spy = vi.spyOn(wrapper.vm.message, 'error')
        await wrapper.vm.resetCounters()
        expect(spy).toBeCalled()
      })
      it.each`
        ipv       | endpoint
        ${'ipv4'} | ${'/api/firewall/iptables/ipv4/actions/reset'}
        ${'ipv6'} | ${'/api/firewall/iptables/ipv6/actions/reset'}
      `('sends request #%#', async ({ ipv, endpoint }) => {
        await wrapper.setProps({ ipv })
        const spy = vi.spyOn(wrapper.vm.message, 'success')
        const postSpy = vi.spyOn(axios, 'post').mockResolvedValue()
        await wrapper.vm.resetCounters()
        expect(postSpy).toBeCalledWith(endpoint)
        expect(spy).toBeCalled()
      })
    })
  })
})
