<template>
  <template v-if="navigation.length === 1">
    <tlt-table
      id="scan-results"
      :title="scanTitle"
      :columns="columns"
      :data-source="filteredResults"
      @refresh="performScan"
    >
      <template #signal="{ record }">
        <tlt-hint
          :hints="[
            {
              info: $t('Signal : %s dB / Quality : %s  / %s.').format(formatSignal(record).signal, formatSignal(record).qval, formatSignal(record).qmax)
            }
          ]"
        >
          <tlt-wifi-signal :percents="formatSignal(record).scale" />
        </tlt-hint>
      </template>
      <template #join="{ record }">
        <tlt-button
          button-id="joinnetwork"
          type="text"
          @click="joinNetwork(record)"
        >
          {{ $t('Join network') }}
        </tlt-button>
      </template>
    </tlt-table>
  </template>
  <tlt-card
    v-else
    :title="scanTitle"
  >
    <wireless-join
      v-if="selectedNetwork"
      :network="selectedNetwork!"
      @submit="joinWithPassword"
    />
  </tlt-card>
</template>
<script lang="ts" setup>
import { computed, inject, onMounted, ref, type Ref } from 'vue'
import type { ScanResult, WifiInterface } from '@/types/wirelessTypes'
import WirelessJoin, { type JoinForm } from './WirelessJoin.vue'
import { axios, retryRequest } from '@ui-core/plugins/axios'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import type { TableColumn } from '@ui-core/components/table/types'
import { useMainStore } from '@/stores/main'
import { wireless } from '@/plugins/wireless'
import type { AxiosRequestConfig } from 'axios'
import { FormDataKey, type FormModel } from './WirelessInterfaceCommon'
import { isArray } from '@ui-core/utils/inspect'
import type { Interface } from '@/types/networkTypes'

