import ModbusClientEdit from '../../src/views/services/ModbusClientEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

const formOptions = {
  serials: [],
  device: [],
  status: []
}
describe('ModbusSerial client edit tests', () => {
  const props = {
    section: {
      '.name': 'test',
      name: 'new',
      enabled: '1',
      device: 'test'
    }
  }
  it('passes validation', async () => {
    const wrapper = createWrapper(ModbusClientEdit, {
      props,
      global: {
        provide: { formOptions: () => formOptions },
        mocks: {
          $serial: {
            validateBeforeSave: vi.fn().mockResolvedValueOnce({ isValid: true })
          }
        }
      }
    })
    wrapper.vm.formData = { modbusSerialClient: [] }
    await expect(wrapper.vm.validate()).resolves.toEqual({ isValid: true })
  })
  it('loads initial device', () => {
    const wrapper = createWrapper(ModbusClientEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.initialDevice = ''
    wrapper.vm.loadInitial()
    expect(wrapper.vm.initialDevice).toEqual('test')
  })
  it('rejects when validation fails', async () => {
    const wrapper = createWrapper(ModbusClientEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockRejectedValueOnce({ isValid: false, error: 'Instance with the same device is already enabled' })
    wrapper.vm.formData = {
      modbusSerialClient: [
        { device: 'test', enabled: '1' },
        { device: 'test', enabled: '0' }
      ]
    }
    await expect(wrapper.vm.validate()).rejects.toEqual({ isValid: false, error: 'Instance with the same device is already enabled' })
  })
  it('returns device display value', async () => {
    props.section.device = '/dev/rs232'
    const wrapper = createWrapper(ModbusClientEdit, {
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
    const wrapper = createWrapper(ModbusClientEdit, {
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
    const wrapper = createWrapper(ModbusClientEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.$serial.handleExternalDeviceErrors = vi.fn()
    wrapper.vm.$serial.handleExternalDeviceErrors.mockResolvedValueOnce(response)
    const val = await wrapper.vm.returnErrorMessage(error)
    expect(val).toEqual(response)
  })
})
