import StrongSwan from '../../src/views/services/StrongSwan.vue'
import StrongSwanEdit from '../../src/views/services/StrongSwanEdit.vue'
import createWrapper from '@tests/unit/mockFactory'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/utils/ipUtils')

const mockCertificatesStore = {
  getCertificates: vi.fn().mockResolvedValue(),
  generatedCertificates: [],
  rawData: { generated: [] }
}

vi.mock('@/stores/certificates', () => ({
  useCertificatesStore: () => mockCertificatesStore
}))

describe('StrongSwan.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockCertificatesStore.getCertificates.mockClear()
    mockCertificatesStore.generatedCertificates = []
    mockCertificatesStore.rawData = { generated: [] }
  })
  it('returns form options', () => {
    const wrapper = createWrapper(StrongSwan)
    const val = wrapper.vm.getFormOptions()
    expect(val).toEqual({ interfaces: [], clients: [], servers: [], gre: [], certificates: [] })
  })
  it.each([
    ['test', 'showServerConfigModal', 'showLogsModal'],
    ['test', 'showServerConfigModal', 'showLogsModal'],
    ['test', 'showLogsModal', 'showServerConfigModal'],
    ['test', 'showLogsModal', 'showServerConfigModal']
  ])('oepnModal', (itemId, showModal, closedModal) => {
    const wrapper = createWrapper(StrongSwan)
    wrapper.vm.openModal(itemId, showModal)
    expect(wrapper.vm.openedInstance).toEqual(itemId)
    expect(wrapper.vm[showModal]).toEqual(true)
    expect(wrapper.vm[closedModal]).toEqual(false)
  })
  it.each([['showServerConfigModal'], ['showServerConfigModal'], ['showLogsModal'], ['showLogsModal']])('closeModal', showModal => {
    const wrapper = createWrapper(StrongSwan)
    wrapper.vm.closeModal(showModal)
    expect(wrapper.vm[showModal]).toEqual(false)
  })
  it.each([
    ['test', { test: { status: 0 } }, '-'],
    ['test', { test: { status: '1' } }, 'Connected'],
    ['test', { test: { status: '2' } }, 'Up'],
    ['test', { test: { status: '3' } }, 'Down'],
    ['test', { test: { status: '4' } }, 'Disabled'],
    ['test', { test: { status: '0' } }, 'Disconnected']
  ])('displayStatus', (itemName, data, res) => {
    const wrapper = createWrapper(StrongSwan)
    wrapper.vm.ipsecStatus = data
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
  ])('returns correct color for status %s', (itemName, ipsecStatus, expectedColor) => {
    const wrapper = createWrapper(StrongSwan)
    wrapper.vm.ipsecStatus = ipsecStatus
    const color = wrapper.vm.parseStatusColor(ipsecStatus[itemName].status)
    expect(color).toBe(expectedColor)
  })
  it.each([
    ['test', 'local_subnet', { test: { local_subnet: ['192.168.1.1'], remote_subnet: ['192.168.1.3'] } }, '192.168.1.1'],
    ['test', 'local_subnet', { test: { local_subnet: ['192.168.1.1', '192.168.1.2'], remote_subnet: ['192.168.1.3'] } }, 2],
    ['test', 'local_subnet', { test: {} }, '-'],
    ['test', 'remote_subnet', { test: { local_subnet: ['192.168.1.1'], remote_subnet: ['192.168.1.1'] } }, '192.168.1.1'],
    ['test', 'remote_subnet', { test: { local_subnet: ['192.168.1.1'], remote_subnet: ['192.168.1.3', '192.168.1.4'] } }, 2],
    ['test', 'remote_subnet', { test: {} }, '-']
  ])('displayLocalSubnet', (itemName, key, data, res) => {
    const wrapper = createWrapper(StrongSwan)
    wrapper.vm.ipsecStatus = data
    const val = wrapper.vm.displaySubnet(itemName, key)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', 'local_subnet', { test: { remote_subnet: ['192.168.1.1', '192.168.1.2'], local_subnet: ['192.168.1.3'] } }, { hint: [] }],
    ['test', 'local_subnet', { test: { remote_subnet: ['192.168.1.1'], local_subnet: ['192.168.1.2', '192.168.1.3'] } }, { hint: [{ info: '192.168.1.2' }, { info: '192.168.1.3' }] }],
    ['test', 'local_subnet', { test: {} }, { hint: [] }],
    ['test', 'remote_subnet', { test: { remote_subnet: ['192.168.1.1'], local_subnet: ['192.168.1.2', '192.168.1.3'] } }, { hint: [] }],
    ['test', 'remote_subnet', { test: { remote_subnet: ['192.168.1.1', '192.168.1.2'], local_subnet: ['192.168.1.3'] } }, { hint: [{ info: '192.168.1.1' }, { info: '192.168.1.2' }] }],
    ['test', 'remote_subnet', { test: {} }, { hint: [] }]
  ])('displaySubnetHint', (itemName, key, data, res) => {
    const wrapper = createWrapper(StrongSwan)
    wrapper.vm.ipsecStatus = data
    const val = wrapper.vm.displaySubnetHint(itemName, key)
    expect(val).toEqual(res)
  })
  it.each([
    [1, { 1: { logs: '123' } }, 0],
    [1, { 1: { logs: '123\n456\n789\n' } }, 3],
    [1, { 1: { logs: '' } }, '0']
  ])('displayLogs', (itemName, data, res) => {
    const wrapper = createWrapper(StrongSwan)
    wrapper.vm.ipsecStatus = data
    const val = wrapper.vm.displayLogs(itemName)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', { test: { remote_host: '123' } }, '123'],
    ['test', { test: { remote_host: '' } }, '-']
  ])('displayRemoteHost', (itemName, data, res) => {
    const wrapper = createWrapper(StrongSwan)
    wrapper.vm.ipsecStatus = data
    const val = wrapper.vm.displayRemoteHost(itemName)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', { test: { rx: '5000' } }, '5000'],
    ['test', { test: { rx: '50' } }, '50'],
    ['test', { test: { rx: '' } }, '']
  ])('displayRx', (itemName, data, res) => {
    const wrapper = createWrapper(StrongSwan)
    wrapper.vm.ipsecStatus = data
    const val = wrapper.vm.displayRx(itemName)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', { test: { tx: '5000' } }, '5000'],
    ['test', { test: { tx: '50' } }, '50'],
    ['test', { test: { tx: '' } }, '']
  ])('displayTx', (itemName, data, res) => {
    const wrapper = createWrapper(StrongSwan)
    wrapper.vm.ipsecStatus = data
    const val = wrapper.vm.displayTx(itemName)
    expect(val).toEqual(res)
  })

  it.each([
    ['test', { test: { type: 'test' } }, 'test'],
    ['test', { test: { type: '' } }, '-']
  ])('displayTx', (itemName, data, res) => {
    const wrapper = createWrapper(StrongSwan)
    wrapper.vm.ipsecStatus = data
    const val = wrapper.vm.displayType(itemName)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', { test: { keyexchange: 'test' } }, 'test'],
    ['test', { test: { keyexchange: '' } }, '-']
  ])('displayKeyExchange', (itemName, data, res) => {
    const wrapper = createWrapper(StrongSwan)
    wrapper.vm.ipsecStatus = data
    const val = wrapper.vm.displayKeyExchange(itemName)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', { test: { uptime: 'test' } }, 'test'],
    ['test', { test: { uptime: '' } }, '-']
  ])('displayUptime', (itemName, data, res) => {
    const wrapper = createWrapper(StrongSwan)
    wrapper.vm.ipsecStatus = data
    const val = wrapper.vm.displayUptime(itemName)
    expect(val).toEqual(res)
  })
  it.each([
    ['test', { test: { clients_conected: 0, clients_all: 0 } }, '-'],
    ['test', { test: { clients_conected: 1, clients_all: 0 } }, '1/0'],
    ['test', { test: { clients_conected: 0, clients_all: 1 } }, '0/1'],
    ['test', { test: { clients_conected: 1, clients_all: 1 } }, '1/1']
  ])('displayClients', (itemName, data, res) => {
    const wrapper = createWrapper(StrongSwan)
    wrapper.vm.ipsecStatus = data
    const val = wrapper.vm.displayClients(itemName)
    expect(val).toEqual(res)
  })
  it.each`
    result   | service
    ${false} | ${'notDMVPN'}
    ${true}  | ${'dmvpn'}
  `('returns $result when checking if instance exists', ({ result, service }) => {
    const wrapper = createWrapper(StrongSwan)
    const s = { service }
    const val = wrapper.vm.isChildOfDMVPN(s)
    expect(val).toEqual(result)
  })
  it.each`
    result                                                                                    | service
    ${[]}                                                                                     | ${'notDMVPN'}
    ${[{ info: "This instance can't be deleted because it is part of DMVPN configuration" }]} | ${'dmvpn'}
  `('returns delete button hints', ({ result, service }) => {
    const wrapper = createWrapper(StrongSwan)
    const s = { service }
    const val = wrapper.vm.deleteHints(s)
    expect(val).toEqual(result)
  })
  it.each([
    [[{ id: 'icp1' }, { id: 'icp2' }], { id: 'icp1' }, [{ id: 'icp2' }], []],
    [[{ id: 'icp1' }, { id: 'icp2' }, { id: 'icp3' }], { id: 'icp3' }, [{ id: 'icp1' }, { id: 'icp2' }], []],
    [[{ id: 'icp1' }, { id: 'icp2' }, { id: 'icp3' }], { id: 'icp3' }, [{ id: 'icp1' }, { id: 'icp2' }], [{ id: 'abc' }]]
  ])('checks if after delete global secrets are updated', async (ipsecConnectionProposalData, section, ipsecConnectionProposalRes, secretsRes) => {
    const wrapper = createWrapper(StrongSwan)
    const uciData = { 'ipsec-connection-proposal': ipsecConnectionProposalData }
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce({ success: true, data: secretsRes })
    await wrapper.vm.afterDelete(section, uciData)
    expect(uciData).toEqual({ 'ipsec-connection-proposal': ipsecConnectionProposalRes, secrets: secretsRes })
  })

  it.each([
    [
      {
        ipsec: {}
      },
      {
        id: 'ipsec'
      },
      {
        item: {
          id: 'ipsec'
        },
        columns: [
          [
            { label: 'Status', value: '-', class: 'disabled' },
            { label: 'Local subnet', value: '-', hint: { hint: [] } },
            { label: 'Remote subnet', value: '-', hint: { hint: [] } }
          ],
          [
            { label: 'Remote host', value: '-' },
            { label: 'Active clients', value: '-', onClick: expect.any(Function) },
            { label: 'Logs', value: '0', onClick: expect.any(Function) }
          ],
          [
            { label: 'Uptime', value: '-' },
            { label: 'RX', value: '0 B' },
            { label: 'TX', value: '0 B' }
          ],
          [
            { label: 'Type', value: '-' },
            { label: 'Key exchange', value: '-' }
          ]
        ]
      }
    ],
    [
      {
        ipsec: {
          tx: '10',
          rx: '1000',
          clients_conected: '1',
          status: '1',
          clients_all: '2',
          peers: [],
          remote_subnet: ['test1'],
          local_subnet: ['test1', 'test2']
        }
      },
      {
        id: 'ipsec'
      },
      {
        item: {
          id: 'ipsec'
        },
        columns: [
          [
            { label: 'Status', value: 'Connected', class: 'success' },
            { label: 'Local subnet', value: 2, hint: { hint: [{ info: 'test1' }, { info: 'test2' }] } },
            { label: 'Remote subnet', value: 'test1', hint: { hint: [] } }
          ],
          [
            { label: 'Remote host', value: '-' },
            { label: 'Active clients', value: '1/2', onClick: expect.any(Function) },
            { label: 'Logs', value: '0', onClick: expect.any(Function) }
          ],
          [
            { label: 'Uptime', value: '-' },
            { label: 'RX', value: '1000 B' },
            { label: 'TX', value: '10 B' }
          ],
          [
            { label: 'Type', value: '-' },
            { label: 'Key exchange', value: '-' }
          ]
        ]
      }
    ]
  ])('returns ipsecCols', async (statusData, value, result) => {
    const wrapper = createWrapper(StrongSwan)
    wrapper.vm.ipsecStatus = statusData
    const val = await wrapper.vm.ipsecCols(value)
    expect(val).toEqual(result)
  })
  it('loads ipsec status', async () => {
    const data = {
      success: true,
      data: {
        test: {
          tx: '0',
          rx: '0',
          clients_conected: '0',
          status: '3',
          clients_all: '0',
          peers: []
        }
      }
    }
    const wrapper = createWrapper(StrongSwan)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce(data)
    await wrapper.vm.checkStatus()
    expect(wrapper.vm.ipsecStatus).toEqual({
      test: {
        tx: '0',
        rx: '0',
        clients_conected: '0',
        status: '3',
        clients_all: '0',
        peers: []
      }
    })
  })
  it('invokes error message when IPsec status failed to load', async () => {
    const wrapper = createWrapper(StrongSwan)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce({})
    await wrapper.vm.checkStatus()
    expect(spy).toHaveBeenCalledWith('Failed to load IPsec status data')
  })
})

