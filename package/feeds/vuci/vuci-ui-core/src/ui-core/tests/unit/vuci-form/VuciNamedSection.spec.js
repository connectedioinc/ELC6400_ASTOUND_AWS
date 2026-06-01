import VuciNamedSection from '@ui-core/vuci-form/src/VuciNamedSection.vue'
import { formBus } from '@ui-core/vuci-form/'
import createWrapper, { mergeDeep } from '@ui-core/tests/unit/mockFactory'

const mockComputed = (wrapper, mocks) => {
  return mocks.map(m => {
    const isArr = Array.isArray(m)
    return vi.spyOn(wrapper.vm, isArr ? m[0] : m, 'get').mockReturnValue(isArr ? m[1] : true)
  })
}
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
    model: nr,
    _save: vi.fn(arg => `${arg}-saved`)
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

const defaultProvide = extras => {
  const data = {
    configName: 'testConfig',
    vuciForm: {
      config: 'testConfig',
      editing: true,
      vuciSections: {},
      loadData: vi.fn().mockResolvedValueOnce(true),
      bulkRequest: true
    },
    emitTitle: vi.fn()
  }
  return mergeDeep(data, extras)
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

describe('VuciNamedSection', () => {
  let wrapper
  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = createWrapper(VuciNamedSection, {
      props: { ...VuciSectionProps() },
      global: { stubs: { 'tlt-card': true }, provide: defaultProvide() }
    })
  })
  it('on destroy removes formBus event listener', () => {
    const spy = vi.spyOn(formBus, 'off')
    const method = wrapper.vm._updateSection
    expect(spy).not.toHaveBeenCalled()
    wrapper.unmount()
    expect(spy).toHaveBeenCalledWith('forms-applied-api', method)
  })
  it.each([
    {
      sectionName: 'testukas',
      uciData: { 'test-datakey': [] },
      result: [{ endpoints: ['/api/test1/testukas'], dataKey: 'test-datakey' }],
      endpoint: 'test1'
    },
    { sectionName: 'testukas', uciData: { 'test-datakey': [{ id: 'testukas' }] }, result: [], endpoint: 'test1' }
  ])('gets endpoint', ({ uciData, sectionName, result, endpoint }) => {
    wrapper = createWrapper(VuciNamedSection, {
      props: { ...VuciSectionProps({ uciData, endpoints: [{ endpoint }] }) },
      global: { stubs: { 'tlt-card': true }, provide: defaultProvide() }
    })
    mockComputed(wrapper, [['sectionName', sectionName]])
    const ans = wrapper.vm.getData()
    expect(ans).toEqual(result)
  })
  describe('getSavedData', () => {
    it.each([
      { arg1: [{ data: {} }], arg2: true },
      { arg1: { data: 'testas' }, arg2: false }
    ])('always calls afterSave method, no matter arguments passed', async ({ arg1, arg2 }) => {
      await wrapper.vm.getSavedData(arg1, arg2)
      expect(wrapper.vm.afterSave).toHaveBeenCalledTimes(1)
    })
    it('returns data modified by afterSave hook', async () => {
      wrapper = createWrapper(VuciNamedSection, {
        props: { ...VuciSectionProps({ afterSave: vi.fn((s, res) => (res.data = 'modified')) }) },
        global: { stubs: { 'tlt-card': true }, provide: defaultProvide() }
      })
      const res = await wrapper.vm.getSavedData([{ data: 'test' }], 'test-datakey', true)
      expect(res.data).toEqual({ 'test-datakey': ['modified'] })
    })
  })
  describe('saveData', () => {
    afterEach(() => vi.clearAllMocks())
    it.each([
      { bulkRequest: false, getSavedCalls: 1 },
      { bulkRequest: true, getSavedCalls: 0 }
    ])('when bulkRequest prop is $bulkRequest, getSavedData gets called $getSavedCalls times', async ({ bulkRequest, getSavedCalls }) => {
      wrapper = createWrapper(VuciNamedSection, {
        props: { ...VuciSectionProps({ visible: true }) },
        global: {
          stubs: { 'tlt-card': true },
          provide: defaultProvide({ vuciForm: { bulkRequest } }),
          mocks: {
            $axios: vi.fn().mockResolvedValueOnce({ success: true })
          }
        }
      })
      vi.spyOn(wrapper.vm, 'getSavedData').mockResolvedValueOnce('getSavedData')
      vi.spyOn(wrapper.vm, '$axios').mockResolvedValueOnce({ success: true })
      mockComputed(wrapper, ['isVisible', ['section', { id: 'new_section', '.new_section': true }], ['sectionName', 'abuga']])
      await wrapper.vm.saveData()
      expect(wrapper.vm.getSavedData).toHaveBeenCalledTimes(getSavedCalls)
    })
    it.each([
      { visible: true, calls: 1 },
      { visible: false, calls: 0 }
    ])('when section visible: $visible it calls other methods on save $calls time', async ({ visible, calls }) => {
      wrapper = createWrapper(VuciNamedSection, {
        props: { ...VuciSectionProps({ visible, add: vi.fn() }) },
        global: {
          stubs: { 'tlt-card': true },
          provide: defaultProvide({ vuciForm: { bulkRequest: true } })
        }
      })
      vi.spyOn(wrapper.vm, 'filterOptions')
      vi.spyOn(wrapper.vm, 'save')
      mockComputed(wrapper, [
        ['section', { id: 'new_section', '.new_section': true }],
        ['sectionName', 'abuga']
      ])
      await wrapper.vm.saveData()
      expect(wrapper.vm.add).toHaveBeenCalledTimes(calls)
      expect(wrapper.vm.save).toHaveBeenCalledTimes(calls)
      expect(wrapper.vm.filterOptions).toHaveBeenCalledTimes(calls)
    })
    it.each([{ axiosReturn: vi.fn().mockResolvedValueOnce({ success: false }) }, { axiosReturn: vi.fn().mockRejectedValueOnce({ response: 422 }) }])(
      '%# invokes error handling method if request failed',
      async ({ axiosReturn }) => {
        wrapper = createWrapper(VuciNamedSection, {
          props: { ...VuciSectionProps({ visible: true }) },
          global: {
            stubs: { 'tlt-card': true },
            provide: defaultProvide({ vuciForm: { bulkRequest: false } }),
            mocks: {
              $axios: axiosReturn
            }
          }
        })
        vi.spyOn(wrapper.vm, 'handleError').mockImplementationOnce((...args) => args)
        vi.spyOn(wrapper.vm, 'getSavedData').mockResolvedValueOnce('getSavedData')
        mockComputed(wrapper, ['isVisible', ['section', { id: 'new_section', '.new_section': true }], ['sectionName', 'abuga']])
        try {
          await wrapper.vm.saveData()
        } catch (err) {
          expect(wrapper.vm.getSavedData).toHaveBeenCalledTimes(0)
          expect(wrapper.vm.handleError).toHaveBeenCalledTimes(1)
        }
      }
    )
  })
  it('updates depend form', async () => {
    wrapper.vm.forms = generateForms(1, 3)
    mockComputed(wrapper, [['dependForm', {}]])
    expect(wrapper.vm.dependForm).toEqual({})
    wrapper.vm._updateSection()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.dependForm).toEqual({
      'formItem-0': 0,
      'formItem-1': 1,
      'formItem-2': 2
    })
  })
  it.each([
    { data: [], endpoints: [{ endpoint: 'test1' }], result: 'test1' },
    { data: ['test'], endpoints: [{ endpoint: 'test1', sectionFilter: vi.fn(() => true) }], result: 'test1' },
    {
      data: ['test'],
      endpoints: [{ endpoint: 'test1', sectionFilter: vi.fn(() => false) }, { endpoint: 'bad' }],
      result: 'bad'
    }
  ])("returns section endpoint '$result' based on given data and section filters", ({ endpoints, data, result }) => {
    wrapper = createWrapper(VuciNamedSection, {
      props: VuciSectionProps({ endpoints }),
      global: { provide: defaultProvide() }
    })
    expect(wrapper.vm.getEndpoint(data)).toEqual(result)
  })
  it.each([
    {
      endpoints: [{ endpoint: 'tralialia' }],
      data: [{ id: 'test123' }, { id: 'DONT FIND ME' }],
      result: { id: 'test123' }
    },
    {
      endpoints: [{ endpoint: 'tralialia', sectionFilter: data => data[0] }],
      data: [{ id: 'test123' }, { id: 'DONT FIND ME' }],
      result: { id: 'test123' }
    }
  ])('finds currently active section from given data', ({ data, endpoints, result }) => {
    wrapper = createWrapper(VuciNamedSection, {
      props: VuciSectionProps({ endpoints, name: 'test123' }),
      global: { provide: defaultProvide() }
    })
    expect(wrapper.vm._filterSections(data)).toEqual(result)
  })
})
