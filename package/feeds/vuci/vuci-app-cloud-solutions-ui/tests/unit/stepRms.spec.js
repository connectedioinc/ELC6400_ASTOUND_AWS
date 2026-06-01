import createWrapper from '@tests/unit/mockFactory'
import StepRms from '../../src/views/system/StepRms.vue'

describe('StepRms.vue', () => {
  it('loads modem status with true builtin', async () => {
    const wrapper = createWrapper(StepRms)
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({
      data: [{ builtin: true }]
    })
    await wrapper.vm.loadModemsInfo()
    expect(wrapper.vm.modem).toBe(true)
  })
  it('loads modem status with false builtin', async () => {
    const wrapper = createWrapper(StepRms)
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({
      data: [{ builtin: false }]
    })
    await wrapper.vm.loadModemsInfo()
    expect(wrapper.vm.modem).toBe(false)
  })
  it('invokes error message when modem info request is rejected', async () => {
    const wrapper = createWrapper(StepRms)
    wrapper.vm.$axios.get = vi.fn().mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadModemsInfo()
    expect(wrapper.vm.modem).toBe(true)
    expect(spy).toHaveBeenCalledWith('Failed to load modem status')
  })
})
