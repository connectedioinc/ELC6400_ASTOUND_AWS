import Dnp3SerialOutstation from '../../src/views/services/DNP3SerialOutstation.vue'
import Dnp3SerialOutstationEdit from '../../src/views/services/DNP3SerialOutstationEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Dnp3SerialOutstation overview tests', () => {
  it.each([
    ['/dev/rs232', 'rs232'],
    ['/dev/rs485', 'rs485']
  ])('returns display when value when value is %s', async (value, response) => {
    const wrapper = createWrapper(Dnp3SerialOutstation)
    wrapper.vm.$serial.deviceDisplayValue = vi.fn()
    wrapper.vm.$serial.deviceDisplayValue.mockResolvedValueOnce(response)
    const val = await wrapper.vm.displayDevices(value)
    expect(val).toEqual(response)
  })
  it('returns form options', () => {
    const wrapper = createWrapper(Dnp3SerialOutstation)
    const val = wrapper.vm.getFormOptions()
    expect(val).toEqual({ device: [], serial: [], status: [] })
  })
  it('filters devices', async () => {
    const wrapper = createWrapper(Dnp3SerialOutstation)
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
    const wrapper = createWrapper(Dnp3SerialOutstation)
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockResolvedValueOnce({ isValid: true })
    wrapper.vm.formData = { outstation: [] }
    wrapper.vm.formOptions = { status: [] }
    await expect(wrapper.vm.validate()).resolves.toEqual({ isValid: true })
  })
  it('rejects when validation fails', async () => {
    const wrapper = createWrapper(Dnp3SerialOutstation)
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockRejectedValueOnce({ isValid: false, message: 'Instance with the same device is already enabled' })
    wrapper.vm.formData = {
      outstation: [
        { port_connect: '1', device: 'test', enabled: '1' },
        { port_listen: '1', device: 'test', enabled: '1' }
      ]
    }
    await expect(wrapper.vm.validate()).rejects.toEqual({ isValid: false, message: 'Instance with the same device is already enabled' })
  })
  const fakeSponse = [
    {
      success: true,
      data: { board: { serial: [] } }
    },
    {
      success: true,
      data: ['status']
    }
  ]
  const fakeSponseFalse = [
    {
      success: false,
      data: { board: { serial: [] } }
    },
    {
      success: false,
      data: ['status']
    }
  ]
  it.each([
    [{ outstation: [{ '.name': 'test' }] }, fakeSponse, 0],
    [{ outstation: [{ '.name': 'test' }] }, fakeSponseFalse, 2]
  ])('loads data', async (value, response, error) => {
    const wrapper = createWrapper(Dnp3SerialOutstation)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(response)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData(value)
    expect(spy).toHaveBeenCalledTimes(error)
  })
  it('invokes error message', async () => {
    const wrapper = createWrapper(Dnp3SerialOutstation)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData({ outstation: [{ '.name': 'test' }] })
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it.each([
    [{ payload: [{ errors: [{ code: 2 }] }] }, 'Selected device is disconnected, it can not be enabled.'],
    [{ payload: [{ errors: [{ code: 1 }] }] }, 'Selected device is enabled elsewhere'],
    [{ payload: [{ errors: [{ code: 5 }] }] }, 'An unexpected error occurred']
  ])('returns device edit error messages', async (error, response) => {
    const wrapper = createWrapper(Dnp3SerialOutstation)
    wrapper.vm.$serial.handleExternalDeviceErrors = vi.fn()
    wrapper.vm.$serial.handleExternalDeviceErrors.mockResolvedValueOnce(response)
    const val = await wrapper.vm.returnErrorMessage(error)
    expect(val).toEqual(response)
  })
  it('returns unavailable error message', () => {
    const wrapper = createWrapper(Dnp3SerialOutstation)
    expect(wrapper.vm.deviceUnavailable()).toEqual('Device is unavailable')
  })
})
const formOptions = {
  serial: [],
  device: [],
  status: []
}
describe('DNP3 Serial outstation edit tests', () => {
  const props = {
    section: {
      '.name': 'test',
      name: 'new',
      enabled: '1',
      device: 'test'
    }
  }
  it('passes validation', async () => {
    const wrapper = createWrapper(Dnp3SerialOutstationEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockResolvedValueOnce({ isValid: true })
    wrapper.vm.formData = { outstation: [] }
    await expect(wrapper.vm.validate()).resolves.toEqual({ isValid: true })
  })
  it('loads initial device', () => {
    const wrapper = createWrapper(Dnp3SerialOutstationEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.initialDevice = ''
    wrapper.vm.loadInitial()
    expect(wrapper.vm.initialDevice).toEqual('test')
  })
  it('rejects when validation fails', async () => {
    const wrapper = createWrapper(Dnp3SerialOutstationEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockRejectedValueOnce({ isValid: false, message: 'Instance with the same device is already enabled' })
    wrapper.vm.formData = {
      outstation: [
        { device: 'test', enabled: '1' },
        { device: 'test', enabled: '0' }
      ]
    }
    await expect(wrapper.vm.validate()).rejects.toEqual({ isValid: false, message: 'Instance with the same device is already enabled' })
  })
  it('returns device display value', async () => {
    props.section.device = '/dev/rs232'
    const wrapper = createWrapper(Dnp3SerialOutstationEdit, {
      props,
      global: {
        provide: { formOptions: () => formOptions },
        mocks: {
          $serial: {
            deviceDisplayValue: vi.fn().mockResolvedValueOnce('rs232')
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
    const wrapper = createWrapper(Dnp3SerialOutstationEdit, {
      props,
      global: {
        provide: { formOptions: () => formOptions },
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
    const wrapper = createWrapper(Dnp3SerialOutstationEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.$serial.handleExternalDeviceErrors = vi.fn()
    wrapper.vm.$serial.handleExternalDeviceErrors.mockResolvedValueOnce(response)
    const val = await wrapper.vm.returnErrorMessage(error)
    expect(val).toEqual(response)
  })
  it.each([
    [{ device: 'test', local_addr: '1', id: '1' }, false],
    [{ device: 'test', local_addr: '1', id: '2' }, true]
  ])('returns local address validation results', (data, res) => {
    props.section = {
      device: data.device,
      local_addr: data.local_addr,
      id: data.id
    }
    const wrapper = createWrapper(Dnp3SerialOutstationEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.formData = {
      outstation: [{ device: 'test', local_addr: '1', id: '2' }]
    }
    const val = wrapper.vm.validateAddress(data.local_addr)
    expect(val.isValid).toEqual(res)
  })
})
