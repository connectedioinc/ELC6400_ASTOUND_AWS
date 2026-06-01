import createWrapper from '@tests/unit/mockFactory'
import MultiWan from '../../src/views/network/MultiWan.vue'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'

vi.mock('@ui-core/plugins/axios', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    axios: {
      get: vi.fn().mockResolvedValue({ data: {} }),
      put: vi.fn().mockResolvedValue({ data: {} }),
      bulkGet: vi.fn().mockResolvedValue({ data: {} })
    }
  }
})

describe('MultiWan.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MultiWan)
  })
  it.each`
    mode
    ${'mwan'}
    ${'balance'}
  `('returns $mode', ({ mode }) => {
    wrapper.vm.form.globals.mode = mode
    expect(wrapper.vm.mode).toEqual(mode)
  })

  it.each`
    mode | cols
    ${'mwan'} | ${[
  expect.objectContaining({
    title: 'Metric',
    help: 'Members within one policy with a lower metric have precedence over higher metric members. Members with the same metric within a policy will perform load balancing.',
    dataIndex: 'metric',
    width: 'auto'
  }),
  expect.objectContaining({
    help: 'Name of the interface.',
    title: 'Name',
    dataIndex: 'interface',
    width: 'auto'
  }),
  expect.objectContaining({
    help: 'The weight values represent a percentage of load that will go through an interface. The default value is 1, if unspecified.',
    title: 'Weight',
    dataIndex: 'weight',
    show: false,
    width: 'auto'
  }),
  expect.objectContaining({
    help: 'Enable the interface.',
    title: 'Enabled',
    dataIndex: 'enabled',
    width: 'auto'
  })
]}
    ${'balance'} | ${[
  expect.objectContaining({
    help: 'Name of the interface.',
    title: 'Name',
    dataIndex: 'interface',
    width: 'auto'
  }),
  expect.objectContaining({
    title: 'Metric',
    help: 'Members within one policy with a lower metric have precedence over higher metric members. Members with the same metric within a policy will perform load balancing.',
    dataIndex: 'metric',
    show: false,
    width: 'auto'
  }),
  expect.objectContaining({
    help: 'The weight values represent a percentage of load that will go through an interface. The default value is 1, if unspecified.',
    title: 'Weight',
    dataIndex: 'weight',
    show: true,
    width: 'auto'
  }),
  expect.objectContaining({
    help: 'Enable the interface.',
    title: 'Enabled',
    dataIndex: 'enabled',
    width: 'auto'
  })
]}
    ${'any'} | ${[
  expect.objectContaining({
    help: 'Name of the interface.',
    title: 'Name',
    dataIndex: 'interface',
    width: 'auto'
  }),
  expect.objectContaining({
    title: 'Metric',
    help: 'Members within one policy with a lower metric have precedence over higher metric members. Members with the same metric within a policy will perform load balancing.',
    dataIndex: 'metric',
    show: true,
    width: 'auto'
  }),
  expect.objectContaining({
    help: 'The weight values represent a percentage of load that will go through an interface. The default value is 1, if unspecified.',
    title: 'Weight',
    dataIndex: 'weight',
    show: true,
    width: 'auto'
  }),
  expect.objectContaining({
    help: 'Enable the interface.',
    title: 'Enabled',
    dataIndex: 'enabled',
    width: 'auto'
  })
]}
  `('computes member columns when mode is $mode', ({ mode, cols }) => {
    wrapper.vm.form.globals.mode = mode
    expect(wrapper.vm.memberColumns).toEqual(cols)
  })

  it('loads getStatus data', async () => {
    const mwanStatus = {
      wan: {
        status: 'up',
        uptime: 0
      }
    }
    const ifStatus = [
      { id: 'wan', ip6addrs: [] },
      { id: 'mobile', ip6addrs: ['::1'] }
    ]
    axios.bulkGet = vi.fn().mockResolvedValue([
      { success: true, data: mwanStatus },
      { success: true, data: ifStatus }
    ])
    await wrapper.vm.getStatus()
    expect(wrapper.vm.ifaceStatus).toEqual(mwanStatus)
    expect(wrapper.vm.ifStatus).toEqual(ifStatus)
  })

  it('fails to load getStatus data', async () => {
    const message = useMessages()
    axios.bulkGet = vi.fn().mockResolvedValue([{ success: false }, { success: false }])
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.getStatus()
    expect(spy).toHaveBeenNthCalledWith(1, 'Failed to retrieve failover status')
    expect(spy).toHaveBeenNthCalledWith(2, 'Failed to retrieve interface status')
  })

  it('checks if getStatus return error message', async () => {
    const message = useMessages()
    axios.bulkGet = vi.fn().mockRejectedValue()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.getStatus()
    expect(spy).toHaveBeenCalledWith('Failed to retrieve status')
  })

  it('loads afterLoad data', async () => {
    const ifaces = [{ enabled: '1', id: 'wan' }]
    const members = [{ interface: 'wan', metric: '1' }]
    const policies = [{ name: 'wan', use_member: ['wan'] }]
    const globals = [{ id: 'globals', mode: 'mwan' }]
    axios.bulkGet = vi.fn().mockResolvedValue([
      { success: true, data: ifaces },
      { success: true, data: members },
      { success: true, data: policies },
      { success: true, data: globals }
    ])
    await wrapper.vm.loadData()
    expect(wrapper.vm.interfaces).toEqual(ifaces)
    expect(wrapper.vm.members).toEqual(members)
    expect(wrapper.vm.policies).toEqual(policies)
    expect(wrapper.vm.mode).toEqual(globals[0].mode)
  })

  it('checks if afterLoad returns error messages when everything fails', async () => {
    const message = useMessages()
    axios.bulkGet = vi.fn().mockResolvedValue([{ success: false }, { success: false }, { success: false }, { success: false }])
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenNthCalledWith(1, 'Failed to retrieve interfaces')
    expect(spy).toHaveBeenNthCalledWith(2, 'Failed to retrieve members')
    expect(spy).toHaveBeenNthCalledWith(3, 'Failed to retrieve policies')
    expect(spy).toHaveBeenNthCalledWith(4, 'Failed to retrieve mode')
  })

  it('checks if afterLoad returns error message', async () => {
    const message = useMessages()
    axios.bulkGet = vi.fn().mockRejectedValue()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })

  const interfaces = [
    { id: 'wan', name: 'wan', enabled: '1' },
    { id: 'wifi', name: 'wifi', enabled: '1' },
    { id: 'mob1s1a1', name: 'mob1s1a1', enabled: '0' }
  ]
  const members = [
    { id: 'wan_member_mwan', metric: '1', interface: 'wan' },
    { id: 'mob1s1a1_member_mwan', metric: '2', interface: 'mob1s1a1' },
    { id: 'wifi_member_mwan', metric: '3', interface: 'wifi' }
  ]
  const policies = [{ id: 'mwan_default', name: 'mwan', use_member: ['wan_member_mwan', 'mob1s1a1_member_mwan', 'wifi_member_mwan'] }]
  const ifaceStatus = {
    wan: {
      status: 'online',
      interval: '10',
      uptime: '1234',
      type: 'wired',
      track_ip: [
        { status: 'up', ip: '1.1.1.1' },
        { status: 'skipped', ip: '8.8.8.8' }
      ],
      load_balance: 100
    },
    wifi: { status: 'online', interval: '5', uptime: '10000', type: 'wireless', load_balance: 0 },
    mob1s1a1: { status: 'notracking', interval: '3', uptime: '0', type: 'mobile' }
  }
  it('parses card status', () => {
    const result = [
      {
        content: [
          {
            name: 'status',
            info: 'Online',
            style: 'success',
            title: 'Status'
          },
          {
            name: 'type',
            info: 'Wired',
            title: 'Type'
          },
          {
            name: 'interval',
            info: '10',
            title: 'Interval'
          },
          {
            name: 'uptime',
            info: '0h 20m 34s',
            title: 'Uptime'
          },
          {
            info: [
              {
                ip: '1.1.1.1',
                status: 'up'
              },
              {
                ip: '8.8.8.8',
                status: 'skipped'
              }
            ],
            name: 'track_ip',
            title: 'Track IP'
          },
          {
            name: 'load_balance',
            info: '100 %',
            title: 'Network traffic distribution'
          }
        ],
        title: 'wan',
        id: 'wan',
        sectionName: 'wan',
        type: 'basic'
      },
      {
        content: [
          {
            name: 'status',
            info: 'Disabled',
            style: '',
            title: 'Status'
          },
          {
            name: 'type',
            info: 'Mobile',
            title: 'Type'
          },
          {
            name: 'interval',
            info: '3',
            title: 'Interval'
          },
          {
            name: 'uptime',
            info: '-',
            title: 'Uptime'
          },
          {
            info: [],
            name: 'track_ip',
            title: 'Track IP'
          },
          {
            name: 'load_balance',
            info: '-',
            title: 'Network traffic distribution'
          }
        ],
        title: 'mob1s1a1',
        id: 'mob1s1a1',
        sectionName: 'mob1s1a1',
        type: 'basic'
      },
      {
        content: [
          {
            name: 'status',
            info: 'Online',
            style: 'success',
            title: 'Status'
          },
          {
            name: 'type',
            info: 'Wireless',
            title: 'Type'
          },
          {
            name: 'interval',
            info: '5',
            title: 'Interval'
          },
          {
            name: 'uptime',
            info: '2h 46m 40s',
            title: 'Uptime'
          },
          {
            info: undefined,
            name: 'track_ip',
            title: 'Track IP'
          },
          {
            name: 'load_balance',
            info: '0 %',
            title: 'Network traffic distribution'
          }
        ],
        id: 'wifi',
        sectionName: 'wifi',
        title: 'wifi',
        type: 'basic'
      }
    ]
    wrapper.vm.form.globals.mode = 'mwan'
    wrapper.vm.members = members
    wrapper.vm.policies = policies
    wrapper.vm.interfaces = interfaces
    wrapper.vm.ifaceStatus = ifaceStatus
    expect(wrapper.vm.parsedCardStatus).toEqual(result)
  })

  it('executes saveData', async () => {
    wrapper.vm.formRef = {
      validate: vi.fn().mockResolvedValue({ valid: true })
    }
    wrapper.vm.form.globals.mode = 'mwan'
    wrapper.vm.members = [
      { id: 'wan_member_mwan', metric: '1', interface: 'wan' },
      { id: 'mob1s1a1_member_mwan', metric: '2', interface: 'mob1s1a1' },
      { id: 'wifi_member_mwan', metric: '3', interface: 'wifi' }
    ]
    wrapper.vm.policies = [{ id: 'mwan_default', name: 'mwan', use_member: ['wan_member_mwan', 'mob1s1a1_member_mwan', 'wifi_member_mwan'] }]
    wrapper.vm.interfaces = [
      { id: 'wan', name: 'wan', enabled: '1' },
      { id: 'wifi', name: 'wifi', enabled: '1' },
      { id: 'mob1s1a1', name: 'mob1s1a1', enabled: '0' }
    ]
    const message = useMessages()
    const spy = vi.spyOn(message, 'success')
    axios.bulk = vi.fn().mockResolvedValue([{ success: true }, { success: true }, { success: true }])
    await wrapper.vm.saveData()
    expect(spy).toHaveBeenCalledWith('Configuration has been applied')
  })

  it('executes saveData with errors in all requests', async () => {
    wrapper.vm.formRef = {
      validate: vi.fn().mockResolvedValue({ valid: true })
    }
    wrapper.vm.form.globals.mode = 'mwan'
    wrapper.vm.members = [
      { id: 'wan_member_mwan', metric: '1', interface: 'wan' },
      { id: 'mob1s1a1_member_mwan', metric: '2', interface: 'mob1s1a1' },
      { id: 'wifi_member_mwan', metric: '3', interface: 'wifi' }
    ]
    wrapper.vm.policies = [{ id: 'mwan_default', name: 'mwan', use_member: ['wan_member_mwan', 'mob1s1a1_member_mwan', 'wifi_member_mwan'] }]
    wrapper.vm.interfaces = [
      { id: 'wan', name: 'wan', enabled: '1' },
      { id: 'wifi', name: 'wifi', enabled: '1' },
      { id: 'mob1s1a1', name: 'mob1s1a1', enabled: '0' }
    ]
    const message = useMessages()
    const spy = vi.spyOn(message, 'error')
    axios.bulk = vi.fn().mockResolvedValue([{ success: false }, { success: false }, { success: false }])
    await wrapper.vm.saveData()
    expect(spy).toHaveBeenNthCalledWith(1, 'Failed to save mode')
    expect(spy).toHaveBeenNthCalledWith(2, 'Failed to save members')
    expect(spy).toHaveBeenNthCalledWith(3, 'Failed to enable interfaces')
  })

  it('checks if saveData returned error', async () => {
    wrapper.vm.formRef = {
      validate: vi.fn().mockResolvedValue({ valid: true })
    }
    wrapper.vm.interfaces = [{ id: 'wan', enabled: '0' }]
    const message = useMessages()
    axios.bulk = vi.fn().mockRejectedValue()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.saveData()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })

  it.each`
    iface         | ifStatus                                                                                                               | expected
    ${''}         | ${[{ id: 'wan', name: 'wan' }, { id: 'mob1s1a1', name: 'mob1s1a1', ip6addrs: ['::1'] }]}                               | ${null}
    ${'wan'}      | ${[{ id: 'wan', name: 'wan' }, { id: 'mob1s1a1', name: 'mob1s1a1' }]}                                                  | ${null}
    ${'wan'}      | ${[{ id: 'wan', name: 'wan', ip6addrs: ['::2'] }, { id: 'mob1s1a1', name: 'mob1s1a1', ip6addrs: ['::1'] }]}            | ${null}
    ${'wan'}      | ${[{ id: 'wan', name: 'wan' }, { id: 'mob1s1a1', name: 'mob1s1a1', ip6addrs: ['::1'] }]}                               | ${{ id: 'mob1s1a1', name: 'mob1s1a1', ip6addrs: ['::1'] }}
    ${'wan'}      | ${[{ id: 'wan', name: 'wan' }, { id: 'mob1s1a1', name: 'mob1s1a1' }, { id: 'wifi', name: 'wifi', ip6addrs: ['::3'] }]} | ${{ id: 'wifi', name: 'wifi', ip6addrs: ['::3'] }}
    ${'mob1s1a1'} | ${[{ id: 'wan', name: 'wan' }, { id: 'mob1s1a1', name: 'mob1s1a1', ip6addrs: ['::1'] }]}                               | ${null}
    ${'mob1s1a1'} | ${[{ id: 'wan', name: 'wan', ip6addrs: ['::1'] }, { id: 'mob1s1a1', name: 'mob1s1a1' }]}                               | ${null}
  `('checks whether IPv6 interface is present %#', ({ iface, ifStatus, expected }) => {
    wrapper.vm.form.globals.mode = 'mwan'
    wrapper.vm.interfaces = interfaces
    wrapper.vm.members = members
    wrapper.vm.policies = policies
    wrapper.vm.ifaceStatus = ifaceStatus
    wrapper.vm.ifStatus = ifStatus
    const result = wrapper.vm.anyIpv6Iface(iface)
    expect(result).toEqual(expected)
  })
})
