import { computed, type Ref } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useTimeChartScale, type ScaleY } from './useTimeChartScale'
import { type Measurement, type MeasurementGeneric } from './measurement'
import type { DatasetOptions } from './LinePlot.vue'
import { dayjsRange } from './timeAndDateExtras'
import { utils } from '@/plugins/utils'

export function useCards<T extends MeasurementGeneric>(props: {
  chartData: Ref<Array<Measurement<T>>>
  values: Ref<DatasetOptions<T>[]>
  scaleY: Ref<ScaleY>
  formatValue: (value: string | number, yAxisID: 'y2' | undefined, key: keyof T, type?: 'total') => string
  speedMeasurement: boolean
  clickable?: boolean
}) {
  const { chartData, formatValue, scaleY, speedMeasurement, values, clickable } = props
  const $t = useTranslate()
  const timeSpan = computed<number>(() => (chartData.value.at(0)?.startTime ?? 0) - (chartData.value.at(-1)?.endTime ?? 0))
  const scaleProps = useTimeChartScale(scaleY, timeSpan)

  const chartStart = computed(() => (chartData.value.at(-1)?.endTime ?? 0) - scaleProps.fullSpan.value)
  function getChartDataStats(graph: DatasetOptions<T>): { title: string; info: string }[] {
    const filteredData = chartData.value.filter(data => data.value[graph.key] !== null && data.midTime > chartStart.value)
    const rateArr = filteredData.map(data => data.getRate(graph.key, scaleProps.tickSpan.value, speedMeasurement)) as number[]
    const sumTotal = filteredData.reduce<number>((res, currItem) => res + (currItem.value[graph.key] as number), 0)
    const durationTotal = filteredData.reduce<number>((res, currItem) => res + currItem.duration, 0)
    const startDate = filteredData.at(0)?.startTime ?? 0
    const endMesurement = filteredData.at(-1)
    const endDate = endMesurement?.endTime ?? 0
    const dateRange = dayjsRange(startDate, endDate, scaleProps.timeFormat.value, endMesurement?.isNow, false)
    const average = speedMeasurement ? (sumTotal / durationTotal) * scaleProps.tickSpan.value : sumTotal / filteredData.length
    const peak = Math.max(...rateArr)
    return [
      {
        title: $t('Current'),
        info: formatValue(rateArr.at(-1) ?? 0, graph.yAxisID, graph.key)
      },
      {
        title: $t('Average'),
        info: formatValue(average, graph.yAxisID, graph.key)
      },
      {
        title: $t('Peak'),
        info: formatValue(peak === Number.NEGATIVE_INFINITY ? 0 : peak, graph.yAxisID, graph.key)
      },
      {
        title: $t('Total'),
        info:
          scaleY.value === 'live'
            ? $t('%s (over %s)').format(formatValue(sumTotal, graph.yAxisID, graph.key, 'total'), utils.parseTwoUnitRelativeTime(endDate - startDate))
            : '%s (%s)'.format(formatValue(sumTotal, graph.yAxisID, graph.key, 'total'), dateRange),
        show: speedMeasurement
      }
    ].filter(e => e.show !== false)
  }
  return computed(() => {
    const entries = values.value.map<[keyof T, [ReturnType<typeof generateCard>]]>(value => [value.key, [generateCard(value, getChartDataStats(value), clickable)]]).filter(e => e[1][0].show !== false)
    return Object.fromEntries(entries)
  })
}

export function generateCard<T extends MeasurementGeneric>(graph: DatasetOptions<T>, content: { title: string; info: string }[], clickable?: boolean) {
  return {
    show: graph.show,
    help: graph.help,
    title: graph.name,
    content,
    type: 'system-basic',
    onClick: function () {
      if (!clickable && typeof clickable === 'boolean') return
      graph.hidden = !graph.hidden
    },
    headerStyle: `border-color: ${graph.color}; border-bottom-width: 2px; cursor: pointer;` + (graph.hidden ? ' text-decoration: line-through;' : '')
  }
}
