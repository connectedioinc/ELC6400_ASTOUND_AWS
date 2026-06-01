import IoJugglerConditionsEdit from '../../src/views/services/IoJugglerConditionsEdit.vue'
import createWrapper from '@tests/unit/mockFactory'
const dayList = [
  ['1', 'Monday'],
  ['2', 'Tuesday'],
  ['3', 'Wednesday'],
  ['4', 'Thursday'],
  ['5', 'Friday'],
  ['6', 'Saturday'],
  ['0', 'Sunday']
]
const intervalOption1 = {
  minute: {
    label: 'Start minute',
    help: 'Start of the interval in minutes (0-59).',
    placeholder: '12',
    rules: 'irange(0,59)'
  },
  hour: {
    label: 'Start hour',
    help: 'Start of the interval in hours:minutes (00:00 - 23:59).',
    placeholder: '12:20',
    rules: 'time'
  },
  weekday: {
    label: 'Start weekday',
    help: 'Start of the interval in days of the week.',
    options: dayList
  },
  monthday: {
    label: 'Start day of the month',
    help: 'Start of the interval in days of the month (1-31).',
    placeholder: '20',
    rules: 'irange(1,31)'
  },
  yearday: {
    label: 'Start day of the year',
    help: 'Start of the interval in days of the year (1-366).',
    placeholder: '200',
    rules: 'irange(1,366)'
  }
}
const intervalOption2 = {
  minute: {
    label: 'End minute',
    help: 'End of the interval in minutes (0-59).',
    placeholder: '25',
    rules: 'irange(0,59)'
  },
  hour: {
    label: 'End hour',
    help: 'End of the interval in hours:minutes (00:00 - 23:59).',
    placeholder: '14:30',
    rules: 'time'
  },
  weekday: {
    label: 'End weekday',
    help: 'End of the interval in days of the week.',
    options: dayList
  },
  monthday: {
    label: 'End day of the month',
    help: 'End of the interval in days of the month (1-31).',
    placeholder: '30',
    rules: 'irange(1,31)'
  },
  yearday: {
    label: 'End day of the year',
    help: 'End of the interval in days of the year (1-366).',
    placeholder: '300',
    rules: 'irange(1,366)'
  }
}
const valueOptions = {
  minute: {
    label: 'Minute',
    help: 'Specific minute (0-59).',
    placeholder: '10',
    rules: 'irange(0,59)'
  },
  hour: {
    label: 'Hour',
    help: 'Specific hour (0-23).',
    placeholder: '12',
    rules: 'irange(0,23)'
  },
  weekday: {
    label: 'Weekday',
    help: 'Specific day of the week.',
    options: dayList
  },
  monthday: {
    label: 'Day of the month',
    help: 'Specific day of the month (1-31).',
    placeholder: '20',
    rules: 'irange(1,31)'
  },
  yearday: {
    label: 'Day of the year',
    help: 'Specific day of the year (1-366).',
    placeholder: '200',
    rules: 'irange(1,366)'
  }
}
const statesForRelay = [
  ['1', 'Closed'],
  ['0', 'Open']
]
const states = [
  ['1', 'High'],
  ['0', 'Low']
]
const provide = {
  typeOptions: () => [],
  hasAcl: () => [],
  aclList: () => [],
  analogList: () => [],
  ioList: () => []
}
describe('IoJugglerConditionsEdit.vue', () => {
  it.each([
    [[{ ui_name: 'test' }], [['test', 'test']]],
    [[{ ui_name: 'test' }, { ui_name: 'test2' }], [['test', 'test']]]
  ])('renders conditions', async (formData, result) => {
    const wrapper = createWrapper(IoJugglerConditionsEdit, { props: { section: { ui_name: 'test2' } }, global: { provide } })
    await wrapper.setData({ formData: { iojugglerConditions: formData } })
    const conditions = await wrapper.vm.conditions
    expect(conditions).toEqual(result)
  })
  it.each([
    [{}, states],
    [{ name: 'relay0' }, statesForRelay]
  ])('renders state options', async (section, result) => {
    const wrapper = createWrapper(IoJugglerConditionsEdit, { props: { section }, global: { provide } })
    const states = await wrapper.vm.stateOptions
    expect(states).toEqual(result)
  })
  it.each([
    [{ type: 'minute' }, intervalOption1.minute],
    [{ type: 'hour' }, intervalOption1.hour],
    [{ type: 'weekday' }, intervalOption1.weekday],
    [{ type: 'monthday' }, intervalOption1.monthday],
    [{ type: 'yearday' }, intervalOption1.yearday]
  ])('selects props for interval start depending on type', async (section, result) => {
    const wrapper = createWrapper(IoJugglerConditionsEdit, { props: { section }, global: { provide } })
    const states = await wrapper.vm.intervalOption1
    expect(states).toEqual(result)
  })
  it.each([
    [{ type: 'minute' }, intervalOption2.minute],
    [{ type: 'hour' }, intervalOption2.hour],
    [{ type: 'weekday' }, intervalOption2.weekday],
    [{ type: 'monthday' }, intervalOption2.monthday],
    [{ type: 'yearday' }, intervalOption2.yearday]
  ])('selects props for interval end depending on type', async (section, result) => {
    const wrapper = createWrapper(IoJugglerConditionsEdit, { props: { section }, global: { provide } })
    const states = await wrapper.vm.intervalOption2
    expect(states).toEqual(result)
  })

  it.each([
    [{ type: 'minute' }, valueOptions.minute],
    [{ type: 'hour' }, valueOptions.hour],
    [{ type: 'weekday' }, valueOptions.weekday],
    [{ type: 'monthday' }, valueOptions.monthday],
    [{ type: 'yearday' }, valueOptions.yearday]
  ])('selects props for interval depending on type', async (section, result) => {
    const wrapper = createWrapper(IoJugglerConditionsEdit, { props: { section }, global: { provide } })
    const states = await wrapper.vm.valueOption
    expect(states).toEqual(result)
  })
  it.each([
    [{}, undefined],
    [{ type: 'weekday' }, 'vuci-form-item-select'],
    [{ type: 'monthday' }, 'vuci-form-item-input']
  ])('selects input depending on type', async (section, result) => {
    const wrapper = createWrapper(IoJugglerConditionsEdit, { props: { section }, global: { provide } })
    const states = await wrapper.vm.componentType
    expect(states).toEqual(result)
  })
  it.each([
    ['1', '2', { isValid: true }],
    ['2', '2', { isValid: false, message: 'Max value should be higher than min value' }]
  ])('check if min value is less then max value', async (min, max, result) => {
    const wrapper = createWrapper(IoJugglerConditionsEdit, { props: { section: {} }, global: { provide } })
    expect(wrapper.vm.validateMinMax(min, max)).toEqual(result)
  })
  it('checks if function calling validator', () => {
    const wrapper = createWrapper(IoJugglerConditionsEdit, { props: { section: {} }, global: { provide } })
    const self = { vuciSection: { validate: vi.fn() } }
    wrapper.vm.updateValidations(self)
    expect(self.vuciSection.validate).toHaveBeenCalled()
  })
  it.each([
    [[{}, {}], true],
    [[{}], false],
    [[], false]
  ])('check if two or more values in "conditions" element', (data, res) => {
    const wrapper = createWrapper(IoJugglerConditionsEdit, { props: { section: {} }, global: { provide } })
    const val = wrapper.vm.validateConditionsLength(data)
    expect(val.isValid).toEqual(res)
  })
  it.each([
    [
      'with not fully configured conditions when type are "io" and "minute"',
      "Can't use these conditions because they are not fully configured: test1, test2, test3",
      { id: 'test', type: 'bool', conditions: ['test1', 'test2', 'test3'] },
      [
        { ui_name: 'test1', type: 'minute', value: '' },
        { ui_name: 'test2', type: 'io', name: '' },
        { ui_name: 'test3', type: 'io', state: '' }
      ]
    ],
    [
      'with not fully configured conditions when type are "bool" and "analog"',
      "Can't use these conditions because they are not fully configured: test1, test2",
      { id: 'test', type: 'bool', conditions: ['test1', 'test2'] },
      [
        { ui_name: 'test1', type: 'bool', conditions: '' },
        { ui_name: 'test2', type: 'analog', name: '' }
      ]
    ]
  ])('returns error message when %s', (text, message, sectionValues, conditionValues) => {
    const wrapper = createWrapper(IoJugglerConditionsEdit, { props: { section: sectionValues }, global: { provide } })
    wrapper.vm.formData.iojugglerConditions = conditionValues
    expect(wrapper.vm.onBeforeSave()).rejects.toEqual(message)
  })
})
