import { flushPromises } from '@vue/test-utils'
import EventsJugglerMainEditSection from '../../src/components/services/edit-sections/EventsJugglerMainEditSection.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('ventsJugglerMainEditSection.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(EventsJugglerMainEditSection, {
      props: { editType: 'actions', shouldUpdate: true }
    })
  })
  afterEach(() => {
    wrapper.unmount()
  })

  it('onmounted displays component', () => {
    expect(wrapper.find('events-juggler-action-section-stub').exists()).toBeTruthy()
    expect(wrapper.vm.isComponentVisible).toEqual(true)
  })

  it('emits on moduleSectionRef change', async () => {
    expect(wrapper.emitted()).not.toHaveProperty('module-section-ref')
    wrapper.vm.moduleSectionRef = 'new'
    await flushPromises()
    expect(wrapper.emitted()).toHaveProperty('module-section-ref')
  })

  it('returns sectionComponent', async () => {
    await wrapper.setProps({ editType: 'events' })
    expect(wrapper.find('events-juggler-event-section-stub').exists()).toBeTruthy()
  })
})
