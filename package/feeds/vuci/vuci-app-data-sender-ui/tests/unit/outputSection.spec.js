import OutputSection from '../../src/views/services/OutputSection.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Output section', () => {
  let wrapper
  const provide = {
    outputOptions: () => ({ plugins: [{ name: 'json' }] }),
    modemList: () => [{ id: '3-1', name: 'Primary modem' }],
    certificates: () => [],
    phoneGroupList: () => [{ name: 1 }, { name: 2 }],
    emailUserList: () => [{ name: 1 }, { name: 2 }]
  }
  const uciData = {
    collection: [{ id: '1', output: '2' }],
    outputs: [{ id: '2', plugin: 'http' }]
  }
  const section = { id: '2', plugin: 'http', output: '2' }
  const stubs = {
    'vuci-form-item-select': { template: '<div />' },
    'vuci-named-section': { template: '<div />' }
  }
  beforeEach(() => {
    wrapper = createWrapper(OutputSection, {
      global: { stubs, provide },
      props: {
        uciData,
        section
      }
    })
  })
  it('returns mapped plugin options', () => {
    wrapper.vm.$dataSenderParameters = { outputPluginTranslate: vi.fn().mockReturnValueOnce({ json: 'Json' }) }
    expect(wrapper.vm.pluginOptions).toEqual([['json', 'Json']])
  })
  it('returns modems', () => {
    expect(wrapper.vm.modems).toEqual([['3-1', 'Primary modem']])
  })
  it('returns phoneGroups', () => {
    expect(wrapper.vm.phoneGroups).toEqual([1, 2])
  })
  it('returns emailUsersList', () => {
    expect(wrapper.vm.emailUsers).toEqual([1, 2])
  })
  it('validates ftp day', () => {
    wrapper.vm.$VuciValidator = {
      irange: vi.fn().mockReturnValue({ isValid: false })
    }
    expect(wrapper.vm.validateFtpDay('0').isValid).toEqual(false)
    expect(wrapper.vm.validateFtpDay('-1').isValid).toEqual(true)
  })
  it.each`
    isAddSection | result
    ${true}      | ${'1'}
    ${false}     | ${'2'}
  `('returns section when add section is $isAddSection', ({ isAddSection, result }) => {
    const wrapper = createWrapper(OutputSection, {
      global: { stubs, provide },
      props: {
        uciData,
        section,
        isAddSection
      }
    })
    expect(wrapper.vm.sectionId).toEqual(result)
  })
})
