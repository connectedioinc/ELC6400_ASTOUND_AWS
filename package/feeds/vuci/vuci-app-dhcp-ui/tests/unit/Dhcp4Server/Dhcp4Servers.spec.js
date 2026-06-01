import view from '../../../src/views/network/Dhcp4Server/Dhcp4Servers.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'

let wrapper
beforeEach(() => {
  wrapper = createWrapper(view)
})

describe('Dhcp4Servers.vue', () => {
  it('returns filtered interfaces', () => {
    wrapper.vm.interfaceData = [
      { id: 'lan', proto: 'static' },
      { id: 'lan1', proto: 'static' },
      { id: 'interface', proto: 'dhcp' }
    ]
    wrapper.vm.formData.dhcpv4 = [{ id: 'lan' }]
    expect(wrapper.vm.interfaceOptions).toEqual(['lan1'])
  })
  describe('restartDhcp()', () => {
    it('shows success', async () => {
      const spy = vi.spyOn(wrapper.vm.message, 'success')
      vi.spyOn(axios, 'post').mockResolvedValue()
      await wrapper.vm.restartDhcp()
      expect(spy).toBeCalled()
    })
    it('shows error', async () => {
      vi.spyOn(axios, 'post').mockRejectedValue()
      const spy = vi.spyOn(wrapper.vm.message, 'error')
      await wrapper.vm.restartDhcp()
      expect(spy).toBeCalled()
    })
  })
})
