import createWrapper, { combineDeep } from '@tests/unit/mockFactory'
import WirelessEdit from '../../../src/views/network/wirelessInterface/WirelessInterfaceEdit.vue'
import { FormOptionKey } from '../../../src/views/network/wirelessInterface/WirelessInterfaceCommon'
import NetworkAutoConfig from '../../../src/components/NetworkAutoConfig'
import { defineComponent, ref } from 'vue'
import { axios } from '@ui-core/plugins/axios'

vi.mock('../../../src/components/NetworkAutoConfig')
vi.mock('@ui-core/plugins/messages')
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({
    path: ''
  }),
  useRouter: () => ({
    push: vi.fn()
  })
}))

vi.mock('@ui-core/plugins/session', async importOriginal => ({
  ...(await importOriginal()),
  session: { hasAccess: () => true }
}))

describe('WirelessInterfaceEdit.vue', () => {
  let setSection = vi.fn()
  let modalData = vi.fn(() => ({
    vuciForm: {
      initialForm: {
        wifiVlans: []
      }
    },
    uciData: {
      wifiVlans: []
    }
  }))
  let wrapper
  const wrapperOptions = {
    shallow: true,
    props: {
      section: {
        id: '1',
        eap_type: 'not-tls',
        multiple: '0',
        mode: 'sta',
        encryption: '',
        device: 'radio0'
      },
      name: {
        initialTab: '123',
        revert: vi.fn()
      }
    },
    global: {
      stubs: {
        TltTabs: defineComponent({
          template: `<div></div>`
        })
      },
      provide: {
        [FormOptionKey]: {
          networkDeviceStatus: ref([
            { id: 'br_lan', name: 'br-lan', type: 'bridge' },
            { id: 'eth1', type: 'Network device' }
          ]),
          macAddresses: ref([[]]),
          deviceOptions: ref([{ radio0: { id: 'radio0', features: {} } }]),
          deviceStatus: ref([[]]),
          ifaceStatus: ref([{ id: '1' }]),
          certData: ref([[]]),
          wifiInterfaces: ref([[]]),
          interfaceConfigs: ref([{ name: 'lan' }, { name: 'wan' }]),
          bridgeConfigs: ref([[]]),
          deviceConfigs: ref([{ id: 'radio0' }])
        },
        setSection,
        modalData
      }
    }
  }
  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = createWrapper(WirelessEdit, wrapperOptions)
    wrapper.vm.formRef.validate = () => true
  })
  it.each([
    { return: 'no', mode: 'ap', deviceFeatures: { hostapd: false, supplicant: false, encryption: { ap_sae: true } }, expectedResult: [['none', expect.any(String)]] },
    {
      return: 'ap_sae',
      mode: 'ap',
      deviceFeatures: { hostapd: true, supplicant: false, encryption: { ap_sae: true } },
      expectedResult: [
        ['sae', expect.any(String), true],
        ['sae-mixed', expect.any(String), true],
        ['psk2', expect.any(String)],
        ['ppsk2', expect.any(String), true],
        ['wpa3', expect.any(String), undefined],
        ['wpa3-mixed', expect.any(String), undefined],
        ['wpa2', expect.any(String), undefined],
        ['psk-mixed', expect.any(String)],
        ['psk', expect.any(String)],
        ['wpa', expect.any(String), undefined],
        ['owe', expect.any(String), undefined],
        ['none', expect.any(String)]
      ]
    },
    {
      return: 'sta_sae',
      mode: 'sta',
      deviceFeatures: { hostapd: true, supplicant: false, encryption: { sta_sae: true } },
      expectedResult: [
        ['sae', expect.any(String), true],
        ['sae-mixed', expect.any(String), true],
        ['psk2', expect.any(String)],
        ['ppsk2', expect.any(String), false],
        ['wpa3', expect.any(String), undefined],
        ['wpa3-mixed', expect.any(String), undefined],
        ['wpa2', expect.any(String), undefined],
        ['psk-mixed', expect.any(String)],
        ['psk', expect.any(String)],
        ['wpa', expect.any(String), undefined],
        ['owe', expect.any(String), undefined],
        ['none', expect.any(String)]
      ]
    },
    {
      return: 'ap_eap',
      mode: 'ap',
      deviceFeatures: { hostapd: true, supplicant: false, encryption: { ap_eap: true } },
      expectedResult: [
        ['sae', expect.any(String), undefined],
        ['sae-mixed', expect.any(String), undefined],
        ['psk2', expect.any(String)],
        ['ppsk2', expect.any(String), true],
        ['wpa3', expect.any(String), undefined],
        ['wpa3-mixed', expect.any(String), undefined],
        ['wpa2', expect.any(String), true],
        ['psk-mixed', expect.any(String)],
        ['psk', expect.any(String)],
        ['wpa', expect.any(String), true],
        ['owe', expect.any(String), undefined],
        ['none', expect.any(String)]
      ]
    },
    {
      return: 'sta_eap',
      mode: 'sta',
      deviceFeatures: { hostapd: true, supplicant: false, encryption: { sta_eap: true } },
      expectedResult: [
        ['sae', expect.any(String), undefined],
        ['sae-mixed', expect.any(String), undefined],
        ['psk2', expect.any(String)],
        ['ppsk2', expect.any(String), false],
        ['wpa3', expect.any(String), undefined],
        ['wpa3-mixed', expect.any(String), undefined],
        ['wpa2', expect.any(String), true],
        ['psk-mixed', expect.any(String)],
        ['psk', expect.any(String)],
        ['wpa', expect.any(String), true],
        ['owe', expect.any(String), undefined],
        ['none', expect.any(String)]
      ]
    },
    {
      return: 'ap_owe',
      mode: 'ap',
      deviceFeatures: { hostapd: true, supplicant: false, encryption: { ap_owe: true } },
      expectedResult: [
        ['sae', expect.any(String), undefined],
        ['sae-mixed', expect.any(String), undefined],
        ['psk2', expect.any(String)],
        ['ppsk2', expect.any(String), true],
        ['wpa3', expect.any(String), undefined],
        ['wpa3-mixed', expect.any(String), undefined],
        ['wpa2', expect.any(String), undefined],
        ['psk-mixed', expect.any(String)],
        ['psk', expect.any(String)],
        ['wpa', expect.any(String), undefined],
        ['owe', expect.any(String), true],
        ['none', expect.any(String)]
      ]
    },
    {
      return: 'sta_owe',
      mode: 'sta',
      deviceFeatures: { hostapd: true, supplicant: false, encryption: { sta_owe: true } },
      expectedResult: [
        ['sae', expect.any(String), undefined],
        ['sae-mixed', expect.any(String), undefined],
        ['psk2', expect.any(String)],
        ['ppsk2', expect.any(String), false],
        ['wpa3', expect.any(String), undefined],
        ['wpa3-mixed', expect.any(String), undefined],
        ['wpa2', expect.any(String), undefined],
        ['psk-mixed', expect.any(String)],
        ['psk', expect.any(String)],
        ['wpa', expect.any(String), undefined],
        ['owe', expect.any(String), true],
        ['none', expect.any(String)]
      ]
    },
    {
      return: 'ap_eap192',
      mode: 'ap',
      deviceFeatures: { hostapd: true, supplicant: false, encryption: { ap_eap192: true } },
      expectedResult: [
        ['sae', expect.any(String), undefined],
        ['sae-mixed', expect.any(String), undefined],
        ['psk2', expect.any(String)],
        ['ppsk2', expect.any(String), true],
        ['wpa3', expect.any(String), true],
        ['wpa3-mixed', expect.any(String), true],
        ['wpa2', expect.any(String), undefined],
        ['psk-mixed', expect.any(String)],
        ['psk', expect.any(String)],
        ['wpa', expect.any(String), undefined],
        ['owe', expect.any(String), undefined],
        ['none', expect.any(String)]
      ]
    },
    {
      return: 'sta_eap192',
      mode: 'sta',
      deviceFeatures: { hostapd: true, supplicant: false, encryption: { sta_eap192: true } },
      expectedResult: [
        ['sae', expect.any(String), undefined],
        ['sae-mixed', expect.any(String), undefined],
        ['psk2', expect.any(String)],
        ['ppsk2', expect.any(String), false],
        ['wpa3', expect.any(String), true],
        ['wpa3-mixed', expect.any(String), true],
        ['wpa2', expect.any(String), undefined],
        ['psk-mixed', expect.any(String)],
        ['psk', expect.any(String)],
        ['wpa', expect.any(String), undefined],
        ['owe', expect.any(String), undefined],
        ['none', expect.any(String)]
      ]
    },
    {
      return: 'mesh',
      mode: 'mesh',
      deviceFeatures: { hostapd: true, supplicant: true, encryption: { ap_sae: true, sta_sae: true } },
      expectedResult: [
        ['sae', expect.any(String), true],
        ['none', expect.any(String)]
      ]
    }
  ])('returns $return encryption methods', ({ deviceFeatures, expectedResult, mode }) => {
    wrapper = createWrapper(
      WirelessEdit,
      combineDeep(wrapperOptions, {
        global: {
          provide: {
            [FormOptionKey]: {
              deviceOptions: ref([{ id: 'radio0', features: deviceFeatures }])
            }
          },
          mocks: {
            $store: {
              getters: {
                isRouter: true
              }
            }
          }
        },
        props: {
          section: { mode }
        }
      })
    )
    expect(wrapper.vm.encryptionOptions).toEqual(expectedResult)
  })
  it.each`
    mode      | expectedResponse
    ${'psk'}  | ${false}
    ${'psk2'} | ${false}
    ${'none'} | ${true}
  `('returns $expectedResponse when mode: $mode', ({ mode, expectedResponse }) => {
    wrapper.vm.section.encryption = mode
    expect(wrapper.vm.disablePassword).toEqual(expectedResponse)
  })
  it('do not remove password if password do not need to be hidden', async () => {
    await wrapper.setProps({ section: { encryption: 'sae' } })
    await wrapper.setProps({ section: { encryption: 'none' } })
    const mockSection = {}
    setSection.mock.calls[0][0](mockSection)
    expect(mockSection).toEqual({ key: '' })
  })
  it.each`
    section                                                        | expectedResult
    ${{ encryption: 'wpa3', ieee80211r: '1', mode: 'ap' }}         | ${[{ name: 'general', title: 'General Setup' }, { name: 'additional', title: 'Additional Settings', show: true }, { name: 'encryption', title: 'Wireless Security', show: true }, { name: 'vlans', title: 'VLANs', show: false }, { name: 'fastTransition', title: 'Fast Transition', show: true }, { name: 'bgScan', title: 'Fast Roaming', show: false }, { name: 'advanced', title: 'Advanced Settings', show: true }, { name: 'macfilter', title: 'MAC-Filter', show: true }]}
    ${{ encryption: 'psk', ieee80211r: '0', bgscan_enabled: '1' }} | ${[{ name: 'general', title: 'General Setup' }, { name: 'additional', title: 'Additional Settings', show: true }, { name: 'encryption', title: 'Wireless Security', show: true }, { name: 'vlans', title: 'VLANs', show: false }, { name: 'fastTransition', title: 'Fast Transition', show: false }, { name: 'bgScan', title: 'Fast Roaming', show: true }, { name: 'advanced', title: 'Advanced Settings', show: true }, { name: 'macfilter', title: 'MAC-Filter', show: false }]}
    ${{ encryption: 'ppsk2', radius_ppsk: '1' }}                   | ${[{ name: 'general', title: 'General Setup' }, { name: 'additional', title: 'Additional Settings', show: true }, { name: 'encryption', title: 'Wireless Security', show: true }, { name: 'vlans', title: 'VLANs', show: true }, { name: 'fastTransition', title: 'Fast Transition', show: false }, { name: 'bgScan', title: 'Fast Roaming', show: false }, { name: 'advanced', title: 'Advanced Settings', show: true }, { name: 'macfilter', title: 'MAC-Filter', show: false }]}
  `('returns tabs #%#', async ({ section, expectedResult }) => {
    wrapper = createWrapper(
      WirelessEdit,
      combineDeep(wrapperOptions, {
        props: {
          section
        }
      })
    )
    expect(wrapper.vm.tabs).toEqual(expectedResult)
  })
  it.each`
    mode          | value                   | expectedResult
    ${'ap'}       | ${['radio0']}           | ${{ isValid: true }}
    ${'sta'}      | ${['radio0']}           | ${{ isValid: true }}
    ${'multi_ap'} | ${['radio0']}           | ${{ isValid: true }}
    ${'mesh'}     | ${['radio0']}           | ${{ isValid: true }}
    ${'ap'}       | ${['radio0', 'radio1']} | ${{ isValid: true }}
    ${'sta'}      | ${['radio0', 'radio1']} | ${{ isValid: false, message: 'Client, Mesh and Multi AP interfaces can only have one radio' }}
    ${'multi_ap'} | ${['radio0', 'radio1']} | ${{ isValid: false, message: 'Client, Mesh and Multi AP interfaces can only have one radio' }}
    ${'mesh'}     | ${['radio0', 'radio1']} | ${{ isValid: false, message: 'Client, Mesh and Multi AP interfaces can only have one radio' }}
  `('validates client devices #%#', async ({ mode, value, expectedResult }) => {
    await wrapper.setProps({ section: { mode } })
    const res = wrapper.vm.validateClientDevices(value)
    expect(res).toEqual(expectedResult)
  })
  it.each`
    mode     | expectedResult
    ${'ap'}  | ${true}
    ${'sta'} | ${false}
  `('returns isAp #%#', async ({ mode, expectedResult }) => {
    await wrapper.setProps({ section: { mode } })
    expect(wrapper.vm.isAp).toEqual(expectedResult)
  })
  it.each`
    value     | wifiInterfaces                                                 | expectedResult
    ${'test'} | ${[]}                                                          | ${true}
    ${'test'} | ${[{ mode: 'ap', ssid: 'test', id: '1', device: ['radio0'] }]} | ${false}
    ${'test'} | ${[{ mode: 'ap', ssid: 'test', id: '1', device: ['radio1'] }]} | ${true}
  `('validateSSID() returns isValid: $expectedResult when value: $value, fieldvalidation: $fieldvalidation', async ({ value, wifiInterfaces, expectedResult }) => {
    wrapper.vm.formData = {
      wifiInterfaces,
      wifiDevices: []
    }
    await wrapper.setProps({ section: { mode: 'ap', id: '2', device: ['radio0'], ssid: 'test' } })
    const result = wrapper.vm.validateSSID(value)
    expect(result.isValid).toEqual(expectedResult)
  })
  it.each`
    networks                                                   | expectedResult
    ${[{ name: 'lan' }, { name: 'wan' }]}                      | ${'wifi0'}
    ${[{ name: 'lan' }, { name: 'wifi2' }, { name: 'wan' }]}   | ${'wifi0'}
    ${[{ name: 'lan' }, { name: 'wifi1' }, { name: 'wifi0' }]} | ${'wifi2'}
  `('returns generated name #%#', ({ networks, expectedResult }) => {
    wrapper = createWrapper(
      WirelessEdit,
      combineDeep(wrapperOptions, {
        global: {
          provide: {
            [FormOptionKey]: {
              interfaceConfigs: ref(networks)
            }
          }
        }
      })
    )
    expect(wrapper.vm.autoName).toEqual(expectedResult)
  })

  it.each`
    section                                                                       | interfaces
    ${{ id: '1', ssid: 'test', mode: 'ap', encryption: 'none' }}                  | ${[{ id: '2', ssid: 'test', mode: 'ap', encryption: 'psk', key: '12345678' }]}
    ${{ id: '1', ssid: 'test', mode: 'ap', encryption: 'psk2', key: '12465456' }} | ${[{ id: '2', ssid: 'test', mode: 'ap', encryption: 'psk', key: '12345678' }]}
    ${{ id: '1', ssid: 'test', mode: 'ap', encryption: 'psk', key: '12465456' }}  | ${[{ id: '2', ssid: 'test', mode: 'ap', encryption: 'psk', key: '12345678' }]}
    ${{ id: '1', ssid: 'test', mode: 'ap', encryption: 'psk2', key: '12465456' }} | ${[{ id: '2', ssid: 'test', mode: 'ap', encryption: 'none' }]}
  `('method beforeSave(). Checks whether fields of existing SSID section have changed #%#', async ({ section, interfaces }) => {
    await wrapper.setProps({ section })
    const spy = vi.spyOn(wrapper.vm.prompt, 'show')
    wrapper.vm.formRef = { validate: vi.fn(() => true) }
    wrapper.vm.formData.wifiInterfaces = interfaces
    wrapper.vm.prompt.show.mockImplementation(({ onOk }) => onOk())
    await wrapper.vm.beforeSave()
    expect(spy).toHaveBeenCalled()
  })

  it.each`
    section                                                           | interfaces
    ${{ id: '1', ssid: 'test', mode: 'ap', encryption: 'none' }}      | ${[{ id: '2', ssid: 'test', mode: 'client', encryption: 'psk', key: '12345678' }]}
    ${{ id: '1', ssid: 'test', mode: 'ap', encryption: 'none' }}      | ${[{ id: '2', ssid: 'test123', mode: 'ap', encryption: 'psk', key: '12345678' }]}
    ${{ id: '1', ssid: 'test', mode: 'client', encryption: 'none' }}  | ${[{ id: '2', ssid: 'test', mode: 'client', encryption: 'none' }]}
    ${{ id: '1', mesh_id: 'test', mode: 'mesh', encryption: 'none' }} | ${[{ id: '2', mesh_id: 'test', mode: 'mesh', encryption: 'psk', key: 'test' }]}
  `('method beforeSave(). Checks whether fields of existing SSID section have not changed #%#', async ({ section, interfaces }) => {
    await wrapper.setProps({ section })
    const spy = vi.spyOn(wrapper.vm.prompt, 'show')
    wrapper.vm.formRef = { validate: vi.fn(() => true) }
    wrapper.vm.formData.wifiInterfaces = interfaces
    wrapper.vm.prompt.show.mockImplementation(({ onOk }) => onOk())
    await wrapper.vm.beforeSave()
    expect(spy).not.toHaveBeenCalled()
  })

  it.each`
    section                                 | deviceConfigs                          | expectedResult
    ${{ mode: 'mesh', device: undefined }}  | ${[{ id: 'radio0', channel: 'auto' }]} | ${true}
    ${{ mode: 'mesh', device: ['radio0'] }} | ${[{ id: 'radio0', channel: 'auto' }]} | ${true}
    ${{ mode: 'mesh', device: undefined }}  | ${[{ id: 'radio0', channel: '1' }]}    | ${false}
    ${{ mode: 'mesh', device: ['radio0'] }} | ${[{ id: 'radio0', channel: '1' }]}    | ${false}
    ${{ mode: 'ap', device: ['radio0'] }}   | ${[{ id: 'radio0', channel: '1' }]}    | ${false}
  `('Returns auto channel warning #%#', async ({ section, deviceConfigs, expectedResult }) => {
    wrapper = createWrapper(
      WirelessEdit,
      combineDeep(wrapperOptions, {
        props: {
          section
        },
        global: {
          provide: {
            [FormOptionKey]: {
              deviceConfigs: ref(deviceConfigs)
            }
          }
        }
      })
    )
    expect(wrapper.vm.radioAutoWarning).toEqual(expectedResult)
  })

  it('method staReconnect(). Successfully reconnects to the access point', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ success: true })
    const spy = vi.spyOn(wrapper.vm.message, 'success')
    await wrapper.vm.staReconnect()
    expect(spy).toHaveBeenCalledWith('Reconnecting to the access point')
  })

  it('method staReconnect(). Fails to reconnect to the access point', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue({ success: false })
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.staReconnect()
    expect(spy).toHaveBeenCalledWith('Failed to reconnect to the access point')
  })
  it('beforeSave() does not use NetworkAutoConfig', async () => {
    wrapper.vm.$store.isAccessPoint = false
    await wrapper.vm.beforeSave()
    expect(NetworkAutoConfig.manageApNetwork).not.toBeCalled()
    expect(NetworkAutoConfig.manageMeshNetwork).not.toBeCalled()
  })
  it('beforeSave() calls NetworkAutoConfig.manageApNetwork', async () => {
    wrapper = createWrapper(
      WirelessEdit,
      combineDeep(wrapperOptions, {
        global: {
          mocks: {
            $store: {
              board: {
                network: {
                  lan: {
                    device: 'abc'
                  }
                }
              }
            }
          }
        }
      })
    )
    await wrapper.setProps({ section: { mode: 'ap' } })
    wrapper.vm.formRef.validate = () => true
    wrapper.vm.$store.isAccessPoint = true
    await wrapper.vm.beforeSave()
    expect(NetworkAutoConfig.manageApNetwork).toBeCalled()
    expect(NetworkAutoConfig.manageMeshNetwork).not.toBeCalled()
  })
  it('beforeSave() calls NetworkAutoConfig.manageMeshNetwork', async () => {
    wrapper = createWrapper(
      WirelessEdit,
      combineDeep(wrapperOptions, {
        global: {
          mocks: {
            $store: {
              board: {
                network: {
                  lan: {
                    device: 'abc'
                  }
                }
              }
            }
          }
        },
        computed: {
          isAp: () => false
        }
      })
    )
    wrapper.vm.formRef.validate = () => true
    wrapper.vm.$store.isAccessPoint = true
    await wrapper.vm.beforeSave()
    expect(NetworkAutoConfig.manageApNetwork).not.toBeCalled()
    expect(NetworkAutoConfig.manageMeshNetwork).toBeCalled()
  })
  it.each`
    section                 | availableNetworks                                        | expectedResult
    ${{ mode: 'ap' }}       | ${[{ name: 'network' }]}                                 | ${true}
    ${{ mode: 'ap' }}       | ${[{ name: 'network', device: 'br_lan' }]}               | ${true}
    ${{ mode: 'ap' }}       | ${[{ name: 'network', device: 'br-lan.5' }]}             | ${true}
    ${{ mode: 'ap' }}       | ${[{ name: 'network', ifname: 'eth1' }]}                 | ${false}
    ${{ mode: 'mesh' }}     | ${[{ name: 'network' }]}                                 | ${true}
    ${{ mode: 'mesh' }}     | ${[{ name: 'network', device: 'br_lan' }]}               | ${true}
    ${{ mode: 'mesh' }}     | ${[{ name: 'network', ifname: 'eth1' }]}                 | ${false}
    ${{ mode: 'sta' }}      | ${[{ name: 'network', device: 'br_lan' }]}               | ${false}
    ${{ mode: 'sta' }}      | ${[{ name: 'network', device: 'br-lan.5' }]}             | ${false}
    ${{ mode: 'sta' }}      | ${[{ name: 'network', device: 'eth1' }]}                 | ${true}
    ${{ mode: 'sta' }}      | ${[{ name: 'network', device: 'eth1', ifname: 'eth1' }]} | ${false}
    ${{ mode: 'multi_ap' }} | ${[{ name: 'network', device: 'br_lan' }]}               | ${false}
    ${{ mode: 'multi_ap' }} | ${[{ name: 'network', device: 'eth1' }]}                 | ${true}
    ${{ mode: 'multi_ap' }} | ${[{ name: 'network', device: 'eth1', ifname: 'eth1' }]} | ${false}
  `('returns network validation result #%#', async ({ section, availableNetworks, expectedResult }) => {
    wrapper = createWrapper(
      WirelessEdit,
      combineDeep(wrapperOptions, {
        props: {
          section
        },
        global: {
          provide: {
            [FormOptionKey]: {
              interfaceConfigs: ref(availableNetworks)
            }
          }
        }
      })
    )
    expect(wrapper.vm.validateNetwork('network').isValid).toEqual(expectedResult)
  })
  const certs = [
    { type: 'key', fullname: 'client.key', path: '/etc/certificates/client.key' },
    { type: 'cert', cert_type: 'ca', fullname: 'ca.crt', path: '/etc/certificates/ca.crt' },
    { type: 'cert', cert_type: 'client', fullname: 'client.crt', path: '/etc/certificates/client.crt' },
    { type: 'cert', cert_type: 'server', fullname: 'server.crt', path: '/etc/certificates/server.crt' },
    { type: 'cert', cert_type: 'root_ca', fullname: 'ca-certificates.crt', path: '/etc/ssl/certs/ca-certificates.crt' },
    { type: 'cert', cert_type: 'import', fullname: 'imported.crt', path: '/etc/certificates/imported.crt' },
    { type: 'cert', cert_type: 'scep', fullname: 'scep.crt', path: '/etc/certificates/scep.crt' }
  ]
  it('returns keyOpts', () => {
    wrapper.vm.certData = certs
    expect(wrapper.vm.keyOpts).toEqual([['/etc/certificates/client.key', 'client.key']])
  })
  it('returns caOpts', () => {
    wrapper.vm.certData = certs
    expect(wrapper.vm.caOpts).toEqual([
      ['/etc/certificates/ca.crt', 'ca.crt'],
      ['/etc/ssl/certs/ca-certificates.crt', 'ca-certificates.crt'],
      ['/etc/certificates/imported.crt', 'imported.crt'],
      ['/etc/certificates/scep.crt', 'scep.crt']
    ])
  })
  it('returns certOpts', () => {
    wrapper.vm.certData = certs
    expect(wrapper.vm.certOpts).toEqual([
      ['/etc/certificates/client.crt', 'client.crt'],
      ['/etc/certificates/server.crt', 'server.crt'],
      ['/etc/certificates/imported.crt', 'imported.crt'],
      ['/etc/certificates/scep.crt', 'scep.crt']
    ])
  })
  it.each`
    data                                      | isRouter | expectedResult
    ${{ mode: 'ap', network: 'wlan0' }}       | ${true}  | ${{ path: '/network/lan', hash: '#name=wlan0', query: { persistSpinState: 'true' } }}
    ${{ mode: undefined, network: 'wlan0' }}  | ${true}  | ${{ path: '/network/lan', hash: '#name=wlan0', query: { persistSpinState: 'true' } }}
    ${{ mode: 'sta', network: 'wlan0' }}      | ${true}  | ${{ path: '/network/wan', hash: '#name=wlan0', query: { persistSpinState: 'true' } }}
    ${{ mode: 'mesh', network: 'wlan0' }}     | ${true}  | ${{ path: '/network/wan', hash: '#name=wlan0', query: { persistSpinState: 'true' } }}
    ${{ mode: 'multi_ap', network: 'wlan0' }} | ${true}  | ${{ path: '/network/wan', hash: '#name=wlan0', query: { persistSpinState: 'true' } }}
    ${{ mode: 'ap', network: 'lan' }}         | ${true}  | ${false}
    ${{ mode: 'ap', network: 'wlan0' }}       | ${false} | ${false}
  `('redirects to interface page #%#', async ({ data, isRouter, expectedResult }) => {
    wrapper.vm.interfaceConfigs = [{ name: 'lan' }]
    wrapper.vm.store.board.hwinfo.access_point = !isRouter
    wrapper.vm.onInterfaceSave(undefined, { data })
    if (expectedResult) expect(wrapper.vm.router.push).toBeCalledWith(expectedResult)
    else expect(wrapper.vm.router.push).not.toBeCalled()
  })
})
