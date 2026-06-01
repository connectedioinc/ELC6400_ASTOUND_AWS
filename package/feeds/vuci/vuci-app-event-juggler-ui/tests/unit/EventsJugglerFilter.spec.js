import EventsJugglerFilter from '../../src/components/services/modules/conditions/EventsJugglerFilter.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('EventsJugglerFilter.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(EventsJugglerFilter, {
      props: {
        s: {
          filter_name: 'filter'
        }
      },
      global: {
        provide: {
          eventsJugglerOptions: {
            value: { eventOptions: [{ name: 'a1', params: { filter: 'bool' } }, { name: 'a2', params: { filter: 'string' } }, { name: 'a3' }, { name: 'a4', params: { filter: 'int' } }] }
          }
        }
      }
    })
  })
  afterEach(() => {
    wrapper.unmount()
  })

  it('onMounted emitts if no filterOptions', () => {
    expect(wrapper.emitted('remove-module')).toHaveProperty('filter')
  })

  it('valueDataType filters data', async () => {
    await wrapper.setProps({ parentSection: { plugin: 'a1' } })
    expect(wrapper.vm.valueDataType).toEqual('bool')
    await wrapper.setProps({ parentSection: { plugin: 'a2' } })
    expect(wrapper.vm.valueDataType).toEqual('string')
    await wrapper.setProps({ parentSection: { plugin: 'a3' } })
    expect(wrapper.vm.valueDataType).toEqual(undefined)
  })

  it('operatorOptions returns data', async () => {
    await wrapper.setProps({ parentSection: { plugin: 'a1' } })
    expect(wrapper.vm.operatorOptions).toEqual([
      ['eq', 'Equals'],
      ['ne', 'Not equals']
    ])
    await wrapper.setProps({ parentSection: { plugin: 'a2' } })
    expect(wrapper.vm.operatorOptions).toEqual([
      ['eq', 'Equals'],
      ['ne', 'Not equals'],
      ['in', 'In (a set of values)']
    ])
  })

  it('filterValueProps returns data', async () => {
    await wrapper.setProps({ parentSection: { plugin: 'a4' } })
    expect(wrapper.vm.filterValueProps).toEqual({
      is: 'vuci-form-item-input',
      required: true,
      rules: 'uinteger'
    })
    await wrapper.setProps({ parentSection: { plugin: 'a1' } })
    expect(wrapper.vm.filterValueProps).toEqual({
      is: 'vuci-form-item-switch',
      required: false,
      rules: 'string'
    })
  })

  it('renders component based on valueDataType value', async () => {
    expect(wrapper.find("vuci-form-item-input[name='filter_value']").exists()).toBeTruthy()
    await wrapper.setProps({ parentSection: { plugin: 'a1' } })
    expect(wrapper.find("vuci-form-item-switch[name='filter_value']").exists()).toBeTruthy()
  })
})
