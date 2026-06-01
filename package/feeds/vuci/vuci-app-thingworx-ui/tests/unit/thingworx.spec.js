import createWrapper from '@tests/unit/mockFactory'
import ThingWorx from '../../src/views/services/ThingWorx.vue'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'

describe('ThingWorx.vue', () => {
  const apiData = {
    success: true,
    data: [
      {
        id: 'lan',
        network_type: 'bridge'
      },
      {
        id: 'mob1s1a1',
        network_type: 'mobile'
      },
      {
        id: 'mob1s2a1',
        network_type: 'mobile'
      }
    ]
  }
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(ThingWorx)
  })
  it('displays error message when API call is not successful', async () => {
    const message = useMessages()
    axios.get = vi.fn()
    axios.get.mockRejectedValueOnce()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('Failed to load interface options')
  })
  it('filters interface list correctly', async () => {
    axios.get = vi.fn()
    axios.get.mockResolvedValueOnce(apiData)
    await wrapper.vm.loadData()
    const value = wrapper.vm.interfaceOptions
    expect(value).toEqual(['mob1s1a1', 'mob1s2a1'])
  })
})
