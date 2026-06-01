import CollectionSection from '../../src/views/services/CollectionSection.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Collection section', () => {
  let wrapper
  const stubs = {
    'vuci-named-section': { template: '<div />' }
  }
  const provide = {
    formatOptions: () => ['json']
  }
  const uciData = {
    collection: [{ id: '1', inputs: ['3, 5'], name: 'col1' }],
    inputs: [
      { id: '3', format: 'json', plugin: 'base', name: 'input1' },
      { id: '4', format: 'json', plugin: 'base', name: 'input2' },
      { id: '5', format: 'json', plugin: 'base' }
    ]
  }
  const section = { id: '1', input: ['3', '4'] }

  beforeEach(() => {
    wrapper = createWrapper(CollectionSection, {
      global: { stubs, provide },
      props: {
        uciData,
        section
      }
    })
  })
  it.each`
    result                                                                                                  | section                           | uciData
    ${[{ description: 'input1', parameter: '%input1%' }, { description: 'input2', parameter: '%input2%' }]} | ${{ id: '1', input: ['3', '4'] }} | ${{ inputs: [{ id: '3', format: 'json', plugin: 'base', name: 'input1' }, { id: '4', format: 'json', plugin: 'base', name: 'input2' }] }}
    ${[]}                                                                                                   | ${{ id: '1' }}                    | ${{}}
  `('returns formated plugin parameters when uciData is $uciData', ({ result, section, uciData }) => {
    const wrapper = createWrapper(CollectionSection, {
      global: { stubs },
      props: {
        uciData,
        section
      }
    })
    expect(wrapper.vm.formattedParameters).toEqual(result)
  })
  it.each`
    result                                              | section                           | uciData
    ${'{ "input1": "%input1%", "input2": "%input2%" }'} | ${{ id: '1', input: ['3', '4'] }} | ${{ inputs: [{ id: '3', format: 'json', plugin: 'base', name: 'input1' }, { id: '4', format: 'json', plugin: 'base', name: 'input2' }] }}
    ${''}                                               | ${{ id: '1' }}                    | ${{}}
  `('returns formated placeholder', ({ result, section, uciData }) => {
    const wrapper = createWrapper(CollectionSection, {
      global: { stubs, provide },
      props: {
        uciData,
        section
      }
    })
    expect(wrapper.vm.formatPlaceholder).toEqual(result)
  })
  it('returns mapped format typed options', () => {
    wrapper.vm.$dataSenderParameters = { formatTranslate: vi.fn().mockReturnValueOnce({ json: 'Json' }) }
    expect(wrapper.vm.formatTypeOptions).toEqual([['json', 'Json']])
  })
  it.each`
    result                                                            | uciData
    ${{ isValid: false, message: "Instance 'col1' already exists." }} | ${{ collection: [{ id: '1', inputs: ['3'], name: 'col1' }, { id: '2', inputs: ['4'], name: 'col1' }] }}
    ${{ isValid: true }}                                              | ${{ collection: [{ id: '1', inputs: ['3'], name: 'col1' }] }}
  `('returns formated placeholder', ({ result, uciData }) => {
    const wrapper = createWrapper(CollectionSection, {
      global: { stubs, provide },
      props: {
        uciData,
        section
      }
    })
    expect(wrapper.vm.collectionNameExists('col1')).toEqual(result)
  })
  it('returns error message when section is enabled', () => {
    const s = { enabled: '1', input: ['3', '4', '5'] }
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.validateCollection(s)
    expect(spy).toHaveBeenCalledWith('To enable collection, it is required that all data inputs assigned to this collection are configured')
  })
  it('returns undefined when section is not enabled', () => {
    const s = { enabled: '0', input: ['3', '4', '5'] }
    expect(wrapper.vm.validateCollection(s)).toEqual(undefined)
  })
  it.each`
    options                                                | res
    ${['10:15', '10:16', '10:18', '11:18', '10:15']}       | ${{ 10: { 15: true, 16: false, 18: false }, 11: { 18: false } }}
    ${['10:15,16', '10:16,15,17', '11:18', '11:01,02,18']} | ${{ 10: { 15: true, 16: true, 17: false }, 11: { 18: true, '01': false, '02': false } }}
    ${['*:15,16', '*:16,15,17', '11:18', '*:*']}           | ${{ '*': { 15: true, 16: true, 17: false, '*': false }, 11: { 18: false } }}
    ${[':10,11', '01:10,11,', '1:12,13,11', '10,11']}      | ${{ '': { 10: false, 11: false }, '01': { 10: false, 11: false, '': false }, 1: { 12: false, 13: false, 11: false }, '10,11': { '': false } }}
  `('updateTimeData sets timeData with hour,minute : key,value pairs', ({ options, res }) => {
    wrapper.vm.updateTimeData(null, options)
    expect(wrapper.vm.timeData).toEqual(res)
  })
  it.each`
    time            | res
    ${'10:10'}      | ${{ isValid: true }}
    ${'1:10'}       | ${{ isValid: false }}
    ${'01:10'}      | ${{ isValid: true }}
    ${'10:1'}       | ${{ isValid: false }}
    ${'10:01'}      | ${{ isValid: true }}
    ${'*:1'}        | ${{ isValid: false }}
    ${'**:01'}      | ${{ isValid: false }}
    ${'01:***'}     | ${{ isValid: false }}
    ${'*:01'}       | ${{ isValid: true }}
    ${'*:*'}        | ${{ isValid: true }}
    ${'10:'}        | ${{ isValid: false }}
    ${'10'}         | ${{ isValid: false }}
    ${'10:10,11'}   | ${{ isValid: true }}
    ${'10:10,1,11'} | ${{ isValid: false }}
    ${'10:*'}       | ${{ isValid: true }}
  `('timeValidation returns generic error if not valid: $time => $res.isValid', ({ time, res }) => {
    wrapper.vm.updateTimeData(null, [time])
    const message = 'Time of format hh:mm, hh:mm,mm, *:mm, *:mm,mm , hh:*, or *:* is accepted.'
    expect(wrapper.vm.timeValidation(time)).toEqual({ ...res, ...(!res.isValid && { message: message }) })
  })
  it.each`
    time           | res
    ${'10:*,11'}   | ${{ isValid: false }}
    ${'10:*,11,*'} | ${{ isValid: false }}
    ${'10:*,*,*'}  | ${{ isValid: false }}
    ${'10:*'}      | ${{ isValid: true }}
  `('timeValidation returns error if "*" minute value is used with extra minute values seperated by ",": $time => $res.isValid', ({ time, res }) => {
    wrapper.vm.updateTimeData(null, [time])
    const message = "It's not possible to use multiple minute values when '*' (every minute wildcard) is selected."
    expect(wrapper.vm.timeValidation(time)).toEqual({ ...res, ...(!res.isValid && { message: message }) })
  })
  it.each`
    options                                                    | time       | res
    ${['10:15', '10:16']}                                      | ${'10:15'} | ${{ isValid: true }}
    ${['10:15', '10:15']}                                      | ${'10:15'} | ${{ isValid: false, hour: '10', minute: '15' }}
    ${['10:15', '10:16,15']}                                   | ${'10:15'} | ${{ isValid: false, hour: '10', minute: '15' }}
    ${['10:13,12,11,15', '10:16,15,17']}                       | ${'10:15'} | ${{ isValid: false, hour: '10', minute: '15' }}
    ${['10:*', '10:*']}                                        | ${'10:*'}  | ${{ isValid: false, hour: '10', minute: '*' }}
    ${['*:10', '*:15,10']}                                     | ${'*:10'}  | ${{ isValid: false, hour: '*', minute: '10' }}
    ${['*:*', '*:*']}                                          | ${'*:*'}   | ${{ isValid: false, hour: '*', minute: '*' }}
    ${['*:15,16', '*:16,15,17', '11:18', '*:*']}               | ${'*:15'}  | ${{ isValid: false, hour: '*', minute: '15' }}
    ${['*:15,16', '*:16,15,17', '11:18', '*:*']}               | ${'*:16'}  | ${{ isValid: false, hour: '*', minute: '16' }}
    ${['*:15,16', '*:16,15,17', '11:18', '*:*']}               | ${'11:18'} | ${{ isValid: true }}
    ${[':10,11', '01:10,11,', '1:12,13,11', '10,11', '01:10']} | ${'01:10'} | ${{ isValid: false, hour: '01', minute: '10' }}
    ${[':10,11', '01:10,11,', '1:12,13,11', '10,11', '01:10']} | ${'01:11'} | ${{ isValid: true }}
  `('timeValidation returns error if minute value is already used in another option', ({ options, time, res }) => {
    wrapper.vm.updateTimeData(null, options)
    const message = "'%s' minute value for hour '%s' is already used.".format(res.minute, res.hour)
    delete res.minute
    delete res.hour
    expect(wrapper.vm.timeValidation(time)).toEqual({ ...res, ...(!res.isValid && { message: message }) })
  })
})
