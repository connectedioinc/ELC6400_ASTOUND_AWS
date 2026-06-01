import IgmpProxy from '../../src/views/services/IgmpProxy.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('IgmpProxy.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(IgmpProxy)
  })
  it('check if extraLoad loads data', async () => {
    const interfaceStatus = [
      { id: 'lan', name: 'lan', proto: 'static' },
      { id: 'wan6', name: 'wan6', proto: 'dhcpv6' },
      { id: 'wan', name: 'wan', proto: 'dhcp' }
    ]
    const firewallZones = [{ name: 'lan' }, { name: 'wan' }]
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: true, data: interfaceStatus },
      { success: true, data: firewallZones }
    ])
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.interfaceStatus).toEqual(interfaceStatus)
    expect(wrapper.vm.zones).toEqual(['lan', 'wan'])
  })
  it('Check if error is diplayed while loading data', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValue([{ success: false }, { success: false }])
    const spyError = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spyError).toHaveBeenCalledTimes(2)
  })

  it('Check if error is diplayed while loading data', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValue()
    const spyError = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spyError).toHaveBeenCalled()
  })
})
