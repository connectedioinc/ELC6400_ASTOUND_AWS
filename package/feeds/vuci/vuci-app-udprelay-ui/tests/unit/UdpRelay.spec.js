import UdpRelay from '../../src/views/network/UdpRelay.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('UdpRelay.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(UdpRelay)
  })

  it('check if afterLoad load interfaces data', async () => {
    const ifacesData = [
      { id: 'testIface', proto: 'static' },
      { id: 'testIface2', proto: 'wwan' }
    ]
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce({ success: true, data: ifacesData })
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.ifaces).toEqual(ifacesData)
  })

  it('check if afterLoad invokes interface data load error', async () => {
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('Failed to load interfaces data')
  })

  it('check if computed property interfaceOptions return correct filtered interfaces names list', () => {
    wrapper.setData({
      ifaces: [
        { id: 'test1', proto: 'static' },
        { id: 'test2', proto: 'wwan' },
        { id: 'test3', proto: 'none' },
        { id: 'test4', proto: 'dhcp' }
      ]
    })
    expect(wrapper.vm.interfaceOptions).toEqual(['test1', 'test4'])
  })
})
