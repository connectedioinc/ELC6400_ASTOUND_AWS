import HotspotFileEdit from '../../src/views/services/HotspotFileEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

const propsData = {
  theme: 'default',
  section: {
    file: 'header.htm'
  }
}
describe('HotspotFileEdit.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(HotspotFileEdit, { propsData })
  })
  it('invoke load data error messages on fail', async () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce()
    await wrapper.vm.loadInitial()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('does not invoke load data error messages on success', async () => {
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce({ success: true, data: { file: 'test' } })
    wrapper.vm.formData = {
      'default-header': [{ file: 'test', name: 'header' }]
    }
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadInitial()
    expect(spy).toHaveBeenCalledTimes(0)
  })
  it('invokes onOk error message on fail', async () => {
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const spy1 = vi.spyOn(wrapper.vm.$message, 'success')
    await wrapper.vm.onOk()
    expect(spy).toHaveBeenCalledWith('Failed to reset template')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy1).toHaveBeenCalledTimes(0)
  })
  it('invoke onOk success message on success', async () => {
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce({ succes: true, data: { file: 'header.html' } })
    wrapper.vm.formData = {
      'default-header': [{ file: 'test', name: 'header' }]
    }
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    const spy1 = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.onOk()
    expect(spy).toHaveBeenCalledWith('Template has been reset')
    expect(spy).toHaveBeenCalled(1)
    expect(spy1).toHaveBeenCalledTimes(0)
  })
  it('shows prompt on reset', async () => {
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
    await wrapper.vm.resetText()
    expect(spy).toHaveBeenCalled()
  })
  it('resets text to default data', async () => {
    wrapper.vm.$axios.post = vi.fn()
    const file = {
      data: {
        file: 'header.htm'
      }
    }
    wrapper.vm.$axios.post.mockResolvedValueOnce(file)
    wrapper.vm.formData = {
      'default-header': [{ file: '', name: 'header' }]
    }
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.resetText()
    expect(spy).not.toHaveBeenCalled()
  })
})
