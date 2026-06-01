import InputSection from '../../src/views/services/InputSection.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Input section', () => {
  let wrapper
  const provide = {
    inputOptions: () => ({ plugins: [{ name: 'json' }] }),
    modemList: () => [{ id: '3-1', name: 'Primary modem' }],
    certificates: () => [],
    collectionSection: () => ({ id: '1' }),
    editableSections: () => [{}, {}],
    formatOptions: () => ['json'],
    limitData: () => ({ max_inputs: 1 }),
    ioData: () => [
      {
        id: 'din1',
        direction: 'in',
        type: 'gpio',
        name_with_pins: '1'
      },
      {
        id: 'dout1',
        type: 'bad',
        direction: 'out',
        name_with_pins: '2'
      }
    ],
    eventsAvailable: () => ({ Config: ['all', 'avl', 'bgp'] })
    // networkOptions: () => ['lan', 'hotspot']
  }
  const uciData = {
    collection: [{ id: '1', input: ['3', '4'], output: '2' }],
    inputs: [{ id: '3', format: 'json', plugin: 'base', name: 'input1' }],
    outputs: [{ id: '2', plugin: 'http' }]
  }
  const section = { id: '3', format: 'json', plugin: 'base', name: 'input1' }
  const stubs = {
    'vuci-form-item-select': { template: '<div />' },
    'vuci-named-section': { template: '<div />' }
  }
  beforeEach(() => {
    wrapper = createWrapper(InputSection, {
      global: { stubs, provide },
      props: {
        uciData,
        section
      }
    })
  })
  it('returns mapped plugin options', () => {
    wrapper.vm.$dataSenderParameters = { inputPluginTranslate: vi.fn().mockReturnValueOnce({ json: 'Json' }) }
    expect(wrapper.vm.pluginOptions).toEqual([['json', 'Json']])
  })
  it.each`
    input                    | result
    ${{ plugin: 'base' }}    | ${[{ description: 'Time Now', parameter: '%time%' }]}
    ${{ plugin: undefined }} | ${[]}
  `('returns mapped plugin parameters', async ({ input, result }) => {
    const wrapper = createWrapper(InputSection, {
      global: { stubs, provide },
      props: {
        uciData: { ...uciData, inputs: [{ ...uciData.inputs[0], ...input }] },
        section
      }
    })
    await wrapper.setData({ pluginOptionTranslate: { base: [['time', 'Time Now']] } })
    expect(wrapper.vm.formattedParameters).toEqual(result)
  })
  it.each`
    isAddSection | result
    ${false}     | ${undefined}
    ${true}      | ${true}
  `('returns read only $result', ({ isAddSection, result }) => {
    const wrapper = createWrapper(InputSection, {
      global: { stubs, provide },
      props: {
        uciData,
        isAddSection,
        section
      }
    })
    expect(wrapper.vm.inputAddReadOnly).toEqual(result)
  })
  it('returns input section', () => {
    const wrapper = createWrapper(InputSection, {
      global: { stubs, provide },
      props: {
        uciData,
        section
      }
    })
    expect(wrapper.vm.inputSection).toEqual({ id: '3', format: 'json', plugin: 'base', name: 'input1' })
  })
  it('returns mapped format typed options', () => {
    const wrapper = createWrapper(InputSection, {
      global: { stubs, provide },
      props: {
        uciData: {
          inputs: [
            { id: '3', format: 'json', plugin: 'base', name: 'input1' },
            { id: '6', format: 'json', plugin: 'base', name: 'input1' }
          ],
          collection: [{ enabled: '1', retry: '0', id: '1', output: '2', period: '60', input: ['3', '6'], format: 'json', name: 'Test' }]
        },
        section
      }
    })
    wrapper.vm.$dataSenderParameters = {
      inputPluginTranslate: vi.fn().mockReturnValue({ json: 'Json' })
    }
    expect(wrapper.vm.pluginOptions).toEqual([['json', 'Json']])
    expect(wrapper.vm.$dataSenderParameters.inputPluginTranslate).toHaveBeenCalled()
  })
  it('returns mapped modem options', () => {
    expect(wrapper.vm.modems).toEqual([['3-1', 'Primary modem']])
  })
  it('returns io options', () => {
    expect(wrapper.vm.ioOptions).toEqual([['din1', '1']])
  })
  it.each`
    value       | result
    ${'input1'} | ${{ isValid: false, message: "Instance 'input1' already exists." }}
    ${'input2'} | ${{ isValid: true }}
  `('returns input section', ({ value, result }) => {
    const wrapper = createWrapper(InputSection, {
      global: { stubs, provide },
      props: {
        uciData: {
          inputs: [
            { id: '3', format: 'json', plugin: 'base', name: 'input1' },
            { id: '6', format: 'json', plugin: 'base', name: 'input1' }
          ]
        },
        section
      }
    })
    expect(wrapper.vm.inputNameExists(value)).toEqual(result)
  })
  it.each`
    value          | result
    ${'bluetooth'} | ${'{"TS": "%timestamp%", "D": "%bdate%", "data": %data%}'}
    ${'base'}      | ${'{ TS: "%time%", name: "%name%", id: "%id%" }'}
    ${'test'}      | ${''}
  `('returns input section', ({ value, result }) => {
    section.plugin = value
    const wrapper = createWrapper(InputSection, {
      global: { stubs, provide },
      props: {
        uciData: {
          inputs: [
            { id: '3', format: 'json', plugin: 'base', name: 'input1' },
            { id: '6', format: 'json', plugin: 'base', name: 'input1' }
          ]
        },
        section
      }
    })
    expect(wrapper.vm.placeholder).toEqual(result)
  })
})
