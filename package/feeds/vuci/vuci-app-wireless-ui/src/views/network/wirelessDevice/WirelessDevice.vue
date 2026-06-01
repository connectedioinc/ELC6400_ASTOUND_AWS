<template>
  <vuci-form
    v-slot="{ uciData }"
    :after-load="afterLoad"
    :extra-load="extraLoad"
    async-load
    config="wireless"
    bulk-request
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :title="$t('Global settings')"
      :endpoints="[{ endpoint: 'wireless/devices/global' }]"
      :after-save="afterSave"
      data-key="wifiGlobal"
    >
      <vuci-form-item-select
        :uci-section="s"
        name="country"
        :label="$t('Country code')"
        :help="$t('The country code is used for regulatory compliance. Different areas allow different maximum transmit power and operating frequencies.')"
        :options="countryOptions"
      />
      <vuci-form-item-radio-group
        :uci-section="s"
        :label="$t('Installation type')"
        :help="
          $t('The installation type is used for regulatory compliance. In most countries outdoor installations have additional restrictions for maximum transmit power and operating frequencies.')
        "
        name="location"
        :options="$wireless.getRadioUseOptions()"
      />
    </vuci-named-section>
    <vuci-typed-section
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'wireless/devices/config' }]"
      data-key="wifiDevice"
      type="wifi-device"
      :title="$t('Radios')"
      :form-methods="['edit', 'get']"
      :edit-form="markRaw(editModal)"
    >
      <template #custom-design="{ s, index, actions }">
        <tlt-horizontal-card
          v-slot="{ props: status }"
          class="mb-4 last:mb-0"
          :test-id="`rowCard-${s.id}`"
          :card-props="getStatus(s.id)"
          :is-first="index === 0"
          :is-last="index === uciData?.interfaces?.length - 1"
        >
          <name-cell :value="status?.band" />
          <card-cell>
            <cell-row
              key="status"
              :label="$t('Status')"
              :value="parseStatusMessage(status)?.value"
              :value-class="parseStatusMessage(status)?.class"
            />
            <cell-row
              key="channel"
              :label="$t('Channel')"
              :value="'%s (%s MHz)'.format(status?.channel ?? '-', status?.frequency ?? '-')"
            />
          </card-cell>
          <card-cell>
            <cell-row
              key="standard"
              :label="$t('Standard')"
              :value="status?.standard"
            />
            <cell-row
              key="power"
              :label="$t('Power')"
            >
              <template #value>
                <div
                  :id="`${s.id}-power`"
                  class="flex gap-2 items-center"
                >
                  {{ '%s dBm (%s mW)'.format(status?.txpower ?? '-', status?.txpower !== undefined ? dbmTomWatt(status?.txpower) : '-') }}
                  <tlt-icon
                    v-if="powerLimitNotReached(s, status)"
                    icon="info"
                    class="text-theme-text-info size-5"
                  />
                </div>
                <tlt-popover
                  v-if="powerLimitNotReached(s, status)"
                  :target="`#${s.id}-power`"
                  :content="$t('Current power is lower than the configured value. This may occur if the configured power exceeds the device and/or regional limits.')"
                />
              </template>
            </cell-row>
          </card-cell>
          <action-cell>
            <cell-row
              :label="$t('Actions')"
              only-mobile-label
            >
              <template #value>
                <vuci-form-edit-delete
                  :id="s.id"
                  class="xl:min-w-max"
                  :actions="actions"
                  :delete-btn="false"
                />
              </template>
            </cell-row>
          </action-cell>
          <action-cell>
            <cell-row
              :label="$t('Enable')"
              only-mobile-label
            >
              <template #value>
                <vuci-form-item-switch
                  class="xl:min-w-max"
                  :uci-section="s"
                  name="enabled"
                />
              </template>
            </cell-row>
          </action-cell>
        </tlt-horizontal-card>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script lang="ts" setup>
