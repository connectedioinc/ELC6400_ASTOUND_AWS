import OverIP from '../../src/views/services/OverIP.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('OverIP overview tests', () => {
  it.each([
    ['client', 'Client'],
    ['rs485', '-']
  ])('returns display when value when value is %s', (value, response) => {
    const wrapper = createWrapper(OverIP)
    const val = wrapper.vm.displayMode(value)
    expect(val).toEqual(response)
  })
  it.each([
    ['0', '0', 'TCP'],
    ['1', '0', 'UDP'],
    ['0', '1', 'TCP with TLS'],
    ['1', '1', 'UDP with TLS'],
    ['3', '0', '-']
  ])('returns protocol display when value when value is %s', (protocol, useTLS, response) => {
    const wrapper = createWrapper(OverIP)
    const val = wrapper.vm.displayProtocol({
      use_tls: useTLS,
      protocol
    })
    expect(val).toEqual(response)
  })
  it.each([
    ['-', { label: 'Server address', value: '-' }],
    [['1.1.1.1:17'], { hint: [], label: 'Server address', value: '1.1.1.1:17' }],
    [['1.1.1.1:17', '5.5.5.5:25'], { hint: { hint: [{ info: '1.1.1.1:17' }, { info: '5.5.5.5:25' }] }, label: 'Server addresses', value: '2 addresses' }]
  ])('returns address row display value', (value, response) => {
    const wrapper = createWrapper(OverIP)
    const val = wrapper.vm.returnAddressRow(value)
    expect(val).toEqual(response)
  })
  it.each([
    [
      { dev: 'RS232', mode: 'Client' },
      { content: { rx: 500, tx: 150, uptime: 5000 } },
      {
        item: { content: { tx: 150, rx: 500, uptime: 5000 } },
        columns: [
          [
            { label: 'Status', value: 'Up', class: 'success', errorHint: '' },
            { label: 'Device', value: 'RS232' },
            { label: 'Mode', value: 'Client' }
          ],
          'middle',
          [
            { label: 'Uptime', value: '1h 23m 20s' },
            { label: 'Last time data sent', value: '0h 0m 0s' },
            { label: 'RX', value: '500 B' },
            { label: 'TX', value: '150 B' }
          ]
        ]
      }
    ],
    [
      { dev: '', mode: '' },
      { content: { error_code: 1 } },
      {
        item: { content: { error_code: 1 } },
        columns: [
          [
            { label: 'Status', value: 'Down', class: 'error', errorHint: 'Failed to start service' },
            { label: 'Device', value: '-' },
            { label: 'Mode', value: '-' }
          ],
          'middle',
          [
            { label: 'Uptime', value: '-' },
            { label: 'Last time data sent', value: '-' },
            { label: 'RX', value: '0 B' },
            { label: 'TX', value: '0 B' }
          ]
        ]
      }
    ],
    [
      { dev: '', mode: '' },
      {},
      {
        item: {},
        columns: [
          [
            { label: 'Status', value: 'Down', class: 'error', errorHint: '' },
            { label: 'Device', value: '-' },
            { label: 'Mode', value: '-' }
          ],
          'middle',
          [
            { label: 'Uptime', value: '-' },
            { label: 'Last time data sent', value: '-' },
            { label: 'RX', value: '0 B' },
            { label: 'TX', value: '0 B' }
          ]
        ]
      }
    ]
  ])('returns address row display value', (mocks, value, response) => {
    const wrapper = createWrapper(OverIP)
    wrapper.vm.returnMiddleColumns = vi.fn().mockReturnValueOnce('middle')
    wrapper.vm.$serial.deviceDisplayValue = vi.fn().mockReturnValueOnce(mocks.dev)
    wrapper.vm.displayMode = vi.fn().mockReturnValueOnce(mocks.mode)
    const val = wrapper.vm.overviewColumns(value)
    expect(val).toEqual(response)
  })
  it.each([
    [
      { mode: 'client_server', port_listen: '15' },
      { last_time_data_sent: 1000, connected_clients: '15', connected_servers: '10' },
      true,
      [{ label: 'Protocol', value: 'TCP' }, '1.2.3.4:17', { label: 'Port', value: '15' }, { label: 'Connected clients', value: '15/0' }, { label: 'Connected servers', value: '10/0' }]
    ],
    [
      { mode: 'client_server', port_listen: '15' },
      { last_time_data_sent: 1000, connected_clients: '15', connected_servers: '10' },
      false,
      [{ label: 'Protocol', value: 'TCP' }, '1.2.3.4:17', { label: 'Port', value: '15' }, { label: 'Connected clients', value: '-' }, { label: 'Connected servers', value: '-' }]
    ],
    [
      { mode: 'client', port_listen: '15' },
      { last_time_data_sent: 1000, connected_servers: '15' },
      ['test', 'test2'],
      [{ label: 'Protocol', value: 'TCP' }, '1.2.3.4:17', { label: 'Connected servers', value: '15/0' }]
    ],
    [{ port_listen: '15' }, { last_time_data_sent: 1000, connected_clients: '15' }, [], [{ label: 'Protocol', value: 'TCP' }]],
    [
      { mode: 'server', port_listen: '15', protocol: '0', max_clients: '16' },
      { last_time_data_sent: 1000, connected_clients: '15' },
      true,
      [
        { label: 'Protocol', value: 'TCP' },
        { label: 'Port', value: '15' },
        { label: 'Connected clients', value: '15/16' }
      ]
    ],
    [
      { mode: 'server', port_listen: '15', protocol: '0' },
      { last_time_data_sent: 1000, connected_clients: '15' },
      false,
      [
        { label: 'Protocol', value: 'TCP' },
        { label: 'Port', value: '15' },
        { label: 'Connected clients', value: '-' }
      ]
    ],
    [
      { mode: 'server', port_listen: '15', protocol: '1' },
      { last_time_data_sent: 1000, connected_clients: '15' },
      false,
      [
        { label: 'Protocol', value: 'TCP' },
        { label: 'Port', value: '15' }
      ]
    ]
  ])('returns address row display value', (item, status, isStatusGood, response) => {
    const wrapper = createWrapper(OverIP)
    wrapper.vm.returnAddressRow = vi.fn().mockReturnValueOnce('1.2.3.4:17')
    wrapper.vm.displayProtocol = vi.fn().mockReturnValueOnce('TCP')
    const val = wrapper.vm.returnMiddleColumns(item, status, isStatusGood)
    expect(val).toEqual(response)
  })
  it('loads data when api call is sucessful', async () => {
    const wrapper = createWrapper(OverIP)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples.mockReturnValueOnce([])
    wrapper.vm.updateStatus = vi.fn()
    wrapper.vm.$timer.start = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: true, data: { board: { serial: [{ devices: ['rs1254'] }, { devices: ['rs243'] }, { external_devices: [] }] } } },
      { success: true, data: [{ test: 'test' }] },
      { success: true, data: [{ name: 'test' }] },
      { success: true, data: ['test2'] }
    ])
    await wrapper.vm.loadData({ overip: [{ id: 'test' }] })
    expect(wrapper.vm.firewallZones).toEqual([['test', 'TEST']])
    expect(wrapper.vm.serialStatus).toEqual([{ test: 'test' }])
    expect(wrapper.vm.serialDevices).toEqual([{ devices: ['rs1254'] }, { devices: ['rs243'] }, { external_devices: [] }])
  })
  it('loads data when api call is sucessful, but all gets return success false', async () => {
    const wrapper = createWrapper(OverIP)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples.mockReturnValueOnce([])
    wrapper.vm.updateStatus = vi.fn()
    wrapper.vm.$timer.start = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: false, data: { board: { serial: [{ devices: ['rs1254'] }, { devices: ['rs243'] }, { external_devices: [] }] } } },
      { success: false, data: [{ test: 'test' }] },
      { success: false, data: [] },
      { success: false, data: [] }
    ])
    await wrapper.vm.loadData({ overip: [{ id: 'test' }] })
    expect(wrapper.vm.certificates).toEqual([])
    expect(wrapper.vm.firewallZones).toEqual([])
    expect(wrapper.vm.serialStatus).toEqual([])
    expect(wrapper.vm.serialDevices).toEqual([])
  })
  it('loads data when api call is sucessful, but all gets return success false', async () => {
    const wrapper = createWrapper(OverIP)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples.mockReturnValueOnce([])
    wrapper.vm.updateStatus = vi.fn()
    wrapper.vm.$timer.start = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: true, data: { board: {} } },
      { success: false, data: [{ test: 'test' }] },
      { success: false, data: [] },
      { success: false, data: [] }
    ])
    await wrapper.vm.loadData({ overip: [{ id: 'test' }] })
    expect(wrapper.vm.certificates).toEqual([])
    expect(wrapper.vm.firewallZones).toEqual([])
    expect(wrapper.vm.serialStatus).toEqual([])
    expect(wrapper.vm.serialDevices).toEqual([])
  })
  it('invokes error message when request fails', async () => {
    const wrapper = createWrapper(OverIP)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    wrapper.vm.updateStatus = vi.fn()
    wrapper.vm.$timer.start = vi.fn()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData({ overip: [{ id: 'test' }] })
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('filters devices', async () => {
    const wrapper = createWrapper(OverIP)
    const data = [
      ['/dev/rs1254', 'rs1254'],
      ['/dev/rs243', 'rs243']
    ]
    wrapper.vm.$serial.listDeviceNameTuples = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples.mockResolvedValueOnce(data)
    wrapper.vm.formOptions = { serial: data }
    const val = await wrapper.vm.devices
    expect(val).toEqual([
      ['/dev/rs1254', 'rs1254'],
      ['/dev/rs243', 'rs243']
    ])
  })
  it('passes validation', async () => {
    const wrapper = createWrapper(OverIP)
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockReturnValueOnce({ isValid: true })
    wrapper.vm.formData = { overip: [] }
    wrapper.vm.formOptions = { status: [] }
    await expect(wrapper.vm.validate()).resolves.toEqual()
  })
  it('clears form data', () => {
    const wrapper = createWrapper(OverIP)
    wrapper.vm.formData = { new: ['test'] }
    wrapper.vm.removeIpFilters({ id: 'new' })
    expect(wrapper.vm.formData.new).toEqual([])
  })
  it('displays error when status data fails to load', async () => {
    const wrapper = createWrapper(OverIP)
    wrapper.vm.$axios.get = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.updateStatus()
    expect(spy).toHaveBeenCalledWith('Failed to load status data')
  })
  it('load status data', async () => {
    const wrapper = createWrapper(OverIP)
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({ data: [{ section: 'test', test: '1' }] })
    wrapper.vm.formData = { overip: [{ id: 'test' }] }
    await wrapper.vm.updateStatus()
    expect(wrapper.vm.formData.overip[0].content).toEqual({ section: 'test', test: '1' })
  })
  it('returns unavailable error message', () => {
    const wrapper = createWrapper(OverIP)
    expect(wrapper.vm.deviceUnavailable()).toEqual('Device is unavailable')
  })
})