describe('StrongSwanEdit.vue', () => {
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
    clients: [],
    servers: [],
    gre: [],
    certificates: certificatesData
  }
  beforeEach(() => {
    setActivePinia(createPinia())
    mockCertificatesStore.getCertificates.mockClear()
    mockCertificatesStore.generatedCertificates = certificatesData
    mockCertificatesStore.rawData = { generated: certificatesData }
  })
  const props = {
    section: {
      id: 'test1'
    }
  }
  const other = {
    section: {
      id: 'test1',
      authentication_method: 'x509'
    }
  }
  const instanceTabs = [
    { name: 'general', title: 'General settings' },
    { show: false, name: 'advanced', title: 'Advanced settings' }
  ]
  const instanceTabsTrue = [
    { name: 'general', title: 'General settings' },
    { show: true, name: 'advanced', title: 'Advanced settings' }
  ]
  it.each([
    ['theres no auth method', props, instanceTabs],
    ['auth method is x509', other, instanceTabsTrue]
  ])('loads instance tabs when %s', (text, data, resolve) => {
    const wrapper = createWrapper(StrongSwanEdit, { props: data, global: { provide: { formOptions: () => formOptions } } })
    const val = wrapper.vm.instanceTabs
    expect(val).toEqual(resolve)
  })
  it.each([
    ['there are correct interfaces', [{ id: 'loopback' }, { id: 'test2' }, { id: 'test' }], ['test2', 'test']],
    ['there are no interfaces', [], []]
  ])('loads interface list when %s', (text, data, resolve) => {
    const testFormOptions = { ...formOptions, interfaces: data }
    const wrapper = createWrapper(StrongSwanEdit, { props, global: { provide: { formOptions: () => testFormOptions } } })
    const val = wrapper.vm.interfaceOptions
    expect(val).toEqual(resolve)
  })
  it.each([
    [
      'there are correct interfaces',
      { clients: [{ id: 'client', description: 'clientname' }], servers: [{ id: 'server', description: 'servername' }], gre: [{ id: 'gre', description: 'gre' }] },
      [
        ['', 'None'],
        ['client', 'clientname (L2TP)'],
        ['server', 'servername (L2TP)'],
        ['gre', 'gre (GRE)']
      ]
    ],
    ['there are no interfaces', { clients: [], servers: [], gre: [] }, [['', 'None']]]
  ])('loads interface list when %s', (text, data, resolve) => {
    const testFormOptions = {
      ...formOptions,
      clients: data.clients,
      servers: data.servers,
      gre: data.gre
    }
    const wrapper = createWrapper(StrongSwanEdit, { props, global: { provide: { formOptions: () => testFormOptions } } })
    const val = wrapper.vm.bindOptions
    expect(val).toEqual(resolve)
  })
  it.each([
    ['passes', { isValid: true }, '%config', { isValid: true }],
    [
      'fails',
      { isValid: false },
      '%conf',
      { isValid: false, message: 'One of the following: - IPv4 and IPv6 addresses or subnets are accepted (e.g., 192.168.1.1 .- Following words are accepted: %config, %config4, %config6).' }
    ]
  ])('return validation result when local ip validation %s', async (text, data, form, resolve) => {
    const wrapper = createWrapper(StrongSwanEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.$VuciValidator.ipaddr = vi.fn()
    wrapper.vm.$VuciValidator.ipaddr.mockReturnValueOnce(data)
    wrapper.vm.$VuciValidator.subnet4 = vi.fn()
    wrapper.vm.$VuciValidator.subnet4.mockReturnValueOnce(data)
    const val = wrapper.vm.validateLocalIP(form)
    expect(val).toEqual(resolve)
  })
  it.each([
    ['passes', { isValid: true }, '%config', { isValid: true }],
    [
      'fails',
      { isValid: false },
      '%conf',
      {
        isValid: false,
        message:
          'One of the following: IPv4 and IPv6 range of IP addresses are accepted. IPv4 and IPv6 addresses with mask prefix are accepted (e.g., 192.168.1.0/24. Following words are accepted: %config, %poolname)'
      }
    ]
  ])('return validation result when remote ip validation %s', async (text, data, form, resolve) => {
    const wrapper = createWrapper(StrongSwanEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.$VuciValidator.subnet = vi.fn()
    wrapper.vm.$VuciValidator.subnet.mockReturnValueOnce(data)
    const val = wrapper.vm.validateRemoteIP(form)
    expect(val).toEqual(resolve)
  })
  const wrapper = createWrapper(StrongSwanEdit, { props, global: { provide: { formOptions: () => formOptions } } })
  it.each([
    ['passes', { isValid: true }, 'test', { isValid: true }],
    ['passes', { isValid: true }, '1!@#$%^&*()_+{}:|<>?/*-+.', { isValid: true }],
    ['fails', { isValid: false }, 'test"', { isValid: false, message: 'All characters are accepted except " and \\.' }],
    ['fails', { isValid: false }, '"', { isValid: false, message: 'All characters are accepted except " and \\.' }],
    ['fails', { isValid: false }, '\\', { isValid: false, message: 'All characters are accepted except " and \\.' }]
  ])('validateIdentifier  %s', async (text, data, val, resolve) => {
    const wrapper = createWrapper(StrongSwanEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    const result = wrapper.vm.validateIdentifier(val)
    expect(result).toEqual(resolve)
  })
  it.each([
    ['passes', { isValid: true }, '%config', { isValid: true }],
    ['fails', { isValid: false }, '%conf', { isValid: false, message: 'One of the following: IPv4 or IPv6 addresses/subnets are accepted.' }]
  ])('return validation result for passthrough validation %s', async (text, data, form, resolve) => {
    wrapper.vm.$VuciValidator.subnet6 = vi.fn()
    wrapper.vm.$VuciValidator.subnet6.mockReturnValueOnce(data)
    wrapper.vm.$VuciValidator.subnet4 = vi.fn()
    wrapper.vm.$VuciValidator.subnet4.mockReturnValueOnce(data)
    const val = wrapper.vm.validatePassthrough(form)
    expect(val).toEqual(resolve)
  })
  it.each`
    text        | irange                | form             | resolve
    ${'fails'}  | ${{ isValid: false }} | ${'29s'}         | ${{ isValid: false, message: 'Accepted values between ranges: 30s - 500515200s, 1m - 8341920m, 1h - 139032h, 1d - 5793d' }}
    ${'passes'} | ${{ isValid: true }}  | ${'30s'}         | ${{ isValid: true }}
    ${'fails'}  | ${{ isValid: false }} | ${'0m'}          | ${{ isValid: false, message: 'Accepted values between ranges: 30s - 500515200s, 1m - 8341920m, 1h - 139032h, 1d - 5793d' }}
    ${'passes'} | ${{ isValid: true }}  | ${'8341920m'}    | ${{ isValid: true }}
    ${'fails'}  | ${{ isValid: false }} | ${'8341921m'}    | ${{ isValid: false, message: 'Accepted values between ranges: 30s - 500515200s, 1m - 8341920m, 1h - 139032h, 1d - 5793d' }}
    ${'fails'}  | ${{ isValid: false }} | ${'0h'}          | ${{ isValid: false, message: 'Accepted values between ranges: 30s - 500515200s, 1m - 8341920m, 1h - 139032h, 1d - 5793d' }}
    ${'passes'} | ${{ isValid: true }}  | ${'1h'}          | ${{ isValid: true }}
    ${'passes'} | ${{ isValid: true }}  | ${'139032h'}     | ${{ isValid: true }}
    ${'fails'}  | ${{ isValid: false }} | ${'139033h'}     | ${{ isValid: false, message: 'Accepted values between ranges: 30s - 500515200s, 1m - 8341920m, 1h - 139032h, 1d - 5793d' }}
    ${'fails'}  | ${{ isValid: false }} | ${'0s'}          | ${{ isValid: false, message: 'Accepted values between ranges: 30s - 500515200s, 1m - 8341920m, 1h - 139032h, 1d - 5793d' }}
    ${'fails'}  | ${{ isValid: false }} | ${'1s'}          | ${{ isValid: false, message: 'Accepted values between ranges: 30s - 500515200s, 1m - 8341920m, 1h - 139032h, 1d - 5793d' }}
    ${'fails'}  | ${{ isValid: false }} | ${'29s'}         | ${{ isValid: false, message: 'Accepted values between ranges: 30s - 500515200s, 1m - 8341920m, 1h - 139032h, 1d - 5793d' }}
    ${'passes'} | ${{ isValid: true }}  | ${'30s'}         | ${{ isValid: true }}
    ${'passes'} | ${{ isValid: true }}  | ${'500515200s'}  | ${{ isValid: true }}
    ${'fails'}  | ${{ isValid: false }} | ${'500515201s'}  | ${{ isValid: false, message: 'Accepted values between ranges: 30s - 500515200s, 1m - 8341920m, 1h - 139032h, 1d - 5793d' }}
    ${'fails'}  | ${{ isValid: false }} | ${'30abc'}       | ${{ isValid: false, message: 'Full number with s, m, h or d is accepted' }}
    ${'fails'}  | ${{ isValid: false }} | ${'29'}          | ${{ isValid: false, message: 'Full number with s, m, h or d is accepted' }}
    ${'fails'}  | ${{ isValid: false }} | ${'029s'}        | ${{ isValid: false, message: 'Accepted values between ranges: 30s - 500515200s, 1m - 8341920m, 1h - 139032h, 1d - 5793d' }}
    ${'fails'}  | ${{ isValid: false }} | ${'08341920m'}   | ${{ isValid: false, message: 'Accepted values between ranges: 30s - 500515200s, 1m - 8341920m, 1h - 139032h, 1d - 5793d' }}
    ${'fails'}  | ${{ isValid: false }} | ${'0139032h'}    | ${{ isValid: false, message: 'Accepted values between ranges: 30s - 500515200s, 1m - 8341920m, 1h - 139032h, 1d - 5793d' }}
    ${'fails'}  | ${{ isValid: false }} | ${'0500515200s'} | ${{ isValid: false, message: 'Accepted values between ranges: 30s - 500515200s, 1m - 8341920m, 1h - 139032h, 1d - 5793d' }}
  `('return validation result for lifetime validation $text $form', async ({ irange, form, resolve }) => {
    const wrapper = createWrapper(StrongSwanEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.$VuciValidator.irange = vi.fn()
    wrapper.vm.$VuciValidator.irange.mockReturnValueOnce(irange)
    const val = wrapper.vm.validateLifetime(form)
    expect(val).toEqual(resolve)
  })
  it.each`
    IPv4                 | result
    ${'192.168.1.1'}     | ${'192168001001'}
    ${'192.168.11.1'}    | ${'192168011001'}
    ${'192.168.1.11'}    | ${'192168001011'}
    ${'1.1.1.1'}         | ${'001001001001'}
    ${'192.168.111.111'} | ${'192168111111'}
  `('splits IPv4 address', ({ IPv4, result }) => {
    const val = wrapper.vm.splitIPv4(IPv4)
    expect(val).toEqual(result)
  })
  it.each`
    IPv4Range                            | result
    ${['192.168.1.1', '192.168.1.1']}    | ${{ isValid: true }}
    ${['192.168.10.1', '192.168.10.10']} | ${{ isValid: true }}
    ${['1.1.1.1', '1.2.3.4']}            | ${{ isValid: true }}
    ${['1.1.1.1', '1.0.1.1']}            | ${{ isValid: false, message: 'Range of IPv4 addresses is not valid' }}
    ${['192.168.1.1', '192.168.1.0']}    | ${{ isValid: false, message: 'Range of IPv4 addresses is not valid' }}
  `('checks IPv4 range', ({ IPv4Range, result }) => {
    const val = wrapper.vm.checkIPv4Range(IPv4Range)
    expect(val).toEqual(result)
  })
  it.each`
    IPv6Range                                                                               | parsedData                                                                                                          | result
    ${['::', '::1111']}                                                                     | ${[[0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 4369]]}                                                          | ${{ isValid: true }}
    ${['2001:db6:3333:4444:5555:6666:7777:8888', '2001:db7:3333:4444:5555:6666:7777:8888']} | ${[[8193, 3510, 13107, 17476, 21845, 26214, 30583, 34952], [8193, 3511, 13107, 17476, 21845, 26214, 30583, 34952]]} | ${{ isValid: true }}
    ${['::5555:6666:7777:8888', '::4444:5555:6666:7777:8888']}                              | ${[[0, 0, 0, 0, 21845, 26214, 30583, 34952], [0, 0, 0, 17476, 21845, 26214, 30583, 34952]]}                         | ${{ isValid: true }}
    ${['2001:db8:3333:4444:5555:6666:7777:8888', '2001:db7:3333:4444:5555:6666:7777:8888']} | ${[[8193, 3512, 13107, 17476, 21845, 26214, 30583, 34952], [8193, 3511, 13107, 17476, 21845, 26214, 30583, 34952]]} | ${{ isValid: false, message: 'Range of IPv6 addresses is not valid' }}
    ${['::1111', '::']}                                                                     | ${[[0, 0, 0, 0, 0, 0, 0, 4369], [0, 0, 0, 0, 0, 0, 0, 0]]}                                                          | ${{ isValid: false, message: 'Range of IPv6 addresses is not valid' }}
    ${['2001:db8:3333:4444:5555:6666:7777:8888', '2001:db7:3333:4444:5555:6666:7777:8888']} | ${[[8193, 3512, 13107, 17476, 21845, 26214, 30583, 34952], [8193, 3511, 13107, 17476, 21845, 26214, 30583, 34952]]} | ${{ isValid: false, message: 'Range of IPv6 addresses is not valid' }}
    ${['::8889', '::8888']}                                                                 | ${[[0, 0, 0, 0, 0, 0, 0, 34953], [0, 0, 0, 0, 0, 0, 0, 34952]]}                                                     | ${{ isValid: false, message: 'Range of IPv6 addresses is not valid' }}
  `('checks IPv6 range', ({ IPv6Range, result }) => {
    const val = wrapper.vm.checkIPv6Range(IPv6Range)
    expect(val).toEqual(result)
  })
  it.each([
    {
      title: 'returns specific error message for TPM key exchange error',
      mockErrors: {
        type: 'edit',
        payload: [
          {
            success: false,
            errors: [
              {
                source: 'key',
                code: 103,
                error: 'cannot use ikev1 key exchange when the private key is in TPM',
                section: 'test'
              }
            ]
          }
        ]
      },
      expected: 'Cannot use IKEv1 key exchange when the private key is in TPM2'
    },
    {
      title: 'returns specific error message for invalid certificate (code 152)',
      mockErrors: {
        type: 'edit',
        payload: [
          {
            success: false,
            errors: [
              {
                source: 'key',
                code: 152,
                value: '/etc/certificates/test.png',
                error: 'Uploaded certificate is not valid',
                section: 'test'
              }
            ]
          }
        ]
      },
      expected: 'Uploaded certificate is not valid'
    },
    {
      title: 'returns default error message for unknown error',
      mockErrors: {
        type: 'edit',
        payload: [
          {
            success: false,
            errors: [
              {
                source: 'key',
                code: 103,
                error: 'test',
                section: 'test'
              }
            ]
          }
        ]
      },
      expected: 'Failed to edit configuration'
    },
    {
      title: 'returns default error message for empty payload',
      mockErrors: {
        type: 'edit',
        payload: []
      },
      expected: 'Failed to edit configuration'
    }
  ])('handleEditErrors $title', ({ mockErrors, expected }) => {
    const wrapper = createWrapper(StrongSwanEdit, {
      props: { section: {} },
      global: {
        provide: {
          formOptions: () => formOptions
        }
      }
    })
    const result = wrapper.vm.handleEditErrors(mockErrors)
    expect(result).toEqual(expected)
  })
  describe('StrongSwanEdit.vue computed props', () => {
    const encryptionOpts = [
      ['3des', '3DES'],
      ['des', 'DES'],
      ['aes128', 'AES 128'],
      ['aes192', 'AES 192'],
      ['aes256', 'AES 256'],
      ['aes128gcm8', 'AES128 GCM8'],
      ['aes192gcm8', 'AES192 GCM8'],
      ['aes256gcm8', 'AES256 GCM8'],
      ['aes128gcm12', 'AES128 GCM12'],
      ['aes192gcm12', 'AES192 GCM12'],
      ['aes256gcm12', 'AES256 GCM12'],
      ['aes128gcm16', 'AES128 GCM16'],
      ['aes192gcm16', 'AES192 GCM16'],
      ['aes256gcm16', 'AES256 GCM16'],
      ['chacha20poly1305', 'ChaCha20 Poly1305']
    ]
    const hashOpts = [
      ['md5', 'MD5'],
      ['sha1', 'SHA1'],
      ['sha256', 'SHA256'],
      ['sha384', 'SHA384'],
      ['sha512', 'SHA512']
    ]
    const diffieOpts = [
      ['modp768', 'MODP768'],
      ['modp1024', 'MODP1024'],
      ['modp1536', 'MODP1536'],
      ['modp2048', 'MODP2048'],
      ['modp3072', 'MODP3072'],
      ['modp4096', 'MODP4096'],
      ['ecp192', 'ECP192'],
      ['ecp224', 'ECP224'],
      ['ecp256', 'ECP256'],
      ['ecp384', 'ECP384'],
      ['ecp521', 'ECP521']
    ]
    beforeEach(() => {
      wrapper.setData({
        encryptionOpts,
        hashOpts,
        diffieOpts
      })
    })
    it('check proposalsPhase1InputProps computed', async () => {
      const wrapper = createWrapper(StrongSwanEdit, { props: { section: {} }, global: { provide: { formOptions: () => formOptions } } })
      await wrapper.setData({
        encryptionOpts,
        hashOpts,
        diffieOpts
      })
      const encryptionAlgorithm = {
        prop: 'encryptionAlgorithm',
        initial: 'aes128',
        options: wrapper.vm.encryptionOpts
      }
      const authentication = {
        prop: 'authentication',
        initial: 'sha1',
        options: wrapper.vm.hashOpts
      }
      const dhGroup = {
        prop: 'dhGroup',
        initial: 'modp1536',
        options: wrapper.vm.diffieOpts
      }
      expect(wrapper.vm.proposalsPhase1InputProps).toEqual([encryptionAlgorithm, authentication, dhGroup])
    })
    it('check proposalsPhase1InputProps2', async () => {
      const wrapper = createWrapper(StrongSwanEdit, { props: { section: {} }, global: { provide: { formOptions: () => formOptions } } })
      await wrapper.setData({
        encryptionOpts,
        hashOpts,
        diffieOpts
      })
      const encryptionAlgorithm = {
        prop: 'encryptionAlgorithm2',
        initial: 'aes128',
        options: wrapper.vm.encryptionOpts
      }
      const hash = {
        prop: 'hash',
        initial: 'sha1',
        options: wrapper.vm.hashOpts
      }
      const pfsGroup = {
        prop: 'pfsGroup',
        initial: 'modp1536',
        options: [...wrapper.vm.diffieOpts, ['no_pfs', 'No PFS']]
      }
      expect(wrapper.vm.proposalsPhase2InputProps).toEqual([encryptionAlgorithm, hash, pfsGroup])
    })
  })
  it.each`
    value                    | isValid  | expectMessage
    ${'test.*.com'}          | ${false} | ${'Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).'}
    ${'a*.myHost.com'}       | ${false} | ${'Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).'}
    ${'a_test_myHost_.com'}  | ${false} | ${'Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).'}
    ${'_a_test_myHost.com'}  | ${false} | ${'Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).'}
    ${'_a_test_myHost.co_m'} | ${false} | ${'Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).'}
    ${'myHost._com'}         | ${false} | ${'Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).'}
    ${'myHost.com_'}         | ${false} | ${'Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).'}
    ${'myHost.co m'}         | ${false} | ${'Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).'}
    ${'!@#$%^&()+'}          | ${false} | ${'Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).'}
    ${'8'}                   | ${false} | ${'Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).'}
    ${'singleword@word.com'} | ${false} | ${'Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).'}
  `('returns isValid: $isValid when value: "$value" when domain name is not valid', ({ value, isValid, expectMessage }) => {
    wrapper.vm.$VuciValidator.hostname = vi.fn()
    wrapper.vm.$VuciValidator.hostname.mockReturnValue({ isValid: false })

    wrapper.vm.$VuciValidator.ipmask = vi.fn()
    wrapper.vm.$VuciValidator.ipmask.mockReturnValue({ isValid: false })

    wrapper.vm.$VuciValidator.ipaddr = vi.fn()
    wrapper.vm.$VuciValidator.ipaddr.mockReturnValue({ isValid: false })
    const result = wrapper.vm.validateDomain(value)

    expect(result.isValid).toBe(isValid)
    expect(result.message).toBe(expectMessage)
  })
  it.each`
    value      | isValid  | expectMessage
    ${'any'}   | ${false} | ${'Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).'}
    ${'any3'}  | ${false} | ${'Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).'}
    ${'any4'}  | ${false} | ${'Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).'}
    ${'any5'}  | ${false} | ${'Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).'}
    ${'any6'}  | ${false} | ${'Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).'}
    ${'%any2'} | ${false} | ${'Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).'}
    ${'%any3'} | ${false} | ${'Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).'}
    ${'%any5'} | ${false} | ${'Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).'}
    ${'%any7'} | ${false} | ${'Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).'}
    ${'%any'}  | ${true}  | ${undefined}
    ${'%any4'} | ${true}  | ${undefined}
    ${'%any6'} | ${true}  | ${undefined}
  `('returns isValid: $isValid when value: "$value" when %any, %any4 or %any6 is valid/not valid', ({ value, isValid, expectMessage }) => {
    const result = wrapper.vm.validateDomain(value)
    expect(result.isValid).toBe(isValid)
    expect(result.message).toBe(expectMessage)
  })
  it.each`
    value                                           | isValid | expectMessage
    ${'test.com'}                                   | ${true} | ${undefined}
    ${'test.testing.com'}                           | ${true} | ${undefined}
    ${'0.0.0.0'}                                    | ${true} | ${undefined}
    ${'192.168.1.1'}                                | ${true} | ${undefined}
    ${'192.168.1.1/24'}                             | ${true} | ${undefined}
    ${'2001:0db8:85a3:0000:0000:8a2e:0370:7334'}    | ${true} | ${undefined}
    ${'test_test.com'}                              | ${true} | ${undefined}
    ${'test-test.com'}                              | ${true} | ${undefined}
    ${'singleword'}                                 | ${true} | ${undefined}
    ${'2001:0db8:85a3:0000:0000:8a2e:0370:7334/24'} | ${true} | ${undefined}
  `('returns isValid: $isValid when value: "$value" when domain name is valid', ({ value, isValid, expectMessage }) => {
    wrapper.vm.$VuciValidator.hostname = vi.fn()
    wrapper.vm.$VuciValidator.hostname.mockReturnValue({ isValid: true, message: '' })

    wrapper.vm.$VuciValidator.ipmask = vi.fn()
    wrapper.vm.$VuciValidator.ipmask.mockReturnValue({ isValid: true, message: '' })

    wrapper.vm.$VuciValidator.ipaddr = vi.fn()
    wrapper.vm.$VuciValidator.ipaddr.mockReturnValue({ isValid: true, message: '' })
    const result = wrapper.vm.validateDomain(value)

    expect(result.isValid).toBe(isValid)
    expect(result.message).toBe(expectMessage)
  })
  it.each`
    secrets                 | res
    ${[{ type: 'rsa' }]}    | ${true}
    ${[{ type: 'pkcs12' }]} | ${true}
    ${[{ type: 'xauth' }]}  | ${false}
  `('computes', ({ secrets, res }) => {
    const wrapper = createWrapper(StrongSwanEdit, { props: { section: {} } })
    wrapper.vm.formData = { secrets }
    expect(wrapper.vm.hasRsaOrPkcs12).toBe(res)
  })
  it.each`
    value              | message
    ${['des,test']}    | ${'This privacy type is not considered secure. Consider using a more secure privacy type, such as AES.'}
    ${['3des,test']}   | ${'This privacy type is not considered secure. Consider using a more secure privacy type, such as AES.'}
    ${['aes', 'test']} | ${undefined}
  `('returns warning message when cipher is considered not secure', ({ value, message }) => {
    const wrapper = createWrapper(StrongSwanEdit, { props: { section: {} } })
    const res = wrapper.vm.getCipherWarning(value)
    expect(res).toEqual(message)
  })
  it.each([
    [
      [
        {
          message: `It's recommended to use a minimum RSA key length of 2048 bits for the certificate.`,
          source: 'test:cacert',
          code: 1
        }
      ],
      `It's recommended to use a minimum RSA key length of 2048 bits for the certificate.`
    ],
    [
      [
        {
          message: `It's recommended to use a minimum ECC key length of 256 bits for the certificate.`,
          source: 'test:cacert',
          code: 2
        }
      ],
      `It's recommended to use a minimum ECC key length of 256 bits for the certificate.`
    ],
    [
      [
        {
          message: `It's recommended to use a minimum key length of 2048 bits for the certificate.`,
          source: 'test:cacert',
          code: 3
        }
      ],
      `It's recommended to use a minimum key length of 2048 bits for the certificate.`
    ],
    [undefined, undefined]
  ])('should return uploaded certificates warning message', (warningMessages, res) => {
    const wrapper = createWrapper(StrongSwanEdit, { props: { section: {} }, global: { provide: { formOptions: () => formOptions, warningMessages: () => warningMessages } } })
    wrapper.vm.formData = {
      ipsec: [
        {
          cacert: '/etc/vuci-uploads/cbid.ipsec.test.cacertca.crt',
          id: 'test'
        }
      ]
    }
    const resultCert = wrapper.vm.getUploadWarning('/etc/vuci-uploads/cbid.ipsec.test.cacertca.crt')
    expect(resultCert).toEqual(res)
  })
  it('returns function that gets error message', () => {
    const errors = {
      1: 'test',
      default: 'default'
    }
    expect(wrapper.vm.handleErrors(errors)({ data: { errors: [{ code: 1 }] } })).toBe('test')
    expect(wrapper.vm.handleErrors(errors)({ data: { errors: [{ code: null }] } })).toBe('default')
  })
})
