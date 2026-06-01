import createWrapper from '@tests/unit/mockFactory'
import TrafficLog from '../../src/views/status/TrafficLog.vue'

describe('TrafficLog.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it.each`
    enabled | ftpEnabled | trafficLog | times
    ${'1'}  | ${'1'}     | ${'123'}   | ${1}
    ${'1'}  | ${'0'}     | ${'123'}   | ${0}
    ${'0'}  | ${'1'}     | ${'123'}   | ${2}
    ${'0'}  | ${'0'}     | ${'123'}   | ${1}
  `('loads log data and invokes side message warning $times times with enabled $enabled and ftp_enabled $ftp_enabled ', async ({ enabled, ftpEnabled, trafficLog, times }) => {
    const wrapper = createWrapper(TrafficLog)
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({
      data: { enabled, ftp_enabled: ftpEnabled, traffic_log: trafficLog }
    })
    const spy = vi.spyOn(wrapper.vm.$notification, 'info')
    expect(wrapper.vm.trafficLog).toBeFalsy()
    await wrapper.vm.loadLogData()
    expect(wrapper.vm.trafficLog).toBe(trafficLog)
    expect(spy).toHaveBeenCalledTimes(times)
  })
  it('invokes error message when ulog status request fails', async () => {
    const wrapper = createWrapper(TrafficLog)
    wrapper.vm.$axios.get = vi.fn().mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadLogData()
    expect(spy).toHaveBeenCalledWith('Failed to get traffic logging information')
  })
})
