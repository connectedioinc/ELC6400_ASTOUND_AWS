import EventsJugglerTime from '../../src/components/services/modules/conditions/EventsJugglerTime.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('EventsJugglerTime.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(EventsJugglerTime)
  })
  afterEach(() => {
    wrapper.unmount()
  })

  it('getMonthOptions generates array', () => {
    expect(wrapper.vm.getMonthOptions().length).toEqual(31)
  })

  it('endYearValidation validates', async () => {
    await wrapper.setProps({ s: { time_cond_start_yday: 1 } })
    const message = 'End year day must be greater than the start year day.'
    expect(wrapper.vm.endYearValidation(2)).toEqual({ isValid: true, message: message })
    expect(wrapper.vm.endYearValidation(0)).toEqual({ isValid: false, message: message })
  })

  describe('startHourTimeValidation validates', () => {
    const message = 'Accepted formats are hh:mm or *:mm, where * is a wildcard for any hour.'
    it.each([
      ['*:59', true],
      ['*:60', false],
      ['5:05', true],
      ['19:01', true],
      ['23:01', true],
      ['0:01', true],
      ['24:01', false]
    ])('%s should return %s', (value, res) => {
      expect(wrapper.vm.startHourTimeValidation(value)).toEqual({ isValid: res, message: message })
    })
  })

  it('endHourTimeValidation validates', async () => {
    await wrapper.setProps({ s: { time_cond_start_time: '*:00' } })
    expect(wrapper.vm.endHourTimeValidation('*:59')).toEqual({ isValid: true, message: 'Accepted format mismatch. Please use the *:mm format for wildcard hours.' })
    expect(wrapper.vm.endHourTimeValidation('*:60')).toEqual({ isValid: false, message: 'Accepted format mismatch. Please use the *:mm format for wildcard hours.' })
    expect(wrapper.vm.endHourTimeValidation('10:06')).toEqual({ isValid: false, message: 'Accepted format mismatch. Please use the *:mm format for wildcard hours.' })
    await wrapper.setProps({ s: { time_cond_start_time: '5:00' } })
    expect(wrapper.vm.endHourTimeValidation('*:59')).toEqual({ isValid: false, message: 'Accepted format mismatch. Please use the hh:mm format.' })
    expect(wrapper.vm.endHourTimeValidation('10:06')).toEqual({ isValid: true, message: 'Accepted format mismatch. Please use the hh:mm format.' })
    expect(wrapper.vm.endHourTimeValidation('10:60')).toEqual({ isValid: false, message: 'Accepted format mismatch. Please use the hh:mm format.' })
  })
})
