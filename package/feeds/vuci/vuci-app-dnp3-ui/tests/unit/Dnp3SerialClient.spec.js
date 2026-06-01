import createWrapper from '@tests/unit/mockFactory'
import DNP3SerialClient from '../../src/views/services/DNP3SerialClient'

vi.mock('@/composables/useUniversalGatewayUtils', () => ({
  useUniversalGatewayUtils: vi.fn(() => ({
    getTagSize: vi.fn()
  }))
}))

describe('DNP3SerialClient.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(DNP3SerialClient)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  describe('loadData()', () => {
    it('shows error on load when api call throws error', async () => {
      wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValueOnce({})
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      wrapper.vm.afterLoad = vi.fn()
      await wrapper.vm.loadData()
      expect(spy).toHaveBeenCalled()
    })
    it('returns form options', () => {
      const wrapper = createWrapper(DNP3SerialClient)
      const val = wrapper.vm.getFormOptions()
      expect(val).toEqual({ serial: [], status: [], devices: [] })
    })
    it.each([
      [{ payload: [{ errors: [{ code: 2 }] }] }, 'Selected device is disconnected, it can not be enabled.'],
      [{ payload: [{ errors: [{ code: 1 }] }] }, 'Selected device is enabled elsewhere'],
      [{ payload: [{ errors: [{ code: 5 }] }] }, 'An unexpected error occurred']
    ])('returns device edit error messages', async (error, response) => {
      const wrapper = createWrapper(DNP3SerialClient)
      wrapper.vm.$serial.handleExternalDeviceErrors = vi.fn()
      wrapper.vm.$serial.handleExternalDeviceErrors.mockResolvedValueOnce(response)
      const val = await wrapper.vm.returnErrorMessage(error)
      expect(val).toEqual(response)
    })
    it("doesn't show error on load when api call doesn't throw error", async () => {
      wrapper.vm.$axios.bulkGet = vi.fn()
      wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
        {
          success: true,
          data: []
        },
        {
          success: true,
          data: { board: {} }
        }
      ])
      wrapper.vm.afterLoad = vi.fn()
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.loadData()
      expect(spy).not.toHaveBeenCalled()
    })
    it('shows error on load when api call throws error', async () => {
      wrapper.vm.$axios.bulkGet = vi.fn()
      wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
        {
          success: false,
          data: []
        },
        {
          success: false,
          data: { board: {} }
        }
      ])
      wrapper.vm.afterLoad = vi.fn()
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.loadData()
      expect(spy).toHaveBeenCalled()
    })
    it('loads data on successful requests', async () => {
      const data = [{ name: '/dev/rs485' }]
      wrapper.vm.$axios.bulkGet = vi.fn()
      wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
        {
          success: true,
          data
        },
        {
          success: true,
          data: { board: { serial: [{ devices: ['/dev/rs232'] }] } }
        }
      ])
      wrapper.vm.afterLoad = vi.fn()
      await wrapper.vm.loadData()
      expect(wrapper.vm.formOptions.status).toEqual(data)
    })
    it('loads data on successful requests', async () => {
      wrapper.vm.$axios.bulkGet = vi.fn()
      wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
        {
          success: true,
          data: []
        },
        {
          success: true,
          data: []
        }
      ])
      wrapper.vm.afterLoad = vi.fn()
      await wrapper.vm.loadData()
      expect(wrapper.vm.afterLoad).toHaveBeenCalled()
    })
  })
})
