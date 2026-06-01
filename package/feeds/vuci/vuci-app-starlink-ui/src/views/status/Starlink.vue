<template>
  <tlt-alert
    v-if="errorCount > 2"
    id="starlink-inaccessible"
    type="warning"
    :text="$t('The Starlink service seems to be unavailable. Please check your connection and try again later.')"
  />
  <GridLayout
    class="grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4"
    gap="none"
  >
    <div
      v-for="(card, key, idx) in cards"
      :key="key"
      class="border-b-theme-border-base border-b py-4"
    >
      <div
        class="h-full p-5"
        :class="{ 'lg:border-r': idx < Object.keys(cards).length - 1 }"
      >
        <tlt-card-new
          class="py-0!"
          :item="card"
          borderless
        />
      </div>
    </div>
  </GridLayout>
  <div class="flex justify-end gap-4">
    <tlt-button
      v-for="action in actions"
      :key="action.name"
      :color="action.buttonColor"
      :button-id="action.name"
      :disabled="!starlinkAccesible || !session.hasAccess('status/starlink', 'write')"
      @click="promptAction(action)"
    >
      {{ action.title }}
    </tlt-button>
  </div>
</template>

<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages, usePrompt, useNotifications } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'
import { ref, computed, watch } from 'vue'
import { useTimer } from '@ui-core/composables/useTimer'
import TltAlert from '@/components/Messenger/TltAlert.vue'
import { useMainStore } from '@/stores/main'
import { session } from '@ui-core/plugins/session'
import type { StarlinkDishStatus } from '@/types/starlinkTypes'

const message = useMessages()
const $t = useTranslate()
const notification = useNotifications()
const store = useMainStore()
const prompt = usePrompt()

const actions = [
  { name: 'unstow', buttonColor: 'secondary', title: $t('Unstow'), success: $t('The dish is being unstowed'), error: $t('Failed to unstow the dish') },
  { name: 'stow', buttonColor: 'primary', title: $t('Stow'), success: $t('The dish is being stowed'), error: $t('Failed to stow the dish') },
  { name: 'reboot', buttonColor: 'primary', title: $t('Reboot'), success: $t('The dish is rebooting'), error: $t('Failed to reboot the dish') }
] as const

const mobilityClasses: Record<string, string> = {
  stationary: $t('Stationary'),
  nomadic: $t('Nomadic'),
  mobile: $t('Mobile')
}

const dishAlerts: Record<string, { type: 'info' | 'warning' | 'error'; text: string }> = {
  roaming: { type: 'info', text: $t('Dish is roaming') },
  installPending: { type: 'info', text: $t('Dish update installation is pending') },
  isHeating: { type: 'info', text: $t('Dish is heating') },
  isPowerSaveIdle: { type: 'info', text: $t('Dish is in power save idle mode') },
  obstructionMapReset: { type: 'info', text: $t('Dish obstruction map has been reset') },
  mastNotNearVertical: { type: 'warning', text: $t('Dish mast is not near vertical') },
  slowEthernetSpeeds: { type: 'warning', text: $t('Dish is experiencing slow Ethernet speeds') },
  movingWhileNotMobile: { type: 'warning', text: $t('Dish is moving while not in mobile mode') },
  movingTooFastForPolicy: { type: 'warning', text: $t('Dish is moving too fast for policy') },
  lowMotorCurrent: { type: 'warning', text: $t('Dish is experiencing low motor current') },
  lowerSignalThanPredicted: { type: 'warning', text: $t('Dish is receiving lower signal than predicted') },
  slowEthernetSpeeds100mbps: { type: 'warning', text: $t('Dish is experiencing slow Ethernet speeds (100 Mbps)') },
  motorsStuck: { type: 'error', text: $t('Dish motors are stuck') },
  thermalShutdown: { type: 'error', text: $t('Dish is in thermal shutdown') },
  unexpectedLocation: { type: 'error', text: $t('Dish is in an unexpected location') },
  dbfTelemStale: { type: 'error', text: $t('Dish DBF telemetry is stale') },
  powerSupplyThermalThrottle: { type: 'error', text: $t('Dish power supply is in thermal throttle') },
  thermalThrottle: { type: 'error', text: $t('Dish is in thermal throttle') }
}

const status = ref<StarlinkDishStatus>({
  id: '',
  hardware_version: '',
  software_version: '',
  uplink_throughput: 0,
  downlink_throughput: 0,
  pop_ping_latency: 0,
  alerts: {}
})

