import ModbusTCPOverSerial from '../../src/views/services/ModbusTCPOverSerial.vue'
import ModbusTCPOverSerialEdit from '../../src/views/services/ModbusTCPOverSerialEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

const stubs = {
  'vuci-form-item-switch': { template: '<div />' },
  'vuci-form-item-input': { template: '<div />' },
  'vuci-form-item-dummy': { template: '<div />' },
  'vuci-form-item-list': { template: '<div />' },
  'vuci-form-item-select': { template: '<div />' }
}

describe('ModbusTCPOverSerial overview tests', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(ModbusTCPOverSerial, {
      global: { stubs }
    })
  })

  it.each([
    ['/dev/rs232', 'rs232'],
    ['/dev/rs485', 'rs485']
  ])('returns display when value when value is %s', async (value, response) => {
    wrapper.vm.$serial.deviceDisplayValue = vi.fn()
    wrapper.vm.$serial.deviceDisplayValue.mockResolvedValueOnce(response)
    const val = await wrapper.vm.displayDevices(value)
    expect(val).toEqual(response)
  })
  it('returns form options', () => {
    const val = wrapper.vm.getFormOptions()
    expect(val).toEqual({ device: [], serial: [], status: [], zones: [] })
  })
  it('loads data when api call is sucessful', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples.mockReturnValueOnce([
      ['/dev/rs1254', 'rs1254'],
      ['/dev/rs243', 'rs243']
    ])
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: true, data: { board: { serial: [{ devices: ['rs1254'] }, { devices: ['rs243'] }, { external_devices: [] }] } } },
      { success: true, data: [{ test: 'test' }] },
      { success: true, data: [{ name: 'test' }] },
      { success: true, data: ['test2'] }
    ])
    await wrapper.vm.loadData({ overSerial: [{ id: 'test' }] })
    expect(wrapper.vm.formOptions).toEqual({
      device: [
        ['/dev/rs1254', 'rs1254'],
        ['/dev/rs243', 'rs243']
      ],
      serial: [{ devices: ['rs1254'] }, { devices: ['rs243'] }, { external_devices: [] }],
      zones: [['test', 'TEST']],
      status: [{ test: 'test' }]
    })
  })
  it('loads data when api call is sucessful, but all gets return success false', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples.mockReturnValueOnce([])
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: false, data: { board: { serial: [{ devices: ['rs1254'] }, { devices: ['rs243'] }, { external_devices: [] }] } } },
      { success: false, data: [{ test: 'test' }] },
      { success: false, data: [] },
      { success: false, data: [] }
    ])
    await wrapper.vm.loadData({ overSerial: [{ id: 'test' }] })
    expect(wrapper.vm.formOptions).toEqual({ device: [], serial: [], zones: [], status: [] })
  })
  it('loads data when api call is sucessful, but all gets return success false', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples.mockReturnValueOnce([])
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: true, data: { board: {} } },
      { success: false, data: [{ test: 'test' }] },
      { success: false, data: [] },
      { success: false, data: [] }
    ])
    await wrapper.vm.loadData({ overSerial: [{ id: 'test' }] })
    expect(wrapper.vm.formOptions).toEqual({ device: [], serial: [], zones: [], status: [] })
  })
  it('invokes error message when request fails', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData({ overSerial: [{ id: 'test' }] })
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('passes validation', async () => {
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockReturnValueOnce({ isValid: true })
    wrapper.vm.formData = { overSerial: [] }
    wrapper.vm.formOptions = { status: [] }
    await expect(wrapper.vm.validate()).resolves.toEqual()
  })
  it('rejects when validation fails', async () => {
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockReturnValueOnce({ isValid: false, message: 'Instance with the same device is already enabled' })
    wrapper.vm.formData = {
      overSerial: [
        { port_connect: '1', device: 'test', modbus_ip: '5', modbus_port: '12', enabled: '1' },
        { port_listen: '1', modbus_ip: '5', modbus_port: '12', device: 'test', enabled: '1' }
      ]
    }
    await expect(wrapper.vm.validate()).rejects.toEqual('Instance with the same device is already enabled')
  })
  it('clears form data', () => {
    wrapper.vm.formData = { new: ['test'] }
    wrapper.vm.removeIpFilters({ id: 'new' })
    expect(wrapper.vm.formData.new).toEqual([])
  })

  it('filters devices', async () => {
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

describe('ModbusTCPOverSerialEdit.vue', () => {
  const formOptions = {
    serials: [],
    device: [],
    status: [],
    zones: []
  }
  const props = {
    section: {
      id: 'test',
      name: 'new',
      enabled: '1',
      device: 'test'
    }
  }
  const mockedSerialFilterOptions = {
    baudRates: ['test'],
    flowControl: ['test'],
    dataBits: ['test'],
    parity: ['test'],
    duplex: ['test']
  }

  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(ModbusTCPOverSerialEdit, {
      props,
      global: {
        stubs,
        provide: { formOptions: () => formOptions },
        mocks: {
          $serial: {
            filterOptions: vi.fn().mockResolvedValueOnce(mockedSerialFilterOptions)
          }
        }
      }
    })
  })

  it('loads initial device', () => {
    wrapper.vm.initialDevice = ''
    wrapper.vm.loadInitial()
    expect(wrapper.vm.initialDevice).toEqual('test')
  })

  it.each([
    [{ data: { errors: [{ code: 2 }] } }, 'Selected device is disconnected, it can not be enabled.'],
    [{ data: { errors: [{ code: 1 }] } }, 'Selected device is enabled elsewhere'],
    [{ data: { errors: [{ code: 5 }] } }, 'An unexpected error occurred']
  ])('returns device edit error messages', async (error, response) => {
    wrapper.vm.$serial.handleExternalDeviceErrors = vi.fn()
    wrapper.vm.$serial.handleExternalDeviceErrors.mockResolvedValueOnce(response)
    const val = await wrapper.vm.returnErrorMessage(error)
    expect(val).toEqual(response)
  })

  describe('validateMultiServerID()', () => {
    it.each(['1-247', '10', '10,30-40', '30-40,10'])("check if '%s' is correct", input_value => {
      wrapper.vm.validateSingleID = vi.fn()
      wrapper.vm.validateSingleID.mockReturnValue({ isValid: true })
      wrapper.vm.validateRangeID = vi.fn()
      wrapper.vm.validateRangeID.mockReturnValue({ isValid: true })
      const result = wrapper.vm.validateMultiServerID(input_value)
      expect(result.isValid).toEqual(true)
    })

    it.each(['a-1', 'foo', '1-20,bar', '10,1-two'])("check if '%s' is correct", input_value => {
      wrapper.vm.validateSingleID = vi.fn()
      wrapper.vm.validateSingleID.mockReturnValue({ isValid: false })
      wrapper.vm.validateRangeID = vi.fn()
      wrapper.vm.validateRangeID.mockReturnValue({ isValid: false })
      const result = wrapper.vm.validateMultiServerID(input_value)
      expect(result.isValid).toEqual(false)
    })
  })

  describe('validateRangeID()', () => {
    it.each(['1-247', '1-2', '246-247'])("check if '%s' is correct", input_value => {
      wrapper.vm.validateSingleID = vi.fn()
      wrapper.vm.validateSingleID.mockReturnValue({ isValid: true })
      const result = wrapper.vm.validateRangeID(input_value)
      expect(result.isValid).toEqual(true)
    })

    it.each(['abc-def', '1-def', 'foo-1'])("check if '%s' is incorrect", input_value => {
      wrapper.vm.validateSingleID = vi.fn()
      wrapper.vm.validateSingleID.mockReturnValue({ isValid: false })
      const result = wrapper.vm.validateRangeID(input_value)
      expect(result.isValid).toEqual(false)
    })

    it.each(['20-10', '11-10'])("check if '%s', range end is larger than start", input_value => {
      wrapper.vm.validateSingleID = vi.fn()
      wrapper.vm.validateSingleID.mockReturnValue({ isValid: true })
      const result = wrapper.vm.validateRangeID(input_value)
      expect(result).toEqual({ isValid: false, message: "Range start can't be larger than the end" })
    })
  })

  describe('validateSingleID()', () => {
    it.each(['1', '10', '247'])("check if '%s' is correct", input_value => {
      wrapper.vm.$VuciValidator.irange = vi.fn()
      wrapper.vm.$VuciValidator.irange.mockReturnValue({ isValid: true })
      const result = wrapper.vm.validateSingleID(input_value)
      expect(result.isValid).toEqual(true)
    })

    it.each(['0', '-1', '247'])("check if '%s' is incorrect", input_value => {
      wrapper.vm.$VuciValidator.irange = vi.fn()
      wrapper.vm.$VuciValidator.irange.mockReturnValue({ isValid: false })
      const result = wrapper.vm.validateSingleID(input_value)
      expect(result.isValid).toEqual(false)
    })
  })

  it('rejects when validation fails', async () => {
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockRejectedValueOnce({ isValid: false, message: 'Instance with the same device is already enabled' })
    wrapper.vm.formData = {
      overSerial: [
        { device: 'test', enabled: '1' },
        { device: 'test', enabled: '0' }
      ]
    }
    await expect(wrapper.vm.validate()).rejects.toEqual({ isValid: false, message: 'Instance with the same device is already enabled' })
  })
  it('passes validation', async () => {
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockResolvedValueOnce({ isValid: true })
    wrapper.vm.formData = {
      overSerial: [
        { device: 'test', enabled: '1' },
        { device: 'test', enabled: '0' }
      ]
    }
    await expect(wrapper.vm.validate()).resolves.toEqual({ isValid: true })
  })

  it('returns serial options', async () => {
    const val = await wrapper.vm.serialOptions
    expect(val).toEqual(mockedSerialFilterOptions)
  })
})
