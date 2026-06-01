import { dayjsAutoFormat, dayjsRange } from '@/components/shared/Plots/timeAndDateExtras'
import { useMainStore } from '@/stores/main'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'

describe('timeAndDateExtras.ts', () => {
  setActivePinia(createTestingPinia())
  const store = useMainStore()
  store.timeZone = 'Etc/GMT-1'

  it.each`
    start | end        | format                                                                   | now      | utc      | expectedResult
    ${0}  | ${3600000} | ${{ normal: 'MMM D, YYYY H[ - ]<H>[h]', now: `MMM D, YYYY H[h - now]` }} | ${false} | ${false} | ${'Jan 1, 1970 1 - 2h'}
    ${0}  | ${3600000} | ${{ normal: 'MMM D, YYYY H[ - ]<H>[h]', now: `MMM D, YYYY H[h - now]` }} | ${false} | ${true}  | ${'Jan 1, 1970 0 - 1h'}
    ${0}  | ${3600000} | ${{ normal: 'MMM D, YYYY H[ - ]<H>[h]', now: `MMM D, YYYY H[h - now]` }} | ${true}  | ${true}  | ${'Jan 1, 1970 0h - now'}
  `('returns date range #%#', ({ start, end, format, now, utc, expectedResult }) => {
    expect(dayjsRange(start, end, format, now, utc)).toEqual(expectedResult)
  })

  it.each`
    timestamp      | expectedResult
    ${0}           | ${'now'}
    ${1000}        | ${'1s'}
    ${60000}       | ${'1min'}
    ${3600000}     | ${'1h'}
    ${86400000}    | ${'Jan 2'}
    ${2678400000}  | ${'Feb'}
    ${31536000000} | ${'1971'}
  `('returns autoformated date #%#', ({ timestamp, expectedResult }) => {
    expect(dayjsAutoFormat(new Date(timestamp))).toEqual(expectedResult)
  })
})
