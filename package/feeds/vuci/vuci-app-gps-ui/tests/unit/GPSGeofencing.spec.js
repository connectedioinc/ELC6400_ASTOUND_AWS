import GPSGeofencing from '../../src/views/services/GPSGeofencing'
import createWrapper from '@tests/unit/mockFactory'

describe('GPSGeofencing.vue', () => {
  it.each([
    { input: 'bulls', result: 'N/A' },
    { input: 'on_exit', result: 'Exit' },
    { input: 'on_enter', result: 'Enter' },
    { input: 'on_both', result: 'Enter/Exit' }
  ])('checks displayGenerate event on method returns', ({ input, result }) => {
    const wrapper = createWrapper(GPSGeofencing)
    expect(wrapper.vm.displayGenerateEventOn(input)).toEqual(result)
  })
  it('loads profile data', async () => {
    const wrapper = createWrapper(GPSGeofencing)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce({ success: true, data: 'profiles loaded yay' })
    await wrapper.vm.loadData()
    expect(wrapper.vm.profiles).toEqual('profiles loaded yay')
  })
  it('invokes error message', async () => {
    const wrapper = createWrapper(GPSGeofencing)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('Failed to load profile data')
  })
  it('returns profile data', async () => {
    const wrapper = createWrapper(GPSGeofencing)
    wrapper.vm.profiles = 'profiles'
    expect(wrapper.vm.getProfiles()).toEqual('profiles')
  })
})
