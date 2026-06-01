<template>
  <ListLayout bordered>
    <tlt-card :title="$t('Channel interference')">
      <template #title-content>
        <div class="flex gap-4 ml-auto items-center">
          <div class="flex gap-2 items-center">
            <tlt-icon
              class="size-5"
              :icon="timestampInfo.icon"
              :class="timestampInfo.iconStyle"
            />
            <span class="text-xs">{{ $t('Last scan: %s').format(timestampInfo.relativeText) }}</span>
          </div>
          <tlt-button
            button-id="scan"
            @click="scanWifi()"
          >
            {{ $t('Perform scan') }}
          </tlt-button>
        </div>
      </template>
      <figure-plot
        :data="figureData"
        :options="plotOptions"
        @click-figure="clickFigure"
      >
        <template #popover="{ figures }">
          <div class="flex flex-col gap-1">
            <div
              v-for="{ figure, scanResult } in figures.map(figure => ({
                figure,
                scanResult: getScanned(figure.id)
              }))"
              :key="figure.id"
              class="flex gap-x-1 items-center flex-wrap"
            >
              <div
                :style="{ borderColor: figure.color, content: '' }"
                class="rounded-full size-2 border-2"
              />
              <b>
                <template v-if="scanResult?.ssid">
                  {{ scanResult.ssid }}
                </template>
                <template v-else>
                  <i>{{ $t('Hidden SSID') }}</i>
                </template>
              </b>
              <b>:</b>
              {{
                scanResult?.channel_width === 20
                  ? 'ch %s@%s MHz, %s dBm'.format(scanResult?.channel, scanResult?.channel_width, scanResult?.signal)
                  : 'ch %s(%s)@%s MHz, %s dBm'.format(scanResult?.channel, scanResult?.channel_center, scanResult?.channel_width, scanResult?.signal)
              }}
            </div>
          </div>
        </template>
      </figure-plot>
    </tlt-card>
    <tlt-table
      id="wifi_scans"
      v-model:sorting="sorting"
      v-model:selected-row="selectedRow"
      v-model:current-page="currentPage"
      id-key="bssid"
      :title="$t('Scans')"
      :columns="scanCols"
      :data-source="sortedData"
      selectable
      pagination
      :table-actions="['column-list', 'search']"
    >
      <template #title>
        <b>{{ $t('Note') }}: </b
        >{{
          $t(
            'To indicate the chosen network in the interference graph above, click on any entry in the table. By clicking on the interference graph of the chosen network, a row in the table will be marked accordingly.'
          )
        }}
      </template>
      <template #ssid="{ record }">
        <div class="flex justify-start items-center gap-x-1">
          <div
            class="inline-block size-3 rounded-full shrink-0"
            :style="{ background: figureData.find(figure => figure.id === record.bssid)?.color }"
          />
          <template v-if="record.ssid">
            {{ record.ssid }}
          </template>
          <template v-else>
            <i>{{ $t('Hidden SSID') }}</i>
          </template>
        </div>
      </template>
      <template #signal="{ record }">
        <tlt-signal-bar
          class="h-4"
          :signal="record.signal"
        />
      </template>
      <template #channel_width="{ record }">
        {{ record.channel_width !== '-' ? `${record.channel_width} MHz` : '-' }}
      </template>
    </tlt-table>
  </ListLayout>
</template>

<script lang="ts" setup>
import FigurePlot, { type Figure, type FigurePlotOptions, type TickManipulation } from '@/components/shared/Plots/FigurePlot.vue'
import { utils } from '@/plugins/utils'
import type { ParsedScanResults } from '@/types/wirelessTypes'
import { getColor } from '@/components/shared/Plots/figureColors'
import { useTranslate } from '@ui-core/composables/useI18n'
import { computed, ref } from 'vue'
import type { Icon } from '@ui-core/tlt-design/icons/icon-types'
import type { TableColumn } from '@ui-core/components/table/types'
import { isNumber } from '@ui-core/utils/inspect'

interface Props {
  name?: string
  minChannel?: number
  maxChannel?: number
  channelWidthLengths: Record<number, number>
  scannedDevices: ParsedScanResults[]
  scanWifi: Function
  scanTimestamp?: number | null
  tickManipulation?: TickManipulation
}

const props = withDefaults(defineProps<Props>(), {
  name: '',
  minChannel: 1,
  maxChannel: 14,
  channelWidthLengths: () => ({}),
  scannedDevices: () => [],
  scanWifi: () => {},
  scanTimestamp: null,
  tickManipulation: undefined
})

const $t = useTranslate()

