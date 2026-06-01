<template>
  <vuci-form
    v-model="wifiData"
    config="wireless"
    :after-load="afterLoad"
    async-load
  >
    <template #default="{ uciData }">
      <vuci-typed-section
        :uci-data="uciData"
        :endpoints="[{ endpoint: `site_manager/wireless/interfaces/config` }]"
        data-key="wifiInterfaces"
        type="wifi-iface"
        :edit-form="WirelessInterfaceEdit"
        :edit-form-props="{
          groups: mappedGroups.value,
          devices: mappedDevices.value
        }"
        :add-validate="validateInterface"
        :error-handlers="{
          edit: data => handleEditErrorsMixin(data, getDeviceNames, 'wire')
        }"
        :add="onAdd"
        :title="$t('SSIDs')"
      >
        <template #custom-design="{ s, actions, index }">
          <tlt-horizontal-card
            v-slot="{ props: { columns } }"
            :card-props="cols(s)"
            :test-id="`rowCard-${s.id}`"
            class="mb-4"
          >
            <name-cell
              :index="index + 1"
              :value="$wireless.getName(s)"
            />
            <card-cell :columns="columns[0]" />
            <card-cell :columns="columns[1]" />
            <action-cell>
              <cell-row
                :label="$t('Actions')"
                only-mobile-label
              >
                <template #value>
                  <div class="flex gap-2">
                    <vuci-form-edit-delete
                      :id="s.id"
                      class="xl:min-w-max"
                      :actions="actions"
                    >
                      <template #delete="{ delSection }">
                        <tlt-button
                          button-id="delete"
                          type="text"
                          color="error"
                          @click="delSection(s.id)"
                          >{{ $t('Delete') }}</tlt-button
                        >
                      </template>
                    </vuci-form-edit-delete>
                  </div>
                </template>
              </cell-row>
            </action-cell>
            <action-cell>
              <cell-row
                :label="$t('Enable')"
                only-mobile-label
                class="xl:min-w-max"
              >
                <template #value>
                  <vuci-form-item-switch
                    :uci-section="s"
                    name="enabled"
                    @change="onInterfaceEnable"
                  />
                </template>
              </cell-row>
            </action-cell>
          </tlt-horizontal-card>
        </template>
      </vuci-typed-section>
    </template>
    <template #form-buttons="{ save }">
      <tlt-button
        class="ml-auto"
        button-id="saveandapply"
        @click="save"
      >
        {{ $t('Save & Sync') }}
      </tlt-button>
    </template>
  </vuci-form>
</template>
<script setup>
import { ref, computed, onMounted, onBeforeUnmount, onUnmounted, provide } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import WirelessInterfaceEdit from './SitemanWirelessEdit.vue'
import { useDevmanCommonFunction } from './SitemanCommon'
import { $bus } from '@ui-core/plugins/event-bus'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'
const message = useMessages()

const t = useTranslate()
// Use composable
const { composeAlert, handleEditErrorsMixin, mappedGroups, mappedDevices, groups, deviceStatus } = useDevmanCommonFunction()

const wifiData = ref({})
const wifiDevices = ref([])
const isWindowLg = ref(true)
const radioDisplay = {
  radio0: t('2.4GHz'),
  radio1: t('5GHz')
}
const resizeObserver = new ResizeObserver(() => {
  isWindowLg.value = window.innerWidth > 1024
})

const allRadios = computed(() => ['radio0', 'radio1'])

// Provide for inject in child components
provide('groups', mappedGroups)
provide('devices', mappedDevices)
provide('wifiDevices', wifiDevices)
provide('deviceStatus', deviceStatus)

const onError = data => composeAlert(data, getDeviceNames, 'wire')

onMounted(() => {
  resizeObserver.observe(document.body)
  $bus.on('show-edit-error', onError)
})
onBeforeUnmount(() => {
  resizeObserver.disconnect()
})
onUnmounted(() => {
  $bus.off('show-edit-error', onError)
})

function afterLoad() {
  return axios
    .bulkGet(['/api/site_manager/devices/status?exclude_firmware_status=1', '/api/site_manager/groups/config', '/api/site_manager/wireless/devices/config'])
    .then(([devicesResp, groupsResp, wifiDevicesResp]) => {
      if (!groupsResp.success) message.error(t('Failed to load Site manager group data'))
      if (!devicesResp.success) message.error(t('Failed to load Site manager device data'))
      if (!wifiDevicesResp.success) message.error(t('Failed to load Site manager wireless device data'))
      groups.value = groupsResp.success ? groupsResp.data.filter(group => group.platform === 'default') : []
      deviceStatus.value = devicesResp.success ? devicesResp.data.filter(dev => !dev.device_type.toLowerCase().includes('tsw') && !dev.device_type.toLowerCase().includes('swm')) : []
      wifiDevices.value = wifiDevicesResp.success ? wifiDevicesResp.data : []
    })
    .catch(() => {
      message.error(t('An unexpected error has occurred'))
    })
}

function cols(item) {
  let devManColumn = {
    label: t('Group'),
    value: item.dm_group_id ? mappedGroups.value?.find(group => group[0] === item.dm_group_id)?.[1] || '-' : '-'
  }
  if (item.dm_device_id) {
    devManColumn = { label: t('Devices'), value: composeDeviceNames(item) }
  }
  const columns = [[devManColumn], []]
  if (item.mesh_id) columns[1].push({ label: t('Mesh ID'), value: item.ssid || item.mesh_id || '-' })
  columns[1].push({ label: t('Encryption'), value: item.encryption || t('None') })
  if (allRadios.value.length > 1) columns[0].push({ label: t('Radios'), value: parseUsedRadios(item) })
  return {
    item,
    columns
  }
}

function parseUsedRadios(config) {
  if (!config.device || config.device.length === 0) return t('None')
  return config.device
    .map(deviceId => {
      return radioDisplay[deviceId]
    })
    .sort()
    .join(', ')
}

function composeDeviceNames(s) {
  const maxDevicesToShow = 3
  const deviceIds = [...s.dm_device_id].splice(0, maxDevicesToShow)
  const formatedDeviceNames = deviceIds.map(id => mappedDevices.value?.find(devices => devices[0] === id)?.[1] || '-')
  if (s.dm_device_id.length > maxDevicesToShow) {
    formatedDeviceNames.push(t('+%s more devices...').format(s.dm_device_id.length - maxDevicesToShow))
  }
  return formatedDeviceNames.join('; ')
}

function validateInterface() {
  const errorMessages = []
  if (errorMessages.length === 0) return { valid: true }
  errorMessages.push(t("When creating new interface all device's radios are added to it."))
  return { valid: false, message: errorMessages.join(' ') }
}

function onAdd(form) {
  if (allRadios.value.length === 1) return
  form.device = allRadios.value
}

function onInterfaceEnable({ uciSection }, newVal) {
  if (newVal === '1' && ['psk', 'psk2', 'psk+psk2', 'psk-mixed', 'sae', 'sae-mixed'].includes(uciSection.encryption) && !uciSection.key) {
    message.error(t('Can only be enabled when all required fields are filled'))
    uciSection.enabled = '0'
  }
}

function getDeviceNames(data) {
  return data?.map(data => devices.value?.find(device => device.mac === data.device_mac)?.custom_name) || []
}
</script>
