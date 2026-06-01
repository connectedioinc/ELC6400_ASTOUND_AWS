import STunnel from '../../src/views/services/STunnel.vue'
import STunnelEdit from '../../src/views/services/STunnelEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('STunnel.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(STunnel)
  })
  it('tests if validation when less than 5 instances created', () => {
    const dataSource = [{ '.type': 'service' }]
    expect(wrapper.vm.onAdd('', dataSource)).toEqual({ valid: true })
  })
  it('tests if validation shows message when more than 5 instances created', () => {
    const dataSource = [{ '.type': 'service' }, { '.type': 'service' }, { '.type': 'service' }, { '.type': 'service' }, { '.type': 'service' }]
    expect(wrapper.vm.onAdd('', dataSource)).toEqual({ valid: false, message: "Can't create more instances. Only 5 Stunnel instances are allowed" })
  })
  it('returns combined accept_host and accept_port', () => {
    const self = {
      uciSection: {
        accept_host: 'localhost',
        accept_port: '80'
      }
    }
    expect(wrapper.vm.displayHost('', self)).toEqual(`${self.uciSection.accept_host}:${self.uciSection.accept_port}`)
    expect(wrapper.vm.displayHost('', { uciSection: {} })).toEqual('Not set')
  })
  it.each([
    ['1', 'Client'],
    ['0', 'Server'],
    ['', 'Not set']
  ])('returns operation mode, when value = %s', (value, res) => {
    const result = wrapper.vm.displayClient(value)
    expect(result).toEqual(res)
  })
  const warning = [{ info: 'Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values' }]
  it.each`
    section                                                                                                   | expected   | missing
    ${{ client: '1', accept_host: '', accept_port: '1234', connect: 'host:1', cert: 'cert', key: 'key' }}     | ${warning} | ${'accept_host'}
    ${{ client: '1', accept_host: 'host', accept_port: '', connect: 'host:1', cert: 'cert', key: 'key' }}     | ${warning} | ${'accept_port'}
    ${{ client: '1', accept_host: 'host', accept_port: '1234', connect: '', cert: 'cert', key: 'key' }}       | ${warning} | ${'connect'}
    ${{ client: '1', accept_host: '', accept_port: '', connect: '', cert: 'cert', key: 'key' }}               | ${warning} | ${['accept_host', 'accept_port', 'connect']}
    ${{ client: '1', accept_host: 'host', accept_port: '1234', connect: 'host:1', cert: 'cert', key: 'key' }} | ${[]}      | ${[]}
    ${{ client: '0', accept_host: 'host', accept_port: '1234', connect: 'host:1', cert: '', key: 'key' }}     | ${warning} | ${'cert'}
    ${{ client: '0', accept_host: 'host', accept_port: '1234', connect: 'host:1', cert: 'cert', key: '' }}    | ${warning} | ${'key'}
    ${{ client: '0', accept_host: 'host', accept_port: '1234', connect: 'host:1', cert: '', key: '' }}        | ${warning} | ${['cert', 'key']}
    ${{ client: '0', accept_host: 'host', accept_port: '1234', connect: 'host:1', cert: 'cert', key: 'key' }} | ${[]}      | ${[]}
    ${{ client: '0', accept_host: '', accept_port: '', connect: '', cert: '', key: '' }}                      | ${warning} | ${['accept_host', 'accept_port', 'connect', 'cert', 'key']}
    ${{ client: '', accept_host: 'host', accept_port: '1234', connect: 'host:1', cert: 'cert', key: 'key' }}  | ${warning} | ${'client'}
    ${{ accept_host: 'host', accept_port: '1234', connect: 'host:1', cert: 'cert', key: 'key' }}              | ${warning} | ${'client'}
  `('tests getEnabledHint: missing values: $missing', ({ section, expected }) => {
    const wrapper = createWrapper(STunnel)
    const result = wrapper.vm.getEnabledHint(section)
    expect(result).toEqual(expected)
  })
})

