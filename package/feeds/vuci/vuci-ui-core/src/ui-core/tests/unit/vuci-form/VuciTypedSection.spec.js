import VuciTypedSection from '@ui-core/vuci-form/src/VuciTypedSection.vue'
import createWrapper from '../mockFactory'
import tltCardStub from '../stubs/tltCardStub'

const temp = {
  id: '1',
  '.type': 'templates',
  title: 'Template A',
  description: 'Template A description',
  default: '0'
}

const stubs = {
  'tlt-button': tltCardStub,
  'tlt-modal': tltCardStub,
  'tlt-card': tltCardStub,
  'tlt-input-search': true,
  'tlt-form': true,
  'tlt-dnd': true,
  'tlt-table': true
}

const provide = {
  vuciForm: {
    vuciSections: {},
    initialForm: {},
    uciData: {
      templates: [temp]
    },
    updateUciData: vi.fn()
  },
  configName: 'templates',
  emitTitle: () => {}
}

const props = {
  endpoints: [{ endpoint: 'wireless/devices' }],
  dataKey: 'devices',
  type: 'devices',
  data: [temp],
  selected: temp,
  addForm: { name: '' }
}

const defaultMocks = {
  global: { stubs, provide },
  props
}

describe('VuciTypedSection.vue', () => {
  let wrapper = createWrapper(VuciTypedSection, {
    ...defaultMocks
  })
  const methods = Object.keys(wrapper.vm)

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it.each`
    method
    ${'createSection'}
    ${'_createSectionTempLogic'}
    ${'delSection'}
    ${'_closeEdit'}
    ${'_groupSections'}
    ${'getData'}
    ${'saveData'}
  `('component contains $method method', ({ method }) => {
    expect(methods.includes(method)).toBeTruthy()
    expect(typeof wrapper.vm[method]).toBe('function')
  })

  describe('method _createSectionTempLogic', () => {
    const tempId = 'new123'
    const section = {
      id: tempId
    }
    it('template section is created', async () => {
      const response = {
        success: true,
        data: []
      }
      wrapper = createWrapper(VuciTypedSection, {
        ...defaultMocks
      })
      const spy = vi.spyOn(wrapper.vm, 'getEndpoint').mockReturnValueOnce('devices')
      wrapper.vm.$axios = vi.fn()
      wrapper.vm.$axios.mockResolvedValueOnce(response)
      const res = await wrapper.vm._createSectionTempLogic(section)
      expect(spy).toHaveBeenCalledWith([section])
      expect(res).toEqual({ newSection: [], uciData: { devices: [[]] } })
    })

    it('template section creation is unsuccessful', async () => {
      const response = {
        success: false,
        data: []
      }
      wrapper = createWrapper(VuciTypedSection, {
        ...defaultMocks
      })
      const spy = vi.spyOn(wrapper.vm, 'getEndpoint').mockReturnValueOnce('devices')
      const spy2 = vi.spyOn(wrapper.vm, 'handleError')
      wrapper.vm.$axios = vi.fn()
      wrapper.vm.$axios.mockResolvedValueOnce(response)
      return wrapper.vm._createSectionTempLogic(section).catch(err => {
        expect(spy).toHaveBeenCalledWith([section])
        expect(spy2).toHaveBeenCalledWith('create', response)
        expect(err).toEqual('Failed to create configuration')
      })
    })

    it('template section creation is rejected', async () => {
      const e = {
        response: {
          status: 422,
          data: {
            errors: [{ code: 109 }]
          }
        }
      }
      wrapper = createWrapper(VuciTypedSection, {
        ...defaultMocks
      })
      const spy = vi.spyOn(wrapper.vm, 'getEndpoint').mockReturnValueOnce('devices')
      wrapper.vm.$axios = vi.fn()
      wrapper.vm.$axios.mockRejectedValueOnce(e)
      return wrapper.vm._createSectionTempLogic(section).catch(err => {
        expect(spy).toHaveBeenCalledWith([section])
        expect(err).toEqual('Name already used for a configuration')
      })
    })

    it('template section creation is rejected when name is already used', async () => {
      const e = {
        response: {
          status: 400
        }
      }
      wrapper = createWrapper(VuciTypedSection, {
        ...defaultMocks
      })
      const spy = vi.spyOn(wrapper.vm, 'getEndpoint').mockReturnValueOnce('templates')
      const spy2 = vi.spyOn(wrapper.vm, 'handleError')
      wrapper.vm.$axios = vi.fn()
      wrapper.vm.$axios.mockRejectedValueOnce(e)
      return wrapper.vm._createSectionTempLogic(section).catch(err => {
        expect(spy).toHaveBeenCalledWith([section])
        expect(spy2).toHaveBeenCalledWith('create', e.response)
        expect(err).toEqual('Failed to create configuration')
      })
    })
  })

  it('method _closeEdit. Closes edit form', () => {
    const data = {
      templates: [
        {
          id: '1',
          '.type': 'templates',
          title: 'Template A',
          description: 'Template A description',
          default: '1'
        },
        {
          id: '2',
          '.type': 'templates',
          title: 'Template B',
          description: 'Template B description',
          default: '1'
        }
      ]
    }
    wrapper = createWrapper(VuciTypedSection, {
      ...defaultMocks
    })
    wrapper.vm.editableSection.id = '1'
    wrapper.vm._closeEdit(data)
    expect(wrapper.vm.editOpen).toBe(false)
    expect(wrapper.vm.editableSection).toEqual({ empty: true })
    expect(wrapper.vm.vuciForm.updateUciData).toHaveBeenCalledOnce()
    expect(wrapper.emitted('edit-modal-closed')).toBeTruthy()
  })

  it('method _resetAddForm', () => {
    wrapper = createWrapper(VuciTypedSection, {
      ...defaultMocks
    })
    wrapper.vm._skipValidation = vi.fn()
    wrapper.vm._resetAddForm()
    expect(wrapper.vm.addModel).toEqual(wrapper.vm.initialAddForm)
    expect(wrapper.vm._skipValidation).toHaveBeenCalled()
  })

  it('method _skipValidation', async () => {
    wrapper = createWrapper(VuciTypedSection, {
      ...defaultMocks
    })
    wrapper.vm._skipValidation()
    expect(wrapper.vm.noValidate).toBe(true)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.noValidate).toBe(false)
  })

  describe('method _groupSections', () => {
    it.each`
      endpoints                                                                | result
      ${[{ endpoint: 'network/wireless/templates' }]}                          | ${[{ data: [{ '.type': 'templates', default: '0', description: 'Template A description', id: '1', title: 'Template A' }], endpoint: 'network/wireless/templates' }]}
      ${[{ endpoint: 'network/wireless/templates', sectionFilter: () => {} }]} | ${[{ data: [], endpoint: 'network/wireless/templates' }]}
    `('Groups sections when endpoints are $endpoints', ({ endpoints, result }) => {
      wrapper = createWrapper(VuciTypedSection, {
        global: { stubs, provide },
        props: {
          endpoints,
          dataKey: 'templates',
          type: 'templates',
          data: [
            {
              id: '1',
              title: 'Template A',
              '.type': 'templates',
              description: 'Template A description',
              default: '0'
            }
          ]
        }
      })
      const res = wrapper.vm._groupSections(defaultMocks.global.provide.vuciForm.uciData.templates)
      expect(res).toEqual(result)
    })
  })

  describe('method getEndpoint', () => {
    it.each`
      endpoints                                                                                                                                        | data     | result
      ${[{ endpoint: 'network/wireless/templates' }]}                                                                                                  | ${[]}    | ${'network/wireless/templates'}
      ${[{ endpoint: 'network/wireless/templates', sectionFilter: () => true }, { endpoint: 'network/wireless/templates2', sectionFilter: () => {} }]} | ${['1']} | ${'network/wireless/templates'}
      ${[{ endpoint: 'network/wireless/templates' }, { endpoint: 'network/wireless/templates2' }]}                                                     | ${['1']} | ${'network/wireless/templates'}
    `('Gets endpoint when endpoints are $endpoints and data is $data', ({ endpoints, data, result }) => {
      wrapper = createWrapper(VuciTypedSection, {
        global: { stubs, provide },
        props: {
          endpoints,
          dataKey: 'templates',
          type: 'templates',
          data: [
            {
              id: '1',
              title: 'Template A',
              '.type': 'templates',
              description: 'Template A description',
              default: '0'
            }
          ]
        }
      })
      const res = wrapper.vm.getEndpoint(data)
      expect(res).toEqual(result)
    })
  })

  it('method getData. Gets converted endpoints', () => {
    const result = [{ dataKey: 'devices', endpoints: ['/api/wireless/devices'] }]
    wrapper = createWrapper(VuciTypedSection, {
      ...defaultMocks
    })
    const res = wrapper.vm.getData()
    expect(res).toEqual(result)
  })
})
