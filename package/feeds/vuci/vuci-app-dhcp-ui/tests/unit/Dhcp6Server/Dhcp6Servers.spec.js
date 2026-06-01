import view from '../../../src/views/network/Dhcp6Server/Dhcp6Servers.vue'
import createWrapper from '@tests/unit/mockFactory'

let wrapper
beforeEach(() => {
  wrapper = createWrapper(view)
})

describe('Dhcp6Servers.vue', () => {
  it.each`
    ifStatus                                                                                                                      | result
    ${{ 'ipv6-prefix': [{ address: 'ffff:ffff', mask: 60 }], 'ipv6-prefix-assignment': [] }}                                      | ${['ffff:ffff/60']}
    ${{ 'ipv6-prefix': [], 'ipv6-prefix-assignment': [{ address: 'ffff:ffff', mask: 60 }] }}                                      | ${['ffff:ffff/60']}
    ${{ 'ipv6-prefix': [{ address: 'ffff:ffff', mask: 60 }], 'ipv6-prefix-assignment': [{ address: 'ffff:ffff:ff', mask: 64 }] }} | ${['ffff:ffff/60', 'ffff:ffff:ff/64']}
  `('parses pd from status #%#', ({ ifStatus, result }) => {
    wrapper.vm.interfaceStatus = [ifStatus]
    expect(wrapper.vm.getPD({ id: ifStatus.id })).toEqual(result)
  })
})
