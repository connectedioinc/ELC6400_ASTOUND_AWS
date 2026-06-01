<template>
  <NavigationTabs
    v-model:selected="selectedTab"
    :tabs="tabs"
  >
    <template #band2_4>
      <channel
        :name="selectedTab"
        :min-channel="1"
        :max-channel="14"
        :channel-width-lengths="{ 20: 5, 40: 8 }"
        :scanned-devices="scannedDevices24GHz"
        :scan-wifi="scanWifi"
        :scan-timestamp="scannedDevices.timestamp"
      />
    </template>
    <template #band5>
      <channel
        :name="selectedTab"
        :min-channel="36"
        :max-channel="165"
        :channel-width-lengths="{ 20: 4, 40: 8, 80: 16, 160: 32 }"
        :tick-manipulation="{ offset: 42, multiple: 8, count: { mobile: 8, tablet: 16, desktop: 16 }, aligmentGaps: [[146, 147]] }"
        :scanned-devices="scannedDevices5GHz"
        :scan-wifi="scanWifi"
        :scan-timestamp="scannedDevices.timestamp"
      />
    </template>
    <template #rating>
      <rating
        :radio-devices="radioDevices"
        :scanned="{ scannedDevices24GHz, scannedDevices5GHz }"
      />
    </template>
  </NavigationTabs>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import Channel from '../../components/status/Channel.vue'
import Rating from '../../components/status/Rating.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMainStore } from '@/stores/main'
import { wireless } from '@/plugins/wireless'
import { useLocalStorage } from '@vueuse/core'
import { useRoute } from 'vue-router'
import type { ParsedScanResults, PreparsedScanResults, ScanResult } from '@/types/wirelessTypes'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'

defineOptions({
  layout: 'none'
})

const $t = useTranslate()
const message = useMessages()
const store = useMainStore()
const route = useRoute()

const cacheKey = `${route.path}/scannedDeviceData`

const radioDevices = ref(wireless.radioOptions())

const scannedDevices = useLocalStorage<{ timestamp: null | number; data: PreparsedScanResults[] }>(cacheKey, { timestamp: null, data: [] })

const selectedTab = ref(undefined)

const tabs = computed(() => [
  { name: 'band2_4', title: $t('2.4 GHz') },
  { name: 'band5', title: $t('5 GHz'), show: radioDevices.value.length > 1 },
  { name: 'rating', title: $t('Rating') }
])

const parsedDevices = computed<ParsedScanResults[]>(() =>
  scannedDevices.value.data.map(device => ({
    ...device,
    channel_width: parseChannelWidth(device),
    channel_center: parseChannelCenter(device)
  }))
)

const scannedDevices24GHz = computed(() => parsedDevices.value.filter(dev => dev.band === '2.4GHz'))
const scannedDevices5GHz = computed(() => parsedDevices.value.filter(dev => dev.band === '5GHz'))

function parseChannelWidth(device: PreparsedScanResults) {
  // channel width table: https://git.teltonika.lt/teltonika/rutx_open/-/issues/26870#note_2050389
  if ((!device.ht_operation && !device.vht_operation) || device.ht_operation?.secondary_channel_offset === 'no secondary') return 20
  if (device.vht_operation) {
    return device.vht_operation.center_freq_2 ? 160 : device.vht_operation.channel_width
  }
  return 40
}

// Offset for 40mhz ht_operation
const CenterOffset = 2
const CenterOffsetDirection: { [key in NonNullable<PreparsedScanResults['ht_operation']>['secondary_channel_offset']]: number } = { 'no secondary': 0, above: 1, below: -1 }
function parseChannelCenter(device: PreparsedScanResults) {
  if (!device.ht_operation && !device.vht_operation) return device.channel
  // vh status does not have center channel so it needs to be calculated by hand
  const finalCenterOffset = CenterOffset * CenterOffsetDirection[device.ht_operation?.secondary_channel_offset ?? 'no secondary']
  const vh_center = device.ht_operation?.secondary_channel_offset === 'no secondary' ? device.channel : device.channel + finalCenterOffset
  return device.vht_operation?.center_freq_2 || device.vht_operation?.center_freq_1 || vh_center
}

function scanWifi() {
  store.spin($t('Scanning...'))
  const requests = radioDevices.value.map(([device]) => ({
    method: 'POST',
    endpoint: '/api/wireless/actions/scan',
    data: { device }
  }))
  return axios
    .bulk(requests, { cancellable: true })
    .then(res => {
      res
        .filter(r => !r.success)
        .forEach((r, idx) => {
          if (r.errors?.[0]?.code === 3) {
            message.error($t('Wireless scan cannot be performed for 5GHz network when DFS channel and FCC regulatory domain is selected'))
          } else {
            message.error($t('Failed to load %s networks data').format(radioDevices.value[idx][1]))
          }
        })
      const parsedRes = res.flatMap((devices, idx) => {
        if (!devices.success) return []
        return (devices.data as ScanResult[]).map<PreparsedScanResults>(device => ({
          ...device,
          band: radioDevices.value[idx][1]
        }))
      })
      scannedDevices.value = {
        data: parsedRes,
        timestamp: Date.now()
      }
    })
    .finally(() => {
      store.spin(false)
    })
}
</script>
