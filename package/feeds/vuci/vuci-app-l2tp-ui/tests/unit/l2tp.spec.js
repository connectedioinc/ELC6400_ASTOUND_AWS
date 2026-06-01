import L2tp from '../../src/views/services/L2tp.vue'
import L2tpEdit from '../../src/views/services/L2tpEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

const sixClients = [{ '.type': 'interface' }, { '.type': 'interface' }, { '.type': 'interface' }, { '.type': 'interface' }, { '.type': 'interface' }, { '.type': 'interface' }]
const serverExists = [{ '.type': 'service' }]
const oneClient = [{ '.type': 'interface' }]

describe('L2tp tests', () => {
  // const goodResponse = { success: true, data: [{ test: 'network' }] }
  // const badResponse = { success: false, data: [] }

  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(L2tp)
  })
  it('Checks if error message is showed', async () => {
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('Failed to load users')
  })

  it.each([
    [sixClients, true],
    [oneClient, false]
  ])('Tests clientLimitReached', (data, res) => {
    wrapper.vm.formData = { l2tp: data }
    const val = wrapper.vm.clientLimitReached
    expect(val).toEqual(res)
  })
  it.each([
    [sixClients, true],
    [oneClient, false]
  ])('Tests clientLimitReached', (data, res) => {
    wrapper.vm.formData = { l2tp: data }
    const val = wrapper.vm.clientLimitReached
    expect(val).toEqual(res)
  })
  it.each([
    [serverExists, sixClients, true],
    [serverExists, oneClient, false],
    [[], sixClients, false],
    [[], [], false]
  ])('Tests instanceLimitReached', (servers, clients, res) => {
    wrapper.vm.formData = { l2tp: [...servers, ...clients] }
    const val = wrapper.vm.instanceLimitReached
    expect(val).toEqual(res)
  })
  it.each`
    data                                                                                                                         | rejectsResolves | result
    ${[{ '.type': 'interface', defaultroute: '1', enabled: '1' }, { '.type': 'interface', defaultroute: '1', enabled: '1' }]}    | ${'rejects'}    | ${'Only one "Client" instance with enabled "Default route" can be enabled at a time.'}
    ${[{ '.type': 'interface', defaultroute: '1', enabled: '1' }, { '.type': 'interface', defaultroute: '1', enabled: '0' }]}    | ${'resolves'}   | ${undefined}
    ${[{ '.type': 'interface', defaultroute: '1', enabled: '1' }, { '.type': 'interface', defaultroute: '0', enabled: '1' }]}    | ${'resolves'}   | ${undefined}
    ${[{ '.type': 'interface', defaultroute: '1', enabled: '1' }, { '.type': 'notInterface', defaultroute: '1', enabled: '1' }]} | ${'resolves'}   | ${undefined}
  `('onBeforeSave check then %s', async ({ data, rejectsResolves, result }) => {
    wrapper.vm.formData = { l2tp: data }
    await expect(wrapper.vm.onBeforeSave())[rejectsResolves].toEqual(result)
  })
  it('returns after delete function early when instance is not service type', () => {
    const uciData = { users: [{ name: 'test' }] }
    const section = { '.type': 'interface' }
    wrapper.vm.onAfterDelete(section, uciData)
    expect(uciData).toEqual({ users: [{ name: 'test' }] })
  })
  it('sets uciData users to empty array when section type is service', () => {
    const uciData = { users: [{ name: 'test' }] }
    const section = { '.type': 'service' }
    wrapper.vm.onAfterDelete(section, uciData)
    expect(uciData).toEqual({ users: [] })
  })
  it.each([
    ['test', 'showServerConfigModal', 'showLogsModal'],
    ['test', 'showServerConfigModal', 'showLogsModal'],
    ['test', 'showLogsModal', 'showServerConfigModal'],
    ['test', 'showLogsModal', 'showServerConfigModal']
  ])('openModal', (itemId, showModal, closedModal) => {
    const wrapper = createWrapper(L2tp)
    wrapper.vm.openModal(itemId, showModal)
    expect(wrapper.vm.openedInstance).toEqual(itemId)
    expect(wrapper.vm[showModal]).toEqual(true)
    expect(wrapper.vm[closedModal]).toEqual(false)
  })
  it.each([['showServerConfigModal'], ['showServerConfigModal'], ['showLogsModal'], ['showLogsModal']])('closeModal', showModal => {
    const wrapper = createWrapper(L2tp)
    wrapper.vm.closeModal(showModal)
    expect(wrapper.vm[showModal]).toEqual(false)
  })

  // Uncomment after #13078 issue is done
  it.each([
    [1, { 1: { logs: '123' } }, 0],
    [1, { 1: { logs: '123\n456\n789\n' } }, 3],
    [1, { 1: { logs: '' } }, '0']
  ])('displayLogs', (itemId, data, res) => {
    const wrapper = createWrapper(L2tp)
    wrapper.vm.l2tpStatus = data
    const val = wrapper.vm.displayLogs(itemId)
    expect(val).toEqual(res)
  })
  it.each([
    [1, { 1: { username: 'test' } }, 'test'],
    [1, { 1: {} }, '-']
  ])('displayUsername', (itemId, data, response) => {
    const wrapper = createWrapper(L2tp)
    wrapper.vm.l2tpStatus = data
    const val = wrapper.vm.displayUsername(itemId)
    expect(val).toEqual(response)
  })
  it.each([
    [1, { 1: { server: 'test' } }, 'test'],
    [1, { 1: {} }, '-']
  ])('displayServer', (itemId, data, response) => {
    const wrapper = createWrapper(L2tp)
    wrapper.vm.l2tpStatus = data
    const val = wrapper.vm.displayServer(itemId)
    expect(val).toEqual(response)
  })
  it.each([
    [1, { 1: { start_ip: 'startip', end_ip: 'endip' } }, 'startip - endip'],
    [1, { 1: { end_ip: 'endip' } }, '-'],
    [1, { 1: { start_ip: 'startip' } }, '-'],
    [1, { 1: {} }, '-']
  ])('displayServerRemoteIpAddress', (itemId, data, response) => {
    const wrapper = createWrapper(L2tp)
    wrapper.vm.l2tpStatus = data
    const val = wrapper.vm.displayServerRemoteIpAddress(itemId)
    expect(val).toEqual(response)
  })
  it.each([
    [1, { 1: { remote_ip: 'test' } }, 'test'],
    [1, { 1: {} }, '-']
  ])('displayClientRemoteIpAddress', (itemId, data, response) => {
    const wrapper = createWrapper(L2tp)
    wrapper.vm.l2tpStatus = data
    const val = wrapper.vm.displayClientRemoteIpAddress(itemId)
    expect(val).toEqual(response)
  })
  it.each([
    ['test', { test: { status: 0 } }, '-'],
    ['test', { test: { status: '1' } }, 'Connected'],
    ['test', { test: { status: '2' } }, 'Up'],
    ['test', { test: { status: '3' } }, 'Down'],
    ['test', { test: { status: '4' } }, 'Disabled'],
    ['test', { test: { status: '0' } }, 'Disconnected']
  ])('displayStatus', (itemName, data, res) => {
    const wrapper = createWrapper(L2tp)
    wrapper.vm.l2tpStatus = data
    const val = wrapper.vm.displayStatus(itemName)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', { test: { status: 0 } }, 'error'],
    ['test', { test: { status: 1 } }, 'success'],
    ['test', { test: { status: 2 } }, 'success'],
    ['test', { test: { status: 3 } }, 'error'],
    ['test', { test: { status: 4 } }, 'disabled'],
    ['test', { test: { status: 'invalid' } }, 'disabled']
  ])('returns correct color for status %s', (itemName, l2tpStatus, expectedColor) => {
    const wrapper = createWrapper(L2tp)
    wrapper.vm.l2tpStatus = l2tpStatus
    const color = wrapper.vm.parseStatusColor(l2tpStatus[itemName].status)
    expect(color).toBe(expectedColor)
  })
  it.each([
    ['test', { test: { local_ip: '192.168.1.1' } }, '192.168.1.1'],
    ['test', { test: {} }, '-']
  ])('displayLocalIpAddress', (itemName, data, res) => {
    const wrapper = createWrapper(L2tp)
    wrapper.vm.l2tpStatus = data
    const val = wrapper.vm.displayLocalIpAddress(itemName)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', { test: { rx: 'rx' } }, 'rx'],
    ['test', { test: {} }, undefined]
  ])('displayRx', (itemName, data, res) => {
    const wrapper = createWrapper(L2tp)
    wrapper.vm.l2tpStatus = data
    const val = wrapper.vm.displayRx(itemName)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', { test: { tx: 'tx' } }, 'tx'],
    ['test', { test: {} }, undefined]
  ])('displayTx', (itemName, data, res) => {
    const wrapper = createWrapper(L2tp)
    wrapper.vm.l2tpStatus = data
    const val = wrapper.vm.displayTx(itemName)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', { test: { uptime: '1d 1h 1m 01s' } }, '1d 1h 1m 01s'],
    ['test', { test: {} }, '-']
  ])('displayUptime', (itemName, data, res) => {
    const wrapper = createWrapper(L2tp)
    wrapper.vm.l2tpStatus = data
    const val = wrapper.vm.displayUptime(itemName)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', { test: { clients_all: '2', clients_connected: '1' } }, '1/2'],
    ['test', { test: {} }, '0/0']
  ])('displayClients', (itemName, data, res) => {
    const wrapper = createWrapper(L2tp)
    wrapper.vm.l2tpStatus = data
    const val = wrapper.vm.displayClients(itemName)
    expect(val).toEqual(res)
  })

  it('loads l2tp status', async () => {
    const data = {
      success: true,
      data: {
        client: {
          username: 'test',
          status: '4',
          server: '192.168.81.125'
        },
        server: {
          local_ip: '192.168.2.1',
          tx: '0',
          end_ip: '192.168.2.30',
          rx: '0',
          clients_connected: 0,
          status: '4',
          start_ip: '192.168.2.20',
          clients_all: 2,
          peers: [{ tx: '10', rx: '100' }]
        }
      }
    }
    const wrapper = createWrapper(L2tp)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce(data)
    await wrapper.vm.checkStatus()
    expect(wrapper.vm.l2tpStatus).toEqual({
      client: {
        username: 'test',
        status: '4',
        server: '192.168.81.125'
      },
      server: {
        local_ip: '192.168.2.1',
        tx: '0',
        end_ip: '192.168.2.30',
        rx: '0',
        clients_connected: 0,
        status: '4',
        start_ip: '192.168.2.20',
        clients_all: 2,
        peers: [{ tx: '10 B', rx: '100 B' }]
      }
    })
  })
  it('invokes error message when l2tp status failed to load', async () => {
    const wrapper = createWrapper(L2tp)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce({})
    await wrapper.vm.checkStatus()
    expect(spy).toHaveBeenCalledWith('Failed to load L2TP status data')
  })
  // Uncomment after #13078 issue is done
  // it.each([
  //   [
  //     [{ id: 'test1' }, { id: 'test2' }],
  //     [
  //       {
  //         success: true,
  //         data: { response: 'test1 data' }
  //       },
  //       {
  //         success: true,
  //         data: { response: 'test2 data' }
  //       }
  //     ],
  //     {
  //       test1: {
  //         success: true,
  //         data: {
  //           response: 'test1 data'
  //         }
  //       },
  //       test2: {
  //         success: true,
  //         data: {
  //           response: 'test2 data'
  //         }
  //       }
  //     }
  //   ],
  //   [
  //     [{ id: 'test1' }],
  //     [
  //       {
  //         success: true,
  //         data: { response: 'test1 data' }
  //       }
  //     ],
  //     {
  //       test1: {
  //         success: true,
  //         data: {
  //           response: 'test1 data'
  //         }
  //       }
  //     }
  //   ]
  // ])('UpdateLogs success on requests with $times instance(s)', async (l2tpForm, response, logs) => {
  //   const wrapper = createWrapper(L2tp)
  //   wrapper.vm.formData = { l2tp: l2tpForm }
  //   wrapper.vm.$axios.bulkGet = vi.fn()
  //   wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(response)
  //   await wrapper.vm.updateLogs()
  //   expect(wrapper.vm.logs).toEqual(logs)
  // })
  // it.each([
  //   [
  //     [{ id: 'test1' }, { id: 'test2' }],
  //     [
  //       {
  //         success: false,
  //         errors: [{ code: 1 }]
  //       },
  //       {
  //         success: false,
  //         errors: [{ code: 1 }]
  //       }
  //     ],
  //     2
  //   ],
  //   [
  //     [{ id: 'test1' }],
  //     [
  //       {
  //         success: false,
  //         errors: [{ code: 1 }]
  //       }
  //     ],
  //     1
  //   ]
  // ])('UpdateLogs fails requests with $times instance(s)', async (l2tpForm, response, times) => {
  //   const wrapper = createWrapper(L2tp)
  //   const spy = vi.spyOn(wrapper.vm.$message, 'error')
  //   wrapper.vm.formData = { l2tp: l2tpForm }
  //   wrapper.vm.$axios.bulkGet = vi.fn()
  //   wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(response)
  //   await wrapper.vm.updateLogs()
  //   expect(spy).toHaveBeenCalledTimes(times)
  //   l2tpForm.forEach(instance => {
  //     expect(spy).toBeCalledWith(`Failed to load log for ${instance.id} instance`)
  //   })
  // })
  // it('UpdateLogs invokes error message when bulkGet is rejected', async () => {
  //   const wrapper = createWrapper(L2tp)
  //   wrapper.vm.formData = { l2tp: [{ id: 'test1' }, { id: 'test2' }] }
  //   const spy = vi.spyOn(wrapper.vm.$message, 'error')
  //   wrapper.vm.$axios.bulkGet = vi.fn()
  //   wrapper.vm.$axios.bulkGet.mockRejectedValueOnce({})
  //   await wrapper.vm.updateLogs()
  //   expect(spy).toHaveBeenCalledWith('Failed to load logs')
  // })
  it.each([
    [
      {
        item: {}
      },
      {
        id: 'server'
      },
      {
        item: {
          id: 'server'
        },
        columns: [
          [
            { label: 'Status', value: '-', class: 'disabled' },
            { label: 'Local IP Address', value: '-' },
            { label: 'Remote IP Address', value: '-' }
          ],
          [
            { label: 'Active clients', value: '0/0', onClick: expect.any(Function) },
            { label: 'Logs', value: '0', onClick: expect.any(Function) }
          ],
          [
            { label: 'RX', value: '-' },
            { label: 'TX', value: '-' }
          ],
          [{ label: 'Uptime', value: '-' }]
        ]
      }
    ],
    [
      {
        server: {
          username: 'test',
          status: '4',
          server: '192.168.81.125',
          local_ip: '192.168.1.1',
          start_ip: 'start',
          end_ip: 'end',
          rx: 100,
          tx: 164165,
          clients_connected: '2',
          clients_all: '2'
        }
      },
      {
        id: 'server'
      },
      {
        item: {
          id: 'server'
        },
        columns: [
          [
            { label: 'Status', value: 'Disabled', class: 'disabled' },
            { label: 'Local IP Address', value: '192.168.1.1' },
            { label: 'Remote IP Address', value: 'start - end' }
          ],
          [
            { label: 'Active clients', value: '2/2', onClick: expect.any(Function) },
            { label: 'Logs', value: '0', onClick: expect.any(Function) }
          ],
          [
            { label: 'RX', value: '100 B' },
            { label: 'TX', value: '160.32 KB' }
          ],
          [{ label: 'Uptime', value: '-' }]
        ]
      }
    ]
  ])('returns serverCols', async (l2tpStatus, value, result) => {
    const wrapper = createWrapper(L2tp)
    wrapper.vm.l2tpStatus = l2tpStatus
    const val = await wrapper.vm.serverCols(value)
    expect(val).toEqual(result)
  })
  it.each([
    [
      {
        client: {}
      },
      {
        id: 'client'
      },
      {
        item: {
          id: 'client'
        },
        columns: [
          [
            { label: 'Status', value: '-', class: 'disabled' },
            { label: 'Server', value: '-' },
            { label: 'Username', value: '-' }
          ],
          [
            { label: 'Local IP Address', value: '-' },
            { label: 'Remote IP Address', value: '-' },
            { label: 'Logs', value: '0', onClick: expect.any(Function) }
          ],
          [
            { label: 'RX', value: '-' },
            { label: 'TX', value: '-' }
          ],
          [{ label: 'Uptime', value: '-' }]
        ]
      }
    ],
    [
      {
        client: {
          username: 'test',
          status: '4',
          server: '192.168.81.125',
          local_ip: '192.168.1.1',
          start_ip: 'start',
          end_ip: 'end',
          rx: 15888999,
          tx: 1255,
          clients_connected: '2',
          clients_all: '2'
        }
      },
      {
        id: 'client'
      },
      {
        item: {
          id: 'client'
        },
        columns: [
          [
            { label: 'Status', value: 'Disabled', class: 'disabled' },
            { label: 'Server', value: '192.168.81.125' },
            { label: 'Username', value: 'test' }
          ],
          [
            { label: 'Local IP Address', value: '192.168.1.1' },
            { label: 'Remote IP Address', value: '-' },
            { label: 'Logs', value: '0', onClick: expect.any(Function) }
          ],
          [
            { label: 'RX', value: '15.15 MB' },
            { label: 'TX', value: '1.23 KB' }
          ],
          [{ label: 'Uptime', value: '-' }]
        ]
      }
    ]
  ])('returns clientCols', async (l2tpStatus, value, result) => {
    const wrapper = createWrapper(L2tp)
    wrapper.vm.l2tpStatus = l2tpStatus
    const val = await wrapper.vm.clientCols(value)
    expect(val).toEqual(result)
  })
})
describe('L2tpEdit tests', () => {
  it('Checks initial userColumns data', () => {
    const wrapper = createWrapper(L2tpEdit, { props: { section: {} } })
    expect(wrapper.vm.userColumns).toEqual([
      { name: 'username', label: 'Username' },
      { name: 'password', label: 'Password' },
      { name: 'remoteip', label: "L2TP Client's IP" }
    ])
  })
})
it.each`
  data                                                                                                                         | rejectsResolves | result
  ${[{ '.type': 'interface', defaultroute: '1', enabled: '1' }, { '.type': 'interface', defaultroute: '1', enabled: '1' }]}    | ${'rejects'}    | ${'Only one "Client" instance with enabled "Default route" can be enabled at a time.'}
  ${[{ '.type': 'interface', defaultroute: '1', enabled: '1' }, { '.type': 'interface', defaultroute: '1', enabled: '0' }]}    | ${'resolves'}   | ${undefined}
  ${[{ '.type': 'interface', defaultroute: '1', enabled: '1' }, { '.type': 'interface', defaultroute: '0', enabled: '1' }]}    | ${'resolves'}   | ${undefined}
  ${[{ '.type': 'interface', defaultroute: '1', enabled: '1' }, { '.type': 'notInterface', defaultroute: '1', enabled: '1' }]} | ${'resolves'}   | ${undefined}
`('onBeforeSave check then %s', async ({ data, rejectsResolves, result }) => {
  const wrapper = createWrapper(L2tpEdit, { props: { section: {} } })
  wrapper.vm.formData = { l2tp: data }
  await expect(wrapper.vm.onBeforeSave())[rejectsResolves].toEqual(result)
})
it.each`
  data                                                                | input      | result
  ${[{ username: 'test1', id: '1' }, { username: 'test1', id: '2' }]} | ${'test1'} | ${{ isValid: false, message: "Username 'test1' already exists" }}
  ${[{ username: 'test1', id: '1' }, { username: 'test2', id: '2' }]} | ${'test1'} | ${{ isValid: true }}
`('Validate username duplicates %s', async ({ data, input, result }) => {
  const wrapper = createWrapper(L2tpEdit, { props: { section: {} } })
  wrapper.vm.formData = { users: data }
  const val = await wrapper.vm.validateDuplicate(input)
  expect(val).toEqual(result)
})
it.each`
  input             | result
  ${'HelloWorld'}   | ${{ isValid: true }}
  ${"Hello'World"}  | ${{ isValid: false, message: "Character ' and ` are not allowed." }}
  ${'Hello`World'}  | ${{ isValid: false, message: "Character ' and ` are not allowed." }}
  ${'Hello World'}  | ${{ isValid: true }}
  ${'Hello\nWorld'} | ${{ isValid: true }}
