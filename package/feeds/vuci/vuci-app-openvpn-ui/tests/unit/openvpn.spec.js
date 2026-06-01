import OpenVPN from '../../src/views/services/OpenVPN.vue'
import OpenVPNEdit from '../../src/views/services/OpenVPNEdit.vue'
import OpenVPNClientEdit from '../../src/views/services/OpenVPNClientEdit.vue'
import GenerateClientConfig from '../../src/views/services/GenerateClientConfig.vue'
import createWrapper from '@tests/unit/mockFactory'
import { ipv4Utils, ipv6Utils } from '@/utils/ipUtils'
import { createPinia, setActivePinia } from 'pinia'
import { axios } from '@ui-core/plugins/axios'
import { utils } from '@/plugins/utils'
import { useMessages } from '@/stores/messages'

vi.mock('@/utils/ipUtils')

vi.mock('@ui-core/plugins/axios', () => ({
  axios: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} })
  }
}))

const mockCertificatesStore = {
  getCertificates: vi.fn().mockResolvedValue(),
  generatedCertificates: [],
  rawData: { generated: [] }
}

vi.mock('@/stores/certificates', () => ({
  useCertificatesStore: () => mockCertificatesStore
}))

describe('OpenVPN overview tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockCertificatesStore.getCertificates.mockClear()
    mockCertificatesStore.generatedCertificates = []
    mockCertificatesStore.rawData = { generated: [] }
  })
  it('returns form options', () => {
    const wrapper = createWrapper(OpenVPN)
    const val = wrapper.vm.getFormOptions()
    expect(val).toEqual({ certificates: [], interfaces: [], networks: [], ip6addresses: [] })
  })
  it.each([
    [
      [
        { id: 'inst1', name: 'instance1' },
        { id: 'inst2', name: 'instance2' },
        { id: 'inst3', name: 'instance3' },
        { id: 'inst4', name: 'instance4' },
        { id: 'inst5', name: 'instance5' }
      ],
      [{ source: 'inst5', code: 1, section: 'inst5' }],
      0,
      'Private key decryption password is required for: instance5'
    ],
    [
      [
        { id: 'inst1', name: 'instance1' },
        { id: 'inst2', name: 'instance2' },
        { id: 'inst3', name: 'instance3' },
        { id: 'inst4', name: 'instance4' },
        { id: 'inst5', name: 'instance5' }
      ],
      [
        { source: 'inst1', code: 6, section: 'inst1' },
        { source: 'inst2', code: 6, section: 'inst2' },
        { source: 'inst3', code: 7, section: 'inst3' },
        { source: 'inst4', code: 7, section: 'inst4' }
      ],
      1,
      'PKCS #12 passphrase is required for: instance1, instance2'
    ],
    [
      [
        { id: 'inst1', name: 'instance1' },
        { id: 'inst2', name: 'instance2' },
        { id: 'inst3', name: 'instance3' },
        { id: 'inst4', name: 'instance4' },
        { id: 'inst5', name: 'instance5' }
      ],
      [
        { source: 'inst1', code: 6, section: 'inst1' },
        { source: 'inst2', code: 6, section: 'inst2' },
        { source: 'inst3', code: 7, section: 'inst3' },
        { source: 'inst4', code: 7, section: 'inst4' },
        { source: 'inst5', code: 1, section: 'inst5' }
      ],
      2,
      'Private key decryption password is required for: instance5'
    ]
  ])('test handleEditError', (openVpnData, errors, timesCalled, funcReturn) => {
    const wrapper = createWrapper(OpenVPN)
    wrapper.vm.formData = {
      openVpn: openVpnData
    }
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const result = wrapper.vm.handleEditError({
      type: 'edit',
      payload: [
        {
          success: false,
          errors: errors
        }
      ]
    })
    expect(result).toBe(funcReturn)
    expect(spy).toHaveBeenCalledTimes(timesCalled)
  })

  it.each([
    [1, { 1: { logs: '123' } }, 0],
    [1, { 1: { logs: '123\n456\n789\n' } }, 3],
    [1, { 1: { logs: '' } }, '0']
  ])('displayLogs', (itemId, data, res) => {
    const wrapper = createWrapper(OpenVPN)
    wrapper.vm.openvpnStatus = data
    const val = wrapper.vm.displayLogs(itemId)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', { test: { status: 0 } }, '-'],
    ['test', { test: { status: '1' } }, 'Connected'],
    ['test', { test: { status: '2' } }, 'Up'],
    ['test', { test: { status: '3' } }, 'Down'],
    ['test', { test: { status: '4' } }, 'Disabled'],
    ['test', { test: { status: '5' } }, 'Checking connection'],
    ['test', { test: { status: '6' } }, 'Undetectable'],
    ['test', { test: { status: '0' } }, 'Disconnected']
  ])('displayStatus', (itemName, data, res) => {
    const wrapper = createWrapper(OpenVPN)
    wrapper.vm.openvpnStatus = data
    const val = wrapper.vm.displayStatus(itemName)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', { test: { status: 0 } }, 'error'],
    ['test', { test: { status: 1 } }, 'success'],
    ['test', { test: { status: 2 } }, 'success'],
    ['test', { test: { status: 3 } }, 'error'],
    ['test', { test: { status: 4 } }, 'disabled'],
    ['test', { test: { status: 'invalid' } }, 'error']
  ])('returns correct color for status %s', (itemName, openvpnStatus, expectedColor) => {
    const wrapper = createWrapper(OpenVPN)
    wrapper.vm.openvpnStatus = openvpnStatus
    const color = wrapper.vm.parseStatusColor(openvpnStatus[itemName].status)
    expect(color).toBe(expectedColor)
  })
  it.each([
    ['1', 'success'],
    ['2', 'success'],
    ['5', 'text-theme-text-warning'],
    ['6', 'text-theme-text-warning'],
    ['3', 'error'],
    ['42', 'error']
  ])('parseStatusColor returns correct color for status code %s', (code, expectedColor) => {
    const wrapper = createWrapper(OpenVPN)
    const color = wrapper.vm.parseStatusColor(code)
    expect(color).toEqual(expectedColor)
  })
  it.each([
    ['test', { test: { ipaddress: '192.168.1.1' } }, '192.168.1.1'],
    ['test', { test: { ip6address: 'f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13' } }, 'f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13'],
    ['test', { test: {} }, '-']
  ])('displayLocalIpAddress', (itemName, data, res) => {
    const wrapper = createWrapper(OpenVPN)
    wrapper.vm.openvpnStatus = data
    const val = wrapper.vm.displayLocalIpAddress(itemName)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', { test: { ipaddress_remote: '192.168.1.1' } }, '192.168.1.1'],
    ['test', { test: { ip6address_remote: 'f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13' } }, 'f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13'],
    ['test', { test: {} }, '-']
  ])('displayRemoteIpAddress', (itemName, data, res) => {
    const wrapper = createWrapper(OpenVPN)
    wrapper.vm.openvpnStatus = data
    const val = wrapper.vm.displayRemoteIpAddress(itemName)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', { test: { protocol: 'tun tap' } }, 'TUN TAP'],
    ['test', { test: {} }, '-']
  ])('displayProtocol', (itemName, data, res) => {
    const wrapper = createWrapper(OpenVPN)
    wrapper.vm.openvpnStatus = data
    const val = wrapper.vm.displayProtocol(itemName)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', { test: { rx: 'rx' } }, 'rx'],
    ['test', { test: {} }, undefined]
  ])('displayRx', (itemName, data, res) => {
    const wrapper = createWrapper(OpenVPN)
    wrapper.vm.openvpnStatus = data
    const val = wrapper.vm.displayRx(itemName)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', { test: { tx: 'tx' } }, 'tx'],
    ['test', { test: {} }, undefined]
  ])('displayTx', (itemName, data, res) => {
    const wrapper = createWrapper(OpenVPN)
    wrapper.vm.openvpnStatus = data
    const val = wrapper.vm.displayTx(itemName)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', { test: { uptime: '1d 1h 1m 01s' } }, '1d 1h 1m 01s'],
    ['test', { test: {} }, '-']
  ])('displayUptime', (itemName, data, res) => {
    const wrapper = createWrapper(OpenVPN)
    wrapper.vm.openvpnStatus = data
    const val = wrapper.vm.displayUptime(itemName)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', { test: { clients_all: '2', clients_connected: '1' } }, '1/2'],
    ['test', { test: {} }, '-']
  ])('displayClients', (itemName, data, res) => {
    const wrapper = createWrapper(OpenVPN)
    wrapper.vm.openvpnStatus = data
    const val = wrapper.vm.displayClients(itemName)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', 'showServerConfigModal', 'showLogsModal'],
    ['test', 'showServerConfigModal', 'showLogsModal'],
    ['test', 'showLogsModal', 'showServerConfigModal'],
    ['test', 'showLogsModal', 'showServerConfigModal']
  ])('openModal', (itemId, showModal, closedModal) => {
    const wrapper = createWrapper(OpenVPN)
    wrapper.vm.openModal(itemId, showModal)
    expect(wrapper.vm.openedInstance).toEqual(itemId)
    expect(wrapper.vm[showModal]).toEqual(true)
    expect(wrapper.vm[closedModal]).toEqual(false)
  })
  it('deletes tls clients', async () => {
    const wrapper = createWrapper(OpenVPN)
    wrapper.vm.formData = { tlsClients: [{ sname: 'Test' }] }
    wrapper.vm.deleteClients()
    expect(wrapper.vm.formData).toEqual({ tlsClients: [] })
  })
  it('loads openvpn status', async () => {
    const data = { success: true, data: { test: { protocol: 'tun', status: '4', type: '0', clients: [{ rx: '10', tx: '1000' }] } } }
    const wrapper = createWrapper(OpenVPN)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce(data)
    await wrapper.vm.checkStatus()
    expect(wrapper.vm.openvpnStatus).toEqual({ test: { protocol: 'tun', status: '4', type: '0', clients: [{ rx: '10 B', tx: '1000 B' }] } })
  })
  it('invokes error message when openvpn status failed to load', async () => {
    const wrapper = createWrapper(OpenVPN)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce({})
    await wrapper.vm.checkStatus()
    expect(spy).toHaveBeenCalledWith('Failed to load OpenVPN status data')
  })
  it.each([
    [
      {
        server: {}
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
            { label: 'Status', value: '-', class: 'error', hint: { hint: [] } },
            { label: 'Local IP Address', value: '-', hint: { hint: [] } },
            { label: 'TUN/TAP', value: '-' }
          ],
          [
            { label: 'Active clients', value: '-', onClick: expect.any(Function) },
            { label: 'Logs', value: '0', onClick: expect.any(Function) }
          ],
          [
            { label: 'RX', value: '0 B' },
            { label: 'TX', value: '0 B' }
          ],
          [{ label: 'Uptime', value: '-' }]
        ]
      }
    ],
    [
      {
        server: {
          ipaddress: '192.168.1.1',
          ip6address: 'f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13',
          type: '1',
          protocol: 'tun',
          tx: '24698000',
          updated: '2023-03-29 09:57:26',
          rx: '25461938',
          uptime: '00h 30m 52s',
          clients_connected: '2',
          status: '2',
          clients_all: '2',
          clients: [
            {
              name: 'client1'
            },
            {
              name: 'client2'
            }
          ]
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
            { label: 'Status', value: 'Up', class: 'success', hint: { hint: [] } },
            {
              label: 'Local IP Address',
              value: '192.168.1.1',
              hint: {
                hint: [
                  { title: 'IPv4', info: '192.168.1.1' },
                  { title: 'IPv6', info: 'f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13' }
                ]
              }
            },
            { label: 'TUN/TAP', value: 'TUN' }
          ],
          [
            { label: 'Active clients', value: '2/2', onClick: expect.any(Function) },
            { label: 'Logs', value: '0', onClick: expect.any(Function) }
          ],
          [
            { label: 'RX', value: '24.28 MB' },
            { label: 'TX', value: '23.55 MB' }
          ],
          [{ label: 'Uptime', value: '00h 30m 52s' }]
        ]
      }
    ]
  ])('returns serverCols', async (mockData, value, result) => {
    const wrapper = createWrapper(OpenVPN)
    wrapper.vm.openvpnStatus = mockData
    const val = await wrapper.vm.serverCols(value)
    expect(val).toEqual(result)
  })
  it.each([
    [
      {
        status: {
          type: '0',
          protocol: '-',
          uptime: '0',
          rx: '0',
          tx: '0',
          status: '1',
          ipaddress_remote: '-',
          ipaddress: '-',
          server: '-',
          logs: '0',
          ip6address: '',
          ip6address_remote: ''
        }
      },
      {
        id: 'test'
      },
      {
        item: {
          id: 'test'
        },
        columns: [
          [
            { label: 'Status', value: '-', class: 'error', hint: { hint: [] } },
            { label: 'TUN/TAP', value: '-' }
          ],
          [
            {
              label: 'Local IP Address',
              value: '-',
              hint: { hint: [] }
            },
            {
              label: 'Remote IP Address',
              value: '-',
              hint: {
                hint: []
              }
            },
            {
              label: 'Logs',
              value: '0',
              onClick: expect.any(Function)
            }
          ],
          [
            { label: 'RX', value: '0 B' },
            { label: 'TX', value: '0 B' }
          ],
          [{ label: 'Uptime', value: '-' }]
        ]
      }
    ],
    [
      {
        test: {
          type: '2',
          protocol: 'TUN',
          tx: '102400',
          rx: '10000000000',
          uptime: '02h 04m 15s',
          status: '2',
          ipaddress_remote: '192.168.1.2',
          ipaddress: '192.168.1.1',
          server: {},
          logs: 'first log\nsecond log\nthird log\n',
          ip6address: 'f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13',
          ip6address_remote: 'f184:bb18:a403:2fde:fd4a:4b8d:7125:6c14'
        }
      },
      {
        id: 'test'
      },
      {
        item: {
          id: 'test'
        },
        columns: [
          [
            { label: 'Status', value: 'Up', class: 'success', hint: { hint: [] } },
            { label: 'TUN/TAP', value: 'TUN' }
          ],
          [
            {
              label: 'Local IP Address',
              value: '192.168.1.1',
              hint: {
                hint: [
                  {
                    info: '192.168.1.1',
                    title: 'IPv4'
                  },
                  {
                    info: 'f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13',
                    title: 'IPv6'
                  }
                ]
              }
            },
            {
              label: 'Remote IP Address',
              value: '192.168.1.2',
              hint: {
                hint: [
                  {
                    info: '192.168.1.2',
                    title: 'IPv4'
                  },
                  {
                    info: 'f184:bb18:a403:2fde:fd4a:4b8d:7125:6c14',
                    title: 'IPv6'
                  }
                ]
              }
            },
            {
              label: 'Logs',
              value: 3,
              onClick: expect.any(Function)
            }
          ],
          [
            { label: 'RX', value: '9.31 GB' },
            { label: 'TX', value: '100 KB' }
          ],
          [{ label: 'Uptime', value: '02h 04m 15s' }]
        ]
      }
    ]
  ])('returns clientCols', (mockData, value, result) => {
    const wrapper = createWrapper(OpenVPN)
    wrapper.vm.openvpnStatus = mockData
    const val = wrapper.vm.clientCols(value)
    expect(val).toEqual(result)
  })
  it('handles server instance with TLS clients', async () => {
    const wrapper = createWrapper(OpenVPN)
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValue([
      { success: true, data: [] },
      { success: true, data: null },
      { success: true, data: [] },
      { success: true, data: [] },
      { success: true, data: [{ name: 'client1' }] }
    ])
    const form = {
      openVpn: [{ type: 'server', id: 'server1' }]
    }
    const responses = [{}]
    const result = await wrapper.vm.loadData(form, responses)
    expect(result).toEqual({ tlsClients: [{ name: 'client1' }] })
  })
})
describe('OpenVPN edit tests', () => {
  const certificatesData = [
    { fullname: 'client.key.pem', cert_type: 'client', type: 'key', path: '/etc/certificates/client.key.pem' },
    { fullname: 'server.key.pem', cert_type: 'server', type: 'key', path: '/etc/certificates/server.key.pem' },
    { fullname: 'client.cert.pem', cert_type: 'client', type: 'cert', path: '/etc/certificates/client.cert.pem' },
    { fullname: 'server.cert.pem', cert_type: 'server', type: 'cert', path: '/etc/certificates/server.cert.pem' },
    { fullname: 'ca.cert.pem', cert_type: 'ca', type: 'cert', path: '/etc/certificates/ca.cert.pem' },
    { fullname: 'dh.pem', cert_type: 'dh', type: 'dh', path: '/etc/certificates/dh.pem' }
  ]
  const formOptions = {
    interfaces: [],
    networks: [],
    ip6addresses: [],
    certificates: certificatesData
  }
  const props = {
    section: {
      id: 'test1',
      type: 'client'
    }
  }
  beforeEach(() => {
    setActivePinia(createPinia())
    mockCertificatesStore.getCertificates.mockClear()
    mockCertificatesStore.generatedCertificates = certificatesData
    mockCertificatesStore.rawData = { generated: certificatesData }
  })
  const mocks = { $store: { device: 'RUTX09' } }
  it.each`
    name      | vals                                                                                   | openvpnStatus                              | res
    ${'test'} | ${[{ title: 'IP address', key: 'ipaddr' }, { title: 'IP address 2', key: 'ipaddr2' }]} | ${{ test: {} }}                            | ${{ hint: [] }}
    ${'test'} | ${[{ title: 'IP address', key: 'ipaddr' }, { title: 'IP address 2', key: 'ipaddr2' }]} | ${{ test: { ipaddr: '1' } }}               | ${{ hint: [] }}
    ${'test'} | ${[{ title: 'IP address', key: 'ipaddr' }, { title: 'IP address 2', key: 'ipaddr2' }]} | ${{ test: { ipaddr2: '2' } }}              | ${{ hint: [] }}
    ${'test'} | ${[{ title: 'IP address', key: 'ipaddr' }, { title: 'IP address 2', key: 'ipaddr2' }]} | ${{ test: { ipaddr: '1', ipaddr2: '2' } }} | ${{ hint: [{ info: '1', title: 'IP address' }, { info: '2', title: 'IP address 2' }] }}
  `('returns parseHint correctly', async ({ name, vals, openvpnStatus, res }) => {
    const wrapper = createWrapper(OpenVPN)
    wrapper.vm.openvpnStatus = openvpnStatus
    const result = wrapper.vm.parseHint(name, vals)
    expect(result).toEqual(res)
  })
  it.each([
    ['when certificate list is empty', [], []],
    [
      'when certificate list is full',
      [
        { fullname: 'test', path: '/path/to/test' },
        { fullname: 'test2', path: '/path/to/test2' }
      ],
      [
        ['/path/to/test', 'test'],
        ['/path/to/test2', 'test2']
      ]
    ]
  ])('maps certificates %s', (text, data, response) => {
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    const result = wrapper.vm.mapCertificateFiles(data)
    expect(result).toEqual(response)
  })
  it.each([
    ['2', true],
    ['1', false]
  ])('returns isPkcsDisabled flag when use_pkcs = %s', async (data, expected) => {
    const section = { id: 'test-id' }
    const wrapper = createWrapper(OpenVPNEdit, {
      props: { ...props, section },
      global: { mocks, provide: { formOptions: () => formOptions } }
    })
    await wrapper.setData({ vpnData: { openVpn: [{ id: section.id, use_pkcs: data }] } })
    expect(wrapper.vm.isPkcsDisabled).toBe(expected)
  })
  it.each([
    ['2', true],
    ['1', false]
  ])('returns isDeviceFilesDisabled flag when device_files = %s', async (data, response) => {
    const section = { id: 'test-id' }
    const wrapper = createWrapper(OpenVPNEdit, {
      props: { ...props, section },
      global: { mocks, provide: { formOptions: () => formOptions } }
    })
    await wrapper.setData({ vpnData: { openVpn: [{ id: section.id, device_files: data }] } })
    expect(wrapper.vm.isDeviceFilesDisabled).toEqual(response)
  })
  it.each([
    ['1', 1],
    ['0', 0]
  ])('shows warning message when duplicate certificates is enabled and tls client exist', async (duplicateCn, expectedWarning) => {
    const section = { id: 'test-id', duplicate_cn: duplicateCn }
    const wrapper = createWrapper(OpenVPNEdit, {
      props: { section },
      global: { mocks, provide: { formOptions: () => formOptions } }
    })
    wrapper.vm.vpnData = {
      openVpn: [section],
      tlsClients: [
        {
          '.type': 'client',
          name: 'tesss',
          common_name: 'test',
          local_ip: '0.0.0.0',
          remote_ip: '0.0.0.0'
        }
      ]
    }
    const spy = vi.spyOn(wrapper.vm.$notification, 'info')
    wrapper.vm.duplicateCnWarning()
    expect(spy).toHaveBeenCalledTimes(expectedWarning)
  })
  it('returns filtered client keys', () => {
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    const value = wrapper.vm.clientKeyOptions
    expect(value).toEqual([['/etc/certificates/client.key.pem', 'client.key.pem']])
  })
  it('returns filtered server keys', () => {
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    const value = wrapper.vm.serverKeyOptions
    expect(value).toEqual([['/etc/certificates/server.key.pem', 'server.key.pem']])
  })
  it('returns filtered client certs', () => {
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    const value = wrapper.vm.clientCertOptions
    expect(value).toEqual([['/etc/certificates/client.cert.pem', 'client.cert.pem']])
  })
  it('returns filtered server certs', () => {
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    const value = wrapper.vm.serverCertOptions
    expect(value).toEqual([['/etc/certificates/server.cert.pem', 'server.cert.pem']])
  })
  it('returns filtered ca certs', () => {
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    const value = wrapper.vm.caCertOptions
    expect(value).toEqual([['/etc/certificates/ca.cert.pem', 'ca.cert.pem']])
  })
  it.each`
    isAccessPoint | interfaces                                                                                                                                                                                                                                              | expected
    ${false}      | ${[{ is_up: true, id: 'loopback', area_type: 'wan' }, { is_up: true, id: 'test', area_type: 'lan', ipaddr: '192.168.1.1', netmask: '255.255.255.0' }, { is_up: false, id: 'test', area_type: 'lan', ipaddr: '192.168.2.1', netmask: '255.255.255.0' }]} | ${[{ ip: '192.168.1.1', net: '255.255.255.0' }, { ip: '192.168.2.1', net: '255.255.255.0' }]}
    ${true}       | ${[{ is_up: true, id: 'loopback', area_type: 'wan' }, { is_up: true, id: 'lan', area_type: 'wan', ipaddr: '192.168.1.1', netmask: '255.255.255.0' }, { is_up: true, id: 'lan', area_type: 'dmz', ipaddr: '192.168.2.1', netmask: '255.255.255.0' }]}    | ${[{ ip: '192.168.1.1', net: '255.255.255.0' }, { ip: '192.168.2.1', net: '255.255.255.0' }]}
  `('returns lan info when isAccessPoint is $isAccessPoint', ({ isAccessPoint, interfaces, expected }) => {
    const testFormOptions = {
      interfaces,
      networks: []
    }
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => testFormOptions } } })
    wrapper.vm.$store.isAccessPoint = isAccessPoint
    const val = wrapper.vm.lanInfo
    expect(val).toEqual(expected)
  })
  it.each([
    ['not external, but custom', { enable_external: '0', enable_custom: '1' }, false],
    ['not external, not custom', { configuration: 'manual' }, true],
    ['external and custom', { enable_external: '1', enable_custom: '0' }, false],
    ['not custom, but external', { configuration: 'external' }, false]
  ])('returns correct value is returned when %s', (text, section, response) => {
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    const test = wrapper.vm.notExternalOrCustom(section)
    expect(test).toEqual(response)
  })
  it.each([
    ['not custom, but upload', { enable_custom: '0', upload_files: '1' }, false],
    ['not custom, not upload', { enable_custom: '0', upload_files: '0' }, false],
    ['custom and upload', { configuration: 'custom' }, true],
    ['custom, but not upload', { enable_custom: '1', upload_files: '0' }, false]
  ])('returns correct value is returned when %s', (text, section, response) => {
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    const test = wrapper.vm.isCustomAndUpload(section)
    expect(test).toEqual(response)
  })
  it.each([
    ['value is included', 'tls', true],
    ['value isnt included', 'skey', false]
  ])('returns correct value is returned when %s', (text, value, response) => {
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    const test = wrapper.vm.isOneOf(value, ['tls', 'tls/pass', 'pass'])
    expect(test).toEqual(response)
  })
  it('invokes validate function', () => {
    const data = {
      vuciSection: {
        validate: vi.fn()
      }
    }
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    const spy = vi.spyOn(data.vuciSection, 'validate')
    wrapper.vm.updateValidations(data)
    expect(spy).toHaveBeenCalledTimes(1)
  })
  it.each([
    ['string infinite', 'infinite', true, { isValid: true }],
    ['integer', 5, true, { isValid: false, message: 'Only word "infinite" or positive integers are accepted' }],
    ['not integer and not string infinite', 7.8, false, { isValid: false, message: 'Only word "infinite" or positive integers are accepted' }],
    ['not possitive number', -7, false, { isValid: false, message: 'Only word "infinite" or positive integers are accepted' }]
  ])('returns correct value when: %s', (text, value, response, valid) => {
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    wrapper.vm.$VuciValidator.uinteger = vi.fn()
    wrapper.vm.$VuciValidator.uinteger.mockResolvedValueOnce(response)
    const test = wrapper.vm.resolveValidation(value)
    expect(test).toEqual(valid)
  })
  it.each([
    ['when values are the same', '5 5', { isValid: true }],
    ['when first value is higher', '9 7', { isValid: false, message: 'First value cannot be higher than the second one' }],
    ['when first value is lower', '1 5', { isValid: true }],
    ['when value isnt number', 'a 5', { isValid: false, message: 'Accepted values are a pair of numbers from 1 to 9999' }]
  ])('returns correct value when: %s', (text, value, valid) => {
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    const test = wrapper.vm.keepAliveValidation(value)
    expect(test).toEqual(valid)
  })
  it.each([
    ['when both pairs have value', { name: 'test', value: 'exists' }, { name: 'test2', value: 'exists' }, { isValid: true }],
    ['when value doesnt exist', { name: 'test', value: 'exists' }, { name: 'test2' }, { isValid: false, message: '"test" and "test2" are both required at the same time' }],
    ['when value is empty', { name: 'test', value: 'exists' }, { name: 'test2', value: '' }, { isValid: false, message: '"test" and "test2" are both required at the same time' }]
  ])('returns correct value when %s', (text, pairOne, pairTwo, valid) => {
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    const test = wrapper.vm.pairOfFieldsRequired(pairOne, pairTwo)
    expect(test).toEqual(valid)
  })
  it.each([
    ['when bitmask is out of range', '40', false],
    ['when bitmask is in range', '27', '255.255.255.224']
  ])('returns bitmask validation results when %s', (text, value, response) => {
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    const test = wrapper.vm.maskToSubnet(value)
    expect(test).toEqual(response)
  })
  it.each([
    ['when network netmask is correct', '192.168.0.0', [{ area_type: 'lan', ipaddr: '192.168.1.1', netmask: '255.255.255.0' }], ['192.168.1.0', '192.168.1.255'], false, { isValid: true }],
    [
      'when netmask is incorrect',
      '192.168.1.0',
      [{ area_type: 'lan', ipaddr: '192.168.1.1', netmask: '255.255.255.0' }],
      ['192.168.1.0', '192.168.1.255'],
      true,
      { isValid: false, message: 'Provided IP cannot be in LAN network range' }
    ],
    [
      'when netmask is incorrect',
      '192.168.0.0',
      [{ area_type: 'lan', ipaddr: '192.168.1.1', netmask: '255.255.0.0' }],
      ['192.168.0.0', '192.168.255.255'],
      true,
      { isValid: false, message: 'Provided IP cannot be in LAN network range' }
    ],
    ['when ip address is less than 4', '192.168.0.0', [{ area_type: 'lan', ipaddr: '192.168', netmask: '255.255.255.0' }], ['192.168.0.0', '192.168.0.255'], false, { isValid: true }],
    ['when ip address is not full', '192.168', [{ area_type: 'lan', ipaddr: '192.168', netmask: '255.255.255.0' }], ['192.168.0.0', '192.168.0.255'], false, { isValid: true }]
  ])('returns ip and netmask validation results when %s', (text, ipToValidate, interfaces, ipRange, inRange, expected) => {
    const testMocks = {
      $store: {
        isAccessPoint: false
      }
    }
    const testFormOptions = {
      ...formOptions,
      interfaces
    }
    const wrapper = createWrapper(OpenVPNEdit, {
      props,
      global: {
        mocks: testMocks,
        provide: {
          formOptions: () => testFormOptions
        }
      }
    })
    ipv4Utils.getIPRange = vi.fn().mockReturnValue(ipRange)
    ipv4Utils.checkIfInRange = vi.fn().mockReturnValue(inRange)
    const result = wrapper.vm.validateRemotePrivateNetwork(ipToValidate)
    expect(result).toEqual(expected)
  })
  it.each([
    ['when netmask is not full length', '255.255.0', '192.198.1.1', '', '', { isValid: true }],
    ['when ip is not full length', '255.255.0.0', '192.198.1', '', '', { isValid: true }],
    [
      'when ip doesnt match netmask',
      '255.255.255.255',
      '192.198.1.75',
      ['192.198.1.255'],
      '',
      { isValid: false, message: 'To match specified netmask, "Remote network IP address" should be 192.198.1.255' }
    ],
    ['when ip matches netmask', '255.255.0.0', '192.198.0.0', ['192.198.0.0'], '', { isValid: true }],
    [
      'when netmask is a bitmask out of range',
      '75',
      '192.198.0.0',
      ['192.198.0.0'],
      false,
      { isValid: false, message: 'Must be one of the following values [255.255.255.0, 255.255.0.0, 255.0.0.0, or Range of values must be from 1 to 32' }
    ],
    ['when netmask is a bitmask in range', '25', '192.198.0.0', ['192.198.0.0'], '192.198.0.0', { isValid: true }]
  ])('returns full ip netmask and bitmask validation results %s', (text, netmask, ip, res, res2, response) => {
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    ipv4Utils.getIPRange.mockReturnValue(res)
    wrapper.vm.maskToSubnet = vi.fn()
    wrapper.vm.maskToSubnet.mockReturnValueOnce(res2)
    const test = wrapper.vm.netmaskValidate(netmask, ip)
    expect(test).toEqual(response)
  })
  it('returns validation results when fields are empty ', () => {
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    const test = wrapper.vm.netmaskValidate()
    expect(test).toEqual({ isValid: true })
  })
  const propsServer = {
    section: {
      id: 'test1',
      type: 'server'
    }
  }
  it.each`
    title       | propsData      | result
    ${'server'} | ${propsServer} | ${[['udp', 'UDP'], ['tcp-server', 'TCP'], ['udp4', 'UDP4'], ['tcp4-server', 'TCP4'], ['udp6', 'UDP6'], ['tcp6-server', 'TCP6']]}
    ${'client'} | ${props}       | ${[['udp', 'UDP'], ['tcp-client', 'TCP'], ['udp4', 'UDP4'], ['tcp4-client', 'TCP4'], ['udp6', 'UDP6'], ['tcp6-client', 'TCP6']]}
  `('returns proto options when section type is $title', async ({ propsData, result }) => {
    const section = { id: propsData.section.id }
    const wrapper = createWrapper(OpenVPNEdit, {
      props: { ...propsData, section },
      global: { provide: { formOptions: () => formOptions } }
    })
    wrapper.setData({ vpnData: { openVpn: [propsData.section] } })
    expect(wrapper.vm.protoOptions).toEqual(result)
  })
  it.each`
    code   | res
    ${1}   | ${'Client key is encrypted, please enter decryption password'}
    ${2}   | ${'Incorrect file uploaded'}
    ${3}   | ${'The symbols a-zA-Z0-9._-@/() are allowed for file name'}
    ${5}   | ${'Provided client key password is invalid'}
    ${106} | ${'Maximum number of server instances has been reached'}
    ${42}  | ${'Failed to edit configuration'}
  `('returns error message when code is $code', async ({ code, res }) => {
    const testProps = {
      section: {
        id: 'test1',
        type: 'client',
        enable: '1'
      }
    }
    const wrapper = createWrapper(OpenVPNEdit, {
      props: testProps,
      global: {
        mocks,
        provide: {
          formOptions: () => formOptions
        }
      }
    })
    wrapper.vm.vpnData = {
      openVpn: [
        {
          id: 'test1',
          enable: '1'
        }
      ]
    }
    wrapper.vm.$refs.customUpload.uciSection = { config: 'test' }
    wrapper.vm.$capitalize = () => 'Client'
    wrapper.vm.resetConfig(code)
    const result = wrapper.vm.handleEditErrors({ data: { errors: [{ code }] } })
    expect(result).toEqual(res)
  })
  it.each`
    value            | message
    ${'DES-CBC'}     | ${'This privacy type is not considered secure. Consider using a more secure privacy type, such as AES.'}
    ${'DESX-CBC'}    | ${'This privacy type is not considered secure. Consider using a more secure privacy type, such as AES.'}
    ${'RC2-64-CBC'}  | ${'This privacy type is not considered secure. Consider using a more secure privacy type, such as AES.'}
    ${'AES-128-CBC'} | ${undefined}
  `('returns warning message when cipher is considered not secure', ({ value, message }) => {
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    const res = wrapper.vm.getCipherWarning(value)
    expect(res).toEqual(message)
  })
  it.each`
    value       | message
    ${'md5'}    | ${'This algorithm is not cosidered secure. Consider using a more secure algorithm, such as SHA256.'}
    ${'sha1'}   | ${'This algorithm is not cosidered secure. Consider using a more secure algorithm, such as SHA256.'}
    ${'sha256'} | ${undefined}
    ${'sha384'} | ${undefined}
    ${'sha512'} | ${undefined}
  `('returns warning message when authentication algorithm is considered not secure', ({ value, message }) => {
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    const res = wrapper.vm.getAuthWarning(value)
    expect(res).toEqual(message)
  })
  it.each`
    value                                            | message
    ${['BF-CBC', 'AES-128-CBC']}                     | ${"Cypher 'BF-CBC' is not considered secure. Consider using a more secure cipher, such as AES."}
    ${['AES-128-CBC', 'BF-CBC']}                     | ${"Cypher 'BF-CBC' is not considered secure. Consider using a more secure cipher, such as AES."}
    ${['BF-CBC']}                                    | ${"Cypher 'BF-CBC' is not considered secure. Consider using a more secure cipher, such as AES."}
    ${['AES-128-CBC', 'AES-192-CBC']}                | ${undefined}
    ${['AES-256-CBC']}                               | ${undefined}
    ${['AES-128-GCM', 'AES-192-GCM', 'AES-256-GCM']} | ${undefined}
    ${['CHACHA20-POLY1305']}                         | ${undefined}
    ${['CUSTOM-CIPHER']}                             | ${undefined}
    ${[]}                                            | ${undefined}
  `('returns warning message when data cypher is considered not secure', ({ value, message }) => {
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    const res = wrapper.vm.getDataCypherWarning(value)
    expect(res).toEqual(message)
  })
  it.each([
    [
      [
        {
          message: `It's recommended to use a minimum RSA key length of 2048 bits for the certificate.`,
          source: 'client:ca',
          code: 1
        }
      ],
      `It's recommended to use a minimum RSA key length of 2048 bits for the certificate.`
    ],
    [
      [
        {
          message: `It's recommended to use a minimum RSA key length of 2048 bits for the certificate.`,
          source: 'server:ca',
          code: 1
        }
      ],
      `It's recommended to use a minimum RSA key length of 2048 bits for the certificate.`
    ],
    [
      [
        {
          message: `It's recommended to use a minimum ECC key length of 256 bits for the certificate.`,
          source: 'client:ca',
          code: 2
        }
      ],
      `It's recommended to use a minimum ECC key length of 256 bits for the certificate.`
    ],
    [
      [
        {
          message: `It's recommended to use a minimum ECC key length of 256 bits for the certificate.`,
          source: 'server:ca',
          code: 2
        }
      ],
      `It's recommended to use a minimum ECC key length of 256 bits for the certificate.`
    ],
    [
      [
        {
          message: `It's recommended to use a minimum key length of 2048 bits for the certificate.`,
          source: 'server:ca',
          code: 3
        }
      ],
      `It's recommended to use a minimum key length of 2048 bits for the certificate.`
    ],
    [undefined, undefined]
  ])('should return client uploaded certificates warning message if they are present', (warningMessages, res) => {
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions, warningMessages: () => warningMessages } } })
    wrapper.vm.rsaMessage = "It's recommended to use a minimum RSA key length of 2048 bits for the certificate"
    wrapper.vm.vpnData = {
      openVpn: [
        {
          ca: '/etc/vuci-uploads/cbid.openvpn.tst.caca.crt',
          type: 'client',
          id: 'client'
        },
        {
          ca: '/etc/vuci-uploads/cbid.openvpn.tst.caca.crt',
          type: 'server',
          id: 'server'
        }
      ]
    }
    const result = wrapper.vm.getUploadWarning('/etc/vuci-uploads/cbid.openvpn.tst.caca.crt')
    expect(result).toEqual(res)
  })
})
describe('OpenVPNClientEdit tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockCertificatesStore.getCertificates.mockClear()
    mockCertificatesStore.generatedCertificates = []
    mockCertificatesStore.rawData = { generated: [] }
  })
  const mocks = { $store: { device: 'RUTX09' } }
  const formOptions = {
    interfaces: [],
    networks: [],
    ip6addresses: []
  }
  const props = {
    section: {
      id: 'test1',
      type: 'client'
    }
  }
  beforeEach(() => {
    if (OpenVPNClientEdit.computed) {
      OpenVPNClientEdit.computed.parent = vi.fn(() => 0)
      OpenVPNClientEdit.computed.remoteIpLabel = vi.fn(() => 'Remote IP')
      OpenVPNClientEdit.computed.remoteIpPlaceholder = vi.fn(() => '0.0.0.0')
    }
  })
  it('invokes validate function', () => {
    const data = {
      vuciSection: {
        validate: vi.fn()
      }
    }
    const wrapper = createWrapper(OpenVPNClientEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    wrapper.vm.vpnData = {
      openVpn: [
        {
          type: 'server',
          topology: 'subnet'
        }
      ]
    }
    const spy = vi.spyOn(data.vuciSection, 'validate')
    wrapper.vm.updateValidations(data)
    expect(spy).toHaveBeenCalled()
  })
  it.each([
    ['value is included', 'tls', true],
    ['value isnt include', 'skey', false]
  ])('returns correct value is returned when %s', (text, value, response) => {
    const wrapper = createWrapper(OpenVPNClientEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    const test = wrapper.vm.isOneOf(value, ['tls', 'tls/pass', 'pass'])
    expect(test).toEqual(response)
  })
  it.each`
    interfaces                                                               | isAccessPoint | res
    ${[{ id: 'other', area_type: 'lan' }, { id: 'test', area_type: 'lan' }]} | ${false}      | ${['other', 'test']}
    ${[{ id: 'lan', area_type: 'wan' }, { id: 'test', area_type: 'lan' }]}   | ${false}      | ${['test']}
    ${[{ id: 'lan', area_type: 'wan' }, { id: 'lan', area_type: 'lan' }]}    | ${false}      | ${['lan']}
    ${[{ id: 'lan', area_type: 'lan' }, { id: 'other', area_type: 'lan' }]}  | ${true}       | ${['lan']}
    ${[{ id: 'other', area_type: 'lan' }, { id: 'lan', area_type: 'dmz' }]}  | ${true}       | ${['lan']}
  `('returns interfaceList when isAccessPoint is $isAccessPoint', ({ interfaces, isAccessPoint, res }) => {
    const testFormOptions = {
      interfaces
    }
    const wrapper = createWrapper(OpenVPNClientEdit, {
      props,
      global: {
        mocks,
        provide: {
          formOptions: () => testFormOptions
        }
      }
    })
    wrapper.vm.$store.isAccessPoint = isAccessPoint
    const val = wrapper.vm.interfaceList()
    expect(val).toEqual(res)
  })
  it.each`
    ip                             | ipv6addresses                         | rangeMocks                                                                                                              | expectedResult
    ${'2000::2297:27ff:fe11:fc15'} | ${['2000::/64']}                      | ${[['2000::', '2000::ffff:ffff:ffff:ffff']]}                                                                            | ${{ isValid: false, message: 'Provided IP cannot be in LAN network range' }}
    ${'2000::1'}                   | ${['2000::/64']}                      | ${[['2000::', '2000::ffff:ffff:ffff:ffff']]}                                                                            | ${{ isValid: false, message: 'Provided IP cannot be in LAN network range' }}
    ${'2001:db8::1'}               | ${['2001:db8::/32', '2001:db9::/32']} | ${[['2001:db8::', '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff'], ['2001:db9::', '2001:db9:ffff:ffff:ffff:ffff:ffff:ffff']]} | ${{ isValid: false, message: 'Provided IP cannot be in LAN network range' }}
  `('checks IPv6 range validation', ({ ip, ipv6addresses, rangeMocks, expectedResult }) => {
    const testFormOptions = {
      ip6addresses: ipv6addresses
    }
    const wrapper = createWrapper(OpenVPNClientEdit, { props, global: { mocks, provide: { formOptions: () => testFormOptions } } })
    wrapper.vm.$VuciValidator.ipmask6 = vi.fn().mockReturnValueOnce(expectedResult)
    ipv6Utils.expandIpv6.mockReturnValue(ip)
    ipv6Utils.cidrToRange.mockImplementation(cidr => {
      const cidrIndex = ipv6addresses.indexOf(cidr)
      return rangeMocks[cidrIndex]
    })
    const val = wrapper.vm.checkIPv6Range(ip)
    expect(val).toEqual(expectedResult)
  })
  it('invokes error message when interface status failed to load', async () => {
    const wrapper = createWrapper(OpenVPNEdit, { props, global: { mocks, provide: { formOptions: () => formOptions } } })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulk = vi.fn()
    wrapper.vm.$axios.bulk.mockRejectedValueOnce()
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  const propsData = {
    section: {
      id: 'test1',
      dev: 'tap'
    }
  }
  it.each`
    values                                                                                                      | propsData    | result
    ${[{ type: 'bridge', id: 'br-lan', name: 'br-lan' }]}                                                       | ${propsData} | ${[['br-lan', 'br-lan']]}
    ${[{ type: 'bridge', id: 'br-lan1', name: 'br-lan1' }, { type: 'bridge', id: 'br-lan2', name: 'br-lan2' }]} | ${propsData} | ${[['br-lan1', 'br-lan1'], ['br-lan2', 'br-lan2']]}
    ${[{ type: 'Network device', id: 'wan', name: 'wan' }]}                                                     | ${propsData} | ${[]}
    ${[{ type: 'Network device', id: 'wan', name: 'wan6' }]}                                                    | ${propsData} | ${[]}
    ${[{ type: 'Network device', id: 'mob1s1a1', name: 'mob1s1a1' }]}                                           | ${propsData} | ${[]}
  `('displays bridge items', async ({ values, propsData, result }) => {
    const testFormOptions = {
      networks: values
    }
    const wrapper = createWrapper(OpenVPNEdit, {
      props: propsData,
      global: {
        mocks: {
          $network: {
            getName: i => i.name
          },
          ...mocks
        },
        provide: { formOptions: () => testFormOptions }
      }
    })
    expect(wrapper.vm.bridgeInterfaces).toEqual(result)
  })
  it('displays TPM storage full message when response code is 5', () => {
    const testProps = {
      section: {
        id: 'test1',
        type: 'client'
      }
    }
    const wrapper = createWrapper(OpenVPNEdit, {
      props: testProps,
      global: {
        mocks,
        provide: {
          formOptions: () => formOptions
        }
      }
    })
    const messageSpy = vi.spyOn(wrapper.vm.$message, 'info')
    wrapper.vm.afterSave(null, { messages: [{ code: 5 }] })
    expect(messageSpy).toHaveBeenCalledWith('TPM2 storage is full. The uploaded key could not be moved to TPM2 storage.')
  })
  it('does not display TPM storage message when response code is not 5', () => {
    const testProps = {
      section: {
        id: 'test1',
        type: 'client'
      }
    }
    const wrapper = createWrapper(OpenVPNEdit, {
      props: testProps,
      global: {
        mocks,
        provide: {
          formOptions: () => formOptions
        }
      }
    })
    const messageSpy = vi.spyOn(wrapper.vm.$message, 'info')
    wrapper.vm.afterSave(null, { messages: [{ code: 1 }] })
    expect(messageSpy).not.toHaveBeenCalledWith('TPM2 storage is full. The uploaded key could not be moved to TPM2 storage.')
  })
  describe('GenerateClientConfig tests', () => {
    const mockCertificates = [
      { fullname: 'client.key.pem', cert_type: 'client', type: 'key', path: '/etc/certificates/client.key.pem' },
      { fullname: 'client2.key.pem', cert_type: 'client', type: 'key', path: '/etc/certificates/client2.key.pem' },
      { fullname: 'server.key.pem', cert_type: 'server', type: 'key', path: '/etc/certificates/server.key.pem' },
      { fullname: 'client.cert.pem', cert_type: 'client', type: 'cert', path: '/etc/certificates/client.cert.pem' },
      { fullname: 'client2.cert.pem', cert_type: 'client', type: 'cert', path: '/etc/certificates/client2.cert.pem' },
      { fullname: 'client-import.cert.pem', cert_type: 'import', type: 'cert', path: '/etc/certificates/client-import.cert.pem' },
      { fullname: 'scep-client.cert.pem', cert_type: 'scep', type: 'cert', path: '/etc/certificates/scep-client.cert.pem' },
      { fullname: 'server.cert.pem', cert_type: 'server', type: 'cert', path: '/etc/certificates/server.cert.pem' },
      { fullname: 'ca.cert.pem', cert_type: 'ca', type: 'cert', path: '/etc/certificates/ca.cert.pem' },
      { fullname: 'ca-import.cert.pem', cert_type: 'import', type: 'cert', path: '/etc/certificates/ca-import.cert.pem' },
      { fullname: 'ca-scep.cert.pem', cert_type: 'scep', type: 'cert', path: '/etc/certificates/ca-scep.cert.pem' }
    ]
    const defaultProps = {
      open: true,
      serverId: 'server1',
      missingFields: [],
      certificates: mockCertificates
    }
    beforeEach(() => {
      setActivePinia(createPinia())
    })
    it('filters client key options correctly', () => {
      const wrapper = createWrapper(GenerateClientConfig, { props: defaultProps })
      expect(wrapper.vm.clientKeyOptions).toEqual([
        ['/etc/certificates/client.key.pem', 'client.key.pem'],
        ['/etc/certificates/client2.key.pem', 'client2.key.pem']
      ])
    })
    it('filters client cert options correctly', () => {
      const wrapper = createWrapper(GenerateClientConfig, { props: defaultProps })
      expect(wrapper.vm.clientCertOptions).toEqual([
        ['/etc/certificates/client.cert.pem', 'client.cert.pem'],
        ['/etc/certificates/client2.cert.pem', 'client2.cert.pem'],
        ['/etc/certificates/client-import.cert.pem', 'client-import.cert.pem'],
        ['/etc/certificates/scep-client.cert.pem', 'scep-client.cert.pem'],
        ['/etc/certificates/ca-import.cert.pem', 'ca-import.cert.pem']
      ])
    })
    it('filters CA cert options correctly', () => {
      const wrapper = createWrapper(GenerateClientConfig, { props: defaultProps })
      expect(wrapper.vm.caCertOptions).toEqual([
        ['/etc/certificates/client-import.cert.pem', 'client-import.cert.pem'],
        ['/etc/certificates/ca.cert.pem', 'ca.cert.pem'],
        ['/etc/certificates/ca-import.cert.pem', 'ca-import.cert.pem'],
        ['/etc/certificates/ca-scep.cert.pem', 'ca-scep.cert.pem']
      ])
    })
    it('extracts user options from missingFields error message', () => {
      const props = {
        ...defaultProps,
        missingFields: [
          {
            source: 'user',
            code: 103,
            error: 'Missing required option: user, available options: [none, user2, user, user3]',
            section: 'generate'
          }
        ]
      }
      const wrapper = createWrapper(GenerateClientConfig, { props })
      expect(wrapper.vm.userOptions).toEqual([
        ['none', 'none'],
        ['user2', 'user2'],
        ['user', 'user'],
        ['user3', 'user3']
      ])
    })
    it('returns empty array when no user error in missingFields', () => {
      const props = {
        ...defaultProps,
        missingFields: [{ source: 'remote', code: 103, error: 'Missing required option: remote' }]
      }
      const wrapper = createWrapper(GenerateClientConfig, { props })
      expect(wrapper.vm.userOptions).toEqual([])
    })
    it('returns empty array when missingFields is empty', () => {
      const wrapper = createWrapper(GenerateClientConfig, { props: defaultProps })
      expect(wrapper.vm.userOptions).toEqual([])
    })
    it('handles malformed user error message gracefully', () => {
      const props = {
        ...defaultProps,
        missingFields: [
          {
            source: 'user',
            code: 103,
            error: 'Missing required option: user, but no bracket format',
            section: 'generate'
          }
        ]
      }
      const wrapper = createWrapper(GenerateClientConfig, { props })
      expect(wrapper.vm.userOptions).toEqual([])
    })
    it('returns empty arrays when no certificates provided', () => {
      const wrapper = createWrapper(GenerateClientConfig, {
        props: { ...defaultProps, certificates: [] }
      })
      expect(wrapper.vm.clientKeyOptions).toEqual([])
      expect(wrapper.vm.clientCertOptions).toEqual([])
      expect(wrapper.vm.caCertOptions).toEqual([])
    })
    it('does not fetch WAN IP when remote field is not missing', () => {
      const spy = vi.spyOn(axios, 'get')
      expect(spy).not.toHaveBeenCalled()
    })
    it('fetches WAN IP when remote field is missing', async () => {
      const props = {
        ...defaultProps,
        missingFields: [{ source: 'remote' }]
      }
      const mockData = [{ area_type: 'wan', up: true, ipaddrs: ['192.168.1.1/24'] }]
      axios.get = vi.fn().mockResolvedValue({ data: mockData })
      const wrapper = createWrapper(GenerateClientConfig, { props })
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(wrapper.vm.formData.remote).toBe('192.168.1.1')
    })
    it('shows error message when config generation fails', async () => {
      const wrapper = createWrapper(GenerateClientConfig, { props: defaultProps })
      const message = useMessages()
      const spy = vi.spyOn(message, 'error')
      utils.downloadFileApi = vi.fn().mockRejectedValue(new Error('Failed'))
      await wrapper.vm.generateConfig()
      expect(spy).toHaveBeenCalledWith('Failed to generate configuration')
    })
    it('shows all fields when all are in missingFields', () => {
      const props = {
        ...defaultProps,
        missingFields: [{ source: 'remote' }, { source: 'ca' }, { source: 'cert' }, { source: 'key' }, { source: 'user' }]
      }
      const wrapper = createWrapper(GenerateClientConfig, { props })
      expect(wrapper.vm.missingFields.some(f => f.source === 'remote')).toBe(true)
      expect(wrapper.vm.missingFields.some(f => f.source === 'ca')).toBe(true)
      expect(wrapper.vm.missingFields.some(f => f.source === 'cert')).toBe(true)
      expect(wrapper.vm.missingFields.some(f => f.source === 'key')).toBe(true)
      expect(wrapper.vm.missingFields.some(f => f.source === 'user')).toBe(true)
    })
    it('maps certificate files correctly', () => {
      const wrapper = createWrapper(GenerateClientConfig, { props: defaultProps })
      const files = [
        { fullname: 'test1.pem', path: '/path/to/test1.pem' },
        { fullname: 'test2.pem', path: '/path/to/test2.pem' }
      ]
      const result = wrapper.vm.mapCertificateFiles(files)
      expect(result).toEqual([
        ['/path/to/test1.pem', 'test1.pem'],
        ['/path/to/test2.pem', 'test2.pem']
      ])
    })
  })
})
