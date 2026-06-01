import createWrapper from '@tests/unit/mockFactory'
import StepPwd from '../../src/views/system/StepPwd.vue'

describe('StepPwd.vue', () => {
  it('loads data when bulk request is successful', async () => {
    const wrapper = createWrapper(StepPwd, {
      global: {
        stubs: {
          'ntp-section': { template: '<div />' },
          'admin-section': { template: '<div />' }
        }
      }
    })
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: true, data: [] },
      { success: true, data: { timezones: [] } }
    ])
    wrapper.vm.formData = { ntpclient: [{ zoneName: 'test' }] }
    await wrapper.vm.loadData({ settings: [{ id: 'general', lang_code: 'en' }] })
    expect(wrapper.vm.installedLanguages).toEqual([])
    expect(wrapper.vm.timeZones).toEqual(['test'])
  })
  it('invokes error message when bulk request fails', async () => {
    const wrapper = createWrapper(StepPwd, {
      global: {
        stubs: {
          'ntp-section': { template: '<div />' },
          'admin-section': { template: '<div />' }
        }
      }
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValueOnce({})
    await wrapper.vm.loadData({ settings: [{ id: 'general', lang_code: 'en' }] })
    expect(wrapper.vm.installedLanguages).toEqual([])
    expect(wrapper.vm.timeZones).toEqual([])
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('invokes error messages when requests are unsuccesful', async () => {
    const wrapper = createWrapper(StepPwd, {
      global: {
        stubs: {
          'ntp-section': { template: '<div />' },
          'admin-section': { template: '<div />' }
        }
      }
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([{ success: false }, { success: false }, { success: false }])
    await wrapper.vm.loadData({ settings: [{ id: 'general', lang_code: 'en' }] })
    expect(wrapper.vm.installedLanguages).toEqual([])
    expect(wrapper.vm.timeZones).toEqual([])
    expect(spy).toHaveBeenCalledWith('Failed to load installed languages')
    expect(spy).toHaveBeenCalledWith('Failed to load timezone options')
  })
})
