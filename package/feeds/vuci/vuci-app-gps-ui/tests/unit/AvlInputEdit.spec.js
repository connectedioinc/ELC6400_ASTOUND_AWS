import AvlInputEdit from '../../src/views/services/AvlInputEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('AvlInputEdit.vue', () => {
  let wrapper
  const ioList = [
    { id: 'candy', type: 'gpio', direction: 'out', block_pins: [1] },
    { type: 'adc', id: 'two', io_name: 'two', name_with_pins: 'two (2)' },
    { type: 'adc', io_name: 'three', id: 'three', name_with_pins: 'three (3)' },
    { type: 'acl', io_name: 'four', id: 'four', name_with_pins: 'four (4)' }
  ]
  beforeEach(() => {
    wrapper = createWrapper(AvlInputEdit, {
      props: { section: {} },
      global: {
        provide: {
          ioList: () => {
            return ioList
          }
        }
      }
    })
  })
  it('return pin type', () => {
    wrapper.vm.section.io_name = 'candy'
    expect(wrapper.vm.inputType).toEqual('gpio')
  })
  it('check if right adc returns depending on section', () => {
    expect(wrapper.vm.adcList).toEqual(['two', 'three'])
  })
  it('check if right adc returns depending on section', () => {
    const localWrapper = createWrapper(AvlInputEdit, {
      props: { section: {} },
      global: {
        provide: {
          ioList: () => {
            return []
          }
        }
      }
    })
    expect(localWrapper.vm.adcList).toEqual([])
  })
  it('check if right acl returns depending on section', () => {
    expect(wrapper.vm.aclList).toEqual(['four'])
  })
  it('check if right acl returns depending on section', () => {
    const localWrapper = createWrapper(AvlInputEdit, {
      props: { section: {} },
      global: {
        provide: {
          ioList: () => {
            return []
          }
        }
      }
    })
    expect(localWrapper.vm.aclList).toEqual([])
  })
  it('trigger help shows correct text according to input type', () => {
    expect(wrapper.vm.triggerHelp).toEqual('Select trigger event for your own intended configuration')
    const localWrapper = createWrapper(AvlInputEdit, {
      props: { section: { io_name: 'test' } },
      global: {
        provide: {
          ioList: () => [{ id: 'test', type: 'test' }]
        }
      }
    })
    expect(localWrapper.vm.triggerHelp).toEqual('Inside range - Input voltage falls in the specified region, Outside range - Input voltage drops out of the specified region')
  })
  it('trigger options returns right options according to input type', () => {
    expect(wrapper.vm.triggerOptions).toEqual([
      ['no', wrapper.vm.$t('Input active')],
      ['nc', wrapper.vm.$t('Input low')],
      ['both', wrapper.vm.$t('Both')]
    ])
    const localWrapper = createWrapper(AvlInputEdit, {
      props: { section: { io_name: 'test' } },
      global: {
        provide: {
          ioList: () => [{ id: 'test', type: 'test' }]
        }
      }
    })
    expect(localWrapper.vm.triggerOptions).toEqual([
      ['in', wrapper.vm.$t('Inside range')],
      ['out', wrapper.vm.$t('Outside range')]
    ])
  })
  it('checks if function calling validator', () => {
    const self = { vuciSection: { validate: vi.fn() } }
    wrapper.vm.updateValidations(self)
    expect(self.vuciSection.validate).toHaveBeenCalled()
  })
  it.each([
    ['2', '1', { isValid: false, message: 'Max value should be higher than min value' }],
    ['1', '2', { isValid: true }]
  ])('checks lessThan validation', (value, bound, response) => {
    expect(wrapper.vm.validateMinMax(value, bound)).toEqual(response)
  })
  it.each([
    [{ data: { errors: [{ source: 'io_name' }] } }, 'Selected input type is set as output'],
    [{ data: { errors: [{ source: '' }] } }, 'Failed to edit configuration']
  ])('checks returned error message', (errors, response) => {
    expect(wrapper.vm.returnErrorMessage(errors)).toEqual(response)
  })
  it('checks returned io names', () => {
    expect(wrapper.vm.displayIoNames('')).toEqual([
      ['two', 'two (2)'],
      ['three', 'three (3)'],
      ['four', 'four (4)']
    ])
  })
})
