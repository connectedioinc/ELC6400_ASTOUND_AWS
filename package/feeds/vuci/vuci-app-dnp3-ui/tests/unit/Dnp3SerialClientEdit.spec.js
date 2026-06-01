import createWrapper from '@tests/unit/mockFactory'
import DNP3SerialClientEdit from '../../src/views/services/DNP3SerialClientEdit'

vi.mock('@/composables/useUniversalGatewayUtils', () => ({
  useUniversalGatewayUtils: vi.fn(() => ({
    getTagSize: vi.fn()
  }))
}))

const data = {
  baudRates: ['test'],
  flowControl: ['test'],
  dataBits: ['test'],
  parity: ['test'],
  duplex: ['test']
}

describe('DNP3SerialClientEdit.vue', () => {
  let wrapper
  let formOptions
  beforeEach(() => {
    const props = {
      section: {
        id: 'test',
        name: 'new',
        enabled: '1',
        device: 'test'
      },
      formRef: {
        validate: vi.fn()
      }
    }
    formOptions = {
      serials: [],
      devices: [['/dev/rs232', 'rs232']],
      status: []
    }
    wrapper = createWrapper(DNP3SerialClientEdit, {
      props,
      global: {
        provide: { formOptions: () => formOptions },
        stubs: {
          'dnp-3-common-interface-fields': { template: '<div />' },
          'dnp-3-testing-element': { template: '<div />' }
        },
        mocks: {
          $serial: {
            deviceDisplayValue: vi.fn().mockResolvedValueOnce('rs232'),
            checkForExternalDevice: vi.fn().mockReturnValueOnce(true),
            filterOptions: vi.fn().mockResolvedValueOnce(data)
          }
        }
      }
    })
  })
  it('returns device display value', async () => {
    const val = await wrapper.vm.device
    expect(val).toEqual('rs232')
  })
  it('loads initial device', () => {
    wrapper.vm.initialDevice = ''
    wrapper.vm.loadInitial()
    expect(wrapper.vm.initialDevice).toEqual('test')
  })
  it('returns serial options', async () => {
    const val = await wrapper.vm.serialOptions
    expect(val).toEqual(data)
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
})
