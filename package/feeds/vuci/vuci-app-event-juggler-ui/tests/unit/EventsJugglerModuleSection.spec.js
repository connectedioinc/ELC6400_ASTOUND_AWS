import EventsJugglerModuleSection from '../../src/components/services/base-sections/EventsJugglerModuleSection.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('EventsJugglerModuleSection.vue', () => {
  let wrapper
  vi.mock('../../src/components/services/useEventsJugglerData', () => ({
    useEventsJugglerData: () => {
      return {
        getTranslatedModuleType: vi.fn(val => val)
      }
    }
  }))
  beforeEach(() => {
    wrapper = createWrapper(EventsJugglerModuleSection, {
      props: {
        moduleType: 'conditions',
        section: { id: 1 }
      },
      global: {
        provide: {
          eventsJugglerOptions: { value: { modules: { conditions: { x: '', y: '' } } } }
        }
      }
    })
  })
  afterEach(() => {
    wrapper.unmount()
    vi.clearAllMocks()
  })

  it('returns moduleComponentData', () => {
    expect(wrapper.vm.moduleComponentData).toEqual({
      endpoint: 'event_juggler/conditions/config',
      name: 'conditions',
      title: 'condition'
    })
  })

  it('returns nameLabel', () => {
    expect(wrapper.vm.nameLabel).toEqual('Condition name')
  })

  it('returns componentModules', () => {
    expect(wrapper.vm.componentModules).toEqual({ x: '', y: '' })
    wrapper.vm.onModuleRemove('y')
    expect(wrapper.vm.componentModules).toEqual({ x: '' })
  })

  it('getTranslatedModuleOptions returns translated data', () => {
    expect(wrapper.vm.getTranslatedModuleOptions({ mod1: '', mod2: '' })).toEqual([
      ['', 'Not selected'],
      ['mod1', 'mod1'],
      ['mod2', 'mod2']
    ])
  })

  it('returns typeBindOptions', () => {
    expect(wrapper.vm.typeBindOptions).toEqual({
      label: 'Condition type',
      options: [
        ['', 'Not selected'],
        ['x', 'x'],
        ['y', 'y']
      ]
    })
  })

  it('setModuleBeforeSave emits value', () => {
    wrapper.vm.setModuleBeforeSave('test', 'test_name')
    expect(wrapper.vm.componentRefs).toHaveProperty('test_name', 'test')
    expect(wrapper.emitted()).toHaveProperty('module-before-save')
  })

  it('onModuleRemove adds to filterModules', () => {
    wrapper.vm.onModuleRemove('x')
    expect(wrapper.vm.filterModules).toEqual(['x'])
  })
})
