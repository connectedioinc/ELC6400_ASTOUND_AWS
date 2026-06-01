import VuciForm from '@ui-core/vuci-form/src/VuciForm.vue'
import { formBus } from '@ui-core/vuci-form'
import formHelper from '@ui-core/utils/form-helper'
import createWrapper from '../mockFactory'
import { useMessages } from '@/stores/messages'

vi.mock('@ui-core/plugins/messages')
const sectionMock = options => ({
  dataKey: options.key || options.name,
  callMethod: {
    get: options.getImpl?.() || (() => []),
    edit: options.edit?.() || vi.fn().mockResolvedValueOnce({})
  },
  validate: options.validate || (() => true),
  load: options.load || (() => {}),
  updateAfterSave: options.updateAfterSave || (() => {}),
  saveable: options.saveable || false,
  visible: true,
  sectionId: 'id',
  getSavedData: vi.fn(async data => ({ data: { [options.key]: data }, overwrite: true })),
  handleError: vi.fn(type => `${type}: data...`),
  invalidInputs: []
})

describe('VuciForm', () => {
  let wrapper
  let message
  beforeEach(() => {
    wrapper = createWrapper(VuciForm, { global: { provide: { setModalTitle: vi.fn() } } })
    message = useMessages()
    vi.clearAllMocks()
  })
  afterEach(() => {
    wrapper.unmount()
  })

  it.each([
    ['uci objects', { id: '1', '.type': 'type' }, { id: '1', '.type': 'type' }, true],
    ['js objects', { id: '1', '.type': 'type' }, { property: 1 }, false]
  ])('compares two entries as %s', (name, obj1, obj2, expected) => {
    const res = wrapper.vm._compareEntries(obj1, obj2)
    expect(res).toEqual(expected)
  })

  describe('Hooks', () => {
    it('mounted calls functions based on given extraLoad: $extraLoad asyncLoad: $asyncLoad props', async () => {
      wrapper = createWrapper(VuciForm, { props: { extraLoad: vi.fn(() => Promise.resolve('test')) } })
      vi.spyOn(wrapper.vm, '_loadData').mockResolvedValueOnce({})
      await wrapper.vm.loadData()
      expect(wrapper.vm._loadData).toHaveBeenCalled()
      expect(wrapper.vm.extraLoad).toHaveBeenCalled()
    })
    it('beforeUnmount removes upload listeners', () => {
      vi.spyOn(formBus, 'off').mockReturnValueOnce()
      wrapper.unmount()
      expect(formBus.off).toHaveBeenCalledTimes(2)
    })
    it('caches add-upload event and attaches received object to components state', async () => {
      const uid = wrapper.vm.uid
      const uploadObj = { prop: 'test123', type: 'i am upload' }
      const emitString = `add-upload-to-form-${uid}`
      formBus.emit(emitString, uploadObj)
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.fileUploads).toEqual({ [uploadObj.prop]: uploadObj })
    })
    it('caches remove-upload event and deletes received object from components state', async () => {
      const uid = wrapper.vm.uid
      const uploadObj = { prop: 'test123', type: 'i am upload' }
      const removeEmit = `remove-upload-from-form-${uid}`
      const addEmit = `add-upload-to-form-${uid}`
      formBus.emit(addEmit, uploadObj)
      expect(wrapper.vm.fileUploads).toEqual({ [uploadObj.prop]: uploadObj })
      formBus.emit(removeEmit, uploadObj)
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.fileUploads).toEqual({})
    })
  })

  it.each([
    ['uciData', 'test1', { data: 123 }],
    ['initialForm', 'test1', { data: 123 }]
  ])("updates data on %s object's %s key with value of %o", (key, dataKey, newData) => {
    expect(wrapper.vm[key]).toEqual({})
    wrapper.vm.updateUciData(newData, dataKey)
    expect(wrapper.vm[key]).toEqual({ [dataKey]: newData })
  })
  it('uciData and intialForm points to two different objects', () => {
    wrapper.vm.updateUciData({ test: { abc: 'this is test' } })
    expect(wrapper.vm.uciData).toStrictEqual(wrapper.vm.initialForm)
    expect(wrapper.vm.uciData).not.toBe(wrapper.vm.initialForm)
  })
  it.each([
    [{}, []],
    [
      {
        test1: { uploadFile: () => Promise.resolve('uploaded') },
        test2: { uploadFile: () => Promise.resolve('error') }
      },
      ['uploaded', 'error']
    ]
  ])('invokes all gathered file uploads and returns their results', async (uploadsData, expectedResult) => {
    wrapper.setData({
      fileUploads: uploadsData
    })
    const result = await wrapper.vm._uploadFiles()
    expect(result).toEqual(expectedResult)
  })
  it('_afterLoad calls afterLoad function ', async () => {
    const mock = vi.fn(() => Promise.resolve({ data: [1, 2, 3] }))
    wrapper = createWrapper(VuciForm, { props: { afterLoad: mock } }, 'VuciForm')
    await wrapper.vm._afterLoad()
    expect(mock).toHaveBeenCalledTimes(2) // two times because it is called in mounted hook as well.
    expect(wrapper.vm.uciData).toEqual({ data: [1, 2, 3] })
  })
  it('sets title only once per form', () => {
    wrapper.vm.emitTitle()
    wrapper.vm.emitTitle()
    expect(wrapper.vm.setModalTitle).toHaveBeenCalledTimes(1)
  })
  it.each([
    { endpointVal: [[], []], overwrite: false, compareCalls: 0, result: { test: [] }, initialUci: { test: [] }, responses: [] },
    {
      endpointVal: [['/api/test'], ['test']],
      overwrite: false,
      compareCalls: 1,
      result: { test: [{ id: 'test', prop1: 'prop1', prop2: 'prop2' }] },
      initialUci: { test: [{ id: 'test', prop1: 'prop1' }] },
      responses: [{ data: [{ id: 'test', prop2: 'prop2' }] }]
    },
    {
      endpointVal: [['/api/test'], ['test']],
      overwrite: false,
      compareCalls: 1,
      result: { test: [{ id: 'test1', _children: [{ id: 'test2', prop1: 'prop1' }] }] },
      initialUci: { test: [{ id: 'test1', _children: [{ id: 'test2' }] }] },
      responses: [{ data: [{ id: 'test2', prop1: 'prop1' }] }]
    },
    {
      endpointVal: [['/api/test'], ['test']],
      overwrite: true,
      compareCalls: 1,
      initialUci: { test: [{ id: '123' }, { id: '124' }] },
      result: { test: [{ id: 'labas' }] },
      responses: [{ data: [{ id: 'labas' }] }]
    }
  ])('loads data', async ({ endpointVal, overwrite, compareCalls, result, initialUci, responses }) => {
    wrapper.setData({
      uciData: initialUci
    })
    vi.spyOn(wrapper.vm, '_getEndpoints').mockReturnValueOnce(endpointVal)
    vi.spyOn(wrapper.vm, '_compareEntries').mockReturnValueOnce(true)
    vi.spyOn(wrapper.vm.$axios, 'bulkGet').mockResolvedValueOnce(responses)
    const res = await wrapper.vm._loadData(overwrite)
    expect(res).toEqual({ data: result, responses })
    expect(wrapper.vm._getEndpoints).toHaveBeenCalled()
    expect(wrapper.vm._compareEntries).toHaveBeenCalledTimes(compareCalls)
  })
  it.each([
    {
      sections: {
        sec1: sectionMock({ getImpl: () => vi.fn().mockReturnValueOnce([]) }),
        sec2: sectionMock({ getImpl: () => vi.fn().mockReturnValueOnce([]) })
      },
      result: [[], []]
    },
    {
      sections: {
        sec1: sectionMock({
          key: 'sec1',
          getImpl: () => vi.fn().mockReturnValueOnce([{ endpoints: ['endpoint1', 'endpoint2'], dataKey: 'sec1' }])
        }),
        sec2: sectionMock({
          key: 'sec2',
          getImpl: () => vi.fn().mockReturnValueOnce([{ endpoints: ['endpoint3', 'endpoint4'], dataKey: 'sec2' }])
        })
      },
      result: [
        ['endpoint1', 'endpoint2', 'endpoint3', 'endpoint4'],
        ['sec1', 'sec1', 'sec2', 'sec2']
      ]
    }
  ])('loads endpoints of registered sections', ({ sections, result }) => {
    wrapper.setData({
      vuciSections: { ...sections }
    })
    expect(wrapper.vm._getEndpoints()).toEqual(result)
  })
  it.each([
    { validateResults: [true, true, true], result: true },
    { validateResults: [true, false, true], result: false }
  ])('validate invokes all vuci section validate methods', async ({ validateResults, result }) => {
    wrapper.setData({
      vuciSections: {
        sec1: sectionMock({ validate: () => validateResults[0] }),
        sec2: sectionMock({ validate: () => validateResults[1] }),
        sec3: sectionMock({ validate: () => validateResults[2] })
      }
    })
    expect(wrapper.vm.validate()).toHaveProperty(['then'])
    const res = await wrapper.vm.validate()
    expect(res).toEqual(result)
  })
  it('_loadSections invokes all vuci section load methods', async () => {
    const sections = {
      sec1: sectionMock({ name: 'sec1', load: () => {} }),
      sec2: sectionMock({ name: 'sec2', load: () => {} }),
      sec3: sectionMock({ name: 'sec3', load: () => {} })
    }
    const loadSpies = Object.entries(sections).map(([, sec]) => vi.spyOn(sec, 'load'))
    await wrapper.setData({ vuciSections: sections })
    const uciData = { dataKey1: [] }
    await wrapper.setData({ uciData })
    const spinnerSpy = vi.spyOn(wrapper.vm, '$spin')
    wrapper.vm._loadSections()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.loaded).toBe(true)
    expect(spinnerSpy).toHaveBeenCalledWith(false)
    loadSpies.forEach(spy => expect(spy).toHaveBeenCalledWith(uciData))
  })
  it.each([
    { mObj: [], ids: [], expectedCalls: 0 },
    { mObj: [{ overwrite: true, data: { la: [] } }], ids: ['la'], expectedCalls: 1 }
  ])('merges given mergeObject array to uciData', ({ mObj, ids, expectedCalls }) => {
    formHelper.mergeSections = vi.fn().mockReturnValueOnce({})
    wrapper.vm.mergeToUci(mObj, ids)
    expect(formHelper.mergeSections).toHaveBeenCalledTimes(expectedCalls)
    if (mObj.length > 0) {
      expect(formHelper.mergeSections).toHaveBeenCalledWith(wrapper.vm.uciData, mObj[0].data, {
        identifier: ids[0],
        overwrite: mObj[0].overwrite
      })
    }
  })
  it('save successfully saves data', async () => {
    wrapper = createWrapper(VuciForm, { props: { beforeSave: vi.fn().mockResolvedValueOnce(true) } }, 'VuciForm')
    formBus.emit = vi.fn()
    const spy = vi.spyOn(wrapper.vm, 'saveData').mockResolvedValueOnce({})
    await wrapper.vm.save()
    expect(message.error).not.toHaveBeenCalled()
    expect(spy).toHaveBeenCalled()
  })
  it('shows error message when beforeSave fails on save', async () => {
    wrapper = createWrapper(VuciForm, { props: { beforeSave: vi.fn().mockRejectedValueOnce('error') } }, 'VuciForm')
    message = useMessages()
    formBus.emit = vi.fn()
    vi.spyOn(wrapper.vm, 'saveData').mockResolvedValueOnce({})
    expect(message.error).not.toHaveBeenCalled()
    await wrapper.vm.save()
    expect(message.error).toHaveBeenCalled()
  })
  it.each([
    { editing: false, saveData: vi.fn().mockResolvedValueOnce(), saveDataCalls: 1, formBusEv: 'forms-applied-api' },
    { editing: true, saveData: vi.fn().mockResolvedValueOnce(), saveDataCalls: 0, formBusEv: 'save-and-apply' }
  ])('when editing is $editing saveData is called $saveDataCalls times', async params => {
    wrapper = createWrapper(VuciForm, { props: { editing: params.editing } }, 'VuciForm')
    const formBusSpy = vi.spyOn(formBus, 'emit')
    wrapper.vm.saveData = vi.fn().mockImplementationOnce(() => Promise.resolve({}))
    await wrapper.vm.save()
    expect(wrapper.vm.saveData).toHaveBeenCalledTimes(params.saveDataCalls)
    if (!params.editing) expect(formBusSpy).toHaveBeenCalled()
  })
  it('after sucessful saveData resolve initialForm is updated and vuci section methods are called', async () => {
    const loadMock = vi.fn().mockImplementation(() => 'load')
    const saveMock = vi.fn().mockImplementation(() => 'save')
    const sections = {
      sec1: sectionMock({
        load: loadMock,
        updateAfterSave: saveMock
      }),
      sec2: sectionMock({
        load: loadMock,
        updateAfterSave: saveMock
      })
    }
    wrapper.setData({
      vuciSections: sections
    })
    const resolvable = { data1: ['new data'] }
    const saveDataSpy = vi.spyOn(wrapper.vm, 'saveData').mockResolvedValueOnce(resolvable)
    await wrapper.vm.save()
    await wrapper.vm.$nextTick()
    expect(saveDataSpy).toHaveBeenCalled()
    expect(wrapper.vm.initialForm).toEqual(resolvable)
    expect(loadMock).toHaveBeenCalled(2)
    expect(saveMock).toHaveBeenCalled(2)
  })
  describe('saveData', () => {
    it.each([
      { validateReturn: false, fileUpload: true, saveResponse: true },
      { validateReturn: true, fileUpload: false, saveResponse: true },
      { validateReturn: true, fileUpload: true, saveResponse: false },
      { validateReturn: true, fileUpload: true, saveResponse: true }
    ])('on any outer method return spinner always gets called 2 times', async ({ validateReturn, fileUpload, saveResponse }) => {
      vi.spyOn(wrapper.vm, '$spin')
      vi.spyOn(wrapper.vm, 'validate').mockResolvedValueOnce(validateReturn)
      vi.spyOn(wrapper.vm, 'handleFileUpload').mockResolvedValueOnce(fileUpload)
      vi.spyOn(wrapper.vm, 'handleSave').mockResolvedValueOnce(saveResponse)
      await wrapper.vm.saveData(null, true)
      expect(wrapper.vm.$spin).toHaveBeenLastCalledWith(false)
      expect(wrapper.vm.$spin).toHaveBeenNthCalledWith(1, 'Waiting for configuration to be applied...')
    })
  })
  describe('handleSave', () => {
    const sections = {
      sec1: sectionMock({ saveable: () => true }),
      sec2: sectionMock({ saveable: () => true }),
      sec3: sectionMock({ saveable: () => false })
    }
    it.each([
      {
        calls: 'handleBulkSave',
        bulkRequest: true,
        methodReturn: true
      },
      {
        calls: 'handleBulkSave',
        bulkRequest: true,
        methodReturn: false
      },
      {
        calls: 'mergeToUci',
        bulkRequest: false,
        methodReturn: true
      }
    ])('calls $calls when bulkSave prop is set to $bulkRequest', async ({ methodReturn, calls, bulkRequest }) => {
      wrapper = createWrapper(VuciForm, { props: { bulkRequest } })
      vi.spyOn(wrapper.vm, calls).mockResolvedValueOnce(methodReturn)
      const result = await wrapper.vm.handleSave(sections)
      expect(wrapper.vm[calls]).toHaveBeenCalled()
      expect(result).toEqual(methodReturn)
    })
    it.each([
      { calls: 'handleBulkSave', rejects: 'error!!!', bulkRequest: true },
      { calls: 'handleBulkSave', rejects: 'onab!!!', bulkRequest: true },
      { calls: 'handleBulkSave', rejects: 'abccc!!!', bulkRequest: true }
    ])('on failed save step returns false and shows message $rejects', async ({ calls, rejects, bulkRequest }) => {
      wrapper = createWrapper(VuciForm, { props: { bulkRequest } })
      wrapper.vm[calls] = vi.fn().mockRejectedValueOnce(rejects)
      const messageSpy = vi.spyOn(wrapper.vm.$message, 'error')
      const result = await wrapper.vm.handleSave(sections)
      expect(messageSpy).toHaveBeenCalledWith(rejects)
      expect(result).toEqual(false)
    })
  })
  describe('handleFileUpload', () => {
    it.each([
      { response: true, uploadReturn: [], messageCalls: 0 },
      { response: true, uploadReturn: [{ success: true }, { success: true }], messageCalls: 0 },
      { response: false, uploadReturn: [{ success: false, name: 'test123' }, { success: true }], messageCalls: 1 }
    ])('returns $response when _uploadFiles returns $uploadReturn', async ({ response, uploadReturn, messageCalls }) => {
      const messageSpy = vi.spyOn(wrapper.vm.$message, 'error')
      wrapper.vm._uploadFiles = vi.fn().mockResolvedValueOnce(uploadReturn)
      const res = await wrapper.vm.handleFileUpload()
      expect(res).toEqual(response)
      expect(messageSpy).toHaveBeenCalledTimes(messageCalls)
    })
    it('displays error messages based on uploadFiles response', () => {
      wrapper.vm._uploadFiles = vi.fn().mockResolvedValueOnce([
        { file: 'file1', success: true },
        { file: 'file12', success: false, handler: 'error while uploading' },
        { file: 'file13', success: false, handler: 'JUST ERROR' },
        { file: 'file15', success: false, handler: 'unga-bunga' },
        { file: 'file16', success: false }
      ])
      const messageCalls = ['error while uploading: file12', 'JUST ERROR: file13', 'unga-bunga: file15', 'Failed to upload file (low memory): file16']
      const messageSpy = vi.spyOn(wrapper.vm.$message, 'error')
      messageCalls.forEach((c, index) => expect(messageSpy).toHaveBeenNthCalledWith < c > index)
    })
  })
  describe('handleBulkSave', () => {
    const sections = [sectionMock({ key: 'sec1' }), sectionMock({ key: 'sec2' }), sectionMock({ key: 'sec3' })]
    // const generateBadResponse = (data)
    it.each([
      { sections: [], requests: [] },
      { sections, requests: [[{ data: {} }], [{ data: {} }], [{ data: {} }]] }
    ])('always calls mergeToUci exactly once', async ({ sections, requests }) => {
      vi.spyOn(wrapper.vm, 'mergeToUci').mockReturnValueOnce({})
      await wrapper.vm.handleBulkSave(sections, requests)
      expect(wrapper.vm.mergeToUci).toHaveBeenCalledTimes(1)
    })
    it.each([
      { failOn: [0, 1], requests: [[{ data: {} }], [{ data: {} }], [{ data: 123 }]] },
      { failOn: [1], requests: [[{ data: {} }], [{ data: {} }], [{ data: 123 }]] },
      { failOn: [2], requests: [[{ data: {} }], [{ data: {} }], [{ data: 123 }]] }
    ])('calls section error handler only on failed requests, handleBulkSave returns false', async ({ failOn, requests }) => {
      const messageSpy = vi.spyOn(wrapper.vm.$message, 'error')
      const sectionArray = Object.values(sections)
      vi.spyOn(wrapper.vm, 'mergeToUci').mockReturnValueOnce({})
      wrapper.vm.$axios.bulk = vi.fn(data => Promise.resolve(data.map((d, index) => ({ success: !failOn.includes(index), errors: [], data: d }))))
      const result = await wrapper.vm.handleBulkSave(sectionArray, requests)
      failOn.forEach(idx => expect(sectionArray[idx].handleError).toHaveBeenCalledWith('edit', expect.any(Object)))
      expect(result).toEqual(false)
      expect(messageSpy)
    })
    it.each([
      { sections: [], requests: [] },
      {
        sections,
        requests: [[{ data: 'data1' }], [{ data: 'data2' }, { data: 'data2-2' }], [{ data: 'data3' }, { data: 'data3-2' }]]
      }
    ])("calls mergeToUci with right section id's and responses", async ({ sections, requests }) => {
      vi.spyOn(wrapper.vm, 'mergeToUci').mockReturnValueOnce({})
      sections.forEach(s => expect(s.getSavedData().then).toBeTruthy())
      await wrapper.vm.handleBulkSave(sections, requests)
    })
  })
})
