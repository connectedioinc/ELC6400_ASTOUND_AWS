import { setActivePinia, createPinia } from 'pinia'

import { localDate } from '@ui-core/plugins/date'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { useMainStore } from '@/stores/main'

// Extend dayjs with necessary plugins
dayjs.extend(utc)
dayjs.extend(timezone)

describe('date.ts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  describe('localDate', () => {
    it('formats date correctly with provided options', () => {
      const timestamp = 1625256000
      const options = { format: 'YYYY-MM-DD HH:mm:ss' }

      const store = useMainStore()
      store.timeZone = 'UTC'
      store.lang = 'en'
      // Create a mock store context

      // Bind the function to the mock context

      const formattedDate = localDate(timestamp, options)
      const expectedDate = dayjs(timestamp * 1000)
        .utc()
        .locale('en')
        .format(options.format)

      expect(formattedDate).toBe(expectedDate)
    })
  })
  it('formats date when timezoneConversion is false', () => {
    const timestamp = 1625256000
    const store = useMainStore()
    store.timeZone = 'Europe/Berlin'
    store.lang = 'en'
    const formattedDate = localDate(timestamp, { timezoneConversion: false })
    const expectedDate = dayjs(timestamp * 1000).format('YYYY-MM-DD HH:mm:ss')
    expect(formattedDate).toBe(expectedDate)
  })
  it('should return empty string if timestamp is not provided', () => {
    const timestamp = null
    const options = { format: 'YYYY-MM-DD HH:mm:ss' }

    const formattedDate = localDate(timestamp, options)
    const expectedDate = '-'

    expect(formattedDate).toBe(expectedDate)
  })
  it('should return default format if options are not provided', () => {
    const timestamp = 1625256000

    // Create a mock store context
    const mockContext = {
      $store: {
        timeZone: 'UTC',
        lang: 'en'
      }
    }

    // Bind the function to the mock context
    const localDateBound = localDate.bind(mockContext)

    const formattedDate = localDateBound(timestamp)
    const expectedDate = dayjs(timestamp * 1000)
      .utc()
      .locale(mockContext.$store.lang)
      .format('YYYY-MM-DD HH:mm:ss')

    expect(formattedDate).toBe(expectedDate)
  })
})
