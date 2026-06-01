import ModbusGateway from '../../src/views/services/ModbusGateway.vue'
import ModbusDeviceEdit from '../../src/views/services/ModbusDeviceEdit.vue'
import createWrapper, { mergeDeep } from '@tests/unit/mockFactory'

const formOptions = {
  serial: [],
  device: [],
  status: []
}

const stubs = {
  'vuci-form-item-input': { template: '<div />' },
  'vuci-form-item-select': { template: '<div />' },
  'vuci-form-item-switch': { template: '<div />' },
  'vuci-form-item-dummy': { template: '<div />' },
  'vuci-form-item-upload': { template: '<div />' },
  'tlt-horizontal-card': { template: '<div />' }
}

describe('ModbusGateway.vue', () => {
  function createModbusGatewayWrapper(opts = {}) {
    const defaultOptions = {
      global: {
        stubs,
        provide: { formOptions: () => formOptions }
      }
    }

    return createWrapper(ModbusGateway, mergeDeep(defaultOptions, opts))
  }

  it.each([
    ['/dev/rs232', 'rs232'],
    ['/dev/rs485', 'rs485']
  ])('returns display when value when value is %s', async (value, response) => {
    const wrapper = createModbusGatewayWrapper()
    wrapper.vm.$serial.deviceDisplayValue = vi.fn()
    wrapper.vm.$serial.deviceDisplayValue.mockResolvedValueOnce(response)
    const val = await wrapper.vm.displayDevices(value)
    expect(val).toEqual(response)
  })
  it.each([
    ['when there are keys', [{ type: 'key', fullname: 'test' }], [['/etc/certificates/test', 'test']]],
    ['when there are no keys', [{ type: 'cert', fullname: 'test' }], []]
  ])('filters key options %s', (text, data, response) => {
    const wrapper = createModbusGatewayWrapper()
    wrapper.vm.certificates = data
    const value = wrapper.vm.keyOptions
    expect(value).toEqual(response)
  })
  it.each([
    [
      [
        { cert_type: 'ca', type: 'cert', fullname: 'cert' },
        { cert_type: 'root_ca', type: 'cert', fullname: 'rootcert' }
      ],
      [
        ['/etc/certificates/cert', 'cert'],
        ['/etc/ssl/certs/rootcert', 'rootcert']
      ]
    ],
    [
      [
        { cert_type: 'ca', type: 'cert', fullname: 'cert' },
        { cert_type: 'root_ca', type: 'cert', fullname: 'rootcert' },
        { cert_type: 'client', type: 'cert', fullname: 'certclient' },
        { cert_type: 'server', type: 'cert', fullname: 'certserver' }
      ],
      [
        ['/etc/certificates/cert', 'cert'],
        ['/etc/ssl/certs/rootcert', 'rootcert'],
        ['/etc/certificates/certclient', 'certclient'],
        ['/etc/certificates/certserver', 'certserver']
      ]
    ]
  ])('tests certOptions', (certsData, res) => {
    const wrapper = createModbusGatewayWrapper()
    wrapper.vm.certificates = certsData
    const value = wrapper.vm.certOptions
    expect(value).toEqual(res)
  })

  it.each([
    [
      [
        { cert_type: 'ca', type: 'cert', fullname: 'cert' },
        { cert_type: 'root_ca', type: 'cert', fullname: 'rootcert' }
      ],
      [
        ['/etc/certificates/cert', 'cert'],
        ['/etc/ssl/certs/rootcert', 'rootcert']
      ]
    ],
    [
      [
        { cert_type: 'ca', type: 'cert', fullname: 'cert' },
        { cert_type: 'root_ca', type: 'cert', fullname: 'rootcert' },
        { cert_type: 'client', type: 'notcert', fullname: 'certclient' },
        { cert_type: 'server', type: 'notcert', fullname: 'certserver' }
      ],
      [
        ['/etc/certificates/cert', 'cert'],
        ['/etc/ssl/certs/rootcert', 'rootcert']
      ]
    ]
  ])('tests caOptions', (certsData, res) => {
    const wrapper = createModbusGatewayWrapper()
    wrapper.vm.certificates = certsData
    const value = wrapper.vm.caOptions
    expect(value).toEqual(res)
  })
  it('returns form options', () => {
    const wrapper = createModbusGatewayWrapper()
    const val = wrapper.vm.getFormOptions()
    expect(val).toEqual({ device: [], serial: [], status: [] })
  })
  it('loads data when api call is successful', async () => {
    const wrapper = createModbusGatewayWrapper()
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: true, data: { board: { hwinfo: { usb: true }, serial: [{ devices: ['rs1254'] }, { devices: ['rs243'] }, { external_devices: [] }] } } },
      { success: true, data: { generated: [{ test: 'test' }] } }
    ])
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({ success: true, data: ['test'] })
    wrapper.vm.$serial.listDeviceNameTuples = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples.mockReturnValueOnce([
      ['/dev/rs1254', 'rs1254'],
      ['/dev/rs243', 'rs243']
    ])
    await wrapper.vm.loadData()
    expect(wrapper.vm.certificates).toEqual([{ test: 'test' }])
    expect(wrapper.vm.formOptions).toEqual({
      device: [
        ['/dev/rs1254', 'rs1254'],
        ['/dev/rs243', 'rs243']
      ],
      serial: [{ devices: ['rs1254'] }, { devices: ['rs243'] }, { external_devices: [] }],
      status: ['test']
    })
  })
  it('loads data when api call is successful, but gets return success false', async () => {
    const wrapper = createModbusGatewayWrapper()
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: false, data: { board: { hwinfo: { usb: true }, serial: [{ devices: ['rs1254'] }, { devices: ['rs243'] }, { external_devices: [] }] } } },
      { success: false, data: { generated: { test: 'test' } } }
    ])
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({ success: false, data: ['test'] })
    wrapper.vm.$serial.listDeviceNameTuples = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples.mockReturnValueOnce([])
    await wrapper.vm.loadData()
    expect(wrapper.vm.certificates).toEqual([])
    expect(wrapper.vm.formOptions).toEqual({ serial: [], status: [], device: [] })
  })
  it('invokes error message when request fails', async () => {
    const wrapper = createModbusGatewayWrapper()
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it.each([
    [{ usb: false, rs232: false, rs485: false }, false],
    [{ usb: true, rs232: false, rs485: false }, true],
    [{ usb: false, rs232: true, rs485: false }, true],
    [{ usb: false, rs232: false, rs485: true }, true]
  ])('check if serial is possible', (hwinfo, result) => {
    const wrapper = createModbusGatewayWrapper({
      global: {
        mocks: {
          $store: {
            board: { hwinfo }
          }
        }
      }
    })
    const val = wrapper.vm.hasSerial
    expect(val).toEqual(result)
  })
  it('filters devices', async () => {
    const wrapper = createModbusGatewayWrapper()
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
    const wrapper = createModbusGatewayWrapper()
    wrapper.vm.formData = { rtu_device: [] }
    await expect(wrapper.vm.validate()).resolves.toEqual()
  })
  it('fails validation when rtu device dont exist', async () => {
    const wrapper = createModbusGatewayWrapper()
    wrapper.vm.formData = {}
    await expect(wrapper.vm.validate()).resolves.toEqual()
  })
  it('rejects when validation fails', async () => {
    const wrapper = createModbusGatewayWrapper({
      data: () => ({
        formData: {
          rtu_device: [
            { port_connect: '1', device: 'test', enabled: '1' },
            { port_listen: '1', device: 'test', enabled: '1' }
          ]
        }
      })
    })
    wrapper.vm.hwinfo = {
      usb: true,
      rs232: true,
      rs485: true
    }
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockReturnValueOnce({ isValid: false, message: 'Instance with the same device is already enabled' })
    await expect(wrapper.vm.validate()).rejects.toEqual('Instance with the same device is already enabled')
  })
  it('passes validation', async () => {
    const wrapper = createModbusGatewayWrapper()
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockReturnValueOnce({ isValid: true, error: 'Instance with the same device is already enabled' })
    wrapper.vm.formData = {
      rtu_device: [
        { device: 'test', enabled: '1' },
        { device: 'test', enabled: '0' }
      ]
    }
    await expect(wrapper.vm.validate()).resolves.toEqual()
  })

  it.each([
    [{ payload: [{ errors: [{ code: 2 }] }] }, 'Selected device is disconnected, it can not be enabled.'],
    [{ payload: [{ errors: [{ code: 1 }] }] }, 'Selected device is enabled elsewhere'],
    [{ payload: [{ errors: [{ code: 5 }] }] }, 'An unexpected error occurred']
  ])('returns device edit error messages', async (error, response) => {
    const wrapper = createModbusGatewayWrapper()
    wrapper.vm.$serial.handleExternalDeviceErrors = vi.fn()
    wrapper.vm.$serial.handleExternalDeviceErrors.mockResolvedValueOnce(response)
    const val = await wrapper.vm.returnErrorMessage(error)
    expect(val).toEqual(response)
  })

  it('returns unavailable error message', () => {
    const wrapper = createModbusGatewayWrapper()
    expect(wrapper.vm.deviceUnavailable()).toEqual('Device is unavailable')
  })
})

