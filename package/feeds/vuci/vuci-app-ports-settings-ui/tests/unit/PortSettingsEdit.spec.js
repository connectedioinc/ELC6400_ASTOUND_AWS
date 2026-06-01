import PortSettingsEdit from '../../src/views/network/PortSettingsEdit.vue'
import createWrapper from '@tests/unit/mockFactory'
import * as helper from '@ui-core/plugins/helper'

describe('PortSettingsEdit.vue', () => {
  let wrapper
  let wrapperOptions
  beforeEach(() => {
    wrapperOptions = {
      props: {
        modelValue: [],
        selectedPorts: [],
        boardPorts: [{ ports: [] }],
        portStatus: []
      }
    }
    wrapper = createWrapper(PortSettingsEdit, wrapperOptions)
  })
  it.each`
    boardPorts                                                                | selectedPorts         | expectedResult
    ${[{ name: '_lan1', custom: 'LAN1' }, { name: '_lan2', custom: 'LAN2' }]} | ${['_lan1', '_lan2']} | ${['LAN1', 'LAN2']}
    ${[{ name: '_lan1' }, { name: '_lan2' }]}                                 | ${['_lan1', '_lan2']} | ${['_lan1', '_lan2']}
  `('returns prettified board ports #%#', async ({ boardPorts, selectedPorts, expectedResult }) => {
    await wrapper.setProps({ boardPorts, selectedPorts })
    expect(wrapper.vm.readablePorts).toEqual(expectedResult)
  })

  it.each`
    dsa      | expectedResult
    ${false} | ${['enabled', 'autoneg', 'advert', 'duplex', 'speed', 'poe_enable']}
    ${true}  | ${['enabled', 'autoneg', 'advert', 'duplex', 'speed', 'poe_enable', 'mtu']}
  `('returns config settings $expectedResult when dsa is $dsa #%#', async ({ dsa, expectedResult }) => {
    wrapper = createWrapper(PortSettingsEdit, {
      ...wrapperOptions,
      computed: {
        ...PortSettingsEdit.computed,
        dsa: () => dsa
      }
    })
    expect(wrapper.vm.configSettings).toEqual(expectedResult)
  })

  it.each`
    selectedPorts         | expectedResult
    ${['_lan1']}          | ${true}
    ${['_lan1', '_lan2']} | ${true}
    ${['_lan3']}          | ${false}
  `('checks whether there are any PoE ports #%#', async ({ selectedPorts, expectedResult }) => {
    wrapper.vm.$store.isPoe = name => ['_lan1', '_lan2'].includes(name)
    await wrapper.setProps({ selectedPorts })
    expect(wrapper.vm.isAnyPoe).toEqual(expectedResult)
  })

  it.each`
    selectedPorts         | expectedResult
    ${['_lan1', '_lan2']} | ${false}
    ${['_lan2', '_lan3']} | ${true}
    ${['_lan3', '_lan4']} | ${true}
  `('checks whether there are no PoE ports #%#', async ({ selectedPorts, expectedResult }) => {
    wrapper.vm.$store.isPoe = name => ['_lan1', '_lan2'].includes(name)
    await wrapper.setProps({ selectedPorts })
    expect(wrapper.vm.isAnyNoPoe).toEqual(expectedResult)
  })

  it.each`
    selectedPorts         | expectedResult
    ${['_lan1']}          | ${true}
    ${['_lan1', '_lan2']} | ${true}
    ${['_lan3']}          | ${false}
  `('checks whether there are any forced autoneg ports #%#', async ({ selectedPorts, expectedResult }) => {
    const portStatus = [
      { id: '_lan1', force_autoneg: true },
      { id: '_lan2', force_autoneg: true }
    ]
    await wrapper.setProps({ selectedPorts, portStatus })
    expect(wrapper.vm.isAnyForcedAutoneg).toEqual(expectedResult)
  })

  it.each`
    selectedPorts         | expectedResult
    ${['_lan1', '_lan2']} | ${false}
    ${['_lan2', '_lan3']} | ${true}
    ${['_lan3', '_lan4']} | ${true}
  `('checks whether there are no forced autoneg ports #%#', async ({ selectedPorts, expectedResult }) => {
    const portStatus = [
      { id: '_lan1', force_autoneg: true },
      { id: '_lan2', force_autoneg: true }
    ]
    await wrapper.setProps({ selectedPorts, portStatus })
    expect(wrapper.vm.isAnyNoForcedAutoneg).toEqual(expectedResult)
  })

  it.each`
    selectedPorts                  | modelValue                                                                                           | expectedResult
    ${['_lan1', '_lan2', '_lan3']} | ${[{ id: '_lan1', autoneg: 'on' }, { id: '_lan2', autoneg: 'on' }, { id: '_lan3', autoneg: 'on' }]}  | ${false}
    ${['_lan1', '_lan2', '_lan3']} | ${[{ id: '_lan1', autoneg: 'off' }, { id: '_lan2', autoneg: 'on' }, { id: '_lan3', autoneg: 'on' }]} | ${true}
    ${['_lan1']}                   | ${[{ id: '_lan1', autoneg: 'off' }, { id: '_lan2', autoneg: 'on' }, { id: '_lan3', autoneg: 'on' }]} | ${false}
    ${['_lan2', '_lan3']}          | ${[{ id: '_lan1', autoneg: 'on' }, { id: '_lan2', autoneg: 'off' }, { id: '_lan3', autoneg: 'on' }]} | ${false}
  `('checks whether there is an autoneg mismatch between ports #%#', async ({ selectedPorts, modelValue, expectedResult }) => {
    const portStatus = [{ id: '_lan1', force_autoneg: true }]
    await wrapper.setProps({ selectedPorts, modelValue, portStatus })
    expect(wrapper.vm.autonegMismatch).toEqual(expectedResult)
  })

  describe('save()', () => {
    const modelValue = [
      { id: '_lan1', enabled: '1', speed: '100', autoneg: 'off' },
      { id: '_lan2', enabled: '0', speed: '1000', autoneg: 'off' },
      { id: '_lan3', enabled: '0', speed: '1000', autoneg: 'off' }
    ]
    const data = [
      { id: '_lan1', enabled: '0', duplex: 'full', advert: ['10mh', '100mh', '100mf'], autoneg: 'on' },
      { id: '_lan3', enabled: '0', duplex: 'full', advert: ['10mh', '100mh', '100mf'], autoneg: 'on' }
    ]
    it('saves data', async () => {
      await wrapper.setProps({
        selectedPorts: ['_lan1', '_lan3'],
        boardPorts: [{ ports: [] }],
        modelValue
      })
      await wrapper.setData({
        showModal: true,
        form: {
          enabled: '0',
          autoneg: 'on',
          duplex: 'full',
          advert: ['10mh', '100mh', '100mf']
        }
      })
      wrapper.vm.$refs.form.validate = () => ({ valid: true })
      const spyAxios = vi.spyOn(wrapper.vm.$axios, 'put').mockResolvedValue({ data })
      vi.spyOn(helper, 'checkNetwork').mockImplementation(() => Promise.resolve())
      await wrapper.vm.save()
      expect(spyAxios).toHaveBeenCalled()
      expect(wrapper.emitted()['update:modelValue'][0]).toEqual([
        [
          { id: '_lan1', enabled: '0', duplex: 'full', advert: ['10mh', '100mh', '100mf'], autoneg: 'on' },
          { id: '_lan2', enabled: '0', speed: '1000', autoneg: 'off' },
          { id: '_lan3', enabled: '0', duplex: 'full', advert: ['10mh', '100mh', '100mf'], autoneg: 'on' }
        ]
      ])
    })
    it('Fails to save', async () => {
      await wrapper.setProps({
        selectedPorts: ['_lan1', '_lan3'],
        boardPorts: [{ ports: [] }],
        modelValue
      })
      await wrapper.setData({
        showModal: true,
        form: {
          enabled: '0',
          autoneg: 'on',
          duplex: 'full',
          advert: '',
          speed: '100'
        }
      })
      wrapper.vm.$refs.form.validate = () => ({ valid: true })
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      vi.spyOn(wrapper.vm.$axios, 'put').mockRejectedValue()
      await wrapper.vm.save()
      expect(spy).toBeCalledWith('Failed to edit configuration')
    })
  })

  it('calls prompt', () => {
    const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
    wrapper.vm.back()
    expect(spy).toBeCalled()
  })

  it.each`
    port       | portStatus                                                                                     | expectedResult
    ${'_lan1'} | ${[{ id: '_lan1', link_supported: ['10mh', '100mh', '100mf', '1000mh', '1000mf'] }]}           | ${['10mh', '100mh', '100mf', '1000mh', '1000mf']}
    ${'_lan2'} | ${[{ id: '_lan2', link_supported: ['10mh', '100mh', '100mf', '1000mh', '1000mf', '2500mf'] }]} | ${['10mh', '100mh', '100mf', '1000mh', '1000mf', '2500mf']}
    ${'_lan3'} | ${[{ id: '_lan3', link_supported: ['100mf', '1000mh', '1000mf', '2500mf'] }]}                  | ${['100mf', '1000mh', '1000mf', '2500mf']}
  `('check supported on port speeds #%#', async ({ port, portStatus, expectedResult }) => {
    await wrapper.setProps({ portStatus })
    expect(wrapper.vm.getSupportedSpeeds(port)).toEqual(expectedResult)
  })

  it.each`
    advert                       | selectedPorts        | expectedResult
    ${['2500mf']}                | ${['_lan1']}         | ${{ isValid: false, message: 'Selected port(s) "LAN1" are not compatible with the selected advertisement(s). Please adjust your selection.' }}
    ${['10mh', '10mf', '100mh']} | ${['_lan4', '_wan']} | ${{ isValid: false, message: 'Selected port(s) "WAN" are not compatible with the selected advertisement(s). Please adjust your selection.' }}
    ${['2500mf']}                | ${['_lan4']}         | ${{ isValid: true, message: 'Selected port(s) "" are not compatible with the selected advertisement(s). Please adjust your selection.' }}
    ${['1000mf', '2500mf']}      | ${['_lan1']}         | ${{ isValid: true, message: 'Selected port(s) "" are not compatible with the selected advertisement(s). Please adjust your selection.' }}
  `('validate advert #%#', async ({ advert, selectedPorts, expectedResult }) => {
    const wrapper = createWrapper(PortSettingsEdit, {
      ...wrapperOptions,
      props: {
        selectedPorts,
        portStatus: [
          { id: '_lan1', link_supported: ['10mh', '100mh', '100mf', '1000mh', '1000mf'] },
          { id: '_lan4', link_supported: ['10mh', '100mh', '100mf', '1000mh', '1000mf', '2500mf'] },
          { id: '_wan', link_supported: ['100mf', '1000mh', '1000mf', '2500mf'] }
        ],
        boardPorts: [
          { name: '_lan1', custom: 'LAN1' },
          { name: '_lan2', custom: 'LAN2' },
          { name: '_lan3', custom: 'LAN3' },
          { name: '_lan4', custom: 'LAN4' },
          { name: '_wan', custom: 'WAN' }
        ]
      }
    })

    expect(wrapper.vm.checkAdvert(advert)).toEqual(expectedResult)
  })
})
