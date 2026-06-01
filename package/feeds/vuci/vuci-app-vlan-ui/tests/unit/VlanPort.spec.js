import VlanPort from '../../src/views/network/VlanPort.vue'
import PortBasedVlan from '@/components/network/PortBasedVlan.vue'
import createWrapper, { mergeDeep } from '@tests/unit/mockFactory'

const getDevice = platform => ({
  board: {
    model: {
      platform
    }
  }
})

describe('afterLoad()', () => {
  it('do not do anything when there is no dsa', async () => {
    const wrapper = createWrapper(VlanPort, {
      computed: {
        dsa: () => false
      }
    })
    const spy = vi.spyOn(wrapper.vm.$axios, 'get')
    await wrapper.vm.afterLoad()
    expect(spy).not.toHaveBeenCalled()
  })
  it('show error when there is error', async () => {
    const wrapper = createWrapper(VlanPort, {
      computed: {
        dsa: () => true
      }
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    vi.spyOn(wrapper.vm.$axios, 'get').mockRejectedValue()
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalled()
  })
})

describe.each([getDevice('RUTX'), getDevice('RUTM'), getDevice('RUT2M'), getDevice('RUT9M')])('PortBasedVLAN.vue', board => {
  const defaultOptions = {
    global: {
      mocks: {
        $store: {
          state: board
        }
      }
    },
    props: {
      vuciForm: { initialForm: {} },
      uciData: { switch_vlan: [] },
      formData: { switch_vlan: [] },
      ifaces: []
    }
  }
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(PortBasedVlan, defaultOptions)
  })

  it.each`
    description                                                    | switchVlan                    | section        | readonlyVlans | expectedResult
    ${'first but no read only'}                                    | ${[{ id: '1' }, { id: '2' }]} | ${{ id: '1' }} | ${0}          | ${false}
    ${'first but there is read only'}                              | ${[{ id: '1' }, { id: '2' }]} | ${{ id: '1' }} | ${1}          | ${true}
    ${'second but there is only one read only'}                    | ${[{ id: '1' }, { id: '2' }]} | ${{ id: '2' }} | ${1}          | ${false}
    ${'second but there is only one read only but vids are mixed'} | ${[{ id: '2' }, { id: '1' }]} | ${{ id: '1' }} | ${1}          | ${false}
  `('returns $expectedResult when $description', async ({ switchVlan, section, readonlyVlans, expectedResult }) => {
    const wrapper = createWrapper(
      PortBasedVlan,
      mergeDeep(defaultOptions, {
        global: {
          mocks: { $store: { board: { network_options: { readonly_vlans: readonlyVlans } } } }
        }
      })
    )
    await wrapper.setProps({ formData: { switch_vlan: switchVlan } })
    expect(wrapper.vm.checkReadonly(section)).toEqual(expectedResult)
  })
  it.each`
    description                               | section                                         | portMirroring                                                     | softPortMirror | dsa      | expectedResult
    ${'port mirroring disabled'}              | ${{ lan1: 'u', lan2: '', lan3: '' }}            | ${[{ mirror_monitor_port: 'disabled', mirror_source_port: '0' }]} | ${true}        | ${false} | ${false}
    ${'monitor port used'}                    | ${{ lan1: 'u', lan2: '', lan3: '' }}            | ${[{ mirror_monitor_port: '1', mirror_source_port: '2' }]}        | ${true}        | ${false} | ${true}
    ${'source port used'}                     | ${{ lan1: '', lan2: 'u', lan3: '' }}            | ${[{ mirror_monitor_port: '1', mirror_source_port: '2' }]}        | ${true}        | ${false} | ${true}
    ${'no ports used'}                        | ${{ lan1: '', lan2: '', lan3: '' }}             | ${[{ mirror_monitor_port: '1', mirror_source_port: '2' }]}        | ${true}        | ${false} | ${false}
    ${'port used but soft_port_mirror false'} | ${{ lan1: 'u', lan2: '', lan3: '' }}            | ${[{ mirror_monitor_port: '1', mirror_source_port: '2' }]}        | ${false}       | ${false} | ${false}
    ${'port used but dsa true'}               | ${{ lan1: 'u', lan2: '', lan3: '' }}            | ${[{ mirror_monitor_port: '1', mirror_source_port: '2' }]}        | ${true}        | ${true}  | ${false}
    ${'multiple lan ports'}                   | ${{ lan1: '', lan2: 'u', lan3: '', lan4: 't' }} | ${[{ mirror_monitor_port: '1', mirror_source_port: '4' }]}        | ${true}        | ${false} | ${true}
    ${'no matching ports'}                    | ${{ lan1: 'u', lan2: 't', lan3: '' }}           | ${[{ mirror_monitor_port: '4', mirror_source_port: '5' }]}        | ${true}        | ${false} | ${false}
  `('returns $expectedResult when $description', async ({ section, portMirroring, softPortMirror, dsa, expectedResult }) => {
    const wrapper = createWrapper(
      PortBasedVlan,
      mergeDeep(defaultOptions, {
        global: {
          mocks: {
            $store: {
              board: {
                hwinfo: {
                  dsa: dsa
                }
              }
            }
          }
        }
      })
    )
    wrapper.vm.$store.hasPackages = vi.fn().mockReturnValue(softPortMirror)
    await wrapper.setProps({ portMirroring: portMirroring })
    expect(wrapper.vm.disableSection(section)).toEqual(expectedResult)
  })
  it.each`
    description                | port      | portMirroring                                                     | expectedResult
    ${'monitor port disabled'} | ${'lan1'} | ${[{ mirror_monitor_port: 'disabled', mirror_source_port: '0' }]} | ${false}
    ${'monitor port used'}     | ${'lan1'} | ${[{ mirror_monitor_port: '1', mirror_source_port: '2' }]}        | ${true}
    ${'source port used'}      | ${'lan2'} | ${[{ mirror_monitor_port: '1', mirror_source_port: '2' }]}        | ${true}
    ${'port not used'}         | ${'lan3'} | ${[{ mirror_monitor_port: '1', mirror_source_port: '2' }]}        | ${false}
    ${'no matching ports'}     | ${'lan4'} | ${[{ mirror_monitor_port: '1', mirror_source_port: '2' }]}        | ${false}
  `('returns $expectedResult when $description', async ({ port, portMirroring, expectedResult }) => {
    const wrapper = createWrapper(PortBasedVlan)
    await wrapper.setProps({ portMirroring })
    expect(wrapper.vm.isPortDisabled(port)).toBe(expectedResult)
  })
  it.each([
    { switchVlan: [{ vid: '1' }, { vid: '1' }], expectedResult: { isValid: false, message: 'Invalid VLAN ID given! Only unique IDs are allowed' } },
    { switchVlan: [{ vid: '1' }], expectedResult: { isValid: true } }
  ])('should validate vid', async ({ switchVlan, expectedResult }) => {
    await wrapper.setProps({ formData: { switch_vlan: switchVlan } })
    const result = wrapper.vm.validateVID('1')
    expect(result).toEqual(expectedResult)
  })
  it.each([
    {
      ports: ['lan'],
      result: [
        { name: 'vid', label: 'VLAN ID', help: 'VLAN Identification number.', width: 'w-20' },
        { name: 'lan', label: 'LAN', help: null, width: 'xs' }
      ]
    },
    {
      ports: ['lan2'],
      result: [
        { name: 'vid', label: 'VLAN ID', help: 'VLAN Identification number.', width: 'w-20' },
        { name: 'lan2', label: 'LAN 2', help: null, width: 'xs' }
      ]
    }
  ])('renders device columns', async ({ ports, result }) => {
    const localWrapper = createWrapper(
      PortBasedVlan,
      mergeDeep(defaultOptions, {
        computed: {
          ...PortBasedVlan.computed,
          ports() {
            return ports
          }
        }
      })
    )
    const deviceColumns = await localWrapper.vm.deviceColumns
    expect(deviceColumns).toEqual(result)
  })
  it.each([
    { val: '', vid: 'u', switchVlan: [{ vid: 'test' }], devices: [], device: getDevice('test'), expectedResult: { isValid: true }, multiTag: false, vlan0: false },
    { val: '', vid: 'u', switchVlan: [{ vid: 'test' }], devices: [], device: getDevice('test'), expectedResult: { isValid: true }, multiTag: false, vlan0: false },
    { val: 'u', vid: 'u', switchVlan: [{ vid: 'test' }], devices: [], device: getDevice('test'), expectedResult: { isValid: true }, multiTag: false, vlan0: false },
    {
      val: 't',
      vid: '10',
      switchVlan: [{ test: 'u', vid: 'testas' }],
      devices: [{ id: 'br_lan', name: 'br-lan', ports: ['test'] }],
      device: getDevice('test'),
      expectedResult: { isValid: false, message: 'Port is already used by the "br-lan" bridge. Remove the port from the bridge before configuring the VLAN.' },
      multiTag: true,
      vlan0: true
    },
    {
      val: 'u',
      vid: 'u',
      switchVlan: [{ test: 'u', vid: 'testas' }],
      devices: [],
      device: getDevice('test'),
      expectedResult: { isValid: false, message: 'Port is untagged in multiple VLANs.' },
      multiTag: false,
      vlan0: false
    },
    {
      val: 'u',
      vid: 'u',
      switchVlan: [{ test: 't', vid: 'testas' }],
      devices: [],
      device: getDevice('test'),
      expectedResult: { isValid: false, message: 'Tagged port can not be used together with untagged' },
      multiTag: false,
      vlan0: false
    },
    {
      val: 't',
      vid: 'u',
      switchVlan: [{ test: 'u', vid: 'testas' }],
      devices: [],
      device: getDevice('test'),
      expectedResult: { isValid: false, message: 'Tagged port can not be used together with untagged' },
      multiTag: false,
      vlan0: false
    },
    {
      val: 't',
      vid: 'u',
      switchVlan: [{ test: 'u', vid: 'testas' }],
      devices: [],
      device: getDevice('RUTX'),
      expectedResult: { isValid: true },
      multiTag: true,
      vlan0: false
    },
    {
      val: 't',
      vid: '0',
      switchVlan: [{ test: 'u', vid: 'testas' }],
      devices: [],
      device: getDevice('RUT2M'),
      expectedResult: { isValid: false, message: 'VLAN 0 cannot be tagged' },
      multiTag: true,
      vlan0: true
    },
    {
      val: 't',
      vid: '10',
      switchVlan: [{ test: 'u', vid: 'testas' }],
      devices: [],
      device: getDevice('RUT2M'),
      expectedResult: { isValid: true },
      multiTag: true,
      vlan0: true
    }
  ])('validate ports', async ({ val, vid, switchVlan, devices, device, multiTag, vlan0, expectedResult }) => {
    const localWrapper = createWrapper(
      PortBasedVlan,
      mergeDeep(defaultOptions, {
        global: {
          mocks: {
            $store: {
              state: device
            }
          }
        }
      })
    )
    const self = {
      uciSection: {
        vid
      },
      name: 'test'
    }
    await localWrapper.setProps({
      formData: {
        switch_vlan: switchVlan,
        devices
      }
    })
    localWrapper.vm.$store.board.hwinfo.multi_tag = multiTag
    localWrapper.vm.$store.board.network_options.vlan0 = vlan0
    const result = localWrapper.vm.validatePort(val, self)
    expect(result).toEqual(expectedResult)
  })
  it('invoke existant create error ', () => {
    const localWrapper = createWrapper(
      PortBasedVlan,
      mergeDeep(defaultOptions, {
        mocks: { $store: { state: board } }
      })
    )
    const res = localWrapper.vm.handleCreateErrors({
      data: { errors: [{ code: 116 }] }
    })
    expect(res).toBe('Maximum amount of configurations reached')
  })
  it('invoke default create error ', () => {
    const localWrapper = createWrapper(
      PortBasedVlan,
      mergeDeep(defaultOptions, {
        mocks: { $store: { state: board } }
      })
    )
    const res = localWrapper.vm.handleCreateErrors({
      data: {}
    })
    expect(res).toBe('Failed to create new configuration')
  })
  it.each([
    { vlanSections: [{ id: '1' }, { id: '2' }], result: { valid: true } },
    { vlanSections: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }], result: { valid: false, message: 'Maximum amount of configurations reached.' } }
  ])('checks if onAdd validate maximum amount of configuration', ({ vlanSections, result }) => {
    const wrapper = createWrapper(
      PortBasedVlan,
      mergeDeep(defaultOptions, {
        global: {
          mocks: { $store: { board: { network_options: { vlans: 4 } } } }
        }
      })
    )
    expect(wrapper.vm.onAdd(null, vlanSections)).toEqual(result)
  })
  it('returns used lans', () => {
    const wrapper = createWrapper(
      PortBasedVlan,
      mergeDeep(defaultOptions, {
        global: {
          mocks: {
            $networkDevices: {
              getPortName: dev => dev.id
            }
          }
        },
        computed: {
          ...PortBasedVlan.computed,
          ports: () => ['lan1', 'lan2', 'lan3']
        },
        props: {
          ifaces: [
            { id: 'lan', device: 'lan1' },
            { id: 'lan1', device: 'lan2' }
          ]
        }
      })
    )
    expect(wrapper.vm.usedLansIface).toEqual(['lan1', 'lan2'])
  })

  describe('updateVlans()', () => {
    it('sets ifaces when there is no errors', async () => {
      const vlans = [{ vid: '1' }]
      vi.spyOn(wrapper.vm.$axios, 'get').mockResolvedValue({ success: true, data: vlans })
      const uciData = {}
      await wrapper.vm.updateVlans(uciData)
      expect(uciData.switch_vlan).toEqual(vlans)
    })
    it('show error when there is error', async () => {
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      vi.spyOn(wrapper.vm.$axios, 'get').mockRejectedValue()
      await wrapper.vm.updateVlans({})
      expect(spy).toHaveBeenCalled()
    })
  })

  it.each`
    name                               | data                                                                                                                | ifaces                             | dsa      | called
    ${'dsa off, does nothing'}         | ${{ uciData: { switch_vlan: [{}] } }}                                                                               | ${[]}                              | ${false} | ${0}
    ${'dsa on, 2 vlans, does nothing'} | ${{ uciData: { switch_vlan: [{ device: 'vlan', device_name: 'vlan' }, { device: 'vlan', device_name: 'vlan' }] } }} | ${[{ device: 'vlan', id: 'lan' }]} | ${true}  | ${0}
    ${'dsa on, 1 vlan, does thigns'}   | ${{ uciData: { switch_vlan: [{ device: 'vlan', device_name: 'vlan' }] } }}                                          | ${[{ device: 'vlan', id: 'lan' }]} | ${true}  | ${1}
  `('afterAdd(), $name', async ({ data, ifaces, dsa, called }) => {
    const wrapper = createWrapper(
      PortBasedVlan,
      mergeDeep(defaultOptions, {
        computed: {
          ...PortBasedVlan.computed,
          dsa: () => dsa,
          defaultDevice: () => 'vlan'
        }
      })
    )
    const spy = vi.spyOn(wrapper.vm.$notification, 'info')
    await wrapper.setProps({ ifaces })
    await wrapper.vm.afterAdd(null, data)
    expect(spy).toHaveBeenCalledTimes(called)
  })

  it.each`
    name                               | data                                                                                                   | ifaces                               | dsa      | called
    ${'dsa off, does nothing'}         | ${{ switch_vlan: [{}] }}                                                                               | ${[]}                                | ${false} | ${0}
    ${'dsa on, 1 vlans, does nothing'} | ${{ switch_vlan: [{ device: 'vlan', device_name: 'vlan' }] }}                                          | ${[{ device: 'vlan', id: 'lan' }]}   | ${true}  | ${0}
    ${'dsa on, 2 vlan, does thigns'}   | ${{ switch_vlan: [{ device: 'vlan', device_name: 'vlan' }, { device: 'vlan', device_name: 'vlan' }] }} | ${[{ device: 'vlan.1', id: 'lan' }]} | ${true}  | ${1}
  `('afterDelete(), $name', async ({ data, ifaces, dsa, called }) => {
    const wrapper = createWrapper(
      PortBasedVlan,
      mergeDeep(defaultOptions, {
        computed: {
          ...PortBasedVlan.computed,
          dsa: () => dsa,
          defaultDevice: () => 'vlan'
        }
      })
    )
    const self = { vuciForm: { validate: vi.fn() } }
    const spy = vi.spyOn(wrapper.vm.$notification, 'info')
    await wrapper.setProps({ ifaces })
    await wrapper.vm.afterDelete(null, data, self)
    expect(spy).toHaveBeenCalledTimes(called)
  })

  it.each`
    name                                 | value  | lan       | usedLansIface | dsa      | isValid
    ${'dsa off, isValid: $isValid'}      | ${'u'} | ${'lan1'} | ${['lan1']}   | ${false} | ${true}
    ${'value off, isValid: $isValid'}    | ${''}  | ${'lan1'} | ${['lan1']}   | ${false} | ${true}
    ${'lan not used, isValid: $isValid'} | ${'u'} | ${'lan1'} | ${['lan2']}   | ${true}  | ${true}
    ${'lan used, isValid: $isValid'}     | ${'u'} | ${'lan1'} | ${['lan1']}   | ${true}  | ${false}
  `('validateUsedLan(), $name', async ({ value, lan, usedLansIface, dsa, isValid }) => {
    const wrapper = createWrapper(
      PortBasedVlan,
      mergeDeep(defaultOptions, {
        computed: {
          ...PortBasedVlan.computed,
          dsa: () => dsa,
          usedLansIface: () => usedLansIface
        }
      })
    )
    expect(wrapper.vm.validateUsedLan(lan, value).isValid).toEqual(isValid)
  })
})

it.each`
  ifaces                                                                 | result
  ${[{ id: 'lan', ifname: ['lan1'] }, { id: 'lan2', ifname: ['lan1'] }]} | ${{ valid: false, message: 'Port "lan1" is used in interface "lan2", please remove it from the interface before adding a new VLAN.' }}
  ${[{ id: 'lan', ifname: ['lan1'] }, { id: 'lan2', ifname: ['lan2'] }]} | ${{ valid: true }}
  ${[]}                                                                  | ${{ valid: true }}
`('Checks if the port is used in an interface on add', ({ ifaces, result }) => {
  const wrapper = createWrapper(PortBasedVlan, {
    global: {
      mocks: {
        $networkDevices: {
          getPhysicalPorts: () => ['lan1', 'lan2', 'lan3', 'wan']
        }
      }
    },
    props: {
      ifaces
    },
    computed: {
      ...PortBasedVlan.computed,
      dsa: () => true
    }
  })
  expect(wrapper.vm.onAdd(null, [])).toEqual(result)
})
