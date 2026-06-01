import System from '../../src/views/status/System.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('System.vue', () => {
  let wrapper
  beforeEach(() => {
    const mockMixin = {
      methods: {
        timer: () => {}
      }
    }
    const MockedTestComponent = { ...System, mixins: [mockMixin] }
    wrapper = createWrapper(MockedTestComponent, {
      global: { mocks: { $store: { isSwitch: false, board: { hwinfo: { ethernet: true } }, deviceInfo: { static: {}, mnfinfo: {}, ports: [] } } } }
    })
  })
  const deviceResult = [
    {
      help: "This section displays the device's manufacturing information.",
      title: 'Device',
      content: [
        {
          hint: "The device's model name.",
          title: 'Device name',
          value: '-'
        },
        {
          hint: 'a.k.a., ordering code, displays under which product code the device was manufactured. Different product codes indicate different versions of the overall product.',
          title: 'Product code',
          value: '-'
        },
        {
          hint: 'Bootloader version currently used by the device. A Bootloader is a program that loads the operating system.',
          title: 'Bootloader version',
          value: '-'
        },
        {
          hint: "A unique 10-digit device identifier. It is required when connecting the device to test's Remote Management System (RMS). The device can be added to RMS via the Services → Cloud Solutions → RMS page.",
          title: 'Serial number',
          value: '-'
        },
        {
          hint: "A 4-digit number representing the device's hardware revision version.",
          title: 'Hardware revision',
          value: '-'
        },
        {
          hint: 'A 4-digit number that indicates the batch of materials.',
          title: 'Batch number',
          value: '-'
        },
        {
          hint: 'Hardware branch identifier.',
          title: 'Branch',
          value: '-'
        }
      ]
    }
  ]
  const macResult = [
    {
      help: "This section displays the device's MAC addresses.",
      title: 'Mac addresses',
      content: []
    }
  ]
  const memoryResult = [
    {
      help: 'This section displays memory usage information.',
      title: 'Memory',
      content: [
        {
          hint: 'Amount of random-access memory (RAM) used by temporarily stored data before moving it to another location.',
          slotName: 'ram_used',
          scoped: true,
          title: 'RAM used',
          value: {
            total: undefined,
            used: undefined,
            unit: 'MB'
          }
        },
        {
          hint: 'Amount of buffered memory.',
          slotName: 'ram_buffered',
          scoped: true,
          title: 'RAM buffered',
          value: {
            total: undefined,
            used: undefined,
            unit: 'MB'
          }
        },
        {
          hint: 'Amount of Flash memory used.',
          slotName: 'flash_used',
          scoped: true,
          title: 'Flash used',
          value: {
            total: undefined,
            used: undefined
          }
        }
      ]
    }
  ]
  const systemResult = [
    {
      help: 'This section displays basic system related information.',
      title: 'System',
      content: [
        {
          hint: 'Firmware version currently installed in the device.',
          title: 'Firmware version',
          value: '-'
        },
        {
          hint: "Device's kernel version. A kernel is a computer program responsible for connecting a device's software to its hardware.",
          title: 'Kernel version',
          value: '-'
        },
        {
          hint: "Device's time based on the time zone settings selected in Services → NTP.",
          title: 'Local device time',
          value: '-'
        },
        {
          hint: "The amount of time that has passed since the device's last start up.",
          title: 'Uptime',
          value: '-'
        },
        {
          hint: 'CPU load average (in %) over the last minute, 5 minutes and 15 minutes.',
          title: 'Load average',
          value: '-'
        }
      ]
    }
  ]
  it('converts string to mac address', () => {
    expect(wrapper.vm.macConverter('001E424ECE64')).toEqual('00:1E:42:4E:CE:64')
    expect(wrapper.vm.macConverter('AB1B723DCF15')).toEqual('AB:1B:72:3D:CF:15')
    expect(wrapper.vm.macConverter('N/A')).toEqual('N/A')
  })
  it('converts MB to MB, GB and adds suffix', () => {
    expect(wrapper.vm.convert(10, 1000)).toEqual('10.0 MB')
    expect(wrapper.vm.convert(5000, 1000)).toEqual('5.0 GB')
  })
  it('returns combined CPU load', () => {
    const data = {
      min1: 0.2011,
      min5: 0.4455,
      min15: 0.3242
    }
    expect(wrapper.vm.cpuLoadConverter(data)).toEqual('0.20, 0.45, 0.32')
    expect(wrapper.vm.cpuLoadConverter('')).toEqual('-')
  })
  it('returns modems data', () => {
    const data = [
      {
        name: 'Internal modem',
        id: '3-1',
        primary: 0
      }
    ]
    const result = [
      {
        help: "This section displays information related to the device's cellular module.",
        title: 'Internal modem',
        content: [
          {
            hint: "Modem's model number.",
            title: 'Model',
            value: '-'
          },
          {
            hint: 'The IMEI (International Mobile Equipment Identity) is a unique 15 decimal digit number used to identify mobile modules. GSM network operators use the IMEI to identify devices in their networks.',
            title: 'IMEI',
            value: '-'
          },
          {
            hint: "Modem's current firmware version.",
            title: 'FW version',
            value: '-',
            customHints: null,
            slotName: undefined
          },
          {
            hint: "Modem's current temperature.",
            title: 'Temperature',
            value: '-'
          }
        ]
      }
    ]
    wrapper.vm.$mobile.parseModems = vi.fn().mockReturnValueOnce(data)
    expect(wrapper.vm.parseModemsData(data)).toEqual(result)
  })
  it('returns system data', () => {
    expect(wrapper.vm.parseSystemData('', '')).toEqual(systemResult)
  })
  it('returns memory data', () => {
    expect(wrapper.vm.parseMemoryData('')).toEqual(memoryResult)
  })
  it('returns device data', () => {
    const data = {
      static: {},
      mnfinfo: {}
    }
    expect(wrapper.vm.parseDeviceData(data)).toEqual(deviceResult)
  })
  it('returns macs data', () => {
    expect(wrapper.vm.parseMacsData([])).toEqual(macResult)
  })
  it('returns macs data when wifiData exists and is Switch', () => {
    const result = [
      {
        help: "This section displays the device's MAC addresses.",
        title: 'Mac addresses',
        content: [
          {
            hint: 'MAC (Media Access Control) address used for communication.',
            title: 'Device MAC address',
            value: '-'
          },

          {
            hint: 'MAC (Media Access Control) address used for communication in a wireless network.',
            title: 'Wireless (2.4GHZ) MAC address',
            value: '-'
          },
          {
            hint: 'MAC (Media Access Control) address used for communication in a wireless network.',
            title: 'Wireless (5GHZ) MAC address',
            value: '-'
          }
        ]
      }
    ]
    wrapper.vm.$store.isSwitch = true
    wrapper.vm.$store.board.hwinfo.ports = [
      { mac: '00:1E:42:5A:EC:77', num: 2, name: 'LAN', position: 1 },
      { mac: '00:1E:42:5A:EC:77', num: 3, name: 'LAN', position: 2 },
      { mac: '00:1E:42:5A:EC:77', num: 4, name: 'LAN', position: 3 },
      { mac: '00:1E:42:5A:EC:78', num: 5, name: 'WAN', position: 5 }
    ]

    expect(
      wrapper.vm.parseMacsData([
        { band: '2.4GHZ', macaddr: '-' },
        { band: '5GHZ', macaddr: '-' }
      ])
    ).toEqual(result)
  })
  it('returns macs data when wifiData exists and is not Switch', () => {
    const result = [
      {
        help: "This section displays the device's MAC addresses.",
        title: 'Mac addresses',
        content: [
          {
            hint: 'MAC (Media Access Control) address used for communication in a wireless network.',
            title: 'Wireless (2.4GHZ) MAC address',
            value: '-'
          },
          {
            hint: 'MAC (Media Access Control) address used for communication in a wireless network.',
            title: 'Wireless (5GHZ) MAC address',
            value: '-'
          }
        ]
      }
    ]
    wrapper.vm.$store.isSwitch = false
    wrapper.vm.$store.board.hwinfo.ports = [
      { mac: '00:1E:42:5A:EC:77', num: 2, name: 'LAN', position: 1 },
      { mac: '00:1E:42:5A:EC:77', num: 3, name: 'LAN', position: 2 },
      { mac: '00:1E:42:5A:EC:77', num: 4, name: 'LAN', position: 3 },
      { mac: '00:1E:42:5A:EC:78', num: 5, name: 'WAN', position: 5 }
    ]

    expect(
      wrapper.vm.parseMacsData([
        { band: '2.4GHZ', macaddr: '-' },
        { band: '5GHZ', macaddr: '-' }
      ])
    ).toEqual(result)
  })
  it('checks if the number of unsuccessful requests is 3', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: false, data: '' },
      { success: false, data: '' },
      { success: false, data: '' }
    ])
    const spyError = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getStatusData()
    expect(wrapper.vm.cards).toEqual({ device_card: deviceResult, macs_card: {}, memory_card: {}, modems_card: {}, system_card: {} })
    expect(spyError).toBeCalledTimes(3)
  })
  it('checks if the number of successful requests is 2', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: true, data: '' },
      { success: true, data: '' }
    ])
    wrapper.vm.parseDeviceData = vi.fn()
    wrapper.vm.parseModemsData = vi.fn()
    await wrapper.vm.getStatusData()
    expect(wrapper.vm.parseDeviceData).toHaveBeenCalled()
    expect(wrapper.vm.parseModemsData).toHaveBeenCalled()
  })
  it('checks returned data from bulkGet', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: true, data: [] },
      { success: true, data: [] },
      { success: true, data: [] }
    ])
    wrapper.vm.$mobile.parseModems = vi.fn().mockReturnValueOnce([])
    await wrapper.vm.getStatusData()
    expect(wrapper.vm.cards.device_card).toEqual(deviceResult)
    expect(wrapper.vm.cards.modems_card).toEqual([])
    expect(wrapper.vm.cards.macs_card).toEqual(macResult)
  })
  it('checks returned data from dynamic data get', async () => {
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce({ success: true, data: { memory: [] } })
    await wrapper.vm.getDynamicData()
    expect(wrapper.vm.cards.system_card).toEqual(systemResult)
    expect(wrapper.vm.cards.memory_card).toEqual(memoryResult)
  })
  it('checks if dynamic data get failed', async () => {
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce({ success: false, data: '' })
    const spyError = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getDynamicData()
    expect(wrapper.vm.cards).toEqual({ device_card: {}, macs_card: {}, memory_card: {}, modems_card: {}, system_card: {} })
    expect(spyError).toHaveBeenCalled()
  })
})
