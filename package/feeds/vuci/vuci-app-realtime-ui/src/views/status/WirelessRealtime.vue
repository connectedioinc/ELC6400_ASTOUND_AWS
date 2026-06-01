<template>
  <NavigationTabs
    v-model:selected="wifiIface"
    :tabs="singleDevicelastLiveStatus?.map(e => ({ name: e.devices[0].ifname, title: getName(e) }))"
  >
    <tlt-card
      v-if="singleDevicelastLiveStatus && (singleDevicelastLiveStatus.length ?? 0 > 0)"
      :title="$t('%s wireless signal').format(getName())"
    >
      <div class="flex flex-col gap-4">
        <tlt-alert
          v-if="!wifiOnline"
          id="interface-offline"
          type="info"
          :title="$t('Wireless interface is offline')"
          :text="$t('No data available')"
        />
        <tlt-alert
          v-if="wifiOnline && !currAnyMetrics"
          id="no-connections"
          type="info"
          :title="$t('Wireless interface has no established connection(s)')"
          :text="$t('Only noise value available if supported by device')"
        />
        <line-plot
          v-show="anyMetrics"
          :options="options"
          :data="liveChartData"
        />
        <tlt-system-card
          v-show="anyMetrics"
          :cards="cards"
        />
      </div>
    </tlt-card>
    <tlt-alert
      v-else
      id="no-interfaces"
      type="info"
      :title="$t('No wireless interfaces available')"
    />
  </NavigationTabs>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watchEffect } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import type { WifiInterfaceStatus, WifiInterfaceStatusDevices } from '@/types/wirelessTypes'
import { useMainStore } from '@/stores/main'
import { useCards } from '@/components/shared/Plots/useChartCards'
import { Measurement, type RawMeasurement, convertSimpleMeasurement } from '@/components/shared/Plots/measurement'
import { useTimeChartScale, type ScaleY } from '@/components/shared/Plots/useTimeChartScale'
import { useLiveData } from '@/components/shared/Plots/useLiveData'
import { useChartOptions } from '@/components/shared/Plots/useChartOptions'
import { wireless } from '@/plugins/wireless'
import TltAlert from '@/components/Messenger/TltAlert.vue'
import { utils } from '@/plugins/utils'
import LinePlot, { type DatasetOptions, type LinePlotOptions } from '@/components/shared/Plots/LinePlot.vue'

defineOptions({
  layout: 'none'
})

const store = useMainStore()

type TransferMeasurement = { signal: number | null; noise: number | null; quality: number | null }

const $t = useTranslate()
const scaleY = ref<ScaleY>('live')
const scaleProps = useTimeChartScale(scaleY, ref(0))

function formatValue(value: number | string | null, yAxisID: 'y2' | undefined, key?: keyof TransferMeasurement): string {
  const hintFunctions = {
    signal(value: number) {
      if (value > -60) return $t('Excellent')
      if (value > -75) return $t('Good')
      if (value > -85) return $t('Fair')
      if (value > -95) return $t('Poor')
      return $t('Very poor')
    },
    noise(value: number) {
      if (value < -80) return $t('Typical')
      return $t('Poor')
    },
    quality(value: number) {
      if (value > 75) return $t('Excellent')
      if (value > 50) return $t('Good')
      if (value > 25) return $t('Fair')
      return $t('Poor')
    }
  } as const
  const hint = key ? ` (${hintFunctions[key](Number(value))})` : ''
  if (yAxisID === 'y2') return utils.removeOverPrecision('%.2f %%'.format(Number(value))) + hint
  return utils.removeOverPrecision('%.2f dBm'.format(Number(value))) + hint
}

const lastCurrentWifiStatus = computed(() => findCurrentStatus(singleDevicelastLiveStatus.value))

function getName(wifi?: WifiSingleDeviceStatus) {
  const currWifi = wifi ?? lastCurrentWifiStatus.value
  if (!currWifi) return ''
  return `${wireless.getName(currWifi)} (${currWifi.devices[0].band})`
}

const wifiIface = ref<string>('')
onMounted(async () => {
  store.spin()
  try {
    await getLiveData()
    wifiIface.value = singleDevicelastLiveStatus.value?.[0]?.devices[0].ifname ?? ''
    liveDataTimer.start()
  } finally {
    store.spin(false)
  }
})

