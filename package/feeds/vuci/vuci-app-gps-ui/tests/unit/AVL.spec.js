import AVL from '../../src/views/services/AVL'
import createWrapper from '@tests/unit/mockFactory'

const gpioTavlRule = {
  id: 'one',
  type: 'gpio',
  enabled: '0',
  direction: 'in',
  name_with_pins: 'One (1)'
}

const aclTavlRule = {
  id: 'three',
  type: 'acl',
  enabled: '1',
  state: 'active',
  name_with_pins: 'Three (3)'
}

const adcTavlRule = {
  id: 'two',
  type: 'adc',
  enabled: '0',
  direction: 'out',
  name_with_pins: 'Two (2)'
}

const ioResponse = [gpioTavlRule, adcTavlRule, aclTavlRule]

const stubs = {
  'tlt-horizontal-card': { template: '<div />' }
}

describe('AVL.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(AVL, { global: { stubs } })
  })

  it('checks if filtered Io values are returned', () => {
    wrapper.setData({ ioInfo: ioResponse })
    expect(wrapper.vm.filteredIOs).toEqual([['one', 'One (1)']])
  })
  it('checks if filtered Io names are returned', () => {
    wrapper.setData({ ioInfo: ioResponse })
    expect(wrapper.vm.ioNames).toEqual([
      ['one', 'One (1)'],
      ['two', 'Two (2)'],
      ['three', 'Three (3)']
    ])
  })
  it('checks that tavl name displays correctly', () => {
    wrapper.vm.$capitalize = () => 'Wrong'
    wrapper.setData({ ioInfo: [{ id: 'test', name_with_pins: 'TESTING' }] })
    expect(wrapper.vm.displayTavlName('test')).toEqual('TESTING')
    expect(wrapper.vm.displayTavlName('wrong')).toEqual('Wrong')
  })
  it('checks that tavl type displays correctly', () => {
    expect(wrapper.vm.displayTavlType('value')).toEqual('VALUE')
  })
  it('checks that priority is displayed correctly', () => {
    wrapper.setData({
      rulePriorities: {
        low: wrapper.vm.$t('Low')
      }
    })
    expect(wrapper.vm.displayPriority('value')).toEqual('N/A')
    expect(wrapper.vm.displayPriority('low')).toEqual('Low')
  })
  it('checks that wan is displayed correctly', () => {
    expect(wrapper.vm.displayWan('mobile_roaming')).toEqual('Mobile')
    expect(wrapper.vm.displayWan('wired_roaming')).toEqual('Wired')
    expect(wrapper.vm.displayWan('wifi_roaming')).toEqual('WiFi')
    expect(wrapper.vm.displayWan('rubbishValue')).toEqual('N/A')
    expect(wrapper.vm.displayWan()).toEqual('N/A')
  })
  it('checks that type is displayed correctly', () => {
    expect(wrapper.vm.displayType('MObile_home')).toEqual('Home')
    expect(wrapper.vm.displayType('MObile_roaming')).toEqual('Roaming')
    expect(wrapper.vm.displayType('MObile_both')).toEqual('Both')
    expect(wrapper.vm.displayType('MrubbishVa')).toEqual('N/A')
  })
  it('checks that input is displayed correctly', () => {
    wrapper.setData({
      inputs: {
        one: 'OneInput'
      }
    })
    expect(wrapper.vm.displayInput('one')).toEqual('OneInput')
    expect(wrapper.vm.displayInput('wrong')).toEqual('-')
  })
  it.each([
    [
      true,
      [
        ['mobile_home', 'Mobile home'],
        ['mobile_roaming', 'Mobile roaming'],
        ['mobile_both', 'Mobile both'],
        ['wired', 'Wired'],
        ['wifi', 'WiFi']
      ]
    ],
    [
      false,
      [
        ['mobile_home', 'Mobile home'],
        ['mobile_roaming', 'Mobile roaming'],
        ['mobile_both', 'Mobile both'],
        ['wired', 'Wired']
      ]
    ]
  ])('returns wan options', (haswifi, result) => {
    wrapper.vm.hasWifi = haswifi
    expect(wrapper.vm.addWans).toEqual(result)
  })
  it('skips api call', async () => {
    wrapper.vm.$store.board.hwinfo.ios = false
    const spy = vi.spyOn(wrapper.vm.$axios, 'get')
    expect(spy).toHaveBeenCalledTimes(0)
  })
  it('returns all pins information', async () => {
    wrapper.vm.$store.board.hwinfo.ios = true
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce(ioResponse)
    wrapper.vm.$io.getFilteredPinsInfo = vi.fn().mockReturnValueOnce([
      ['one', 'One (1)'],
      ['two', 'Two (2)']
    ])
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.ioInfo).toEqual([
      ['one', 'One (1)'],
      ['two', 'Two (2)']
    ])
  })
  it('displays error message when request fails', async () => {
    wrapper.vm.$store.board.hwinfo.ios = true
    wrapper.vm.$axios.get = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('Failed to load I/O data')
  })
  it.each([
    { value: ['test', 'test'], result: 'test;test' },
    { value: [], result: '' }
  ])('checks if value is saved correctly', ({ value, result }) => {
    expect(wrapper.vm.saveHosts(value)).toEqual(result)
  })
  describe('isTavlReadonly()', () => {
    it('check if adc is readonly', async () => {
      const readonly = wrapper.vm.isTavlReadonly(ioResponse, adcTavlRule)
      expect(readonly).toEqual(true)
    })
    it('check if adc is NOT readonly', async () => {
      aclTavlRule.status = 'inactive'
      const readonly = wrapper.vm.isTavlReadonly(ioResponse, adcTavlRule)
      expect(readonly).toEqual(true)
    })
  })

  it('validates host_info field duplicate values', async () => {
    wrapper.vm.formData = {
      avl: [{ host_info: ['1.1.1.1,15,tcp', '1.1.1.1,15,tcp'] }]
    }
    await expect(wrapper.vm.beforeSave()).rejects.toEqual('Duplicate host information is not allowed')
  })
  it('validates host_info field duplicate values', async () => {
    wrapper.vm.formData = {
      avl: [{ host_info: ['1.1.1.1,115,tcp', '1.1.1.1,15,tcp'] }]
    }
    await expect(wrapper.vm.beforeSave()).resolves.toEqual(undefined)
  })
})
