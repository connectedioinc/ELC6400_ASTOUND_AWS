import createWrapper from '@tests/unit/mockFactory'
import StepLan from '../../src/views/system/StepLan.vue'

describe('StepLan.vue', () => {
  it('returns lan dhcp section', () => {
    const wrapper = createWrapper(StepLan)
    wrapper.vm.formData.dhcpv4 = [
      {
        id: 'lan',
        enabled: '1'
      }
    ]
    expect(wrapper.vm.section).toEqual({
      id: 'lan',
      enabled: '1'
    })
  })
  it('return empty object when lan dhcp section is not present', () => {
    const wrapper = createWrapper(StepLan)
    wrapper.vm.formData.dhcpv4 = []
    expect(wrapper.vm.section).toEqual({})
  })
  it('returns lan interface section', () => {
    const wrapper = createWrapper(StepLan)
    wrapper.vm.formData.networks = [
      {
        id: 'lan',
        enabled: '1'
      }
    ]
    expect(wrapper.vm.interfaceSection).toEqual({
      id: 'lan',
      enabled: '1'
    })
  })
  it('return empty object when lan interface section is not present', () => {
    const wrapper = createWrapper(StepLan)
    wrapper.vm.formData.networks = []
    expect(wrapper.vm.interfaceSection).toEqual({})
  })
  it('loads modem status with true builtin and sets lan ip', () => {
    const wrapper = createWrapper(StepLan)
    wrapper.vm.$store = {
      lanIP: '1.1.1.1'
    }
    const formData = {
      networks: [{ id: 'lan', ipaddr: '192.168.1.1' }],
      dhcpv4: [{ id: 'lan' }]
    }
    wrapper.vm.parseDhcpData(formData)
    expect(wrapper.vm.initialIp).toBe('192.168.1.1')
    expect(formData).toEqual({
      networks: [
        {
          id: 'lan',
          ipaddr: '1.1.1.1'
        }
      ],
      dhcpv4: [
        {
          id: 'lan'
        }
      ]
    })
  })
  it('invokes setlanip commit', async () => {
    const wrapper = createWrapper(StepLan, {
      computed: {
        ...StepLan.computed,
        interfaceSection: () => ({ id: 'lan', ipaddr: '1.1.1.1' }),
        section: () => ({ start_ip: '1.1.1.100', end_ip: '1.1.1.249' })
      }
    })
    wrapper.vm.initialIp = '192.168.1.1'
    wrapper.vm.localIPAddress = '1.1.1.1'
    await wrapper.vm.onBeforeSave()
    expect(wrapper.vm.$store.lanIP).toEqual('1.1.1.1')
  })
  it('does not invoke setlanip commit', async () => {
    const wrapper = createWrapper(StepLan, {
      computed: {
        ...StepLan.computed,
        interfaceSection: () => ({ id: 'lan', ipaddr: '192.168.1.1' }),
        section: () => ({ start_ip: '192.168.1.100', end_ip: '192.168.1.249' }),
        isDifferentInitialIP: () => false
      }
    })
    wrapper.vm.initialIp = '192.168.1.1'
    await wrapper.vm.onBeforeSave()
    expect(wrapper.vm.$store.lanIP).not.toEqual({
      ipaddr: '192.168.1.1',
      start_ip: '192.168.1.100',
      end_ip: '192.168.1.249'
    })
  })
})
