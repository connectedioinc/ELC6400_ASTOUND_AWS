import InterfaceEdit from '../../src/views/network/interfaces/InterfaceEdit.vue'
import MobileFields from '@/components/network/MobileFields.vue'
import createWrapper, { combineDeep } from '@tests/unit/mockFactory'
import commonFunctions from '@/components/network/commonFunctions'
import { reactive } from 'vue'

vi.mock('vue-router', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ path: 'test' })),
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      replace: vi.fn()
    }))
  }
})

const systemFeaturesData = {
  features: {
    ipv6: true
  }
}

const storeData = {
  board: {
    modems: [],
    network: {
      wan: { device: 'eth1' },
      lan: { device: 'eth0' }
    }
  },
  deviceInfo: systemFeaturesData
}

const provideData = {
  initialOverviewForm: () => initialForm,
  formOptions: () => {
    return {
      networkDevices: networkData,
      systemFeatures: systemFeaturesData,
      interfaceStatus: interfacesStatusData,
      modemList: modemData,
      ntpInfo: ntpData,
      simcards: simcardsData,
      openVpnSections: openVpnData,
      fwZones: firewallData,
      wirelessNetworks: wirelessData,
      vlanInterfaceDevices: vlanInterfaceData
    }
  },
  setSection: vi.fn()
}

const importedComponentStub = {
  template: '<div />',
  computed: {
    dhcpSection() {
      return []
    }
  },
  methods: {}
}

const componentStubs = {
  'mobile-data-limit': importedComponentStub,
  zone: importedComponentStub
}

const protoData = {
  none: true,
  static: false,
  dhcp: false,
  dhcpv6: false,
  mobile: false,
  pppoe: false
}

