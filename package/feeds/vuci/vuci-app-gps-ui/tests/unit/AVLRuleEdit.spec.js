import AVLRuleEdit from '../../src/views/services/AVLRuleEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

const props = {
  section: {
    id: 'abbc'
  }
}
describe('AVLRuleEdit.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(AVLRuleEdit, {
      props,
      global: {
        provide: {
          filteredIOs: {},
          ioList: () => []
        }
      }
    })
  })
  it('checks if rule is the main rule or not', () => {
    expect(wrapper.vm.mainRule).toEqual(false)
  })
  it.each([
    [
      true,
      [
        ['mobile_both', 'Mobile both'],
        ['mobile_home', 'Mobile home'],
        ['mobile_roaming', 'Mobile roaming'],
        ['wired', 'Wired'],
        ['wifi', 'WiFi']
      ]
    ],
    [
      false,
      [
        ['mobile_both', 'Mobile both'],
        ['mobile_home', 'Mobile home'],
        ['mobile_roaming', 'Mobile roaming'],
        ['wired', 'Wired']
      ]
    ]
  ])('checks returned wanStatuses when device has WiFi? %s', (hasWifi, response) => {
    wrapper.vm.hasWifi = hasWifi
    expect(wrapper.vm.wanStatuses).toEqual(response)
  })

  describe('inputIoList()', () => {
    it('check GPIO', () => {
      wrapper = createWrapper(AVLRuleEdit, {
        props,
        global: {
          provide: {
            filteredIOs: {},
            ioList: () => [
              { id: 'dio0', type: 'gpio', direction: 'in' },
              { id: 'dio1', type: 'gpio', direction: 'out' }
            ]
          }
        }
      })
      expect(wrapper.vm.inputIoList()).toEqual([{ id: 'dio0', type: 'gpio', direction: 'in' }])
    })
    it('check ACL', () => {
      const wrapper = createWrapper(AVLRuleEdit, {
        props,
        global: {
          provide: {
            filteredIOs: {},
            ioList: () => [{ id: 'acl0', type: 'acl' }]
          }
        }
      })
      expect(wrapper.vm.inputIoList()).toEqual([{ id: 'acl0', type: 'acl' }])
    })
    it('check ADC', () => {
      const wrapper = createWrapper(AVLRuleEdit, {
        props,
        global: {
          provide: {
            filteredIOs: {},
            ioList: () => [{ id: 'adc0', type: 'adc' }]
          }
        }
      })
      expect(wrapper.vm.inputIoList()).toEqual([{ id: 'adc0', type: 'adc' }])
    })
    it('check mixed', () => {
      const wrapper = createWrapper(AVLRuleEdit, {
        props,
        global: {
          provide: {
            filteredIOs: {},
            ioList: () => [
              { id: 'dio0', type: 'gpio', direction: 'in' },
              { id: 'dio1', type: 'gpio', direction: 'out' },
              { id: 'acl0', type: 'acl' },
              { id: 'adc0', type: 'adc' }
            ]
          }
        }
      })
      expect(wrapper.vm.inputIoList()).toEqual([
        { id: 'dio0', type: 'gpio', direction: 'in' },
        { id: 'acl0', type: 'acl' },
        { id: 'adc0', type: 'adc' }
      ])
    })
  })

  it('ioTypes()', () => {
    const wrapper = createWrapper(AVLRuleEdit, {
      props,
      global: {
        provide: {
          filteredIOs: {},
          ioList: () => [
            { id: 'dio0', type: 'gpio', direction: 'in' },
            { id: 'dio1', type: 'gpio', direction: 'out' },
            { id: 'acl0', type: 'acl' },
            { id: 'adc0', type: 'adc' }
          ]
        }
      }
    })
    const result = wrapper.vm.ioTypes.map(row => row[0])
    expect(result).toEqual(['gpio', 'adc', 'acl'])
  })
})
