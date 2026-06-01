import HotspotEdit from '../../src/views/services/HotspotEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

const props = {
  section: {
    landingpage: 'test2',
    network: 'test'
  }
}
const formOptions = {
  wifiDevices: [],
  modems: [],
  users: [],
  hotspotGroups: [],
  ifaceList: [],
  certificates: [],
  system: {},
  profiles: { options: [], data: [] },
  dhcp: [],
  systemUsers: [{ username: undefined, group: 'user' }],
  systemGroups: [{ id: 'user', write: [] }],
  wirelessDevice: []
}
describe('State tests', () => {
  const self = {
    model: 'radius',
    uciSection: { mode: 'test' }
  }
  const incorrectSelf = {
    model: 'test',
    uciSection: { mode: 'test' }
  }
  it.each([
    ['model radius', self, true],
    ['model sso', self, true],
    ['model test', incorrectSelf, false]
  ])('returns radius state when %s', (displayText, text, result) => {
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.changeAuthState(text)
    expect(wrapper.vm.radiusPageState).toEqual(result)
  })
  it.each([
    ['model ext', { model: 'ext' }, true],
    ['model test', 'test', false]
  ])('returns landing page state when %s', (displayText, text, result) => {
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.changeLandingPageState(text)
    expect(wrapper.vm.landingPageState).toEqual(result)
  })
})
describe('Hotspot overview edit', () => {
  it.each([
    ['enabled', true],
    ['disabled', false]
  ])('returns all tabs with show %s or undefined', (_, data) => {
    const wrapper = createWrapper(HotspotEdit, {
      props,
      global: {
        provide: { formOptions: () => ({ ...formOptions, systemUsers: [{ username: 'test', group: data ? 'root' : '' }] }) },
        mocks: {
          $store: {
            username: 'test'
          }
        }
      }
    })
    wrapper.vm.radiusPageState = data
    wrapper.vm.singleSignOnState = data
    wrapper.vm.landingPageState = data
    expect(wrapper.vm.tabs).toEqual([
      { name: 'general', title: 'General' },
      { name: 'advanced', title: 'Advanced' },
      { show: data, name: 'radius', title: 'Radius' },
      { name: 'walledgarden', title: 'Walled garden' },
      { show: data, name: 'uscripts', title: 'User scripts' },
      { show: data, name: 'urlparams', title: 'URL parameters' },
      { show: data, name: 'sso', title: 'Single sign-on' }
    ])
  })
  it('returns additional interfaces', () => {
    const options = {
      ...formOptions,
      ifaceList: () => {
        return [['test'], ['test1']]
      },
      wifiDevices: [{ wifi_id: 'wifi1', ssid: 'TEST' }]
    }
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => options } } })
    wrapper.vm.moreif = ['wifi1']

    expect(wrapper.vm.additionalInterfaces).toEqual([['wifi1', 'TEST'], ['test1']])
  })
  it.each([
    ['user is root', [{ id: 'root', target_write: 'allow', write: ['*'] }], [{ username: 'user', group: 'root' }], true],
    ['user is not root', [{ id: 'test', target_write: 'deny', write: ['fsad'] }], [{ username: 'user', group: 'test' }], false],
    ['user is admin', [{ id: 'admin', target_write: 'deny', write: ['services/hotspot/general/userscripts'] }], [{ username: 'user', group: 'admin' }], false]
  ])('returns user script permission settings when %s', (text, group, user, response) => {
    const options = {
      ...formOptions,
      systemUsers: user,
      systemGroups: group
    }
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => options }, mocks: { $store: { username: 'user' } } } })
    expect(wrapper.vm.userScriptsPermission).toEqual(response)
  })
  it('returns param options', () => {
    const options = {
      ...formOptions,
      system: {
        hostname: 'test',
        fw_version: 'test'
      },
      wifiDevices: [{ ssid: '1' }]
    }
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => options }, mocks: { $session: { username: 'user' } } } })
    expect(wrapper.vm.paramOptions).toEqual([
      ['1', 'SSID: 1'],
      ['test', 'Hostname: test'],
      ['test', 'FW version: test']
    ])
  })
  it.each([
    [
      'when network isnt lan and modems exist',
      'lan2',
      [{}],
      [
        ['local', 'Local users'],
        ['radius', 'Radius'],
        ['mac_auth', 'MAC authentication'],
        ['sso', 'Single sign-on'],
        ['sms_otp', 'SMS OTP']
      ]
    ],
    [
      'when network is lan and modems dont exist',
      'lan',
      [],
      [
        ['local', 'Local users'],
        ['radius', 'Radius'],
        ['mac_auth', 'MAC authentication'],
        ['sso', 'Single sign-on']
      ]
    ]
  ])('returns mode options when %s', (text, network, modems, response) => {
    const options = {
      ...formOptions,
      modems
    }
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => options } } })
    wrapper.vm.formData = {
      general: [{ network }]
    }
    expect(wrapper.vm.modeOptions).toEqual(response)
  })
  it.each`
    landingpage | uamport   | uamlisten          | protocol   | domain      | subdomain      | httpsRedirect | result
    ${'int'}    | ${'3990'} | ${'192.168.2.254'} | ${'http'}  | ${''}       | ${''}          | ${'0'}        | ${'http://192.168.2.254:3990/ssocallback'}
    ${'int'}    | ${'3990'} | ${'192.168.2.254'} | ${'https'} | ${''}       | ${''}          | ${'0'}        | ${'https://192.168.2.254:3990/ssocallback'}
    ${'ext'}    | ${'3990'} | ${'192.168.2.254'} | ${'http'}  | ${'domain'} | ${'subdomain'} | ${'1'}        | ${'https://subdomain.domain/ssocallback'}
    ${'int'}    | ${'3990'} | ${'192.168.2.254'} | ${'https'} | ${'domain'} | ${'subdomain'} | ${'0'}        | ${'https://subdomain.domain/ssocallback'}
    ${'int'}    | ${'3990'} | ${'192.168.2.254'} | ${'http'}  | ${'domain'} | ${'subdomain'} | ${'0'}        | ${'http://subdomain.domain/ssocallback'}
    ${'int'}    | ${''}     | ${''}              | ${'http'}  | ${''}       | ${''}          | ${'0'}        | ${'http://192.168.182.1:3990/ssocallback'}
  `('return correct redirect URI url', ({ landingpage, uamport, uamlisten, protocol, domain, subdomain, httpsRedirect, result }) => {
    props.section = {
      landingpage,
      uamport,
      uamlisten,
      protocol,
      domain,
      subdomain,
      https_redirect: httpsRedirect
    }
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    expect(wrapper.vm.redirectURI).toEqual(result)
  })
  it.each([
    ['scripts is valid', '#!/bin/sh\nfasdfasd\nfasdfasdfasd', { isValid: true }],
    ['scripts are invalid', '#!/bin/shfasdfasd\nfasdfasdfasd', { isValid: false, message: 'File content must start with #!/bin/sh' }]
  ])('returns validation results when %s', (text, data, response) => {
    formOptions.hotspotGroups = data
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    expect(wrapper.vm.validateScripts(data)).toEqual(response)
  })
  it.each([
    ['groups exist', [{ name: 'test' }], ['test']],
    ['groups dont exist', [], [['', 'No groups available']]]
  ])('returns group options when %s', (text, data, response) => {
    formOptions.hotspotGroups = data
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    expect(wrapper.vm.groupOptions).toEqual(response)
  })
  it.each([
    ['they exist', [{ type: 'cert', cert_type: 'ca', path: '/etc/certificates/ca.crt', fullname: 'ca.crt' }], [['/etc/certificates/ca.crt', 'ca.crt']]],
    ['they dont exist', [], []]
  ])('returns certificate list when %s', (text, data, response) => {
    formOptions.certificates = data
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    expect(wrapper.vm.caCertificates).toEqual(response)
  })
  it.each([
    ['they exist', [{ type: 'cert', cert_type: 'server', path: '/etc/certificates/server.crt', fullname: 'server.crt' }], [['/etc/certificates/server.crt', 'server.crt']]],
    ['they dont exist', [], []]
  ])('returns certificate list when %s', (text, data, response) => {
    formOptions.certificates = data
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    expect(wrapper.vm.clientCertificates).toEqual(response)
  })
  it.each([
    ['they exist', [{ type: 'key', path: '/etc/certificates/key.pem', fullname: 'key.pem' }], [['/etc/certificates/key.pem', 'key.pem']]],
    ['they dont exist', [], []]
  ])('returns private key list when %s', (text, data, response) => {
    formOptions.certificates = data
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    expect(wrapper.vm.privateKeys).toEqual(response)
  })
  it.each([
    ['when certificate list is empty', [], []],
    [
      'when certificate list is full',
      [
        { path: '/etc/certificates/test', fullname: 'test' },
        { path: '/etc/certificates/test2', fullname: 'test2' }
      ],
      [
        ['/etc/certificates/test', 'test'],
        ['/etc/certificates/test2', 'test2']
      ]
    ]
  ])('maps certificates %s', (text, data, response) => {
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    const result = wrapper.vm.mapCertificateFiles(data)
    expect(result).toEqual(response)
  })
  it('invokes error message when validation fails', () => {
    const self = {
      uciSection: {
        mode: 'local',
        enabled: '1'
      }
    }
    const options = {
      ...formOptions,
      users: []
    }
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => options } } })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.validateEnable(self)
    expect(spy).toHaveBeenCalledWith('To enable the Hotspot please create at least one user where authentication is set to "Local users".')
  })
  it('passes validation', () => {
    const self = {
      uciSection: {}
    }
    const options = {
      ...formOptions,
      users: [{}]
    }
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => options } } })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.validateEnable(self)
    expect(spy).toHaveBeenCalledTimes(0)
  })
  it('shows warning message when mode is radius and message auth is off', () => {
    const self = {
      uciSection: {
        enabled: '1',
        mode: 'radius',
        radiusrequiremessageauth: '0'
      }
    }
    const options = {
      ...formOptions,
      users: [{}]
    }
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => options } } })
    const spy = vi.spyOn(wrapper.vm.$notification, 'info')
    wrapper.vm.validateEnable(self)
    expect(spy).toHaveBeenCalledTimes(1)
  })
  it('shows warning message when wireless interface is off', () => {
    const self = {
      uciSection: {
        enabled: '1',
        network: 'test'
      }
    }
    formOptions.wifiDevices = [{ status: '0', wifi_id: 'test', ssid: 'TEST', id: 'test_id' }]
    const options = {
      ...formOptions,
      users: [{}]
    }
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => options } } })
    const spy = vi.spyOn(wrapper.vm.$notification, 'info')
    wrapper.vm.validateEnable(self)
    wrapper.vm.showWirelessMessage(self)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({
      id: 'disabled_interface',
      title: 'Configure wireless',
      text: `Wireless interface 'TEST' must be enabled before activating hotspot.`,
      action: {
        text: 'Update settings',
        to: '/network/wireless/ssids?edit=test_id',
        type: 'button'
      }
    })
  })
  it.each([
    ['invalid', 'test\nafsdf\n', { isValid: false, message: 'Domain names are accepted (e.g., example.com).' }],
    ['invalid', 'www.test\n', { isValid: false, message: 'Domain names are accepted (e.g., example.com).' }],
    ['invalid', 'www.test.c\n', { isValid: false, message: 'Domain names are accepted (e.g., example.com).' }],
    ['invalid', 'test.c\n', { isValid: false, message: 'Domain names are accepted (e.g., example.com).' }],
    ['valid', 'test.com\n', { isValid: true }],
    ['valid', 'www.test.com\n', { isValid: true }],
    ['valid', 'www.test.uk\n', { isValid: true }]
  ])('returns %s message', (type, value, expected) => {
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.$VuciValidator.hostname = vi.fn()
    wrapper.vm.$VuciValidator.hostname.mockReturnValue(expected)
    const val = wrapper.vm.validateAddressList(value, self)
    expect(val).toEqual(expected)
  })
  it.each([[[{ id: 'test', enable_dhcpv4: '1', interface: 'test' }], 'Enabling Hotspot instance will disable the DHCP server running on interface "TEST".', 'test']])(
    'invokes interfaces error messages',
    (dhcp, text) => {
      props.section = {
        network: 'test'
      }
      formOptions.dhcp = dhcp
      const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => formOptions } } })
      const res = wrapper.vm.invokeInterfaceErrorMessage()
      expect(res).toEqual(text)
    }
  )
  it('doesnt invoke message', () => {
    props.section = {
      network: 'test'
    }
    formOptions.dhcp = [{ id: 'test5' }]
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    const res = wrapper.vm.invokeInterfaceErrorMessage()
    expect(res).toEqual(undefined)
  })
  it('invokes wireless error messages', () => {
    props.section = {
      network: 'test'
    }
    formOptions.wirelessDevice = [{ wifi_id: 'test', network: 'disable', interface: 'test', ssid: 'test' }]
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    const res = wrapper.vm.invokeWirelessErrorMessage()
    expect(res).toEqual('Enabling Hotspot instance will remove all networks attached to wireless "test" interface.')
  })
  it('doesnt invoke wireless error messages', () => {
    props.section = {
      network: 'test'
    }
    formOptions.wirelessDevice = [{ wifi_id: 'test', interface: 'test', network: undefined }]
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    const spy = vi.spyOn(wrapper.vm.$notification, 'error')
    document.getElementById = vi.fn().mockReturnValue({})
    wrapper.vm.invokeWirelessErrorMessage()
    expect(spy).toHaveBeenCalledTimes(0)
  })
  it.each`
    val                 | errorMsg
    ${'192.168.1.1'}    | ${{ isValid: false, message: 'Netmask must be from 16 to 30' }}
    ${'192.168.1.1/15'} | ${{ isValid: false, message: 'Netmask must be from 16 to 30' }}
    ${'192.168.1.1/16'} | ${{ isValid: true, message: 'Netmask must be from 16 to 30' }}
    ${'192.168.1.1/30'} | ${{ isValid: true, message: 'Netmask must be from 16 to 30' }}
    ${'192.168.1.1/31'} | ${{ isValid: false, message: 'Netmask must be from 16 to 30' }}
  `('tests validateNetworkMask', ({ val, errorMsg }) => {
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    expect(wrapper.vm.validateNetworkMask(val)).toEqual(errorMsg)
  })
  it('shows alert message for auth', async () => {
    const wrapper = createWrapper(HotspotEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    const self = {
      uciSection: {
        mode: 'radius',
        radiusrequiremessageauth: '0',
        enabled: '1'
      }
    }
    const spyInfo = vi.spyOn(wrapper.vm.$notification, 'info')
    await wrapper.vm.showMessageAuth(self)
    expect(spyInfo).toHaveBeenCalledTimes(1)
    expect(spyInfo).toBeCalledWith('RADIUS Protocol under RFC 2865 is susceptible to forgery attacks. We recommend enabling Require Message-Authenticator option in Radius settings.')
  })
  it.each([
    ['1', 'test', '', 'test'],
    ['0', 'test', 'saved', 'saved']
  ])('sets uam domain file to %s when val=%s, defaultBlocklist=%s, savedList=%s', (val, defaultBlocklist, savedList, expected) => {
    const wrapper = createWrapper(HotspotEdit, {
      props,
      global: { provide: { formOptions: () => formOptions } }
    })
    wrapper.vm.defaultBlocklist = defaultBlocklist
    wrapper.vm.savedList = savedList
    const self = {
      uciSection: {
        uamdomainfile: ''
      }
    }
    wrapper.vm.setList(self, val)
    expect(self.uciSection.uamdomainfile).toEqual(expected)
  })
})
