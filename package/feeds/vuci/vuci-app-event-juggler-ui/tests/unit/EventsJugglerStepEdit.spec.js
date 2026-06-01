import EventsJugglerStepEdit from '../../src/views/services/EventsJugglerStepEdit.vue'
import createWrapper from '@ui-core/tests/unit/mockFactory'
import { flushPromises } from '@vue/test-utils'

describe('EventsJugglerStepEdit.vue', () => {
  let wrapper
  vi.mock('vue-router', async importActual => {
    const actual = await importActual()
    return {
      ...actual,
      useRoute: vi.fn(() => ({ path: 'test' }))
    }
  })
  vi.mock('../../src/components/services/useEventsJugglerData', () => ({
    useEventsJugglerData: () => {
      return {
        updateInitialForm: vi.fn()
      }
    }
  }))

  beforeEach(() => {
    wrapper = createWrapper(EventsJugglerStepEdit, {
      props: {
        uciData: { conditions: [{ id: '1', name: 'test' }] },
        section: 'parentSection'
      },
      global: {
        stubs: {
          'vuci-form': { template: '</div>' }
        }
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getBackButtonText returns button text', () => {
    it.each([
      { step: 'actions-conditions', expected: 'event configuration' },
      { step: 'conditions', expected: 'action configuration' }
    ])('$step', ({ step, expected }) => {
      expect(wrapper.vm.getBackButtonText(step)).toBe('Back: %s'.format(expected))
    })
  })

  describe('getNextButtonText returns button text', () => {
    it.each([
      { step: 'events', expected: 'Next: action configuration' },
      { step: 'actions-conditions', expected: 'Finish' },
      { step: 'conditions', expected: 'Save & Apply' }
    ])('$step', ({ step, expected }) => {
      expect(wrapper.vm.getNextButtonText(step)).toBe(expected)
    })
  })

  it('setEventModuleSection sets value', () => {
    wrapper.vm.setEventModuleSection('test')
    expect(wrapper.vm.eventModuleSectionRef).toEqual('test')
  })

  it('setConditionModuleSection sets value', () => {
    wrapper.vm.setConditionModuleSection('test')
    expect(wrapper.vm.conditionModuleSectionRef).toEqual('test')
  })

  it('setEventBeforeSave sets value', () => {
    wrapper.vm.setEventBeforeSave('test')
    expect(wrapper.vm.eventBeforeSaveValidation).toEqual('test')
  })

  it('handleGoBack calls callbacks', () => {
    const func = vi.fn()
    wrapper.vm.handleGoBack({ current: { value: 'actions-conditions' }, goToPrevious: func })
    expect(func).toHaveBeenCalled()
    const spy = vi.spyOn(wrapper.vm.prompt, 'show')
    wrapper.vm.handleGoBack({ current: { value: 'conditions' } })
    expect(spy).toHaveBeenCalled()
  })

  describe('validateStep calls correct validation function', () => {
    it.each([
      { step: 'events', expected: 'testEvent', setup: () => wrapper.vm.setEventModuleSection({ validate: vi.fn().mockResolvedValue('testEvent') }) },
      { step: 'conditions', expected: 'testCondition', setup: () => wrapper.vm.setConditionModuleSection({ validate: vi.fn().mockResolvedValue('testCondition') }) },
      { step: '', expected: true },
      { step: 'events', expected: false },
      { step: 'conditions', expected: false }
    ])('$step', ({ step, expected, setup = () => {} }) => {
      setup()
      expect(wrapper.vm.validateStep(step)).resolves.toEqual(expected)
    })
  })

  it('validateBeforeSave calls correct validation function', () => {
    wrapper.vm.setEventBeforeSave(vi.fn().mockReturnValue('test'))
    expect(wrapper.vm.validateBeforeSave('events')).toEqual('test')
    expect(wrapper.vm.validateBeforeSave()).resolves.toEqual(true)
  })

  it('handleGoNext on failed validation displays error', async () => {
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.handleGoNext({ current: { value: 'events' } })
    expect(spy).toHaveBeenCalledWith('Some fields are invalid')
  })

  it('handleGoNext, validateBeforeSave on success calls stepCallback', async () => {
    wrapper.vm.setEventModuleSection({ validate: vi.fn().mockResolvedValue(true), saveData: vi.fn().mockResolvedValue(true) })
    wrapper.vm.setEventBeforeSave(vi.fn().mockResolvedValue('test'))
    const func = vi.fn()
    await wrapper.vm.handleGoNext({ current: { value: 'events' }, goToNext: func })
    expect(func).toHaveBeenCalled()
  })

  it('handleGoNext, validateBeforeSave on failed validation displays error', async () => {
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    wrapper.vm.setEventModuleSection({ validate: vi.fn().mockResolvedValue(true), saveData: vi.fn().mockResolvedValue(true) })
    wrapper.vm.setEventBeforeSave(vi.fn().mockRejectedValue('test'))
    await wrapper.vm.handleGoNext({ current: { value: 'events' } })
    expect(spy).toHaveBeenCalledWith('test')
  })

  it('handleSaveSection on success calls callback', async () => {
    const callback = vi.fn()
    wrapper.vm.handleSaveSection(vi.fn().mockResolvedValue(true), 'test', callback)
    await flushPromises()
    expect(callback).toHaveBeenCalled()
  })

  it('handleSaveSection on failed save displays error', async () => {
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    wrapper.vm.handleSaveSection(vi.fn().mockRejectedValue('test'))
    await flushPromises()
    expect(spy).toHaveBeenCalledWith('test')
  })

  it('handleSaveSection displays spin message', async () => {
    const spy = vi.spyOn(wrapper.vm.store, 'spin')
    wrapper.vm.handleSaveSection(vi.fn().mockResolvedValue(true), 'test')
    expect(spy).toHaveBeenCalledWith('Waiting for the test configuration to be applied')
    await flushPromises()
    expect(spy).toHaveBeenCalledWith(false)
  })

  it('handleGoToCondition calls goToNext', () => {
    const func = vi.fn()
    wrapper.vm.handleGoToCondition({ goToNext: func })
    expect(func).toHaveBeenCalled()
  })

  it('handleShowPrompt calls prompt show', () => {
    const spy = vi.spyOn(wrapper.vm.prompt, 'show')
    wrapper.vm.handleShowPrompt()
    expect(spy).toHaveBeenCalled()
  })

  it('resetConditionInForm if condition exist resets', () => {
    wrapper.vm.resetConditionInForm({ id: '1', name: 'new_name' })
    expect(wrapper.vm.formData.conditions).toEqual([{ id: '1', name: 'test' }])
    wrapper.vm.handleGoToCondition({ goToNext: vi.fn() }, { id: '1' })
    wrapper.vm.resetConditionInForm({ id: '1', name: 'new_name' })
    expect(wrapper.vm.formData.conditions).toEqual([{ id: '1', name: 'new_name' }])
  })
})
