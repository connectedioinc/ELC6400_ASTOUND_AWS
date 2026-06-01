import gps from '../../src/views/services/General'
import createWrapper from '@tests/unit/mockFactory'

describe('GPS general.vue', () => {
  it('checks if after load shows error', async () => {
    const wrapper = createWrapper(gps)
    wrapper.vm.$axios.get = vi.fn().mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('Failed to load GPS feature status')
  })

  describe('showIntervalWarning()', () => {
    it.each(['299', '100', '0'])('check true', interval => {
      const wrapper = createWrapper(gps)
      wrapper.vm.wwanGnssConflict = true
      const section = { mode: '1', interval }
      expect(wrapper.vm.showIntervalWarning(section)).toBeTruthy()
    })

    it.each(['300', '400', '1000'])('check false', interval => {
      const wrapper = createWrapper(gps)
      wrapper.vm.wwanGnssConflict = true
      const section = { mode: '1', interval }
      expect(wrapper.vm.showIntervalWarning(section)).toBeFalsy()
    })
  })

  describe('showTimeoutWarning()', () => {
    it.each(['99', '10', '0'])('check true', timeout => {
      const wrapper = createWrapper(gps)
      wrapper.vm.wwanGnssConflict = true
      const section = { mode: '1', timeout }
      expect(wrapper.vm.showTimeoutWarning(section)).toBeTruthy()
    })

    it.each(['100', '200', '1000'])('check false', timeout => {
      const wrapper = createWrapper(gps)
      wrapper.vm.wwanGnssConflict = true
      const section = { mode: '1', timeout }
      expect(wrapper.vm.showTimeoutWarning(section)).toBeFalsy()
    })
  })
})
