import Services from '../../src/views/status/Services.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Services.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(Services)
  })
  it.each`
    code         | status
    ${'0'}       | ${'Disabled'}
    ${'1'}       | ${'Enabled'}
    ${'2'}       | ${'Standby'}
    ${'invalid'} | ${'-'}
  `('returns "$status" when enabled code is "$code"', ({ code, status }) => {
    const result = wrapper.vm.parseEnabledStatus(code)
    expect(result).toBe(status)
  })
  it.each`
    code         | color
    ${'0'}       | ${'text-theme-text-subtle'}
    ${'1'}       | ${'success'}
    ${'2'}       | ${'text-theme-text-warning'}
    ${'invalid'} | ${'text-theme-text-subtle'}
  `('returns "$color" when enabled code is "$code"', ({ code, color }) => {
    const result = wrapper.vm.parseEnabledColor(code)
    expect(result).toBe(color)
  })
  it.each`
    code          | status
    ${'Running'}  | ${'Running'}
    ${'Disabled'} | ${'Disabled'}
    ${'Standby'}  | ${'Standby'}
    ${'Invalid'}  | ${'Down'}
  `('returns "$status" when status code is "$code"', ({ code, status }) => {
    const result = wrapper.vm.parseStatus(code)
    expect(result).toBe(status)
  })
  it.each`
    code          | color
    ${'Running'}  | ${'success border-theme-text-success'}
    ${'Disabled'} | ${'disabled border-theme-text-secondary-subtle text-theme-text-secondary-subtle'}
    ${'Standby'}  | ${'border-theme-text-warning text-theme-text-warning'}
    ${'Invalid'}  | ${'error border-theme-text-danger'}
  `('returns "$color" when status code is "$code"', ({ code, color }) => {
    const result = wrapper.vm.parseStatusdColor(code)
    expect(result).toBe(color)
  })
  it('calls router.push', async () => {
    const spy = vi.spyOn(wrapper.vm.$router, 'push')
    await wrapper.vm.redirectToPage('')
    expect(spy).toHaveBeenCalled()
  })
  describe('loadData()', () => {
    it("doesn't show error when request doesn't throw error", async () => {
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockResolvedValueOnce({ data: [] })
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.loadData()
      expect(spy).not.toHaveBeenCalled()
    })
    it('shows error when request throws error', async () => {
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockRejectedValueOnce()
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.loadData()
      expect(spy).toHaveBeenCalled()
    })
    it("sets data when request doesn't throw error", async () => {
      wrapper.vm.$axios.get = vi.fn()
      const data = [
        {
          enabled: '1',
          service: 'RMS',
          status: 'Running',
          path: '/services/cloud_solutions/rms'
        }
      ]
      wrapper.vm.$axios.get.mockResolvedValueOnce({ data })
      await wrapper.vm.loadData()
      expect(wrapper.vm.services).toEqual(data)
    })
  })
})
