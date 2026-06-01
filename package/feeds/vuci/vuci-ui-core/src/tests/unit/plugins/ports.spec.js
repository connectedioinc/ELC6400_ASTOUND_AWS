import * as ports from '@/plugins/ports'
import '@ui-core/utils/string-format'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import i18n from '@ui-core/plugins/i18n'
import { useMainStore } from '@/stores/main'

const devicePorts = {
  rutx12: {
    portIds: ['_lan1', '_lan2', '_lan3', '_lan4', '_wan5'],
    dsa: false,
    isSwitch: false,
    switch: {
      switch0: {
        ports: [
          { device: 'eth0', num: 0 },
          { role: 'lan', num: 1 },
          { role: 'lan', num: 2 },
          { role: 'lan', num: 3 },
          { role: 'lan', num: 4 },
          { device: 'eth1', num: 0 },
          { role: 'wan', num: 5 }
        ]
      }
    }
  },
  rutx08: {
    portIds: ['_lan2', '_lan3', '_lan4', '_wan5'],
    dsa: false,
    isSwitch: false,
    switch: {
      switch0: {
        ports: [
          { device: 'eth0', num: 0 },
          { role: 'lan', num: 2, index: 1 },
          { role: 'lan', num: 3, index: 2 },
          { role: 'lan', num: 4, index: 3 },
          { device: 'eth1', num: 0 },
          { role: 'wan', num: 5 }
        ]
      }
    }
  },
  trb140: {
    portIds: ['_lan1'],
    dsa: false,
    isSwitch: false,
    switch: undefined
  },
  rutm51: {
    portIds: ['_lan1', '_lan2', '_lan3', '_lan4', '_wan'],
    dsa: true,
    isSwitch: false,
    network: { wan: { device: 'wan' }, lan: { ports: ['lan1', 'lan2', 'lan3', 'lan4'] } }
  },
  rut241: {
    portIds: ['_lan1', '_wan0'],
    dsa: false,
    isSwitch: false,
    switch: {
      switch0: {
        ports: [
          { role: 'lan', num: 1 },
          { role: 'wan', num: 0, index: 2 },
          { device: 'eth0', num: 6 }
        ]
      }
    }
  },
  rut956: {
    portIds: ['_lan0', '_lan1', '_lan2', '_wan4'],
    dsa: false,
    isSwitch: false,
    switch: {
      switch0: {
        ports: [
          { role: 'lan', num: 0, index: 1 },
          { role: 'lan', num: 1, index: 2 },
          { role: 'lan', num: 2, index: 3 },
          { role: 'wan', num: 4 },
          { device: 'eth0', num: 6 }
        ]
      }
    }
  },
  tsw202: {
    portIds: ['port1', 'port2', 'port3', 'port4', 'port5', 'port6', 'port7', 'port8', 'sfp1', 'sfp2'],
    dsa: false,
    isSwitch: true,
    network: {
      static: {
        ports: [
          { type: 'eth', name: 'port1', position: 'up', block: '0', num: '1' },
          { type: 'eth', name: 'port2', position: 'down', block: '0', num: '2' },
          { type: 'eth', name: 'port3', position: 'up', block: '0', num: '3' },
          { type: 'eth', name: 'port4', position: 'down', block: '0', num: '4' },
          { type: 'eth', name: 'port5', position: 'up', block: '0', num: '5' },
          { type: 'eth', name: 'port6', position: 'down', block: '0', num: '6' },
          { type: 'eth', name: 'port7', position: 'up', block: '0', num: '7' },
          { type: 'eth', name: 'port8', position: 'down', block: '0', num: '8' },
          { type: 'sfp', name: 'sfp1', position: 'down', block: '1', num: '1' },
          { type: 'sfp', name: 'sfp2', position: 'up', block: '1', num: '2' }
        ]
      }
    }
  },
  swm280: {
    portIds: ['port1', 'port24', 'sfp1', 'sfp4'],
    dsa: false,
    isSwitch: true,
    network: {
      static: {
        ports: [
          { name: 'port1', type: 'eth', num: '1', position: 'up', block: '0' },
          { name: 'port24', type: 'eth', num: '24', position: 'down', block: '0' },
          { name: 'sfp1', type: 'sfp', num: '25', position: 'down', block: '1' },
          { name: 'sfp4', type: 'sfp', num: '28', position: 'up', block: '1' }
        ]
      }
    }
  }
}

