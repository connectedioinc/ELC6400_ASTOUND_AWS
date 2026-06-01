import PortForwards from '../../../src/views/network/portForward/PortForwards.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'

describe('PortForwards.vue', () => {
  let wrapper
  let wrapperOptions
  beforeEach(() => {
    wrapperOptions = {}
    wrapper = createWrapper(PortForwards, wrapperOptions)
  })

  it('checks if afterLoad load interfaces', async () => {
    const ipv4HintsData = []
    const macHintsData = []
    const zonesData = []
    const zonesGlobalData = {}
    vi.spyOn(axios, 'bulkGet').mockResolvedValue([
      { success: true, data: ipv4HintsData },
      { success: true, data: macHintsData },
      { success: true, data: zonesData },
      { success: true, data: zonesGlobalData }
    ])
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.hints.ipv4_hints).toEqual(ipv4HintsData)
    expect(wrapper.vm.hints.mac_hints).toEqual(macHintsData)
    expect(wrapper.vm.zones).toEqual(zonesData)
    expect(wrapper.vm.zonesGlobal).toEqual(zonesGlobalData)
  })
  it('checks if afterload return error message if request fails', async () => {
    vi.spyOn(axios, 'bulkGet').mockResolvedValue([{ success: false }, { success: false }, { success: false }, { success: false }, { success: false }])
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledTimes(5)
  })
  it('checks if afterload return error message if bulk request fails', async () => {
    vi.spyOn(axios, 'bulkGet').mockRejectedValue()
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
})
