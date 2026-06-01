import Interfaces from '../../src/views/network/InterfaceSection.vue'
import createWrapper, { mergeDeep } from '@tests/unit/mockFactory'

describe('InterfacesSection.vue', () => {
  let wrapper
  const defaultOptions = {
    props: {
      sectionConfig: {},
      pageType: 'lan'
    },
    global: {
      mocks: {
        $store: {
          board: {
            hwinfo: {
              wifi: true
            }
          }
        }
      }
    }
  }
  beforeEach(() => {
    wrapper = createWrapper(Interfaces, defaultOptions)
  })

  it('returns empty modemlist', () => {
    wrapper.vm.$mobile.modemOptions = vi.fn().mockReturnValueOnce()
    expect(wrapper.vm.modemOptions).toEqual([])
  })

  it.each`
    pageType | expectedResult
    ${'lan'} | ${false}
    ${'wan'} | ${true}
  `('return $expectedResult when pageType: $pageType', async ({ pageType, expectedResult }) => {
    const wrapper = createWrapper(
      Interfaces,
      mergeDeep(defaultOptions, {
        props: { pageType }
      })
    )
    expect(wrapper.vm.draggable).toEqual(expectedResult)
  })

  it('reorders data', () => {
    const data = [
      { metric: '6', sectionName: 'lan' },
      { metric: '1', sectionName: 'wan' },
      { metric: '3', sectionName: 'test' }
    ]
    wrapper.vm.formData.interfaces = [{ id: 'lan' }, { id: 'wan' }, { id: 'test' }]
    wrapper.vm.reorderData(data)
    expect(wrapper.vm.formData.interfaces).toEqual([
      { metric: '1', sectionName: 'lan' },
      { metric: '2', sectionName: 'wan' },
      { metric: '3', sectionName: 'test' }
    ])
  })

  it('reorders data and updates allInterfaces array', () => {
    const data = [
      { metric: '2', sectionName: 'mob' },
      { metric: '1', sectionName: 'wan' },
      { metric: '3', sectionName: 'mob2' }
    ]
    wrapper.vm.otherInterfacess = []
    wrapper.vm.editModalClosed({ interfaces: data })
    expect(wrapper.vm.allInterfaces).toEqual([
      { metric: '1', sectionName: 'wan' },
      { metric: '2', sectionName: 'mob' },
      { metric: '3', sectionName: 'mob2' }
    ])
  })

  it.each`
    name                                                      | pageType | modemList                            | allInterfaces                                    | formData                                                         | response
    ${'page is LAN'}                                          | ${'lan'} | ${[{}]}                              | ${[{ id: 'mob1', proto: 'wwan' }]}               | ${{ interfaces: [{ id: 'mob1', proto: 'wwan' }] }}               | ${{ valid: true }}
    ${'device without modems'}                                | ${'wan'} | ${[]}                                | ${[{ id: 'mob1', proto: 'wwan' }]}               | ${{ interfaces: [{ id: 'mob1', proto: 'wwan' }] }}               | ${{ valid: true }}
    ${'modem supports multi APN functionality'}               | ${'wan'} | ${[{ id: '3-1', multi_apn: true }]}  | ${[{ id: 'mob1', proto: 'wwan' }]}               | ${{ interfaces: [{ id: 'mob1', proto: 'wwan' }] }}               | ${{ valid: true }}
    ${'modem does not support multi APN and no changes made'} | ${'wan'} | ${[{ id: '3-1', multi_apn: false }]} | ${[{ id: 'mob1', proto: 'wwan' }]}               | ${{ interfaces: [{ id: 'mob1', proto: 'wwan' }] }}               | ${{ valid: true }}
    ${'modem does not support multi APN and changes made'}    | ${'wan'} | ${[{ id: '3-1', multi_apn: false }]} | ${[{ id: 'mob1', proto: 'wwan', enabled: '1' }]} | ${{ interfaces: [{ id: 'mob1', proto: 'wwan', enabled: '0' }] }} | ${{ valid: false, message: 'To create new instance, unsaved changes to mobile interfaces need to be saved or reverted' }}
  `('checks add validation when $name', async ({ pageType, modemList, allInterfaces, formData, response }) => {
    wrapper.vm.formOptions.modemList = modemList
    wrapper.vm.formData.interfaces = formData.interfaces
    wrapper.vm.allInterfaces = allInterfaces
    await wrapper.setProps({ pageType })
    expect(wrapper.vm.addValidate()).toEqual(response)
  })

  it('adds page type when creating new interface', async () => {
    const areaType = 'nal'
    await wrapper.setProps({ pageType: areaType })
    const newIface = { id: 'new interface' }
    wrapper.vm.beforeAdd(newIface)
    expect(newIface).toEqual({ ...newIface, area_type: areaType })
  })

  it.each`
    name                                                 | failsRule | currentMsg       | expectedMsg           | isMsgCalled | isMsgRemoved
    ${'does nothing when interface has correct rule'}    | ${false}  | ${undefined}     | ${undefined}          | ${false}    | ${false}
    ${'does nothing when interface has correct rule'}    | ${false}  | ${undefined}     | ${undefined}          | ${false}    | ${false}
    ${'shows new message and there is no old to remove'} | ${true}   | ${undefined}     | ${expect.any(String)} | ${true}     | ${false}
    ${'shows new message and removes old'}               | ${true}   | ${'Old warning'} | ${expect.any(String)} | ${true}     | ${true}
    ${'removes old message and does not show new'}       | ${false}  | ${'Old warning'} | ${undefined}          | ${false}    | ${true}
  `('$name', ({ failsRule, currentMsg, expectedMsg, isMsgCalled, isMsgRemoved }) => {
    const interfaces = [{ id: 'lan' }]
    const spyWarning = vi.spyOn(wrapper.vm.$notification, 'info')
    const spyRemove = vi.spyOn(wrapper.vm.$notification, 'remove')
    const errorName = 'metu1280'
    wrapper.vm.currentMsgs[errorName] = currentMsg
    wrapper.vm.showSideMessage(interfaces, errorName, () => failsRule, '%s')
    expect(wrapper.vm.currentMsgs[errorName]).toEqual(expectedMsg)
    expect(spyWarning).toBeCalledTimes(isMsgCalled ? 1 : 0)
    expect(spyRemove).toBeCalledTimes(isMsgRemoved ? 1 : 0)
  })

  it('calls showSideMessage', async () => {
    const spy = vi.spyOn(wrapper.vm, 'showSideMessage')
    await wrapper.setData({ formData: { interfaces: [{ id: 'lan' }] } })
    expect(spy).toBeCalledTimes(2)
  })

  it.each`
    section           | formOptions                                                   | res
    ${{ id: 'lan' }}  | ${{ wirelessNetworks: [{ network: 'lan', ssid: 'lan_ap' }] }} | ${{ network: 'lan', ssid: 'lan_ap' }}
    ${{ id: 'test' }} | ${{ wirelessNetworks: [{ network: 'lan', ssid: 'lan_ap' }] }} | ${undefined}
  `('checks whether network interface is in use by wireless interface when section is $section and form options are $formOptions', ({ section, formOptions, res }) => {
    wrapper.vm.formOptions = formOptions
    expect(wrapper.vm.interfaceInUse(section)).toEqual(res)
  })

  it.each`
    section                         | formOptions                                                                                          | res
    ${{ id: 'lan', name: 'lan' }}   | ${{ wirelessNetworks: [{ network: 'lan', ssid: 'lan_ap' }], hotspotInstances: [] }}                  | ${[{ info: 'Interface "lan" is associated with the following WiFi network: lan_ap. Please disassociate the WiFi network before removing this interface.' }]}
    ${{ id: 'test', name: 'test' }} | ${{ wirelessNetworks: [{ network: 'lan', ssid: 'lan_ap' }], hotspotInstances: [] }}                  | ${[]}
    ${{ id: 'lan', name: 'lan' }}   | ${{ wirelessNetworks: [], hotspotInstances: [{ network: 'lan', id: 'lanTest' }] }}                   | ${[{ info: 'Interface "lan" is associated with the Hotspot instance. Please delete hotspot instance before removing this interface.' }]}
    ${{ id: 'lan', name: 'lan' }}   | ${{ wirelessNetworks: [], hotspotInstances: [{ network: 'test', moreif: ['lan'], id: 'lanTest' }] }} | ${[{ info: 'Interface "lan" is associated with the Hotspot instance. Please delete hotspot instance before removing this interface.' }]}
  `('handles delete hint display when section is $section, form options are $formOptions and hint is $hint', ({ section, formOptions, res }) => {
    wrapper.vm.formOptions = formOptions
    expect(wrapper.vm.deleteHints(section)).toEqual(res)
  })

  it.each`
    initial                                    | current                                    | res
    ${{ enabled: '1' }}                        | ${{ enabled: '0' }}                        | ${false}
    ${{ method: 'passthrough', enabled: '1' }} | ${{ method: 'passthrough', enabled: '1' }} | ${false}
    ${{ method: 'passthrough', enabled: '0' }} | ${{ method: 'passthrough', enabled: '0' }} | ${false}
    ${{ method: 'passthrough', enabled: '1' }} | ${{ method: 'passthrough', enabled: '0' }} | ${true}
    ${{ method: 'passthrough', enabled: '0' }} | ${{ method: 'passthrough', enabled: '1' }} | ${true}
  `('returns if networkAwait is needed #%#', ({ initial, current, res }) => {
    wrapper.vm.formData = { interfaces: [{ id: 'lan', ...current }] }
    wrapper.vm.$refs.vuciForm.initialForm = { interfaces: [{ id: 'lan', ...initial }] }
    expect(wrapper.vm.awaitNetwork).toEqual(res)
  })

  describe('status column generation', () => {
    describe('findIfaceStatus()', () => {
      it('returns interface status when it finds it', () => {
        const expectedResult = { id: 'test' }
        wrapper.vm.formOptions.interfaceStatus = [{ id: 'lan' }, expectedResult, { id: 'wan' }]
        const result = wrapper.vm.findIfaceStatus(expectedResult)
        expect(result).toEqual(expectedResult)
      })
      it('returns empty object when it does not find it', () => {
        wrapper.vm.formOptions.interfaceStatus = [{ id: 'lan' }, { id: 'test' }, { id: 'wan' }]
        const result = wrapper.vm.findIfaceStatus({ id: 'newTest' })
        expect(result).toEqual(undefined)
      })
      it('returns mobile interface status when it finds it', () => {
        const expectedResult = { id: 'mob1', proto: 'wwan', 'ipv6-prefix': [{ address: '123' }] }
        wrapper.vm.formOptions.interfaceStatus = [{ id: 'lan' }, expectedResult]
        const result = wrapper.vm.findIfaceStatus(expectedResult)
        expect(result).toEqual(expectedResult)
      })
    })

    it.each`
      content                                                     | result
      ${{}}                                                       | ${undefined}
      ${{ macaddr: '00:00:00:00:00:00', network_type: 'mobile' }} | ${''}
      ${{ macaddr: '00:00:00:00:00:00', proto: 'pppoe' }}         | ${''}
      ${{ macaddr: 'C1-3D-6F-7D-AE-37', proto: 'pppoe' }}         | ${'C1-3D-6F-7D-AE-37'}
      ${{ macaddr: 'C1-3D-6F-7D-AE-37', network_type: 'mobile' }} | ${'C1-3D-6F-7D-AE-37'}
    `('returns macAddr when content is $content', ({ content, result }) => {
      const res = wrapper.vm.parseMacAddr(content)
      expect(res).toBe(result)
    })
  })

  describe('data loading', () => {
    describe('updateData()', () => {
      it('Request fails', async () => {
        const spy = vi.spyOn(wrapper.vm.$message, 'error')
        wrapper.vm.$axios.get = vi.fn().mockRejectedValue()
        await wrapper.vm.updateData()
        expect(spy).toBeCalledWith('An unexpected error occurred')
      })
      it('Successfully loads data', async () => {
        const formOptions = { interfaceStatus: [{ id: 'lan' }], networkDevices: [{ id: 'br-lan' }] }
        const wrapper = createWrapper(Interfaces, mergeDeep(defaultOptions))
        wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValue([
          { success: true, data: formOptions.interfaceStatus },
          { success: true, data: formOptions.networkDevices }
        ])
        await wrapper.vm.updateData()
        expect(wrapper.vm.formOptions).toMatchObject(formOptions)
      })
    })
    describe('afterLoad()', () => {
      const endpoints = [
        '/api/interfaces/basic/status?include=vpn',
        '/api/basic/network/devices/status',
        '/api/firewall/zones/config',
        '/api/interface_based_vlan/config',
        '/api/interface_based_vlan/devices/status',
        '/api/dhcp/servers/ipv4/config',
        '/api/dhcp/servers/ipv6/config'
      ]
      it('Everything is success false', async () => {
        const bulkSize = endpoints.length
        const spy = vi.spyOn(wrapper.vm.$message, 'error')
        wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValue(Array.from({ length: bulkSize }, () => ({ success: false })))
        await wrapper.vm.afterLoad()
        expect(spy).toBeCalledTimes(bulkSize - 1)
      })
      it('BulkGet fails', async () => {
        const spy = vi.spyOn(wrapper.vm.$message, 'error')
        wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValue()
        await wrapper.vm.afterLoad()
        expect(spy).toBeCalledWith('An unexpected error occurred')
      })
      it('Successfully loads data', async () => {
        const interfaceBased = [{ name: 'aa', ifname: 'eth0' }]
        const interfaceBasedDevices = [{ name: 'bb', ifname: 'aa' }]
        const dhcpv4 = [{ id: 'lan' }]
        const dhcpv6 = [{ id: 'lan' }]
        const formOptions = {
          interfaceStatus: [{ name: 'lan' }],
          networkDevices: [{ name: 'br-lan' }],
          fwZones: [{ name: 'lan' }],
          vlanInterfaceDevices: [...interfaceBased, ...interfaceBasedDevices]
        }
        const aditionalAfterReturn = { section: [{ id: '1' }] }
        const additionalAfterEndpoints = ['/interfaces/something']
        const additionalAfterLoad = vi.fn().mockResolvedValue(aditionalAfterReturn)
        const wrapper = createWrapper(
          Interfaces,
          mergeDeep(defaultOptions, {
            props: { additionalAfterLoad, additionalAfterEndpoints }
          })
        )
        const additionalResponse = { success: true, data: { id: '1', type: 'something' } }
        wrapper.vm.$axios.bulkGet = vi
          .fn()
          .mockResolvedValue([
            { success: true, data: formOptions.interfaceStatus },
            { success: true, data: formOptions.networkDevices },
            { success: true, data: formOptions.fwZones },
            { success: true, data: interfaceBased },
            { success: true, data: interfaceBasedDevices },
            { success: true, data: dhcpv4 },
            { success: true, data: dhcpv6 },
            additionalResponse
          ])

        expect(await wrapper.vm.afterLoad({})).toEqual(aditionalAfterReturn)
        expect(additionalAfterLoad).toBeCalledWith({ dhcpv4, dhcpv6 }, wrapper.vm.formOptions, [additionalResponse])
        expect(wrapper.vm.$axios.bulkGet).toBeCalledWith([...endpoints, ...additionalAfterEndpoints])
        expect(wrapper.vm.formOptions).toMatchObject(formOptions)
      })
    })
    describe('extraLoad()', () => {
      const endpoints = [
        {
          endpoint: '/api/wireless/interfaces/config',
          condition: true
        },
        {
          endpoint: '/api/hotspot/config',
          condition: 'coovachilli-api'
        }
      ]
      it('Everything is success false', async () => {
        const bulkSize = endpoints.length
        const spy = vi.spyOn(wrapper.vm.$message, 'error')
        wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValue(Array.from({ length: bulkSize }, () => ({ success: false })))
        await wrapper.vm.extraLoad({ interfaces: [] })
        expect(spy).toBeCalledTimes(bulkSize)
      })
      it('BulkGet fails', async () => {
        const spy = vi.spyOn(wrapper.vm.$message, 'error')
        wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValue()
        await wrapper.vm.extraLoad({ interfaces: [] })
        expect(spy).toBeCalledWith('An unexpected error occurred')
      })
      it('Successfully loads data', async () => {
        const formOptions = {
          wirelessNetworks: [{ id: 'RUTX11' }],
          hotspotInstances: [{ id: '1' }]
        }
        const aditionalAfterReturn = { section: [{ id: '1' }] }
        const additionalExtraEndpoints = ['/interfaces/something']
        const additionalExtraLoad = vi.fn().mockResolvedValue(aditionalAfterReturn)
        const wrapper = createWrapper(
          Interfaces,
          mergeDeep(defaultOptions, {
            props: { additionalExtraLoad, additionalExtraEndpoints }
          })
        )
        const additionalResponse = { success: true, data: { id: '1', type: 'something' } }
        wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValue([{ success: true, data: formOptions.wirelessNetworks }, { success: true, data: formOptions.hotspotInstances }, additionalResponse])

        const inputIfaces = [
          { id: 'lan1', area_type: 'lan' },
          { id: 'wan1', area_type: 'wan' }
        ]
        const outputIfaces = [{ id: 'wan1', area_type: 'wan' }]

        expect(await wrapper.vm.extraLoad({ interfaces: inputIfaces })).toEqual(aditionalAfterReturn)
        expect(additionalExtraLoad).toBeCalledWith({ interfaces: outputIfaces }, wrapper.vm.formOptions, [additionalResponse])
        expect(wrapper.vm.$axios.bulkGet).toBeCalledWith([...endpoints, ...additionalExtraEndpoints])
        expect(wrapper.vm.formOptions).toMatchObject(formOptions)
      })
    })
  })
})
