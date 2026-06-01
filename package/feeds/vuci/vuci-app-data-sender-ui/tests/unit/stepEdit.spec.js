import StepEdit from '../../src/views/services/StepEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Data sender', () => {
  let wrapper
  const formData = {
    collection: [
      { name: 'col1', id: '1', input: ['3'], output: '2' },
      { name: 'col2', id: '4', input: ['6'], output: '5' }
    ],
    inputs: [
      { id: '3', name: 'input1' },
      { id: '6', name: 'input2' }
    ],
    outputs: [{ id: '2' }, { id: '5' }]
  }
  const section = { enabled: '1', id: '1', input: ['3', '6'], output: '2' }
  const provide = {
    editableSections: () => [{ id: '3' }, { id: '6' }],
    newInputSection: () => ({ id: '3' }),
    newOutputSection: () => ({ id: '2' }),
    collectionSection: () => ({ id: '1', input: ['3'], output: '2' })
  }
  beforeEach(() => {
    wrapper = createWrapper(StepEdit, {
      global: { provide },
      props: {
        senderUciData: formData,
        section
      }
    })
    wrapper.setData({
      formData,
      inputSectionArray: [{ id: '3' }, { id: '6' }],
      tempInputs: [{ id: '3' }, { id: '6' }],
      step: 0
    })
  })
  it.each`
    provide    | result
    ${provide} | ${[{ id: '3' }]}
  `('returns created input section', async ({ provide, result }) => {
    wrapper = createWrapper(StepEdit, {
      global: { provide },
      props: {
        senderUciData: formData,
        section
      }
    })
    wrapper.setData({
      formData,
      step: 0
    })
    wrapper.vm.onMount = vi.fn().mockReturnValue()
    expect(wrapper.vm.inputSectionArray).toEqual(result)
  })
  const formDataResult = {
    collection: [
      { name: 'col1', id: '1', input: ['3'], output: '2' },
      { name: 'col2', id: '4', input: ['6'], output: '5' }
    ],
    inputs: [{ id: '0' }],
    outputs: [{ id: '0' }]
  }
  it.each`
    form         | result
    ${formData}  | ${formDataResult}
    ${undefined} | ${{ inputs: [{ id: '0' }], outputs: [{ id: '0' }] }}
  `('returns updated uciData', async ({ form, result }) => {
    wrapper = createWrapper(StepEdit, {
      global: { provide },
      props: {
        senderUciData: formData,
        section
      }
    })
    wrapper.setData({
      formData: form,
      inputSectionArray: [{ id: '3' }, { id: '6' }],
      step: 0
    })
    wrapper.vm.removeDuplicates = vi.fn().mockReturnValue([{ id: '0' }])
    expect(wrapper.vm.updatedUciData).toEqual(result)
  })
  // const formDataFormat = {
  //   collection: [{ name: 'col1', id: '1', input: ['3'], output: '2' }],
  //   inputs: [{ id: '3' }],
  //   outputs: [{ id: '2' }]
  // }
  it('returns new array with filtered out duplicates', async () => {
    await wrapper.setData({
      inputSectionArray: [{ id: '4' }]
    })
    const data = { collection: [{ id: '1', input: ['3', '4'], output: '2' }], inputs: [{ id: '3' }, { id: '4' }], outputs: [{ id: '2' }] }
    const key = 'inputs'
    const newSection = { id: '4' }
    expect(wrapper.vm.removeDuplicates(data, key, newSection)).toEqual([{ id: '3' }, { id: '4' }])
  })
  it.each`
    step
    ${0}
    ${1}
    ${2}
  `('returns after validate function when step $step is validated', async ({ step }) => {
    wrapper.vm.step = step
    wrapper.vm.validateLastInput = vi.fn().mockResolvedValueOnce(true)
    wrapper.vm.validateSection = vi.fn().mockResolvedValueOnce(true)
    wrapper.vm.emitToParent = vi.fn().mockReturnValueOnce()
    wrapper.vm.$refs.collection.updateInputValues = vi.fn().mockReturnValueOnce()
    wrapper.vm.afterValidate = vi.fn().mockResolvedValueOnce('result')
    await expect(wrapper.vm.onSave()).resolves.toEqual('result')
  })
  it('returns one step back', async () => {
    wrapper.vm.step = 3
    wrapper.vm.back()
    expect(wrapper.vm.step).toEqual(2)
  })
  it('returns error message when step is invalid', async () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.emitToParent = vi.fn().mockReturnValueOnce()
    wrapper.vm.afterValidate(false)
    expect(spy).toHaveBeenCalledWith('Some fields are invalid')
  })
  it('returns error message when step is less than 2', async () => {
    wrapper.vm.emitToParent = vi.fn().mockReturnValueOnce()
    wrapper.vm.afterValidate(true)
    expect(wrapper.vm.step).toEqual(1)
  })
  it('returns error message when it is the last step', async () => {
    const save = () => 'result'
    wrapper.vm.step = 2
    wrapper.vm.emitToParent = vi.fn().mockReturnValueOnce()
    await expect(wrapper.vm.afterValidate(true, save)).toEqual('result')
  })
  it('returns inputs without deleted input', async () => {
    wrapper.vm.tempInputs = [{ id: '3' }, { id: '6' }]
    wrapper.vm.$axios.delete = vi.fn().mockResolvedValueOnce()
    wrapper.vm.updateTitles = vi.fn().mockReturnValueOnce()
    wrapper.vm.finalizeDelete = vi.fn().mockReturnValueOnce()
    wrapper.vm.shrinkSections = vi.fn().mockReturnValueOnce()
    expect(await wrapper.vm.onDelete('3')).toEqual()
  })
  it('returns error message when delete is failed', async () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.delete = vi.fn().mockRejectedValue()
    wrapper.vm.updateTitles = vi.fn().mockReturnValueOnce()
    wrapper.vm.finalizeDelete = vi.fn().mockReturnValueOnce()
    wrapper.vm.shrinkSections = vi.fn().mockReturnValueOnce()
    await wrapper.vm.onDelete('3')
    expect(spy).toHaveBeenCalledWith('Failed to remove data input')
  })
  it('sets data after deleting', async () => {
    wrapper.vm.finalizeDelete('3', { id: '1' }, ['3', '4'])
    expect(wrapper.vm.formData.inputs).toEqual([{ id: '6', name: 'input2' }])
    expect(wrapper.vm.inputSectionArray).toEqual([{ id: '6' }])
    expect(wrapper.vm.tempInputs).toEqual([{ id: '6' }])
  })
  it('returns added input section array', async () => {
    const self = { vuciSection: { validate: vi.fn().mockResolvedValueOnce(true) } }
    wrapper.vm.$axios.post = vi.fn().mockResolvedValueOnce({ data: { id: '9' } })
    wrapper.vm.updateTitles = vi.fn().mockReturnValueOnce()
    wrapper.vm.finalizeInputAdd = vi.fn().mockReturnValueOnce()
    wrapper.vm.shrinkSections = vi.fn().mockReturnValueOnce()
    await wrapper.vm.addInput(self)
    expect(wrapper.vm.inputSectionArray).toEqual([{ id: '3' }, { id: '6' }, { id: '9' }])
  })
  it('returns error message when validation is failed', async () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const self = { vuciSection: { validate: vi.fn().mockResolvedValueOnce(false) } }
    wrapper.vm.updateTitles = vi.fn().mockReturnValueOnce()
    wrapper.vm.finalizeInputAdd = vi.fn().mockReturnValueOnce()
    wrapper.vm.shrinkSections = vi.fn().mockReturnValueOnce()
    await wrapper.vm.addInput(self)
    expect(spy).toHaveBeenCalledWith('Some fields are invalid')
  })
  it('returns error message when add input request is failed', async () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const self = { vuciSection: { validate: vi.fn().mockResolvedValueOnce(true) } }
    wrapper.vm.shrinkSections = vi.fn().mockReturnValueOnce()
    wrapper.vm.$axios.post = vi.fn().mockRejectedValueOnce()
    wrapper.vm.updateTitles = vi.fn().mockReturnValueOnce()
    wrapper.vm.finalizeInputAdd = vi.fn().mockReturnValueOnce()
    wrapper.vm.shrinkSections = vi.fn().mockReturnValueOnce()
    await wrapper.vm.addInput(self)
    expect(spy).toHaveBeenCalledWith('Failed to add data input to collection')
  })
  it('returns error message when formData misses cert file', async () => {
    wrapper.setData({
      formData: {
        collection: [{ name: 'col1', id: '1', input: ['3'], output: '2' }],
        inputs: [{ id: '3', mqtt_in_tls: '1' }]
      }
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const self = { vuciSection: { validate: vi.fn().mockResolvedValueOnce(true) } }
    wrapper.vm.updateTitles = vi.fn().mockReturnValueOnce()
    wrapper.vm.finalizeInputAdd = vi.fn().mockReturnValueOnce()
    wrapper.vm.shrinkSections = vi.fn().mockReturnValueOnce()
    await wrapper.vm.addInput(self)
    expect(spy).toHaveBeenCalledWith('Missing required "Certificate authority file"')
  })
  it('sets data after input add', async () => {
    wrapper.vm.setFakeInput = vi.fn().mockReturnValueOnce({ id: '3', name: '', plugin: 'base' })
    wrapper.vm.emitToParent = vi.fn().mockReturnValueOnce()
    wrapper.vm.finalizeInputAdd({ id: '1' }, ['3'])
    expect(wrapper.vm.tempInputs).toEqual([
      { id: '3', name: '', plugin: 'base' },
      { id: '6', name: 'input2' }
    ])
  })
  it('returns expanded section', async () => {
    wrapper.vm.shrinkSections()
    expect(wrapper.vm.$refs.card_3[0].expanded).toEqual(false)
  })
  it('returns first section shrinked', async () => {
    wrapper.vm.shrinkSections()
    expect(wrapper.vm.$refs.card_6[0].expanded).toEqual(true)
  })
  it('returns true when section is validated', async () => {
    const ref = { $refs: { section: { validate: vi.fn().mockResolvedValueOnce(true) } } }
    await expect(wrapper.vm.validateSection(ref)).resolves.toEqual(true)
  })
  it('returns true when last input section is validated', async () => {
    wrapper.vm.$refs.input_3 = {}
    wrapper.vm.updateTitles = vi.fn().mockReturnValueOnce()
    wrapper.vm.validateSection = vi.fn().mockResolvedValueOnce(true)
    await expect(wrapper.vm.validateLastInput()).resolves.toEqual(true)
  })
  it('returns input with template values', async () => {
    const input = { id: '3' }
    expect(wrapper.vm.setFakeInput(input)).toEqual({ id: '3', name: '', plugin: 'base' })
  })
  it('returns input with template values', async () => {
    wrapper.setData({
      inputSectionArray: [{ id: '3', name: 'inpt1' }]
    })
    wrapper.vm.updateTitles()
    expect(wrapper.vm.inputTitles).toEqual(['Data "inpt1" configuration'])
  })
})