const scanCols = [
  { dataIndex: 'ssid', title: $t('SSID'), actions: { sort: true } },
  { dataIndex: 'signal', title: $t('Signal'), actions: { sort: true } },
  { dataIndex: 'channel', title: $t('Primary channel'), actions: { sort: true } },
  { dataIndex: 'channel_center', title: $t('Center channel'), actions: { sort: true }, displayFn: (value, row) => (row.channel_width === 20 ? '-' : row.channel_center) },
  { dataIndex: 'channel_width', title: $t('Width'), actions: { sort: true } },
  { dataIndex: 'encryption_description', title: $t('Encryption'), actions: { sort: true } },
  { dataIndex: 'bssid', title: $t('BSSID'), actions: { sort: true } }
] satisfies TableColumn[]

const plotOptions = computed<FigurePlotOptions>(() => ({
  height: 400,
  x: {
    type: 'line',
    suggestedDomain: [props.minChannel, props.maxChannel],
    tickManipulation: props.tickManipulation
  },
  y: {
    format: formatAxisX,
    tickCount: 5,
    suggestedMax: -40,
    suggestedMin: -100
  }
}))

const sorting = ref<any | null>(null)
const currentPage = ref<number>(1)
const selectedBy = ref<'plot' | 'table' | null>(null)
const selectedSSIDs = ref<ParsedScanResults[]>([])
const selectedRow = computed<ParsedScanResults | null | undefined>({
  get: () => selectedSSIDs.value[0],
  set: value => {
    selectedSSIDs.value = value && !selectedSSIDs.value.some(e => e.bssid === value?.bssid) ? [value] : []
    if (value) selectedBy.value = 'table'
  }
})

function getScanned(bssid: string) {
  return props.scannedDevices.find(e => e.bssid === bssid)
}

const sortedData = computed(() =>
  selectedBy.value === 'plot'
    ? [...props.scannedDevices].sort(
        (a, b) => (selectedSSIDs.value?.find(selected => selected.bssid === b.bssid) ? 1 : 0) - (selectedSSIDs.value?.find(selected => selected.bssid === a.bssid) ? 1 : 0)
      )
    : props.scannedDevices
)

const figureData = computed(() =>
  // Sorting needed for figured to get correct colors
  [...props.scannedDevices]
    .sort((a, b) => a.channel - b.channel || a.signal - b.signal)
    .map<Figure>((data, i) => ({
      color: !selectedSSIDs.value.length || selectedSSIDs.value.some(selected => selected.bssid === data.bssid) ? getColor(i) : 'rgba(0,0,0,0.1)',
      name: data.ssid ?? $t('Hidden SSID'),
      points: getPoints(data),
      decorations:
        data.channel_width === 20 || !isNumber(data.channel) || !isNumber(data.signal)
          ? undefined
          : [
              {
                type: 'diamond',
                position: [data.channel, data.signal]
              }
            ],
      id: data.bssid
    }))
)

const timestampInfo = computed<{ relativeText: string; icon: Icon; iconStyle: string }>(() => {
  if (props.scanTimestamp === null)
    return {
      relativeText: $t('never'),
      icon: 'warning',
      iconStyle: 'text-theme-text-warning'
    }
  const relativeTimestamp = props.scanTimestamp - Date.now()
  const day = -86400000
  return {
    relativeText: utils.parseRelativeTime(relativeTimestamp),
    icon: relativeTimestamp < day ? 'warning' : 'success',
    iconStyle: relativeTimestamp < day ? 'text-theme-text-warning' : 'text-theme-text-success'
  }
})
function formatAxisX(value: string | number | null) {
  return $t('%s dBm').format(value ?? -100)
}
function clickFigure(bssid: string | string[]) {
  if (selectedSSIDs.value?.length) {
    selectedSSIDs.value = []
    selectedBy.value = null
  } else {
    selectedBy.value = 'plot'
    const bssids = Array.isArray(bssid) ? bssid : [bssid]
    selectedSSIDs.value = props.scannedDevices.filter(e => bssids.some(bssid => bssid === e.bssid))
    currentPage.value = 1
    sorting.value = {
      dataIndex: null,
      direction: 0
    }
  }
}

const minPoint = computed(() => Math.min(-100, ...props.scannedDevices.map(e => (e.signal ?? 0) - 5)))

function getPoints(dev: ParsedScanResults): [number, number][] {
  if (!isNumber(dev.channel_center) || !isNumber(dev.channel_width)) return []

  const length = props.channelWidthLengths[dev.channel_width as number] ?? props.channelWidthLengths[20]
  const halfWidth = Math.floor(length / 2)
  const min = dev.channel_center - halfWidth
  const max = dev.channel_center + halfWidth
  return [
    [min, minPoint.value],
    [min + 1, dev.signal],
    [dev.channel_center, dev.signal],
    [max - 1, dev.signal],
    [max, minPoint.value]
  ]
}
</script>
