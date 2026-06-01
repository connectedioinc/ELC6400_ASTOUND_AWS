import eventsLog from '../../src/views/status/EventsLog.vue'
import createWrapper from '@tests/unit/mockFactory'
import { useMessages } from '@/stores/messages'
import { utils } from '@/plugins/utils'
import { useNotifications } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'

vi.mock('@ui-core/plugins/axios')

vi.mock('vue-router', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ path: 'test' })),
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn()
    })
  }
})

describe('Events logs data loading', () => {
  const routeData = { path: '/api/events_log/config/all' }

  let wrapper
  let message
  beforeEach(() => {
    wrapper = createWrapper(eventsLog)
    message = useMessages()
  })
  it('Tests if message is displayed when promise is rejected', () => {
    const spy = vi.spyOn(message, 'error')
    wrapper.vm.$route = routeData
    wrapper.vm.onError()
    expect(spy).toHaveBeenCalledWith('Failed to load events')
  })
  it('Tests if side message is displayed when database is being optimized', () => {
    const notification = useNotifications()
    const spy = vi.spyOn(notification, 'error')
    wrapper.vm.$route = routeData
    wrapper.vm.onError({ response: { data: { errors: [{ code: 1 }] } } })
    expect(spy).toHaveBeenCalledWith('Events Log could not be accessed because the database is being optimized. This process can take up to five minutes.')
  })
  it('checks if exportEventLog calls generateCsv function with correct arguments', async () => {
    const spy = vi.spyOn(utils, 'generateCsv')
    vi.spyOn(axios, 'get').mockResolvedValue({ data: [] })
    wrapper.vm.eventLogData.value = []
    await wrapper.vm.exportEventLog()
    expect(spy).toHaveBeenCalledWith('eventlog-data', [['ID', 'Date', 'Source', 'Event group', 'Event type', 'Event']])
    spy.mockClear()
  })
})
