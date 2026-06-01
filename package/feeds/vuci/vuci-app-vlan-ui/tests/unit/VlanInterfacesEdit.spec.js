import VlanInterfaceEdit from '../../src/views/network/VlanInterfaceEdit.vue'
import createWrapper from '@tests/unit/mockFactory'
const props = {
  section: {
    name: ''
  }
}
const createProvide = ({ network = [], devices = [], l2tp = [], portBased = [] } = {}) => ({
  validateName: () => {},
  formOptions: () => {
    return {
      deviceData: devices,
      L2tpv3Data: l2tp,
      networkDevices: network,
      portBasedVlans: portBased
    }
  }
})

describe('VlanInterfaceEdit.vue', () => {
  it.each([
    { devices: [{ virtual: true }], L2tpv3Data: [], result: [] },
    {
      devices: [
        { virtual: false, name: 'wwan' },
        { virtual: false, name: 'wlan' }
      ],
      L2tpv3Data: [],
      result: [],
      boardWan: { device: 'eth1' },
      boardLan: { device: 'eth0' }
    },
    { devices: [{ virtual: false, name: 'test', type: 'VLAN' }], L2tpv3Data: [], result: [], boardWan: { device: 'eth1' }, boardLan: { device: 'eth0' } },
    { devices: [{ virtual: false, name: 'eth0' }], L2tpv3Data: [], result: [], boardWan: { device: 'eth1' }, boardLan: { device: 'eth0' } },
    {
      devices: [
        { virtual: false, name: 'eth0' },
        { virtual: false, name: 'rndis0' }
      ],
      L2tpv3Data: [],
      result: [],
      boardWan: {},
      boardLan: { ports: ['eth0', 'rndis0'] }
    },
    {
      devices: [{ virtual: false, name: 'eth0' }],
      L2tpv3Data: [{ id: 'test' }],
      result: [['l2v3-test', 'L2TPv3-test']],
      boardWan: { device: 'eth1' },
      boardLan: { device: 'eth0' }
    }
  ])('%# create physicalInterfaces list for no full DSA support devices', ({ result, boardWan, boardLan, devices, L2tpv3Data }) => {
    const wrapper = createWrapper(VlanInterfaceEdit, {
      props,
      global: {
        provide: createProvide({ devices, l2tp: L2tpv3Data }),
        mocks: {
          $store: {
            board: {
              network: {
                wan: boardWan,
                lan: boardLan
              },
              hwinfo: {
                dsa: false
              }
            }
          }
        }
      }
    })
    expect(wrapper.vm.physicalInterfaces).toEqual(result)
  })
  it.each([
    { devices: [{ virtual: true }], portBasedVlans: [], result: [] },
    { devices: [{ virtual: false, name: 'wan' }], portBasedVlans: [], result: [], boardWan: { device: 'wan' }, boardLan: { ports: ['lan1', 'lan2', 'lan3', 'lan4'] } },
    {
      devices: [
        { virtual: false, name: 'lan1' },
        { virtual: false, name: 'lan2' }
      ],
      portBasedVlans: [
        { lan1: 't', lan2: '' },
        { lan1: '', lan2: 'u' }
      ],
      result: [],
      boardWan: { device: 'wan' },
      boardLan: { ports: ['lan1', 'lan2', 'lan3', 'lan4'] }
    },
    {
      devices: [
        { virtual: false, name: 'test' },
        { virtual: false, name: 'lan2' }
      ],
      portBasedVlans: [
        { lan1: 't', lan2: '' },
        { lan1: '', lan2: 'u' }
      ],
      result: [],
      boardWan: { device: 'wan' },
      boardLan: { ports: ['lan1', 'lan2', 'lan3', 'lan4'] }
    },
    {
      devices: [
        { virtual: false, name: 'lan1' },
        { virtual: false, name: 'lan2' },
        { virtual: false, name: 'wan' }
      ],
      portBasedVlans: [
        { lan1: '', lan2: '', lan3: 't', lan4: 'u' },
        { lan1: '', lan2: '', lan3: 't', lan4: '' }
      ],
      result: [],
      boardWan: { device: 'wan' },
      boardLan: { ports: ['lan1', 'lan2', 'lan3', 'lan4'] }
    }
  ])('create physicalInterfaces list for full DSA support devices', ({ devices, portBasedVlans, result, boardWan, boardLan }) => {
    const wrapper = createWrapper(VlanInterfaceEdit, {
      props,
      global: {
        provide: createProvide({ network: devices, portBased: portBasedVlans })
      },
      mocks: {
        $store: {
          board: {
            network: {
              wan: boardWan,
              lan: boardLan
            },
            hwinfo: {
              dsa: true
            }
          }
        }
      }
    })
    expect(wrapper.vm.physicalInterfaces).toEqual(result)
  })
  it.each([
    { deviceData: [], result: [] },
    { deviceData: [{ test: 'test' }], result: [{ test: 'test' }] }
  ])('renders networkDevices list', async ({ deviceData, result }) => {
    const localWrapper = createWrapper(VlanInterfaceEdit, {
      props,
      global: {
        provide: createProvide({ network: deviceData })
      }
    })
    const networkDevices = await localWrapper.vm.networkDevices
    expect(networkDevices).toEqual(result)
  })
  it.each([
    { L2tpv3Data: [], result: [] },
    { L2tpv3Data: [{ test: 'test' }], result: [{ test: 'test' }] }
  ])('renders L2tpv3Devices list', async ({ L2tpv3Data, result }) => {
    const localWrapper = createWrapper(VlanInterfaceEdit, {
      props,
      global: {
        provide: createProvide({ devices: [], l2tp: L2tpv3Data })
      }
    })
    const networkDevices = await localWrapper.vm.L2tpv3Devices
    expect(networkDevices).toEqual(result)
  })
  it.each([
    { portVlans: [], result: [] },
    { portVlans: [{ test: 'test' }], result: [{ test: 'test' }] }
  ])('renders portBasedVlans list', ({ portVlans, result }) => {
    const localWrapper = createWrapper(VlanInterfaceEdit, {
      props,
      global: {
        provide: createProvide({ portBased: portVlans })
      }
    })
    expect(localWrapper.vm.portBasedVlans).toEqual(result)
  })
})