import { ref, computed, markRaw, provide } from 'vue'
import editModal from './WirelessDeviceEdit.vue'
import type { WifiDevice, WifiDeviceGlobal, WifiDeviceOptions, WifiDeviceStatus, WifiInterface } from '@/types/wirelessTypes'
import { useMainStore } from '@/stores/main'
import { useTimer } from '@ui-core/composables/useTimer'
import { axios, type ApiErrorResponse, type ApiResponse } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { FormOptionKey, type FormData } from './WirelessDeviceCommon'
const store = useMainStore()
const message = useMessages()
const $t = useTranslate()

const countryOptions = computed(() => {
  const countrylist = deviceOptions.value[0]?.options.countrylist
  if (!countrylist) return []
  return countrylist.map(country => [country?.alpha2, `${country?.alpha2} - ${country?.name}`])
})

const statuses = {
  pending: {
    value: $t('Pending'),
    class: 'text-theme-text-warning'
  },
  running: {
    value: $t('Running'),
    class: 'text-theme-text-success'
  },
  stopped: {
    value: $t('Stopped'),
    class: 'text-theme-text-danger'
  },
  default: {
    value: '-',
    class: ''
  }
}

function parseStatusMessage(status: WifiDeviceStatus | undefined) {
  if (!status || Object.keys(status).length === 2) return statuses.default
  const { pending, up: isUp } = status
  if (pending) return statuses.pending
  return isUp ? statuses.running : statuses.stopped
}

const deviceOptions = ref<WifiDeviceOptions[]>([])
function extraLoad() {
  return axios
    .bulkGet(['/api/wireless/devices/basic/status', '/api/wireless/devices/options?exclude=features'])
    .then(([wifiStatus, wifiOptions]) => {
      if (wifiStatus.success) deviceStatus.value = wifiStatus.data
      else message.error($t('Failed to load device status'))
      if (wifiOptions.success) deviceOptions.value = wifiOptions.data
      else message.error($t('Failed to load device option data'))
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
    .finally(() => {
      timer.start()
    })
}

const deviceStatus = ref<WifiDeviceStatus[]>(
  Object.keys(store.board!.wlan!).map(deviceName => ({
    id: `radio${deviceName.substring(4, 5)}`,
    band: deviceName === 'wlan0' ? '2.4GHz' : '5GHz'
  })) as WifiDeviceStatus[]
)
function getStatus(id: string) {
  return deviceStatus.value.find(status => status.id === id)
}
const timer = useTimer({ method: refreshData, time: 5000, autostart: false, immediate: false })
function refreshData() {
  return axios
    .get('/api/wireless/devices/basic/status')
    .then(({ data }) => {
      deviceStatus.value = data
    })
    .catch(() => {
      message.error($t('Failed to refresh wireless device status'))
    })
}

function dbmTomWatt(dbm: number): number {
  return Math.floor(Math.pow(10, dbm / 10))
}

function powerLimitNotReached(config: WifiDevice, status: WifiDeviceStatus) {
  return config.tx_power && status.txpower && Number(config.tx_power) > status.txpower
}

const wifiInterfaces = ref<WifiInterface[]>([])
function afterLoad(form: FormData) {
  initialForm.value = JSON.parse(JSON.stringify(form))
  return axios
    .get('/api/wireless/interfaces/config')
    .then(({ data }) => {
      wifiInterfaces.value = data
    })
    .catch(() => {
      message.error($t('Failed to load wireless interface data'))
    })
}
const initialForm = ref<{ wifiGlobal: WifiDeviceGlobal[] }>({ wifiGlobal: [] })

async function afterSave(_: never, res: ApiResponse<WifiDeviceGlobal> | ApiErrorResponse) {
  if (!res.success) return
  if (initialForm.value.wifiGlobal[0]?.country === res.data.country) return
  await extraLoad()
  initialForm.value.wifiGlobal[0] = JSON.parse(JSON.stringify(res.data))
}

provide(FormOptionKey, {
  deviceStatus,
  deviceOptions,
  wifiInterfaces
})
</script>
