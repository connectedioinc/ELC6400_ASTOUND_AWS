import DataSender from '../../src/views/services/DataSender.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Data sender', () => {
  let wrapper
  const formData = {
    collection: [
      { name: 'col1', id: '1', input: ['3'], output: '2' },
      { name: 'col2', id: '4', input: ['6'], output: '5' }
    ],
    inputs: [{ id: '3' }, { id: '6' }],
    outputs: [{ id: '2' }, { id: '5' }]
  }
  const inputOptions = { plugins: [{ name: 'json' }] }
  const outputOptions = { plugins: [{ name: 'http' }, { name: 'mqtt' }] }
  beforeEach(() => {
    wrapper = createWrapper(DataSender)
    wrapper.setData({
      formData
    })
  })
  const form = { dataSender: [{ collection: 'collection' }] }
  it('loads data', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: true, data: 'inputs' },
      { success: true, data: 'outputs' }
    ])
    const res = await wrapper.vm.loadData(form)
    wrapper.vm.handleCardStateUpdate = vi.fn().mockReturnValueOnce()
    expect(res).toEqual({ dataSender: [{ collection: 'collection' }], inputs: 'inputs', outputs: 'outputs' })
  })
  it.each`
    input
    ${{ plugin: 'basic', format: 'json', format_str: 'str' }}
    ${{}}
  `('returns $error message when fails to load data', async ({ input }) => {
    const res = wrapper.vm.inputColumns(input)
    expect(res).toEqual({
      item: input,
      columns: [
        [
          { label: 'Data input type', value: input?.plugin || '-' },
          { label: 'Format type', value: input?.format || '-' },
          { label: 'Format string', value: input?.format_str || '-' }
        ]
      ]
    })
  })
  it.each`
    error
    ${'Failed to load data inputs'}
    ${'Failed to load servers'}
  `('returns $error message when fails to load data', async ({ error }) => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([{ success: false }, { success: false }])
    const spyError = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData(form)
    expect(spyError).toHaveBeenCalledWith(error)
  })
  it('returns unexpected error message when fails to load data', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    const spyError = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    await wrapper.vm.loadData(form)
    expect(spyError).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('loads extra data', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: true, data: 'inputOptions' },
      { success: true, data: 'outputOptions' },
      { success: true, data: 'formatOptions' },
      { success: true, data: 'encoderOptions' },
      { success: true, data: 'limitData' },
      { success: true, data: 'azureData' },
      { success: true, data: 'ioData' },
      { success: true, data: 'phoneGroupsData' },
      { success: true, data: 'emailUsersData' },
      { success: true, data: 'zoneData' }
    ])
    wrapper.vm.$mobile.parseModems = vi.fn().mockReturnValueOnce({ id: '3-1' })
    await wrapper.vm.extraLoad()
    expect(wrapper.vm.inputOptions).toEqual('inputOptions')
    expect(wrapper.vm.outputOptions).toEqual('outputOptions')
    expect(wrapper.vm.formatOptions).toEqual('formatOptions')
    expect(wrapper.vm.encoderOptions).toEqual('encoderOptions')
    expect(wrapper.vm.limitData).toEqual('limitData')
    expect(wrapper.vm.azureSections).toEqual('azureData')
    expect(wrapper.vm.ioData).toEqual('ioData')
    expect(wrapper.vm.phoneGroupsData).toEqual('phoneGroupsData')
    expect(wrapper.vm.emailUserList).toEqual('emailUsersData')
  })
  it.each`
    error
    ${'Failed to load data input options'}
    ${'Failed to load server options'}
    ${'Failed to load format type options'}
    ${'Failed to load instance limit data'}
    ${'Failed to load Azure IoT Hub data'}
    ${'Failed to load I/O data'}
    ${'Failed to load phone group data'}
    ${'Failed to load email users'}
  `('returns "$error" message when fails to load data', async ({ error }) => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: false },
      { success: false },
      { success: false },
      { success: false },
      { success: false },
      { success: false },
      { success: false },
      { success: false },
      { success: false },
      { success: false }
    ])
    const spyError = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.extraLoad()
    expect(spyError).toHaveBeenCalledWith(error)
  })
  it('returns unexpected error message when fails to load data', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    const spyError = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    await wrapper.vm.extraLoad()
    expect(spyError).toHaveBeenCalledWith('An unexpected error occurred')
  })
  const afterAddData = {
    uciData: {},
    newSection: { id: 1, input: ['3'], output: '2' }
  }
  it('loads data in after add', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: true, data: { id: '3' } },
      { success: true, data: { id: '2' } }
    ])
    await wrapper.vm.afterAdd('', afterAddData)
    expect(wrapper.vm.inputSection).toEqual({ id: '3' })
    expect(wrapper.vm.outputSection).toEqual({ id: '2' })
  })
  it.each`
    error
    ${'Failed to load created data input'}
    ${'Failed to load created server'}
  `('returns $error message when fails to load created data in after add', async ({ error }) => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([{ success: false }, { success: false }])
    const spyError = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterAdd('', afterAddData)
    expect(spyError).toHaveBeenCalledWith(error)
  })
  it('returns unexpected error message when fails to load data in after add', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    const spyError = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    await wrapper.vm.afterAdd('', afterAddData)
    expect(spyError).toHaveBeenCalledWith('An unexpected error occurred')
  })
  const deletedData = {
    collection: [
      { name: 'col1', id: '1', input: ['3'], output: '2' },
      { name: 'col2', id: '4', input: ['6'], output: '5' }
    ],
    inputs: [{ id: '6' }],
    outputs: [{ id: '5' }]
  }
  it.each`
    collection                                | result
    ${{ id: '1' }}                            | ${formData}
    ${{ id: '1', input: ['3'], output: '2' }} | ${deletedData}
  `('sets formData after delete', ({ collection, result }) => {
    wrapper.vm.afterDelete(collection)
    expect(wrapper.vm.formData).toEqual(result)
  })
  it.each`
    code   | result
    ${106} | ${'Only a total of 10 collections can be created'}
    ${0}   | ${'An unexpected error occurred'}
  `('returns $result error message when collection is invalid', ({ code, result }) => {
    wrapper.vm.limitData = { max_collections: 10 }
    const res = wrapper.vm.addError({ data: { errors: [{ code }] } })
    expect(res).toEqual(result)
  })
  it('returns undefined when collection is valid', () => {
    const section = { enabled: '0', enable_validate: false }
    const res = wrapper.vm.validateCollection(section)
    expect(res).toEqual(undefined)
  })
  it.each`
    inputs                                                      | result
    ${[{ id: '3' }, { id: '6' }]}                               | ${'To enable collection, it is required that all data inputs assigned to this collection are configured'}
    ${[{ id: '3', name: 'inpt1' }, { id: '6', name: 'inpt2' }]} | ${'To enable collection, server section assigned to this collection should be configured'}
  `('returns $result error when collection is valid', ({ inputs, result }) => {
    const spyError = vi.spyOn(wrapper.vm.$message, 'error')
    const section = { enabled: '1', enable_validate: false, output: '2', input: ['3'] }
    wrapper.setData({
      formData: { inputs }
    })
    wrapper.vm.validateCollection(section)
    expect(spyError).toHaveBeenCalledWith(result)
  })
  it.each`
    promise      | formData                                                                                                                                                               | result
    ${'rejects'} | ${{ collection: [{ enabled: '1', name: 'col1', id: '1', input: ['3'] }], inputs: [{ id: '3' }] }}                                                                      | ${'Cannot save enabled "col1" collection, it is required that all data inputs assigned to this collection are configured'}
    ${'rejects'} | ${{ collection: [{ enabled: '1', name: 'col1', id: '1', input: ['3'], output: '2' }], inputs: [{ name: 'inpt1', id: '3' }], outputs: [{ name: 'output1', id: '2' }] }} | ${'Cannot save enabled "col1" collection, it is required that output assigned to this collection is configured'}
  `('$promise promise when collection is validated', async ({ promise, formData, result }) => {
    wrapper.setData({
      formData
    })
    wrapper.vm.inputOptions = inputOptions
    wrapper.vm.outputOptions = outputOptions
    await expect(wrapper.vm.validate())[promise].toEqual(result)
  })
  it('sets updated uciData and modal close flag', () => {
    const data = { uciData: 'data', flag: false }
    wrapper.vm.editInputAdd(data)
    expect(wrapper.vm.updatedUciData).toEqual('data')
    expect(wrapper.vm.updateDataAfterClose).toEqual(false)
  })
  it.each`
    stepEditCollectionId | updateDataAfterClose | updatedUciData                                    | result
    ${false}             | ${true}              | ${{ collection: 'col', inputs: 'input' }}         | ${{ collection: 'col', inputs: 'input' }}
    ${false}             | ${false}             | ${{ collection: 'col', inputs: 'input' }}         | ${{ collection: '-', inputs: '-' }}
    ${false}             | ${false}             | ${{}}                                             | ${{ collection: '-', inputs: '-' }}
    ${'1'}               | ${true}              | ${{ collection: [{ id: '1' }], inputs: 'input' }} | ${{ collection: [{ id: '1', enabled: '0' }], inputs: 'input' }}
  `('sets collection and inputs with updated data', ({ stepEditCollectionId, updateDataAfterClose, updatedUciData, result }) => {
    wrapper.setData({
      updatedUciData,
      updateDataAfterClose,
      stepEditCollectionId
    })
    const data = { collection: '-', inputs: '-' }
    wrapper.vm.modalClosed(data)
    expect(data).toEqual(result)
  })
})
