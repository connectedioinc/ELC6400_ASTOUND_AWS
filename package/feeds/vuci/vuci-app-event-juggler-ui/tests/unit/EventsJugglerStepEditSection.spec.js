import { flushPromises } from '@vue/test-utils'
import EventsJugglerStepEditSection from '../../src/components/services/edit-sections/EventsJugglerStepEditSection.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('EventsJugglerStepEditSection.vue', () => {
  let wrapper
  let mock_vals = vi.hoisted(() => {
    return {
      event_section: {}
    }
  })
  vi.mock('../../src/components/services/useEventsJugglerData', () => ({
    useEventsJugglerData: () => {
      return {
        updateUciData: vi.fn((_, __, func) => func(mock_vals.event_section)),
        updateInitialForm: vi.fn()
      }
    }
  }))
  beforeEach(() => {
    mock_vals.event_section = {}
    wrapper = createWrapper(EventsJugglerStepEditSection, {
      props: { section: { id: '1' } }
    })
  })
  afterEach(() => {
    wrapper.unmount()
  })

  it('setCardRefData adds/deletes card ref', () => {
    wrapper.vm.setCardRefData({}, '1')
    expect(wrapper.vm.tltCardRefs).toEqual({ 1: {} })
    wrapper.vm.setCardRefData(null, '1')
    expect(wrapper.vm.tltCardRefs).toEqual({})
  })

  it('setCardShrinkedState card ref does not exist', () => {
    wrapper.vm.setCardShrinkedState('1', [])
    expect(wrapper.vm.tltCardRefs).toEqual({})
  })

  it('setCardShrinkedState sets expanded if last section', () => {
    wrapper.vm.setCardRefData({}, '1')
    wrapper.vm.setCardShrinkedState('1', ['1'])
    expect(wrapper.vm.tltCardRefs).toEqual({ 1: { expanded: true } })
  })

  it('setCardShrinkedState executes after card ref change', async () => {
    await wrapper.setProps({ section: { id: 1, actions: ['1'] } })
    wrapper.vm.setCardRefData({}, '1')
    await flushPromises()
    expect(wrapper.vm.tltCardRefs).toEqual({ 1: { expanded: true } })
  })

  it('isLastSection checks if last section', () => {
    expect(wrapper.vm.isLastSection('1', ['1', '2'])).toEqual(false)
    expect(wrapper.vm.isLastSection('2', ['1', '2'])).toEqual(true)
  })

  it('handleActionAdd on successful validation call addSection', async () => {
    await wrapper.setProps({ formRef: { validate: () => new Promise(resolve => resolve(true)) } })
    const func = vi.fn()
    wrapper.vm.typeSectionRef = { _addSection: () => func() }
    await flushPromises()
    await wrapper.vm.handleActionAdd()
    expect(func).toHaveBeenCalled()
  })

  it('handleActionAdd on unsuccessful validation display error message', async () => {
    await wrapper.setProps({ formRef: { validate: () => new Promise(resolve => resolve(false)) } })
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.handleActionAdd()
    expect(spy).toHaveBeenCalledWith('Some fields are invalid')
  })

  it('handleAfterAdd adds id to actions', () => {
    mock_vals.event_section = { actions: [] }
    wrapper.vm.handleAfterAdd('', { uciData: { actions: [] }, newSection: { id: '1' } })
    expect(mock_vals.event_section.actions).toEqual(['1'])
    expect(wrapper.vm.updateInitialForm).toHaveBeenCalled()
  })

  it('handleAfterDelete removes id from actions', () => {
    mock_vals.event_section = { actions: ['1'] }
    wrapper.vm.handleAfterDelete({ id: '1' }, { actions: [] })
    expect(mock_vals.event_section.actions).toEqual([])
    expect(wrapper.vm.updateInitialForm).toHaveBeenCalled()
  })
})
