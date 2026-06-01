import view from '../../../src/views/network/Dhcp4Server/Dhcp4PoolStatus.vue'
import createWrapper from '@tests/unit/mockFactory'

let wrapper
let wrapperOptions
beforeEach(() => {
  wrapperOptions = {
    propsData: {
      dhcpConfig: { start_ip: '192.168.1.100', end_ip: '192.168.1.150' },
      interfaceConfig: { ipaddr: '192.168.1.1', netmask: '255.255.255.0' },
      interfaceConfigs: [{ enabled: '1', proto: 'static', ipaddr: '192.168.1.1', netmask: '255.255.255.0' }],
      leaseStatus: [{ ipaddr: '192.168.1.11' }, { ipaddr: '192.168.1.102' }, { ipaddr: '192.168.1.103' }, { ipaddr: '192.168.1.156' }, { ip: '192.168.2.156' }],
      leaseConfigs: [{ ip: '192.168.1.10' }, { ip: '192.168.1.101' }, { ip: '192.168.1.103' }, { ip: '192.168.1.155' }, { ip: '192.168.1.156' }, { ip: '192.168.2.156' }]
    }
  }
  wrapper = createWrapper(view, wrapperOptions)
})

describe('Dhcp4PoolStatus.vue', () => {
  it('finds IPs used by static interfaces', async () => {
    await wrapper.setProps({
      dhcpConfig: { start_ip: '192.168.1.100', end_ip: '192.168.1.150' },
      interfaceConfig: { ipaddr: '192.168.1.1', netmask: '255.255.255.0', device: 'br_lan' },
      interfaceConfigs: [
        { enabled: '1', proto: 'static', ipaddr: '192.168.1.1', netmask: '255.255.255.0', device: 'br_lan' },
        { enabled: '1', proto: 'static', ipaddr: '192.168.1.150', netmask: '255.255.255.0', device: 'br_lan1' },
        { enabled: '0', proto: 'static', ipaddr: '192.168.1.150', netmask: '255.255.255.0', device: 'br_lan' },
        { enabled: '1', proto: 'dhcp', ipaddr: '192.168.1.150', netmask: '255.255.255.0', device: 'br_lan' },
        { enabled: '1', proto: 'static', ipaddr: '192.168.1.150', netmask: '255.255.255.0', device: 'br_lan' }
      ]
    })
    expect(wrapper.vm.fromStaticInterfaces).toEqual([{ enabled: '1', proto: 'static', ipaddr: '192.168.1.150', netmask: '255.255.255.0', device: 'br_lan' }])
  })
  it('finds IPs from static lease configs that are inside pool', () => {
    expect(wrapper.vm.fromConfigsInsidePool).toEqual([{ ip: '192.168.1.101' }, { ip: '192.168.1.103' }])
  })
  it('finds IPs from static lease configs that are outside pool', () => {
    expect(wrapper.vm.fromConfigOutsidePool).toEqual([{ ip: '192.168.1.10' }, { ip: '192.168.1.155' }, { ip: '192.168.1.156' }])
  })
  it('finds IPs from static lease configs for all interface leases', () => {
    expect(wrapper.vm.fromConfigs).toEqual([{ ip: '192.168.1.101' }, { ip: '192.168.1.103' }, { ip: '192.168.1.10' }, { ip: '192.168.1.155' }, { ip: '192.168.1.156' }])
  })
  it('finds IPs from dynamic lease status', () => {
    expect(wrapper.vm.fromStatus).toEqual([{ ipaddr: '192.168.1.102' }, { ipaddr: '192.168.1.103' }])
  })
  it('finds overlap count between static and dinamic leases', () => {
    expect(wrapper.vm.overlap).toEqual(1)
  })
  it('finds used ip count', () => {
    expect(wrapper.vm.used).toEqual(6)
  })
  it('finds possible ip count', () => {
    expect(wrapper.vm.total).toEqual(54)
  })
  it('finds posible ip that are left count', () => {
    expect(wrapper.vm.left).toEqual(48)
  })
  it('excludes ipaddr without ends', async () => {
    await wrapper.setProps({ dhcpConfig: { start_ip: '192.168.0.240', end_ip: '192.168.1.0' } })
    expect(wrapper.vm.excluded).toEqual(2)
    expect(wrapper.vm.total).toEqual(20)
  })
  it('excludes ipaddr with ends', async () => {
    await wrapper.setProps({ dhcpConfig: { start_ip: '192.168.0.0', end_ip: '192.168.1.255' } })
    expect(wrapper.vm.excluded).toEqual(4)
    expect(wrapper.vm.total).toEqual(508)
  })
  it('does not exclude static leases', async () => {
    await wrapper.setProps({
      dhcpConfig: { start_ip: '192.168.0.240', end_ip: '192.168.1.0' },
      leaseConfigs: [...wrapperOptions.propsData.leaseConfigs, { ip: '192.168.0.255' }, { ip: '192.168.1.0' }]
    })
    expect(wrapper.vm.excluded).toEqual(0)
    expect(wrapper.vm.total).toEqual(22)
  })
  it.each`
    createCount | end    | expectedResult
    ${150}      | ${150} | ${'error'}
    ${149}      | ${150} | ${'warning'}
    ${135}      | ${150} | ${'warning'}
    ${134}      | ${150} | ${'info'}
    ${0}        | ${150} | ${'info'}
  `('returns state #%#', async ({ createCount, end, expectedResult }) => {
    await wrapper.setProps({
      interfaceConfigs: [{ enabled: '1', proto: 'static', ipaddr: '192.168.1.0', netmask: '255.255.255.0' }],
      dhcpConfig: { start_ip: '192.168.1.1', end_ip: `192.168.1.${end}` },
      leaseStatus: [],
      leaseConfigs: Array.from({ length: createCount }, (_, i) => ({ ip: `192.168.1.${i + 1}` }))
    })
    expect(wrapper.vm.state).toEqual(expectedResult)
  })
})