const cards = computed(() => ({
  hw_card: {
    name: 'hardware_info',
    title: $t('Hardware'),
    columns: [
      {
        name: 'id',
        label: 'ID',
        value: status.value.id || $t('N/A'),
        hint: $t('ID of the Starlink dish.')
      },
      {
        name: 'hardware_version',
        label: $t('Hardware version'),
        value: status.value.hardware_version || $t('N/A'),
        hint: $t('Hardware version of the Starlink dish.')
      },
      {
        name: 'software_version',
        label: $t('Software version'),
        value: status.value.software_version || $t('N/A'),
        hint: $t('Software version of the Starlink dish.')
      }
    ]
  },
  antenna_card: {
    name: 'antenna',
    title: $t('Antenna'),
    columns: [
      {
        name: 'currently_obstructed',
        label: $t('Currently obstructed'),
        value: status.value.currently_obstructed ? $t('Yes') : status.value.currently_obstructed === false ? $t('No') : $t('N/A'),
        hint: $t('Whether the dish is currently obstructed.')
      },
      {
        name: 'fraction_obstructed',
        label: $t('Fraction obstructed'),
        value: status.value.fraction_obstructed ? `${(status.value.fraction_obstructed * 100).toFixed(2)} %` : $t('N/A'),
        hint: $t('Fraction of the dish that is obstructed.')
      },
      {
        name: 'boresight_azimuth_deg',
        label: $t('Boresight azimuth'),
        value: status.value.boresight_azimuth_deg ? `${status.value.boresight_azimuth_deg.toFixed(2)} °` : $t('N/A'),
        hint: $t('Boresight azimuth of the dish in degrees.')
      },
      {
        name: 'boresight_elevation_deg',
        label: $t('Boresight elevation'),
        value: status.value.boresight_elevation_deg ? `${status.value.boresight_elevation_deg.toFixed(2)} °` : $t('N/A'),
        hint: $t('Boresight elevation of the dish in degrees.')
      }
    ]
  },
  network_card: {
    name: 'network_info',
    title: $t('Network'),
    columns: [
      {
        name: 'downlink_throughput',
        label: $t('Downlink throughput'),
        value: status.value.downlink_throughput ? '%mbps'.format(status.value.downlink_throughput) : $t('N/A'),
        hint: $t('Downlink throughput of the Starlink dish.')
      },
      {
        name: 'uplink_throughput',
        label: $t('Uplink throughput'),
        value: status.value.uplink_throughput ? '%mbps'.format(status.value.uplink_throughput) : $t('N/A'),
        hint: $t('Uplink throughput of the Starlink dish.')
      },
      {
        name: 'pop_ping_latency',
        label: $t('Pop ping latency'),
        value: status.value.pop_ping_latency && status.value.pop_ping_latency >= 0 ? `${status.value.pop_ping_latency.toFixed(2)} ms` : $t('N/A'),
        hint: $t('Ping latency to the Starlink Point of Presence (PoP) in milliseconds.')
      },
      {
        name: 'pop_ping_drop_rate',
        label: $t('Pop ping drop rate'),
        value: status.value.pop_ping_drop_rate ?? $t('N/A'),
        hint: $t('Drop rate of pings to the Starlink Point of Presence (PoP).')
      }
    ]
  },
  misc_card: {
    name: 'misc',
    title: $t('Misc'),
    columns: [
      {
        name: 'mobility_class',
        label: $t('Mobility class'),
        value: status.value.mobility_class ? mobilityClasses[status.value.mobility_class] : $t('N/A'),
        hint: $t('Mobility class of the Starlink dish.')
      }
    ]
  }
}))

watch(
  () => status.value.alerts,
  alerts => {
    Object.entries(alerts)
      .filter(([, value]) => value)
      .map(([key]) => ({ key, ...(dishAlerts[key] ?? { type: 'info', text: key }) }))
      .forEach(data => {
        notification[data.type]({
          id: `starlink-alert-${data.key}`,
          text: data.text
        })
      })
  }
)

const errorCount = ref<number>(0)
const starlinkAccesible = ref<boolean>(false)
useTimer({ method: getStatus, time: 2000, autostart: true, immediate: true })
function getStatus() {
  return axios
    .get('/api/starlink/status')
    .then(response => {
      status.value = response.data
      errorCount.value = 0
      starlinkAccesible.value = true
    })
    .catch(() => {
      if (errorCount.value < 3) message.error($t('Failed to retrieve Starlink status'))
      errorCount.value++
      starlinkAccesible.value = false
    })
}

function promptAction(action: (typeof actions)[number]) {
  if (action.name === 'reboot')
    return prompt.show({
      title: $t('Are you sure you want to reboot the Starlink?'),
      content: $t('The Starlink dish will be rebooted shortly.'),
      okText: $t('Confirm'),
      cancelText: $t('Cancel'),
      onOk: () => {
        return performAction(action)
      }
    })
  return performAction(action)
}

function performAction(action: (typeof actions)[number]) {
  store.spin()
  return axios
    .post(`/api/starlink/actions/${action.name}`)
    .then(() => {
      message.success(action.success)
    })
    .catch(() => {
      message.error(action.error)
    })
    .finally(() => {
      store.spin(false)
    })
}
</script>
