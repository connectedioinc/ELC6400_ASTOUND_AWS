import EventsJugglerLog from '../../src/components/services/modules/events/EventsJugglerLog.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('EventsJugglerLog.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(EventsJugglerLog)
    vi.mock('@/plugins/events-options', () => ({
      events: {
        getTranslatedTypes: vi.fn().mockReturnValue(['typeOptions']),
        getTranslatedSubtypes: vi.fn().mockReturnValue(['getTranslatedSubtypes'])
      }
    }))
  })
  afterEach(() => {
    wrapper.unmount()
  })

  it('typeOptions calls getTranslatedTypes', () => {
    expect(wrapper.vm.typeOptions).toEqual(['typeOptions'])
  })

  it('subTypeOptions calls getTranslatedSubtypes', () => {
    expect(wrapper.vm.subTypeOptions).toEqual(['getTranslatedSubtypes'])
  })
})
