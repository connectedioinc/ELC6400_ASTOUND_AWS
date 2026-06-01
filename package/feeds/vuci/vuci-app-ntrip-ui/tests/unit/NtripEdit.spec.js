import NtripEdit from '../../src/views/services/NtripEdit.vue'
import createWrapper, { mergeDeep } from '@tests/unit/mockFactory'

const props = {
  section: {
    id: 'test',
    enabled: '1',
    device: '/dev/rs232'
  }
}
const formOptions = {
  status: [
    {
      is_used: '1',
      service: 'NTrip',
      name: '/dev/rs232'
    }
  ]
}

function createNtripEditWrapper(opts = {}) {
  const defaultOptions = {
    global: {
      stubs: {
        'vuci-form-item-select': { template: '<div />' },
        'vuci-form-item-input': { template: '<div />' },
        'vuci-form-item-switch': { template: '<div />' }
      },
      provide: { formOptions: () => formOptions }
    }
  }

  return createWrapper(NtripEdit, mergeDeep(defaultOptions, opts))
}

describe('NtripEdit.vue', () => {
  const nmeaDefaultOptions = [
    ['1', 'Predefined string'],
    ['2', 'Predefined coordinates'],
    ['4', 'Serial device']
  ]
  const nmeaWithGps = [
    ['1', 'Predefined string'],
    ['2', 'Predefined coordinates'],
    ['4', 'Serial device'],
    ['3', 'Router GPS device']
  ]
  it.each`
    check    | nmeaSource
    ${true}  | ${nmeaWithGps}
    ${false} | ${nmeaDefaultOptions}
  `('gets nmea source options when gps is $check', ({ check, nmeaSource }) => {
    const wrapper = createNtripEditWrapper({
      props,
      global: {
        mocks: {
          $store: {
            board: {
              hwinfo: {
                gps: check
              }
            }
          }
        }
      }
    })
    const result = wrapper.vm.nmeaSourceOptions
    expect(result).toEqual(nmeaSource)
  })
  it('passes validation', async () => {
    const wrapper = createNtripEditWrapper({ props })
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockResolvedValueOnce({ isValid: true })
    wrapper.vm.formData = {
      ntrip: [
        { device: 'test', enabled: '1' },
        { device: 'test', enabled: '0' }
      ]
    }
    await expect(wrapper.vm.validate()).resolves.toEqual({ isValid: true })
  })
  it('rejects when validation fails', async () => {
    const wrapper = createNtripEditWrapper({ props })
    wrapper.vm.$serial.validateBeforeSave = vi.fn()
    wrapper.vm.$serial.validateBeforeSave.mockRejectedValueOnce({ isValid: false, message: 'Instance with the same device is already enabled' })
    wrapper.vm.formData = {
      ntrip: [
        { device: 'test', enabled: '1' },
        { device: 'test', enabled: '0' }
      ]
    }
    await expect(wrapper.vm.validate()).rejects.toEqual({ isValid: false, message: 'Instance with the same device is already enabled' })
  })
  it('returns serial options', async () => {
    const data = {
      baudRates: ['test'],
      flowControl: ['test'],
      dataBits: ['test'],
      parity: ['test']
    }
    const wrapper = createNtripEditWrapper({
      props,
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
    const wrapper = createNtripEditWrapper({ props })
    wrapper.vm.$serial.handleExternalDeviceErrors = vi.fn()
    wrapper.vm.$serial.handleExternalDeviceErrors.mockResolvedValueOnce(response)
    const val = await wrapper.vm.returnErrorMessage(error)
    expect(val).toEqual(response)
  })
  it('returns device display value', async () => {
    props.section.device = '/dev/rs232'
    const wrapper = createNtripEditWrapper({
      props,
      global: {
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
  it('loads initial device', () => {
    const wrapper = createNtripEditWrapper({ props })
    wrapper.vm.initialDevice = ''
    wrapper.vm.loadInitial()
    expect(wrapper.vm.initialDevice).toEqual('/dev/rs232')
  })
  it.each([
    ['$asGGA,fasd', { isValid: true }],
    ['$aaaGGA,sad', { isValid: false, message: '"$XXGGA," prefix is required. X represents a random symbol.' }]
  ])('validates nmea address', (message, response) => {
    const wrapper = createNtripEditWrapper({ props })
    const val = wrapper.vm.validateNMEA(message)
    expect(val).toEqual(response)
  })
})
