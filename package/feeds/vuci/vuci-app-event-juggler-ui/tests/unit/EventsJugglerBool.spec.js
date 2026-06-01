import EventsJugglerBool from '../../src/components/services/modules/conditions/EventsJugglerBool.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('EventsJugglerBool.vue', () => {
  let wrapper
  vi.mock('../../src/components/services/useEventsJugglerData', () => ({
    useEventsJugglerData: () => {
      return {
        getConditionOptions: vi.fn().mockReturnValue([['1'], ['2']])
      }
    }
  }))
  beforeEach(() => {
    wrapper = createWrapper(EventsJugglerBool, {
      props: { s: { id: '1' } }
    })
  })
  afterEach(() => {
    wrapper.unmount()
  })
  it('conditionsOptions filters out current condition', () => {
    expect(wrapper.vm.conditionsOptions).toEqual([['2']])
  })
  it('validateConditionList validates', () => {
    expect(wrapper.vm.validateConditionList(['1'])).toEqual({ isValid: false, message: 'At least two or more conditions should be selected.' })
    expect(wrapper.vm.validateConditionList(['1', '2'])).toEqual({ isValid: true, message: 'At least two or more conditions should be selected.' })
  })
})
