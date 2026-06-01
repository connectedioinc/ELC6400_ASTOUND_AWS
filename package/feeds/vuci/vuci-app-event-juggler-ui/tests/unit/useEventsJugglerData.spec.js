import { useEventsJugglerData } from '../../src/components/services/useEventsJugglerData'
import createWrapper from '@tests/unit/mockFactory'
import { defineComponent } from 'vue'

describe('useEventsJugglerData.ts', () => {
  let wrapper
  const TestComponent = defineComponent({
    setup() {
      return {
        ...useEventsJugglerData()
      }
    }
  })

  beforeEach(() => {
    wrapper = createWrapper(TestComponent, {
      global: {
        provide: {
          eventsJugglerOptions: {
            value: {
              eventOptions: [{ name: 'a', params: { a: 1, b: 2 } }, { name: 'b' }],
              limitData: { event: 1, action: 2, condition: 3 }
            }
          }
        }
      }
    })
  })

  it('getTranslatedModuleType returns translated module type', () => {
    expect(wrapper.vm.getTranslatedModuleType('connection')).toEqual('Connection')
    expect(wrapper.vm.getTranslatedModuleType('')).toEqual('Not selected')
  })

  it('getTranslatedFilterValues returns translated filter values', () => {
    expect(wrapper.vm.getTranslatedFilterValues(['io.name', 'unknown'])).toEqual([
      ['io.name', 'Input name'],
      ['unknown', 'unknown']
    ])
  })

  it('getConditionOptions returns', () => {
    expect(wrapper.vm.getConditionOptions({ available_conditions: ['1', '2'] }, { conditions: [{ id: '1', name: 'a' }] })).toEqual([
      ['1', 'a'],
      ['2', '2']
    ])
  })

  it('getFilterOptions returns', () => {
    expect(wrapper.vm.getFilterOptions({ plugin: 'a' })).toEqual(['a', 'b'])
  })

  it('updateUciData calls updateFn', () => {
    const func = vi.fn()
    expect(
      wrapper.vm.updateUciData(
        {
          events: [{ id: '1', name: 'a', actions: ['1', '2'] }],
          actions: [
            { id: '1', name: 'b' },
            { id: '2', name: 'c' },
            { id: '3', name: 'd' }
          ]
        },
        '1',
        func
      )
    )
    expect(func).toHaveBeenCalledWith({ id: '1', name: 'a', actions: ['1', '2'] }, [
      { id: '1', name: 'b' },
      { id: '2', name: 'c' }
    ])
  })

  it('validateAdd check is valid', () => {
    expect(wrapper.vm.validateAdd('event', [])).toEqual({ valid: true, message: 'Maximum number of Event Juggler instances has been reached' })
    expect(wrapper.vm.validateAdd('event', ['1'])).toEqual({ valid: false, message: 'Maximum number of Event Juggler instances has been reached' })
    expect(wrapper.vm.validateAdd('event', ['1', '2'], 2)).toEqual({ valid: false, message: 'Maximum number of Event Juggler instances has been reached' })
  })
})
