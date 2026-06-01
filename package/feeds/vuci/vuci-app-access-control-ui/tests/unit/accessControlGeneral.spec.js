import AccessControlGeneral from '../../src/views/system/AccessControlGeneral.vue'
import createWrapper from '@tests/unit/mockFactory'
import { formBus } from '@ui-core/vuci-form'
import { useCertificatesStore } from '@/stores/certificates'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-router', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ path: 'test' })),
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn()
    })
  }
})

const data = {
  formData: {
    webui: [
      {
        cert: '',
        key: '',
        device_files: '0'
      }
    ]
  }
}

describe('AccessControlGeneral.vue', () => {
  let wrapper
  beforeEach(() => {
    setActivePinia(createPinia())
    wrapper = createWrapper(AccessControlGeneral, {
      data: () => data,
      mocks: {
        $store: {
          packages: ['/usr/lib/opkg/info/pamd.control', '/usr/lib/opkg/info/vuci-app-telnet-api.control', '/usr/lib/opkg/info/vuci-app-certificates-ui.control'],
          board: { network: { wan: 'test' } },
          isSwitch: () => false
        }
      }
    })
  })
  it('onAfterSave emits formBus event', () => {
    const spy = vi.spyOn(formBus, 'emit')
    const data = {
      data: {
        listen_http: ['80'],
        listen_https: ['433']
      }
    }
    wrapper.vm.isPortMatching = vi.fn().mockReturnValue(data.data.listen_http, data.data.listen_http)
    wrapper.setData(data)
    wrapper.vm.onAfterSave(data)
    expect(spy).toHaveBeenCalledWith('subscribe-reload')
  })
  it.each([
    { protocol: 'https:', currentPort: '443', currentProtocol: 'https:', newPorts: ['443'], expected: false },
    { protocol: 'https:', currentPort: '443', currentProtocol: 'https:', newPorts: ['444'], expected: true },
    { protocol: 'https:', currentPort: '443', currentProtocol: 'https:', newPorts: ['443', '444'], expected: false },
    { protocol: 'https:', currentPort: '', currentProtocol: 'https:', newPorts: ['443'], expected: false },
    { protocol: 'http:', currentPort: '', currentProtocol: 'https:', newPorts: ['443'], expected: true },
    { protocol: 'http:', currentPort: '80', currentProtocol: 'http:', newPorts: ['80'], expected: false },
    { protocol: 'http:', currentPort: '80', currentProtocol: 'http:', newPorts: ['81'], expected: true },
    { protocol: 'http:', currentPort: '80', currentProtocol: 'http:', newPorts: ['80', '81'], expected: false },
    { protocol: 'http:', currentPort: '', currentProtocol: 'http:', newPorts: ['80'], expected: false },
    { protocol: 'https:', currentPort: '', currentProtocol: 'http:', newPorts: ['80'], expected: true }
  ])('tests isPortAndProtocolMatching', ({ protocol, currentPort, currentProtocol, newPorts, expected }) => {
    window.location = { port: currentPort, protocol: currentProtocol }
    const result = wrapper.vm.isPortAndProtocolMatching(newPorts, protocol)
    expect(result).toBe(expected)
  })
  it.each`
    input               | expected
    ${'127.0.0.1:8080'} | ${'8080'}
    ${'3000'}           | ${'3000'}
    ${'80'}             | ${'80'}
  `('extractPort($input) should return $expected', ({ input, expected }) => {
    const result = wrapper.vm.extractPort(input)
    expect(result).toBe(expected)
  })
  it.each`
    modalServiceId | tableData      | testPort          | expected
    ${'CLI'}       | ${'1000-2000'} | ${'1000'}         | ${true}
    ${'CLI'}       | ${'1000-2000'} | ${'2000'}         | ${true}
    ${'CLI'}       | ${'1000-2000'} | ${'1500'}         | ${true}
    ${'CLI'}       | ${'1000-2000'} | ${'999'}          | ${false}
    ${'CLI'}       | ${'1000-2000'} | ${'2001'}         | ${false}
    ${'CLI'}       | ${'1000-2000'} | ${'host:1500'}    | ${true}
    ${'CLI'}       | ${'1000-2000'} | ${''}             | ${false}
    ${'CLI'}       | ${'1000-2000'} | ${'not-a-number'} | ${false}
  `('isPortInRange($testPort) with $modalServiceId service should return $expected', ({ tableData, testPort, expected }) => {
    wrapper.vm.tableData = [{}, {}, {}, { port: tableData }]
    const result = wrapper.vm.isPortInRange(testPort)
    expect(result).toBe(expected)
  })
  it.each`
    portToCheck | currentConfig                        | self           | expectedValid | expectedMessage
    ${'3000'}   | ${null}                              | ${''}          | ${true}       | ${undefined}
    ${'3000'}   | ${{ val: '3000' }}                   | ${''}          | ${false}      | ${'Port is already in use in current configuration.'}
    ${'3000'}   | ${{ val: '3000' }}                   | ${'3000'}      | ${true}       | ${undefined}
    ${'3000'}   | ${{ val: 'host:3000' }}              | ${''}          | ${false}      | ${'Port is already in use in current configuration.'}
    ${'3000'}   | ${{ val: 'host:3000' }}              | ${'host:3000'} | ${true}       | ${undefined}
    ${'3000'}   | ${{ val: '4000' }}                   | ${''}          | ${true}       | ${undefined}
    ${'3000'}   | ${{ val: ['1000', '2000', '3000'] }} | ${''}          | ${false}      | ${'Port is already in use in current configuration.'}
    ${'3000'}   | ${{ val: ['1000', '2000', '3000'] }} | ${'3000'}      | ${true}       | ${undefined}
    ${'3000'}   | ${{ val: ['1000', '2000', '4000'] }} | ${''}          | ${true}       | ${undefined}
    ${'3000'}   | ${{ val: ['host:3000', '4000'] }}    | ${''}          | ${false}      | ${'Port is already in use in current configuration.'}
    ${'3000'}   | ${{ val: ['host:3000', '4000'] }}    | ${'host:3000'} | ${true}       | ${undefined}
  `(
    'checkExistingPortInConfig($portToCheck, currentConfig, $self) should return {isValid: $expectedValid, message: $expectedMessage}',
    ({ portToCheck, currentConfig, self, expectedValid, expectedMessage }) => {
      const result = wrapper.vm.checkExistingPortInConfig(portToCheck, currentConfig, self)
      expect(result.isValid).toBe(expectedValid)
      expect(result.message).toBe(expectedMessage)
    }
  )
  it.each`
    self                  | filterInterfaces                | expectedValid | expectedMessage
    ${'127.0.0.1'}        | ${['127.0.0.1', '192.168.1.1']} | ${true}       | ${undefined}
    ${'localhost'}        | ${['127.0.0.1', '192.168.1.1']} | ${true}       | ${undefined}
    ${'192.168.1.1:3000'} | ${['127.0.0.1', '192.168.1.1']} | ${true}       | ${undefined}
    ${'10.0.0.1:3000'}    | ${['127.0.0.1', '192.168.1.1']} | ${false}      | ${'Invalid IP address. Must be one of: 127.0.0.1, 192.168.1.1.'}
    ${'invalid:3000'}     | ${['127.0.0.1', '192.168.1.1']} | ${false}      | ${'Invalid IP address. Must be one of: 127.0.0.1, 192.168.1.1.'}
    ${'3000'}             | ${['127.0.0.1', '192.168.1.1']} | ${true}       | ${undefined}
  `('checkIPValidity($self) should return {isValid: $expectedValid, message: $expectedMessage}', ({ self, filterInterfaces, expectedValid, expectedMessage }) => {
    wrapper.vm.filterInterfaces = () => filterInterfaces
    const result = wrapper.vm.checkIPValidity(self)
    expect(result.isValid).toBe(expectedValid)
    expect(result.message).toBe(expectedMessage)
  })
  it.each`
    port           | isPortInRangeResult | expectedValid | expectedMessage
    ${'3000'}      | ${true}             | ${false}      | ${"Value must be outside range of CLI 'Port range'."}
    ${'3000'}      | ${false}            | ${true}       | ${undefined}
    ${'1500'}      | ${true}             | ${false}      | ${"Value must be outside range of CLI 'Port range'."}
    ${'5000'}      | ${false}            | ${true}       | ${undefined}
    ${'host:3000'} | ${true}             | ${false}      | ${"Value must be outside range of CLI 'Port range'."}
    ${'host:5000'} | ${false}            | ${true}       | ${undefined}
    ${''}          | ${false}            | ${true}       | ${undefined}
  `('checkPortRange($port) should return {isValid: $expectedValid, message: $expectedMessage}', ({ port, isPortInRangeResult, expectedValid, expectedMessage }) => {
    wrapper.vm.isPortInRange = () => isPortInRangeResult
    const result = wrapper.vm.checkPortRange(port)
    expect(result.isValid).toBe(expectedValid)
    expect(result.message).toBe(expectedMessage)
  })
  it.each`
    port           | isPortInRangeResult | expectedValid | expectedMessage
    ${'3000'}      | ${true}             | ${false}      | ${"Value must be outside range of CLI 'Port range'."}
    ${'3000'}      | ${false}            | ${true}       | ${undefined}
    ${'1500'}      | ${true}             | ${false}      | ${"Value must be outside range of CLI 'Port range'."}
    ${'5000'}      | ${false}            | ${true}       | ${undefined}
    ${'host:3000'} | ${true}             | ${false}      | ${"Value must be outside range of CLI 'Port range'."}
    ${'host:5000'} | ${false}            | ${true}       | ${undefined}
    ${''}          | ${false}            | ${true}       | ${undefined}
  `('checkPortRange($port) should return {isValid: $expectedValid, message: $expectedMessage}', ({ port, isPortInRangeResult, expectedValid, expectedMessage }) => {
    wrapper.vm.isPortInRange = () => isPortInRangeResult
    const result = wrapper.vm.checkPortRange(port)
    expect(result.isValid).toBe(expectedValid)
    expect(result.message).toBe(expectedMessage)
  })
  it('loads certificates names and checks pam support', async () => {
    const data = {
      formData: {
        webui: [
          {
            cert: '',
            key: '',
            device_files: '0',
            listen_http: '80',
            listen_https: '443'
          }
        ],
        dropbear: [
          {
            enabled: '1',
            wan_access: '1'
          }
        ],
        telnet: [
          {
            enabled: '1',
            wan_access: '1'
          }
        ]
      }
    }
    await wrapper.vm.loadDataHttpHttps(data.formData)
    expect(wrapper.vm.httpPort).toEqual('80')
    expect(wrapper.vm.httpsPort).toEqual('443')
  })
  it('tests uhttpd computed', async () => {
    const certificatesData = {
      generated: [
        { type: 'cert', cert_type: 'server', path: '/etc/certificates/server.cert.pem', fullname: 'server.cert.pem' },
        { type: 'key', cert_type: 'server', path: '/etc/certificates/server.key.pem', fullname: 'server.key.pem' },
        { type: 'cert', cert_type: 'server', path: '/etc/certificates/server_rsa.crt', fullname: 'server_rsa.crt' },
        { type: 'key', cert_type: 'server', path: '/etc/certificates/server_rsa.key', fullname: 'server_rsa.key' }
      ]
    }
    const certificatesStore = useCertificatesStore()
    certificatesStore.rawData = certificatesData
    expect(wrapper.vm.uhttpd).toEqual({
      keys: [
        ['/etc/certificates/server.key.pem', 'server.key.pem'],
        ['/etc/certificates/server_rsa.key', 'server_rsa.key']
      ],
      certs: [
        ['/etc/certificates/server.cert.pem', 'server.cert.pem'],
        ['/etc/certificates/server_rsa.crt', 'server_rsa.crt']
      ]
    })
  })
  it.each`
    modalServiceId | tableData                                                                    | resUciData
    ${'SSH'}       | ${[{ enabled: '1', wan_access: '1', port: '1' }]}                            | ${{ dropbear: [{ enabled: '1', wan_access: '1', port: '1', id: 'general' }], webui: [{ enable_http: '0', http_wan_access: '0', listen_http: '0', enable_https: '0', https_wan_access: '0', listen_https: '0' }], cli: [{ enabled: '0', wan_access: '0', port: '0' }], telnet: [{ enabled: '0', wan_access: '0', port: '0' }] }}
    ${'HTTP'}      | ${[{}, { enable_http: '1', http_wan_access: '1', listen_http: '1' }]}        | ${{ dropbear: [{ enabled: '0', wan_access: '0', port: '0' }], webui: [{ enable_http: '1', http_wan_access: '1', listen_http: '1', enable_https: '0', https_wan_access: '0', listen_https: '0', id: 'general' }], cli: [{ enabled: '0', wan_access: '0', port: '0' }], telnet: [{ enabled: '0', wan_access: '0', port: '0' }] }}
    ${'HTTPS'}     | ${[{}, {}, { enable_https: '1', https_wan_access: '1', listen_https: '1' }]} | ${{ dropbear: [{ enabled: '0', wan_access: '0', port: '0' }], webui: [{ enable_http: '0', http_wan_access: '0', listen_http: '0', enable_https: '1', https_wan_access: '1', listen_https: '1', id: 'general' }], cli: [{ enabled: '0', wan_access: '0', port: '0' }], telnet: [{ enabled: '0', wan_access: '0', port: '0' }] }}
    ${'CLI'}       | ${[{}, {}, {}, { enabled: '1', wan_access: '1', port: '1' }]}                | ${{ dropbear: [{ enabled: '0', wan_access: '0', port: '0' }], webui: [{ enable_http: '0', http_wan_access: '0', listen_http: '0', enable_https: '0', https_wan_access: '0', listen_https: '0' }], cli: [{ enabled: '1', wan_access: '1', port: '1', id: 'general' }], telnet: [{ enabled: '0', wan_access: '0', port: '0' }] }}
    ${'Telnet'}    | ${[{}, {}, {}, {}, { enabled: '1', wan_access: '1', port: '1' }]}            | ${{ dropbear: [{ enabled: '0', wan_access: '0', port: '0' }], webui: [{ enable_http: '0', http_wan_access: '0', listen_http: '0', enable_https: '0', https_wan_access: '0', listen_https: '0' }], cli: [{ enabled: '0', wan_access: '0', port: '0' }], telnet: [{ enabled: '1', wan_access: '1', port: '1', id: 'general' }] }}
  `('tests loadEditedOverviewData', ({ modalServiceId, tableData, resUciData }) => {
    const uciData = {
      dropbear: [{ enabled: '0', wan_access: '0', port: '0' }],
      webui: [{ enable_http: '0', http_wan_access: '0', listen_http: '0', enable_https: '0', https_wan_access: '0', listen_https: '0' }],
      cli: [{ enabled: '0', wan_access: '0', port: '0' }],
      telnet: [{ enabled: '0', wan_access: '0', port: '0' }]
    }
    wrapper.vm.tableData = tableData
    wrapper.vm.modalServiceId = modalServiceId
    wrapper.vm.loadEditedOverviewData(uciData)
    expect(uciData).toEqual(resUciData)
  })
  it.each`
    tableData                                                                                                               | res
    ${[{ wan_access: '1' }, { http_wan_access: '0' }, { https_wan_access: '0' }, { wan_access: '0' }, { wan_access: '0' }]} | ${'Enabling remote SSH access makes your device reachable from WAN, this might pose a security risk, especially if you are using a weak or default user password!'}
    ${[{ wan_access: '0' }, { http_wan_access: '1' }, { https_wan_access: '0' }, { wan_access: '0' }, { wan_access: '0' }]} | ${'Enabling remote HTTP access makes your device reachable from WAN, this might pose a security risk, especially if you are using a weak or default user password!'}
    ${[{ wan_access: '0' }, { http_wan_access: '0' }, { https_wan_access: '1' }, { wan_access: '0' }, { wan_access: '0' }]} | ${'Enabling remote HTTPS access makes your device reachable from WAN, this might pose a security risk, especially if you are using a weak or default user password!'}
    ${[{ wan_access: '0' }, { http_wan_access: '0' }, { https_wan_access: '0' }, { wan_access: '1' }, { wan_access: '0' }]} | ${'Enabling remote CLI access makes your device reachable from WAN, this might pose a security risk, especially if you are using a weak or default user password!'}
    ${[{ wan_access: '0' }, { http_wan_access: '0' }, { https_wan_access: '0' }, { wan_access: '0' }, { wan_access: '1' }]} | ${'Enabling remote Telnet access makes your device reachable from WAN, this might pose a security risk, especially if you are using a weak or default user password!'}
    ${[{ wan_access: '1' }, { http_wan_access: '1' }, { https_wan_access: '1' }, { wan_access: '1' }, { wan_access: '1' }]} | ${'Enabling remote SSH, HTTP, HTTPS, CLI, Telnet access makes your device reachable from WAN, this might pose a security risk, especially if you are using a weak or default user password!'}
  `('test sideWarning', async ({ tableData, res }) => {
    const spy = vi.spyOn(wrapper.vm.$notification, 'info')
    wrapper.vm.tableData = tableData
    await wrapper.vm.sideWarning()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(res)
  })
  it.each`
    tableData                                                                                                               | res
    ${[{ wan_access: '1' }, { http_wan_access: '0' }, { https_wan_access: '0' }, { wan_access: '0' }, { wan_access: '0' }]} | ${['SSH']}
    ${[{ wan_access: '0' }, { http_wan_access: '1' }, { https_wan_access: '0' }, { wan_access: '0' }, { wan_access: '0' }]} | ${['HTTP']}
    ${[{ wan_access: '0' }, { http_wan_access: '0' }, { https_wan_access: '1' }, { wan_access: '0' }, { wan_access: '0' }]} | ${['HTTPS']}
    ${[{ wan_access: '0' }, { http_wan_access: '0' }, { https_wan_access: '0' }, { wan_access: '1' }, { wan_access: '0' }]} | ${['CLI']}
    ${[{ wan_access: '0' }, { http_wan_access: '0' }, { https_wan_access: '0' }, { wan_access: '0' }, { wan_access: '1' }]} | ${['Telnet']}
    ${[{ wan_access: '1' }, { http_wan_access: '1' }, { https_wan_access: '1' }, { wan_access: '1' }, { wan_access: '1' }]} | ${['SSH', 'HTTP', 'HTTPS', 'CLI', 'Telnet']}
  `('test findEnabledRemoteServices', ({ tableData, res }) => {
    wrapper.vm.tableData = tableData
    wrapper.vm.findEnabledRemoteServices()
    expect(wrapper.vm.enabledRemoteServices).toEqual(res)
  })
  it.each([
    [
      '4200-4220',
      '4200',
      'sshPort',
      { isValid: false, message: "Value must be outside range of CLI 'Port range'." },
      ['1', '2', '3', '4'],
      ['80', '443', '192.168.1.1:8080'],
      ['192.168.1.1', '10.0.0.1']
    ],
    [
      '4200-4220',
      '4220',
      'sshPort',
      { isValid: false, message: "Value must be outside range of CLI 'Port range'." },
      ['1', '2', '3', '4'],
      ['80', '443', '192.168.1.1:8080'],
      ['192.168.1.1', '10.0.0.1']
    ],
    [
      '4200-4220',
      '4210',
      'sshPort',
      { isValid: false, message: "Value must be outside range of CLI 'Port range'." },
      ['1', '2', '3', '4'],
      ['80', '443', '192.168.1.1:8080'],
      ['192.168.1.1', '10.0.0.1']
    ],
    [
      '4200-4220',
      '2',
      'sshPort',
      { isValid: false, message: "This value cannot be equal to WebUI 'HTTP port' value(s)." },
      ['1', '2', '3', '4'],
      ['80', '443', '192.168.1.1:8080'],
      ['192.168.1.1', '10.0.0.1']
    ],
    [
      '4200-4220',
      '2',
      'sshPort',
      { isValid: false, message: "This value cannot be equal to WebUI 'HTTP port', WebUI 'HTTPS port', Telnet 'port' value(s)." },
      ['2', '2', '2', '2'],
      ['80', '443', '192.168.1.1:8080'],
      ['192.168.1.1', '10.0.0.1']
    ],
    ['', '80', 'webuiListenHttp', { isValid: true }, ['1', '2', '3', '4'], ['80', '443', '192.168.1.1:8080'], ['192.168.1.1', '10.55.56.16']],
    ['', '192.168.1.1:80', 'webuiListenHttp', { isValid: true }, ['1', '2', '3', '4'], ['443', '192.168.1.1:80', '10.55.56.16:443'], ['192.168.1.1', '10.55.56.16']],
    ['', '8080', 'webuiListenHttp', { isValid: true }, ['1', '2', '3', '4'], ['80', '443', '10.55.56.16:8080'], ['192.168.1.1', '10.55.56.16']],
    [
      '',
      '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65'.split(
        ','
      ),
      'webuiListenHttp',
      { isValid: false, message: 'Maximum allowed number of ports has been reached.' },
      ['1', '2', '3', '4'],
      ['80', '443', '10.55.56.16:8080'],
      ['192.168.1.1', '10.55.56.16']
    ]
  ])('test validatePorts', (cliPortRange, self, name, res, vals, listenPorts, validIPs) => {
    const wrapper = createWrapper(AccessControlGeneral, {
      computed: {
        ports: () => [
          { title: "SSH 'port'", name: 'sshPort', val: vals[0] },
          { title: "WebUI 'HTTP port'", name: 'webuiListenHttp', val: vals[1] },
          { title: "WebUI 'HTTPS port'", name: 'webuiListenHttps', val: vals[2] },
          { title: "Telnet 'port'", name: 'telnetPort', val: vals[3] }
        ]
      }
    })
    wrapper.vm.tableData = [{}, {}, {}, { port: cliPortRange }]
    wrapper.vm.filterInterfaces = () => validIPs
    wrapper.vm.formData = {
      webui: [
        {
          listen_http: [listenPorts[0], listenPorts[2]],
          listen_https: [listenPorts[1]]
        }
      ]
    }
    expect(wrapper.vm.validatePorts(self, name)).toEqual(res)
  })
  it('should show error message on download fail', async () => {
    wrapper.vm.$utils.downloadFileApi = vi.fn()
    wrapper.vm.$utils.downloadFileApi.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.downloadCertificate()
    expect(spy).toHaveBeenCalled()
  })
  it("doesn't show error when request doesn't throw error", async () => {
    wrapper.vm.$utils.downloadFileApi = vi.fn()
    wrapper.vm.$utils.downloadFileApi.mockResolvedValueOnce({ data: {} })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.downloadCertificate()
    expect(spy).not.toHaveBeenCalled()
  })
  it.each`
    certName    | currentCertName         | isExpired | expires       | formattedTime | result
    ${'ca.crt'} | ${'/etc/uhttpd-ca.crt'} | ${false}  | ${1728432000} | ${'7 days'}   | ${'HTTPS certificate expires in 7 days. Note: If you choose to regenerate this certificate, it will be replaced with a new self-signed certificate.'}
    ${'ca.crt'} | ${'/etc/uhttpd-ca.crt'} | ${true}   | ${1725235200} | ${'30 days'}  | ${'Certificate has expired. Note: If you choose to regenerate this certificate, it will be replaced with a new self-signed certificate.'}
    ${'ca.crt'} | ${'server.crt'}         | ${false}  | ${1729036800} | ${'14 days'}  | ${'HTTPS certificate expires in 14 days. Please select another certificate to maintain access.'}
    ${'ca.crt'} | ${'server.crt'}         | ${true}   | ${1727740800} | ${'5 days'}   | ${'Certificate has expired. Please select another certificate to maintain access.'}
    ${'ca.crt'} | ${'/etc/uhttpd-ca.crt'} | ${false}  | ${undefined}  | ${'7 days'}   | ${undefined}
    ${''}       | ${'/etc/uhttpd-ca.crt'} | ${false}  | ${1728432000} | ${'7 days'}   | ${undefined}
  `('certificate expiration warning for $certName', ({ certName, currentCertName, isExpired, expires, formattedTime, result }) => {
    const certificatesStore = useCertificatesStore()
    certificatesStore.httpsCertificate = {
      name: currentCertName,
      isExpired: isExpired,
      expires: expires,
      formattedTime: formattedTime,
      isCustomCertificate: true,
      status: isExpired,
      cert: currentCertName,
      cert_type: 'server'
    }
    const resultWarning = wrapper.vm.getCertExpirationWarning(certName)
    expect(resultWarning).toEqual(result)
  })
  it.each([
    [
      [
        {
          message: `It's recommended to use a minimum RSA key length of 2048 bits for the certificate.`,
          source: 'general:cert',
          code: 1
        }
      ],
      `It's recommended to use a minimum RSA key length of 2048 bits for the certificate.`
    ],
    [
      [
        {
          message: `It's recommended to use a minimum ECC key length of 256 bits for the certificate.`,
          source: 'general:cert',
          code: 2
        }
      ],
      `It's recommended to use a minimum ECC key length of 256 bits for the certificate.`
    ],
    [
      [
        {
          message: `It's recommended to use a minimum key length of 2048 bits for the certificate.`,
          source: 'general:cert',
          code: 3
        }
      ],
      `It's recommended to use a minimum key length of 2048 bits for the certificate.`
    ],
    [undefined, undefined]
  ])('should return uploaded certificates warning message', (warningMessages, res) => {
    wrapper.vm.warningMessages = warningMessages
    wrapper.vm.formData = {
      webui: [
        {
          cert: '/etc/vuci-uploads/cbid.uhttpd.general.certcertificate_1.pem',
          'cert:file_size': 761,
          id: 'general'
        }
      ]
    }
    const resultCert = wrapper.vm.getUploadWarning('/etc/vuci-uploads/cbid.uhttpd.general.certcertificate_1.pem')
    expect(resultCert).toEqual(res)
  })
  it.each`
    pamData                                                                   | result
    ${[{ service: 'sshd', enabled: '1' }]}                                    | ${`Enabled`}
    ${[{ service: 'sshd', enabled: '1' }, { service: 'rpcd', enabled: '1' }]} | ${`Enabled`}
    ${[]}                                                                     | ${`Disabled`}
    ${[{ service: 'rpcd', enabled: '1' }, { service: 'rpcd', enabled: '1' }]} | ${`Disabled`}
    ${[{ service: 'rpcd', enabled: '0' }, { service: 'rpcd', enabled: '0' }]} | ${`Disabled`}
    ${[{ service: 'sshd', enabled: '0' }, { service: 'rpcd', enabled: '0' }]} | ${`Disabled`}
    ${[{ service: 'sshd', enabled: '0' }, { service: 'sshd', enabled: '0' }]} | ${`Disabled`}
    ${[{ service: 'sshd', enabled: '0' }, { service: 'rpcd', enabled: '1' }]} | ${`Disabled`}
  `('tests pamData', ({ pamData, result }) => {
    wrapper.vm.pamData = pamData
    expect(wrapper.vm.sshPamStatus).toBe(result)
  })
  it.each`
    pamData                                                                   | result
    ${[{ service: 'rpcd', enabled: '1' }]}                                    | ${`Enabled`}
    ${[{ service: 'rpcd', enabled: '1' }, { service: 'sshd', enabled: '1' }]} | ${`Enabled`}
    ${[]}                                                                     | ${`Disabled`}
    ${[{ service: 'sshd', enabled: '1' }, { service: 'sshd', enabled: '1' }]} | ${`Disabled`}
    ${[{ service: 'sshd', enabled: '0' }, { service: 'sshd', enabled: '0' }]} | ${`Disabled`}
    ${[{ service: 'rpcd', enabled: '0' }, { service: 'sshd', enabled: '0' }]} | ${`Disabled`}
    ${[{ service: 'rpcd', enabled: '0' }, { service: 'rpcd', enabled: '0' }]} | ${`Disabled`}
    ${[{ service: 'rpcd', enabled: '0' }, { service: 'rpcd', enabled: '1' }]} | ${`Disabled`}
  `('tests httpHttpsPamStatus', ({ pamData, result }) => {
    wrapper.vm.pamData = pamData
    expect(wrapper.vm.httpHttpsPamStatus).toBe(result)
  })
  it.each`
    record      | field             | result
    ${'SSH'}    | ${`enabled`}      | ${[{ id: 'SSH', enabled: '1' }, { id: 'CLI', enabled: '0' }, { id: 'Telnet', enabled: '0' }, { id: 'HTTP', enable_http: '0' }, { id: 'HTTPS', enable_https: '0' }]}
    ${'CLI'}    | ${`enabled`}      | ${[{ id: 'SSH', enabled: '0' }, { id: 'CLI', enabled: '1' }, { id: 'Telnet', enabled: '0' }, { id: 'HTTP', enable_http: '0' }, { id: 'HTTPS', enable_https: '0' }]}
    ${'Telnet'} | ${`enabled`}      | ${[{ id: 'SSH', enabled: '0' }, { id: 'CLI', enabled: '0' }, { id: 'Telnet', enabled: '1' }, { id: 'HTTP', enable_http: '0' }, { id: 'HTTPS', enable_https: '0' }]}
    ${'HTTP'}   | ${`enable_http`}  | ${[{ id: 'SSH', enabled: '0' }, { id: 'CLI', enabled: '0' }, { id: 'Telnet', enabled: '0' }, { id: 'HTTP', enable_http: '1' }, { id: 'HTTPS', enable_https: '0' }]}
    ${'HTTPS'}  | ${`enable_https`} | ${[{ id: 'SSH', enabled: '0' }, { id: 'CLI', enabled: '0' }, { id: 'Telnet', enabled: '0' }, { id: 'HTTP', enable_http: '0' }, { id: 'HTTPS', enable_https: '1' }]}
  `('tests accessChange when all values (local access) are 0', ({ record, field, result }) => {
    const tableData = [
      { id: 'SSH', enabled: '0' },
      { id: 'CLI', enabled: '0' },
      { id: 'Telnet', enabled: '0' },
      { id: 'HTTP', enable_http: '0' },
      { id: 'HTTPS', enable_https: '0' }
    ]
    wrapper.vm.tableData = tableData
    wrapper.vm.accessChange(record, field)
    expect(wrapper.vm.tableData).toEqual(result)
  })
  it.each`
    record      | field             | result
    ${'SSH'}    | ${`enabled`}      | ${[{ id: 'SSH', enabled: '0' }, { id: 'CLI', enabled: '1' }, { id: 'Telnet', enabled: '1' }, { id: 'HTTP', enable_http: '1' }, { id: 'HTTPS', enable_https: '1' }]}
    ${'CLI'}    | ${`enabled`}      | ${[{ id: 'SSH', enabled: '1' }, { id: 'CLI', enabled: '0' }, { id: 'Telnet', enabled: '1' }, { id: 'HTTP', enable_http: '1' }, { id: 'HTTPS', enable_https: '1' }]}
    ${'Telnet'} | ${`enabled`}      | ${[{ id: 'SSH', enabled: '1' }, { id: 'CLI', enabled: '1' }, { id: 'Telnet', enabled: '0' }, { id: 'HTTP', enable_http: '1' }, { id: 'HTTPS', enable_https: '1' }]}
    ${'HTTP'}   | ${`enable_http`}  | ${[{ id: 'SSH', enabled: '1' }, { id: 'CLI', enabled: '1' }, { id: 'Telnet', enabled: '1' }, { id: 'HTTP', enable_http: '0' }, { id: 'HTTPS', enable_https: '1' }]}
    ${'HTTPS'}  | ${`enable_https`} | ${[{ id: 'SSH', enabled: '1' }, { id: 'CLI', enabled: '1' }, { id: 'Telnet', enabled: '1' }, { id: 'HTTP', enable_http: '1' }, { id: 'HTTPS', enable_https: '0' }]}
  `('tests accessChange when all values (local access) are 1', ({ record, field, result }) => {
    const tableData = [
      { id: 'SSH', enabled: '1' },
      { id: 'CLI', enabled: '1' },
      { id: 'Telnet', enabled: '1' },
      { id: 'HTTP', enable_http: '1' },
      { id: 'HTTPS', enable_https: '1' }
    ]
    wrapper.vm.tableData = tableData
    wrapper.vm.accessChange(record, field)
    expect(wrapper.vm.tableData).toEqual(result)
  })
  it.each`
    record     | field             | initialData                                                                                                                                                                              | result                                                                                                                                                                                   | warningCalled
    ${'HTTPS'} | ${`enable_https`} | ${[{ id: 'SSH', enabled: '1' }, { id: 'CLI', enabled: '1' }, { id: 'Telnet', enabled: '1' }, { id: 'HTTP', enable_http: '0' }, { id: 'HTTPS', enable_https: '1', redirect_https: '1' }]} | ${[{ id: 'SSH', enabled: '1' }, { id: 'CLI', enabled: '1' }, { id: 'Telnet', enabled: '1' }, { id: 'HTTP', enable_http: '0' }, { id: 'HTTPS', enable_https: '0', redirect_https: '0' }]} | ${1}
    ${'HTTPS'} | ${`enable_https`} | ${[{ id: 'SSH', enabled: '1' }, { id: 'CLI', enabled: '1' }, { id: 'Telnet', enabled: '1' }, { id: 'HTTP', enable_http: '1' }, { id: 'HTTPS', enable_https: '1', redirect_https: '1' }]} | ${[{ id: 'SSH', enabled: '1' }, { id: 'CLI', enabled: '1' }, { id: 'Telnet', enabled: '1' }, { id: 'HTTP', enable_http: '1' }, { id: 'HTTPS', enable_https: '0', redirect_https: '0' }]} | ${0}
    ${'HTTPS'} | ${`enable_https`} | ${[{ id: 'SSH', enabled: '1' }, { id: 'CLI', enabled: '1' }, { id: 'Telnet', enabled: '1' }, { id: 'HTTP', enable_http: '1' }, { id: 'HTTPS', enable_https: '1', redirect_https: '0' }]} | ${[{ id: 'SSH', enabled: '1' }, { id: 'CLI', enabled: '1' }, { id: 'Telnet', enabled: '1' }, { id: 'HTTP', enable_http: '1' }, { id: 'HTTPS', enable_https: '0', redirect_https: '0' }]} | ${0}
    ${'HTTP'}  | ${`enable_http`}  | ${[{ id: 'SSH', enabled: '1' }, { id: 'CLI', enabled: '1' }, { id: 'Telnet', enabled: '1' }, { id: 'HTTP', enable_http: '1' }, { id: 'HTTPS', enable_https: '0', redirect_https: '1' }]} | ${[{ id: 'SSH', enabled: '1' }, { id: 'CLI', enabled: '1' }, { id: 'Telnet', enabled: '1' }, { id: 'HTTP', enable_http: '0' }, { id: 'HTTPS', enable_https: '0', redirect_https: '1' }]} | ${1}
    ${'CLI'}   | ${`enabled`}      | ${[{ id: 'SSH', enabled: '1' }, { id: 'CLI', enabled: '1' }, { id: 'Telnet', enabled: '1' }, { id: 'HTTP', enable_http: '0' }, { id: 'HTTPS', enable_https: '0', redirect_https: '1' }]} | ${[{ id: 'SSH', enabled: '1' }, { id: 'CLI', enabled: '0' }, { id: 'Telnet', enabled: '1' }, { id: 'HTTP', enable_http: '0' }, { id: 'HTTPS', enable_https: '0', redirect_https: '1' }]} | ${0}
  `('tests accessChange for HTTP/HTTPS specific logic', ({ record, field, initialData, result, warningCalled }) => {
    wrapper.vm.tableData = initialData
    const spy = vi.spyOn(wrapper.vm.$message, 'warning')
    wrapper.vm.accessChange(record, field)
    expect(wrapper.vm.tableData).toEqual(result)
    expect(spy).toHaveBeenCalledTimes(warningCalled)
  })
  it.each`
    type     | resData                                                                                   | result
    ${'SSH'} | ${{ data: { enabled: '1', SSH_field_1: 'test1_changed', SSH_field_2: 'test2_changed' } }} | ${[{ id: 'SSH', enabled: '1', SSH_field_1: 'test1_changed', SSH_field_2: 'test2_changed' }, { id: 'CLI', enabled: '1', CLI_field_1: 'test1', CLI_field_2: 'test2' }, { id: 'Telnet', enabled: '1', Telnet_field_1: 'test1', Telnet_field_2: 'test2' }, { id: 'HTTP', enable_http: '1', HTTP_field_1: 'test1', HTTP_field_2: 'test2' }, { id: 'HTTPS', enable_https: '1', HTTPS_field_1: 'test1', HTTPS_field_2: 'test2' }]}
    ${'SSH'} | ${{ data: { enabled: '1', SSH_field_1: 'test1', SSH_field_2: 'test2_changed' } }}         | ${[{ id: 'SSH', enabled: '1', SSH_field_1: 'test1', SSH_field_2: 'test2_changed' }, { id: 'CLI', enabled: '1', CLI_field_1: 'test1', CLI_field_2: 'test2' }, { id: 'Telnet', enabled: '1', Telnet_field_1: 'test1', Telnet_field_2: 'test2' }, { id: 'HTTP', enable_http: '1', HTTP_field_1: 'test1', HTTP_field_2: 'test2' }, { id: 'HTTPS', enable_https: '1', HTTPS_field_1: 'test1', HTTPS_field_2: 'test2' }]}
    ${'SSH'} | ${{ data: { enabled: '1', SSH_field_1: 'test1', SSH_field_2: 'test2' } }}                 | ${[{ id: 'SSH', enabled: '1', SSH_field_1: 'test1', SSH_field_2: 'test2' }, { id: 'CLI', enabled: '1', CLI_field_1: 'test1', CLI_field_2: 'test2' }, { id: 'Telnet', enabled: '1', Telnet_field_1: 'test1', Telnet_field_2: 'test2' }, { id: 'HTTP', enable_http: '1', HTTP_field_1: 'test1', HTTP_field_2: 'test2' }, { id: 'HTTPS', enable_https: '1', HTTPS_field_1: 'test1', HTTPS_field_2: 'test2' }]}
  `('tests afterSaveUpdate', ({ type, resData, result }) => {
    const tableData = [
      { id: 'SSH', enabled: '1', SSH_field_1: 'test1', SSH_field_2: 'test2' },
      { id: 'CLI', enabled: '1', CLI_field_1: 'test1', CLI_field_2: 'test2' },
      { id: 'Telnet', enabled: '1', Telnet_field_1: 'test1', Telnet_field_2: 'test2' },
      { id: 'HTTP', enable_http: '1', HTTP_field_1: 'test1', HTTP_field_2: 'test2' },
      { id: 'HTTPS', enable_https: '1', HTTPS_field_1: 'test1', HTTPS_field_2: 'test2' }
    ]
    wrapper.vm.tableData = tableData
    wrapper.vm.afterSaveUpdate(type, resData)
    expect(wrapper.vm.tableData).toEqual(result)
    expect(wrapper.vm.showModal).toEqual(false)
  })
  it.each`
    inputData                                                                 | warningCalled
    ${[{ id: 'HTTP', enable_http: '0' }, { id: 'HTTPS', enable_https: '0' }]} | ${1}
    ${[{ id: 'HTTP', enable_http: '0' }, { id: 'HTTPS', enable_https: '1' }]} | ${0}
    ${[{ id: 'HTTP', enable_http: '1' }, { id: 'HTTPS', enable_https: '0' }]} | ${0}
    ${[{ id: 'HTTP', enable_http: '1' }, { id: 'HTTPS', enable_https: '1' }]} | ${0}
    ${{ enable_http: '0', enable_https: '0' }}                                | ${1}
    ${{ enable_http: '0', enable_https: '1' }}                                | ${0}
    ${{ enable_http: '1', enable_https: '0' }}                                | ${0}
    ${{ enable_http: '1', enable_https: '1' }}                                | ${0}
    ${[{ id: 'HTTPS', enable_https: '0' }]}                                   | ${0}
    ${[{ id: 'HTTP', enable_http: '0' }]}                                     | ${0}
    ${[]}                                                                     | ${0}
    ${{}}                                                                     | ${0}
  `('tests showDisableAccessAlert', ({ inputData, warningCalled }) => {
    const spy = vi.spyOn(wrapper.vm.$message, 'warning')
    wrapper.vm.showDisableAccessAlert(inputData)
    expect(spy).toHaveBeenCalledTimes(warningCalled)
  })
  it.each`
    section                                    | warningCalled
    ${{ enable_http: '0', enable_https: '0' }} | ${1}
    ${{ enable_http: '1', enable_https: '0' }} | ${0}
    ${{ enable_http: '0', enable_https: '1' }} | ${0}
    ${{ enable_http: '1', enable_https: '1' }} | ${0}
  `('tests handleHttpAccessChange', ({ section, warningCalled }) => {
    const self = { uciSection: section }
    const spy = vi.spyOn(wrapper.vm.$message, 'warning')
    wrapper.vm.handleHttpAccessChange(self)
    expect(spy).toHaveBeenCalledTimes(warningCalled)
  })
  it.each`
    section                                                         | warningCalled | expectedRedirectHttps
    ${{ enable_https: '0', enable_http: '0', redirect_https: '1' }} | ${1}          | ${'0'}
    ${{ enable_https: '0', enable_http: '1', redirect_https: '1' }} | ${0}          | ${'0'}
    ${{ enable_https: '1', enable_http: '0', redirect_https: '1' }} | ${0}          | ${'1'}
    ${{ enable_https: '1', enable_http: '1', redirect_https: '1' }} | ${0}          | ${'1'}
    ${{ enable_https: '0', enable_http: '0', redirect_https: '0' }} | ${1}          | ${'0'}
    ${{ enable_https: '0', enable_http: '1', redirect_https: '0' }} | ${0}          | ${'0'}
    ${{ enable_https: '1', enable_http: '0', redirect_https: '0' }} | ${0}          | ${'0'}
    ${{ enable_https: '1', enable_http: '1', redirect_https: '0' }} | ${0}          | ${'0'}
  `('tests handleHttpsChange', ({ section, warningCalled, expectedRedirectHttps }) => {
    const self = { uciSection: section }
    const spy = vi.spyOn(wrapper.vm.$message, 'warning')
    wrapper.vm.handleHttpsChange(self)
    expect(spy).toHaveBeenCalledTimes(warningCalled)
    expect(self.uciSection.redirect_https).toBe(expectedRedirectHttps)
  })
  it.each`
    section                                       | expectedEnableHttps
    ${{ redirect_https: '1', enable_https: '0' }} | ${'1'}
    ${{ redirect_https: '1', enable_https: '1' }} | ${'1'}
    ${{ redirect_https: '0', enable_https: '0' }} | ${'0'}
    ${{ redirect_https: '0', enable_https: '1' }} | ${'1'}
  `('tests handleRedirectChange', ({ section, expectedEnableHttps }) => {
    const self = { uciSection: section }
    wrapper.vm.handleRedirectChange(self)
    expect(self.uciSection.enable_https).toBe(expectedEnableHttps)
  })
})
