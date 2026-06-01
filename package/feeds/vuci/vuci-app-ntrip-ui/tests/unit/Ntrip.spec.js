import Ntrip from '../../src/views/services/Ntrip.vue'
import createWrapper, { mergeDeep } from '@tests/unit/mockFactory'

const serial = {
  bauds: ['300', '600', '1200', '2400', '4800', '9600', '19200', '38400', '57600', '115200'],
  stop_bits: [],
  data_bits: ['5', '6', '7', '8'],
  flow_control: ['rts/cts', 'xon/xoff', 'none'],
  devices: ['rs232']
}
const status = {
  is_used: 0,
  name: '/dev/rs232_usb_f12131ee'
}
const apiData = [
  {
    success: true,
    data: {
      board: {
        serial
      }
    }
  },
  {
    success: true,
    data: status
  }
]
const apiDataWithoutSerial = [
  {
    success: true,
    data: {
      board: {}
    }
  },
  {
    success: true,
    data: status
  }
]
const formOptions = {
  status: [
    {
      is_used: '1',
      service: 'NTrip',
      name: '/dev/rs232'
    }
  ]
}
const nmea = {
  ntrip: [
    {
      device: '/dev/rs232',
      enabled: '1',
      ntrip_port: '50',
      ntrip_ip: '1.1.1.1',
      nmea_source: '1'
    }
  ]
}
const nmeaGeo = {
  ntrip: [
    {
      device: '/dev/rs232',
      enabled: '1',
      ntrip_port: '50',
      ntrip_ip: '1.1.1.1',
      nmea_source: '2'
    }
  ]
}
const nmeaLong = {
  ntrip: [
    {
      device: '/dev/rs232',
      enabled: '1',
      ntrip_port: '50',
      ntrip_ip: '1.1.1.1',
      nmea_source: '2',
      longitude: 'asdfasd'
    }
  ]
}
const formData = {
  ntrip: [
    {
      device: '/dev/rs232',
      enabled: '1'
    }
  ]
}

function createNtripWrapper(opts = {}) {
  const defaultOptions = {
    global: {
      stubs: {
        'vuci-form-item-switch': { template: '<div />' },
        'vuci-form-item-dummy': { template: '<div />' },
        'vuci-form-item-select': { template: '<div />' }
      },
      provide: { formOptions: () => formOptions }
    }
  }

  return createWrapper(Ntrip, mergeDeep(defaultOptions, opts))
}

describe('Ntrip.vue', () => {
  it('filters devices', async () => {
    const wrapper = createNtripWrapper()
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
  it('sets formOptions correctly', () => {
    const wrapper = createNtripWrapper()
    const result = wrapper.vm.getFormOptions()
    expect(result).toEqual({
      device: [],
      serial: [],
      status: []
    })
  })
  it('loads rs device data', async () => {
    const wrapper = createNtripWrapper()
    wrapper.vm.$serial.listDeviceNameTuples = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples.mockReturnValueOnce(['test'])
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(apiData)
    await wrapper.vm.loadDevices()
    expect(wrapper.vm.formOptions).toEqual({ serial, status, device: ['test'] })
  })
  it('loads rs device data', async () => {
    const wrapper = createNtripWrapper()
    wrapper.vm.$serial.listDeviceNameTuples = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples.mockReturnValueOnce([])
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(apiDataWithoutSerial)
    await wrapper.vm.loadDevices()
    expect(wrapper.vm.formOptions).toEqual({ serial: [], status, device: [] })
  })
  it('displays error message when $title load fails', async () => {
    const wrapper = createNtripWrapper()
    wrapper.vm.$serial.listDeviceNameTuples = vi.fn()
    wrapper.vm.$serial.listDeviceNameTuples.mockReturnValueOnce([])
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([{ success: false }, { success: false }])
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadDevices()
    expect(spy).toHaveBeenCalledWith('Failed to load serial data')
    expect(spy).toHaveBeenCalledWith('Failed to load rs serial status')
  })
  it('display error message when api call fails', async () => {
    const wrapper = createNtripWrapper()
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadDevices()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('passes validation', async () => {
    const wrapper = createNtripWrapper()
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockReturnValueOnce({ isValid: true })
    wrapper.vm.formData = { ntrip: [] }
    wrapper.vm.formOptions = { status: [] }
    await expect(wrapper.vm.validate()).resolves.toEqual()
  })
  it('rejects when validation fails', async () => {
    const wrapper = createNtripWrapper()
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockReturnValueOnce({ isValid: false, message: 'Instance with the same device is already enabled' })
    wrapper.vm.formData = {
      ntrip: [
        { port_connect: '1', device: 'test', enabled: '1' },
        { port_listen: '1', device: 'test', enabled: '1' }
      ]
    }
    await expect(wrapper.vm.validate()).rejects.toEqual('Instance with the same device is already enabled')
  })
  it.each`
    title                           | formData    | formOptions
    ${'when ip or port is missing'} | ${formData} | ${formOptions}
    ${'when user_nmea is missing'}  | ${nmea}     | ${formOptions}
    ${'when ip or port is missing'} | ${nmeaGeo}  | ${formOptions}
    ${'when ip or port is missing'} | ${nmeaLong} | ${formOptions}
  `('rejects when validation fails $title', async ({ formData, formOptions }) => {
    const wrapper = createNtripWrapper()
    wrapper.vm.formOptions = formOptions
    const message = 'The service cannot be enabled due to missing essential configuration options. Navigate to the edit modal to update your configuration before attempting to enable the service'
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockReturnValueOnce({ isValid: true })
    wrapper.vm.formData = formData
    await expect(wrapper.vm.validate()).rejects.toEqual(message)
  })
  it.each([
    [{ payload: [{ errors: [{ code: 2 }] }] }, 'Selected device is disconnected, it can not be enabled.'],
    [{ payload: [{ errors: [{ code: 1 }] }] }, 'Selected device is enabled elsewhere'],
    [{ payload: [{ errors: [{ code: 5 }] }] }, 'An unexpected error occurred']
  ])('returns device edit error messages', async (error, response) => {
    const wrapper = createNtripWrapper()
    wrapper.vm.$serial.handleExternalDeviceErrors = vi.fn()
    wrapper.vm.$serial.handleExternalDeviceErrors.mockResolvedValueOnce(response)
    const val = await wrapper.vm.returnErrorMessage(error)
    expect(val).toEqual(response)
  })
  it('returns unavailable error message', () => {
    const wrapper = createNtripWrapper()
    expect(wrapper.vm.deviceUnavailable()).toEqual('Device is unavailable')
  })
})
