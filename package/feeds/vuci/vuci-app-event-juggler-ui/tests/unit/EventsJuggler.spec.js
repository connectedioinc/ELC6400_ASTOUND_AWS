import EventsJuggler from '../../src/views/services/EventsJuggler.vue'
import createWrapper from '@ui-core/tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'
import { io } from '@/plugins/io'
import { network } from '@/plugins/network'
import { mobile } from '@/plugins/mobile'
describe('EventsJuggler.vue', () => {
  let wrapper
  vi.mock('../../src/components/services/modules/EventsJugglerModuleLoader', () => ({
    default: vi.fn().mockResolvedValue({ filteredModuleComponents: 'filteredModules', availableOptions: { events: { plugins: 'plugins', log_events: 'log_events', params: 'params' } } })
  }))

  beforeEach(() => {
    wrapper = createWrapper(EventsJuggler, {
      global: {
        stubs: {
          'vuci-form': { template: '<div/>' }
        }
      }
    })
  })
  afterEach(() => {
    wrapper.unmount()
    vi.clearAllMocks()
  })

  it('onMounted calls getModuleData', () => {
    expect(wrapper.vm.filteredModules).toEqual('filteredModules')
    expect(wrapper.vm.eventOptions).toEqual({ plugins: 'plugins', log_events: 'log_events', params: 'params' })
  })

  it('handleDataLoad on error returns error', async () => {
    vi.spyOn(axios, 'bulkGet').mockRejectedValue(false)
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.handleDataLoad()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })

  it.each`
    resolves                                                         | error                              | expected
    ${[{ success: true, data: 'a' }, { success: true, data: 'c' }]}  | ${null}                            | ${{ actions: 'a', conditions: 'c' }}
    ${[{ success: false, data: 'a' }, { success: true, data: 'c' }]} | ${'Failed to load action data'}    | ${{ actions: [], conditions: 'c' }}
    ${[{ success: true, data: 'a' }, { success: false, data: 'c' }]} | ${'Failed to load condition data'} | ${{ actions: 'a', conditions: [] }}
  `('handleDataLoad returns data', async ({ resolves, error, expected }) => {
    vi.spyOn(axios, 'bulkGet').mockResolvedValue(resolves)
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    wrapper.vm.handleCardStateUpdate = vi.fn().mockReturnValueOnce()
    await expect(wrapper.vm.handleDataLoad()).resolves.toEqual(expected)
    error && expect(spy).toHaveBeenCalledWith(error)
  })

  it('handleExtraLoad on error returns error', async () => {
    vi.spyOn(axios, 'bulkGet').mockRejectedValue(false)
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.handleExtraLoad()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })

  const resolvesData = [
    { success: true, data: 'ioData' },
    { success: true, data: [{ id: '1' }] },
    { success: true, data: [{ name: 'phoneGroup' }] },
    { success: true, data: [{ name: 'emailGroup' }] },
    { success: true, data: [{ id: '2' }] },
    { success: true, data: ['interfaceName'] },
    { success: true, data: 'eventJugglerLimit' },
    { success: true, data: [{ id: '1' }, { id: '2' }] },
    { success: true, data: { enabled: '1' } }
  ]

  const expectedData = {
    ioData: 'ioData',
    profileOptions: [['1', '1']],
    phoneGroupOptions: ['phoneGroup'],
    emailGroupOptions: ['emailGroup'],
    eventsReportingOptions: { events: 'log_events', params: 'params' },
    quotaLimitOptions: [['2', '2']],
    interfaceOptions: ['interfaceName'],
    eventOptions: 'plugins',
    modemData: [{ id: '1' }, { id: '2' }],
    modemOptions: [{ id: '1' }, { id: '2' }],
    simCount: 0,
    modules: 'filteredModules',
    limitData: 'eventJugglerLimit',
    isPhoneSettingsEnabled: true
  }
  const replaceItem = (index, val) => [...resolvesData.slice(0, index), val, ...resolvesData.slice(index + 1)]

  it.each`
    resolves                                                  | error                                        | expected
    ${replaceItem(0, { ...resolvesData[0], success: false })} | ${'Failed to load I/O data'}                 | ${{ ...expectedData, ioData: [] }}
    ${replaceItem(1, { ...resolvesData[1], success: false })} | ${'Failed to load profile data'}             | ${{ ...expectedData, profileOptions: [] }}
    ${replaceItem(2, { ...resolvesData[2], success: false })} | ${'Failed to load phone group data'}         | ${{ ...expectedData, phoneGroupOptions: [] }}
    ${replaceItem(3, { ...resolvesData[3], success: false })} | ${'Failed to load email group data'}         | ${{ ...expectedData, emailGroupOptions: [] }}
    ${replaceItem(4, { ...resolvesData[4], success: false })} | ${'Failed to load quota limit data'}         | ${{ ...expectedData, quotaLimitOptions: [] }}
    ${replaceItem(5, { ...resolvesData[5], success: false })} | ${'Failed to load interfaces data'}          | ${{ ...expectedData, interfaceOptions: [] }}
    ${replaceItem(6, { ...resolvesData[6], success: false })} | ${'Failed to load event juggler limit data'} | ${{ ...expectedData, limitData: {} }}
    ${replaceItem(7, { ...resolvesData[7], success: false })} | ${'Failed to load modem data'}               | ${{ ...expectedData, modemData: [], modemOptions: [] }}
  `('handleExtraLoad returns data', async ({ resolves, error, expected }) => {
    vi.spyOn(io, 'getFilteredPinsInfo').mockImplementation(val => val)
    vi.spyOn(network, 'getName').mockImplementation(val => val)
    vi.spyOn(mobile, 'modemsOptions').mockImplementation(val => val)
    vi.spyOn(mobile, 'parseModems').mockImplementation(val => val)
    vi.spyOn(axios, 'bulkGet').mockResolvedValue(resolves)
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.handleExtraLoad()
    expect(wrapper.vm.eventsJugglerOptions).toEqual(expected)
    error && expect(spy).toHaveBeenCalledWith(error)
  })

  it('handleActionLoad on error returns error', async () => {
    const spinSpy = vi.spyOn(wrapper.vm.store, 'spin')
    const errorSpy = vi.spyOn(wrapper.vm.message, 'error')
    vi.spyOn(axios, 'get').mockRejectedValue()
    await wrapper.vm.handleActionLoad({ id: '1', actions: ['2'] })
    expect(axios.get).toHaveBeenCalledWith('/api/event_juggler/events/1/operations/config/2')
    expect(spinSpy).toHaveBeenCalledWith('Loading action data')
    expect(spinSpy).toHaveBeenCalledWith(false)
    expect(errorSpy).toHaveBeenCalledWith('Failed to load action data')
  })

  it('handleActionLoad returns data', () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: 'data' })
    expect(wrapper.vm.handleActionLoad({ id: '1', actions: ['2'] })).resolves.toEqual('data')
  })

  it('handleAfterAdd add loaded action', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: 'data' })
    const uciData = { actions: [] }
    await wrapper.vm.handleAfterAdd('', { uciData: uciData, newSection: { id: '1', actions: ['2'] } })
    expect(uciData.actions).toEqual(['data'])
  })

  it('handleAfterDelete removes actions and conditions', () => {
    wrapper.vm.formData = { conditions: [{ id: '1' }, { id: '2' }], actions: [{ id: '1' }, { id: '2' }] }
    wrapper.vm.handleAfterDelete({ actions: ['1'], available_conditions: ['1'] })
    expect(wrapper.vm.formData).toEqual({ conditions: [{ id: '2' }], actions: [{ id: '2' }] })
  })

  it('removeChildSections removes item from formData', () => {
    wrapper.vm.formData = { conditions: [{ id: '1' }, { id: '2' }], actions: [{ id: '1' }, { id: '2' }] }
    wrapper.vm.removeChildSections('conditions', ['1'])
    expect(wrapper.vm.formData).toEqual({ conditions: [{ id: '2' }], actions: [{ id: '1' }, { id: '2' }] })
    wrapper.vm.removeChildSections('actions', ['1'])
    expect(wrapper.vm.formData).toEqual({ conditions: [{ id: '2' }], actions: [{ id: '2' }] })
  })

  it('openConditionEdit sets editType to conditions', () => {
    expect(wrapper.vm.editType).toEqual('events')
    wrapper.vm.openConditionEdit()
    expect(wrapper.vm.editType).toEqual('conditions')
  })

  it('resetEditType sets editType to event', () => {
    wrapper.vm.openConditionEdit()
    expect(wrapper.vm.editType).toEqual('conditions')
    wrapper.vm.resetEditType()
    expect(wrapper.vm.editType).toEqual('events')
  })
})
