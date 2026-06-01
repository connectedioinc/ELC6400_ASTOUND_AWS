import createWrapper from '@tests/unit/mockFactory'
import SubnetConflict from '@/components/shared/SubnetConflict.vue'

describe('SubnetConflict.vue', () => {
  let wrapper
  let wrapperOptions
  beforeEach(() => {
    wrapperOptions = {
      props: {
        interface: 'lan',
        statuses: [],
        configs: []
      }
    }
    wrapper = createWrapper(SubnetConflict, wrapperOptions)
  })

  it.each`
    statuses                                                                                                                         | iface    | result
    ${[]}                                                                                                                            | ${'lan'} | ${[]}
    ${[{ id: 'lan', area_type: 'lan', ipaddrs: ['192.168.1.1/24'] }, { id: 'wan', area_type: 'wan', ipaddrs: ['192.168.1.1/24'] }]}  | ${'lan'} | ${[1]}
    ${[{ id: 'lan', area_type: 'lan', ipaddrs: ['192.168.1.1/24'] }, { id: 'wan', area_type: 'wan', ipaddrs: ['192.168.1.1/24'] }]}  | ${'wan'} | ${[0]}
    ${[{ id: 'lan', area_type: 'lan', ipaddrs: ['192.168.1.1/24'] }, { id: 'lan1', area_type: 'lan', ipaddrs: ['192.168.1.1/24'] }]} | ${'wan'} | ${[]}
    ${[{ id: 'lan', area_type: 'lan', ipaddrs: ['192.168.1.1/24'] }, { id: 'wan', area_type: 'wan', ipaddrs: ['192.168.2.1/24'] }]}  | ${'lan'} | ${[]}
  `('Finds conflicts #%#', async ({ statuses, iface, result }) => {
    await wrapper.setProps({ configs: [], statuses, interface: iface })
    expect(wrapper.vm.mainConflicts).toEqual(result.map(i => statuses[i]))
  })

  it.each`
    configs                                                  | statuses                          | iface    | result
    ${[]}                                                    | ${[]}                             | ${'lan'} | ${'192.168.1.1'}
    ${[{ ipaddr: '192.168.1.2', netmask: '255.255.255.0' }]} | ${[{ ipaddrs: ['192.168.2.5'] }]} | ${'lan'} | ${'192.168.3.1'}
    ${[{ ipaddr: '192.168.1.2', netmask: '255.255.255.0' }]} | ${[{ ipaddrs: ['192.168.3.5'] }]} | ${'lan'} | ${'192.168.2.1'}
    ${[{ ipaddr: '192.168.3.2', netmask: '255.255.255.0' }]} | ${[{ ipaddrs: ['192.168.1.5'] }]} | ${'lan'} | ${'192.168.2.1'}
  `('Finds free ip #%#', async ({ configs, statuses, iface, result }) => {
    await wrapper.setProps({ configs, statuses, interface: iface })
    expect(wrapper.vm.findIp()).toEqual(result)
  })
})
