import EventsJugglerEventSection from '../../src/components/services/base-sections/EventsJugglerEventSection.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('EventsJugglerEventSection.vue', () => {
  let wrapper
  vi.mock('../../src/components/services/useEventsJugglerData', () => ({
    useEventsJugglerData: () => {
      return {
        getTranslatedFilterValues: vi.fn(val => (val?.name == 'warning_test' ? [] : [['', 'message']])),
        getFilterOptions: vi.fn(val => val)
      }
    }
  }))
  beforeEach(() => {
    wrapper = createWrapper(EventsJugglerEventSection)
  })
  afterEach(() => {
    wrapper.unmount
    vi.clearAllMocks()
  })

  it('returns filterOptions', async () => {
    await wrapper.setProps({ section: 'section' })
    expect(wrapper.vm.filterOptions).toEqual([['', 'message']])
  })

  it('returns incorrectOptionExists', async () => {
    expect(wrapper.vm.incorrectOptionExists).toEqual(false)
    await wrapper.setProps({ section: { available_conditions: [1, 2], plugin: 'io' }, uciData: { conditions: [{ plugin: 'io', id: 1 }] } })
    expect(wrapper.vm.incorrectOptionExists).toEqual(false)
    await wrapper.setProps({ uciData: { conditions: [{ plugin: 'filter', id: 1, filter_name: 'filter.name' }] } })
    expect(wrapper.vm.incorrectOptionExists).toEqual(true)
  })

  it('getFilterPluginWarnings returns warnings', async () => {
    expect(wrapper.vm.getFilterPluginWarnings()).toEqual(undefined)
    await wrapper.setProps({ section: { name: 'warning_test', available_conditions: [1, 2], plugin: 'io' }, uciData: { conditions: [{ plugin: 'filter', id: 1, filter_name: 'filter.name' }] } })
    expect(wrapper.vm.getFilterPluginWarnings()).toEqual('This event type cannot have filter conditions. Please remove the current filter conditions to enable changing the event type.')
    await wrapper.setProps({ section: { available_conditions: [1, 2], plugin: 'io' }, uciData: { conditions: [{ plugin: 'filter', id: 1, filter_name: 'filter.name' }] } })
    expect(wrapper.vm.getFilterPluginWarnings()).toEqual(
      'This event type can only have the following filter condition field name parameter: message. Please remove the current filter conditions to enable changing the event type.'
    )
  })

  it('setModuleBeforeSave sets value', () => {
    wrapper.vm.setModuleBeforeSave({ value: 'value' })
    expect(wrapper.vm.moduleComponentData).toEqual('value')
  })

  it('handleBeforeSave returns correct value', async () => {
    expect(wrapper.vm.handleBeforeSave()).resolves.toEqual(true)
    await wrapper.setProps({ section: { available_conditions: [1, 2], plugin: 'io' }, uciData: { conditions: [{ plugin: 'filter', id: 1, filter_name: 'filter.name' }] } })
    expect(wrapper.vm.handleBeforeSave()).rejects.toEqual('Please remove the current filter conditions to enable changing the event type.')
    await wrapper.setProps({ uciData: { conditions: [{ plugin: 'io' }] } })
    expect(wrapper.vm.handleBeforeSave()).resolves.toEqual(true)
  })
})