describe('InterfaceEdit.vue', () => {
  let wrapper
  let wrapperData
  beforeEach(() => {
    wrapperData = {
      global: { mocks: { $route: { path: '/interfaces/general' }, $store: storeData }, provide: provideData, stubs: componentStubs },
      props: {
        section: {
          id: 'lan',
          '.type': 'interface',
          enabled: '1',
          ipaddr: '192.168.1.1',
          netmask: '255.255.255.0',
          proto: 'static',
          bridge: '1',
          ifname: ['eth0'],
          content: { data: { apn_list: [] }, id: 'lan', is_up: true, interface: 'lan', uptime: 999 },
          apnText: '-',
          metric: '1'
        }
      }
    }
    wrapper = createWrapper(InterfaceEdit, wrapperData)
  })

  it('usedLansVlan: returns empty array with dsa: false', async () => {
    wrapper = createWrapper(InterfaceEdit, {
      ...wrapperData
    })
    expect(wrapper.vm.usedLansVlan).toEqual([])
  })

  it('usedLansVlan: returns vlan lan array with dsa: true', async () => {
    const vlan = { name: 'vlan', type: 'VLAN', 'bridge-members': ['lan1'] }
    wrapper = createWrapper(
      InterfaceEdit,
      combineDeep(wrapperData, {
        global: {
          provide: {
            formOptions: () => {
              return {
                networkDevices: [{ name: 'notvlan' }, vlan]
              }
            }
          }
        }
      })
    )
    wrapper.vm.$store.board.hwinfo.dsa = true
    expect(wrapper.vm.usedLansVlan).toEqual(vlan['bridge-members'])
  })

  it('usedIfaces: returns empty array with dsa: false', async () => {
    wrapper = createWrapper(InterfaceEdit, {
      ...wrapperData
    })
    expect(wrapper.vm.usedIfaces).toEqual([])
  })

  it('usedIfaces: returns used lans when current section is not bridge', async () => {
    wrapper.vm.formOptions = () => ({
      networkDevices: [{ name: 'bridge2', type: 'bridge', 'bridge-members': ['lan2'] }]
    })
    await wrapper.setProps({
      section: { id: 'lan' }
    })
    expect(wrapper.vm.usedIfaces).toEqual(['lan2'])
  })

  it('usedIfaces: returns used lans when current section is bridge', async () => {
    wrapper.vm.defaultLanIfname = ['lan1', 'lan2', 'lan3']
    wrapper.vm.formOptions = () => ({
      networkDevices: [
        { name: 'br-lan', type: 'bridge', 'bridge-members': ['lan1'] },
        { name: 'bridge1', type: 'bridge', 'bridge-members': ['lan2', 'lan3'] }
      ]
    })
    await wrapper.setProps({
      section: { id: 'lan' }
    })
    expect(wrapper.vm.usedIfaces).toEqual(['lan2', 'lan3'])
  })

  it.each`
    name                                                | value     | usedVlan            | usedIface           | section            | isValid  | message
    ${'returns valid'}                                  | ${'lan1'} | ${['lan2']}         | ${['lan3']}         | ${{ bridge: '0' }} | ${true}  | ${null}
    ${'returns invalid because vlan'}                   | ${'lan1'} | ${['lan2', 'lan1']} | ${['lan3']}         | ${{ bridge: '0' }} | ${false} | ${'Physical interface "lan1" is already being used by port based vlan'}
    ${'returns invalid because iface, when non bridge'} | ${'lan1'} | ${['lan2']}         | ${['lan3', 'lan1']} | ${{ bridge: '0' }} | ${false} | ${'Physical interface "lan1" is already being used by bridge interface'}
    ${'returns invalid because iface, when bridge'}     | ${'lan1'} | ${['lan2']}         | ${['lan3', 'lan1']} | ${{ bridge: '1' }} | ${false} | ${'Physical interface "lan1" is already being used by other interface'}
  `('$name', async ({ value, usedVlan, usedIface, section, isValid, message }) => {
    wrapper = createWrapper(InterfaceEdit, {
      ...wrapperData,
      computed: {
        dsa: () => true,
        usedLansVlan: () => usedVlan,
        usedIfaces: () => usedIface,
        proto: () => protoData
      }
    })
    await wrapper.setProps({ section })
    const result = wrapper.vm.validateUsedLanNames(value)
    expect(result.isValid).toEqual(isValid)
    if (!isValid) expect(result.message).toEqual(message)
  })

  it.each`
    name                                                                            | value               | allInterfaces                                                      | section                        | isValid  | message
    ${'returns valid'}                                                              | ${'lan1'}           | ${[{ id: 'lan1' }]}                                                | ${{ bridge: '0' }}             | ${true}  | ${null}
    ${'returns invalid when bridged and ifname is used'}                            | ${'eth0'}           | ${[{ id: 'lan1', bridge: '1', ifname: 'eth0' }]}                   | ${{ bridge: '0' }}             | ${false} | ${'Physical interface "eth0" is already being used by lan1'}
    ${'returns invalid when bridged, ifname is used and value is array'}            | ${['eth1', 'eth0']} | ${[{ id: 'lan1', bridge: '1', ifname: 'eth1' }]}                   | ${{ bridge: '1' }}             | ${false} | ${'Physical interface "eth1" is already being used by lan1'}
    ${'returns invalid when bridged, ifname is array and used, and value is array'} | ${['eth1', 'eth0']} | ${[{ id: 'lan1', bridge: '1', ifname: ['eth0', 'eth1'] }]}         | ${{ bridge: '1' }}             | ${false} | ${'Physical interface "eth0,eth1" is already being used by lan1'}
    ${'returns valid when bridged, but other ifname'}                               | ${['eth1', 'eth0']} | ${[{ id: 'lan1', bridge: '1', ifname: ['test'] }]}                 | ${{ bridge: '1' }}             | ${true}  | ${null}
    ${'returns valid when unbridged, ifname is used and value is array'}            | ${['eth1', 'eth0']} | ${[{ id: 'lan1', bridge: '0', ifname: ['eth1', 'eth0', 'test'] }]} | ${{ bridge: '0' }}             | ${true}  | ${null}
    ${'returns valid when bridged and same interface edited'}                       | ${['eth1', 'eth0']} | ${[{ id: 'lan1', bridge: '1', ifname: ['eth1', 'eth0'] }]}         | ${{ bridge: '1', id: 'lan1' }} | ${true}  | ${null}
  `('$name', async ({ value, allInterfaces, section, isValid, message }) => {
    wrapper = createWrapper(InterfaceEdit, {
      ...wrapperData,
      computed: {
        dsa: () => false,
        proto: () => protoData
      }
    })
    await wrapper.setProps({ section, allInterfaces })
    const result = wrapper.vm.validateUsedLanNames(value)
    expect(result.isValid).toEqual(isValid)
    if (!isValid) expect(result.message).toEqual(message)
  })

  it.each`
    interfaceProto | computedProto
    ${'none'}      | ${'none'}
    ${'static'}    | ${'static'}
    ${'dhcp'}      | ${'dhcp'}
    ${'dhcpv6'}    | ${'dhcpv6'}
    ${'connm'}     | ${'mobile'}
    ${'wwan'}      | ${'mobile'}
    ${'pppoe'}     | ${'pppoe'}
  `('check if computed proto return correct value when interface proto is - $interfaceProto', async ({ interfaceProto, computedProto }) => {
    await wrapper.setProps({ section: { id: 'test', '.type': 'interface', proto: interfaceProto } })
    expect(wrapper.vm.proto[computedProto]).toEqual(true)
  })

  it('check if computed bridged return correct value', async () => {
    expect(wrapper.vm.bridged).toEqual(true)
  })

  it('check if computed simSection return correct section', async () => {
    await wrapper.setProps({ section: { id: 'mob1s1a1', enabled: '1', modem: '1-1', sim: '1' } })
    expect(wrapper.vm.simSection).toEqual(simcardsData[0])
  })

  it('check if computed property - simcards return data from injected formOptions', async () => {
    expect(wrapper.vm.simcards).toEqual(simcardsData)
  })

  it('check if computed property - modemList return data from injected formOptions', async () => {
    expect(wrapper.vm.modemList).toEqual(modemData)
  })

  it('check if computed property - networkDevices return data from injected formOptions', async () => {
    expect(wrapper.vm.networkDevices).toEqual(networkData)
  })

  it('check if computed property - systemFeatures return data from injected formOptions', async () => {
    expect(wrapper.vm.isIpv6).toEqual(systemFeaturesData.features.ipv6)
  })

  it('check if computed property - fwZones return data from injected formOptions', async () => {
    expect(wrapper.vm.fwZones).toEqual(firewallData)
  })

  it('check if computed property - wirelessNetworks return data from injected formOptions', async () => {
    expect(wrapper.vm.wirelessNetworks).toEqual(wirelessData)
  })

  it.each`
    data         | res
    ${undefined} | ${[['none', 'None', true], ['static', 'Static', undefined], ['dhcp', 'DHCPv4 client', true], ['dhcpv6', 'DHCPv6 client', true], ['pppoe', 'PPPoE client', true], ['wwan', 'Mobile', true]]}
    ${'connm'}   | ${[['none', 'None', true], ['static', 'Static', undefined], ['dhcp', 'DHCPv4 client', true], ['dhcpv6', 'DHCPv6 client', true], ['pppoe', 'PPPoE client', true], ['connm', 'Mobile', true]]}
    ${'wwan'}    | ${[['none', 'None', true], ['static', 'Static', undefined], ['dhcp', 'DHCPv4 client', true], ['dhcpv6', 'DHCPv6 client', true], ['pppoe', 'PPPoE client', true], ['wwan', 'Mobile', true]]}
  `('return protocols list when wan', async ({ data, res }) => {
    wrapper.vm.$store.board.custom_proto = data
    wrapper.vm.section.area_type = 'wan'
    expect(wrapper.vm.protocols.inputOptions.value).toEqual(res)
  })

  it('return protocols list when lan', async () => {
    wrapper.vm.section.area_type = 'lan'
    expect(wrapper.vm.protocols.inputOptions.value).toEqual([
      ['none', 'None', true],
      ['static', 'Static', undefined],
      ['dhcp', 'DHCPv4 client', false],
      ['dhcpv6', 'DHCPv6 client', false],
      ['pppoe', 'PPPoE client', false],
      ['wwan', 'Mobile', false]
    ])
  })

  it.each`
    modem                                                          | response
    ${[{ name: 'Internal modem', id: '1-1', dynamic_mtu: true }]}  | ${'Maximum Transmission Unit (MTU) – specifies the largest possible size of a data packet. If Override MTU field will be left – empty dynamic MTU will be used.'}
    ${[{ name: 'Internal modem', id: '1-1', dynamic_mtu: false }]} | ${'Maximum Transmission Unit (MTU) – specifies the largest possible size of a data packet'}
    ${[]}                                                          | ${'Maximum Transmission Unit (MTU) – specifies the largest possible size of a data packet'}
  `('check if computed property - mtuHint return hint when dynamic MTU - $response', async ({ modem, response }) => {
    wrapper = createWrapper(InterfaceEdit, combineDeep(wrapperData, { global: { provide: { formOptions: () => ({ modemList: modem }) } } }))

    await wrapper.setProps({ section: { modem: '1-1' } })
    expect(wrapper.vm.mtuHint).toEqual(response)
  })

  it('check if computed ifDevices return physical interfaces list without bridge interfaces when bridge is on', async () => {
    wrapper = createWrapper(
      InterfaceEdit,
      combineDeep(wrapperData, {
        props: {
          section: {
            id: 'lan1'
          }
        }
      })
    )
    wrapper.vm.$store.board.hwinfo.dsa = true
    await wrapper.setProps({
      allInterfaces: interfacesData
    })
    expect(wrapper.vm.ifDevices).toEqual([['eth1', 'eth1']])
  })

  it('check if computed ifDevices return physical interfaces list with bridge interfaces when bridge is off', async () => {
    await wrapper.setProps({
      allInterfaces: interfacesData
    })
    await wrapper.setProps({ section: { bridge: '0' } })
    wrapper.vm.$store.board.hwinfo.dsa = false
    expect(wrapper.vm.ifDevices).toEqual([
      ['', '-- No interface --'],
      ['br-lan', 'br-lan (eth0)'],
      ['eth0.2', 'eth0.2'],
      ['eth1', 'eth1']
    ])
  })

  it('check if computed ifDevices return correct physical interfaces list when device have no name', async () => {
    wrapper = createWrapper(
      InterfaceEdit,
      combineDeep(wrapperData, {
        props: {
          section: {
            id: 'lan1'
          }
        }
      })
    )
    wrapper.vm.networkDevices.push({ name: '', type: 'VLAN' })
    await wrapper.setProps({
      allInterfaces: interfacesData
    })
    wrapper.vm.$store.board.hwinfo.dsa = false
    expect(wrapper.vm.ifDevices).toEqual([
      ['eth0.2', 'eth0.2'],
      ['eth1', 'eth1']
    ])
  })

  it('check if computed ifDevices return correct physical interfaces list when device is wireless type', async () => {
    wrapper = createWrapper(
      InterfaceEdit,
      combineDeep(wrapperData, {
        props: {
          section: {
            id: 'lan1'
          }
        }
      })
    )
    wrapper.vm.networkDevices.push({ name: 'wwan', type: 'wireless' })
    wrapper.vm.networkDevices.push({ name: 'wlan', type: 'wireless' })
    await wrapper.setProps({
      allInterfaces: interfacesData
    })
    wrapper.vm.$store.board.hwinfo.dsa = false
    expect(wrapper.vm.ifDevices).toEqual([
      ['eth0.2', 'eth0.2'],
      ['eth1', 'eth1']
    ])
  })

  it.each([
    {
      name: 'firstt',
      store: storeData,
      networkDevices: [
        { name: 'eth0.4050', type: 'VLAN', virtual: false },
        { name: 'eth0.150', type: 'VLAN', virtual: false },
        { name: 'br-lan', type: 'bridge', virtual: false },
        { name: 'br-test', type: 'bridge', virtual: false },
        { name: 'eth1', type: 'Network Device', virtual: false }
      ],
      res: [
        ['', '-- No interface --'],
        ['br-test', 'br-test'],
        ['eth0.150', 'eth0.150'],
        ['eth0.4050', 'eth0.4050'],
        ['eth1', 'eth1']
      ]
    },
    {
      name: 'secondation',
      store: { board: { modems: [], network: { wan: { device: 'eth1' }, lan: { ports: ['eth0', 'rndis0'] } } }, deviceInfo: systemFeaturesData },
      networkDevices: [
        { name: 'eth0.4050', type: 'VLAN', virtual: false },
        { name: 'eth0.150', type: 'VLAN', virtual: false },
        { name: 'br-lan', type: 'bridge', virtual: false },
        { name: 'br-test', type: 'bridge', virtual: false },
        { name: 'eth1', type: 'Network Device', virtual: false },
        { name: 'rndis0', type: 'Network Device', virtual: false }
      ],
      res: [
        ['', '-- No interface --'],
        ['br-test', 'br-test'],
        ['eth0.150', 'eth0.150'],
        ['eth0.4050', 'eth0.4050'],
        ['eth1', 'eth1']
      ]
    }
  ])('check if computed ifDevices return sorted physical interfaces list #%#', async ({ store, networkDevices, res }) => {
    wrapper = createWrapper(InterfaceEdit, {
      global: {
        mocks: {
          $route: { path: '/interfaces/general' },
          $store: {
            state: store
          }
        },
        provide: {
          initialOverviewForm: () => initialForm,
          formOptions: () => ({
            networkDevices: networkDevices,
            systemFeatures: systemFeaturesData,
            interfaceStatus: interfacesStatusData,
            modemList: modemData,
            ntpInfo: ntpData,
            simcards: simcardsData,
            openVpnSections: openVpnData,
            fwZones: firewallData,
            wirelessNetworks: wirelessData,
            vlanInterfaceDevices: vlanInterfaceData
          })
        },
        stubs: componentStubs
      },
      props: {
        section: {
          id: 'lan',
          '.type': 'interface',
          enabled: '1',
          ipaddr: '192.168.1.1',
          netmask: '255.255.255.0',
          proto: 'static',
          bridge: '0',
          ifname: ['eth0'],
          content: { data: { apn_list: [] }, id: 'lan', is_up: true, interface: 'lan', uptime: 999 },
          apnText: '-',
          metric: '1'
        }
      }
    })
    await wrapper.setProps({
      allInterfaces: interfacesData
    })
    expect(wrapper.vm.ifDevices).toEqual(res)
  })

  it('check if computed showWanToLan return correct value if WAN exists', async () => {
    wrapper.vm.page = 'network'
    expect(wrapper.vm.showWanToLan).toEqual(false)
  })

  it('check if computed showLanToWan return correct value if LAN exists', async () => {
    wrapper.vm.page = 'lan'
    expect(wrapper.vm.showLanToWan).toEqual(false)
  })

  it('check if computed broadcast return correct value for broadcast element placeholder', async () => {
    expect(wrapper.vm.broadcast).toEqual('192.168.1.255')
  })

  it('check if computed macPlaceholder return correct value for MAC address element placeholder', async () => {
    expect(wrapper.vm.macPlaceholder).toEqual('00:1e:42:29:c4:66')
  })

  it('check if computed leasetimeInputProps return correct input props for lease time custom element', async () => {
    const unitOptions = [
      ['h', 'Hours'],
      ['m', 'Minutes'],
      ['s', 'Seconds']
    ]
    wrapper.setData({
      leasetimePlaceholder: '12',
      leaseTimeRules: 'irange(1,99999)',
      unitOptions
    })
    expect(wrapper.vm.leasetimeInputProps).toEqual([
      {
        prop: 'leaseTime',
        placeholder: '12',
        rules: 'irange(1,99999)'
      },
      {
        prop: 'leaseUnit',
        options: unitOptions
      }
    ])
  })
  it.each`
    section                                          | initialSection                                   | result   | condition
    ${{ proto: 'dhcp' }}                             | ${{ proto: 'static', netmask: '255.255.255.0' }} | ${false} | ${'proto is not static'}
    ${{ proto: 'static', netmask: '255.255.255.0' }} | ${{ proto: 'static', netmask: '255.255.0.0' }}   | ${true}  | ${'netmask changed'}
    ${{ proto: 'static', netmask: '255.255.0.0' }}   | ${{ proto: 'static', netmask: '255.255.0.0' }}   | ${false} | ${'netmask not changed'}
    ${{ mobile: 'static', method: 'nat' }}           | ${{ mobile: 'static', method: 'passthrough' }}   | ${true}  | ${'was passthrough'}
    ${{ mobile: 'static', method: 'passthrough' }}   | ${{ mobile: 'static', method: 'passthrough' }}   | ${true}  | ${'keeps passthrough'}
    ${{ mobile: 'static', method: 'passthrough' }}   | ${{ mobile: 'static', method: 'nat' }}           | ${true}  | ${'changed to passthrough'}
    ${{ stp: '1' }}                                  | ${{ stp: '0' }}                                  | ${true}  | ${'stp: 0 -> 1'}
    ${{ stp: '0' }}                                  | ${{ stp: '0' }}                                  | ${false} | ${'stp: 0 -> 0'}
    ${{ stp: '1' }}                                  | ${{ stp: '1' }}                                  | ${false} | ${'stp: 1 -> 1'}
    ${{ stp: '0' }}                                  | ${{ stp: '1' }}                                  | ${false} | ${'stp: 1 -> 0'}
    ${{ stp: '1' }}                                  | ${{ stp: undefined }}                            | ${true}  | ${'stp: undefined -> 1'}
  `('check if computed awaitForSwitchRestart return correct value $condition', async ({ section, initialSection, result }) => {
    wrapper.vm.initialSection = initialSection
    await wrapper.setProps({ section })
    expect(wrapper.vm.awaitForSwitchRestart).toEqual(result)
  })
  wrapperData = {
    mocks: { $route: { path: '/interfaces/general' }, $store: storeData },
    provide: provideData,
    stubs: componentStubs,
    props: {
      section: {
        id: 'lan',
        '.type': 'interface',
        enabled: '1',
        ipaddr: '192.168.1.1',
        netmask: '255.255.255.0',
        proto: 'static',
        bridge: '1',
        ifname: ['eth0'],
        content: { data: { apn_list: [] }, id: 'lan', is_up: true, interface: 'lan', uptime: 999 },
        apnText: '-',
        metric: '1'
      }
    }
  }
  it.each`
    proto       | isIpv6   | expectedResult
    ${'dhcpv6'} | ${true}  | ${true}
    ${'static'} | ${true}  | ${true}
    ${'pppoe'}  | ${true}  | ${true}
    ${'connm'}  | ${true}  | ${true}
    ${'static'} | ${false} | ${false}
    ${'none'}   | ${true}  | ${false}
  `('returns true if ipv6 tab should be shown #%#', ({ proto, isIpv6, expectedResult }) => {
    wrapper = createWrapper(
      InterfaceEdit,
      combineDeep(wrapperData, {
        props: { section: { proto } },
        global: {
          mocks: {
            $store: {
              deviceInfo: {
                features: {
                  ipv6: isIpv6
                }
              }
            }
          }
        }
      })
    )
    expect(wrapper.vm.showIpv6Tab).toEqual(expectedResult)
  })
  it('tabs return correct tabs with all of them showing', () => {
    wrapper = createWrapper(
      InterfaceEdit,
      combineDeep(wrapperData, {
        props: { section: { proto: 'wwan', area_type: 'wan' } }
      })
    )
    wrapper.vm.physicalTab = true
    wrapper.vm.$store.hasPackages = vi.fn().mockReturnValue(true)
    expect(wrapper.vm.tabs).toEqual([
      { name: 'general', title: 'General Settings' },
      { name: 'ipv6', title: 'IPv6 Settings', show: true },
      { name: 'advanced', title: 'Advanced Settings' },
      { name: 'physical', title: 'Physical Settings', show: true },
      { name: 'firewall', title: 'Firewall Settings' }
    ])
  })

  it.each`
    currectSection                                                | expectedSection
    ${{ proto: 'dhcp', defaultroute: '0' }}                       | ${{ proto: 'dhcp', defaultroute: '1', force_link: '0' }}
    ${{ proto: 'none', defaultroute: '0' }}                       | ${{ proto: 'none', defaultroute: '0', force_link: '0' }}
    ${{ proto: 'wwan', sim: '2', auto_apn: '0', modem: '1-2' }}   | ${{ proto: 'wwan', sim: '1', auto_apn: '1', modem: '1-1', force_link: '0' }}
    ${{ proto: 'static', sim: '2', auto_apn: '0', modem: '1-2' }} | ${{ proto: 'static', sim: '2', auto_apn: '0', modem: '1-2', force_link: '1' }}
  `('change proto changes section #%#', async ({ currectSection, expectedSection }) => {
    wrapper = createWrapper(
      InterfaceEdit,
      combineDeep(wrapperData, {
        props: { section: currectSection }
      })
    )
    await wrapper.vm.changeProto(currectSection)
    await wrapper.vm.$nextTick()
    expect(currectSection).toEqual(expectedSection)
  })

  it.each`
    sectionProto | response
    ${'wwan'}    | ${false}
    ${'static'}  | ${true}
  `('check if changeProto set physical tab when proto - $sectionProto', async ({ sectionProto, response }) => {
    const section = { proto: sectionProto }
    await wrapper.setProps({ section })
    await wrapper.vm.changeProto(section)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.physicalTab).toEqual(response)
  })

  it('returns checkForSingleInterfaceModem error', () => {
    wrapper.vm.$refs.form.validate = vi.fn().mockResolvedValueOnce(true)
    const message = 'Multiple APN is not supported on this device, only one mobile interface can be enabled'
    vi.spyOn(commonFunctions, 'checkForSingleInterfaceModem').mockReturnValue({ isValid: false, message })
    wrapper.vm.proto.mobile = true
    const result = wrapper.vm.beforeSave()
    return expect(result).rejects.toEqual(message)
  })

  it('check if beforeSave invokes error message if multi APN is not valid for device', async () => {
    const modems = [{ id: '3-1', version: 'EC200ATESTTEST' }]
    wrapper = createWrapper(
      InterfaceEdit,
      combineDeep(wrapperData, {
        props: { section: { proto: 'wwan', modem: '3-1' } },
        global: {
          provide: {
            formOptions: () => {
              return {
                modemList: modems
              }
            }
          }
        }
      })
    )
    wrapper.vm.$refs.form.validate = vi.fn().mockResolvedValueOnce(true)
    wrapper.setData({
      formData: {
        interfaces: [
          { enabled: '1', proto: 'wwan', modem: '3-1' },
          { enabled: '1', proto: 'wwan', modem: '3-1' }
        ]
      }
    })
    try {
      wrapper.vm.$axios.get = vi.fn().mockResolvedValue({ data: modems })
      await wrapper.vm.beforeSave()
    } catch (error) {
      expect(error).toBe('Multiple APN is not supported on this device, only one mobile interface can be enabled')
    }
  })

  it('check if beforeSave invokes error message when creating 10th mobile interface of same sim', () => {
    wrapper = createWrapper(
      InterfaceEdit,
      combineDeep(wrapperData, {
        props: {
          section: { proto: 'wwan', modem: '3-1', sim: '1' },
          allInterfaces: [
            { enabled: '1', proto: 'wwan', modem: '3-1', sim: '1' },
            { enabled: '1', proto: 'wwan', modem: '3-1', sim: '1' },
            { enabled: '1', proto: 'wwan', modem: '3-1', sim: '1' },
            { enabled: '1', proto: 'wwan', modem: '3-1', sim: '1' },
            { enabled: '1', proto: 'wwan', modem: '3-1', sim: '1' },
            { enabled: '0', proto: 'wwan', modem: '3-1', sim: '1' },
            { enabled: '0', proto: 'wwan', modem: '3-1', sim: '1' },
            { enabled: '0', proto: 'wwan', modem: '3-1', sim: '1' },
            { enabled: '0', proto: 'wwan', modem: '3-1', sim: '1' }
          ]
        }
      })
    )
    wrapper.vm.$refs.form.validate = vi.fn().mockResolvedValueOnce(true)
    expect(wrapper.vm.beforeSave()).rejects.toBe('Maximum amount of mobile interfaces reached')
  })

  it('check if updateAutoApn update other interfaces auto_apn value', async () => {
    wrapper.vm.formData = {
      interfaces: [
        { id: 'test', '.type': 'interface', enabled: '1', modem: '1-1', sim: '1', proto: 'wwan', auto_apn: '1' },
        { id: 'test1', '.type': 'interface', enabled: '1', modem: '1-1', sim: '1', proto: 'wwan', auto_apn: '1' },
        { id: 'test2', '.type': 'interface', enabled: '1', modem: '1-1', sim: '2', proto: 'wwan', auto_apn: '1' }
      ]
    }
    await wrapper.setProps({ section: { id: 'test', '.type': 'interface', enabled: '1', modem: '1-1', sim: '1', proto: 'wwan', auto_apn: '1' } })
    wrapper.vm.updateAutoApn()
    expect(wrapper.vm.formData.interfaces).toEqual([
      { id: 'test', '.type': 'interface', enabled: '1', modem: '1-1', sim: '1', proto: 'wwan', auto_apn: '0' },
      { id: 'test1', '.type': 'interface', enabled: '1', modem: '1-1', sim: '1', proto: 'wwan', auto_apn: '0' },
      { id: 'test2', '.type': 'interface', enabled: '1', modem: '1-1', sim: '2', proto: 'wwan', auto_apn: '1' }
    ])
  })

  it.each`
    interfaces                                                                                                                                                        | section                                                                                   | response
    ${[{ id: 'test', enabled: '1', auto_apn: '1', modem: '1-1', sim: '1' }, { id: 'test2', enabled: '1', auto_apn: '1', modem: '1-1', sim: '1' }]}                    | ${{ id: 'test', enabled: '1', auto_apn: '1', modem: '1-1', sim: '1' }}                    | ${true}
    ${[{ id: 'test', enabled: '1', auto_apn: '1', modem: '1-1', sim: '1' }, { id: 'test2', enabled: '1', auto_apn: '1', modem: '1-1', sim: '2' }]}                    | ${{ id: 'test', enabled: '1', auto_apn: '1', modem: '1-1', sim: '1' }}                    | ${false}
    ${[{ id: 'test', enabled: '1', auto_apn: '1', modem: '1-1', sim: '1' }, { id: 'test2', enabled: '1', auto_apn: '0', modem: '1-2', sim: '1' }]}                    | ${{ id: 'test', enabled: '1', auto_apn: '1', modem: '1-1', sim: '1' }}                    | ${false}
    ${[{ id: 'test', enabled: '1', auto_apn: '1', modem: '1-1', sim: '1', esim_profile: '1' }, { id: 'test2', enabled: '1', auto_apn: '1', modem: '1-2', sim: '1' }]} | ${{ id: 'test', enabled: '1', auto_apn: '1', modem: '1-1', sim: '1', esim_profile: '1' }} | ${false}
  `('checks sameSimModemSections validation - $response', async ({ interfaces, section, response }) => {
    wrapper.vm.formData = { interfaces }
    await wrapper.setProps({ section })
    expect(wrapper.vm.sameSimModemSections()).toEqual(response)
  })

  it('check if beforeSave return reject validate', () => {
    wrapper.vm.$refs.form.validate = vi.fn().mockResolvedValueOnce(false)
    vi.spyOn(wrapper.vm, 'validateIpAddress').mockReturnValue(false)
    const message = 'One of the IPv4 or IPv6 addresses must be defined.'
    const result = wrapper.vm.beforeSave()
    return expect(result).rejects.toEqual(message)
  })

  it('check if metric update prompt is shown', async () => {
    wrapper.vm.initialOverviewForm = () => ({
      interfaces: [
        { id: 'wan', metric: '1' },
        { id: 'wan6', metric: '2' },
        { id: 'wifi', metric: '3' }
      ]
    })
    await wrapper.setProps({ section: { id: 'wifi', metric: '1' } })
    wrapper.vm.$prompt = {
      show: vi.fn(({ onOk }) => onOk())
    }
    const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
    await wrapper.vm.checkMetrics()
    expect(spy).toHaveBeenCalled()
  })

  it('check if metric update prompt is not shown', async () => {
    wrapper.vm.initialOverviewForm = () => ({
      interfaces: [
        { id: 'wan', metric: '1' },
        { id: 'wan6', metric: '2' },
        { id: 'wifi', metric: '3' }
      ]
    })
    await wrapper.setProps({ section: { id: 'wifi', metric: '4' } })
    const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
    await wrapper.vm.checkMetrics()
    expect(spy).not.toHaveBeenCalled()
  })

  it.each`
    initialSection                 | interfaces                                                                                | section                        | response
    ${{ id: 'wan6', metric: '2' }} | ${[{ id: 'wan', metric: '1' }, { id: 'wan6', metric: '3' }, { id: 'mob1', metric: '3' }]} | ${{ id: 'wan6', metric: '3' }} | ${[{ id: 'wan', metric: '1' }, { id: 'wan6', metric: '3' }, { id: 'mob1', metric: '2' }]}
    ${{ id: 'mob1', metric: '3' }} | ${[{ id: 'wan', metric: '1' }, { id: 'wan6', metric: '2' }, { id: 'mob1', metric: '1' }]} | ${{ id: 'mob1', metric: '1' }} | ${[{ id: 'wan', metric: '2' }, { id: 'wan6', metric: '3' }, { id: 'mob1', metric: '1' }]}
    ${{ id: 'mob1', metric: '3' }} | ${[{ id: 'wan', metric: '1' }, { id: 'wan6', metric: '2' }, { id: 'mob1', metric: '4' }]} | ${{ id: 'mob1', metric: '4' }} | ${[{ id: 'wan', metric: '1' }, { id: 'wan6', metric: '2' }, { id: 'mob1', metric: '4' }]}
  `('checks updated interface metrics #%#', async ({ initialSection, interfaces, section, response }) => {
    wrapper.vm.initialSection = initialSection
    wrapper.vm.formData.interfaces = interfaces
    await wrapper.setProps({ section })
    await wrapper.vm.updateMetrics()
    expect(wrapper.vm.formData.interfaces).toEqual(response)
  })

  it('check if simOptions return simOptions list with provided modem', async () => {
    wrapper.vm.$mobile.adjustSimNumber = vi.fn().mockImplementation(value => {
      return value || 'N/A'
    })
    expect(await wrapper.vm.simOptions('1-1')).toEqual([
      ['1', 'SIM1'],
      ['2', 'SIM2']
    ])
  })

  it('check if eSimOptions return eSIM profile list with provided modem and SIM', async () => {
    const section = { modem: '1-1', sim: '2' }
    wrapper = createWrapper(
      InterfaceEdit,
      combineDeep(wrapperData, {
        props: { section },
        global: {
          provide: {
            formOptions: () => {
              return {
                simcards: [
                  { modem: '1-1', position: '2', esim_profile: '1' },
                  { modem: '1-1', position: '2', esim_profile: '2' }
                ]
              }
            }
          }
        }
      })
    )
    expect(await wrapper.vm.eSimOptions(section)).toEqual([
      ['1', 'eSIM1'],
      ['2', 'eSIM2']
    ])
  })

  it.each`
    method
    ${'wanToLan'}
    ${'lanToWan'}
  `('check if $method display prompt', async ({ method }) => {
    const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
    await wrapper.vm[method]()
    expect(spy).toBeCalledTimes(1)
  })

  it('check if switchWanToLan method call wan_to_lan action and redirect to LAN page', async () => {
    const spy = vi.spyOn(wrapper.vm.$router, 'push')
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce({ success: true })
    await wrapper.vm.switchWanToLan()
    expect(spy).toHaveBeenCalledWith({ path: '/network/lan', query: { edit: 'lan' } })
  })

  it('invokes error message when switchWanToLan actions is rejected', async () => {
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.switchWanToLan()
    expect(spy).toHaveBeenCalledWith('Error WAN to LAN redirect')
  })

  it('check if switchLanToWan method call wan_to_lan action and redirect to LAN page', async () => {
    const spy = vi.spyOn(wrapper.vm.$router, 'push')
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce({ success: true })
    await wrapper.vm.switchLanToWan()
    expect(spy).toHaveBeenCalledWith({ path: '/network/wan', query: { edit: 'lan_to_wan' } })
  })

  it('invokes error message when switchLanToWan actions is rejected', async () => {
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.switchLanToWan()
    expect(spy).toHaveBeenCalledWith('Error LAN to WAN redirect')
  })

  it.each`
    sectionIfname | response
    ${'eth0'}     | ${['eth0']}
    ${['eth1']}   | ${['eth1']}
  `('check if saveIfname return correct value when model - $sectionIfname', async ({ sectionIfname, response }) => {
    expect(await wrapper.vm.saveIfname({ model: sectionIfname })).toEqual(response)
  })

  it.each`
    value       | bridged  | response
    ${['eth0']} | ${true}  | ${['eth0']}
    ${['eth0']} | ${false} | ${'eth0'}
    ${'eth0'}   | ${false} | ${'eth0'}
  `('returns correct value on load #%#', async ({ value, bridged, response }) => {
    wrapper = createWrapper(
      InterfaceEdit,
      combineDeep(wrapperData, {
        computed: {
          bridged() {
            return bridged
          },
          proto: () => protoData
        }
      })
    )
    expect(await wrapper.vm.loadIfname({ model: value })).toEqual(response)
  })

  it.each`
    values         | response
    ${['12', 'h']} | ${'12h'}
    ${['s', '']}   | ${'s'}
    ${['', 's']}   | ${''}
  `('check if saveLeaseTime format correct value when model - $values', async ({ values, response }) => {
    expect(await wrapper.vm.saveLeaseTime(values)).toEqual(response)
  })

  it('check if loadLeaseTime return correct data', async () => {
    expect(await wrapper.vm.loadLeaseTime('60m')).toEqual(['60', 'm'])
  })

  it.each`
    unit   | hint                              | placeholder | rule
    ${'h'} | ${'Minimum value is 1 hour'}      | ${'12'}     | ${'irange(1,999999)'}
    ${'m'} | ${'Minimum value is 2 minutes'}   | ${'720'}    | ${'irange(2,999999)'}
    ${'s'} | ${'Minimum value is 120 seconds'} | ${'43200'}  | ${'irange(120,999999)'}
  `('check if updateProps set correct lease props when unit - $unit', async ({ unit, hint, placeholder, rule }) => {
    await wrapper.vm.updateProps(unit)
    expect(wrapper.vm.leaseTimeHint).toEqual(hint)
    expect(wrapper.vm.leasetimePlaceholder).toEqual(placeholder)
    expect(wrapper.vm.leaseTimeRules).toEqual(rule)
  })

  it.each`
    ifacesData                                                                                      | response
    ${[{ id: 'test', method: 'bridge', modem: '1-1', sim: '1' }]}
    ${{ isValid: false, message: 'Only one Bridge or Passthrough mode configuration is possible' }}
    ${[{ id: 'test', modem: '1-1', sim: '1' }]}
    ${{ isValid: true }}
  `('validate mode', async ({ ifacesData, response }) => {
    wrapper.vm.formData = { interfaces: ifacesData }
    await wrapper.setProps({ section: { id: 'testNo' } })
    expect(await wrapper.vm.validateMode('test')).toEqual(response)
  })

  it('validate ifname when interface IS NOT wireless', async () => {
    await wrapper.setProps({ section: { id: 'hhhh' } })
    expect(await wrapper.vm.validateIfname({ model: 0 })).toEqual({ isValid: false, message: 'Physical interface can not be empty' })
  })

  it('validate ifname when interface IS wireless', async () => {
    await wrapper.setProps({ section: { id: 'testWireless' } })
    expect(await wrapper.vm.validateIfname({ model: 0 })).toEqual({ isValid: true })
  })

  it.each`
    section                                        | response
    ${{ id: 'mob1', modem: '1-1', proto: 'wwan' }}
    ${true}
    ${{ id: 'mob1', modem: '1-2', proto: 'wwan' }}
    ${false}
    ${{ id: 'static', proto: 'static' }}
    ${false}
  `('check if modem supports framed routing', async ({ section, response }) => {
    await wrapper.setProps({ section })
    expect(wrapper.vm.supportsFramedRouting).toEqual(response)
  })

  it.each`
    section                                                      | gnss     | response
    ${{ id: 'mob1', modem: '1-1', proto: 'wwan', enabled: '1' }} | ${true}  | ${true}
    ${{ id: 'mob1', modem: '1-2', proto: 'wwan', enabled: '0' }} | ${true}  | ${false}
    ${{ id: 'mob1', modem: '1-2', proto: 'wwan', enabled: '1' }} | ${false} | ${false}
    ${{ id: 'static', proto: 'static', enabled: '1' }}           | ${true}  | ${false}
  `('check if modem GPS warning message should be shown', async ({ section, gnss, response }) => {
    wrapper.vm.$mobile.getGnssState = vi.fn().mockReturnValueOnce(gnss)
    await wrapper.setProps({ section })
    expect(wrapper.vm.showGpsWarning).toEqual(response)
  })

  it.each`
    fiberPriority | result
    ${'1'}        | ${'1'}
    ${undefined}  | ${''}
  `('check if computed initialFiberPriority return correct value when fiber priority is $fiberPriority', ({ fiberPriority, result }) => {
    wrapper.vm.formData = { interfaces: [{ id: 'lan', fiber_priority: fiberPriority }] }
    expect(wrapper.vm.initialFiberPriority).toEqual(result)
  })

  it.each`
    isInvalidDhcp | deletes
    ${true}       | ${true}
    ${false}      | ${false}
  `('deletes dhcp config #%#', async ({ isInvalidDhcp, deletes }) => {
    wrapper = createWrapper(
      InterfaceEdit,
      combineDeep(wrapperData, {
        computed: {
          isInvalidDhcp() {
            return isInvalidDhcp
          },
          proto: () => protoData
        }
      })
    )
    wrapper.vm.deleteDhcp = vi.fn()
    await wrapper.vm.afterSave(null, { data: {} })
    expect(wrapper.vm.deleteDhcp).toBeCalledTimes(deletes ? 1 : 0)
  })
  // isInvalidDhcp() {
  //     return this.dhcpSection !== undefined && this.dhcpSection['.new_section'] === undefined && this.section.proto !== 'static'
  //   }
  it.each`
    dhcpSection                             | section                            | isInvalidDhcp
    ${undefined}                            | ${{ id: 'test', proto: 'none' }}   | ${false}
    ${{ id: 'test', '.new_section': true }} | ${{ id: 'test', proto: 'none' }}   | ${false}
    ${{ id: 'test' }}                       | ${{ id: 'test', proto: 'static' }} | ${false}
    ${{ id: 'test' }}                       | ${{ id: 'test', proto: 'none' }}   | ${true}
  `('returns if dhcp sections needs to be deleted #%#', async ({ dhcpSection, section, isInvalidDhcp }) => {
    wrapper = createWrapper(
      InterfaceEdit,
      combineDeep(wrapperData, {
        data: () => ({
          formData: {
            dhcpv4: dhcpSection ? [dhcpSection] : []
          }
        }),
        props: {
          section
        }
      })
    )
    expect(wrapper.vm.isInvalidDhcp).toEqual(isInvalidDhcp)
  })

  it.each`
    fiberPriority | invoke
    ${'1'}        | ${true}
    ${'0'}        | ${true}
    ${''}         | ${false}
  `('check if updateFiberPriority method called in afterSave when fiber priority is: $fiberPriority', async ({ fiberPriority, invoke }) => {
    wrapper.vm.formData = { interfaces: interfacesData }
    wrapper.vm.updateFiberPriority = vi.fn()
    wrapper.vm.deleteDhcp = vi.fn()
    await wrapper.vm.afterSave(null, { data: { fiber_priority: fiberPriority } })
    expect(wrapper.vm.updateFiberPriority).toBeCalledTimes(invoke ? 1 : 0)
  })

  it('check if updateFiberPriority method update other interface fiber_priority', async () => {
    wrapper.vm.formData = { interfaces: [{ ifname: ['eth1'], fiber_priority: '0' }] }
    wrapper.vm.deleteDhcp = vi.fn()
    await wrapper.vm.afterSave(null, { data: { fiber_priority: '1' } })
    expect(wrapper.vm.formData.interfaces[0].fiber_priority).toEqual('1')
  })

  it('deletes dhcp and reloads them', async () => {
    wrapper.vm.$refs.dhcpConfig = { dhcpSection: [] }
    wrapper.vm.$message.error = vi.fn()
    wrapper.vm.$axios.delete = vi.fn().mockResolvedValue({})
    await wrapper.vm.deleteDhcp({})
    expect(wrapper.vm.$message.error).not.toBeCalled()
  })

  it.each`
    arrayA      | arrayB      | result
    ${['eth0']} | ${['eth0']} | ${true}
    ${['']}     | ${['eth0']} | ${false}
    ${['eth0']} | ${['']}     | ${false}
  `('check if arrayEquals return correct when array equal: $result', async ({ arrayA, arrayB, result }) => {
    expect(wrapper.vm.arrayEquals(arrayA, arrayB)).toEqual(result)
  })

  it.each`
    value                  | response
    ${'01:1E:42:29:C4:84'} | ${{ isValid: false, message: 'Unicast MAC address is allowed (e.g., 00:23:45:67:89:AB).' }}
    ${'testas'}            | ${{ isValid: false, message: 'Mac address of six groups of two hexadecimal digits are accepted (e.g., 00:23:45:67:89:AB).' }}
    ${'00:1E:42:29:C4:84'} | ${{ isValid: true }}
  `('validate MAC address multicast #%#', ({ value, response }) => {
    expect(wrapper.vm.validateMacAddress(value)).toEqual(response)
  })

  it.each`
    value       | section                            | expectedValue
    ${'dhcp'}   | ${{ bridge: '1', ifname: 'eth1' }} | ${true}
    ${'dhcp'}   | ${{ bridge: '0', ifname: 'eth0' }} | ${true}
    ${'dhcp'}   | ${{ bridge: '0', ifname: 'eth3' }} | ${true}
    ${'dhcp'}   | ${{ bridge: '0', ifname: 'eth1' }} | ${false}
    ${'dhcpv6'} | ${{ bridge: '0', ifname: 'eth1' }} | ${true}
    ${'dhcpv6'} | ${{ bridge: '0', ifname: 'eth2' }} | ${false}
  `('validates if dhcp protocols do not colide #%#', async ({ value, section, expectedValue }) => {
    section.area_type = 'wan'
    wrapper.vm.formData.interfaces = [
      { id: 'other1', ifname: ['eth1'], proto: 'dhcp' },
      { id: 'other1', ifname: ['eth2'], proto: 'dhcpv6' },
      { id: 'other1', ifname: ['eth3'], proto: 'static' }
    ]
    await wrapper.setProps({ section })
    expect(wrapper.vm.validateDuplicateProto(value).isValid).toEqual(expectedValue)
  })

  describe('updateModemList()', () => {
    it('Fails to load modem data', async () => {
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      wrapper.vm.$axios.get = vi.fn().mockRejectedValue()
      await wrapper.vm.updateModemList()
      expect(spy).toBeCalledWith('Failed to load modem data')
    })
    it('Successfully loads data', async () => {
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      wrapper.vm.$axios.get = vi.fn().mockResolvedValue({ data: [{ id: '3-1' }] })
      expect(spy).not.toBeCalled()
      expect(await wrapper.vm.updateModemList()).toEqual([{ id: '3-1' }])
    })
  })
})

