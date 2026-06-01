import { flushPromises } from '@vue/test-utils'
import UScripts from '../../src/views/system/UScripts.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('UScripts.vue', () => {
  describe('created()', () => {
    it('shows error on created when request throws error', async () => {
      const wrapper = createWrapper(UScripts, { global: { mocks: { $axios: { get: vi.fn().mockRejectedValue() } } } })
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await flushPromises()
      expect(spy).toHaveBeenCalled()
    })
    it("doesn't show error on created when request doesn't throw error", async () => {
      const wrapper = createWrapper(UScripts, { global: { mocks: { $axios: { get: vi.fn().mockResolvedValueOnce({ data: {} }) } } } })
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await flushPromises()
      expect(spy).not.toHaveBeenCalled()
    })
  })
  describe('saveScript()', () => {
    it("shows error and doesn't show success when request throws error", async () => {
      const wrapper = createWrapper(UScripts)
      wrapper.vm.$axios.post = vi.fn().mockRejectedValue()
      const spyError = vi.spyOn(wrapper.vm.$message, 'error')
      const spySuccess = vi.spyOn(wrapper.vm.$message, 'success')
      await wrapper.vm.saveScript()
      expect(spyError).toHaveBeenCalled()
      expect(spySuccess).not.toHaveBeenCalled()
    })
    it("doesn't show error and shows success when request doesn't throw error", async () => {
      const wrapper = createWrapper(UScripts)
      wrapper.vm.$axios.post = vi.fn().mockResolvedValueOnce()
      const spyError = vi.spyOn(wrapper.vm.$message, 'error')
      const spySuccess = vi.spyOn(wrapper.vm.$message, 'success')
      await wrapper.vm.saveScript()
      expect(spyError).not.toHaveBeenCalled()
      expect(spySuccess).toHaveBeenCalled()
    })
    it('returns FormData with file', async () => {
      const wrapper = createWrapper(UScripts)
      wrapper.setData({
        areaValue: 'test'
      })
      const result = wrapper.vm.createFormData()
      expect(result.get('file').size).toBeGreaterThan(0)
    })
  })
})
