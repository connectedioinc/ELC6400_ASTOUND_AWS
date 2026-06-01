import Dmz from '../../src/views/network/Dmz.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'

describe('Dmz.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(Dmz, {})
  })
  it.each`
    proto              | res
    ${['tcp']}         | ${true}
    ${['tcp', 'udp']}  | ${true}
    ${['all']}         | ${false}
    ${['all', 'icmp']} | ${false}
  `('returns $res if includes correct value from protocol section', ({ proto, res }) => {
    expect(wrapper.vm.portDepends({ proto })).toEqual(res)
  })

  describe('afterLoad()', () => {
    it('shows error on load when api call throws error', async () => {
      vi.spyOn(axios, 'get').mockRejectedValueOnce({})
      const spy = vi.spyOn(wrapper.vm.message, 'error')
      await wrapper.vm.afterLoad()
      expect(spy).toHaveBeenCalled()
    })
    it("doesn't show error on load when api call doesn't throw error", async () => {
      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        success: true,
        data: []
      })
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.afterLoad()
      expect(spy).not.toHaveBeenCalled()
    })
    it('loads data on successful requests', async () => {
      const data = [['192.168.1.1', 'host.lt']]
      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        success: true,
        data
      })
      await wrapper.vm.afterLoad()
      expect(wrapper.vm.ipv4Hints).toEqual(data)
    })
  })
})
