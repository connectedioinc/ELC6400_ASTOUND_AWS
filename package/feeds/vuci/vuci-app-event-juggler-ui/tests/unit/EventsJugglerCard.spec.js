import EventsJugglerCard from '../../src/components/services/EventsJugglerCard.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('EventsJugglerCard.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(EventsJugglerCard, {
      props: { section: { id: '1' }, uciData: { events: [{ id: 1 }] }, cardIds: ['1'] }
    })
  })
  afterEach(() => {
    wrapper.unmount()
  })

  it('getParentIndex returns', async () => {
    const uciData = { events: [{ id: '1' }, { id: '2' }] }
    await wrapper.setProps({ section: { id: '1' } })
    expect(wrapper.vm.getParentIndex(uciData)).toEqual(0)
    await wrapper.setProps({ section: { id: '2' } })
    expect(wrapper.vm.getParentIndex(uciData)).toEqual(1)
    await wrapper.setProps({ section: { id: '3' } })
    expect(wrapper.vm.getParentIndex(uciData)).toEqual(-1)
  })

  it('handleAfterAdd adds action', async () => {
    const uciData = { events: [{ id: '1', actions: [] }, { id: '2' }] }
    await wrapper.setProps({ section: { id: '1' } })
    wrapper.vm.handleAfterAdd('', { newSection: { id: '1' }, uciData: uciData })
    expect(uciData.events[0].actions).toEqual(['1'])
    wrapper.vm.handleAfterAdd('', { newSection: { id: '2' }, uciData: uciData })
    expect(uciData.events[0].actions).toEqual(['1', '2'])
  })

  it('handleAfterDelete removes action', async () => {
    const uciData = { events: [{ id: '1', actions: ['1', '2'] }, { id: '2' }] }
    await wrapper.setProps({ section: { id: '1' } })
    wrapper.vm.handleAfterDelete({ id: '1' }, uciData)
    expect(uciData.events[0].actions).toEqual(['2'])
    wrapper.vm.handleAfterDelete({ id: '2' }, uciData)
    expect(uciData.events[0].actions).toEqual([])
  })
})