export interface Props {
  uciData: any
  device: string
  navigation: string[]
  interfaces: Interface[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'network-select': [string]
  'network-joined': [WifiInterface, ScanResult]
}>()

const $t = useTranslate()
const message = useMessages()
const store = useMainStore()
const formData = inject(FormDataKey) as Ref<FormModel>

const scanResults = ref<ScanResult[]>([])
const selectedNetwork = ref<ScanResult | null>(null)

const columns = [
  { dataIndex: 'signal', title: $t('Signal'), actions: { sort: true } },
  { dataIndex: 'ssid', title: $t('SSID'), actions: { sort: true } },
  { dataIndex: 'channel', title: $t('Channel'), actions: { sort: true } },
  { dataIndex: 'mode', title: $t('Mode'), displayFn: modeTranslation, actions: { sort: true, filter: { type: 'uniqueValues' } } },
  { dataIndex: 'bssid', title: $t('BSSID'), actions: { sort: true } },
  { dataIndex: 'encryption_description', title: $t('Encryption'), actions: { sort: true } },
  { dataIndex: 'join' }
] as TableColumn[]

const scanTitle = computed(() => (selectedNetwork.value ? $t('Joining network: %s').format(selectedNetwork.value.ssid) : $t('Wireless scan results')))
const filteredResults = computed(() => scanResults.value.filter(station => station.ssid))

function modeTranslation(s: string) {
  const translations: Record<string, string> = {
    Unknown: $t('Unknown'),
    'Access Point': $t('Access Point'),
    'Ad-Hoc': $t('Ad-Hoc'),
    Client: $t('Client'),
    Monitor: $t('Monitor'),
    'Access Point (VLAN)': $t('Access Point (VLAN)'),
    WDS: $t('WDS'),
    'Mesh Point': $t('Mesh Point'),
    'P2P Client': $t('P2P Client'),
    'P2P Go': $t('P2P Go')
  }
  return translations[s] ?? s ?? '-'
}
function formatSignal(bss: ScanResult) {
  const qval = bss.quality || 0
  const qmax = bss.quality_max || 100
  const scale = Math.round((100 / qmax) * qval)
  return {
    scale,
    signal: bss.signal,
    qval,
    qmax
  }
}

onMounted(performScan)
function performScan() {
  store.spin($t('Scanning...'))
  const request: AxiosRequestConfig = {
    method: 'POST',
    url: '/api/wireless/actions/scan',
    data: { data: { device: props.device } }
  }
  const checkForTempError = (e: any) => e?.response?.data?.errors?.find((error: any) => error.code === 6) ?? false
  return retryRequest<{ data: ScanResult[] }>(request, { retryCondition: checkForTempError, delay: 5000 })
    .then(({ data: { data } }) => {
      if (data.length < 1) return
      scanResults.value = data.sort((a, b) => b.quality - a.quality)
    })
    .catch(e => {
      if (e.response?.data.errors[0].code === 3) {
        message.error($t('Wireless scan can not be performed when DFS channel and FCC regulatory domain is selected'))
      } else {
        message.error($t('Failed to perform a scan'))
      }
    })
    .finally(() => store.spin(false))
}

function joinNetwork(network: ScanResult) {
  const validationSsid = wireless.validateRadios(formData.value.wifiInterfaces, [props.device])
  if (!validationSsid.valid) return message.error(validationSsid.message)
  const validationClient = wireless.validateClient(formData.value.wifiInterfaces, [props.device])
  if (network.mode !== 'Mesh Point' && !validationClient.valid) return message.error(validationClient.message)
  if (network.mode === 'Mesh Point' && formData.value.wifiInterfaces.some(iface => iface.mode === 'mesh' && iface.mesh_id === network.ssid && iface.device.includes(props.device))) {
    return message.error($t('This mesh is already configured for this network'))
  }
  const selectedName = network.ssid || $t('Unnamed network')
  if (network.encryption.enabled) {
    if (network.encryption?.authentication?.includes('802.1x')) {
      return sendJoinNetwork(
        {
          ssid: network.ssid,
          bssid: network.bssid
        },
        network
      )
    }
    emit('network-select', selectedName)
    selectedNetwork.value = network
  } else {
    return sendJoinNetwork(
      {
        ssid: network.ssid,
        bssid: network.bssid
      },
      network
    )
  }
}
function joinWithPassword(form: JoinForm) {
  sendJoinNetwork(
    {
      ssid: selectedNetwork.value!.ssid,
      bssid: selectedNetwork.value!.bssid,
      password: form.password
    },
    selectedNetwork.value!
  )
}
function joinMeshNetwork(data: { ssid: string; bssid: string; password?: string }, network: ScanResult) {
  const postData: Partial<WifiInterface> = {
    enabled: '1',
    mode: 'mesh',
    mesh_id: data.ssid,
    encryption: network.encryption?.authentication?.includes('sae') ? 'sae' : 'none',
    key: data.password,
    network: wireless.getAutoNetworkName(props.interfaces.map(iface => iface.name))
  }
  if (wireless.radioOptions().length > 1) postData.device = isArray(props.device) ? props.device : [props.device]
  return axios
    .post('/api/wireless/interfaces/config', { data: postData })
    .then(({ data }) => {
      emit('network-joined', data, network)
    })
    .catch(() => {
      message.error($t('Failed to join network'))
    })
    .finally(() => {
      store.spin(false)
    })
}
function sendJoinNetwork(data: { ssid: string; bssid: string; password?: string }, network: ScanResult) {
  const fullData = {
    ...data,
    device: props.device
  }
  store.spin($t('Joining network'))
  if (network.mode === 'Mesh Point') return joinMeshNetwork(fullData, network)
  return axios
    .post('/api/wireless/actions/join?use_cache=true', { data: fullData })
    .then(({ data }) => {
      emit('network-joined', data, network)
    })
    .catch(() => {
      return message.error($t('Failed to join network'))
    })
    .finally(() => {
      store.spin(false)
    })
}
</script>
