<template>
  <NavigationTabs
    :tabs="tabs"
    @update:selected="updateGrapthParams(undefined, $event as TabId)"
  >
    <tlt-card :title="$t('%s traffic').format(tabs.find(e => e.name === currTab)?.title)">
      <template #title-content>
        <div class="flex ml-auto max-w-full">
          <badge-select
            id="scale-badge"
            :options="scaleProps.options.scaleOptions"
            :model-value="scaleY"
            @update:model-value="val => updateGrapthParams(val)"
          />
        </div>
      </template>
      <div class="flex flex-col gap-4">
        <tlt-alert
          v-if="noData || (scaleY === 'live' && currentRawLiveData.at(-1)?.value.rx === null)"
          id="interface-offline"
          type="info"
          :title="$t('No data available')"
          :text="scaleY === 'live' ? $t('Interface is offline.') : $t('Interface was offline or no data was transferred during this period.')"
        />
        <line-chart
          v-show="!noData"
          :data="chartData"
          :options="options"
          class="mb-4"
        />
        <tlt-system-card
          v-show="!noData"
          :cards="cards"
        />
      </div>
    </tlt-card>
  </NavigationTabs>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import BadgeSelect from '@/components/shared/BadgeSelect.vue'
import type { InterfaceStatus } from '@/types/networkTypes'
import { useMessages } from '@/stores/messages'
import { useMainStore } from '@/stores/main'
import { useCards } from '@/components/shared/Plots/useChartCards'
import { Measurement, type RawMeasurement, convertRateMeasurement, convertHistoricalMeasurement } from '@/components/shared/Plots/measurement'
import { useTimeChartScale, type ScaleY } from '@/components/shared/Plots/useTimeChartScale'
import { useLiveData } from '@/components/shared/Plots/useLiveData'
import { useChartOptions } from '@/components/shared/Plots/useChartOptions'
import type { DeviceStatus } from '@/types/networkDeviceTypes'
import type { WifiInterfaceStatus } from '@/types/wirelessTypes'
import TltAlert from '@/components/Messenger/TltAlert.vue'
import { useTimer } from '@ui-core/composables/useTimer'
import LineChart, { type DatasetOptions, type LinePlotOptions } from '@/components/shared/Plots/LinePlot.vue'

defineOptions({ layout: 'none' })

const message = useMessages()
const store = useMainStore()

type TransferMeasurement = { rx: number | null; tx: number | null }

const $t = useTranslate()
const scaleY = ref<ScaleY>('month')
const timeSpan = computed<number>(() => calculatedLocalTime.value - rawHistoryData.value[0]?.time)
const scaleProps = useTimeChartScale(scaleY, timeSpan)

function formatValue(value: number | string | null, _: unknown, _1: unknown, type?: 'total'): string {
  if (type === 'total') return '%mB'.format(scaleY.value === 'live' ? Number(value) / 8 : value)
  if (scaleY.value === 'live') return '%mb/%s'.format(Number(value), scaleProps.tickSpanName.value)
  return '%mB/%s'.format(value, scaleProps.tickSpanName.value)
}

type TabId = `${'device' | 'interface'}/${string}`
type Tab = { name: TabId; title: string }
const currTab = ref<TabId>('device/')

onMounted(async () => {
  store.spin()
  try {
    await Promise.all([updateInterfaceData(), getLiveData(), getLocalTime()])
    currTab.value = tabs.value[0].name
    await getHistoryData(scaleY.value, currTab.value)
    liveDataTimer.start()
    interfaceUpdateTimer.start()
  } finally {
    store.spin(false)
  }
})

const localtime = ref(0)
const localtimeGetTime = ref(0)
const localtimeRefreshTime = ref(0)
const calculatedLocalTime = computed(() => localtime.value + localtimeRefreshTime.value - localtimeGetTime.value)

function getLocalTime() {
  return axios
    .get('/api/system/device/usage/status?exclude=loadavg')
    .then(({ data }) => {
      localtimeGetTime.value = Date.now()
      localtime.value = data.localtime * 1000
    })
    .catch(() => {
      message.error($t('Failed to load current router time'))
    })
}

const rawHistoryData = ref<RawMeasurement<TransferMeasurement>[]>([])
async function getHistoryData(interval: ScaleY, iface: TabId) {
  if (interval === 'live' || !iface) return Promise.resolve()
  return axios
    .get(`/api/data_usage/${interval}/${iface}/status?current=false`)
    .then(({ data }) => {
      localtimeRefreshTime.value = Date.now()
      rawHistoryData.value = (data as { usage: number[][]; interval: string }).usage.map(record => ({ time: record[0] * 1000, value: { rx: record[1], tx: record[2] } }))
    })
    .catch(() => {
      message.error($t('Failed to load historical data'))
    })
}

