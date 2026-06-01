import ModbusSerial from '../../src/views/services/ModbusSerial.vue'
import createWrapper from '@tests/unit/mockFactory'

vi.mock('@/composables/useUniversalGatewayUtils', () => ({
  useUniversalGatewayUtils: vi.fn(() => ({
    getTagSize: vi.fn()
  }))
}))

describe('ModbusSerial overview tests', () => {
  it('returns client section options', () => {
    const wrapper = createWrapper(ModbusSerial)
    wrapper.vm.formData = {
      modbusSerialClient: [{ id: '1', name: 'test' }, { id: '2' }]
    }
    expect(wrapper.vm.clientSectionOptions).toEqual([
      ['1', 'test'],
      ['2', '2']
    ])
  })
  it.each([
    ['/dev/rs232', 'rs232'],
    ['/dev/rs485', 'rs485']
  ])('returns display when value when value is %s', async (value, response) => {
    const wrapper = createWrapper(ModbusSerial)
    wrapper.vm.$serial.deviceDisplayValue = vi.fn()
    wrapper.vm.$serial.deviceDisplayValue.mockResolvedValueOnce(response)
    const val = await wrapper.vm.displayDevices(value)
    expect(val).toEqual(response)
  })
  it.each([
    [{ name: 'aaaa' }, [{ name: 'test' }], true],
    [{ name: 'test' }, [{ name: 'test' }], false]
  ])('returns validation results', (value, data, response) => {
    const wrapper = createWrapper(ModbusSerial)
    const val = wrapper.vm.onAdd(value, data)
    expect(val.valid).toEqual(response)
  })
  it.each([
    [true, [{ info: "This instance can't be deleted because it has server configuration asigned to it" }]],
    [false, []]
  ])('returns hint when button is disabled %s', (status, hint) => {
    const wrapper = createWrapper(ModbusSerial)
    wrapper.vm.serversExist = vi.fn()
    wrapper.vm.serversExist.mockReturnValueOnce(status)
    const val = wrapper.vm.deleteHints('1')
    expect(val).toEqual(hint)
  })
  it('check if first load is set', async () => {
    const wrapper = createWrapper(ModbusSerial)
    wrapper.vm.$options.watch['globalEnabled.globalStatus'].call(wrapper.vm, true)
    expect(wrapper.vm.stateChanged).toBe(true)
  })
  it('check if state change is not set during first load', async () => {
    const wrapper = createWrapper(ModbusSerial)
    wrapper.vm.$options.watch['globalEnabled.globalStatus'].call(wrapper.vm, true, 'firstLoad')
    expect(wrapper.vm.stateChanged).toBe(false)
  })
  it('check if message is shown', async () => {
    const wrapper = createWrapper(ModbusSerial)
    const spyOn = vi.spyOn(wrapper.vm.$notification, 'info')
    wrapper.vm.stateChanged = true
    wrapper.vm.globalEnabled.globalStatus = false
    wrapper.vm.$options.watch.modalOpen.call(wrapper.vm, false)
    expect(spyOn).toHaveBeenCalledTimes(1)
  })
  it('check if message is removed', async () => {
    const wrapper = createWrapper(ModbusSerial)
    const spyOn = vi.spyOn(wrapper.vm.$notification, 'remove')
    wrapper.vm.stateChanged = true
    wrapper.vm.globalEnabled.globalStatus = true
    wrapper.vm.$options.watch.modalOpen.call(wrapper.vm, false)
    expect(spyOn).toHaveBeenCalledTimes(1)
  })
  it('returns form options', () => {
    const wrapper = createWrapper(ModbusSerial)
    const val = wrapper.vm.getFormOptions()
    expect(val).toEqual({
      device: [],
      serial: [],
      status: [],
      io: [],
      certificates: [],
      deviceList: [],
      phoneGroups: [],
      emailUsers: [],
      mounts: [],
      sourcedRegisters: [],
      tagStatus: {},
      dbSizesInPages: {}
    })
  })
  it('filters devices', async () => {
    const wrapper = createWrapper(ModbusSerial)
    const data = [
      ['/dev/rs1254', 'rs1254'],
      ['/dev/rs243', 'rs243']
    ]
    wrapper.vm.$serial.listDeviceNameTuples = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples.mockResolvedValueOnce(data)
    wrapper.vm.formOptions = { serial: data }
    const val = await wrapper.vm.devices
    expect(val).toEqual([
      ['/dev/rs1254', 'rs1254'],
      ['/dev/rs243', 'rs243']
    ])
  })
  it('passes validation', async () => {
    const wrapper = createWrapper(ModbusSerial)
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockResolvedValueOnce({ isValid: true })
    wrapper.vm.formData = { modbusSerialClient: [] }
    wrapper.vm.formOptions = { status: [] }
    await expect(wrapper.vm.validate()).resolves.toEqual({ isValid: true })
  })
  it('rejects when validation fails', async () => {
    const wrapper = createWrapper(ModbusSerial)
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockRejectedValueOnce({ isValid: false, message: 'Instance with the same device is already enabled' })
    wrapper.vm.formData = {
      modbusSerialClient: [
        { port_connect: '1', device: 'test', enabled: '1' },
        { port_listen: '1', device: 'test', enabled: '1' }
      ]
    }
    await expect(wrapper.vm.validate()).rejects.toEqual({ isValid: false, message: 'Instance with the same device is already enabled' })
  })
  it('deleted local storage after parent delete', () => {
    const wrapper = createWrapper(ModbusSerial)
    wrapper.vm.formData = { '1_request': ['test'], '1_alarm': ['test'] }
    wrapper.vm.removeChildren({ id: '1' })
    expect(wrapper.vm.formData).toEqual({ '1_request': [], '1_alarm': [] })
  })
  it('returns boolean value based on existing servers', () => {
    const wrapper = createWrapper(ModbusSerial)
    wrapper.vm.formData = { modbusSerialServer: [{ rtu_device: '1' }] }
    expect(wrapper.vm.serversExist('1')).toEqual(true)
  })
  const fakeSponse = [
    {
      success: false,
      data: ['io']
    },
    {
      success: true,
      data: { board: { serial: [] } }
    },
    {
      success: true,
      data: ['status']
    },
    {
      success: true,
      data: { generated: ['test'] }
    },
    {
      success: true,
      data: { generated: ['test'] }
    },
    {
      success: true,
      data: { enabled: '1' }
    },
    {
      success: true,
      data: [{}]
    },
    {
      success: true,
      data: []
    },
    {
      success: true,
      data: ['1']
    },
    {
      success: true,
      data: []
    },
    {
      success: true,
      data: {}
    },
    {
      success: true,
      data: ['1']
    },
    {
      success: true,
      data: ['2']
    }
  ]
  const fakeSponseFalse = [
    {
      success: false,
      data: ['io']
    },
    {
      success: false,
      data: { board: { serial: [] } }
    },
    {
      success: false,
      data: ['status']
    },
    {
      success: false,
      data: { enabled: '1' }
    },
    {
      success: false,
      data: [{}]
    },
    {
      success: false,
      data: []
    },
    {
      success: false,
      data: ['1']
    },
    {
      success: false,
      data: []
    },
    {
      success: false,
      data: {}
    },
    {
      success: false,
      data: ['1']
    },
    {
      success: false,
      data: ['2']
    }
  ]
  it.each([
    [{ modbusSerialServer: [{ id: 'test' }] }, fakeSponse, { test_alarm: ['1'], test_request: ['2'] }, 1],
    [{ modbusSerialServer: [{ id: 'test' }] }, fakeSponseFalse, {}, 11]
  ])('loads data', async (value, response, uciData, error) => {
    const wrapper = createWrapper(ModbusSerial)
    wrapper.vm.multiBulkGet = vi.fn()
    wrapper.vm.multiBulkGet.mockResolvedValueOnce(response)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const val = await wrapper.vm.loadData(value)
    expect(val).toEqual(uciData)
    expect(spy).toHaveBeenCalledTimes(error)
  })
  it('invokes error message', async () => {
    const wrapper = createWrapper(ModbusSerial)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData({ modbusSerialServer: [{ id: 'test' }] })
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it.each([
    [{ payload: [{ errors: [{ code: 2 }] }] }, 'Selected device is disconnected, it can not be enabled.'],
    [{ payload: [{ errors: [{ code: 1 }] }] }, 'Selected device is enabled elsewhere'],
    [{ payload: [{ errors: [{ code: 5 }] }] }, 'An unexpected error occurred']
  ])('returns device edit error messages', async (error, response) => {
    const wrapper = createWrapper(ModbusSerial)
    wrapper.vm.$serial.handleExternalDeviceErrors = vi.fn()
    wrapper.vm.$serial.handleExternalDeviceErrors.mockResolvedValueOnce(response)
    const val = await wrapper.vm.returnErrorMessage(error)
    expect(val).toEqual(response)
  })
  it('returns unavailable error message', () => {
    const wrapper = createWrapper(ModbusSerial)
    expect(wrapper.vm.deviceUnavailable()).toEqual('Device is unavailable')
  })
  it.each([
    [{}, '-'],
    [{ frequency: 'period', period: '10' }, '10'],
    [{ frequency: 'schedule', schedule: ['1:1:1'] }, '1:1:1'],
    [{ frequency: 'schedule', period: '10', schedule: ['1:1:1'] }, '1:1:1'],
    [{ frequency: 'schedule', schedule: ['1:1:1', '2:2:2'] }, '1:1:1, 2:2:2'],
    [{ frequency: 'schedule', schedule: ['1:1:1', '2:2:2', '3:3:3'] }, '1:1:1, 2:2:2, ...']
  ])('returns correct display frequency', (section, expected) => {
    const wrapper = createWrapper(ModbusSerial)
    expect(wrapper.vm.displayFrequency(section)).toEqual(expected)
  })
  it.each([
    ['1', { id: '1', name: 'test' }, 'test'],
    ['2', { id: '2', name: '-' }, '-']
  ])('returns serial device name', (id, serialClient, name) => {
    const wrapper = createWrapper(ModbusSerial)
    wrapper.vm.formData = {
      modbusSerialClient: [serialClient]
    }
    expect(wrapper.vm.displaySerialDevice(id)).toEqual(name)
  })
})
