import createWrapper from '@tests/unit/mockFactory'
import PortMirroring from '../../src/views/network/PortMirroring.vue'

describe('PortMirroring.vue', () => {
  it.each([
    [{ ports: [{ index: '1', num: '1', role: 'lan' }] }, [['1', 'LAN1']]],
    [{ ports: [{ num: '1', role: 'lan' }] }, [['1', 'LAN1']]],
    [{}, []]
  ])('returns lan port options', (ports, result) => {
    const wrapper = createWrapper(PortMirroring)
    wrapper.vm.$store.board.switch.switch0 = ports
    expect(wrapper.vm.lanPorts).toEqual(result)
  })
  it('returns monitoring ports', () => {
    const wrapper = createWrapper(PortMirroring, {
      computed: { ...PortMirroring.computed, lanPorts: () => [['1', 'LAN1']] }
    })
    expect(wrapper.vm.monitoringPorts).toEqual([
      ['disabled', 'Disabled'],
      ['1', 'LAN1']
    ])
  })
  it('returns source ports', () => {
    const wrapper = createWrapper(PortMirroring, {
      data: () => ({ formData: { switch: [{ id: 'general', mirror_monitor_port: '1' }] } }),
      computed: { ...PortMirroring.computed, lanPorts: () => [['1', 'LAN1']] }
    })
    expect(wrapper.vm.sourcePorts).toEqual([])
  })
})