/**
 *  This was made to prevent chart jumping
 *  Other values needs to be set at the same time as data is loaded so it needs to be awaited.
 */
async function updateGrapthParams(newScaleY?: ScaleY, newIface?: TabId) {
  const updateScale = newScaleY && newScaleY !== scaleY.value
  const updateIface = newIface && newIface !== currTab.value
  if (updateScale || updateIface) {
    await getHistoryData(newScaleY ?? scaleY.value, newIface ?? currTab.value)
  }
  if (updateScale) scaleY.value = newScaleY
  if (updateIface) currTab.value = newIface
}

const historyChartData = computed<Measurement<TransferMeasurement>[]>(() => {
  // early returns is needed to not break stuff when live is set
  if (scaleY.value === 'live') return []
  if (rawHistoryData.value.length === 0) return []
  return convertHistoricalMeasurement(rawHistoryData.value, scaleProps.tickSpanUnit.value, calculatedLocalTime.value, { rx: 0, tx: 0 })
})

const chartData = computed<Measurement<TransferMeasurement>[]>(() => {
  return (scaleY.value === 'live' ? liveChartData.value : historyChartData.value).sort((a, b) => a.endTime - b.endTime)
})

const noData = computed<boolean>(() => {
  if (scaleY.value === 'live') return !currentRawLiveData.value.some(data => data.value.tx !== null)
  return historyChartData.value.length === 0
})

const networkInterfaces = ref<InterfaceStatus[]>([])
const wirelessInterfaces = ref<WifiInterfaceStatus[]>([])
const interfaceUpdateTimer = useTimer({ method: updateInterfaceData, autostart: false, immediate: false, time: 10000 })
function updateInterfaceData() {
  return axios
    .bulkGet(['/api/interfaces/basic/status', { endpoint: '/api/wireless/interfaces/basic/status', condition: 'vuci-app-wireless-api.control' }])
    .then(([interfaceStatus, wirelessStatus]) => {
      if (interfaceStatus.success) networkInterfaces.value = interfaceStatus.data
      else message.error($t('Failed to load interface status'))
      if (wirelessStatus.success) wirelessInterfaces.value = wirelessStatus.data
      else message.error($t('Failed to load wireless interface status'))
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

const tabs = computed<Tab[]>(() => {
  const interfaceDevices = [...new Set(networkInterfaces.value.map(e => e.device).filter((e): e is string => !!e))]
  const interfaceWithDevice = interfaceDevices.map<Tab>(device => ({
    name: `device/${device}`,
    title: networkInterfaces.value
      .filter(e => e.device === device)
      .map(e => e.name)
      .join(', ')
  }))
  // This happens for offline mobile interfaces. We can still show mdcollect charts
  const interfaceWithoutDevice = networkInterfaces.value
    .filter(iface => !iface.device)
    .map<Tab>(iface => ({
      name: `interface/${iface.id}`,
      title: iface.name
    }))
  const wireless = wirelessInterfaces.value
    .filter(e => !e.mode || e.mode === 'ap')
    .flatMap<Tab>(wifi => wifi.devices.map(dev => ({ name: `device/${dev.ifname}`, title: `${wifi.ssid || '-'} (${dev.band})` })))
  return [...interfaceWithDevice, ...interfaceWithoutDevice, ...wireless]
})

const { rawLiveData, liveDataTimer, getLiveData } = useLiveData<DeviceStatus[]>('/api/basic/network/devices/status', scaleProps.options.fullSpanOptions.live)

const currentRawLiveData = computed<RawMeasurement<TransferMeasurement>[]>(() => {
  return rawLiveData.value.map(rawData => {
    const ifaceData = rawData.value.find(e => e.name === currTab.value.split('/')[1])
    return {
      time: rawData.time,
      value: {
        tx: ifaceData?.up && ifaceData.carrier ? ifaceData.tx_bytes * 8 : null,
        rx: ifaceData?.up && ifaceData.carrier ? ifaceData.rx_bytes * 8 : null
      }
    } satisfies RawMeasurement<TransferMeasurement>
  })
})

const liveChartData = computed<Measurement<TransferMeasurement>[]>(() => {
  return convertRateMeasurement(currentRawLiveData.value)
})

const graphs = ref<DatasetOptions<TransferMeasurement>[]>([
  { key: 'rx', color: 'var(--color-blue-700)', name: $t('Inbound'), interpolate: true },
  { key: 'tx', color: 'var(--color-lime-300)', name: $t('Outbound'), interpolate: true }
])
const cards = useCards({ chartData, values: graphs, scaleY, formatValue, speedMeasurement: true })

const options = useChartOptions({
  chartData,
  scaleProps,
  formatValue,
  graphs,
  additionalOptions: ref<Partial<LinePlotOptions<TransferMeasurement>>>({
    y: {
      suggestedMin: 0,
      suggestedMax: 100
    }
  })
})
</script>
