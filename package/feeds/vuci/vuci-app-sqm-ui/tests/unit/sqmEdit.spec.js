import SqmEdit from '../../src/views/services/SqmEdit.vue'
import createWrapper, { combineDeep } from '@tests/unit/mockFactory'
import { FormOptionKey } from '../../src/views/services/SqmCommon'
import { ref } from 'vue'
describe('SqmEdit.vue', () => {
  const wrapperOptions = {
    props: { section: { id: 'test' } },
    global: {
      provide: {
        [FormOptionKey]: {
          fqCodel: ref(['fq_codel']),
          cake: ref(['cake'])
        }
      }
    }
  }
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(SqmEdit, wrapperOptions)
  })
  it.each([
    {
      fqCodel: [],
      cake: [],
      result: [
        ['fq_codel', 'fq_codel', false],
        ['cake', 'cake', false]
      ]
    },
    {
      fqCodel: ['1'],
      cake: [],
      result: [
        ['fq_codel', 'fq_codel', true],
        ['cake', 'cake', false]
      ]
    },
    {
      fqCodel: ['1'],
      cake: ['1'],
      result: [
        ['fq_codel', 'fq_codel', true],
        ['cake', 'cake', true]
      ]
    }
  ])('load qdiscsOptions list #%#', ({ fqCodel, cake, result }) => {
    wrapper = createWrapper(
      SqmEdit,
      combineDeep(wrapperOptions, {
        global: {
          provide: {
            [FormOptionKey]: {
              fqCodel: ref(fqCodel),
              cake: ref(cake)
            }
          }
        }
      })
    )
    const options = wrapper.vm.qdiscsOptions
    expect(options).toEqual(result)
  })
  it.each([
    { qdisc: '', result: [] },
    { qdisc: 'cake', result: ['cake'] },
    { qdisc: 'fq_codel', result: ['fq_codel'] }
  ])('load scriptOptions list #%#', async ({ qdisc, result }) => {
    wrapper = createWrapper(
      SqmEdit,
      combineDeep(wrapperOptions, {
        props: { section: { qdisc } }
      })
    )
    const options = await wrapper.vm.scriptOptions
    expect(options).toEqual(result)
  })
  it.each`
    dsa      | result
    ${true}  | ${[['br-lan', 'br-lan (lan)'], ['wlan1', 'wlan1 (rut_1234)'], ['qmimux0', 'qmimux0 (mob1s1a1)'], ['testFilterOut.1', 'testFilterOut.1'], ['lan3', 'lan3']]}
    ${false} | ${[['br-lan', 'br-lan (lan)'], ['wlan1', 'wlan1 (rut_1234)'], ['qmimux0', 'qmimux0 (mob1s1a1)'], ['eth1', 'eth1 (wan)'], ['testFilterOut.1', 'testFilterOut.1'], ['lan3', 'lan3']]}
  `('load interfaceOptions list', async ({ dsa, result }) => {
    wrapper = createWrapper(
      SqmEdit,
      combineDeep(wrapperOptions, {
        global: {
          provide: {
            [FormOptionKey]: {
              interfacesConfig: ref([
                { id: 'wan', enabled: '1' },
                { id: 'mob1s1a1', enabled: '1' },
                { id: 'lan', enabled: '1' },
                { id: 'test4', enabled: '1' },
                { id: 'test5', enabled: '0' }
              ]),
              interfaceStatus: ref([
                { device: 'eth1', id: 'wan' },
                { device: 'lo', id: 'test2' },
                { device: 'qmimux0', id: 'mob1s1a1' },
                { device: 'br-lan', id: 'lan' },
                { device: 'test', id: 'test4' },
                { device: 'testFilterOut', id: 'testFilterOut' },
                { device: 'eth1', id: 'test5' }
              ]),
              wirelessData: ref([{ ssid: 'rut_1234', devices: [{ ifname: 'wlan1' }] }]),
              deviceData: ref([
                { type: 'bridge', name: 'testFilterOut', virtual: true },
                { type: 'bridge', name: 'br-lan', 'bridge-members': ['lan1', 'lan2'], virtual: true },
                { type: 'Network device', name: 'wlan1', virtual: false },
                { type: 'Network device', name: 'qmimux0', virtual: true },
                { type: 'DSA CPU', name: 'eth1', virtual: false },
                { type: 'VLAN', name: 'testFilterOut.1' },
                { type: 'ethernet', name: 'lan1' },
                { type: 'ethernet', name: 'lan2' },
                { type: 'ethernet', name: 'lan3' }
              ])
            }
          }
        }
      })
    )
    wrapper.vm.$store.board.hwinfo.dsa = dsa
    wrapper.vm.$store.allPortDevices = ['lan1', 'lan2']
    const options = await wrapper.vm.interfaceOptions
    expect(options).toEqual(result)
  })
})
