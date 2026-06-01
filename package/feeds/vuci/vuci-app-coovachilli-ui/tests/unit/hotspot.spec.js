import Hotspot from '../../src/views/services/HotspotOverview.vue'
import createWrapper from '@tests/unit/mockFactory'

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

describe('Hotspot.vue', () => {
  const badApiData = [
    { success: false },
    { success: false },
    { success: false },
    { success: false },
    { success: false },
    { success: false },
    { success: false },
    { success: false },
    { success: false },
    { success: false },
    { success: false },
    { success: false },
    { success: false },
    { success: false },
    { success: false },
    { success: false },
    { success: false }
  ]
  const apiData = [
    {
      success: true,
      data: ['hotspot users']
    },
    {
      success: true,
      data: ['iface status']
    },
    {
      success: true,
      data: ['hotspot groups']
    },
    {
      success: true,
      data: ['profiles']
    },
    {
      success: true,
      data: { static: ['device info'] }
    },
    {
      success: true,
      data: ['modem']
    },
    {
      success: true,
      data: ['wireless interfaces status']
    },
    {
      success: true,
      data: ['dhcp']
    },
    {
      success: true,
      data: ['system users']
    },
    {
      success: true,
      data: ['wireless interfaces config']
    }
  ]
  it('returns form options', () => {
    const wrapper = createWrapper(Hotspot)
    expect(wrapper.vm.getFormOptions().dhcp).toEqual([])
  })
  it.each([
    [
      'interfaces exist',
      [{ name: 'test', interface: 'test', device: 'test', area_type: 'lan' }],
      [{ wifi_id: 'test', ssid: '1', ifname: '0' }],
      [
        ['test', 'test (test)'],
        ['test', '1 (0)']
      ]
    ],
    ['interface doesnt exist', [{ interface: 'loopback', area_type: 'lan' }], [], []],
    ['ifname doesnt exist', [{ interface: 'loopback', area_type: 'lan' }], [{ wifi_id: 'test', ssid: '1' }], [['test', '1']]]
  ])('returns form options when %s', (text, ifaceStatus, wifiDevices, response) => {
    const wrapper = createWrapper(Hotspot)
    wrapper.vm.ifaceStatuses = ifaceStatus
    wrapper.vm.formOptions = { wifiDevices }
    expect(wrapper.vm.interfaceList()).toEqual(response)
  })
  it('invokes error message', () => {
    const wrapper = createWrapper(Hotspot)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const val = wrapper.vm.displayErrorMessage('users')
    expect(val).toEqual([])
    expect(spy).toHaveBeenCalledWith('Failed to load hotspot user data')
  })
  it.each([
    ['responses are success', apiData, ['system users']],
    ['responses are unsuccessful', badApiData, []]
  ])('loads option data when %s', async (text, data, response) => {
    const wrapper = createWrapper(Hotspot)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(data)
    wrapper.vm.displayErrorMessage = vi.fn()
    wrapper.vm.displayErrorMessage.mockReturnValue([])((wrapper.vm.mapProfiles = vi.fn()))
    wrapper.vm.mapProfiles.mockReturnValue('profiles')
    wrapper.vm.$mobile.modemsOptions = vi.fn()
    wrapper.vm.$mobile.modemsOptions.mockReturnValue('modem')
    await wrapper.vm.loadData()
    expect(wrapper.vm.formOptions.systemUsers).toEqual(response)
  })
  it('invokes error message when request fails', async () => {
    const wrapper = createWrapper(Hotspot)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it.each([
    ['radius', 'External RADIUS'],
    ['test', '-']
  ])('When value is %s mode display value is %s', async (text, result) => {
    const wrapper = createWrapper(Hotspot)
    const value = await wrapper.vm.loadMode(text)
    expect(value).toEqual(result)
  })
  it('Checks if profile list is mapped correctly', async () => {
    const wrapper = createWrapper(Hotspot)
    const profilesData = [{ id: 'default', options: {} }]
    const value = await wrapper.vm.mapProfiles(profilesData)
    expect(value).toEqual({ options: [['default', 'Default']], data: profilesData })
  })
  it('Checks if enable button validation show message when wirelss is disabled ', async () => {
    const self = {
      model: '1',
      uciSection: {
        enabled: '1',
        radiusrequiremessageauth: '0',
        mode: 'radius',
        network: 'wifi1'
      }
    }
    const wrapper = createWrapper(Hotspot)
    wrapper.vm.formData.general = [{ mode: 'local' }]
    wrapper.vm.formOptions.wifiDevices = [{ wifi_id: 'wifi1', status: '0', ssid: 'TEST', id: 'default_test' }]
    wrapper.vm.users = []
    const spyInfo = vi.spyOn(wrapper.vm.$notification, 'info')
    await wrapper.vm.validateEnable(self)
    expect(spyInfo).toHaveBeenCalledWith({
      id: 'disabled_interface',
      title: 'Configure wireless',
      text: `Wireless interface 'TEST' must be enabled before activating hotspot.`,
      action: {
        text: 'Update settings',
        to: `/network/wireless/ssids?edit=default_test`,
        type: 'button'
      }
    })
  })
  it('Checks if enable button validation is correct ', async () => {
    const self = {
      uciSection: {
        enabled: '1',
        radiusrequiremessageauth: '0',
        mode: 'local',
        network: 'wifi1'
      }
    }
    const wrapper = createWrapper(Hotspot)
    wrapper.vm.formOptions.wifiDevices = [{ wifi_id: 'wifi1', status: '1' }]
    wrapper.vm.users = []
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.validateEnable(self)
    expect(spy).toHaveBeenCalledWith('To enable the Hotspot please create at least one user where authentication is set to "Local users".')
  })
  it('Checks if button validation passes', async () => {
    const self = {
      model: '1',
      uciSection: {
        enabled: '1',
        radiusrequiremessageauth: '1',
        mode: 'radius',
        network: 'wifi1'
      }
    }
    const wrapper = createWrapper(Hotspot)
    wrapper.vm.formData.general = [{ mode: 'test' }]
    wrapper.vm.formOptions.wifiDevices = [{ wifi_id: 'wifi1', status: '1' }]
    wrapper.vm.users = [{}]
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const spyInfo = vi.spyOn(wrapper.vm.$notification, 'info')

    await wrapper.vm.validateEnable(self)
    expect(spy).toHaveBeenCalledTimes(0)
    expect(spyInfo).toHaveBeenCalledTimes(0)
  })
  it.each([
    [
      'wifi interfaces and regular interfaces exist',
      { network: 'wifi1', moreif: ['test1', 'test2', 'wifi0'] },
      [
        { wifi_id: 'wifi1', ssid: '1', ifname: 'test2' },
        { wifi_id: 'wifi0', ssid: '0' }
      ],
      ['test1', 'test2', '0', '1 (test2)']
    ],
    ['no interfaces exist', { network: 'test' }, [], ['test']]
  ])('returns current network when %s', (text, instance, wireless, response) => {
    const wrapper = createWrapper(Hotspot)
    wrapper.vm.formData = { general: [instance] }
    wrapper.vm.formOptions = {
      wifiDevices: wireless
    }
    expect(wrapper.vm.network(instance)).toEqual(response)
  })
  it.each([
    [{ data: { errors: [{ code: 5 }] } }, 'Maximum amount of instances has been reached'],
    [{ data: { errors: [{ code: 42 }] } }, 'Failed to create new instance']
  ])('handles create error correctly for %j', (input, expected) => {
    const wrapper = createWrapper(Hotspot)
    const result = wrapper.vm.handleCreateErrors(input)
    expect(result).toBe(expected)
  })
  it.each([
    [{ data: { errors: [{ code: 1 }] } }, 'Hotspot network subnet is already being used by network interface'],
    [{ payload: [{ errors: [{ code: 1 }] }] }, 'Hotspot network subnet is already being used by network interface'],
    [{ data: { errors: [{ code: 42 }] } }, 'An unexpected error occurred']
  ])('handles error correctly for %j', (input, expected) => {
    const wrapper = createWrapper(Hotspot)
    const result = wrapper.vm.handleEditError(input)
    expect(result).toBe(expected)
  })
})
