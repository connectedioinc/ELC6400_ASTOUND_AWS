import createWrapper from '@tests/unit/mockFactory'
import PPSKProfiles from '../../../src/views/network/ppskProfiles/PPSKProfiles.vue'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'

describe('PPSKProfiles.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(PPSKProfiles)
  })

  it('succesfully loads after load data', async () => {
    const stations = [{ id: 'station1', username: 'user1', key: 'pass1234' }]
    const macHints = [
      ['00:11:22:33:44:55', 'Device1'],
      ['66:77:88:99:AA:BB', 'Device2']
    ]
    const ifaces = [{ id: 'lan', name: 'lan', bridge: '1' }]
    axios.bulkGet = vi.fn().mockResolvedValue([
      { success: true, data: stations },
      { success: true, data: macHints },
      { success: true, data: ifaces }
    ])
    const res = await wrapper.vm.afterLoad()
    expect(res.wifiStations).toEqual(stations)
    expect(wrapper.vm.macHints).toEqual(macHints)
    expect(wrapper.vm.ifaceConfigs).toEqual(ifaces)
  })
  it('fails to load after load data', async () => {
    const message = useMessages()
    const spy = vi.spyOn(message, 'error')
    axios.bulkGet = vi.fn().mockResolvedValue([{ success: false }, { success: false }, { success: false }])
    await wrapper.vm.afterLoad()
    expect(spy).nthCalledWith(1, 'Failed to load wireless stations configuration')
    expect(spy).nthCalledWith(2, 'Failed to load MAC address hints')
    expect(spy).nthCalledWith(3, 'Failed to load interface configuration')
  })
  it('after load unexpected error', async () => {
    const message = useMessages()
    const spy = vi.spyOn(message, 'error')
    axios.bulkGet = vi.fn().mockRejectedValue()
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
})
