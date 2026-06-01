import Zones from '../../../src/views/network/zones/Zones.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'

describe('Zones.vue', () => {
  let wrapper
  let wrapperOptions
  beforeEach(() => {
    wrapperOptions = {}
    wrapper = createWrapper(Zones, wrapperOptions)
  })
  it('checks if zones are reloaded', async () => {
    const result = [{ name: 'test', in: ['test1', 'test2'], out: ['test1', 'test2'] }]
    vi.spyOn(axios, 'get').mockResolvedValueOnce({ success: true, data: result })
    await wrapper.vm.refreshZones()
    expect(wrapper.vm.formData.zones).toEqual(result)
  })

  it('checks if error message is displayed when zone load request fails', async () => {
    const err = 'Failed to update zones data'
    vi.spyOn(axios, 'get').mockRejectedValueOnce({ success: false })
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.refreshZones()
    expect(spy).toHaveBeenCalledWith(err)
  })

  it('checks if afterLoad load interfaces', async () => {
    const zoneGlobal = { drop_invalid: '1' }
    const interfaceStatus = [{ id: 'lan' }]
    vi.spyOn(axios, 'bulkGet').mockResolvedValue([
      { success: true, data: zoneGlobal },
      { success: true, data: interfaceStatus }
    ])
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.zoneGlobalConfig).toEqual(zoneGlobal)
    expect(wrapper.vm.interfaceStatus).toEqual(interfaceStatus)
  })
  it('checks if afterload return error message if bulk request fails', async () => {
    vi.spyOn(axios, 'bulkGet').mockRejectedValue()
    vi.spyOn(axios, 'bulkGet').mockResolvedValue([{ success: false }, { success: false }])
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledTimes(2)
  })
  it('checks if afterload return error message if bulk request fails', async () => {
    vi.spyOn(axios, 'bulkGet').mockRejectedValue()
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })

  it.each`
    zone                                      | generalZone               | res
    ${{ out: ['ACCEPT'], forward: 'REJECT' }} | ${{ forward: 'NOTRACK' }} | ${['ACCEPT']}
    ${{ forward: 'REJECT' }}                  | ${{ forward: 'NOTRACK' }} | ${['REJECT']}
    ${{}}                                     | ${{ forward: 'NOTRACK' }} | ${['NOTRACK']}
    ${{}}                                     | ${{}}                     | ${['DROP']}
  `('gets forwards of given zone configuration #%#', ({ zone, generalZone, res }) => {
    wrapper.vm.zoneGlobalConfig = generalZone
    expect(wrapper.vm.getForwards(zone)).toEqual(res)
  })
})
