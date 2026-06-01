<template>
  <tlt-routing-card
    card-title="BGP"
    :cards="cards"
    :table-columns="tableColumns"
    :cards-columns="cardColumns"
    :max-number-of-column-elements="2"
  >
    <template #cell-row-value="{ item }">
      <div
        v-if="item.label === $t('Neighbor')"
        class="text-theme-text-primary font-semibold"
      >
        {{ item.value }}
      </div>
      <div
        v-if="item.label === $t('State')"
        :class="item.value ? 'text-theme-text-success' : 'text-theme-text-danger'"
      >
        {{ item.value ? STATE.ACTIVE : STATE.INACTIVE }}
      </div>
    </template>
    <template #valid="{ record }">
      <div :class="record.valid === USAGE.VALID ? 'text-theme-text-success' : 'text-theme-text-danger'">{{ record.valid }}</div>
    </template>
  </tlt-routing-card>
</template>
<script lang="ts" setup>
import { type Card } from '@ui-core/tlt-design/overview/TltRoutingCard.vue'
import { type BGPNeighbor, type DefaultBGPNeighbor } from './bgp'
import { axios } from '@ui-core/plugins/axios'
import { ref } from 'vue'
import { useMainStore } from '@/stores/main'
import { useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useTimer } from '@ui-core/composables/useTimer'
import type { TableColumn } from '@ui-core/components/table/types'

const store = useMainStore()
const message = useMessages()
const $t = useTranslate()
store.spin()
useTimer({ time: 10000, immediate: true, repeat: true, method: getData, autostart: true })

type TableData = {
  vrf: string
  network: string
  valid: string
}

const STATE = {
  ACTIVE: $t('Active'),
  INACTIVE: $t('Inactive')
}

const USAGE = {
  VALID: $t('Used'),
  INVALID: $t('Unused')
}

let firstLoad = true
const cards = ref<Card[]>([])

const tableColumns: TableColumn[] = [
  {
    dataIndex: 'network',
    title: $t('Network'),
    actions: { sort: true }
  },
  { dataIndex: 'vrf', title: $t('VRF') },
  {
    dataIndex: 'valid',
    title: $t('Usage state'),
    actions: { filter: { type: 'uniqueValues' } }
  }
]

const cardColumns = [
  { name: 'id', label: $t('Neighbor') },
  { name: 'bgpState', label: $t('State') },
  { name: 'remoteAs', label: $t('Remote AS') },
  { name: 'remoteRouterId', label: $t('Remote ID') },
  { name: 'localAs', label: $t('Local AS') },
  { name: 'hostLocal', label: $t('Local host') },
  { name: 'bgpTimerUpString', label: $t('Uptime') },
  { name: 'pathFrom', label: $t('Path from') }
]

function getData() {
  return axios
    .get('/api/bgp/status')
    .then(({ data }) => {
      if (!data) return
      const _cards: Card[] = Object.entries(data)
        .filter(([k]) => k.toLowerCase() !== 'default')
        .map(([ip, value]) => {
          const val = value as BGPNeighbor
          const cardData = {
            id: ip,
            pathFrom: val.remoteAs === val.localAs ? $t('Internal') : $t('External'),
            bgpState: val.bgpState?.toLowerCase() === 'active' ? STATE.ACTIVE : STATE.INACTIVE,
            remoteAs: val.remoteAs || '-',
            remoteRouterId: val.remoteRouterId || '-',
            localAs: val.localAs || '-',
            hostLocal: val.hostLocal || '-',
            acceptedPrefixCounter: val.addressFamilyInfo?.ipv4Unicast?.acceptedPrefixCounter || val.addressFamilyInfo?.['ipv4Unicast']?.acceptedPrefixCounter || '-',
            bgpTimerUpString: val.bgpTimerUpString || '-'
          }
          return {
            id: ip,
            data: cardData,
            tableData: getTableData(data.default || data.Default, ip)
          }
        })
      cards.value = _cards
    })
    .catch(() => {
      message.error($t('Failed to load bgp data'))
    })
    .finally(() => {
      if (firstLoad) {
        store.spin(false)
        firstLoad = false
      }
    })
}

function getTableData(defaultNeighbor: DefaultBGPNeighbor, ip: string): TableData[] {
  const vrfId = String(defaultNeighbor.vrfId)
  const vrfName = String(defaultNeighbor.vrfName)
  const vrf = vrfId?.concat('/', vrfName)
  return Object.values(defaultNeighbor.routes)
    .map(routes => {
      const { prefix, prefixLen, valid, peerId } = routes[0]
      if (peerId === ip) {
        return {
          vrf,
          network: prefix ? `${prefix}/${prefixLen}` : '-',
          valid: valid ? USAGE.VALID : USAGE.INVALID
        }
      }
      return undefined
    })
    .filter(v => !!v) as TableData[]
}
</script>
