import Modem from '../../src/views/services/ModemControl.vue'
import ModemEdit from '../../src/views/services/ModemControlEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Modem overview tests', () => {
  it.each([
    ['/dev/rs232', 'rs232'],
    ['/dev/rs485', 'rs485']
  ])('returns display when value when value is %s', async (value, response) => {
    const wrapper = createWrapper(Modem)
    wrapper.vm.$serial.deviceDisplayValue = vi.fn()
    wrapper.vm.$serial.deviceDisplayValue.mockResolvedValueOnce(response)
    const val = await wrapper.vm.displayDevices(value)
    expect(val).toEqual(response)
  })
  it('returns form options', () => {
    const wrapper = createWrapper(Modem)
    const val = wrapper.vm.getFormOptions()
    expect(val).toEqual({ device: [], serial: [], status: [], mobile: [] })
  })
  it('filters devices', async () => {
    const wrapper = createWrapper(Modem)
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
    const wrapper = createWrapper(Modem)
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockReturnValueOnce({ isValid: true })
    wrapper.vm.formData = { modem: [] }
    wrapper.vm.formOptions = { status: [] }
    await expect(wrapper.vm.validate()).resolves.toEqual()
  })
  it('rejects when validation fails', async () => {
    const wrapper = createWrapper(Modem)
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockReturnValueOnce({ isValid: false, message: 'Instance with the same device is already enabled' })
    wrapper.vm.formData = {
      modem: [
        { port_connect: '1', device: 'test', enabled: '1' },
        { port_listen: '1', device: 'test', enabled: '1' }
      ]
    }
    await expect(wrapper.vm.validate()).rejects.toEqual('Instance with the same device is already enabled')
  })
  it('rejects when validation fails', async () => {
    const wrapper = createWrapper(Modem)
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockReturnValueOnce({ isValid: true, message: 'Instance with the same device is already enabled' })
    wrapper.vm.formData = {
      modem: [
        { device: 'testas', enabled: '1', ctl_mode: 'full' },
        { device: 'test', enabled: '1' }
      ]
    }
    await expect(wrapper.vm.validate()).rejects.toEqual('Can not enable additional instance when device is fully controlled')
  })
  const fakeSponse = [
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
      data: ['data']
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
    },
    {
      success: false,
      data: ['status']
    }
  ]
  it.each([
    [{ modem: [{ '.name': 'test' }] }, fakeSponse, 0],
    [{ modem: [{ '.name': 'test' }] }, fakeSponseFalse, 3]
  ])('loads data', async (value, response, error) => {
    const wrapper = createWrapper(Modem)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(response)
    wrapper.vm.$mobile.modemsOptions = vi.fn()
    wrapper.vm.$mobile.modemsOptions.mockReturnValueOnce([['mobile']])
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData(value)
    expect(spy).toHaveBeenCalledTimes(error)
  })
  it('invokes error message', async () => {
    const wrapper = createWrapper(Modem)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData({ modem: [{ '.name': 'test' }] })
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it.each([
    [{ payload: [{ errors: [{ code: 2 }] }] }, 'Selected device is disconnected, it can not be enabled.'],
    [{ payload: [{ errors: [{ code: 1 }] }] }, 'Selected device is enabled elsewhere'],
    [{ payload: [{ errors: [{ code: 5 }] }] }, 'An unexpected error occurred']
  ])('returns device edit error messages', async (error, response) => {
    const wrapper = createWrapper(Modem)
    wrapper.vm.$serial.handleExternalDeviceErrors = vi.fn()
    wrapper.vm.$serial.handleExternalDeviceErrors.mockResolvedValueOnce(response)
    const val = await wrapper.vm.returnErrorMessage(error)
    expect(val).toEqual(response)
  })
  it('returns unavailable error message', () => {
    const wrapper = createWrapper(Modem)
    expect(wrapper.vm.deviceUnavailable()).toEqual('Device is unavailable')
  })
})
const formOptions = {
  serial: [],
  device: [],
  status: [],
  mobile: []
}
describe('modem edit tests', () => {
  const props = {
    section: {
      '.name': 'test',
      name: 'new',
      enabled: '1',
      device: 'test'
    }
  }
  it('rejects when device is fully controlled', async () => {
    const wrapper = createWrapper(ModemEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.formData = {
      modem: [
        { device: 'testas', enabled: '1', ctl_mode: 'full' },
        { device: 'test', enabled: '1' }
      ]
    }
    await expect(wrapper.vm.validate()).rejects.toEqual('Only one instance can be enabled when modem is fully controlled')
  })
  it('rejects when validation fails', async () => {
    const wrapper = createWrapper(ModemEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockReturnValueOnce({ isValid: false, message: 'Instance with the same device is already enabled' })
    wrapper.vm.formData = {
      modem: [
        { device: 'test', enabled: '1' },
        { device: 'test', enabled: '0' }
      ]
    }
    await expect(wrapper.vm.validate()).rejects.toEqual('Instance with the same device is already enabled')
  })
  it('passes validation', async () => {
    const wrapper = createWrapper(ModemEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockReturnValueOnce({ isValid: true, message: 'Instance with the same device is already enabled' })
    wrapper.vm.formData = {
      modem: [
        { device: 'test', enabled: '1' },
        { device: 'test', enabled: '0' }
      ]
    }
    await expect(wrapper.vm.validate()).resolves.toEqual()
  })
  it('returns device display value', async () => {
    props.section.device = '/dev/rs232'
    const wrapper = createWrapper(ModemEdit, {
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
    const wrapper = createWrapper(ModemEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.$serial.filterOptions = vi.fn()
    wrapper.vm.$serial.filterOptions.mockResolvedValueOnce(data)
    const val = await wrapper.vm.serialOptions
    expect(val).toEqual(data)
  })
  it('loads initial device', () => {
    const wrapper = createWrapper(ModemEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.initialDevice = ''
    wrapper.vm.loadInitial()
    expect(wrapper.vm.initialDevice).toEqual('/dev/rs232')
  })
  it.each([
    [{ data: { errors: [{ code: 2 }] } }, 'Selected device is disconnected, it can not be enabled.'],
    [{ data: { errors: [{ code: 1 }] } }, 'Selected device is enabled elsewhere'],
    [{ data: { errors: [{ code: 5 }] } }, 'An unexpected error occurred']
  ])('returns device edit error messages', async (error, response) => {
    const wrapper = createWrapper(ModemEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    wrapper.vm.$serial.handleExternalDeviceErrors = vi.fn()
    wrapper.vm.$serial.handleExternalDeviceErrors.mockResolvedValueOnce(response)
    const val = await wrapper.vm.returnErrorMessage(error)
    expect(val).toEqual(response)
  })
})
