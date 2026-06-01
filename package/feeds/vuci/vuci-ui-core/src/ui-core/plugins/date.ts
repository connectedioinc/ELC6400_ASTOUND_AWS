import type { App } from 'vue'
import { useMainStore } from '@/stores/main'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import duration from 'dayjs/plugin/duration'
import 'dayjs/locale/es'
import 'dayjs/locale/de'
import 'dayjs/locale/ja'
import 'dayjs/locale/pt'
import 'dayjs/locale/tr'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(duration)

export const date = dayjs

export function localDate(timestamp: number, options: { format?: string; timezoneConversion?: boolean } = {}) {
  if (!timestamp) return '-'
  const { format = 'YYYY-MM-DD HH:mm:ss', timezoneConversion = true } = options
  const date = dayjs(timestamp * 1000)
  if (!timezoneConversion) return date.format(format)
  const store = useMainStore()
  if (store.timeZone && store.timeZone !== 'UTC') {
    return date.locale(store.lang).tz(store.timeZone).format(format)
  }
  return date.locale(store.lang).utc().format(format)
}

export default {
  install(app: App) {
    app.config.globalProperties.$localDate = localDate
    app.config.globalProperties.$date = dayjs
  }
}
