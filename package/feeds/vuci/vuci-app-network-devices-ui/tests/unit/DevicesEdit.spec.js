import DevicesEdit from '../../src/views/network/DevicesEdit.vue'
import createWrapper from '../../../../../vuci-ui-core/src/tests/unit/mockFactory'
import { network } from '@/plugins/network'
import * as networkDevices from '@/plugins/networkDevices'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'

describe('DevicesEdit.vue', () => {
  let wrapper
  let wrapperOptions
  beforeEach(() => {
    setActivePinia(createTestingPinia())
    wrapperOptions = {
      global: {
        provide: {
          modalData: () => ({ uciData: {}, vuciForm: { initialForm: {} } }),
          interfaces: () => [],
          devices: () => []
        },
        mocks: {
          $network: network,
          $networkDevices: networkDevices
        }
      },
      props: {
        section: {},
        groupData: () => {},
        getDeviceName: s => s.name
      }
    }
    wrapper = createWrapper(DevicesEdit, wrapperOptions)
  })

  it('computes all devices', () => {
    wrapper.vm.formData.devices = [
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
    const res = [
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
      { type: 'ethernet', id: 'lan1_dev', name: 'lan1' },
      { type: 'ethernet', id: 'lan2_dev', name: 'lan2' },
      {
        type: 'bridge',
        id: 'bridge1',
        name: 'bridge1',
        ports: ['lan3', 'vlan1'],
        _children: [
          { type: 'ethernet', id: 'lan3_dev', name: 'lan3' },
          { type: '8021q', id: 'vlan1', name: 'vlan1' }
        ]
      },
      { type: 'ethernet', id: 'lan3_dev', name: 'lan3' },
      { type: '8021q', id: 'vlan1', name: 'vlan1' }
    ]
    expect(wrapper.vm.allDevices).toEqual(res)
  })
  it('computes bridge options', () => {
    wrapperOptions.computed = {
      ...DevicesEdit.computed,
      physicalPorts: () => ['lan1', 'lan2', 'lan3', 'wan']
    }
    const wrapper = createWrapper(DevicesEdit, wrapperOptions)
    wrapper.vm.formData.devices = [
      { type: '8021q', id: 'vlan1', name: 'vlan1' },
      { type: '8021ad', id: 'vlan2', name: 'vlan2' },
      { type: '8021q', id: 'vlan3', name: 'vlan3' },
      { type: 'bridge', id: 'bridge1', name: 'bridge1' }
    ]
    expect(wrapper.vm.bridgeOptions).toEqual(['lan1', 'lan2', 'lan3', 'wan', ['vlan1', 'vlan1'], ['vlan2', 'vlan2'], ['vlan3', 'vlan3']])
  })
  it('computes provided interfaces', () => {
    const ifaces = [{ id: 'lan', device: 'br-lan' }]
    wrapperOptions.global.provide = {
      ...wrapperOptions.global.provide,
      interfaces: () => ifaces
    }
    const wrapper = createWrapper(DevicesEdit, wrapperOptions)
    expect(wrapper.vm.ifaces).toEqual(ifaces)
  })
  it('computes provided devices status', () => {
    const devs = [{ id: 'br_lan', 'bridge-members': ['lan1', 'lan2'] }]
    wrapperOptions.global.provide = {
      ...wrapperOptions.global.provide,
      devices: () => devs
    }
    const wrapper = createWrapper(DevicesEdit, wrapperOptions)
    expect(wrapper.vm.devs).toEqual(devs)
  })
  it.each`
    ifaces                                                              | devStatus                                                                                                                                        | devices                                                                                                                            | ports               | ifacesRes                           | devsRes                                                                                                                            | formRes
    ${[{ id: 'lan1', device: 'lan2' }, { id: 'lan2', device: 'lan2' }]} | ${[]}                                                                                                                                            | ${[]}                                                                                                                              | ${['lan1', 'lan2']} | ${[{ id: 'lan1' }, { id: 'lan2' }]} | ${[]}                                                                                                                              | ${[]}
    ${[]}                                                               | ${[{ id: 'br_lan', type: 'bridge', 'bridge-members': ['lan1', 'lan2'] }, { id: 'bridge1', type: 'bridge', 'bridge-members': ['lan1', 'lan2'] }]} | ${[]}                                                                                                                              | ${['lan1', 'lan2']} | ${[]}                               | ${[{ id: 'br_lan', type: 'bridge', 'bridge-members': [] }, { id: 'bridge1', type: 'bridge', 'bridge-members': ['lan1', 'lan2'] }]} | ${[]}
    ${[]}                                                               | ${[]}                                                                                                                                            | ${[{ id: 'br_lan', type: 'bridge', ports: ['lan1', 'lan2', 'lan3'] }, { id: 'bridge1', type: 'bridge', ports: ['lan1', 'lan2'] }]} | ${['lan1', 'lan2']} | ${[]}                               | ${[]}                                                                                                                              | ${[{ id: 'br_lan', type: 'bridge', ports: ['lan3'] }, { id: 'bridge1', type: 'bridge', ports: ['lan1', 'lan2'] }]}
  `('after save used device in interfaces is bridged #%#', ({ ifaces, devStatus, devices, ports, ifacesRes, devsRes, formRes }) => {
    wrapperOptions.props.section = { type: 'bridge', id: 'bridge1' }
    wrapperOptions.computed = {
      ...DevicesEdit.computed,
      ifaces: () => ifaces,
      devs: () => devStatus,
      physicalPorts: () => ['lan1', 'lan2', 'lan3', 'wan']
    }
    const wrapper = createWrapper(DevicesEdit, wrapperOptions)
    wrapper.vm.formData.devices = devices
    wrapper.vm.afterSave(null, { data: { ports } })
    expect(wrapper.vm.ifaces).toEqual(ifacesRes)
    expect(wrapper.vm.devs).toEqual(devsRes)
    expect(wrapper.vm.formData.devices).toEqual(formRes)
  })
  it.each`
    value                  | devStatus                              | devices                                                   | expectedResult
    ${['bridge1']}         | ${[]}                                  | ${[{ name: 'bridge1', type: 'bridge', ports: ['lan3'] }]} | ${{ isValid: false, message: 'Bridge in bridge configuration is not possible' }}
    ${['lan1', 'wlan1-1']} | ${[{ name: 'wlan1-1', type: 'wifi' }]} | ${[]}                                                     | ${{ isValid: false, message: 'Wireless devices cannot be used in bridge ports configuration' }}
    ${['lan1', 'lan2']}    | ${[{ name: 'wlan1-1', type: 'wifi' }]} | ${[{ name: 'bridge1', type: 'bridge', ports: ['lan3'] }]} | ${{ isValid: true, message: 'Bridge in bridge configuration is not possible' }}
  `('validate ports #%#', ({ value, devStatus, devices, expectedResult }) => {
    wrapperOptions.props.section = { type: 'bridge', id: 'bridge1' }
    wrapperOptions.computed = {
      ...DevicesEdit.computed,
      devs: () => devStatus
    }
    const wrapper = createWrapper(DevicesEdit, wrapperOptions)
    wrapper.vm.formData.devices = devices
    const result = wrapper.vm.validatePorts(value)
    expect(result).toEqual(expectedResult)
  })
})
