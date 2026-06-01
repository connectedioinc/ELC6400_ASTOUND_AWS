import EventsJugglerIo from '../../src/components/services/modules/conditions/EventsJugglerIo.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('EventsJugglerIo.vue', () => {
  let wrapper
  vi.mock('../../src/components/services/modules/useEventsJugglerModuleData', () => ({
    useEventsJugglerModuleData: () => {
      return {
        isTypeSelected: true,
        isBidirectionalSelected: vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false),
        getIoProps: vi.fn()
      }
    },
    moduleProps: {
      s: {}
    }
  }))
  beforeEach(() => {
    wrapper = createWrapper(EventsJugglerIo, {
      global: {
        provide: {
          eventsJugglerOptions: {
            value: {
              ioData: [
                { id: '1', type: 'dwi', name_with_pins: 'test1' },
                { id: '2', type: 'gpio', direction: 'in', name_with_pins: 'test2' },
                { id: '3', type: 'gpio', direction: 'out', bi_dir: '1', name_with_pins: 'test3' },
                { id: '4', type: 'gpio', direction: 'out', bi_dir: '0', name_with_pins: 'test4' },
                { id: '5', type: 'acl', name_with_pins: 'test5' },
                { id: '6', type: 'test', name_with_pins: 'test6' }
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

  it('if isBidirectionalSelected displays warning', async () => {
    expect(wrapper.find('tlt-inline-message-stub').exists()).toBeTruthy()
    await wrapper.setProps({ s: 1 })
    expect(wrapper.find('tlt-inline-message-stub').exists()).toBeFalsy()
  })

  it('pinStateOptions returns options', async () => {
    expect(wrapper.vm.pinStateOptions).toEqual([
      { value: '0', name: 'Low' },
      { value: '1', name: 'High' }
    ])
    await wrapper.setProps({ s: { io_cond_name: 'relay' } })
    expect(wrapper.vm.pinStateOptions).toEqual([
      { value: '0', name: 'Open' },
      { value: '1', name: 'Closed' }
    ])
  })

  it('ioOptions returns available pin names', async () => {
    expect(wrapper.vm.ioOptions).toEqual([
      ['1', 'test1'],
      ['2', 'test2'],
      ['3', 'test3'],
      ['4', 'test4'],
      ['5', 'test5']
    ])
  })

  it('isAclSelected returns', async () => {
    await wrapper.setProps({ s: { io_cond_name: 'acl' } })
    expect(wrapper.vm.isAclSelected).toBeTruthy()
    await wrapper.setProps({ s: { io_cond_name: 'a' } })
    expect(wrapper.vm.isAclSelected).toBeFalsy()
  })

  it('isAdcSelected returns', async () => {
    await wrapper.setProps({ s: { io_cond_name: 'adc' } })
    expect(wrapper.vm.isAdcSelected).toBeTruthy()
    await wrapper.setProps({ s: { io_cond_name: 'a' } })
    expect(wrapper.vm.isAdcSelected).toBeFalsy()
    await wrapper.setProps({ s: { io_cond_name: 'pwr' } })
    expect(wrapper.vm.isAdcSelected).toBeTruthy()
  })

  it('isIoSelected returns', async () => {
    await wrapper.setProps({ s: { io_cond_name: '1' } })
    expect(wrapper.vm.isIoSelected).toBeTruthy()
    await wrapper.setProps({ s: { io_cond_name: '5' } })
    expect(wrapper.vm.isIoSelected).toBeFalsy()
    await wrapper.setProps({ s: { io_cond_name: '6' } })
    expect(wrapper.vm.isIoSelected).toBeFalsy()
  })
})