`('Validate custom field characters %s', async ({ input, result }) => {
  const wrapper = createWrapper(L2tpEdit, { props: { section: {} } })
  const val = await wrapper.vm.validateCustom(input)
  expect(val).toEqual(result)
})
it.each([
  ['interface', serverExists, true],
  ['interface', [], false],
  ['service', serverExists, false]
])('Tests serverLimitReached', (sectionType, data, res) => {
  const wrapper = createWrapper(L2tpEdit, { props: { section: { '.type': sectionType } } })
  wrapper.vm.formData = { l2tp: data }
  const val = wrapper.vm.serverLimitReached
  expect(val).toEqual(res)
})
it.each([
  ['service', sixClients, true],
  ['service', [], false],
  ['interface', sixClients, false]
])('Tests clientLimitReached', (sectionType, data, res) => {
  const wrapper = createWrapper(L2tpEdit, { props: { section: { '.type': sectionType } } })
  wrapper.vm.formData = { l2tp: data }
  const val = wrapper.vm.clientLimitReached
  expect(val).toEqual(res)
})
it.each([
  ['service', serverExists, sixClients, 'Maximum number of L2TP client instances has been reached.'],
  ['service', serverExists, oneClient, false],
  ['service', [], oneClient, false],
  ['service', [], [], false],
  ['interface', serverExists, sixClients, 'Maximum number of L2TP server instances has been reached.'],
  ['interface', serverExists, oneClient, 'Maximum number of L2TP server instances has been reached.'],
  ['interface', serverExists, [], 'Maximum number of L2TP server instances has been reached.'],
  ['interface', [], [], false]
])('Tests limitReachedMessage', (sectionType, servers, clients, res) => {
  const wrapper = createWrapper(L2tpEdit, { props: { section: { '.type': sectionType } } })
  wrapper.vm.formData = { l2tp: [...servers, ...clients] }
  const val = wrapper.vm.limitReachedMessage
  expect(val).toEqual(res)
})
