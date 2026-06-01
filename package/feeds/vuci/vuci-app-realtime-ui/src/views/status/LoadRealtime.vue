<template>
  <tlt-card
    :title="$t('CPU utilization')"
    :help="$t('This section displays a graph that illustrates CPU utilization in real time.')"
  >
    <div class="flex flex-col gap-4">
      <line-plot
        :options="options"
        :data="liveChartData"
      />
      <tlt-system-card :cards="cards" />
    </div>
  </tlt-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useCards } from '@/components/shared/Plots/useChartCards'
import { Measurement, type RawMeasurement, convertSimpleMeasurement } from '@/components/shared/Plots/measurement'
import { useTimeChartScale, type ScaleY } from '@/components/shared/Plots/useTimeChartScale'
import { useLiveData } from '@/components/shared/Plots/useLiveData'
import { useChartOptions } from '@/components/shared/Plots/useChartOptions'
import LinePlot, { type DatasetOptions, type LinePlotOptions } from '@/components/shared/Plots/LinePlot.vue'
import type { SystemMetrics } from '@/types/usageStatusTypes'

type LoadMeasurment = { loadavg: number; load1: number; load5: number; load15: number }

const $t = useTranslate()

const scaleY = ref<ScaleY>('live')
const scaleProps = useTimeChartScale(scaleY, ref(0))

function formatCardValue(value: number | string): string {
  const number = Number(value)
  return isNaN(number) ? '0.00' : number.toFixed(2)
}
function formatChartValue(value: number | string | null): string {
  const number = Number(value)
  return Number.isInteger(number) ? number + '%' : number.toFixed(1) + '%'
}

onMounted(async () => {
  await getLiveData()
  liveDataTimer.start()
})

const { rawLiveData, liveDataTimer, getLiveData } = useLiveData<SystemMetrics>('/api/system/device/usage/status', scaleProps.options.fullSpanOptions.live, { immediate: true })

const currentRawLiveData = computed<RawMeasurement<LoadMeasurment>[]>(() => {
  return rawLiveData.value.map(dataPoint => ({
    time: dataPoint.time,
    value: {
      loadavg: dataPoint.value.loadavg * 100,
      load1: dataPoint.value.load.min1,
      load5: dataPoint.value.load.min5,
      load15: dataPoint.value.load.min15
    }
  }))
})

const liveChartData = computed<Measurement<LoadMeasurment>[]>(() => convertSimpleMeasurement(currentRawLiveData.value))

const additionalOptions = ref<any>({
  y: {
    suggestedMin: 0,
    suggestedMax: 100
  }
} satisfies Partial<LinePlotOptions<LoadMeasurment>>)

const graphs = ref<DatasetOptions<LoadMeasurment>[]>([
  {
    key: 'loadavg',
    color: 'var(--color-blue-700)',
    name: $t('CPU utilization')
  }
])

const cardInfo = ref<DatasetOptions<LoadMeasurment>[]>([
  {
    key: 'load1',
    color: 'var(--color-theme-border-base)',
    name: $t('1 Minute Load')
  },
  {
    key: 'load5',
    color: 'var(--color-theme-border-base)',
    name: $t('5 Minute Load')
  },
  {
    key: 'load15',
    color: 'var(--color-theme-border-base)',
    name: $t('15 Minute Load')
  }
])

const cards = useCards({ chartData: liveChartData, values: cardInfo, scaleY, formatValue: formatCardValue, speedMeasurement: false, clickable: false })
const options = useChartOptions({
  chartData: liveChartData,
  scaleProps,
  formatValue: formatChartValue,
  graphs,
  additionalOptions
})
</script>
