import ModbusSerialServer from '../../src/views/services/ModbusSerialServer.vue'
import createWrapper from '@tests/unit/mockFactory'

vi.mock('@/composables/useUniversalGatewayUtils', () => ({
  useUniversalGatewayUtils: vi.fn(() => ({
    getTagSize: vi.fn()
  }))
}))

describe('Modbus Serial server overview tests', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(ModbusSerialServer, {
      global: {
        stubs: {
          'vuci-form-item-switch': { template: '<div />' },
          'vuci-form-item-dummy': { template: '<div />' }
        }
      }
    })
  })

  it('filters devices', async () => {
    const data = [
      ['/dev/rs1254', 'rs1254'],
      ['/dev/rs243', 'rs243']
    ]
    wrapper.vm.formOptions = { serial: data }
    wrapper.vm.$serial.listDeviceNameTuples = vi.fn().mockReturnValueOnce(data)
    const val = await wrapper.vm.devices
    expect(val).toEqual([
      ['/dev/rs1254', 'rs1254'],
      ['/dev/rs243', 'rs243']
    ])
  })
  it.each([
    ['/dev/rs232', 'rs232'],
    ['/dev/rs485', 'rs485']
  ])('returns display when value when value is %s', async (value, response) => {
    wrapper.vm.$serial.deviceDisplayValue = vi.fn().mockResolvedValueOnce(response)
    const val = await wrapper.vm.displayDevices(value)
    expect(val).toEqual(response)
  })
  it('returns form options', () => {
    const val = wrapper.vm.getFormOptions()
    expect(val).toEqual({ device: [], serial: [], status: [], tcp: [] })
  })
  it('loads data when api call is successful', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples.mockReturnValueOnce([
      ['/dev/rs1254', 'rs1254'],
      ['/dev/rs243', 'rs243']
    ])
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: true, data: { board: { serial: [{ devices: ['rs1254'] }, { devices: ['rs243'] }, { external_devices: [] }] } } },
      { success: true, data: [{ test: 'test' }] }
    ])
    await wrapper.vm.loadData()
    expect(wrapper.vm.formOptions).toEqual({
      device: [
        ['/dev/rs1254', 'rs1254'],
        ['/dev/rs243', 'rs243']
      ],
      serial: [{ devices: ['rs1254'] }, { devices: ['rs243'] }, { external_devices: [] }],
      tcp: [],
      status: [{ test: 'test' }]
    })
  })
  it('loads data when api call is successful, but all gets return success false', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples.mockReturnValueOnce([])
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: false, data: { board: { serial: [{ devices: ['rs1254'] }, { devices: ['rs243'] }, { external_devices: [] }] } } },
      { success: false, data: [{ test: 'test' }] }
    ])
    await wrapper.vm.loadData()
    expect(wrapper.vm.formOptions).toEqual({ serial: [], status: [], tcp: [], device: [] })
  })
  it('invokes error message when request fails', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('passes validation', async () => {
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockResolvedValueOnce({ isValid: true })
    wrapper.vm.formData = { ModbusSerialServer: [] }
    wrapper.vm.formOptions = { status: [] }
    await expect(wrapper.vm.validate()).resolves.toEqual({ isValid: true })
  })
  it('rejects when validation fails', async () => {
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockRejectedValueOnce({ isValid: false, message: 'Instance with the same device is already enabled' })
    wrapper.vm.formData = {
      ModbusSerialServer: [
        { port_connect: '1', device: 'test', enabled: '1' },
        { port_listen: '1', device: 'test', enabled: '1' }
      ]
    }
    await expect(wrapper.vm.validate()).rejects.toEqual({ isValid: false, message: 'Instance with the same device is already enabled' })
  })
  it.each([
    [{ payload: [{ errors: [{ code: 2 }] }] }, 'Selected device is disconnected, it can not be enabled.'],
    [{ payload: [{ errors: [{ code: 1 }] }] }, 'Selected device is enabled elsewhere'],
    [{ payload: [{ errors: [{ code: 5 }] }] }, 'An unexpected error occurred']
  ])('returns device edit error messages', async (error, response) => {
    wrapper.vm.$serial.handleExternalDeviceErrors = vi.fn()
    wrapper.vm.$serial.handleExternalDeviceErrors.mockResolvedValueOnce(response)
    const val = await wrapper.vm.returnErrorMessage(error)
    expect(val).toEqual(response)
  })
  it('returns unavailable error message', () => {
    expect(wrapper.vm.deviceUnavailable()).toEqual('Device is unavailable')
  })
})
