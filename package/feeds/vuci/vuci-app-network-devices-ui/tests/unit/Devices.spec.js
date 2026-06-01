import Devices from '../../src/views/network/Devices.vue'
import createWrapper from '../../../../../vuci-ui-core/src/tests/unit/mockFactory'
import { network } from '@/plugins/network'
import { formBus } from '@ui-core/vuci-form'

describe('Devices.vue', () => {
  let wrapper
  let wrapperOptions
  beforeEach(() => {
    wrapperOptions = {
      global: {
        mocks: {
          $network: network,
          $timer: {
            restart: () => {}
          }
        }
      }
    }
    wrapper = createWrapper(Devices, wrapperOptions)
    wrapper.vm.$refs.vuciForm.initialForm = { devices: [] }
    wrapper.vm.$refs.typedSection.delSection = () => {}
  })
  it('groups bridge data', () => {
    wrapper.vm.formData.devices = [
      { type: 'bridge', id: 'br_lan', name: 'br-lan', ports: ['lan1', 'lan2'] },
      { type: 'bridge', id: 'bridge1', name: 'bridge1', ports: ['lan3', 'vlan1'] },
      { type: 'ethernet', id: 'lan1_dev', name: 'lan1' },
      { type: 'ethernet', id: 'lan2_dev', name: 'lan2' },
      { type: 'ethernet', id: 'lan3_dev', name: 'lan3' },
      { type: '8021q', id: 'vlan1', name: 'vlan1' }
    ]
    const res = {
      devices: [
        {
          type: 'bridge',
          id: 'br_lan',
          name: 'br-lan',
          ports: ['lan1', 'lan2'],
          _children: [
            { type: 'ethernet', id: 'lan1_dev', name: 'lan1' },
            { type: 'ethernet', id: 'lan2_dev', name: 'lan2' }
          ]
        },
        {
          type: 'bridge',
          id: 'bridge1',
          name: 'bridge1',
          ports: ['lan3', 'vlan1'],
          _children: [
            { type: 'ethernet', id: 'lan3_dev', name: 'lan3' },
            { type: '8021q', id: 'vlan1', name: 'vlan1' }
          ]
        }
      ]
    }
    expect(wrapper.vm.groupData()).toEqual(res)
  })
  it('succesfully loads after load data', async () => {
    const portBased = [{ device: 'br-lan', vid: '1', device_name: 'br_lan', lan2: 'u', lan3: 'u', lan1: 'u', id: 'cfg11a1b0' }]
    const portStatus = [{ role: 'LAN', num: 2 }]
    const dot1x = [{ enabled: '0', id: '_lan1', role: 'client', iface: 'lan1' }]
    wrapper.vm.formData.devices = [{ id: 'br_lan', name: 'br-lan' }]
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValue([
      { success: true, data: portBased },
      { success: true, data: portStatus },
      { success: true, data: dot1x }
    ])
    const combinedDevices = [wrapper.vm.formData.devices[0]]
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.formData.devices).toEqual(combinedDevices)
    expect(wrapper.vm.portStatus).toEqual(portStatus)
    expect(wrapper.vm.dot1xConfig).toEqual(dot1x)
  })
  it('fails to load after load data', async () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValue([{ success: false }, { success: false }, { success: false }])
    await wrapper.vm.afterLoad()
    expect(spy).nthCalledWith(1, 'Failed to load port status data')
    expect(spy).nthCalledWith(2, 'Failed to load VLAN data')
    expect(spy).nthCalledWith(3, 'Failed to load port based vlan data')
  })
  it('succesfully loads status data', async () => {
    const status = [{ name: 'br-lan', id: 'br_lan', 'bridge-members': ['lan1'] }]
    wrapper.vm.$axios.get = vi.fn().mockResolvedValue({ success: true, data: status })
    await wrapper.vm.loadStatus()
    expect(wrapper.vm.status).toEqual(status)
  })
  it('fails to load status data', async () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.get = vi.fn().mockRejectedValue({ success: false })
    await wrapper.vm.loadStatus()
    expect(spy).toHaveBeenCalledWith(expect.any(String))
  })
  it('succesfully loads extraLoad data', async () => {
    const form = { devices: [{ id: 'br_lan', name: 'br-lan' }, { id: 'vxlan1' }] }
    const bridges = [{ id: 'br_lan', name: 'br-lan', ports: ['lan1', 'lan3'] }]
    const interfaces = [{ name: 'lan', id: 'lan' }]
    const vxlan = [{ id: 'vxlan1', name: 'vxlan1' }]
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValue([
      { success: true, data: interfaces },
      { success: true, data: bridges },
      { success: true, data: vxlan }
    ])
    await wrapper.vm.extraLoad(form)
    expect(wrapper.vm.interfaces).toEqual(interfaces)
    expect(form.devices).toEqual([...bridges, ...vxlan])
  })
  it('fails to load extraLoad data', async () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.get = vi.fn().mockRejectedValue({ success: false }, { success: false }, { success: false })
    await wrapper.vm.extraLoad()
    expect(spy).toHaveBeenCalledWith(expect.any(String))
  })
  it('starts timer after extra load', async () => {
    const spy = vi.spyOn(wrapper.vm.$timer, 'start')
    await wrapper.vm.extraLoad()
    expect(spy).toHaveBeenCalled()
  })
  it.each`
    section                             | status                                                  | devices                                  | dsa      | expectedResult
    ${{ name: 'br-lan' }}               | ${[]}                                                   | ${[]}                                    | ${true}  | ${[]}
    ${{ name: 'lan1', id: 'lan1_dev' }} | ${[{ type: 'bridge', 'bridge-members': ['lan2'] }]}     | ${[]}                                    | ${false} | ${[]}
    ${{ name: 'lan1', id: 'lan1_dev' }} | ${[{ type: 'bridge', 'bridge-members': ['lan1'] }]}     | ${[]}                                    | ${false} | ${[{ info: 'This device belongs to bridge. Please remove the device from bridge configuration to be able to edit it.' }]}
    ${{ name: 'usb0', id: 'rndis0' }}   | ${[{ type: 'bridge', 'bridge-members': ['usb0'] }]}     | ${[]}                                    | ${false} | ${[{ info: 'This device belongs to bridge. Please remove the device from bridge configuration to be able to edit it.' }]}
    ${{ name: 'ethernet', id: 'eth0' }} | ${[{ type: 'bridge', 'bridge-members': ['ethernet'] }]} | ${[]}                                    | ${false} | ${[{ info: 'This device belongs to bridge. Please remove the device from bridge configuration to be able to edit it.' }]}
    ${{ name: 'usb0', id: 'ecm0' }}     | ${[{ type: 'bridge', 'bridge-members': ['usb0'] }]}     | ${[]}                                    | ${false} | ${[{ info: 'This device belongs to bridge. Please remove the device from bridge configuration to be able to edit it.' }]}
    ${{ name: 'lan1', id: 'lan1_dev' }} | ${[]}                                                   | ${[{ type: 'bridge', ports: ['lan1'] }]} | ${false} | ${[{ info: 'This device belongs to bridge. Please remove the device from bridge configuration to be able to edit it.' }]}
  `('returns edit hint #%#', ({ section, status, devices, dsa, expectedResult }) => {
    wrapperOptions.computed = {
      dsa: () => dsa
    }
    const wrapper = createWrapper(Devices, wrapperOptions)
    wrapper.vm.status = status
    wrapper.vm.formData.devices = devices
    expect(wrapper.vm.getEditHints(section)).toEqual(expectedResult)
  })
  it.each`
    section                                             | interfaces                           | expectedResult
    ${{ name: 'br-lan' }}                               | ${[]}                                | ${[]}
    ${{ name: 'br-lan', id: 'br_lan' }}                 | ${[{ id: 'lan' }]}                   | ${[]}
    ${{ name: 'br-lan', id: 'br_lan', type: 'bridge' }} | ${[{ id: 'lan', device: 'br_lan' }]} | ${[{ info: 'This bridge is assigned to a "lan" interface. The device can only be deleted when the interface is removed' }]}
    ${{ name: 'wlan0', type: 'wifi' }}                  | ${[]}                                | ${[{ info: 'Wi-Fi device cannot be deleted' }]}
    ${{ name: 'lan1', type: 'ethernet' }}               | ${[]}                                | ${[{ info: 'Default ethernet devices cannot be deleted' }]}
  `('returns delete hint #%#', ({ section, interfaces, devices, expectedResult }) => {
    wrapper.vm.formData.devices = devices
    wrapper.vm.interfaces = interfaces
    wrapper.vm.$networkDevices = {
      getPhysicalPorts: () => ['lan1', 'lan2', 'lan3'],
      getPortName: s => s.name
    }
    expect(wrapper.vm.getDeleteHints(section)).toEqual(expectedResult)
  })
  it.each`
    status                | portStatus | expectedResult
    ${{ carrier: true }}  | ${[]}      | ${{ text: 'Up', style: 'success' }}
    ${{ carrier: false }} | ${[]}      | ${{ text: 'Down', style: 'error' }}
    ${{ name: 'dev1' }}   | ${[]}      | ${{ text: 'Down', style: 'error' }}
    ${{ name: 'lan1' }}   | ${[]}      | ${{ text: 'Down', style: 'error' }}
  `('returns status #%#', ({ status, expectedResult }) => {
    const name = 'dev0'
    wrapper.vm.status = [{ name, ...status }]
    expect(wrapper.vm.getStatus({ name })).toEqual(expectedResult)
  })
  it.each`
    selectedType | device | res
    ${'bridge'}  | ${{}}  | ${{}}
    ${'8021q'}   | ${{}}  | ${{}}
    ${'vxlan'}   | ${{}}  | ${{ port: '4789', vni: '1' }}
  `('handles before add logic #$#', ({ selectedType, device, res }) => {
    wrapper.vm.selectedType = selectedType
    wrapper.vm.beforeAdd(device)
    expect(wrapper.vm.selectedType).toBe(selectedType)
    expect(device).toEqual(res)
  })
  it('handles deleted bridge children', () => {
    const data = {
      type: 'bridge',
      id: 'br_lan',
      name: 'br-lan',
      _children: [
        { type: 'ethernet', id: 'lan1_dev', name: 'lan1' },
        { type: 'ethernet', id: 'lan2_dev', name: 'lan2' }
      ]
    }
    wrapper.vm.formData.devices = [data]
    wrapper.vm.formData.switch_vlan = [{ device_name: 'br_lan' }, { device_name: 'lan1' }, { device_name: 'lan2' }]
    wrapper.vm.afterDelete(data)
    expect(wrapper.vm.formData.devices).toEqual([data, ...data._children])
    expect(wrapper.vm.formData.switch_vlan).toEqual([{ device_name: 'lan1' }, { device_name: 'lan2' }])
  })
  it('deletes a section', () => {
    const selectedType = 'bridge'
    wrapper.vm.selectedType = selectedType
    const s = {
      type: 'bridge'
    }
    const spy = vi.spyOn(wrapper.vm, 'groupData')
    wrapper.vm.deleteSection(s)
    formBus.emit('delete-section')
    expect(wrapper.vm.selectedType).toBe(selectedType)
    expect(spy).toHaveBeenCalled()
  })
  it.each`
    section                        | status                           | res
    ${{ id: 'lan1', mtu: '1400' }} | ${[{ id: 'lan1', mtu: '1500' }]} | ${'1500'}
    ${{ id: 'lan1', mtu: '1600' }} | ${[{ id: 'lan1' }]}              | ${'1600'}
    ${{ id: 'lan1' }}              | ${[{ id: 'lan1' }]}              | ${'1500'}
  `('retrieves MTU value #%#', ({ section, status, res }) => {
    wrapper.vm.status = status
    expect(wrapper.vm.getMtu(section)).toBe(res)
  })
  it.each`
    section           | status                                            | res
    ${{ id: 'lan1' }} | ${[{ id: 'lan1', macaddr: 'aa:bb:cc:dd:ee:66' }]} | ${'AA:BB:CC:DD:EE:66'}
    ${{ id: 'lan1' }} | ${[{ id: 'lan1' }]}                               | ${'-'}
  `('retrieves MAC address value #%#', ({ section, status, res }) => {
    wrapper.vm.status = status
    expect(wrapper.vm.getMacaddr(section)).toBe(res)
  })
  it('removes a custom ethernet device from bridge', async () => {
    const lan_custom = { id: 'lan2_custom', name: 'lan2_custom', type: 'ethernet' }
    wrapper.vm.formData.devices = [{ id: 'br_lan', name: 'br-lan', type: 'bridge', ports: ['lan1', 'lan2_custom'], _children: [{ id: 'lan1', name: 'lan1', type: 'ethernet' }, lan_custom] }]
    wrapper.vm.$axios.put = vi.fn().mockResolvedValue({ success: true, data: { id: 'br_lan', name: 'br-lan', type: 'bridge', ports: ['lan1'] } })
    await wrapper.vm.handleEthernetDelete(lan_custom)
    expect(wrapper.vm.formData.devices).toEqual([{ id: 'br_lan', name: 'br-lan', type: 'bridge', ports: ['lan1'], _children: [{ id: 'lan1', name: 'lan1', type: 'ethernet' }] }])
  })
  it('fails to handle ethernet delete', async () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const lan_custom = { id: 'lan2_custom', name: 'lan2_custom', type: 'ethernet' }
    wrapper.vm.formData.devices = [{ id: 'br_lan', name: 'br-lan', type: 'bridge', ports: ['lan1', 'lan2_custom'], _children: [{ id: 'lan1', name: 'lan1', type: 'ethernet' }, lan_custom] }]
    wrapper.vm.$axios.put = vi.fn().mockRejectedValue({ success: false })
    await wrapper.vm.handleEthernetDelete(lan_custom)
    expect(spy).toHaveBeenCalledWith(expect.any(String))
  })
})
