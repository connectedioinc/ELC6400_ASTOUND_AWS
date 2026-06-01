import EventsJugglerGsm from '../../src/components/services/modules/events/EventsJugglerGsm.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('ventsJugglerMainEditSection.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(EventsJugglerGsm)
  })
  afterEach(() => {
    wrapper.unmount()
  })

  it('updateCustomInputs sets value', () => {
    expect(wrapper.vm.customInputs).toEqual({})
    wrapper.vm.updateCustomInputs('val', 'key')
    expect(wrapper.vm.customInputs).toEqual({ key: 'val' })
  })

  it('updateCustomInputValidity calls validate', () => {
    const func = vi.fn()
    wrapper.vm.updateCustomInputs({ validate: func }, 'key')
    wrapper.vm.updateCustomInputValidity()
    expect(func).toHaveBeenCalled()
  })

  it('validateSignalRange validates', () => {
    const message = 'The first value should be smaller than the second value.'
    expect(wrapper.vm.validateSignalRange(['1', '2'])).toEqual({ isValid: true, message: message })
    expect(wrapper.vm.validateSignalRange(['2', '1'])).toEqual({ isValid: false, message: message })
    expect(wrapper.vm.validateSignalRange(['1', '1'])).toEqual({ isValid: false, message: message })
  })

  it('handleBeforeSave resolves on trigger not range', async () => {
    await wrapper.setProps({ s: { gsm_signal_trigger: 'gt' } })
    expect(wrapper.vm.handleBeforeSave()).resolves.toEqual(true)
  })

  it('handleBeforeSave rejects on failed validation', async () => {
    wrapper.vm.customInputs = { a: { validate: vi.fn().mockResolvedValue(false) } }
    await wrapper.setProps({ s: { gsm_signal_trigger: 'range' } })
    expect(wrapper.vm.handleBeforeSave()).rejects.toEqual('Some fields are invalid')
  })

  it('handleBeforeSave resolves on successful validation', async () => {
    const func = vi.fn().mockResolvedValue(true)
    wrapper.vm.customInputs = { a: { validate: func } }
    await wrapper.setProps({ s: { gsm_signal_trigger: 'range' } })
    expect(wrapper.vm.handleBeforeSave()).resolves.toEqual(true)
    expect(func).toHaveBeenCalled()
  })
})