const interfacesData = [
  { id: 'lan', '.type': 'interface', enabled: '1', ipaddr: '192.168.1.1', netmask: '255.255.255.0', proto: 'static', bridge: '1', ifname: ['eth0'] },
  { id: 'wan', '.type': 'interface', ifname: ['eth1'], fwzone: 'wan', enabled: '1', proto: 'dhcp' },
  { id: 'mob1s1a1', '.type': 'interface', enabled: '1', modem: '1-1', sim: '1', proto: 'wwan', apn: 'wap', auto_apn: '1' }
]

const initialForm = {
  interfaces: interfacesData,
  dhcpSections: []
}

const interfacesStatusData = [
  { id: 'lan', is_up: true, interface: 'lan', uptime: 999 },
  { id: 'wan', is_up: true, interface: 'wan', uptime: 999 },
  { id: 'mob1s1a1', is_up: false, interface: 'mob1s1a1', uptime: 0 }
]

const networkData = [
  { id: 'br-lan', name: 'br-lan', type: 'bridge', 'bridge-members': ['eth0'], virtual: false, macaddr: '00:1e:42:29:c4:88' },
  { id: 'eth0', name: 'eth0', type: 'Network device', virtual: false, macaddr: '00:1e:42:29:c4:66' },
  { id: 'eth1', name: 'eth1', type: 'Network device', virtual: false, macaddr: '00:1e:42:29:c4:99' },
  { id: 'eth0.2', name: 'eth0.2', type: 'VLAN', virtual: false, macaddr: '00:1e:42:29:c4:77' }
]

