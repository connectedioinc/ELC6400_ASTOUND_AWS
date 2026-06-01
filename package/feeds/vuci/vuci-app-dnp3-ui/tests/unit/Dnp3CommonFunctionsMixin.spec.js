import commonFunctions from '../../src/views/services/Dnp3CommonFunctionsMixin'
import createWrapper from '@tests/unit/mockFactory'

vi.mock('@/composables/useUniversalGatewayUtils', () => ({
  useUniversalGatewayUtils: vi.fn(() => ({
    getTagSize: vi.fn()
  }))
}))

describe('Dnp3CommonFunctionsMixin.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper({
      render() {},
      mixins: [commonFunctions]
    })
  })
  describe('afterLoad()', () => {
    // TODO: properly unit tests sended messages if messages will get exported one day
    it('deletes local storage after parent delete', () => {
      wrapper.vm.formData = { 1: ['test'] }
      wrapper.vm.clearRequests({ id: '1' })
      expect(wrapper.vm.formData).toEqual({ 1: [] })
    })
    it('shows error on load when api call throws error', async () => {
      vi.spyOn(wrapper.vm.$axios, 'bulkGet').mockRejectedValueOnce([])
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.afterLoad({ dnp3: [] })
      expect(spy).toHaveBeenCalled()
    })
    it("doesn't show error on load when api call doesn't throw error", async () => {
      vi.spyOn(wrapper.vm.$axios, 'bulkGet').mockResolvedValueOnce([
        { success: true, data: {} },
        { success: true, data: [] },
        { success: true, data: {} }
      ])
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.afterLoad({ dnp3: [] })
      expect(spy).not.toHaveBeenCalled()
    })
    it('shows error for data that is successfull and does not that is not', async () => {
      const data = [{ id: 'cfg0321da' }, { id: 'cfg0421da' }]
      vi.spyOn(wrapper.vm.$axios, 'bulkGet').mockResolvedValueOnce([
        { success: true, data: {} },
        { success: true, data: [] },
        { success: true, data: {} },
        { data: data[0], success: true },
        { data: data[1], success: false }
      ])
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      const dnp3 = [{ id: 'ddddsadwe' }, { id: '2313eeeee' }]
      await wrapper.vm.afterLoad({
        dnp3
      })
      expect(spy).toHaveBeenCalledWith('Failed to load  client requests for 2313eeeee instance.')
    })
    it('loads data that is successfull and does not that is not', async () => {
      const data = [{ id: 'cfg0321da' }, { id: 'cfg0421da' }]
      vi.spyOn(wrapper.vm.$axios, 'bulkGet').mockResolvedValueOnce([
        { success: true, data: {} },
        { success: true, data: [] },
        { success: true, data: {} },
        { data: data[0], success: true },
        { data: data[1], success: false }
      ])
      const dnp3 = [{ id: 'ddddsadwe' }, { id: '2313eeeee' }]
      const result = await wrapper.vm.afterLoad({
        dnp3
      })
      expect(result[dnp3[0].id]).toEqual(data[0])
      expect(Object(result).values).not.toEqual(expect.arrayContaining([data[2]]))
    })
    it('check if first load is set', async () => {
      wrapper.vm.$options.watch['globalEnabled.globalStatus'].call(wrapper.vm, true)
      expect(wrapper.vm.stateChanged).toBe(true)
    })
    it('check if state change is not set during first load', async () => {
      wrapper.vm.$options.watch['globalEnabled.globalStatus'].call(wrapper.vm, true, 'firstLoad')
      expect(wrapper.vm.stateChanged).toBe(false)
    })
    it('check if message is shown', async () => {
      const spyOn = vi.spyOn(wrapper.vm.$notification, 'info')
      wrapper.vm.stateChanged = true
      wrapper.vm.globalEnabled.globalStatus = false
      wrapper.vm.$options.watch.modalOpen.call(wrapper.vm, false)
      expect(spyOn).toHaveBeenCalledTimes(1)
    })
    it('check if message is removed', async () => {
      const spyOn = vi.spyOn(wrapper.vm.$notification, 'remove')
      wrapper.vm.stateChanged = true
      wrapper.vm.globalEnabled.globalStatus = true
      wrapper.vm.$options.watch.modalOpen.call(wrapper.vm, false)
      expect(spyOn).toHaveBeenCalledTimes(1)
    })
  })
})
