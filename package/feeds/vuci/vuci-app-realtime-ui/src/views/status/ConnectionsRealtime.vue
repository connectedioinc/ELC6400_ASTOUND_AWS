<template>
  <tlt-card
    :title="$t('Connections')"
    :help="
      $t(
        'The Realtime Connections graph displays currently active TCP, UDP and other \
        network connections with the information about network, protocol, source and destination \
        addresses and transfer speed. The table below the graph displays basic information on active connections.'
      )
    "
  >
    <div class="flex flex-col gap-4">
      <line-plot
        :options="options"
        :data="liveChartData"
      />
      <tlt-system-card :cards="cards" />
      <tlt-table
        id="conn_table"
        :columns="tableColumns"
        :data-source="lastLiveStatus"
      />
    </div>
  </tlt-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMainStore } from '@/stores/main'
import { useCards } from '@/components/shared/Plots/useChartCards'
import { Measurement, type RawMeasurement, convertSimpleMeasurement } from '@/components/shared/Plots/measurement'
import { useTimeChartScale, type ScaleY } from '@/components/shared/Plots/useTimeChartScale'
import { useLiveData } from '@/components/shared/Plots/useLiveData'
import { useChartOptions } from '@/components/shared/Plots/useChartOptions'
import type { ConnectionStatus } from '@/types/firewallTypes'
import { utils } from '@/plugins/utils'
import LinePlot, { type DatasetOptions, type LinePlotOptions } from '@/components/shared/Plots/LinePlot.vue'

const store = useMainStore()

type TransferMeasurement = { udp: number; tcp: number; other: number }

const $t = useTranslate()
const scaleY = ref<ScaleY>('live')
const scaleProps = useTimeChartScale(scaleY, ref(0))

function formatValue(value: number | string | null): string {
  return utils.removeOverPrecision('%.2f'.format(value))
}

const { rawLiveData, liveDataTimer, getLiveData, lastLiveStatus } = useLiveData<ConnectionStatus[]>('/api/firewall/connections/status', scaleProps.options.fullSpanOptions.live)

const currentRawLiveData = computed<RawMeasurement<TransferMeasurement>[]>(() => {
  return rawLiveData.value.map(rawData => {
    return {
      time: rawData.time,
      value: {
        udp: rawData.value.filter(conn => conn.layer4 === 'udp').length,
        tcp: rawData.value.filter(conn => conn.layer4 === 'tcp').length,
        other: rawData.value.filter(conn => !['tcp', 'udp'].includes(conn.layer4)).length
      }
    } satisfies RawMeasurement<TransferMeasurement>
  })
})

const liveChartData = computed<Measurement<TransferMeasurement>[]>(() => convertSimpleMeasurement(currentRawLiveData.value))

const additionalOptions = ref<any>({
  y: {
    suggestedMin: 0,
    suggestedMax: 100
  }
} satisfies Partial<LinePlotOptions<TransferMeasurement>>)

const graphs = ref<DatasetOptions<TransferMeasurement>[]>([
  {
    key: 'udp',
    color: 'var(--color-blue-700)',
    name: 'UDP'
  },
  {
    key: 'tcp',
    color: 'var(--color-lime-300)',
    name: 'TCP'
  },
  {
    key: 'other',
    color: 'var(--color-yellow-300)',
    name: $t('Other')
  }
])
const cards = useCards({ chartData: liveChartData, values: graphs, scaleY, formatValue, speedMeasurement: false })
const options = useChartOptions({ chartData: liveChartData, scaleProps, formatValue, graphs, additionalOptions })

const tableColumns = [
  { dataIndex: 'layer3', title: $t('Network'), help: $t('Connection type.'), displayFn: (val: string) => val.toUpperCase() },
  { dataIndex: 'layer4', title: $t('Protocol'), help: $t('Protocol type TCP/UDP.'), displayFn: (val: string) => val.toUpperCase() },
  { dataIndex: 'source', title: $t('Source'), help: $t('Connection source.'), width: 'md', displayFn: (_: any, row: ConnectionStatus) => (row.sport ? `${row.src}:${row.sport}` : row.src) },
  {
    dataIndex: 'dest',
    title: $t('Destination'),
    help: $t('Connection destination.'),
    displayFn: (_: any, row: ConnectionStatus) => (row.dport ? `${row.dst_hostname ?? row.dst}:${row.dport}` : `${row.dst_hostname ?? row.dst}`)
  },
  {
    dataIndex: 'transfer',
    title: $t('Transfer'),
    help: $t('Amount of information transferred between source and destination.'),
    displayFn: (_: any, row: ConnectionStatus) => '%MB (%m pkts.)'.format(row.bytes, row.packets)
  }
]

store.spin()

getLiveData()
  .then(() => liveDataTimer.start())
  .finally(() => store.spin(false))
</script>
