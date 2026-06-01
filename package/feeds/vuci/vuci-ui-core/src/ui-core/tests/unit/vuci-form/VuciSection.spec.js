import VuciSection from '@ui-core/vuci-form/src/VuciSection.vue'
import createWrapper, { mergeDeep } from '../mockFactory'

/**
 * @param {number} formCount number of how many forms to generate
 * @param {number} itemCount number of how many form items to generate in a form
 * @param {(form: number, item: number) => ({ load:any, validate: any })} overrides - function which returns object what properties should be overriden
 * @returns {Object} generated forms object
 */
const generateForms = (formCount, itemCount, overrides) => {
  const forms = {}
  const formItem = (nr, over) => ({
    uciSection: {},
    name: over.name || `formItem-${nr}`,
    load: typeof over.load === 'function' ? vi.fn(over.load) : over.load || null,
    validate: vi.fn().mockResolvedValueOnce(over.validate || true),
    changed: true,
    showOption: true,
    _save: vi.fn(arg => `${arg}-saved`),
    submit: vi.fn()
  })
  for (let i = 0; i < formCount; i++) {
    const items = new Set()
    for (let j = 0; j < itemCount; j++) {
      items.add(formItem(j, overrides?.(i, j) || {}))
    }
    forms[`form${i}`] = items
  }
  return forms
}

const VuciSectionProps = (extras = {}) => {
  const data = {
    config: 'test123',
    title: 'section title',
    uciData: {},
    dataKey: 'test-datakey',
    // After save hook, used after save reuqest. Provides two arguments:
    // self - section component instance, response - response from API
    afterSave: vi.fn((self, res) => res),
    errorHandlers: null,
    // List of options that should NOT be filtered before sending request to API
    exceptionOptions: [],
    // Prop used as custom identifier for editable section instead of .name
    sectionId: 'id',
    endpoints: [{ endpoint: '/api/endpoint1' }],
    formMethods: ['create', 'edit', 'delete', 'get'],
    visible: true,
    columns: []
  }
  return mergeDeep(data, extras)
}

const defaultProvide = extras => {
  const data = {
    configName: 'testConfig',
    vuciForm: {
      config: 'testConfig',
      editing: true,
      vuciSections: {},
      _loadData: vi.fn().mockResolvedValueOnce(true)
    },
    emitTitle: vi.fn()
  }
  return mergeDeep(data, extras)
}

