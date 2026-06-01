import GRE from '../../src/views/services/GRE.vue'
import createWrapper from '@tests/unit/mockFactory'

let interfaceData = [
  {
    id: 'test1'
  },
  {
    id: 'test2'
  }
]
let greData = [
  { id: 'test1', '.type': 'test1', proto: 'test1' },
  { id: 'test3', '.type': 'test3', proto: 'test2' }
]

describe('GRE.vue', () => {
  it.each([
    { gre: [], iface: { success: false, data: [] } },
    { gre: greData, iface: { success: true, data: interfaceData } },
    { gre: [], iface: { success: true, data: [] } }
  ])('loads data about all gre instance routes', async ({ iface }) => {
    const wrapper = createWrapper(GRE)
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([iface, { data: [] }])
    const result = await wrapper.vm.loadRoutes({ gre: [{ id: 'test' }] })
    expect(result).toEqual({})
  })
  it('should display error message then load data fails', async () => {
    const wrapper = createWrapper(GRE)
    wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadRoutes({ gre: [{ id: 'test' }] })
    expect(spy).toHaveBeenCalled()
    spy.mockClear()
  })
  it('removes property data from uciData', () => {
    const wrapper = createWrapper(GRE)
    const uciData = { gre: [{ id: 'test' }], testroutes4: [{ id: 'tr4_1' }], testroutes6: [{ id: 'tr6_1' }] }
    const section = { id: 'test' }
    wrapper.vm.onAfterDelete(section, uciData)
    expect(uciData).toEqual({ gre: [{ id: 'test' }], testroutes4: [], testroutes6: [] })
  })
  it.each`
    result               | services
    ${false}             | ${['other']}
    ${'DMVPN'}           | ${['dmvpn']}
    ${'IPSEC'}           | ${['ipsec']}
    ${'DMVPN and IPSEC'} | ${['ipsec', 'dmvpn']}
  `('returns $result when checking if instance exists', ({ result, services }) => {
    const wrapper = createWrapper(GRE)
    const s = { services }
    const val = wrapper.vm.isChildOf(s)
    expect(val).toEqual(result)
  })
  it.each`
    result                                                                                    | services
    ${[]}                                                                                     | ${'notDMVPN'}
    ${[{ info: "This instance can't be deleted because it is part of DMVPN configuration" }]} | ${'dmvpn'}
  `('returns delete button hints', ({ result, services }) => {
    const wrapper = createWrapper(GRE)
    const s = { services }
    const val = wrapper.vm.deleteHints(s)
    expect(val).toEqual(result)
  })
})