const vlanInterfaceData = []

const openVpnData = []

const modemData = [
  { name: 'Internal modem', id: '1-1', version: 'test1', sim_count: '2', framed_routing: true },
  { name: 'External modem', id: '1-2', version: 'test2' }
]

const simcardsData = [
  { id: 'cfg01aa0e', '.type': 'sim', modem: '1-1', primary: '1', position: '1' },
  { id: 'cfg02aa0e', '.type': 'sim', modem: '1-1', position: '2' }
]

const ntpData = []

const firewallData = []

const wirelessData = [{ id: 'testWireless', network: 'testWireless' }]

describe('MobileFields.vue', () => {
  let wrapper
  let wrapperData
  beforeEach(() => {
    wrapperData = {
      global: { mocks: { $route: { path: '/interfaces/general' }, $store: reactive(storeData) }, provide: provideData, stubs: componentStubs },
      props: {
        section: {},
        simCards: [],
        modemOptions: [],
        initialApn: '',
        interfaceApns: [],
        uciData: { interfaces: [] },
        interfaceStatuses: [],
        initialInterfaces: []
      }
    }
    wrapper = createWrapper(InterfaceEdit, wrapperData)
  })
  it('check if computed apnList return correct apn list', async () => {
    wrapper = createWrapper(
      MobileFields,
      combineDeep(wrapperData, {
        props: {
          s: {
            id: 'lan',
            '.type': 'interface',
            enabled: '1',
            ipaddr: '192.168.1.1',
            netmask: '255.255.255.0',
            proto: 'wwan',
            bridge: '1',
            ifname: ['eth0'],
            content: { data: { apn_list: [] }, id: 'lan', is_up: true, interface: 'lan', uptime: 999 },
            apnText: '-',
            metric: '1'
          },
          interfaceStatuses: [
            {
              interface: 'lan',
              data: {}
            }
          ]
        }
      })
    )
    await wrapper.setProps({
      s: {
        id: 'lan',
        '.type': 'interface',
        enabled: '1',
        ipaddr: '192.168.1.1',
        netmask: '255.255.255.0',
        proto: 'wwan',
        bridge: '1',
        ifname: ['eth0'],
        content: { data: { apn_list: [] }, id: 'lan', is_up: true, interface: 'lan', uptime: 999 },
        apnText: '-',
        metric: '1'
      },
      interfaceApns: [
        { id: 479, apn: 'wap', carrier: 'Bite Internet' },
        { id: 3200, apn: 'bangapro', carrier: 'Bite' }
      ]
    })
    expect(wrapper.vm.apnList).toEqual([
      ['', '-- Empty --'],
      ['479', 'Bite Internet (wap)'],
      ['3200', 'Bite (bangapro)']
    ])
  })
  it('returns list with empty APN when no access point is available', () => {
    wrapper = createWrapper(
      MobileFields,
      combineDeep(wrapperData, {
        props: {
          s: {
            id: 'lan',
            '.type': 'interface',
            enabled: '1',
            ipaddr: '192.168.1.1',
            netmask: '255.255.255.0',
            proto: 'wwan',
            bridge: '1',
            ifname: ['eth0'],
            content: { data: { apn_list: [] }, id: 'lan', is_up: true, interface: 'lan', uptime: 999 },
            apnText: '-',
            metric: '1'
          }
        }
      })
    )
    expect(wrapper.vm.apnList).toEqual([['', '-- Empty --']])
  })
  it.each`
    state    | res
    ${true}  | ${'/network/mobile/apn_database'}
    ${false} | ${'/system/package_manager?search=APN Database webui'}
  `('check if computed apnDatabaseLink return correct link when APN database webui is installed - $state', async ({ state, res }) => {
    wrapper = createWrapper(
      MobileFields,
      combineDeep(wrapperData, {
        props: {
          s: {
            id: 'lan',
            enabled: '1',
            ipaddr: '192.168.1.1',
            netmask: '255.255.255.0',
            proto: 'wwan',
            bridge: '1',
            ifname: ['eth0'],
            content: { data: { apn_list: [] }, id: 'lan', is_up: true, interface: 'lan', uptime: 999 },
            apnText: '-',
            metric: '1'
          }
        }
      })
    )
    wrapper.vm.$store.hasPackages = vi.fn().mockReturnValue(state)
    expect(wrapper.vm.apnDatabaseLink).toEqual(res)
  })
  it.each`
    text                                 | self                | apnList             | res
    ${'selected APN exists in APN list'} | ${{ model: '479' }} | ${[['479', 'wap']]} | ${false}
    ${'selected APN is custom'}          | ${{ model: 'wap' }} | ${[['479', 'wap']]} | ${true}
  `('check if showAuth returns $res when $text', async ({ self, apnList, res }) => {
    wrapper = createWrapper(
      MobileFields,
      combineDeep(wrapperData, {
        props: {
          s: {
            id: 'lan',
            '.type': 'interface',
            enabled: '1',
            ipaddr: '192.168.1.1',
            netmask: '255.255.255.0',
            proto: 'wwan',
            bridge: '1',
            ifname: ['eth0'],
            content: { data: { apn_list: [] }, id: 'lan', is_up: true, interface: 'lan', uptime: 999 },
            apnText: '-',
            metric: '1'
          }
        },
        computed: {
          ...MobileFields.computed,
          apnList: () => apnList
        }
      })
    )
    await wrapper.vm.onApnSelected(self)
    expect(wrapper.vm.showAuth).toEqual(res)
  })
  it('does not do anything when valid', () => {
    wrapper = createWrapper(
      MobileFields,
      combineDeep(wrapperData, {
        props: {
          s: { modem: '3-1' },
          modemOptions: [['3-1', 'External']]
        }
      })
    )
    vi.spyOn(commonFunctions, 'validateApn').mockReturnValue({ isValid: true })
    wrapper.vm.$mobile.getModemById = vi.fn().mockReturnValueOnce({ modem: '3-1' })
    wrapper.vm.$mobile.shouldShowModemName = vi.fn().mockReturnValueOnce(false)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const field = { model: '1' }
    wrapper.vm.onApnChange(field)
    expect(spy).not.toHaveBeenCalled()
    expect(field.model).toEqual('1')
    vi.clearAllMocks()
  })
  it('reverts field value and shows message when invalid', () => {
    wrapper = createWrapper(
      MobileFields,
      combineDeep(wrapperData, {
        props: {
          s: { modem: '3-1' },
          modemOptions: [['3-1', 'External']]
        }
      })
    )
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    vi.spyOn(commonFunctions, 'validateApn').mockReturnValue({ isValid: false, message: 'Auto APN can be used only with one active interface per SIM.' })
    wrapper.vm.$mobile.getModemById = vi.fn().mockReturnValueOnce({ modem: '3-1' })
    wrapper.vm.$mobile.shouldShowModemName = vi.fn().mockReturnValueOnce(false)
    const field = { model: '1' }
    wrapper.vm.onApnChange(field)
    expect(spy).toHaveBeenCalled()
    expect(field.model).toEqual('0')
    vi.clearAllMocks()
  })
  it('invokes error message when trying to change apn to enable and no section modem value is present', () => {
    wrapper = createWrapper(
      MobileFields,
      combineDeep(wrapperData, {
        props: {
          s: { modem: '' },
          modemOptions: [['3-1', 'External']]
        }
      })
    )
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    vi.spyOn(commonFunctions, 'validateApn').mockReturnValue({ isValid: false, message: 'Auto APN can be used only with one active interface per SIM.' })
    wrapper.vm.$mobile.getModemById = vi.fn().mockReturnValueOnce({ modem: '' })
    wrapper.vm.$mobile.shouldShowModemName = vi.fn().mockReturnValueOnce(false)
    const field = { model: '1' }
    wrapper.vm.onApnChange(field)
    expect(spy).toHaveBeenCalled()
    expect(field.model).toEqual('0')
    vi.clearAllMocks()
  })
  it.each`
    value                  | response
    ${'01:1E:42:29:C4:84'} | ${{ isValid: false, message: 'Unicast MAC address is allowed (e.g., 00:23:45:67:89:AB).' }}
    ${'testas'}            | ${{ isValid: false, message: 'Mac address of six groups of two hexadecimal digits are accepted (e.g., 00:23:45:67:89:AB).' }}
    ${'00:1E:42:29:C4:84'} | ${{ isValid: true }}
  `('validate MAC address multicast', ({ value, response }) => {
    const wrapper = createWrapper(InterfaceEdit, {
      global: { mocks: { $route: { path: '/interfaces/general' }, $store: storeData }, provide: provideData, stubs: componentStubs },
      props: { section: {} }
    })
    expect(wrapper.vm.validateMacAddress(value)).toEqual(response)
  })
  it.each`
    section          | form                                                    | newForm
    ${{ id: 'lan' }} | ${{ dhcpv4: [], dhcpv6: [] }}                           | ${{ dhcpv4: [{ id: 'lan', '.new_section': true }], dhcpv6: [{ id: 'lan', ra: 'server', dhcpv6: 'server' }] }}
    ${{ id: 'lan' }} | ${{ dhcpv4: [{ id: 'lan' }], dhcpv6: [{ id: 'lan' }] }} | ${{ dhcpv4: [{ id: 'lan' }], dhcpv6: [{ id: 'lan' }] }}
  `('creates empty dhcp configs #%#', ({ form, newForm, section }) => {
    const wrapper = createWrapper(InterfaceEdit, {
      global: { mocks: { $route: { path: '/interfaces/general' }, $store: storeData }, provide: provideData, stubs: componentStubs },
      props: { section }
    })
    wrapper.vm.afterLoad(form)
    expect(form).toEqual(newForm)
  })
})
