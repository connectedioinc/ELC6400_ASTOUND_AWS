import view from '../../../src/views/status/GenericLeaseStatus.vue'
import createWrapper, { combineDeep } from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'

describe('LeaseStatus.vue', () => {
  const wrapperOptionsGlobal = {}
  describe('ipv4', () => {
    let wrapper
    const wrapperOptions = combineDeep(wrapperOptionsGlobal, {
      props: {
        ipv: 'ipv4'
      }
    })
    beforeEach(() => {
      wrapper = createWrapper(view, wrapperOptions)
    })

    describe('creates static lease', () => {
      it('successfully', async () => {
        const dynamicLease = {
          macaddr: '11:11:11:11:11:11',
          ipaddr: '192.168.10.25',
          hostname: 'my-router'
        }
        const staticLease = {
          mac: '11:11:11:11:11:11',
          ip: '192.168.10.25',
          name: 'my-router'
        }
        const createdStaticLease = {
          id: '123',
          ...staticLease
        }
        const spy = vi.spyOn(axios, 'post').mockResolvedValue({ data: createdStaticLease })

        await wrapper.vm.leaseDevice(dynamicLease)

        expect(spy).toBeCalledWith('/api/dhcp/static_leases/ipv4/config', { data: staticLease })
        expect(wrapper.vm.leaseConfig[0]).toEqual(createdStaticLease)
      })
      it('shows error', async () => {
        vi.spyOn(axios, 'post').mockRejectedValue()
        const spy = vi.spyOn(wrapper.vm.message, 'error')
        await wrapper.vm.leaseDevice({})
        expect(spy).toHaveBeenCalled()
      })
    })
    describe('returns if device has static lease', () => {
      it('finds lease', () => {
        wrapper.vm.leaseConfig = [{ mac: '11:11:11:11:11:11' }]
        expect(wrapper.vm.isMacReserved({ macaddr: '11:11:11:11:11:11' })).toBeTruthy()
      })
      it('does not find lease', () => {
        wrapper.vm.leaseConfig = [{ mac: '11:11:11:11:11:12' }]
        expect(wrapper.vm.isMacReserved({ macaddr: '11:11:11:11:11:11' })).toBeFalsy()
      })
    })
    describe('returns if ip is reserved', () => {
      it('finds lease', () => {
        wrapper.vm.leaseConfig = [{ ipaddr: '192.168.1.11' }]
        expect(wrapper.vm.isIpReserved({ ip: '192.168.1.11' })).toBeTruthy()
      })
      it('does not find lease', () => {
        wrapper.vm.leaseConfig = [{ ip: '192.168.1.12' }]
        expect(wrapper.vm.isIpReserved({ ip: '192.168.1.11' })).toBeFalsy()
      })
    })
    describe('manages interface selection', () => {
      it('selects', () => {
        wrapper.vm.selectedInterfaces = [{ name: 'lan1' }]
        wrapper.vm.selectInterface({ name: 'lan2' })
        expect(wrapper.vm.selectedInterfaces).toEqual([{ name: 'lan1' }, { name: 'lan2' }])
      })
      it('unselects', () => {
        wrapper.vm.selectedInterfaces = [{ name: 'lan1' }, { name: 'lan2' }]
        wrapper.vm.selectInterface({ name: 'lan2' })
        expect(wrapper.vm.selectedInterfaces).toEqual([{ name: 'lan1' }])
      })
    })
  })
  describe('ipv6', () => {
    let wrapper
    const wrapperOptions = combineDeep(wrapperOptionsGlobal, {
      propsData: {
        ipv: 'ipv6'
      }
    })
    beforeEach(() => {
      wrapper = createWrapper(view, wrapperOptions)
    })
    describe('creates static lease', () => {
      it('successfully', async () => {
        const dynamicLease = {
          duid: '00041231231233123',
          ipv6addr: ['ffff::aaaa'],
          hostname: 'my-router'
        }
        const staticLease = {
          duid: '00041231231233123',
          hostid: 'aaaa',
          name: 'my-router'
        }
        const createdStaticLease = {
          id: '123',
          ...staticLease
        }
        const spy = vi.spyOn(axios, 'post').mockResolvedValue({ data: createdStaticLease })

        await wrapper.vm.leaseDevice(dynamicLease)

        expect(spy).toBeCalledWith('/api/dhcp/static_leases/ipv6/config', { data: staticLease })
        expect(wrapper.vm.leaseConfig[0]).toEqual(createdStaticLease)
      })
    })
    describe('returns if device has static lease', () => {
      it('finds lease', () => {
        wrapper.vm.leaseConfig = [{ duid: '00041231231233123' }]
        expect(wrapper.vm.isMacReserved({ duid: '00041231231233123' })).toBeTruthy()
      })
      it('does not find lease', () => {
        wrapper.vm.leaseConfig = [{ duid: '00041231231233123' }]
        expect(wrapper.vm.isMacReserved({ duid: '00041231231233122' })).toBeFalsy()
      })
    })
    describe('returns if ip is reserved', () => {
      it('finds lease', () => {
        wrapper.vm.leaseConfig = [{ hostid: 'fffa' }]
        expect(wrapper.vm.isIpReserved({ ipv6addr: ['ffff::fffA'] })).toBeTruthy()
      })
      it('does not find lease', () => {
        wrapper.vm.leaseConfig = [{ hostid: 'fffb' }]
        expect(wrapper.vm.isIpReserved({ ipv6addr: ['ffff::fffA'] })).toBeFalsy()
      })
    })
  })
})