describe('ModbusDeviceEdit.vue', () => {
  const props = {
    section: {
      id: 'test',
      name: 'new',
      enabled: '1',
      device: 'test'
    }
  }

  function createModbusDeviceEditWrapper(opts = {}) {
    const defaultOptions = {
      props,
      global: {
        stubs,
        provide: { formOptions: () => formOptions }
      }
    }

    return createWrapper(ModbusDeviceEdit, mergeDeep(defaultOptions, opts))
  }

  it('rejects when validation fails', async () => {
    const wrapper = createModbusDeviceEditWrapper()
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockRejectedValueOnce({ isValid: false, message: 'Instance with the same device is already enabled' })
    wrapper.vm.formData = {
      rtu_device: [
        { device: 'test', enabled: '1' },
        { device: 'test', enabled: '0' }
      ]
    }
    await expect(wrapper.vm.validate()).rejects.toEqual({ isValid: false, message: 'Instance with the same device is already enabled' })
  })

  it('returns device display value', async () => {
    props.section.device = '/dev/rs232'
    const wrapper = createModbusDeviceEditWrapper({
      global: {
        mocks: {
          $serial: {
            deviceDisplayValue: vi.fn().mockResolvedValue('rs232')
          }
        }
      }
    })
    const val = await wrapper.vm.device
    expect(val).toEqual('rs232')
  })

  it('returns serial options', async () => {
    const data = {
      baudRates: ['test'],
      flowControl: ['test'],
      dataBits: ['test'],
      parity: ['test'],
      duplex: ['test']
    }
    const wrapper = createModbusDeviceEditWrapper({
      global: {
        mocks: {
          $serial: {
            filterOptions: vi.fn().mockResolvedValueOnce(data)
          }
        }
      }
    })
    const val = await wrapper.vm.serialOptions
    expect(val).toEqual(data)
  })

  it.each([
    [{ data: { errors: [{ code: 2 }] } }, 'Selected device is disconnected, it can not be enabled.'],
    [{ data: { errors: [{ code: 1 }] } }, 'Selected device is enabled elsewhere'],
    [{ data: { errors: [{ code: 5 }] } }, 'An unexpected error occurred']
  ])('returns device edit error messages', async (error, response) => {
    const wrapper = createModbusDeviceEditWrapper()
    wrapper.vm.$serial.handleExternalDeviceErrors = vi.fn()
    wrapper.vm.$serial.handleExternalDeviceErrors.mockResolvedValueOnce(response)
    const val = await wrapper.vm.returnErrorMessage(error)
    expect(val).toEqual(response)
  })

  it('loads initial device', () => {
    const wrapper = createModbusDeviceEditWrapper()
    wrapper.vm.initialDevice = ''
    wrapper.vm.loadInitial()
    expect(wrapper.vm.initialDevice).toEqual('/dev/rs232')
  })

  it('passes validation', async () => {
    const wrapper = createModbusDeviceEditWrapper()
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockResolvedValueOnce({ isValid: true })
    wrapper.vm.formData = {
      rtu_device: [
        { device: 'test', enabled: '1' },
        { device: 'test', enabled: '0' }
      ]
    }
    await expect(wrapper.vm.validate()).resolves.toEqual({ isValid: true })
  })
})
