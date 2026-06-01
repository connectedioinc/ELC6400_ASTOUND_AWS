import Internet from '../../src/views/network/Internet.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Internet.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(Internet)
  })
  describe('method getStatus()', () => {
    it('loads internet status on success', async () => {
      const data = {
        ipv4_status: 'Online',
        ipv6_status: 'Offline',
        dns_status: 'Available'
      }
      wrapper.vm.$axios.get = vi.fn().mockResolvedValue({ data })
      await wrapper.vm.getStatus()
      expect(wrapper.vm.status).toEqual(data)
    })
    it('shows error on fail', async () => {
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      wrapper.vm.$axios.get = vi.fn().mockRejectedValue()
      await wrapper.vm.getStatus()
      expect(spy).toHaveBeenCalledWith('Failed to load internet status data')
    })
  })
})
