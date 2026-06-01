import * as networkDevices from '@/plugins/networkDevices'
import '@ui-core/utils/string-format'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import i18n from '@ui-core/plugins/i18n'
import { useMainStore } from '@/stores/main'

describe('networkDevices.js', () => {
  // eslint-disable-next-line no-unused-vars
  let store
  beforeEach(() => {
    const app = { config: { globalProperties: {} } }
    setActivePinia(createTestingPinia())
    i18n.install(app)
    store = useMainStore()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each`
    section                                                        | status                                                | expectedResult
    ${{ type: 'bridge', name: 'br-lan', ports: ['lan1', 'lan2'] }} | ${[{ name: 'bridge1', 'bridge-members': ['wlan1'] }]} | ${'br-lan (lan1, lan2, wlan1)'}
    ${{ type: 'ethernet', name: 'lan1' }}                          | ${[{ name: 'lan1' }]}                                 | ${'lan1'}
  `('returns device name #%#', ({ section, status, expectedResult }) => {
    expect(networkDevices.parseDeviceName(section, status)).toEqual(expectedResult)
  })

  it('returns network device dictionary', () => {
    const devices = {
      bridge: 'Bridge',
      ethernet: 'Ethernet',
      vxlan: 'VXLAN',
      wifi: 'Wi-Fi'
    }
    expect(networkDevices.getDeviceTypes()).toEqual(devices)
  })

  it.each`
    device                 | result
    ${{}}                  | ${undefined}
    ${{ id: 'lan1_dev' }}  | ${'lan1'}
    ${{ id: 'wan_dev' }}   | ${'wan'}
    ${{ id: '_lan1_mtu' }} | ${'lan1'}
    ${{ id: '_wan_mtu' }}  | ${'wan'}
    ${{ id: 'lan1' }}      | ${'lan1'}
    ${{ id: 'wan' }}       | ${'wan'}
  `('parse device name from id #%#', ({ device, result }) => {
    expect(networkDevices.getPortName(device)).toBe(result)
  })

  it.each`
    section                                                               | status                                                                        | result
    ${{ type: 'ethernet' }}                                               | ${[]}                                                                         | ${[]}
    ${{ type: 'bridge', ports: ['lan1', 'lan2'], device_name: 'br-lan' }} | ${[{ name: 'br-lan', 'bridge-members': ['lan1', 'lan2', 'wlan0', 'wlan1'] }]} | ${['lan1', 'lan2', 'wlan0', 'wlan1']}
    ${{ type: 'bridge', ports: ['lan3', 'lan4'], device_name: 'br-lan' }} | ${[{ name: 'br-lan', 'bridge-members': ['lan3', 'lan4'] }]}                   | ${['lan3', 'lan4']}
    ${{ type: 'bridge', device_name: 'br-lan' }}                          | ${[{ name: 'br-lan', 'bridge-members': ['wlan0', 'wlan1', 'wlan1-1'] }]}      | ${['wlan0', 'wlan1', 'wlan1-1']}
  `('retrieve bridge members of specific bridge #%#', ({ section, status, result }) => {
    expect(networkDevices.getBridgeMembers(section, status)).toEqual(result)
  })

  it.each`
    ifaces                                           | section                                | result
    ${[{ id: 'lan', name: 'lan1', device: 'lan3' }]} | ${{ ports: ['lan1', 'lan2', 'lan3'] }} | ${'Interface(s) "lan1" will become inoperable after bridging "lan3" port(s).'}
  `('get iface bridge warning #%#', ({ ifaces, section, result }) => {
    expect(networkDevices.getIfaceBridgeWarning(ifaces, section)).toBe(result)
  })

  it.each`
    devStatus                                                                                                                                                                                 | devices                                                                                                                                                             | section                                                       | multiTag | result
    ${[{ id: 'br_lan', name: 'br-lan', type: 'bridge', 'bridge-members': ['lan1', 'lan2', 'lan3'] }, { id: 'bridge1', name: 'bridge1', type: 'bridge', 'bridge-members': ['lan2', 'lan3'] }]} | ${[{ id: 'br_lan', name: 'br-lan', type: 'bridge', ports: ['lan1', 'lan2', 'lan3'] }, { id: 'bridge1', name: 'bridge1', type: 'bridge', ports: ['lan2', 'lan3'] }]} | ${{ type: 'bridge', id: 'bridge1', ports: ['lan2', 'lan3'] }} | ${false} | ${'Selected port(s) "lan2,lan3" are being used by the bridge(s) "br-lan". Saving the form will remove them from the bridge configuration(s).'}
    ${[{ id: 'br_lan', name: 'br-lan', type: 'bridge', 'bridge-members': ['lan1', 'lan2', 'lan3'] }, { id: 'bridge1', name: 'bridge1', type: 'bridge', 'bridge-members': ['lan2', 'lan3'] }]} | ${[{ id: 'br_lan', name: 'br-lan', type: 'bridge', ports: ['lan1', 'lan2', 'lan3'] }, { id: 'bridge1', name: 'bridge1', type: 'bridge', ports: ['lan2', 'lan3'] }]} | ${{ type: 'bridge', id: 'bridge1', ports: ['lan2', 'lan3'] }} | ${true}  | ${'Selected port(s) "lan2,lan3" are being used by the bridge(s) "br-lan". Saving the form will remove them from the bridge configuration(s).'}
  `('get bridge ports warning #%#', ({ devStatus, section, devices, multiTag, result }) => {
    store.board = {
      network: {
        wan: {
          device: 'wan'
        },
        lan: {
          ports: ['lan1', 'lan2', 'lan3']
        }
      },
      hwinfo: {
        dsa: true,
        multiTag
      }
    }
    expect(networkDevices.getBridgePortsWarning(devStatus, section, [], devices)).toBe(result)
  })

  it('retrieves available ports for dsa', () => {
    store.board = {
      network: {
        wan: {
          device: 'wan'
        },
        lan: {
          ports: ['lan1', 'lan2', 'lan3']
        }
      },
      hwinfo: {
        dsa: true
      }
    }
    expect(networkDevices.getPhysicalPorts()).toEqual(['lan1', 'lan2', 'lan3', 'wan'])
  })
  it('retrieves available ports for devices with switch ports', () => {
    const switchPorts = [
      {
        num: 0,
        device: 'eth0',
        need_tag: false,
        want_untag: true
      },
      {
        num: 2,
        role: 'lan',
        index: 1
      },
      {
        num: 3,
        role: 'lan',
        index: 2
      },
      {
        num: 4,
        role: 'lan',
        index: 3
      },
      {
        num: 0,
        device: 'eth1',
        need_tag: false,
        want_untag: true
      },
      {
        num: 5,
        role: 'wan'
      }
    ]
    store.board = {
      switch: {
        switch0: {
          ports: switchPorts
        }
      },
      hwinfo: {
        dsa: false
      }
    }
    expect(networkDevices.getPhysicalPorts()).toEqual(['lan1', 'lan2', 'lan3', 'wan'])
  })
  it('retrieves available ports for devices with no dsa and switch ports', () => {
    store.board = {
      network: {
        lan: {
          ports: ['eth0', 'rndis0']
        }
      },
      hwinfo: {
        dsa: false
      }
    }
    expect(networkDevices.getPhysicalPorts()).toEqual(['ethernet', 'usb0'])
  })
})
