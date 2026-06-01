import ProtoNhrp from '../../src/views/status/ProtoNhrp.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('New status tests', () => {
  it('invokes error message', async () => {
    const wrapper = createWrapper(ProtoNhrp)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getData()
    expect(spy).toHaveBeenCalledWith('Failed to load nhrp data')
  })
  it.each([[true], [false]])('load data', async flag => {
    const wrapper = createWrapper(ProtoNhrp)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.loading = flag
    wrapper.vm.$axios.get.mockResolvedValueOnce({ data: ['test'] })
    await wrapper.vm.getData()
    expect(wrapper.vm.nhrp.data).toEqual(['test'])
  })
})
