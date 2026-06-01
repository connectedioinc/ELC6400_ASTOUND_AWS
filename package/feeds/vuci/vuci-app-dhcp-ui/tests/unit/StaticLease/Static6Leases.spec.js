import view from '../../../src/views/network/StaticLease/Static6Leases.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Static6Leases.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(view)
  })

  describe('host id managment', () => {
    it('sets host id normally', () => {
      const duid = '000455559ffffff4444'
      wrapper.vm.leaseStatus = [{ duid, interface: 'lan', ipv6addr: ['ffff::aaaa'] }]
      const section = { hostid: undefined, duid }
      wrapper.vm.setHostId(section)
      expect(section.hostid).toEqual('aaaa')
    })
    it('sets host id when forced', () => {
      const duid = '000455559ffffff4444'
      wrapper.vm.leaseStatus = [{ duid, interface: 'lan', ipv6addr: ['ffff::aaaa'] }]
      const section = { hostid: 'bbbbb', duid }
      wrapper.vm.setHostId(section, true)
      expect(section.hostid).toEqual('aaaa')
    })
    it('does not set host id', () => {
      const duid = '000455559ffffff4444'
      wrapper.vm.leaseStatus = [{ duid, interface: 'lan', ipv6addr: ['ffff::aaaa'] }]
      const section = { hostid: 'bbbbb', duid }
      wrapper.vm.setHostId(section)
      expect(section.hostid).toEqual('bbbbb')
    })
  })
})
