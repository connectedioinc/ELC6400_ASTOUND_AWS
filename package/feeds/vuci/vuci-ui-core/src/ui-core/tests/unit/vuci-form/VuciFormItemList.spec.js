import VuciFormItemList from '@ui-core/vuci-form/src/VuciFormItemList.vue'
import createWrapper from '../mockFactory'

describe('VuciFormItemList.vue', () => {
  let wrapper

  const stubs = { 'tlt-form-model-item': true }
  const computed = { ...VuciFormItemList.computed, showOption: () => true, listFields: () => ['test1', 'test2'] }

  beforeEach(() => {
    vi.restoreAllMocks()
    wrapper = createWrapper(VuciFormItemList, { global: { stubs }, computed })
    Object.defineProperty(wrapper.vm.$refs.inputs[0], 'validate', { value: () => {} })
    Object.defineProperty(wrapper.vm.$refs.inputs[1], 'validate', { value: () => {} })
  })

  it.each`
    type            | options                      | data                                                                                                                | result
    ${'tlt-select'} | ${[]}                        | ${{}}                                                                                                               | ${[]}
    ${'tlt-select'} | ${sections => sections.data} | ${{ data: [['section1', 'data1', 'depend1'], ['section2', 'data2', 'depend2'], ['section3', 'data3', 'depend3']] }} | ${[{ depend: 'depend1', key: 'section1', value: 'data1' }, { depend: 'depend2', key: 'section2', value: 'data2' }, { depend: 'depend3', key: 'section3', value: 'data3' }]}
    ${'tlt-select'} | ${sections => sections.data} | ${{ data: ['section1', 'data1'] }}                                                                                  | ${[{ key: 'section1', value: 'section1' }, { key: 'data1', value: 'data1' }]}
    ${'tlt-select'} | ${sections => sections.data} | ${{ data: [10, 5, 20] }}                                                                                            | ${[10, 5, 20]}
    ${'any'}        | ${sections => sections.data} | ${{ data: [10, 5, 20] }}                                                                                            | ${[]}
  `('computes convertedDataSource when options is $options', ({ type, options, data, result }) => {
    wrapper = createWrapper(VuciFormItemList, {
      global: { stubs },
      props: {
        type,
        options,
        uciSection: data
      }
    })
    expect(wrapper.vm.convertedDataSource).toEqual(result)
  })

  it.each`
    model            | result
    ${'testModel'}   | ${false}
    ${[]}            | ${true}
    ${['testModel']} | ${false}
  `('computes availableModel when model is $model', async ({ model, result }) => {
    wrapper.vm.model = model
    expect(wrapper.vm.availableModel).toBe(result)
  })

  it('method modelWatcher. Sets model to empty array when model is undefined', () => {
    wrapper.vm.model = undefined
    wrapper.vm.modelWatcher()
    expect(wrapper.vm.model).toEqual([''])
  })

  it('method modelWatcher. Checks whether model has changed when model and initial value differ', () => {
    const model = ['test']
    const initialValue = ['']
    const prop = 'edit'
    wrapper = createWrapper(VuciFormItemList, {
      global: { stubs },
      computed: {
        ...VuciFormItemList.computed,
        prop() {
          return prop
        }
      }
    })
    const spy1 = vi.spyOn(wrapper.vm, '_checkIfChanged')
    const spy2 = vi.spyOn(wrapper.vm, 'emitChange')
    spy1.mockReturnValueOnce(true)
    wrapper.vm.modelWatcher(model, initialValue)
    expect(spy1).toHaveBeenCalled()
    expect(spy2).toHaveBeenCalledWith(model, initialValue)
  })

  it.each([
    { visible: false, called: false },
    { visible: true, called: true }
  ])('method initializeItem. Initializes item if item is visible.', ({ visible, called }) => {
    wrapper = createWrapper(VuciFormItemList, {
      global: { stubs },
      computed: {
        ...VuciFormItemList.computed,
        visible() {
          return visible
        }
      }
    })
    const registerSpy = vi.spyOn(wrapper.vm, 'registerInput')
    expect(registerSpy).not.toHaveBeenCalled()
    wrapper.vm.initializeItem()
    if (called) {
      expect(registerSpy).toHaveBeenCalled()
    } else {
      expect(registerSpy).not.toHaveBeenCalled()
    }
  })

  it.each`
    result              | maxlines
    ${['', '', '']}     | ${1}
    ${['', '', '']}     | ${2}
    ${['', '', '']}     | ${3}
    ${['', '', '', '']} | ${4}
    ${['', '', '', '']} | ${10}
  `('method _addField. Adds fields when maxlines: $maxlines', ({ result, maxlines }) => {
    wrapper = createWrapper(VuciFormItemList, {
      global: { stubs },
      props: {
        maxlines
      }
    })
    wrapper.vm.model = ['', '', '']
    wrapper.vm._addField()
    expect(wrapper.vm.model).toEqual(result)
  })

  it.each`
    model               | result
    ${[]}               | ${[]}
    ${['']}             | ${[]}
    ${['', '']}         | ${['']}
    ${['', '', '', '']} | ${['', '', '']}
  `('method _removeField. Removes fields when model: $model', async ({ model, result }) => {
    wrapper = createWrapper(VuciFormItemList, { global: { stubs } })
    wrapper.vm.model = model
    wrapper.vm._removeField(model.length - 1)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.model).toEqual(result)
  })

  it.each`
    value                                         | result
    ${'testValue1 testValue2 testValue3'}         | ${['testValue1', 'testValue2', 'testValue3']}
    ${['testValue1', 'testValue2', 'testValue3']} | ${['testValue1', 'testValue2', 'testValue3']}
    ${undefined}                                  | ${['']}
  `('method convertUciValue. Returns converted value', ({ value, result }) => {
    wrapper = createWrapper(VuciFormItemList, { global: { stubs } })
    const res = wrapper.vm.convertUciValue(value)
    expect(res).toEqual(result)
  })

  it.each`
    model                 | initialValue           | changed  | result
    ${['test1']}          | ${['test1']}           | ${false} | ${false}
    ${['test1']}          | ${['test1']}           | ${true}  | ${true}
    ${['test1', 'test2']} | ${['test1']}           | ${false} | ${true}
    ${['test1', 'test2']} | ${['test1', 'test30']} | ${false} | ${true}
  `('method _checkIfChanged. Checks whether model differs from inital value when model is $model and initial value is $initialValue', async ({ model, initialValue, changed, result }) => {
    wrapper = createWrapper(VuciFormItemList, { global: { stubs } })
    wrapper.vm.model = model
    await wrapper.vm.$nextTick()
    await wrapper.setData({ initialValue, changed })
    const res = wrapper.vm._checkIfChanged()
    expect(res).toEqual(result)
  })

  it.each`
    data                                          | save                                  | result
    ${['testModel1', 'testModel2', 'testModel3']} | ${(_, data) => data}                  | ${['testModel1', 'testModel2', 'testModel3']}
    ${['testModel1', 'testModel2', 'testModel3']} | ${() => ['testModel1', 'testModel2']} | ${['testModel1', 'testModel2']}
  `('method _save. Saves model value when data is $data and save hook is $save', ({ data, save, result }) => {
    wrapper = createWrapper(VuciFormItemList, {
      global: { stubs },
      props: {
        save
      }
    })
    wrapper.vm.model = data
    const res = wrapper.vm._save(data)
    expect(wrapper.vm.initialValue).toEqual(data)
    expect(wrapper.vm.tempValue).toEqual(data)
    expect(res).toEqual(result)
  })
})
