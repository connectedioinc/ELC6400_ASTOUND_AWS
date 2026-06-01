import IoScheduler from '../../src/views/services/IoScheduler.vue'
import createWrapper from '@tests/unit/mockFactory'
describe('IoScheduler.vue', () => {
  it('checks if message have been displayed', async () => {
    const wrapper = createWrapper(IoScheduler)
    const spy = vi.spyOn(wrapper.vm.$notification, 'info')
    await wrapper.vm.schedulerInfoMessage()
    expect(spy).toHaveBeenCalled()
  })
  it('returns io data', async () => {
    const wrapper = createWrapper(IoScheduler)
    wrapper.vm.$io.getFilteredPinsInfo = vi.fn().mockReturnValueOnce(['test'])
    const result = await wrapper.vm.filteredIoData
    expect(result).toEqual(['test'])
  })
  it.each([
    ['value', 'N/A'],
    ['week', 'Weekdays']
  ])('checks if period is parsed', (value, result) => {
    const wrapper = createWrapper(IoScheduler)
    expect(wrapper.vm.displayPeriod(value)).toEqual(result)
  })
  it.each([
    [{ uciSection: { name: '_to', period: 'month', end_day: '1', end_time: '1' } }, 'month'],
    [{ uciSection: { name: '_to', period: 'week', end_day: '0', end_time: '1' } }, 'week'],
    [{ uciSection: { name: '_from', period: 'month' } }, 'month'],
    [{ uciSection: { name: '_from', period: 'week' } }, 'week']
  ])('checks if _to value is parsed', (self, result) => {
    const wrapper = createWrapper(IoScheduler)
    wrapper.vm.$scheduler.convertWeekdayPeriodToText = vi.fn().mockReturnValueOnce('week')
    wrapper.vm.$scheduler.convertMonthDaysPeriodToText = vi.fn().mockReturnValueOnce('month')
    expect(wrapper.vm.displayRange('', self)).toEqual(result)
  })
  it.each([
    [[{ id: 'test', name_with_pins: 'test_name_with_pins' }], 'test', 'test_name_with_pins'],
    [[{ id: 'test', name_with_pins: 'test_name_with_pins' }], 'test2', 'N/A']
  ])('checks if pin value is parsed', (ioData, value, result) => {
    const wrapper = createWrapper(IoScheduler, {
      computed: {
        filteredIoData() {
          return ioData
        }
      }
    })
    expect(wrapper.vm.displayPin(value)).toEqual(result)
  })
  it.each([
    [[], {}, false],
    [[{ id: 'test', direction: 'in' }], { pin: 'test' }, true],
    [[{ id: 'test', direction: 'out' }], { pin: 'test' }, false],
    [[{ id: 'test2', direction: 'in' }], { pin: 'test' }, false]
  ])('checks if pin state valid', (ioData, section, result) => {
    const wrapper = createWrapper(IoScheduler, {
      computed: {
        filteredIoData() {
          return ioData
        }
      }
    })
    expect(wrapper.vm.validatePinState(section)).toEqual(result)
  })
  it.each([
    [{ scheduler: [] }, {}, false],
    [{ scheduler: [{ period: 'week', enabled: '1' }] }, { period: 'week' }, false],
    [{ scheduler: [{ period: 'month', enabled: '1' }] }, { period: 'week' }, true],
    [{ scheduler: [{ period: 'month', enabled: '0' }] }, { period: 'week' }, false],
    [
      {
        scheduler: [
          { period: 'month', enabled: '0' },
          { period: 'month', enabled: '1' }
        ]
      },
      { period: 'week' },
      true
    ]
  ])('checks if period type is valid', (formData, section, result) => {
    const wrapper = createWrapper(IoScheduler)
    wrapper.setData({ formData })
    expect(wrapper.vm.validatePeriodType(section)).toEqual(result)
  })
  it.each([
    [[{ enabled: '1' }], [], {}, false],
    [[{ enabled: '1', actions: '1' }], [{ ui_name: '1', dest: 'test' }], { pin: 'test' }, true],
    [[{ enabled: '1', actions: '1' }], [{ ui_name: '1', dest: 'test2' }], { pin: 'test' }, false],
    [[{ enabled: '1', actions: '1' }], [{ ui_name: '2', dest: 'test' }], { pin: 'test' }, false]
  ])('checks if selected pin is not used in io juggler', (inputs, actions, section, result) => {
    const wrapper = createWrapper(IoScheduler)
    wrapper.setData({ ioJugglerInputs: inputs })
    wrapper.setData({ ioJugglerActions: actions })
    expect(wrapper.vm.validateInputs(section)).toEqual(result)
  })
  it('Checks intervals validations is called', () => {
    const wrapper = createWrapper(IoScheduler)
    wrapper.setData({ formData: { scheduler: [{ '.name': 'test', pin: 'test', enabled: '1' }] } })
    wrapper.vm.$scheduler.validateInterval = vi.fn().mockReturnValueOnce('interval')
    expect(wrapper.vm.validateInterval({ '.name': 'test', pin: 'test' })).toEqual('interval')
  })
  it.each([
    [[], { pin: 'test' }, false],
    [[{ io: 'test', enabled: '0', action: 'io_set' }], { enabled: '0', pin: 'test' }, false],
    [[{ io: 'test2', enabled: '1', action: 'io_set' }], { enabled: '0', pin: 'test' }, false],
    [[{ io: 'test', enabled: '1', action: 'io_set' }], { enabled: '1', pin: 'test' }, true]
  ])('checks if pin is used in sms rules', (smsSections, section, result) => {
    const wrapper = createWrapper(IoScheduler)
    wrapper.setData({ smsSections })
    wrapper.vm.formData.scheduler_general = [{ enabled: '1' }]
    expect(wrapper.vm.validateSmsRules(section)).toEqual(result)
  })
  it.each([
    [[], { pin: 'test' }, false],
    [[{ pin: 'test', enabled: '0' }], { enabled: '0', pin: 'test' }, false],
    [[{ pin: 'test2', enabled: '1' }], { enabled: '0', pin: 'test' }, false],
    [[{ pin: 'test', enabled: '1' }], { enabled: '1', pin: 'test' }, true]
  ])('checks if pin is used in call rules', (callSections, section, result) => {
    const wrapper = createWrapper(IoScheduler)
    wrapper.setData({ callSections })
    wrapper.vm.formData.scheduler_general = [{ enabled: '1' }]
    expect(wrapper.vm.validateCallRules(section)).toEqual(result)
  })
  it('checks if enabled can be turned off', () => {
    const wrapper = createWrapper(IoScheduler)
    expect(wrapper.vm.validateEnable({ uciSection: { enabled: '0' } })).toEqual(undefined)
  })
  it.each([
    [true, true, true, true, true, true, true, 1],
    [false, true, true, true, true, true, true, 1],
    [false, false, true, true, true, true, true, 1],
    [false, false, false, true, true, true, true, 1],
    [false, false, false, false, true, true, true, 1],
    [false, false, false, false, false, true, true, 1],
    [false, false, false, false, false, false, true, 1],
    [false, false, false, false, false, false, false, 0]
  ])('checks if enabled can be turned on', async (timeOptionsValid, pinStateValid, periodValid, inputsValid, intervalValid, smsValid, callValid, timesCalled) => {
    const wrapper = createWrapper(IoScheduler)
    wrapper.vm.validatePinState = vi.fn().mockReturnValueOnce(pinStateValid)
    wrapper.vm.validatePeriodType = vi.fn().mockReturnValueOnce(periodValid)
    wrapper.vm.validateInputs = vi.fn().mockReturnValueOnce(inputsValid)
    wrapper.vm.validateInterval = vi.fn().mockReturnValueOnce(intervalValid)
    wrapper.vm.validateSmsRules = vi.fn().mockReturnValueOnce(smsValid)
    wrapper.vm.validateCallRules = vi.fn().mockReturnValueOnce(callValid)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.validateAllInputs({ uciSection: { enabled: '1' } })
    expect(spy).toHaveBeenCalledTimes(timesCalled)
    spy.mockClear()
  })

  it('Checks if error messages are displayed after individual gets fails', async () => {
    const wrapper = createWrapper(IoScheduler)
    wrapper.vm.$store.board.modems = []
    const ioResponse = { success: false }
    const actionsResponse = { success: false }
    const inputResponse = { success: false }
    const smsResponse = { success: false }
    const callResponse = { success: false }
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([ioResponse, actionsResponse, inputResponse, smsResponse, callResponse])
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledTimes(5)
  })
  it('Checks if error message is displated after afterLoad fails', async () => {
    const wrapper = createWrapper(IoScheduler)
    wrapper.vm.$store.board.modems = []
    wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledTimes(1)
  })
  it('Checks if data is set correctly in after load', async () => {
    const wrapper = createWrapper(IoScheduler)
    const ioResponse = { success: true, data: ['ioResponse'] }
    const actionResponse = { success: true, data: ['actionResponse'] }
    const inputResponse = { success: true, data: ['inputResponse'] }
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([ioResponse, actionResponse, inputResponse])
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.ioData).toEqual(['ioResponse'])
    expect(wrapper.vm.ioJugglerActions).toEqual(['actionResponse'])
    expect(wrapper.vm.ioJugglerInputs).toEqual(['inputResponse'])
  })
  it.each([
    [{ enabled: '1' }, 'Missing required options: Pin, Interval type, Start day, Start time, End day, End time'],
    [{ enabled: '1', pin: 'pin', period: 'period', start_day: 'start_day', start_time: 'start_time' }, 'Missing required options: End day, End time'],
    [{ enabled: '1', pin: 'pin', period: 'period', start_day: 'start_day', start_time: 'start_time', end_day: 'end_day' }, 'Missing required option: End time']
  ])('checks if validateEnable returns correct message', async (sectionValues, message) => {
    const wrapper = createWrapper(IoScheduler)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.validateAllInputs = vi.fn().mockReturnValueOnce()
    const data = {
      uciSection: sectionValues
    }
    await wrapper.vm.validateEnable(data)
    expect(spy).toHaveBeenCalledWith(message)
  })
})
