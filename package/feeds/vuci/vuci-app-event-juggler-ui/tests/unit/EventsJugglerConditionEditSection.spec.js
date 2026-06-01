import EventsJugglerConditionEditSection from '../../src/components/services/edit-sections/EventsJugglerConditionEditSection.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('EventsJugglerConditionEditSection.vue', () => {
  let wrapper
  let mock_vals = vi.hoisted(() => {
    return {
      event_section: {}
    }
  })
  vi.mock('../../src/components/services/useEventsJugglerData', () => ({
    useEventsJugglerData: () => {
      return {
        getTranslatedModuleType: vi.fn(val => val),
        updateUciData: vi.fn((uciData, y, func) => func(mock_vals.event_section, [])),
        updateInitialForm: vi.fn(val => val)
      }
    }
  }))
  beforeEach(() => {
    wrapper = createWrapper(EventsJugglerConditionEditSection, {
      props: {
        section: { id: 1 },
        isStepEditSection: false
      }
    })
    mock_vals.event_section = {}
  })
  afterEach(() => {
    wrapper.unmount()
    vi.clearAllMocks()
  })

  it('rowActions returns actions if isStepEditSection', async () => {
    expect(wrapper.vm.rowActions()).toEqual(undefined)
    await wrapper.setProps({ isStepEditSection: true })
    const rowActions = wrapper.vm.rowActions()
    expect(rowActions[0]).toHaveProperty('id')
    expect(rowActions[0]).toHaveProperty('callback')
    expect(rowActions).toContain('delete')
  })

  it('handleAfterAdd emits', () => {
    wrapper.vm.handleAfterAdd('', { uciData: {}, newSection: { id: 1 } })
    expect(wrapper.emitted()).toHaveProperty('open-condition')
    expect(wrapper.vm.updateInitialForm).toHaveBeenCalledOnce()
  })

  it('handleAfterAdd executes updateUciData property function', () => {
    mock_vals.event_section = {}
    wrapper.vm.handleAfterAdd('', { uciData: {}, newSection: { id: 1 } })
    expect(mock_vals.event_section).toEqual({ available_conditions: [1] })
    wrapper.vm.handleAfterAdd('', { uciData: {}, newSection: { id: 2 } })
    expect(mock_vals.event_section).toEqual({ available_conditions: [1, 2] })
  })

  it('handleAfterDelete executes updateUciData property function', () => {
    mock_vals.event_section = { available_conditions: [1, 2], actions: [3] }
    let uciData = { actions: [{ id: 3, conditions: [1, 2] }] }
    wrapper.vm.handleAfterDelete({ id: 1 }, uciData)
    expect(mock_vals.event_section.available_conditions).toEqual([2])
    expect(uciData).toEqual({ actions: [{ id: 3, conditions: [2] }] })
    expect(wrapper.vm.updateInitialForm).toHaveBeenCalledOnce()
  })
})