/**
 * Status with only single device
 */
type WifiSingleDeviceStatus = Omit<WifiInterfaceStatus, 'devices'> & { devices: [WifiInterfaceStatusDevices] }
function findCurrentStatus(statuses?: WifiInterfaceStatus[]): WifiSingleDeviceStatus | undefined {
  const wifiData = statuses?.find(e => e.devices.some(dev => dev.ifname === wifiIface.value))
  const devData = wifiData?.devices.find(dev => dev.ifname === wifiIface.value)
  if (!wifiData || !devData) return
  return { ...wifiData, devices: [devData] }
}
const singleDevicelastLiveStatus = computed<WifiSingleDeviceStatus[] | undefined>(() =>
  lastLiveStatus.value?.flatMap(status => status.devices.map<WifiSingleDeviceStatus>(device => ({ ...status, devices: [device] })))
)

const { rawLiveData, liveDataTimer, getLiveData, lastLiveStatus } = useLiveData<WifiInterfaceStatus[]>('/api/wireless/interfaces/basic/status', scaleProps.options.fullSpanOptions.live)
const currentRawLiveData = computed<RawMeasurement<TransferMeasurement>[]>(() => {
  return rawLiveData.value.map(rawData => {
    const deviceData = findCurrentStatus(rawData.value)?.devices[0]
    return {
      time: rawData.time,
      value: {
        signal: deviceData?.signal ? deviceData.signal : null,
        noise: deviceData?.noise ? deviceData.noise : null,
        quality: deviceData?.quality ? deviceData.quality : null
      }
    } satisfies RawMeasurement<TransferMeasurement>
  })
})
const liveChartData = computed<Measurement<TransferMeasurement>[]>(() => {
  return convertSimpleMeasurement(currentRawLiveData.value)
})

const additionalOptions = computed<Partial<LinePlotOptions<TransferMeasurement>>>(() => ({
  y: {
    suggestedMin: -120,
    suggestedMax: -30
  },
  y2: {
    suggestedMin: 0,
    suggestedMax: 100
  },
  gradiant: 'peak'
}))

const graphs = ref<DatasetOptions<TransferMeasurement>[]>([
  {
    yAxisID: 'y2',
    key: 'quality',
    color: 'var(--color-blue-700)',
    name: $t('Overall quality'),
    help: $t('Overall signal quality represent signal stability and maximum data throughput. Ranges between 0% and 100% (higher indicates better signal quality).')
  },
  {
    key: 'signal',
    color: 'var(--color-lime-300)',
    name: $t('Signal strength'),
    help: $t(
      'Signal strength (RSSI) represents signal "loadness". It can be reduced because of distance or occlutions. Ranges between -20dBm and -100dBm (closer to 0 indicates better signal strength)'
    )
  },
  {
    key: 'noise',
    color: 'var(--color-yellow-300)',
    name: $t('Noise'),
    help: $t('Noise represents noise from unwanted interfering signal sources. Ranges between -80dBm and -120dBm (further from 0 indicates lower noise level).')
  }
])

watchEffect(() => {
  graphs.value[0].show = currentRawLiveData.value.some(e => e.value.quality !== null)
  graphs.value[1].show = currentRawLiveData.value.some(e => e.value.signal !== null)
  graphs.value[2].show = currentRawLiveData.value.some(e => e.value.noise !== null)
})

const cards = useCards<TransferMeasurement>({ chartData: liveChartData, values: graphs, scaleY, formatValue, speedMeasurement: false })
const options = useChartOptions<TransferMeasurement>({ chartData: liveChartData, scaleProps, formatValue, graphs, additionalOptions })

const anyMetrics = computed<boolean>(() => liveChartData.value.some(data => data.value.noise !== null || data.value.signal !== null || data.value.quality !== null))
const currAnyMetrics = computed<boolean>(() => !!lastCurrentWifiStatus.value?.devices[0].signal || !!lastCurrentWifiStatus.value?.devices[0].quality)
const wifiOnline = computed<boolean>(() => !!lastCurrentWifiStatus.value?.up && !!lastCurrentWifiStatus.value?.devices[0].up)
</script>