describe('STunnelEdit.vue', () => {
  const props = {
    section: {
      id: 'stunnel-test'
    }
  }
  it('checks data', () => {
    const wrapper = createWrapper(STunnelEdit, { props })
    expect(wrapper.vm.modeOptions).toEqual([
      ['0', 'Server'],
      ['1', 'Client']
    ])
    expect(wrapper.vm.tlsCipherOptions).toEqual([
      ['none', 'None'],
      ['dhe_rsa', 'Secure'],
      ['custom', 'Custom']
    ])
    expect(wrapper.vm.appProtocolOptions).toEqual([
      ['', 'Not specified'],
      ['connect', 'Connect'],
      ['smtp', 'SMTP']
    ])
    expect(wrapper.vm.connectAuthOptions).toEqual([
      ['basic', 'Basic'],
      ['ntlm', 'NTLM']
    ])
    expect(wrapper.vm.smtpAuthOptions).toEqual([
      ['plain', 'Plain'],
      ['login', 'Login']
    ])
  })
  it.each([
    ['passes', { isValid: false }, 'localhost', { isValid: true }],
    ['passes', { isValid: true }, '192.168.1.1', { isValid: true }],
    ['passes', { isValid: true }, '1.1.1.1', { isValid: true }],
    ['passes', { isValid: true }, '2001:0db8:85a3:0000:0000:8a2e:0370:7334', { isValid: true }],
    [
      'fails',
      { isValid: false },
      '192.168.1.1/24',
      { isValid: false, message: 'One of the following: IPv4 and IPv6 addresses are accepted (e.g., 192.168.1.1. Following words are accepted: localhost).' }
    ],
    ['fails', { isValid: false }, '123', { isValid: false, message: 'One of the following: IPv4 and IPv6 addresses are accepted (e.g., 192.168.1.1. Following words are accepted: localhost).' }]
  ])('return validation result when validateListenIP %s', async (text, data, form, resolve) => {
    const wrapper = createWrapper(STunnelEdit, { props })
    wrapper.vm.$VuciValidator.ipaddr = vi.fn()
    wrapper.vm.$VuciValidator.ipaddr.mockReturnValueOnce(data)
    const val = wrapper.vm.validateListenIP(form)
    expect(val).toEqual(resolve)
  })
  it.each`
    value            | message
    ${'des'}         | ${'This privacy type is not considered secure. Consider using a more secure privacy type, such as AES.'}
    ${'des3'}        | ${'This privacy type is not considered secure. Consider using a more secure privacy type, such as AES.'}
    ${'DESX-CBC'}    | ${'This privacy type is not considered secure. Consider using a more secure privacy type, such as AES.'}
    ${'AES'}         | ${undefined}
    ${'AES-128-CBC'} | ${undefined}
  `('returns warning message when cipher is considered not secure', ({ value, message }) => {
    const wrapper = createWrapper(STunnelEdit, { props })
    const res = wrapper.vm.getCipherWarning(value)
    expect(res).toEqual(message)
  })
  it.each([
    [
      [
        {
          message: `It's recommended to use a minimum RSA key length of 2048 bits for the certificate.`,
          source: 'test:cert',
          code: 1
        }
      ],
      `It's recommended to use a minimum RSA key length of 2048 bits for the certificate.`
    ],
    [
      [
        {
          message: `It's recommended to use a minimum ECC key length of 256 bits for the certificate.`,
          source: 'test:cert',
          code: 2
        }
      ],
      `It's recommended to use a minimum ECC key length of 256 bits for the certificate.`
    ],
    [
      [
        {
          message: `It's recommended to use a minimum key length of 2048 bits for the certificate.`,
          source: 'test:cert',
          code: 3
        }
      ],
      `It's recommended to use a minimum key length of 2048 bits for the certificate.`
    ],
    [undefined, undefined]
  ])('should return uploaded certificates warning message', (warningMessages, res) => {
    const wrapper = createWrapper(STunnelEdit, { props, global: { provide: { warningMessages: () => warningMessages } } })
    wrapper.vm.formData = {
      stunnels: [
        {
          cert: '/etc/vuci-uploads/cbid.stunnel.test.certrsa_server.crt',
          'cert:file_size': 745,
          id: 'test'
        }
      ]
    }
    const resultCert = wrapper.vm.getUploadWarning('/etc/vuci-uploads/cbid.stunnel.test.certrsa_server.crt')
    expect(resultCert).toEqual(res)
  })

  it('displays TPM storage full message when response code is 5', () => {
    const props = {
      section: {
        id: 'test1',
        type: 'client'
      }
    }
    const wrapper = createWrapper(STunnelEdit, { props, global: { provide: { warningMessages: () => [] } } })
    const messageSpy = vi.spyOn(wrapper.vm.$message, 'info')
    wrapper.vm.setWarningMessages = vi.fn()
    wrapper.vm.uploadHandler({ messages: [{ code: 5 }] })
    wrapper.vm.afterSave(null, { messages: [] })
    expect(messageSpy).toHaveBeenCalledWith('TPM2 storage is full. The uploaded key could not be moved to TPM2 storage.')
  })
})