function setStore(store, device) {
  const deviceInfo = devicePorts[device]
  store.isSwitch = deviceInfo.isSwitch
  store.board = { hwinfo: { dsa: deviceInfo.dsa }, switch: deviceInfo.switch, network: deviceInfo.network }
}

describe('ports.js', () => {
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
    status                                          | poe      | expectedResult
    ${{ id: 'port1' }}                              | ${false} | ${'none'}
    ${{ id: 'port1', poe_enable: '1' }}             | ${true}  | ${'enabled'}
    ${{ id: 'port1', poe_enable: '0' }}             | ${true}  | ${'disabled'}
    ${{ power: '1', id: 'port1', poe_enable: '1' }} | ${true}  | ${'active'}
  `('returns poe status #%#', ({ status, poe, expectedResult }) => {
    store.isPoe = () => poe
    expect(ports.getPoeState(status)).toEqual(expectedResult)
  })

  it.each`
    board                                                                                                                 | dsa      | res
    ${{ network: { lan: { ports: ['lan1', 'lan2', 'lan3'] }, wan: { device: 'wan' } } }}                                  | ${true}  | ${[{ name: '_lan1', custom: 'LAN1', num: '1', block: 'eth', type: 'eth', position: 'up' }, { name: '_lan2', custom: 'LAN2', num: '2', block: 'eth', type: 'eth', position: 'up' }, { name: '_lan3', custom: 'LAN3', num: '3', block: 'eth', type: 'eth', position: 'up' }, { name: '_wan', custom: 'WAN', num: '4', block: 'eth', type: 'eth', position: 'up' }]}
    ${{ network: { lan: { ports: ['lan1', 'lan2', 'lan3'] } } }}                                                          | ${true}  | ${[{ name: '_lan1', custom: 'LAN1', num: '1', block: 'eth', type: 'eth', position: 'up' }, { name: '_lan2', custom: 'LAN2', num: '2', block: 'eth', type: 'eth', position: 'up' }, { name: '_lan3', custom: 'LAN3', num: '3', block: 'eth', type: 'eth', position: 'up' }]}
    ${{ switch: { switch0: { ports: [{ role: 'lan', num: '2', index: '1' }, { role: 'wan', index: '4', num: '5' }] } } }} | ${false} | ${[{ name: '_lan2', custom: 'LAN', num: '2', block: 'eth', type: 'eth', position: 'up' }, { name: '_wan5', custom: 'WAN', num: '5', block: 'eth', type: 'eth', position: 'up' }]}
    ${{ network: { lan: { device: 'eth0' } } }}                                                                           | ${false} | ${[{ name: '_lan1', custom: 'LAN', num: '1', block: 'eth', type: 'eth', position: 'up' }]}
    ${{ network: { wan: { device: 'eth1' } } }}                                                                           | ${false} | ${[{ name: '_wan0', custom: 'WAN', num: '2', block: 'eth', type: 'eth', position: 'up' }]}
    ${{ network: { lan: { device: 'eth0' }, wan: { device: 'eth1' } } }}                                                  | ${false} | ${[{ name: '_lan1', custom: 'LAN', num: '1', block: 'eth', type: 'eth', position: 'up' }, { name: '_wan0', custom: 'WAN', num: '2', block: 'eth', type: 'eth', position: 'up' }]}
  `('parses board ports when board is $board and dsa is $dsa #%#', async ({ board, dsa, res }) => {
    store.board = { hwinfo: { dsa }, ...board }
    expect(ports.getRutosBoardPorts()).toEqual(res)
  })

  it.each`
    device      | space        | expectedResult
    ${'rutx12'} | ${undefined} | ${['LAN 1', 'LAN 2', 'LAN 3', 'LAN 4', 'WAN']}
    ${'rutx08'} | ${undefined} | ${['LAN 1', 'LAN 2', 'LAN 3', 'WAN']}
    ${'rutx08'} | ${false}     | ${['LAN1', 'LAN2', 'LAN3', 'WAN']}
    ${'trb140'} | ${undefined} | ${['LAN']}
    ${'rutm51'} | ${undefined} | ${['LAN 1', 'LAN 2', 'LAN 3', 'LAN 4', 'WAN']}
    ${'rut241'} | ${undefined} | ${['LAN', 'WAN']}
    ${'tsw202'} | ${undefined} | ${['Port 1', 'Port 2', 'Port 3', 'Port 4', 'Port 5', 'Port 6', 'Port 7', 'Port 8', 'SFP 1', 'SFP 2']}
    ${'swm280'} | ${undefined} | ${['Port 1', 'Port 24', 'SFP 25', 'SFP 28']}
    ${'rut956'} | ${undefined} | ${['LAN 1', 'LAN 2', 'LAN 3', 'WAN']}
  `('returns pretty port ids for $device', ({ device, space, expectedResult }) => {
    setStore(store, device)
    expect(devicePorts[device].portIds.map(portId => ports.getPrettyPortId(portId, space))).toEqual(expectedResult)
  })

  it.each`
    device      | expectedResult
    ${'tsw202'} | ${['1', '2', '3', '4', '5', '6', '7', '8', 'SFP 1', 'SFP 2']}
    ${'swm280'} | ${['1', '24', 'SFP 25', 'SFP 28']}
  `('returns short pretty port ids for $device', ({ device, expectedResult }) => {
    setStore(store, device)
    const fakeStatus = devicePorts[device].portIds.map(id => ({ id }))
    expect(devicePorts[device].portIds.map(portId => ports.getShortPrettyId(portId, fakeStatus))).toEqual(expectedResult)
  })

  it.each`
    status                                     | expectedResult
    ${{ description: undefined, id: 'port1' }} | ${'Port'}
    ${{ description: 'My port', id: 'port1' }} | ${'My port'}
  `('returns port id #%#', ({ status, expectedResult }) => {
    store.isRouter = false
    store.board = { hwinfo: { dsa: true } }
    expect(ports.getPortName(status)).toEqual(expectedResult)
  })

  it.each`
    status                                                                                                                                                                                                                                                                                                                                           | expectedResult
    ${{ rx_bytes: '8705557', poe_enable: '1', tx_bytes: '13523112', link: '1', id: 'port1', full_duplex: '1', tx_rate: '140', enabled: '1', speed: '1000', budget: '0', rx_rate: '140', power: '0' }}                                                                                                                                                | ${[{ info: '', title: 'Port 1' }, { info: 'Connected', title: 'Status' }, { info: 'GbE', title: 'Speed' }, { info: 'Full-Duplex', title: 'Duplex' }, { info: 'Inactive', title: 'PoE' }, { info: '12.9 MB', title: 'TX SUM' }, { info: '8.3 MB', title: 'RX SUM' }, { info: '140 bps', title: 'TX RATE' }, { info: '140 bps', title: 'RX RATE' }, { info: '-', title: 'Vendor' }, { info: '-', title: 'Serial' }, { info: '-', title: 'Part number' }, { info: '- V', title: 'Voltage' }, { info: '- mA', title: 'Current' }, { info: '- mW', title: 'Output power' }, { info: '- °C', title: 'Temperature' }]}
    ${{ rx_bytes: '8705557', poe_enable: '0', tx_bytes: '13523112', link: '1', id: 'port1', full_duplex: '1', tx_rate: '140', enabled: '1', speed: '1000', budget: '0', rx_rate: '140', power: '0' }}                                                                                                                                                | ${[{ info: '', title: 'Port 1' }, { info: 'Connected', title: 'Status' }, { info: 'GbE', title: 'Speed' }, { info: 'Full-Duplex', title: 'Duplex' }, { info: 'Disabled', title: 'PoE' }, { info: '12.9 MB', title: 'TX SUM' }, { info: '8.3 MB', title: 'RX SUM' }, { info: '140 bps', title: 'TX RATE' }, { info: '140 bps', title: 'RX RATE' }, { info: '-', title: 'Vendor' }, { info: '-', title: 'Serial' }, { info: '-', title: 'Part number' }, { info: '- V', title: 'Voltage' }, { info: '- mA', title: 'Current' }, { info: '- mW', title: 'Output power' }, { info: '- °C', title: 'Temperature' }]}
    ${{ rx_bytes: '8705557', poe_enable: '1', tx_bytes: '13523112', link: '1', id: 'port1', full_duplex: '1', tx_rate: '140', enabled: '1', speed: '1000', budget: '3312', rx_rate: '140', power: '1', vendor: 'SFPMOD', serial: 'S456123156', part_number: 'SFP123', voltage: '3.4', current: '13.35', output_power: '0.0642', temperature: '36' }} | ${[{ info: '', title: 'Port 1' }, { info: 'Connected', title: 'Status' }, { info: 'GbE', title: 'Speed' }, { info: 'Full-Duplex', title: 'Duplex' }, { info: '3.31 W', title: 'PoE' }, { info: '12.9 MB', title: 'TX SUM' }, { info: '8.3 MB', title: 'RX SUM' }, { info: '140 bps', title: 'TX RATE' }, { info: '140 bps', title: 'RX RATE' }, { info: 'SFPMOD', title: 'Vendor' }, { info: 'S456123156', title: 'Serial' }, { info: 'SFP123', title: 'Part number' }, { info: '3.4 V', title: 'Voltage' }, { info: '13.35 mA', title: 'Current' }, { info: '0.0642 mW', title: 'Output power' }, { info: '36 °C', title: 'Temperature' }]}
    ${{ id: 'sfp1', enabled: '1', link: '0', name: 'LAN', position: 2 }}                                                                                                                                                                                                                                                                             | ${[{ info: '', title: 'SFP 1' }, { info: 'Disconnected', title: 'Status' }, { info: 'Disabled', title: 'PoE' }]}
    ${{ id: 'sfp2', enabled: '0', link: '0', name: 'LAN', position: 2 }}                                                                                                                                                                                                                                                                             | ${[{ info: '', title: 'SFP 2' }, { info: 'Disabled', title: 'Status' }, { info: 'Disabled', title: 'PoE' }]}
  `('returns TSW port hint #%#', ({ status, expectedResult }) => {
    store.isPoe = () => true
    setStore(store, 'tsw202')
    expect(ports.getTswPortHint(status)).toEqual(expectedResult)
  })

  it.each`
    dsa      | poe      | status                                                                                                                                                      | expectedResult
    ${true}  | ${true}  | ${{ id: '_lan2', enabled: '1', state: 'down', name: 'LAN', position: 2 }}                                                                                   | ${[{ info: '', title: 'LAN 2' }, { info: 'Disconnected', title: 'Status' }, { info: 'Disabled', title: 'PoE' }]}
    ${true}  | ${false} | ${{ id: '_lan2', enabled: '0', state: 'down', name: 'LAN', position: 2 }}                                                                                   | ${[{ info: '', title: 'LAN 2' }, { info: 'Disabled', title: 'Status' }]}
    ${false} | ${false} | ${{ id: '_lan1', state: 'up', num: 2, name: 'LAN', position: 1, speed: '1000', enabled: '1', duplex: 'true' }}                                              | ${[{ info: '', title: 'LAN' }, { info: 'Connected', title: 'Status' }, { info: 'GbE', title: 'Speed' }, { info: 'Full-Duplex', title: 'Duplex' }]}
    ${true}  | ${true}  | ${{ id: '_lan2', duplex: 'true', poe_enable: '1', power: '1', state: 'up', enabled: '1', name: 'LAN', position: 2, speed: '1000', budget: '3312', num: 4 }} | ${[{ info: '', title: 'LAN 2' }, { info: 'Connected', title: 'Status' }, { info: 'GbE', title: 'Speed' }, { info: 'Full-Duplex', title: 'Duplex' }, { info: '3.31 W', title: 'PoE' }]}
  `('returns RUT port hint #%#', ({ dsa, poe, status, expectedResult }) => {
    store.isPoe = () => poe
    store.board = { hwinfo: { dsa } }
    expect(ports.getRutPortHint(status)).toEqual(expectedResult)
  })

  it.each`
    status                            | expectedResult
    ${{ enabled: '0' }}               | ${undefined}
    ${{ enabled: '1', speed: '100' }} | ${'100'}
  `('returns port speed icon name #%#', ({ status, expectedResult }) => {
    expect(ports.getPortSpeedIcon(status)).toEqual(expectedResult)
  })

  it.each`
    status              | expectedResult
    ${{ speed: '100' }} | ${'FE'}
    ${'100'}            | ${'FE'}
    ${100}              | ${'FE'}
    ${undefined}        | ${'-'}
    ${10}               | ${'E'}
    ${1000}             | ${'GbE'}
    ${2500}             | ${'2.5GbE'}
    ${10000}            | ${'10GbE'}
  `('returns port speed name #%#', ({ status, expectedResult }) => {
    expect(ports.getPortSpeed(status)).toEqual(expectedResult)
  })

  it.each`
    modelValue                                                                                                              | selectedPorts         | configSettings         | expectedResult
    ${[{ id: 'port1', enabled: '1' }, { id: 'port2', enabled: '0' }]}                                                       | ${['port1']}          | ${['id']}              | ${{ initialForm: { id: 'port1' }, differs: false }}
    ${[{ id: 'port1', enabled: '1' }, { id: 'port2', enabled: '0' }]}                                                       | ${['port1', 'port2']} | ${['id']}              | ${{ initialForm: { id: 'port1' }, differs: true }}
    ${[{ id: 'port1', enabled: '1' }, { id: 'port2', enabled: '1' }]}                                                       | ${['port1', 'port2']} | ${['enabled']}         | ${{ initialForm: { enabled: '1' }, differs: false }}
    ${[{ id: 'port1', enabled: '1' }, { id: 'port2', enabled: '0' }]}                                                       | ${['port1', 'port2']} | ${['enabled']}         | ${{ initialForm: { enabled: '1' }, differs: true }}
    ${[{ id: 'port1', enabled: '1' }, { id: 'port2', enabled: '0', name: 'test1' }]}                                        | ${['port1', 'port2']} | ${['enabled', 'name']} | ${{ initialForm: { enabled: '1', name: 'test1' }, differs: true }}
    ${[{ id: 'port1', arr: ['test1', 'test2'] }, { id: 'port2', arr: ['test1'] }]}                                          | ${['port1', 'port2']} | ${['arr']}             | ${{ initialForm: { arr: ['test1', 'test2'] }, differs: true }}
    ${[{ id: 'port1', advert: ['100mh', '10mh'] }, { id: 'port2', advert: ['100mh', '1000mh'] }]}                           | ${['port1', 'port2']} | ${['advert']}          | ${{ initialForm: { advert: ['100mh', '10mh'] }, differs: true }}
    ${[{ id: 'port1', advert: ['100mh', '10mh'] }, { id: 'port2', advert: ['100mh', '10mh'] }]}                             | ${['port1', 'port2']} | ${['advert']}          | ${{ initialForm: { advert: ['100mh', '10mh'] }, differs: false }}
    ${[{ id: 'port1', enabled: '1', advert: ['100mh', '10mh'] }, { id: 'port2', enabled: '1', advert: ['100mh', '10mh'] }]} | ${['port1', 'port2']} | ${['enabled']}         | ${{ initialForm: { enabled: '1' }, differs: false }}
    ${[{ id: 'port1', advert: ['100mh', '10mh'] }, { id: 'port2', advert: ['100mh', '10mh'] }]}                             | ${['port1', 'port2']} | ${[]}                  | ${{ initialForm: {}, differs: false }}
  `('tests getPortsConfigDiffer', ({ modelValue, selectedPorts, configSettings, expectedResult }) => {
    expect(ports.getPortsConfig(selectedPorts, modelValue, configSettings)).toEqual(expectedResult)
  })
})
