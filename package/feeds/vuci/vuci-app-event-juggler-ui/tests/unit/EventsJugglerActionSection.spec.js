import EventsJugglerActionSection from '../../src/components/services/base-sections/EventsJugglerActionSection.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('EventsJugglerActionSection.vue', () => {
  let wrapper
  const getWrapper = available_conditions =>
    createWrapper(EventsJugglerActionSection, {
      props: {
        uciData: {},
        hideTitle: false,
        section: { plugin: 'test_plugin' }
      },
      global: {
        stubs: {
          'module-section': { template: '<slot name="additionalOptions" />' },
          'vuci-form-item-select': { template: '<div> <slot name="help" /></div>' }
        },
        provide: {
          parentSection: {
            available_conditions: available_conditions
          }
        }
      }
    })
  afterEach(() => {
    wrapper.unmount()
  })

  it('if section has plugin display additionalOptions', async () => {
    wrapper = getWrapper([])
    expect(wrapper.find('p').exists()).toBeTruthy()
    await wrapper.setProps({ section: {} })
    expect(wrapper.find('p').exists()).toBeFalsy()
  })

  it('on operator disabled show according message', async () => {
    wrapper = getWrapper(['condition1', 'condition2'])
    expect(wrapper.find('p').text()).toEqual('And - all added conditions must evaluate to true.')
    wrapper = getWrapper(['condition1'])
    expect(wrapper.find('p').text()).toEqual('Add at least 2 conditions to enable this field.')
  })
})
