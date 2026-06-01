import Relayd from '../../src/views/network/Relayd.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'
import { useNotifications } from '@/stores/messages'
import { reactive } from 'vue'

const route = reactive({ path: '' })
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: vi.fn(() => route)
}))

describe('Relayd.vue', () => {
  let wrapper
  beforeEach(() => {
    route.path = ''
    wrapper = createWrapper(Relayd)
  })

  it('check if afterLoad load interfaces, wireless and dhcp data', async () => {
    const ifacesData = [
      { id: 'testIface', proto: 'static' },
      { id: 'testIface2', proto: 'wwan' }
    ]
    const wirelessData = [{ id: 'testWireless' }, { id: 'testWireless2' }]
    const dhcpv4Data = [{ id: 'testDhcpv4' }, { id: 'testDhcpv42' }]
    const dhcpv6Data = [{ id: 'testDhcpv6' }, { id: 'testDhcpv62' }]
    axios.bulkGet = vi.fn()
    axios.bulkGet.mockResolvedValueOnce([
      { success: true, data: ifacesData },
      { success: true, data: wirelessData },
      { success: true, data: dhcpv4Data },
      { success: true, data: dhcpv6Data }
    ])
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.ifaces).toEqual(ifacesData)
    expect(wrapper.vm.wirelessNetworks).toEqual(wirelessData)
    expect(wrapper.vm.dhcpv4).toEqual(dhcpv4Data)
    expect(wrapper.vm.dhcpv6).toEqual(dhcpv6Data)
  })

  it('check if afterLoad invokes interface data load error', async () => {
    axios.bulkGet = vi.fn()
    axios.bulkGet.mockResolvedValueOnce([
      { success: false, data: [] },
      { success: true, data: [] },
      { success: true, data: [] },
      { success: true, data: [] }
    ])
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('Failed to load interfaces data')
  })

  it('check if afterLoad invokes wireless data load error', async () => {
    axios.bulkGet = vi.fn()
    axios.bulkGet.mockResolvedValueOnce([
      { success: true, data: [] },
      { success: false, data: [] },
      { success: true, data: [] },
      { success: true, data: [] }
    ])
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('Failed to load wireless data')
  })

  it('check if afterLoad invokes dhcp data load error', async () => {
    axios.bulkGet = vi.fn()
    axios.bulkGet.mockResolvedValueOnce([
      { success: true, data: [] },
      { success: true, data: [] },
      { success: false, data: [] },
      { success: false, data: [] }
    ])
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenNthCalledWith(1, 'Failed to load DHCPv4 data')
    expect(spy).toHaveBeenNthCalledWith(2, 'Failed to load DHCPv6 data')
  })

  it('loads interfaces status', async () => {
    const res = [{ id: 'lan' }]
    axios.get = vi.fn()
    axios.get.mockResolvedValue({ success: true, data: res })
    await wrapper.vm.loadIfacesStatus()
    expect(wrapper.vm.ifaceStatus).toEqual(res)
  })

  it('fails to load interfaces status', async () => {
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    axios.get = vi.fn()
    axios.get.mockRejectedValue()
    await wrapper.vm.loadIfacesStatus()
    expect(spy).toBeCalledWith('Failed to load interfaces status')
  })

  it('check if computed property ifaceOptions return correct filtered interfaces names list', () => {
    const ifaces = [
      { id: 'test1', proto: 'static' },
      { id: 'test2', proto: 'wwan' },
      { id: 'test3', proto: 'none' },
      { id: 'test4', proto: 'wan' }
    ]
    wrapper.vm.ifaces = ifaces
    expect(wrapper.vm.ifaceOptions).toEqual(['test1', 'test4'])
  })

  it('check if computed property wirelessOptions return correct wifi network list', () => {
    const wirelessNetworks = [
      { id: 'test1', mode: 'sta', network: 'testNetwork1' },
      { id: 'test2', proto: 'test', network: 'testNetwork2' },
      { id: 'test3', mode: 'sta', network: 'testNetwork3' },
      { id: 'test3', mode: 'sta', network: '' }
    ]
    wrapper.vm.wirelessNetworks = wirelessNetworks
    expect(wrapper.vm.wirelessOptions).toEqual([
      ['', '-- Please select --'],
      ['testNetwork1', 'testNetwork1 (-)'],
      ['testNetwork3', 'testNetwork3 (-)']
    ])
  })

  it('check if computed property wirelessOptions return correct wifi network list when no networks available', () => {
    const wirelessOptions = [
      { id: 'test1', mode: 'test2', network: 'testNetwork1' },
      { id: 'test2', proto: 'test', network: 'testNetwork2' }
    ]
    wrapper.vm.wirelessNetworks = wirelessOptions
    expect(wrapper.vm.wirelessOptions).toEqual([['', '-- No WiFi clients configured --']])
  })

  it.each`
    relayd                                                            | ifaceStatus                                                                                         | res
    ${[{ enabled: '1', lan_mark: 'lan', network: 'wifi1', id: '1' }]} | ${[{ name: 'lan', ipaddrs: ['192.168.1.1/24'] }, { name: 'wifi1', ipaddrs: ['192.168.1.170/24'] }]} | ${{ id: 'relayd1', text: "The DHCP subnets of 'lan (192.168.1.1/24)' and 'wifi1 (192.168.1.170/24)' interfaces are overlapping. Please adjust one of the interface's subnets.", title: 'Relayd DHCP subnet overlap' }}
    ${[{ enabled: '1', lan_mark: 'lan', network: 'wifi1', id: '1' }]} | ${[{ name: 'lan', ipaddrs: ['192.168.2.1/22'] }, { name: 'wifi1', ipaddrs: ['192.168.1.170/24'] }]} | ${{ id: 'relayd1', text: "The DHCP subnets of 'lan (192.168.2.1/22)' and 'wifi1 (192.168.1.170/24)' interfaces are overlapping. Please adjust one of the interface's subnets.", title: 'Relayd DHCP subnet overlap' }}
  `('displays notification when subnets are overlapping', ({ relayd, ifaceStatus, res }) => {
    const notification = useNotifications()
    const spy = vi.spyOn(notification, 'warning')
    wrapper.vm.formData.relayd = relayd
    wrapper.vm.ifaceStatus = ifaceStatus
    wrapper.vm.checkSubnetOverlap()
    expect(spy).toHaveBeenCalledWith(res)
  })

  it.each`
    value    | dhcpv4                                        | dhcpv6                                        | uciSection          | res
    ${'lan'} | ${[{ interface: 'lan', enable_dhcpv4: '1' }]} | ${[{ interface: 'lan', enable_dhcpv6: '1' }]} | ${{ enabled: '1' }} | ${{ isValid: false, message: 'DHCPv4 or DHCPv6 server is enabled on the interface. Please disable the DHCP server before enabling the configuration' }}
    ${'lan'} | ${[{ interface: 'lan', enable_dhcpv4: '0' }]} | ${[{ interface: 'lan', enable_dhcpv6: '1' }]} | ${{ enabled: '1' }} | ${{ isValid: false, message: 'DHCPv4 or DHCPv6 server is enabled on the interface. Please disable the DHCP server before enabling the configuration' }}
    ${'lan'} | ${[{ interface: 'lan', enable_dhcpv4: '1' }]} | ${[{ interface: 'lan', enable_dhcpv6: '0' }]} | ${{ enabled: '1' }} | ${{ isValid: false, message: 'DHCPv4 or DHCPv6 server is enabled on the interface. Please disable the DHCP server before enabling the configuration' }}
    ${'lan'} | ${[{ interface: 'lan', enable_dhcpv4: '1' }]} | ${[{ interface: 'lan', enable_dhcpv6: '1' }]} | ${{ enabled: '0' }} | ${{ isValid: true }}
    ${'wan'} | ${[{ interface: 'lan', enable_dhcpv4: '1' }]} | ${[{ interface: 'lan', enable_dhcpv6: '1' }]} | ${{ enabled: '1' }} | ${{ isValid: true }}
    ${'lan'} | ${[{ interface: 'lan', enable_dhcpv4: '0' }]} | ${[{ interface: 'lan', enable_dhcpv6: '0' }]} | ${{ enabled: '1' }} | ${{ isValid: true }}
    ${'lan'} | ${[]}                                         | ${[]}                                         | ${{ enabled: '1' }} | ${{ isValid: true }}
  `('checks whether dhcp is enabled on relayd', ({ value, dhcpv4, dhcpv6, uciSection, res }) => {
    wrapper.vm.dhcpv4 = dhcpv4
    wrapper.vm.dhcpv6 = dhcpv6
    expect(wrapper.vm.checkDhcpEnabled(value, { uciSection })).toEqual(res)
  })
})
