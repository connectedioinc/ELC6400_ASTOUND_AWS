import EventsJugglerOut from '../../src/components/services/modules/actions/EventsJugglerOut.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('EventsJugglerConditionSection.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(EventsJugglerOut, {
      global: {
        provide: {
          eventsJugglerOptions: {
            value: {
              ioData: [
                { id: '1', type: 'relay', name_with_pins: 'a1' },
                { id: '2', type: 'gpio', name_with_pins: 'a2', direction: 'out' },
                { id: '3', type: 'gpio', name_with_pins: 'a3', bi_dir: '1' },
                { id: '4', type: 'gpio', name_with_pins: 'a4', direction: 'in' },
                { id: '5', type: 'dwi', name_with_pins: 'a5' },
                { id: '6', type: 'unknown', name_with_pins: 'a6' }
              ]
            }
          }
        }
      }
    })
  })
  afterEach(() => {
    wrapper.unmount()
  })

  it('stateSetOptions returns relayOptions', async () => {
    await wrapper.setProps({ s: { out_dest: 'relay' } })
    expect(wrapper.vm.stateSetOptions).toEqual([
      { value: '0', name: 'Open' },
      { value: '1', name: 'Closed' }
    ])
  })

  it('stateSetOptions returns ioOptions', () => {
    expect(wrapper.vm.stateSetOptions).toEqual([
      { value: '0', name: 'Low' },
      { value: '1', name: 'High' }
    ])
  })

  it('controlOptions returns filtered data', () => {
    expect(wrapper.vm.controlOptions).toEqual([
      ['1', 'a1'],
      ['2', 'a2'],
      ['3', 'a3']
    ])
  })

  it('copyOptions returns filtered data', () => {
    expect(wrapper.vm.copyOptions).toEqual([
      ['1', 'a1'],
      ['2', 'a2'],
      ['3', 'a3'],
      ['4', 'a4'],
      ['5', 'a5']
    ])
  })
})
