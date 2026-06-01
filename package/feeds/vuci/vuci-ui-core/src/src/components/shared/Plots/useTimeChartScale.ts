import { useTranslate } from '@ui-core/composables/useI18n'
import type { ManipulateType } from 'dayjs'
import { computed, toRef, type MaybeRefOrGetter } from 'vue'

export type ScaleY = 'live' | 'hour' | 'day' | 'week' | 'month' | 'total' | 'year'

const TIME_CONSTS = {
  SECOND: 1000,
  MINUTE: 60000,
  HOUR: 3600000,
  DAY: 86400000,
  WEEK: 604800000,
  MONTH: 2678400000,
  YEAR: 31622400000
} as const

/** Describes how wide whole chart should be */
export const fullSpanOptions = {
  live: TIME_CONSTS.MINUTE * 3,
  hour: TIME_CONSTS.HOUR,
  // -1 tick span from every full span because between X data points there X-1 spaces(lines)
  day: TIME_CONSTS.DAY - TIME_CONSTS.HOUR,
  week: TIME_CONSTS.WEEK - TIME_CONSTS.HOUR,
  month: TIME_CONSTS.MONTH - TIME_CONSTS.DAY,
  // 28 days is shortest posible month. The innacuracy can leave few pixel space.
  year: TIME_CONSTS.YEAR - TIME_CONSTS.DAY * 28,
  total: Infinity
} as const satisfies Record<ScaleY, number>

export function useTimeChartScale(scale: MaybeRefOrGetter<ScaleY>, timeSpan: MaybeRefOrGetter<number>) {
  const normalizedScale = toRef(scale)
  const normalizedTimeSpan = toRef(timeSpan)
  const $t = useTranslate()
  const scaleOptions: [ScaleY, string][] = [
    ['live', $t('Live')],
    ['day', $t('Day')],
    ['week', $t('Week')],
    ['month', $t('Month')],
    ['year', $t('Year')],
    ['total', $t('All')]
  ]

  /** Describes how long tick lasts or sugestion how long it should last */
  const tickSpanOptions = computed(
    () =>
      ({
        live: TIME_CONSTS.SECOND,
        hour: TIME_CONSTS.HOUR,
        day: TIME_CONSTS.HOUR,
        week: TIME_CONSTS.HOUR,
        month: TIME_CONSTS.DAY,
        year: TIME_CONSTS.MONTH,
        total: getTotalValue({ day: TIME_CONSTS.HOUR, week: TIME_CONSTS.HOUR, month: TIME_CONSTS.DAY, year: TIME_CONSTS.MONTH, years: TIME_CONSTS.YEAR })
      }) as const satisfies Record<ScaleY, number>
  )

  /** Describes what unit is used for speed measurement like MB/day */
  const tickSpanNameOptions = computed(
    () =>
      ({
        live: $t('s'),
        hour: $t('s'),
        day: $t('h'),
        week: $t('h'),
        month: $t('day'),
        year: $t('month'),
        total: getTotalValue({ day: $t('h'), week: $t('h'), month: $t('day'), year: $t('month'), years: $t('year') })
      }) as const satisfies Record<ScaleY, string>
  )

  /** Describes expected unit to normalize every mesurement */
  const tickSpanUnitOptions = computed(
    () =>
      ({
        live: 'second',
        hour: 'second',
        day: 'hour',
        week: 'hour',
        month: 'day',
        year: 'month',
        total: getTotalValue({ day: 'hour', week: 'hour', month: 'day', year: 'month', years: 'year' })
      }) as const satisfies Record<ScaleY, ManipulateType>
  )

  /**
   * Describes time range format displayed in popover.
   *
   * Types:
   * - normal - regular mesurement.
   * - now - ongoing mesurement.
   *
   * WARNING: uses special format. See more info in the formating function.
   **/
  const timeFormatOptionsConst = {
    // No longer used for live
    live: { normal: '', now: '' },
    hour: { normal: 'HH:mm:ss', now: '' },
    day: { normal: 'MMM D, YYYY H[ - ]<H>[h]', now: `MMM D, YYYY H[h - ${$t('now')}]` },
    week: { normal: 'MMM D, YYYY H[ - ]<H>[h]', now: `MMM D, YYYY H[h - ${$t('now')}]` },
    month: { normal: 'MMM D[ - ]<MMM D>, YYYY', now: `MMM D, YYYY[ - ${$t('now')}]` },
    year: { normal: 'MMM YYYY[ - ]<MMM YYYY>', now: `MMM YYYY[ - ${$t('now')}]` }
  }
  const timeFormatOptions = computed(
    () =>
      ({
        ...timeFormatOptionsConst,
        total: getTotalValue({ ...timeFormatOptionsConst, years: { normal: 'YYYY', now: `YYYY[ - ${$t('now')}]` } })
      }) as const satisfies Record<ScaleY, { normal: string; now: string }>
  )
  function getTotalValue<const T>(options: { day: T; week: T; month: T; year: T; years: T }): T {
    if (normalizedTimeSpan.value <= TIME_CONSTS.DAY) return options.day
    if (normalizedTimeSpan.value <= TIME_CONSTS.WEEK) return options.week
    if (normalizedTimeSpan.value <= TIME_CONSTS.MONTH * 3) return options.month
    if (normalizedTimeSpan.value <= TIME_CONSTS.YEAR * 3) return options.year
    return options.years
  }

  const fullSpan = computed(() => fullSpanOptions[normalizedScale.value])
  const timeFormat = computed(() => timeFormatOptions.value[normalizedScale.value])
  const tickSpan = computed(() => tickSpanOptions.value[normalizedScale.value])
  const tickSpanName = computed(() => tickSpanNameOptions.value[normalizedScale.value])
  const tickSpanUnit = computed(() => tickSpanUnitOptions.value[normalizedScale.value])

  return {
    options: {
      scaleOptions,
      fullSpanOptions,
      tickSpanOptions,
      tickSpanNameOptions,
      tickSpanUnitOptions
    },
    scale: normalizedScale,
    fullSpan,
    timeFormat,
    tickSpan,
    tickSpanName,
    tickSpanUnit
  }
}
