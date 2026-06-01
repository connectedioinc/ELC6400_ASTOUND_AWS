import ModbusServerEdit from '../../src/views/services/ModbusSerialServerEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

const formOptions = {
  serials: [],
  device: [],
  status: [],
  tcp: []
}

vi.mock('@/composables/useUniversalGatewayUtils', () => ({
  useUniversalGatewayUtils: vi.fn(() => ({
    getTagSize: vi.fn()
  }))
}))

describe('Modbus Serial server edit tests', () => {
  const props = {
    section: {
      '.name': 'test',
      name: 'new',
      enabled: '1',
      device: 'test',
      regfile: 'test'
    }
  }
  it('loads initial device', () => {
    const wrapper = createWrapper(ModbusServerEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.initialDevice = ''
    wrapper.vm.loadInitial()
    expect(wrapper.vm.initialDevice).toEqual('test')
  })
  it('rejects when validation fails', async () => {
    const wrapper = createWrapper(ModbusServerEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockRejectedValueOnce({ isValid: false, message: 'Instance with the same device is already enabled' })
    wrapper.vm.formData = {
      ModbusSerialServer: [
        { device: 'test', enabled: '1' },
        { device: 'test', enabled: '0' }
      ]
    }
    await expect(wrapper.vm.validate()).rejects.toEqual({ isValid: false, message: 'Instance with the same device is already enabled' })
  })
  it('passes validation', async () => {
    const wrapper = createWrapper(ModbusServerEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockResolvedValueOnce({ isValid: true })
    wrapper.vm.formData = {
      ModbusSerialServer: [
        { device: 'test', enabled: '1' },
        { device: 'test', enabled: '0' }
      ]
    }
    await expect(wrapper.vm.validate()).resolves.toEqual({ isValid: true })
  })
  it('returns device display value', async () => {
    props.section.device = '/dev/rs232'
    const wrapper = createWrapper(ModbusServerEdit, {
      props,
      global: {
        provide: { formOptions: () => formOptions },
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
    const wrapper = createWrapper(ModbusServerEdit, {
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
})
