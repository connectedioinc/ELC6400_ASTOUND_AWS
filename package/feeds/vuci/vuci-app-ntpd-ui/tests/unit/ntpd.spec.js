import createWrapper from '@tests/unit/mockFactory'
import Ntpd from '../../src/views/services/Ntpd.vue'

describe('Ntpd.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(Ntpd)
  })
  it.each`
    requestStatus | enabled | expectedFlag | expectedTimesCalled
    ${true}       | ${'1'}  | ${true}      | ${1}
    ${true}       | ${'0'}  | ${false}     | ${0}
    ${false}      | ${'0'}  | ${false}     | ${0}
  `('calls ntp enabled warning $expectedTimesCalled times when ntpd enabled is $enabled', async ({ requestStatus, enabled, expectedFlag, expectedTimesCalled }) => {
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce({
      success: requestStatus,
      data: { enabled }
    })
    const spy = vi.spyOn(wrapper.vm.$notification, 'info')
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.ntpServerEnabled).toBe(expectedFlag)
    expect(spy).toHaveBeenCalledTimes(expectedTimesCalled)

    spy.mockRestore()
  })

  it('invokes error message when ntp request fails', async () => {
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce({
      success: false,
      errors: []
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('Failed to get NTP server status')

    spy.mockRestore()
  })

  it.each`
    code   | res
    ${1}   | ${'Failed to edit configuration'}
    ${103} | ${'NTP configuration file is required'}
  `('returns error message when code is $code', async ({ code, res }) => {
    const result = wrapper.vm.handleEditErrors({ data: { errors: [{ code }] } })
    expect(result).toEqual(res)
  })
})
