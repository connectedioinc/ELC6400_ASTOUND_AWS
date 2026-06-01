import createWrapper from '@tests/unit/mockFactory'
import IoJugglerActionsEdit from '../../src/views/services/IoJugglerActionsEdit.vue'

vi.mock('@ui-core/plugins/i18n', async () => {
  const actual = await vi.importActual('@ui-core/plugins/i18n')
  return {
    ...actual,
    t: vi.fn(s => s)
  }
})

const provide = {
  typeOptions: () => [],
  modemList: () => [],
  emailList: () => [],
  ioData: () => [],
  profileList: () => [],
  simList: () => [],
  phoneGroups: () => [],
  conditionsList: () => [],
  certificates: () => [],
  optionData: () => []
}

const statesForRelay = [
  ['1', 'Closed'],
  ['0', 'Open']
]
const states = [
  ['1', 'High'],
  ['0', 'Low']
]

const props = {
  section: {
    id: 'abcc'
  }
}
describe('IoJugglerActionsEdit.vue', () => {
  it.each([
    [[{ type: 'gpio', id: 'test', name_with_pins: 'test' }], [['test', 'test']]],
    [[{ type: 'gpio', direction: 'out', id: 'test', name_with_pins: 'test' }], []],
    [[{ type: 'gpio', bi_dir: true, id: 'test', name_with_pins: 'test' }], [['test', 'test']]],
    [[{ type: 'relay', id: 'test', name_with_pins: 'test' }], [['test', 'test']]],
    [[{ type: 'dwi', id: 'test', name_with_pins: 'test' }], [['test', 'test']]],
    [[{ type: 'notRelay', id: 'test', name_with_pins: 'test' }], []]
  ])('filters copy list', (ioInfo, filteredData) => {
    const wrapper = createWrapper(IoJugglerActionsEdit, { props, global: { provide } })
    const list = wrapper.vm.copyList(ioInfo)
    expect(list).toEqual(filteredData)
  })
  it.each([
    [[{ type: 'gpio', id: 'test', name_with_pins: 'test' }], []],
    [[{ type: 'gpio', direction: 'out', id: 'test', name_with_pins: 'test' }], [['test', 'test']]],
    [[{ type: 'gpio', bi_dir: '1', id: 'test', name_with_pins: 'test' }], [['test', 'test']]],
    [[{ type: 'relay', id: 'test', name_with_pins: 'test' }], [['test', 'test']]],
    [[{ type: 'notRelay', id: 'test', name_with_pins: 'test' }], []]
  ])('filters dest list', (ioInfo, filteredData) => {
    const wrapper = createWrapper(IoJugglerActionsEdit, { props, global: { provide } })
    const list = wrapper.vm.destList(ioInfo)
    expect(list).toEqual(filteredData)
  })
  it('return input props', () => {
    const paramslist = []
    const wrapper = createWrapper(IoJugglerActionsEdit, { props, global: { provide } })
    const spy = vi.spyOn(wrapper.vm, 'validParamInput')
    wrapper.vm.validParamInput('some value')
    const expectedParameters = [
      {
        prop: 'ParamInput'
      },
      {
        prop: 'ParamSelect',
        options: paramslist
      }
    ]
    expect(wrapper.vm.parameterInputProps.map(({ prop, options }) => ({ prop, options }))).toEqual(expectedParameters)
    expect(spy).toHaveBeenCalled()
  })
  it('returns parameter options', () => {
    const wrapper = createWrapper(IoJugglerActionsEdit, {
      props,
      global: {
        provide: {
          ...provide,
          optionData: () => [
            { id: 'nl', type: 'event' },
            { id: 'wi', type: 'event' },
            { id: 'g0', type: 'io', block_pins: [1, 2, 3], io_name: 'Input' },
            { id: 'g1', type: 'io', block_pins: [4], io_name: 'test' }
          ]
        }
      }
    })
    expect(wrapper.vm.paramslist).toEqual([
      ['nl', 'New line'],
      ['wi', 'WAN IPv4 address'],
      ['g0', 'Input (1, 2, 3)'],
      ['g1', 'Unknown (4)']
    ])
  })
  it.each([
    [{}, states],
    [{ dest: 'relay0' }, statesForRelay]
  ])('renders state option list', (section, result) => {
    const wrapper = createWrapper(IoJugglerActionsEdit, {
      props: { section },
      global: { provide }
    })
    const states = wrapper.vm.states(section)
    expect(states).toEqual(result)
  })
  it('returns text box parameters', () => {
    const wrapper = createWrapper(IoJugglerActionsEdit, {
      props,
      global: { provide: { ...provide, optionData: () => [{ id: 'g0', type: 'io', io_name: 'Input', block_pins: [1] }] } }
    })
    expect(wrapper.vm.formattedParameters).toEqual([{ description: 'Input (1)', parameter: '%g0' }])
  })
  it.each([
    [
      { name: 'invert', uciSection: { invert: '1', ui_mirroring: '1' } },
      { invert: '1', ui_mirroring: '0' }
    ],
    [
      { name: 'invert', uciSection: { invert: '0', ui_mirroring: '1' } },
      { invert: '0', ui_mirroring: '1' }
    ],
    [
      { name: 'ui_mirroring', uciSection: { invert: '1', ui_mirroring: '1' } },
      { invert: '0', ui_mirroring: '1' }
    ],
    [
      { name: 'ui_mirroring', uciSection: { invert: '1', ui_mirroring: '0' } },
      { invert: '1', ui_mirroring: '0' }
    ]
  ])('checks if only one allowed switch is enabled', (self, result) => {
    const wrapper = createWrapper(IoJugglerActionsEdit, { props, global: { provide } })
    wrapper.vm.setInvertMirroring(self)
    expect(self.uciSection).toEqual(result)
  })
  it('skips file checking on before save', async () => {
    const wrapper = createWrapper(IoJugglerActionsEdit, {
      props: { section: { ui_file_path: 'other' } },
      global: { provide }
    })
    const res = await wrapper.vm.onBeforeSave()
    expect(res).toBe(true)
  })
  it.each([
    [['aaa', 'bbb'], 'aaa=bbb'],
    [['aaa'], 'aaa'],
    [[], ''],
    [null, '']
  ])('checks if parameters are constructed correctly', async (params, result) => {
    const wrapper = createWrapper(IoJugglerActionsEdit, { props, global: { provide } })
    expect(wrapper.vm.saveParameters(params)).toEqual(result)
  })

  it('returns modem array', () => {
    const wrapper = createWrapper(IoJugglerActionsEdit, { props, global: { provide } })
    expect(wrapper.vm.modems).toEqual([])
  })
  it.each([
    [
      'with not fully configured conditions when type are "io" and "minute"',
      "Can't use these conditions because they are not fully configured: test1, test2, test3",
      { id: 'test', conditions: ['test1', 'test2', 'test3'] },
      [
        { ui_name: 'test1', type: 'minute', value: '' },
        { ui_name: 'test2', type: 'io', name: '' },
        { ui_name: 'test3', type: 'io', state: '' }
      ]
    ],
    [
      'with not fully configured conditions when type are "bool" and "analog"',
      "Can't use these conditions because they are not fully configured: test1, test2",
      { id: 'test', conditions: ['test1', 'test2'] },
      [
        { ui_name: 'test1', type: 'bool', conditions: '' },
        { ui_name: 'test2', type: 'analog', name: '' }
      ]
    ]
  ])('returns error message when %s', (text, message, sectionValues, conditionValues) => {
    const wrapper = createWrapper(IoJugglerActionsEdit, { props, data: () => ({ section: sectionValues }), global: { provide: { ...provide, conditionsList: () => conditionValues } } })
    expect(wrapper.vm.onBeforeSave()).rejects.toEqual(message)
  })
  it.each([
    [
      [
        { ui_name: 'test1', type: 'minute', value: '' },
        { ui_name: 'test2', type: 'io', name: '' },
        { ui_name: 'test3', type: 'io', state: '' }
      ],
      [
        ['test1', 'test1'],
        ['test2', 'test2'],
        ['test3', 'test3']
      ]
    ]
  ])('chech if correctly map conditionsList', (conditionValues, exprectValues) => {
    const wrapper = createWrapper(IoJugglerActionsEdit, { props, global: { provide: { ...provide, conditionsList: () => conditionValues } } })
    expect(wrapper.vm.conditionsListMap()).toEqual(exprectValues)
  })
  it('returns empty save params', () => {
    const wrapper = createWrapper(IoJugglerActionsEdit, { props, global: { provide } })
    expect(wrapper.vm.saveParameters()).toBe('')
  })
  it('returns joined save params', () => {
    const wrapper = createWrapper(IoJugglerActionsEdit, { props, global: { provide } })
    expect(wrapper.vm.saveParameters(['test', 'test'])).toBe('test=test')
  })
  it('check if pass validParamInputs validation', () => {
    const wrapper = createWrapper(IoJugglerActionsEdit, { props, global: { provide } })
    expect(wrapper.vm.validParamInput('test')).toStrictEqual({ isValid: true })
  })
  it('check if return error validParamInputs validation', () => {
    const wrapper = createWrapper(IoJugglerActionsEdit, { props, global: { provide } })
    expect(wrapper.vm.validParamInput('test=')).toStrictEqual({ isValid: false, message: 'All characters are allowed except =.' })
  })
})
