import createWrapper from '@tests/unit/mockFactory'
import EmailToSms from '../../src/views/services/EmailToSMS.vue'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'

vi.mock('@/plugins/mobile', () => ({
  mobile: {
    modemsOptions: () => [
      ['3-1', 'Internal'],
      ['3-2', 'External']
    ]
  }
}))

describe('EmailToSMS.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(EmailToSms)
  })

  it('loads modems with succesful request and empty password', async () => {
    axios.get = vi.fn().mockResolvedValueOnce({
      success: true,
      data: [
        { id: '3-1', name: 'Internal' },
        { id: '3-2', name: 'External' }
      ]
    })
    await wrapper.vm.loadData()
    expect(wrapper.vm.modems).toEqual([
      ['3-1', 'Internal'],
      ['3-2', 'External']
    ])
  })

  it('invokes error message when modem request fails', async () => {
    const message = useMessages()
    axios.get = vi.fn().mockRejectedValueOnce({})
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('Failed to load modem options')
  })
})
