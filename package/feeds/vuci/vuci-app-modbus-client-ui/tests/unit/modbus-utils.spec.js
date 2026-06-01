import ModbusUtils from '@/components/shared/ModbusUtils.vue'
import createWrapper from '@tests/unit/mockFactory'

vi.mock('@/composables/useUniversalGatewayUtils', () => ({
  useUniversalGatewayUtils: vi.fn(() => ({
    getTagSize: vi.fn()
  }))
}))

describe('ModbusUtils tests', () => {
  let props = {
    section: {
      id: 'test',
      name: 'new',
      '.type': 'alarm_test',
      enabled: '1',
      device: 'test',
      server_id: '1',
      timeout: '1',
      value: 'test'
    },
    dataOptions: () => [],
    validate: () => {}
  }

  const formOptions = {
    serial: [],
    status: [],
    deviceList: [],
    mobile: [],
    io: [],
    phoneGroups: [],
    emailUsers: []
  }

  const textBoxParameters = [
    { parameter: '%ts', description: 'Local time' },
    { parameter: '%ut', description: 'Unix time' },
    { parameter: '%rn', description: 'Router name' },
    { parameter: '%pc', description: 'Device name' },
    { parameter: '%sn', description: 'Serial number' },
    { parameter: '%fc', description: 'Current FW version' },
    { parameter: '%li', description: 'LAN IP address' },
    { parameter: '%ms', description: 'Monitoring status' },
    { parameter: '%it', description: 'UTC time in ISO' },
    { parameter: '%wi', description: 'WAN IPv4 address' },
    { parameter: '%ws', description: 'WAN IPv6 address' },
    { parameter: '%nl', description: 'New line' },
    { parameter: '%id', description: 'Modbus server ID' },
    { parameter: '%ip', description: 'Modbus server IP' },
    { parameter: '%fn', description: 'First register number' },
    { parameter: '%rv', description: 'Register value' }
  ]
  const modemParameters = [
    { parameter: '%mi', description: 'Mobile IP addresses' },
    { parameter: '%ss', description: 'Signal strength' },
    { parameter: '%on', description: 'Operator name' },
    { parameter: '%ct', description: 'Network type' },
    { parameter: '%cs', description: 'Data connection state' },
    { parameter: '%ns', description: 'Network state' },
    { parameter: '%im', description: 'IMSI' },
    { parameter: '%ie', description: 'IMEI' },
    { parameter: '%md', description: 'Modem model' },
    { parameter: '%is', description: 'Modem serial number' },
    { parameter: '%ps', description: 'SIM PIN state' },
    { parameter: '%st', description: 'SIM state' },
    { parameter: '%cp', description: 'RSCP' },
    { parameter: '%ec', description: 'ECIO' },
    { parameter: '%rp', description: 'RSRP' },
    { parameter: '%sr', description: 'SINR' },
    { parameter: '%rq', description: 'RSRQ' },
    { parameter: '%ic', description: 'ICCID' },
    { parameter: '%ci', description: 'CELLID' },
    { parameter: '%nb', description: 'Neighbour cells' },
    { parameter: '%ni', description: 'Network info' },
    { parameter: '%sv', description: 'Network serving' }
  ]
  const textBoxParametersWithSim = [...textBoxParameters].concat({ parameter: '%su', description: 'SIM slot in use' }).concat(modemParameters)
  const textBoxParametersWithModem = [...textBoxParameters].concat(modemParameters)
  const textBoxParametersWithWiredWan = [...textBoxParameters].concat({ parameter: '%wm', description: 'WAN MAC address' })
  const textBoxParametersWithIo = [...textBoxParameters].concat([
    { parameter: '%gpio', description: 'gpio' },
    { parameter: '%dwi', description: 'dwi' },
    { parameter: '%relay', description: 'relay' },
    { parameter: '%adc', description: 'adc' },
    { parameter: '%acl', description: 'acl' }
  ])
  const textBoxParametersWithLan = [...textBoxParameters].concat({ parameter: '%lm', description: 'LAN MAC address' })
  const textBoxIoParams = [
    { type: 'gpio', name_with_params: 'gpio', io_param: 'gpio', name_with_pins: 'gpio' },
    { type: 'dwi', name_with_params: 'dwi', io_param: 'dwi', name_with_pins: 'dwi' },
    { type: 'relay', name_with_params: 'relay', io_param: 'relay', name_with_pins: 'relay' },
    { type: 'adc', name_with_params: 'adc', io_param: 'adc', name_with_pins: 'adc' },
    { type: 'acl', name_with_params: 'acl', io_param: 'acl', name_with_pins: 'acl' },
    { type: 'test', name_with_params: 'test', io_param: 'test', name_with_pins: 'test' }
  ]
  it.each([
    [[], false, [], [], false, 'lan', false, false, textBoxParameters],
    [[{ simcount: '2' }], true, [], [], false, 'lan', false, false, textBoxParametersWithSim],
    [[{}], true, [], [], false, 'lan', false, false, textBoxParametersWithModem],
    [[], false, [], [{ name: 'test' }], true, { ifname: 'test' }, false, false, textBoxParametersWithWiredWan],
    [[], false, textBoxIoParams, [], false, 'lan', false, false, textBoxParametersWithIo],
    [[], false, [], [{ name: 'test' }], false, { ifname: 'test test' }, false, false, textBoxParametersWithLan],
    [[], false, [], [{ name: 'test' }], false, { ifname: 'test' }, true, false, textBoxParametersWithLan]
  ])('renders text box parameters list', async (modems, mobile, ioData, deviceList, wan, lan, ethernet, gps, result) => {
    formOptions.io = ioData
    formOptions.deviceList = deviceList
    formOptions.certificates = []
    const wrapper = createWrapper(ModbusUtils, {
      data: () => ({
        board: { network: { lan, wan }, hwinfo: { ethernet, gps, mobile }, modems }
      }),
      props,
      global: {
        provide: { formOptions: () => formOptions },
        mocks: {
          $io: {
            getFilteredPinsInfo: vi.fn().mockReturnValue(ioData)
          }
        }
      }
    })
    Object.defineProperty(wrapper.vm, 'simCount', {
      get: () => modems[0].simcount
    })
    const list = await wrapper.vm.jsonParameters
    expect(list).toEqual(result)
  })
  it.each([
    [[], 0],
    [[{ simcount: 1 }], 1],
    [[{ simcount: 1 }, { simcount: 2 }], 2]
  ])('load sim count', (modems, result) => {
    const wrapper = createWrapper(ModbusUtils, {
      props,
      data: () => ({
        board: { hwinfo: { mobile: true }, modems }
      }),
      global: {
        provide: { formOptions: () => formOptions },
        $mobile: {
          simCount: () => {}
        }
      }
    })
    wrapper.vm.$mobile.parseModems = vi.fn().mockReturnValueOnce(modems)
    wrapper.vm.$mobile.simCount = vi.fn().mockReturnValueOnce(result)
    const simcount = wrapper.vm.simCount
    expect(simcount).toEqual(result)
  })
})
