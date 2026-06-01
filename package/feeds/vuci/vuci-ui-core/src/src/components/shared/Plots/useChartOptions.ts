import { type Measurement, type MeasurementGeneric } from './measurement'
import { computed, type Ref, toRef, type MaybeRefOrGetter } from 'vue'
import type { useTimeChartScale } from './useTimeChartScale'
import { utils } from '@/plugins/utils'
import { type DatasetOptions, type LinePlotOptions } from './LinePlot.vue'

export function useChartOptions<T extends MeasurementGeneric>(props: {
  chartData: Ref<Measurement<T>[]>
  scaleProps: ReturnType<typeof useTimeChartScale>
  formatValue: (value: string | number | null, yAxisID?: 'y2', key?: keyof T, type?: 'total') => string
  graphs: Ref<DatasetOptions<T>[]>
  additionalOptions?: MaybeRefOrGetter<Partial<LinePlotOptions<T>>>
}) {
  const { chartData, scaleProps, formatValue, graphs, additionalOptions } = props
  const _additionalOptions = toRef(additionalOptions)
  const predefinedAdditionalOptions = computed(() => {
    const end = chartData.value.at(-1)?.startTime ?? Date.now()
    const start = end - scaleProps.fullSpan.value
    const liveX = {
      domain: [0, scaleProps.fullSpan.value],
      tooltipFormat: scaleProps.timeFormat.value,
      tickSpan: scaleProps.tickSpan.value,
      zoom: true,
      type: 'relative_time'
    } satisfies Partial<LinePlotOptions<T>>['x']
    const historyX = {
      domain: [start, end],
      tooltipFormat: scaleProps.timeFormat.value,
      type: 'time',
      tickSpan: scaleProps.tickSpan.value
    } satisfies Partial<LinePlotOptions<T>>['x']
    return {
      height: 400,
      x: scaleProps.scale.value === 'live' ? liveX : historyX,
      y: {
        format: formatValue
      },
      y2: _additionalOptions.value?.y2
        ? {
            format: formatValue
          }
        : undefined,
      datasetOptions: graphs.value
    } satisfies LinePlotOptions<T>
  })
  return computed(() => utils.combineDeep<any>(predefinedAdditionalOptions.value, _additionalOptions?.value ?? {}))
}