describe('VuciSection', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(VuciSection, { props: { ...VuciSectionProps() }, global: { provide: { ...defaultProvide() } } })
  })
  it.each([
    { uciData: {}, dataKey: 'data1', result: [] },
    { uciData: { data1: [1, 2, 3] }, dataKey: 'data1', result: [1, 2, 3] }
  ])('returns correct section data for provided dataKey', ({ uciData, dataKey, result }) => {
    wrapper = createWrapper(VuciSection, {
      props: { ...VuciSectionProps({ uciData, dataKey }) },
      global: { provide: { ...defaultProvide() } }
    })
    expect(wrapper.vm.data).toEqual(result)
  })
  it('_syncForms calls all registerInput for all registered inputs', () => {
    const forms = generateForms(2, 15)
    wrapper.vm.forms = forms
    const registerSpy = vi.spyOn(wrapper.vm, 'registerInput')
    wrapper.vm._syncForms()
    expect(registerSpy).toHaveBeenCalledTimes(2 * 15)
  })
  describe('callMethod', () => {
    it.each([
      { missing: 'get', formMethods: ['edit', 'delete', 'create'], method: 'getData' },
      { missing: 'create', formMethods: ['edit', 'delete', 'get'], method: 'createSection' },
      { missing: 'delete', formMethods: ['edit', 'get', 'create'], method: 'delSection' },
      { missing: 'edit', formMethods: ['get', 'delete', 'create'], method: 'saveData' }
    ])('formMethods dont call $method when formMethods: $formMethods is missing $missing', ({ formMethods, missing, method }) => {
      wrapper = createWrapper(VuciSection, {
        props: { ...VuciSectionProps({ formMethods }) },
        global: { provide: { ...defaultProvide() } }
      })
      wrapper.vm.callMethod[missing]()
      expect(wrapper.vm.callMethod[missing]).not.toEqual(wrapper.vm[method])
    })
    it.each([
      { action: 'get', formMethods: ['get'], method: 'getData' },
      { action: 'create', formMethods: ['create'], method: 'createSection' },
      { action: 'delete', formMethods: ['delete'], method: 'delSection' },
      { action: 'edit', formMethods: ['edit'], method: 'saveData' }
    ])('formMethods calls $method when formMethods: $formMethods  has $action', async ({ formMethods, action, method }) => {
      wrapper = createWrapper(VuciSection, {
        props: { ...VuciSectionProps({ formMethods }) },
        global: { provide: { ...defaultProvide() } }
      })
      await wrapper.vm.callMethod[action]()
      expect(wrapper.vm.callMethod[action]).toEqual(wrapper.vm[method])
    })
  })
  describe('availableOptions', () => {
    it.each([
      {
        maps: 'column names',
        columns: [{ name: 'col1-name' }, { name: 'col2-name' }, { name: 'col3-name' }],
        forms: { id1: new Set() },
        result: ['col1-name', 'col2-name', 'col3-name']
      },
      {
        maps: 'form input names with noWrite flag set to false',
        columns: [{ name: 'col1-name' }, { name: 'col2-name' }, { name: 'col3-name' }],
        forms: {
          id1: new Set([
            { noWrite: false, name: 'option1' },
            { noWrite: true, name: 'option2' }
          ])
        },
        result: ['option1']
      },
      {
        maps: 'empty array',
        columns: [{ name: 'col1-name' }, { name: 'col2-name' }, { name: 'col3-name' }],
        forms: { id1: new Set([{ noWrite: true, name: 'option1' }]) },
        result: []
      }
    ])('returns $maps as available options', async ({ columns, forms, result }) => {
      wrapper = createWrapper(VuciSection, {
        props: { ...VuciSectionProps({ columns }) },
        global: { provide: { ...defaultProvide() } },
        data() {
          return {
            forms
          }
        }
      })
      expect(wrapper.vm.availableOptions).toEqual(result)
    })
  })
  it.each([
    {
      endpoints: [
        { endpoint: 1, awaitNetwork: false },
        { endpoint: 2, awaitNetwork: false }
      ],
      result: false
    },
    {
      endpoints: [
        { endpoint: 1, awaitNetwork: true },
        { endpoint: 2, awaitNetwork: false }
      ],
      result: true
    },
    { endpoints: [], result: false }
  ])('returns true if any of endpoints has awaitNetwork flag set to true', ({ endpoints, result }) => {
    wrapper = createWrapper(VuciSection, {
      props: { ...VuciSectionProps({ endpoints }) },
      global: { provide: { ...defaultProvide() } }
    })
    expect(wrapper.vm.awaitNetwork).toEqual(result)
  })
  it.each([
    { editing: false, expectedCalls: 0 },
    { editing: true, expectedCalls: 1 }
  ])('when editing is $editing, calls emit title method $expectedCalls times', ({ editing, expectedCalls }) => {
    wrapper = createWrapper(VuciSection, {
      props: { ...VuciSectionProps() },
      global: { provide: { ...defaultProvide({ vuciForm: { editing } }) } }
    })
    expect(wrapper.vm.emitTitle).toHaveBeenCalledTimes(expectedCalls)
  })
  it.each([
    {
      forms: {
        form1: new Set([
          {
            submit: vi.fn().mockResolvedValueOnce(true)
          },
          {
            submit: vi.fn().mockResolvedValueOnce(true)
          }
        ]),
        form2: new Set([
          {
            submit: vi.fn().mockResolvedValueOnce(true)
          },
          {
            submit: vi.fn().mockResolvedValueOnce(false),
            setTabIndicator: vi.fn()
          }
        ])
      },
      result: false
    },
    {
      forms: {
        form1: new Set([
          {
            submit: vi.fn().mockResolvedValueOnce(true)
          },
          {
            submit: vi.fn().mockResolvedValueOnce(true)
          }
        ]),
        form2: new Set([
          {
            submit: vi.fn().mockResolvedValueOnce(true)
          },
          {
            submit: vi.fn().mockResolvedValueOnce(true)
          }
        ])
      },
      result: true
    },
    {
      forms: {},
      result: true
    }
  ])('validates all forms inputs and returns false if any validation failed', async ({ forms, result }) => {
    wrapper.vm.forms = forms
    const res = await wrapper.vm.validate()
    expect(res).toEqual(result)
    Object.values(forms).forEach(f => Object.values(f).forEach(p => expect(p.submit).toHaveBeenCalled()))
  })
  it('invokes spinner, vuciForm load data and sync forms on reloadData call', async () => {
    const spinnerSpy = vi.spyOn(wrapper.vm, '$spin')
    vi.spyOn(wrapper.vm.vuciForm, '_loadData')
    vi.spyOn(wrapper.vm, '_syncForms')
    await wrapper.vm.reloadData()
    expect(spinnerSpy).toHaveBeenCalledTimes(2)
    expect(wrapper.vm._syncForms).toHaveBeenCalled()
    expect(wrapper.vm.vuciForm._loadData).toHaveBeenCalledWith(true)
  })
  it.each([
    {
      exceptionOptions: ['prop1', 'prop2'],
      cols: [{ name: 'prop2' }, { name: 'prop3' }],
      result: [{ prop1: 'a', prop2: 'a', prop3: 'a' }]
    },
    { exceptionOptions: [], cols: [{ name: 'prop2' }, { name: 'prop3' }], result: [{ prop2: 'a', prop3: 'a' }] },
    { exceptionOptions: [], cols: [], result: [{}] }
  ])('removes not allowed properties from data object. exception options: $exceptionOptions', ({ exceptionOptions, cols, result }) => {
    const dataObj = [
      {
        prop1: 'a',
        prop2: 'a',
        prop3: 'a',
        prop4: 'a',
        prop5: 'a',
        prop6: 'a',
        prop7: 'a',
        prop8: 'a',
        prop9: 'a',
        prop10: 'a'
      }
    ]
    wrapper = createWrapper(VuciSection, {
      props: { ...VuciSectionProps({ exceptionOptions, columns: cols }) },
      global: { provide: { ...defaultProvide() } }
    })
    wrapper.vm.filterOptions(dataObj)
    expect(dataObj).toEqual(expect.objectContaining(result))
  })
  it.each([
    { errorHandlers: { create: vi.fn() }, handle: 'create' },
    { errorHandlers: { edit: vi.fn() }, handle: 'edit' },
    { errorHandlers: { delete: vi.fn() }, handle: 'delete' },
    { errorHandlers: { get: vi.fn() }, handle: 'get' }
  ])('handles given $handle error with defaultHandler and attached error handler if its present', ({ handle, errorHandlers }) => {
    const errObject = { error: 'very big' }
    vi.spyOn(wrapper.vm.defaultErrorHandlers, handle)
    wrapper.vm.handleError(handle, errObject)
    expect(wrapper.vm.defaultErrorHandlers[handle]).toHaveBeenCalled()
    wrapper = createWrapper(VuciSection, {
      props: { ...VuciSectionProps({ errorHandlers }) },
      global: { provide: { ...defaultProvide() } }
    })
    wrapper.vm.handleError(handle, errObject)
    expect(errorHandlers[handle]).toHaveBeenCalledWith(errObject)
  })
  it('invokes all registered form items load functions if its provided', async () => {
    const forms = generateForms(5, 4, (f, i) => ({
      load: i > 2 ? vi.fn().mockReturnValueOnce('loadedVal') : 'notLoadedVal'
    }))
    wrapper.vm.forms = forms
    wrapper.vm.load()
    Object.values(wrapper.vm.forms).forEach(form => {
      Object.values(form).forEach((input, index) => {
        if (index > 2) expect(input.load).toHaveBeenCalledWith(input)
        else expect(input.uciSection[input.name]).toEqual('notLoadedVal')
      })
    })
  })
  describe('hooks', () => {
    it('on component destroy, it removes corresponding exposed properties from vuciForm', () => {
      wrapper.unmount()
      expect(wrapper.vm.vuciForm.vuciSections).not.toHaveProperty(`${this.configName}_${this.sid}`)
    })
  })
  describe('save', () => {
    beforeEach(() => vi.spyOn(wrapper.vm, '_syncForms').mockReturnValueOnce())
    it('calls _syncForms', () => {
      expect(wrapper.vm._syncForms).toHaveBeenCalledTimes(0)
      wrapper.vm.save([])
      expect(wrapper.vm._syncForms).toHaveBeenCalledTimes(1)
    })
    it.each([
      { data: [], forms: generateForms(2, 5) },
      { data: [{ id: 'form0', 'formItem-0': 'data', 'formItem-1': 'data-2' }], forms: generateForms(1, 5) }
    ])("save method invokes all form items _save method that's in given data", async ({ data, forms }) => {
      wrapper.vm.forms = forms
      const allInputs = call => Object.entries(forms).forEach(([formName, form]) => Object.entries(form).forEach(([inputName, input], index) => call({ form, inputName, formName, input, index })))
      allInputs(({ input }) => expect(input._save).toHaveBeenCalledTimes(0))
      wrapper.vm.save(data)
      expect(
        allInputs(({ formName, inputName, input }) => {
          if (data.some(d => d.id === formName) && data.some(d => Object.keys(d).includes(inputName))) {
            expect(input._save).toHaveBeenCalledTimes(1)
          }
        })
      )
    })
    it('when items _save method is invoked, inputs changed flag is set back to false', async () => {
      const forms = generateForms(1, 2)
      wrapper.vm.forms = forms
      const allInputs = call =>
        Object.entries(wrapper.vm.forms).forEach(([formName, form]) => Object.entries(form).forEach(([inputName, input], index) => call({ form, inputName, formName, input, index })))
      expect(allInputs(({ input }) => expect(input.changed).toEqual(true)))
      wrapper.vm.save([{ id: 'form0', 'formItem-0': 'data', 'formItem-1': 'data-2' }])
      expect(allInputs(({ input }) => expect(input.changed).toEqual(false)))
    })
  })
  it('registerInput assigns object to provided target', () => {
    const item = { name: 'item123', methods: 'very good' }
    const target = {}
    wrapper.vm.registerInput('123', 'item123', item, target)
    expect(target)
  })
  it('updateAfterSave method calls getDataSource if it has one', () => {
    const getSourceSpy = vi.spyOn(wrapper.vm, 'getDataSource')
    wrapper.vm.updateAfterSave()
    expect(getSourceSpy).not.toHaveBeenCalled()
    wrapper.vm.dataSource = []
    wrapper.vm.updateAfterSave()
    expect(getSourceSpy).toHaveBeenCalled()
  })
  it('exposes properties to VuciForm', () => {
    const properties = { test: 'test' }
    wrapper.vm.$options.watch.exposedProperties.handler.call(wrapper.vm, properties)
    expect(Object.keys(wrapper.vm.vuciForm.vuciSections).length).toBe(1)
    expect(Object.values(wrapper.vm.vuciForm.vuciSections)[0]).toEqual(properties)
  })
})
