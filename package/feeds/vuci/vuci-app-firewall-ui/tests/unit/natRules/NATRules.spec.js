import NATRules from '../../../src/views/network/natRules/NATRules.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'

describe('NATRules.vue', () => {
  let wrapper
  let wrapperOptions
  beforeEach(() => {
    wrapperOptions = {}
    wrapper = createWrapper(NATRules, wrapperOptions)
  })

  it('checks if afterLoad load interfaces', async () => {
    const ipv4HintsData = []
    const zonesData = []
    vi.spyOn(axios, 'bulkGet').mockResolvedValue([
      { success: true, data: ipv4HintsData },
      { success: true, data: zonesData }
    ])
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.ipv4Hints).toEqual(ipv4HintsData)
    expect(wrapper.vm.zones).toEqual(zonesData)
  })
  it('checks if afterload return error message if request fails', async () => {
    vi.spyOn(axios, 'bulkGet').mockResolvedValue([{ success: false }, { success: false }, { success: false }])
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledTimes(3)
  })
  it('checks if afterload return error message if bulk request fails', async () => {
    vi.spyOn(axios, 'bulkGet').mockRejectedValue()
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
})
