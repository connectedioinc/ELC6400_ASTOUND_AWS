<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="siteman_groups"
    :after-load="loadData"
  >
    <vuci-typed-section
      :title="$t('All groups')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'site_manager/groups/config' }]"
      data-key="groups"
      type="group"
      :edit-form="EditForm"
      :form-methods="['get', 'create', 'delete']"
      :columns="groupDeviceColumns"
      search
      pagination
      :edit-form-props="{
        displayPlatform: val => returnPlatformName(val)
      }"
      @reload-data="loadStatus"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
          :display-value="returnName"
        />
      </template>
      <template #platform="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="platform"
          :display-value="returnPlatformName"
        />
      </template>
      <template #deviceNames="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="devices"
          :display-value="() => composeDeviceNames(s)"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.name"
          required
          :rules="instanceExists"
          :label="$t('Name')"
          prop="name"
        />
        <tlt-form-item-select
          v-model="addModel.platform"
          required
          :options="deviceTypes"
          :label="$t('Device type')"
          prop="platform"
        />
      </template>
      <template #deleteBtn="{ s, actions }">
        <tlt-popover
          v-show="s.name === 'default'"
          target="#delete"
          expand-to="right-start"
          :content="$t('Default group can not be deleted')"
        />
        <tlt-button
          id="delete"
          class="mr-1"
          test-id="button-delete"
          type="text"
          color="error"
          :readonly="s.default == '1'"
          @click="actions.delete(s.id)"
        >
          {{ $t('Delete') }}
        </tlt-button>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import EditForm from './SitemanGroupEdit.vue'
import { $bus } from '@ui-core/plugins/event-bus'
import type { DevmanGroupConfig, DevmanDeviceConfig, DevmanDeviceStatus } from './SitemanTypes'
import { axios } from '@ui-core/plugins/axios'
import { useDevmanCommonFunction, providePairedContext } from './SitemanCommon'

const { composeAlert } = useDevmanCommonFunction()

const $t = useTranslate()
const message = useMessages()

const formData = ref<{ groups: DevmanGroupConfig[]; devices: DevmanDeviceConfig[] }>({
  groups: [],
  devices: []
})

const groupDeviceColumns = [
  { name: 'name', label: $t('Name') },
  { name: 'platform', label: $t('Platform') },
  { name: 'deviceNames', label: $t('Devices') }
]

const deviceStatuses = ref<DevmanDeviceStatus[]>([])

const pairedDeviceIds = computed(() => {
  return deviceStatuses.value.filter(device => device.paired).map(device => device.id)
})

const deviceTypes = [
  { key: 'default', value: $t('Access points') },
  { key: 'switch', value: $t('Switches') }
]

providePairedContext({
  pairedDeviceIds,
  deviceStatuses
})

const loadStatusCallback = () => {
  loadStatus()
}

const showEditErrorCallback = (data: any) => composeAlert(data, getDeviceNames)

onMounted(() => {
  $bus.on('reload-data', loadStatusCallback)

  $bus.on('show-edit-error', showEditErrorCallback)
})

onUnmounted(() => {
  $bus.off('reload-data', loadStatusCallback)
  $bus.off('show-edit-error', showEditErrorCallback)
})

function returnName(name: string) {
  return name.length > 20 ? name.slice(0, 20) + '...' : name
}

function returnPlatformName(name: string) {
  const translations = {
    default: $t('Access points'),
    switch: $t('Switches')
  }
  return translations[name] || '-'
}

function loadData() {
  return loadStatus().then(() => {
    return axios
      .get('/api/site_manager/devices/config')
      .then(({ data }) => {
        formData.value.devices = sortByGroup(data)
        return { devices: formData.value.devices }
      })
      .catch(() => {
        message.error($t('Failed to load device status'))
      })
  })
}

function loadStatus() {
  return axios
    .get('/api/site_manager/devices/status/?exclude_firmware_status=1')
    .then(({ data }) => {
      deviceStatuses.value = data
    })
    .catch(() => {
      message.error($t('Failed to load device status'))
    })
}

function sortByGroup(data: DevmanDeviceConfig[]) {
  return data.sort((a, b) => {
    if (a.group_name && !b.group_name) {
      return -1
    } else if (!a.group_name && b.group_name) {
      return 1
    } else {
      return 0
    }
  })
}

function composeDeviceNames(s: DevmanGroupConfig) {
  const maxDevicesToShow = 3
  if (!s.devices) return '-'
  const deviceIds = [...s.devices].splice(0, maxDevicesToShow)
  const formattedDeviceNames = deviceStatuses.value.filter(device => deviceIds.includes(device.id)).map(device => device.custom_name || device.hostname)

  if (s.devices.length > maxDevicesToShow) {
    formattedDeviceNames.push($t('+%s more devices...').format(s.devices.length - maxDevicesToShow))
  }

  return formattedDeviceNames.join('; ')
}

function instanceExists(val: string) {
  if (formData.value.groups.some(o => o.name === val)) {
    return { isValid: false, message: $t("Instance '%s' already exists.").format(val) }
  }
  return { isValid: true }
}

function getDeviceNames(data: { device_mac: string }[]) {
  return data?.map(data => formData.value.devices.find(device => device.mac === data.device_mac)?.custom_name) || []
}
</script>
