import EventsJugglerIo from '../../src/components/services/modules/events/EventsJugglerIo.vue'
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
                { id: '5', type: 'acl', name_with_pins: 'test5' }
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

  it('displays warning if isBidirectionalSelected', async () => {
    expect(wrapper.find('tlt-inline-message-stub').exists()).toBeTruthy()
    await wrapper.setProps({ s: null })
    expect(wrapper.find('tlt-inline-message-stub').exists()).toBeFalsy()
  })

  it('ioOptions returns options', () => {
    expect(wrapper.vm.ioOptions).toEqual([
      ['1', 'test1'],
      ['2', 'test2'],
      ['3', 'test3'],
      ['5', 'test5']
    ])
  })

  it('isAclSelected returns', async () => {
    await wrapper.setProps({ s: { io_name: 'acl' } })
    expect(wrapper.vm.isAclSelected).toBeTruthy()
    await wrapper.setProps({ s: { io_name: 'a' } })
    expect(wrapper.vm.isAclSelected).toBeFalsy()
  })

  it('isAdcSelected returns', async () => {
    await wrapper.setProps({ s: { io_name: 'adc' } })
    expect(wrapper.vm.isAdcSelected).toBeTruthy()
    await wrapper.setProps({ s: { io_name: 'a' } })
    expect(wrapper.vm.isAdcSelected).toBeFalsy()
    await wrapper.setProps({ s: { io_name: 'pwr' } })
    expect(wrapper.vm.isAdcSelected).toBeTruthy()
  })

  it('isDwiSelected returns', async () => {
    await wrapper.setProps({ s: { io_name: 'dwi' } })
    expect(wrapper.vm.isDwiSelected).toBeTruthy()
    await wrapper.setProps({ s: { io_name: 'd' } })
    expect(wrapper.vm.isDwiSelected).toBeFalsy()
  })

  it('isGpioSelected returns', async () => {
    expect(wrapper.vm.isGpioSelected).toBeFalsy()
    await wrapper.setProps({ s: { io_name: '3' } })
    expect(wrapper.vm.isGpioSelected).toBeTruthy()
  })

  it('isGpio checks if gpio', () => {
    expect(wrapper.vm.isGpio()).toBeFalsy()
    expect(wrapper.vm.isGpio(wrapper.vm.ioData[1])).toBeTruthy()
    expect(wrapper.vm.isGpio(wrapper.vm.ioData[2])).toBeTruthy()
    expect(wrapper.vm.isGpio(wrapper.vm.ioData[3])).toBeFalsy()
  })
})
