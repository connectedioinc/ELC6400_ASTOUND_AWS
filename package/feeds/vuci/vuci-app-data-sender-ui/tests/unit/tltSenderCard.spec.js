import TltSenderCard from '../../src/components/services/TltSenderCard.vue'
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
  const section = { enabled: '1', id: '1', input: ['3', '6'], output: '2' }
  const provide = {
    limitData: () => ({ max_inputs: 1 }),
    inputOptions: () => ({ plugins: [{ name: 'json' }] }),
    outputOptions: () => ({ plugins: [{ name: 'http' }, { name: 'mqtt' }] })
  }
  const cardIds = ['1', '4']
  beforeEach(() => {
    wrapper = createWrapper(TltSenderCard, {
      global: { provide },
      props: {
        section,
        uciData: formData,
        cardIds
      }
    })
  })
  it('returns filtered output', async () => {
    wrapper.vm.$dataSenderParameters = { outputPluginTranslate: vi.fn().mockReturnValue({ http: 'HTTP' }) }
    expect(wrapper.vm.findOutput).toEqual({ id: '2' })
  })
  it.each`
    data                | result
    ${{ http: 'HTTP' }} | ${'HTTP'}
    ${{}}               | ${'-'}
  `('returns translated output', async ({ data, result }) => {
    wrapper = createWrapper(TltSenderCard, {
      global: {
        provide,
        mocks: {
          $dataSenderParameters: { outputPluginTranslate: vi.fn().mockReturnValue(data) }
        }
      },
      props: {
        section,
        uciData: { ...formData, outputs: [{ id: '2', plugin: 'http' }] },
        cardIds
      }
    })
    expect(wrapper.vm.translateOutput).toEqual(result)
  })
  it('returns read only for add button', async () => {
    expect(wrapper.vm.inputAddReadOnly).toEqual(true)
  })
  const column1 = {
    item: { id: '3', plugin: 'base', format: 'json' },
    columns: [[{ customRender: 'data_type' }, { label: 'Format type', value: 'Json' }]]
  }
  const column2 = {
    item: { id: '3', plugin: 'nonsense', format: 'nonsense' },
    columns: [[{ customRender: 'data_type' }, { label: 'Format type', value: '-' }]]
  }
  it.each`
    input                                                  | result
    ${{ id: '3', plugin: 'base', format: 'json' }}         | ${column1}
    ${{ id: '3', plugin: 'nonsense', format: 'nonsense' }} | ${column2}
  `('returns input columns', async ({ input, result }) => {
    wrapper = createWrapper(TltSenderCard, {
      global: {
        provide,
        mocks: {
          $dataSenderParameters: { inputPluginTranslate: vi.fn().mockReturnValue({ base: 'Base' }), formatTranslate: vi.fn().mockReturnValue({ json: 'Json' }) }
        }
      },
      props: {
        section,
        uciData: formData,
        cardIds
      }
    })
    expect(wrapper.vm.inputColumns(input)).toEqual(result)
  })
  it('returns true if plugin is included in options', async () => {
    const s = { id: '3' }
    const section = { input: ['3'] }
    expect(wrapper.vm.filterSectionData(s, section)).toEqual(true)
  })
  it('sets collection input after delete', async () => {
    const s = { id: '3' }
    wrapper.vm.afterDelete(s)
    expect(wrapper.vm.uciData.collection).toEqual([
      { name: 'col1', id: '1', input: ['6'], output: '2' },
      { name: 'col2', id: '4', input: ['6'], output: '5' }
    ])
  })
  it('sets collection input after add', async () => {
    wrapper.vm.afterAdd(undefined, { uciData: formData, newSection: { id: '7' } })
    expect(wrapper.vm.uciData.collection).toEqual([
      { name: 'col1', id: '1', input: ['3', '6', '7'], output: '2' },
      { name: 'col2', id: '4', input: ['6'], output: '5' }
    ])
  })
  it('returns updated data after modal close', async () => {
    const data = {}
    wrapper.vm.modalClosed(data)
    expect(data).toEqual({
      collection: [
        { name: 'col1', id: '1', input: ['3', '6', '7'], output: '2' },
        { name: 'col2', id: '4', input: ['6'], output: '5' }
      ],
      inputs: [{ id: '3' }, { id: '6' }]
    })
  })
})
