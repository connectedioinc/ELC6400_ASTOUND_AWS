import Interfaces from '../../src/views/network/LanInterfaces.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('LanInterfaces.vue', () => {
  let wrapper
  let interfaceSection
  const mocks = {
    stubs: { InterfaceSection: { template: '<div />' } }
  }
  beforeEach(() => {
    wrapper = createWrapper(Interfaces, { global: { mocks } })
    wrapper.vm.$refs.interfaceSection.formData = { interfaces: [], dhcpData: [] }
    wrapper.vm.$refs.interfaceSection.formOptions = {}
    interfaceSection = wrapper.vm.$refs.interfaceSection
  })

  const interfacesData = [
    { id: 'lan', '.type': 'interface', enabled: '1', ipaddr: '192.168.1.1', netmask: '255.255.255.0', proto: 'static', ifname: ['eth0'] },
    { id: 'wan', '.type': 'interface', ifname: ['eth1'], fwzone: 'wan', enabled: '1', proto: 'dhcp' },
    { id: 'mob1s1a1', '.type': 'interface', enabled: '1', modem: '3-1', sim: '1', proto: 'wwan', apn: 'wap', auto_apn: '1' }
  ]

  it.each`
    proto       | section                                 | data                                                                                                                                                                                     | result
    ${'static'} | ${{ proto: 'static', id: 'testDhcp1' }} | ${[{ id: 'testDhcp1', '.type': 'dhcp', interface: 'testLAN' }, { id: 'testDhcp2', '.type': 'dhcp', interface: 'testWAN' }, { id: 'testDhcp3', '.type': 'dhcp', interface: 'testLAN2' }]} | ${[{ id: 'testDhcp2', '.type': 'dhcp', interface: 'testWAN' }, { id: 'testDhcp3', '.type': 'dhcp', interface: 'testLAN2' }]}
    ${'none'}   | ${{ proto: 'none' }}                    | ${[{ id: 'testDhcp1', '.type': 'dhcp', interface: 'testLAN' }, { id: 'testDhcp2', '.type': 'dhcp', interface: 'testWAN' }, { id: 'testDhcp3', '.type': 'dhcp', interface: 'testLAN2' }]} | ${[{ id: 'testDhcp1', '.type': 'dhcp', interface: 'testLAN' }, { id: 'testDhcp2', '.type': 'dhcp', interface: 'testWAN' }, { id: 'testDhcp3', '.type': 'dhcp', interface: 'testLAN2' }]}
  `('remove DHCP section onAfterDelete when section protocol is $proto', async ({ section, data, result }) => {
    interfaceSection.formData.dhcpv4 = data
    interfaceSection.formData.dhcpv6 = data
    await wrapper.vm.afterDelete(section)
    expect(interfaceSection.formData.dhcpv4).toEqual(result)
    expect(interfaceSection.formData.dhcpv6).toEqual(result)
  })

  it.each`
    method                      | bridge
    ${'removeUsedBridgeDevice'} | ${'0'}
    ${'removeUsedBridgeDevice'} | ${'1'}
    ${'updateNetworkDevices'}   | ${'0'}
    ${'updateNetworkDevices'}   | ${'1'}
  `('check if $method is called in afterDelete method when interface is bridged: $bridge ', async ({ method, bridge }) => {
    interfaceSection.formData.interfaces = interfacesData
    wrapper.vm[method] = vi.fn()
    await wrapper.vm.afterDelete({ bridge })
    expect(wrapper.vm[method]).toBeCalledTimes(bridge === '1' ? 1 : 0)
  })

  it('check if removeUsedBridgeDevice update interfaces ifname when bridged interface is removed', async () => {
    interfaceSection.formData = {
      interfaces: [
        { id: 'lan', '.type': 'interface', enabled: '1', ipaddr: '192.168.1.1', netmask: '255.255.255.0', proto: 'static', ifname: ['br-testas20'] },
        { id: 'wan', '.type': 'interface', ifname: ['eth1'], fwzone: 'wan', enabled: '1', proto: 'dhcp' }
      ]
    }
    await wrapper.vm.removeUsedBridgeDevice({ id: 'testas20', bridge: '1' })
    expect(interfaceSection.formData.interfaces).toEqual([
      { id: 'lan', '.type': 'interface', enabled: '1', ipaddr: '192.168.1.1', netmask: '255.255.255.0', proto: 'static', ifname: '' },
      { id: 'wan', '.type': 'interface', ifname: ['eth1'], fwzone: 'wan', enabled: '1', proto: 'dhcp' }
    ])
  })

  it('check if updateNetworkDevices update network devices data', async () => {
    const networkData = [
      {
        name: 'gre0',
        virtual: true
      }
    ]
    interfaceSection.formOptions.networkDevices = []
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({ success: true, data: networkData })
    await wrapper.vm.updateNetworkDevices()
    expect(interfaceSection.formOptions.networkDevices).toEqual(networkData)
  })

  it('check if updateNetworkDevices throw error if network device request fail', async () => {
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.updateNetworkDevices()
    expect(spy).toHaveBeenCalledWith('Failed to update network devices data.')
  })
})
