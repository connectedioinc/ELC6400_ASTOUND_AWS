import BaseCumulocity from '../../src/components/services/BaseCumulocity.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'
describe('Cumulocity.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(BaseCumulocity, {
      props: {
        title: 'testTitle',
        name: 'testName',
        dataKey: 'testDataKey'
      }
    })
  })
  it('sets status when updateStatus succeeds', async () => {
    expect(wrapper.vm.status).toEqual('default')
    axios.get = vi.fn().mockResolvedValue({ data: { state_id: '1' } })
    await wrapper.vm.updateStatus()
    expect(wrapper.vm.status).toEqual('1')
  })
  it('invokes error message when updateStatus fails', async () => {
    axios.get = vi.fn().mockRejectedValue()
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.updateStatus()
    expect(spy).toHaveBeenCalledWith('Failed to load testTitle status.')
  })
  it('invokes success message when resetAuthentification succeeds', async () => {
    axios.post = vi.fn().mockResolvedValue()
    const spy = vi.spyOn(wrapper.vm.message, 'success')
    await wrapper.vm.resetAuthentification()
    expect(spy).toHaveBeenCalledWith('Authentication data cleared. Now you can re-register device on testTitle Device Management.')
  })
  it('invokes error message when resetAuthentification fails', async () => {
    axios.post = vi.fn().mockRejectedValue()
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.resetAuthentification()
    expect(spy).toHaveBeenCalledWith('Authentication data clearing failed.')
  })
})
