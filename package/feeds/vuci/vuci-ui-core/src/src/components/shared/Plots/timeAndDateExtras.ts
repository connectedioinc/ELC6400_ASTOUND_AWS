import { useMainStore } from '@/stores/main'
import { date } from '@ui-core/plugins/date'
import { i18n } from '@ui-core/plugins/i18n'

export function localDayjs(timestamp: number, utc = false) {
  const store = useMainStore()
  const parsedDate = date(timestamp)
  if (store.timeZone && store.timeZone !== 'UTC' && !utc) {
    return parsedDate.locale(store.lang).tz(store.timeZone)
  }
  return parsedDate.locale(store.lang).utc()
}

/**
 * Expands dayjs format to make posible to format ranges using <xxx> to include formating for end range
 * e.g: "h[-]<h>"
 * @param format - special format string using <xxx> to seperate end date format
 */
export function dayjsRange(startDate: number, endDate: number, format: string | { normal: string; now: string }, isNow?: boolean, utc = false) {
  const normalizedFormat = typeof format === 'string' ? format : isNow ? format.now : format.normal
  const parsedFormat = normalizedFormat.match(/(.*)<(.*)>(.*)/)
  if (parsedFormat) {
    const [, before, endFormat, after] = parsedFormat
    const formatedEnd = localDayjs(endDate, utc).format(endFormat)
    return localDayjs(startDate, utc).format(`${before}[${formatedEnd}]${after}`)
  }
  return localDayjs(startDate, utc).format(normalizedFormat)
}

const shortFormats = [
  ['second', 's[s]', 1],
  ['minute', 'm[min]', 1],
  ['hour', 'H[h]', 1],
  // socond+ day of month
  ['date', 'MMM D', 2],
  // first day of month but not january
  ['month', 'MMM', 1]
] as const
export function dayjsAutoFormat(unformatedDate: Date) {
  // Date already has offset
  const timestamp = unformatedDate.valueOf()
  if (timestamp === 0) return i18n.t('now')
  const parsedDate = date.utc(timestamp)
  for (const [unit, unitFormat, unitStart] of shortFormats) {
    if (parsedDate.get(unit) >= unitStart) return parsedDate.format(unitFormat)
  }
  return parsedDate.format('YYYY')
}

/**
 * This is hack that might not work with weird timezones or DLS.
 * It lets to use utc mode for d3 that do not support setting timezones.
 */
export function removeTimeZoneOffset(timestamp: number) {
  if (!isFinite(timestamp)) return timestamp
  return localDayjs(timestamp).utc(true).valueOf()
}

export function toRelativeTime(timestamp: number, now: number) {
  if (!isFinite(timestamp) && !isFinite(now)) return timestamp
  return now - timestamp
}
