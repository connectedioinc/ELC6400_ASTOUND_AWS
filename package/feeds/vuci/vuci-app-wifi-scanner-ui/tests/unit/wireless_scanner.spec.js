import createWrapper from '@tests/unit/mockFactory'
import WifiScanner from '../../src/views/services/WifiScanner.vue'

describe('WirelessScanner.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(WifiScanner)
  })
  it('shows message on error', async () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.get = vi.fn().mockRejectedValue()
    await wrapper.vm.loadData()
    expect(spy).toBeCalled()
  })
  it('does not show error message if request resolves', async () => {
    wrapper.vm.formData = {}
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const data = {
      '.type': 'section',
      interval: '123',
      id: 'general',
      five_g_enabled: '1',
      two_g_enabled: '1'
    }
    wrapper.vm.$axios.get = vi.fn().mockResolvedValue({ success: true, data: [data] })
    await wrapper.vm.loadData()
    expect(spy).not.toBeCalled()
    expect(wrapper.vm.formData).toEqual([data])
  })
})
