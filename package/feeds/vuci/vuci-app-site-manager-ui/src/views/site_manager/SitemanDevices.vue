<template>
  <vuci-form
    ref="formRef"
    v-slot="{ uciData }"
    v-model="formData"
    config="siteman_devices"
    :after-load="loadData"
  >
    <vuci-typed-section
      ref="sectionRef"
      v-model:selected="selected"
      :title="$t('Devices')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'site_manager/devices/config', sectionFilter: s => s.mac }]"
      data-key="devices"
      type="device"
      :edit-form="EditForm"
      :form-methods="['get']"
      :edit-form-props="{ devmanTroubleshoot: troubleshoot }"
      :columns="pairedDeviceColumns"
      :row-actions="getRowActions"
      :bulk-actions="multiActions"
      pagination
      :search="true"
      :table-actions="['column-list', 'search']"
    >
      <template
        v-if="!isWindowSmall"
        #devicename="{ s }"
      >
        <div
          :ref="`statusIcon_${s.id}`"
          class="relative js-device-icon-wrapper"
          :class="{ hover: s.paired }"
          @click="handleWidget(s)"
        >
          <img
            class="absolute z-1 mr-1"
            :class="filterIcon(s) === 'tsw' ? 'mt-1' : filterIcon(s) === 'swm' ? 'mt-3' : ''"
            :src="getDeviceImage(s)"
            :style="getDeviceImageStyle(s)"
          />
          <SitemanWarningCount
            v-if="getWarningCount(s) > 0"
            class="absolute z-2 ml-9 mt-1 text-red-700"
            :count="getWarningCount(s)"
          />
        </div>
        <tlt-popover
          v-if="getStatusLogs(s)"
          class="whitespace-pre"
          placement="left-start"
          :title="$t('Status error logs:')"
          :target="() => $refs[`statusIcon_${s.id}`]"
          :content="getStatusLogs(s) || getDeviceStatus(s.id)"
        />
        <div class="ml-12">
          <tlt-button
            class="min-h-[48px] ml-4 device-name-button"
            type="text"
            :disabled="isActionDisabled(s)"
            @click="handleWidget(s)"
          >
            {{ displayName(s.custom_name, s) }}
          </tlt-button>
        </div>
      </template>
      <template #custom_name> </template>
      <template #group_name="{ s }">
        <!-- Change is super quick now, if theres a problem with group changing too slow should think of how to disable other changes without it look strange -->
        <tlt-select
          v-if="s.paired && !s.updateGroup && s.group_id"
          v-model="s.group_id"
          name="group_name"
          :data-source="convertedGroups(s)"
          @update:model-value="val => updateGroup(val, s)"
        />
        <div v-else>
          {{ s.paired && convertedGroups().length > 0 ? convertedGroups().find(group => group.key === s.group_id)?.value || '-' : '-' }}
        </div>
      </template>
      <template #firmware_status="{ s }">
        <div class="icon-item-container">
          <div v-if="getFirstStatus(s.id).firmware_status === 1 || getFirstStatus(s.id).firmware_status === 3">
            <div ref="upgrade">
              <tlt-button
                button-id="upgrade"
                type="text"
                :disabled="!s.online || getFirstStatus(s.id).firmware_status === 3"
                :loading="getFirstStatus(s.id).firmware_status === 3"
                @click="handleUpgrade(s)"
              >
                {{ getFirstStatus(s.id).firmware_status === 3 ? $t('Upgrading...') : $t('Upgrade') }}
              </tlt-button>
            </div>
            <tlt-popover
              v-if="getFirstStatus(s.id).latest_available_firmware"
              :target="() => $refs.upgrade"
              class="whitespace-pre-line"
              triggers="hover"
              expand-to="left"
              :content="getUpdateButtonHint(s)"
            />
          </div>
          <div v-else>
            <div ref="fwStatus">
              {{ displayFwStatus(_, s) }}
            </div>
            <tlt-popover
              v-if="getFirstStatus(s.id).firmware_status === 0 && getFirstStatus(s.id).firmware_status !== 3"
              :target="() => $refs.fwStatus"
              expand-to="left-start"
              :content="getFwStatusHint(s)"
            />
          </div>
        </div>
      </template>
      <template #custom_status="{ s }">
        <tlt-badge
          :test-id="s.id"
          :custom-color="statusData[s.custom_status || 'unpaired'].color"
          type="primary"
          :pulse="['pairing', 'syncing', 'updating', 'downloading', 'rebooting', 'rebootDevDown'].includes(s.custom_status)"
        >
          {{ statusData[s.custom_status || 'unpaired'].text }}
        </tlt-badge>
      </template>
    </vuci-typed-section>
    <pair-modal
      :open="pairOpen"
      :devices="availableDevice"
      :incorrect-password="incorrectPassword"
      @close="((pairOpen = false), (incorrectPassword = false))"
      @pair="(pass, devices) => pairDevices(devices, pass)"
    />
    <unpair-modal
      :open="unpairOpen"
      :section="devicesForUnpairing"
      :general-data="generalSettings"
      @close="unpairClosed()"
      @unpaired="resp => afterHandle(resp, 'unpaired')"
      @multiunpair="resp => afterHandle(resp, 'unpairedselected')"
    />
    <aside
      ref="asideRef"
      :class="['side-widget text-xs', 'above-original-side-widget', 'side-widget-box', { opened, 'transform-closed': !opened }]"
    >
      <div class="side-container-wrapper !h-full bg-theme-bg-page">
        <div class="side-container bg-theme-bg-page">
          <keep-alive>
            <component
              :is="DevmanSideWidget"
              :opened="opened"
              :firmware-status="deviceSection ? getFirstStatus(deviceSection.id) : {}"
              :device-section="deviceSection"
              :devices="deviceStatuses"
              @upgrade="s => handleUpgrade(s)"
              @reboot="mac => handleReboot(mac)"
              @close="handleWidget"
              @edit="id => openEdit(id)"
            />
          </keep-alive>
        </div>
      </div>
    </aside>
  </vuci-form>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, provide, watch, nextTick } from 'vue'
import { useBreakpoints, breakpointsTailwind, onClickOutside, onKeyStroke } from '@vueuse/core'
import EditForm from './SitemanDeviceEdit.vue'
import { useMainStore } from '@/stores/main'
import { useTranslate } from '@ui-core/composables/useI18n'
import { $bus } from '@ui-core/plugins/event-bus'
import { storeToRefs } from 'pinia'
import type VuciForm from '@ui-core/vuci-form/src/VuciForm.vue'
import type VuciTypedSection from '@ui-core/vuci-form/src/VuciTypedSection.vue'
import type { DevmanGroupConfig, DevmanDeviceStatus, DevmanGlobalConfig, DevmanFormData } from './SitemanTypes'
import { axios } from '@ui-core/plugins/axios'
import { utils } from '@/plugins/utils'
import DevmanSideWidget from './SitemanSideWidget.vue'
import { localDate } from '@ui-core/plugins/date'
import { useMessages, useAlerts, usePrompt } from '@/stores/messages'
import { useRouter } from 'vue-router'

import SitemanWarningCount from './SitemanWarningCount.vue'

import { useTimer } from '@ui-core/composables/useTimer'

import PairModal from './SitemanPairModal.vue'

import UnpairModal from './SitemanUnpairModal.vue'

import { useDevmanCommonFunction } from './SitemanCommon'

const { composeAlert, logErrorTranslates, filterIcon, getDeviceImage, getDeviceImageStyle } = useDevmanCommonFunction()

const $t = useTranslate()

const message = useMessages()

const alert = useAlerts()

const prompt = usePrompt()

const router = useRouter()

const store = useMainStore()

const formData = ref<DevmanFormData>({
  devices: []
})

const deviceStatuses = ref<DevmanDeviceStatus[]>([])

const deviceSection = ref<DevmanDeviceStatus | null>(null)

const opened = ref(false)

const pairOpen = ref(false)

const unpairOpen = ref(false)

const availableDevice = ref<DevmanDeviceStatus[]>([])

const selected = ref<string[]>([])

const breakpoints = useBreakpoints(breakpointsTailwind)
const isWindowSmall = breakpoints.smaller('lg')

const buttonClicked = ref(false)

const asideRef = ref<HTMLElement | null>(null)

const openedWidgetId = ref<string | null>(null) // Tracks the currently opened widget ID

const pairingControllers = ref(new Map<string, AbortController>())

onClickOutside(asideRef, event => {
  if (!openedWidgetId.value) return
  const target = event.target as HTMLElement
  if (target.closest('.js-device-icon-wrapper')) return
  opened.value = false
  openedWidgetId.value = null
})

const firstStatusLoad = ref<DevmanDeviceStatus[]>([])

const groups = ref<DevmanGroupConfig[]>([])

const interfaceOptions = ref<{ key: string; value: string }[]>([])

const generalSettings = ref<Partial<DevmanGlobalConfig>>({})

const fwStatusTranslate = {
  0: $t('Up to date'),
  1: $t('Upgrade'),
  2: $t('No internet connection'),
  3: $t('Updating...'),
  4: $t('Failure detected')
}

const loadStatusTimer = useTimer({
  method: loadStatuses,
  time: 5000,
  autostart: false,
  immediate: true
})

const statusData: Record<string, { text: string; color: string }> = {
  offline: {
    text: $t('Offline'),
    color: 'bg-theme-bg-secondary-1 text-theme-text-on-secondary'
  },
  unpaired: {
    text: $t('Unpaired'),
    color: 'bg-theme-bg-warning text-theme-text-on-warning'
  },
  online: { text: $t('Paired'), color: 'bg-theme-bg-success text-theme-text-on-success' },
  pairingFailed: {
    text: $t('Pairing failed'),
    color: 'bg-theme-bg-danger text-theme-text-on-danger'
  },
  pairing: {
    text: $t('Pairing...'),
    color: 'bg-theme-bg-warning text-theme-text-on-warning'
  },
  syncing: {
    text: $t('Syncing...'),
    color: 'bg-theme-border-status-good text-theme-text-on-success-subtle'
  },
  updating: {
    text: $t('Updating...'),
    color: 'bg-theme-border-status-good text-theme-text-on-success-subtle'
  },
  rebooting: {
    text: $t('Rebooting...'),
    color: 'bg-theme-border-status-good text-theme-text-on-success-subtle'
  },
  downloading: {
    text: $t('Downloading...'),
    color: 'bg-theme-border-status-good text-theme-text-on-success-subtle'
  },
  syncingFailed: {
    text: $t('Syncing failed'),
    color: 'bg-theme-bg-danger text-theme-text-on-danger'
  },
  rebootDevDown: {
    text: $t('Rebooting...'),
    color: 'bg-theme-bg-secondary-1 text-theme-text-on-secondary'
  }
}

const groupUpdating = ref(false)

const groupValues = ref<string[]>([])

const statusUpdateKeys: (keyof DevmanDeviceStatus)[] = [
  'custom_name',
  'hostname',
  'id',
  'ip',
  'duplicated',
  'paired',
  'syncing',
  'online',
  'errors',
  'api_version',
  'sync_next_retry',
  'pair_status',
  'device_type',
  'group_name',
  'devicename',
  'firmware_status',
  'firmware_version',
  'platform',
  'custom_status'
]

const multiActions = computed(() => {
  const selectedDevices = formData.value.devices.filter((device: DevmanDeviceStatus) => selected.value.some(id => id === device.id))
  const actions: {
    id: string
    label: string
    callback: (devices: string[]) => void
  }[] = []

  if (selectedDevices.some(device => device.paired)) {
    actions.push(
      { id: 'reboot', label: $t('Reboot'), callback: getActionHandle('reboot') },
      {
        id: 'troubleshoot',
        label: $t('Download troubleshoot'),
        callback: getActionHandle('troubleshoot')
      },
      { id: 'unpair', label: $t('Unpair'), callback: getActionHandle('unpair') }
    )
  }
  if (selectedDevices.some(device => device.firmware_status === '1')) {
    actions.push({
      id: 'upgrade',
      label: $t('Upgrade firmware'),
      callback: getActionHandle('upgrade_fota')
    })
  }
  if (selectedDevices.some(device => !device.paired && (device.online || device.pair_status))) {
    actions.push({
      id: 'pair',
      label: $t('Pair'),
      callback: getActionHandle('pair')
    })
  }
  return actions
})

const formRef = ref<InstanceType<typeof VuciForm> | null>(null)

const sectionRef = ref<InstanceType<typeof VuciTypedSection> | null>(null)

const ignoreStatus = ref(false)

const incorrectPassword = ref(false)

const troubleshoot = ref<Record<string, any>>({})

const pairSuccessful = ref(false)

const loaded = ref(false)

const singleMode = ref(true)

const devicesForUnpairing = ref<DevmanDeviceStatus[]>([])

const showGlobalEnable = ref(false)

const mainCheckbox = ref(false)

const showEditErrorCallback = (data: any) => composeAlert(data, getDeviceNames)

onKeyStroke('Escape', handleEsc)

onMounted(() => {
  $bus.on('show-edit-error', showEditErrorCallback)
  loadStatusTimer.start()
})

onUnmounted(() => {
  $bus.off('show-edit-error', showEditErrorCallback)
})

provide('deviceStatuses', deviceStatuses)

const pairedDeviceColumns = computed(() => {
  const columns = [
    {
      name: 'custom_status',
      label: $t('Status'),
      displayFn: (_, dataRow) => statusData[dataRow.custom_status || 'unpaired'].text,
      scopedSlots: { customRender: 'custom_status' },
      actions: { filter: { type: 'uniqueValues' } }
    },
    {
      name: 'group_name',
      label: $t('Group'),
      displayFn: getGroupNames,
      actions: { filter: { type: 'uniqueValues' } }
    },
    {
      name: 'custom_name',
      label: $t('Device name'),
      show: false
    },
    { name: 'mac', label: $t('MAC address') },
    { name: 'firmware_status', label: $t('Firmware status'), displayFn: displayFwStatus }
  ]
  if (isWindowSmall.value) columns.unshift({ name: 'smaller_screen' })
  else
    columns.unshift({
      name: 'devicename',
      label: $t('Device'),
      displayFn: getDeviceName,
      actions: { filter: { type: 'uniqueValues' } },
      scopedSlots: { customHeader: 'on_off' }
    })
  return columns
})

const { modalOpen } = storeToRefs(useMainStore())

watch(modalOpen, value => {
  if (!value) {
    formData.value.devices.forEach((dev: DevmanDeviceStatus) => {
      if (dev.paired) {
        dev.expanded = false
      }
    })
  }
})

function getDeviceName(val: string | undefined): string {
  return val?.slice(0, 6) || '-'
}

function getRowActions(record: DevmanDeviceStatus) {
  const actions = []
  // Don't show edit/status buttons while pairing is in progress
  if (record.paired && record.custom_status !== 'pairing') {
    actions.push({
      id: 'edit',
      callback: () => openEdit(record.id),
      label: $t('Edit'),
      buttonProps: { 'icon-left': 'edit' }
    })
    actions.push({
      id: 'statusAction',
      disabled: isActionDisabled(record),
      callback: () => handleWidget(record),
      label: $t('Status'),
      buttonProps: {
        'icon-left': 'password'
      }
    })
  } else {
    actions.push({
      id: 'pair',
      callback: () => handlePair([record]),
      disabled: record.custom_status === 'pairing' || (!record.online && !record.paired),
      label: [2, 5, 8, 11, 12, 13].includes(record.pair_status) ? $t('Retry pair') : $t('Pair'),
      buttonProps: { 'icon-left': 'pair' }
    })
  }
  return actions
}
function handleStatusData(data: DevmanDeviceStatus[]) {
  const frontendStatuses = ['rebooting', 'updating', 'downloading', 'syncing', 'pairing', 'rebootDevDown']
  data.forEach((dev: DevmanDeviceStatus) => {
    const localDevice = formData.value?.devices?.find(d => d.mac === dev.mac)
    const originalStatus = localDevice?.custom_status
    const waitForReboot = originalStatus === 'rebootDevDown'

    // If frontend-only status, preserve unless backend indicates a transition
    if (frontendStatuses.includes(originalStatus)) {
      // If device is now online, clear rebootDevDown/rebooting
      if (originalStatus === 'rebootDevDown' && dev.online) {
        dev.custom_status = 'online'
        return
      }
      // If pairing completed
      if (originalStatus === 'pairing' && dev.pair_status === 14 && dev.online) {
        dev.custom_status = 'online'
        return
      }
      // If rebooting and device is now offline, switch to rebootDevDown
      if (originalStatus === 'rebooting' && !dev.online) {
        dev.custom_status = 'rebootDevDown'
        return
      }
      // If syncing is done and device is online, switch to online
      if (originalStatus === 'syncing' && !dev.syncing && dev.online) {
        dev.custom_status = 'online'
        return
      }
      // Otherwise, keep frontend status
      dev.custom_status = originalStatus
      return
    }

    // ...rest of your decision tree...
    if (dev.pair_status && [2, 5, 8, 11, 12, 13].includes(dev.pair_status)) {
      dev.custom_status = 'pairingFailed'
      return
    }
    if (dev.pair_status && dev.pair_status !== 14) {
      dev.custom_status = 'pairing'
      return
    }
    if (dev.syncing && dev.online) {
      dev.custom_status = 'syncing'
      return
    }
    if (dev.pair_status === 14 && dev.online) {
      dev.custom_status = 'online'
      return
    }
    if (dev.pair_status === 14 && !dev.online) {
      dev.custom_status = 'offline'
      return
    }
    if (waitForReboot && dev.online) {
      dev.custom_status = 'online'
      return
    }
    if (waitForReboot && !dev.online) {
      dev.custom_status = 'rebootDevDown'
      return
    }
    if (dev.online && dev.paired) {
      dev.custom_status = 'online'
    } else if (dev.online && !dev.paired) {
      dev.custom_status = 'unpaired'
    } else {
      dev.custom_status = 'offline'
    }
  })
  return data
}

function updateDeviceStatuses(data: DevmanDeviceStatus[]) {
  deviceStatuses.value = handleStatusData(data)
  formData.value.devices.forEach((device: DevmanDeviceStatus) => {
    const status = deviceStatuses.value.find((status: DevmanDeviceStatus) => status.mac === device.mac)
    Object.assign(device, status)
  })
}

function updateCustomStatuses(macs: string[], status: string) {
  formData.value.devices.forEach(dev => {
    if (macs.includes(dev.mac)) {
      dev.custom_status = status
    }
  })
}

function cancelPairing(mac: string) {
  if (pairingControllers.value.has(mac)) {
    pairingControllers.value.get(mac)?.abort()
    pairingControllers.value.delete(mac)
  }
}

function pairDevices(devices: DevmanDeviceStatus[], passwords?: { mac: string; password: string }[]) {
  const macs = devices.map(device => device.mac)
  updateCustomStatuses(macs, 'pairing')

  const promises = devices.map(async device => {
    cancelPairing(device.mac)

    const controller = new AbortController()
    pairingControllers.value.set(device.mac, controller)

    const password = passwords?.find(p => p.mac === device.mac)?.password || 'admin01'

    try {
      const response = await axios.post(
        '/api/site_manager/devices/actions/pair',
        {
          data: {
            mac: device.mac,
            password
          }
        },
        {
          signal: controller.signal,
          preventCancel: true
        }
      )

      if (pairingControllers.value.has(device.mac)) {
        pairingControllers.value.delete(device.mac)
      }

      return {
        ...response.data,
        success: response.data?.success ?? true,
        mac: device.mac
      }
    } catch (error: any) {
      if (pairingControllers.value.has(device.mac)) {
        pairingControllers.value.delete(device.mac)
      }

      if (controller.signal.aborted || (axios.isCancel && axios.isCancel(error)) || error.name === 'CanceledError' || error.message === 'canceled') {
        return { success: false, cancelled: true, mac: device.mac }
      }
      return { success: false, error, mac: device.mac }
    }
  })

  return Promise.all(promises)
    .then(data => {
      const results = data.filter((r: any) => !r.cancelled)
      const failedMacs = results.map((response: any) => (!response.success ? response.mac || devices.find(d => d.mac === response.mac)?.mac : null)).filter((mac: any) => mac)

      return afterHandle(results, 'paired').then(() => {
        if (failedMacs.length > 0) {
          // After loadData completes, find failed devices that still exist in the updated device list
          const failedDevices = formData.value.devices.filter(d => failedMacs.includes(d.mac))

          // Only show retry modal if there are failed devices still in the list
          if (failedDevices.length > 0) {
            if (failedMacs.length && devices.length === 1) {
              incorrectPassword.value = true
              availableDevice.value = failedDevices
              pairOpen.value = true
            } else if (failedMacs.length > 0) {
              availableDevice.value = failedDevices
              pairOpen.value = true
            }

            updateCustomStatuses(failedMacs, 'pairingFailed')

            if (failedMacs.length && failedMacs.length !== devices.filter(d => !data.find((r: any) => r.mac === d.mac && r.cancelled)).length) {
              message.error($t('Device pairing was partially successful. Retry pairing for the failed devices.'))
            } else {
              message.error($t('Failed to pair devices'))
            }
          } else {
            // Devices failed but are no longer in the list, just show error
            message.error($t('Failed to pair devices'))
          }
        }
      })
    })
    .catch(() => {
      updateCustomStatuses(macs, 'pairingFailed')
      message.error($t('Failed to pair devices'))
    })
    .finally(() => {})
}

function handlePair(devices: DevmanDeviceStatus[]) {
  const unpairedDevices = devices.filter((dev: DevmanDeviceStatus) => !dev.paired)
  if (unpairedDevices.some(dev => (dev.platform && (dev.platform.includes('TSW') || dev.platform.includes('SWM'))) || (dev.pair_status && [2, 5, 8, 11, 12, 13].includes(dev.pair_status)))) {
    availableDevice.value = unpairedDevices
    pairOpen.value = true
  } else {
    pairDevices(unpairedDevices)
  }
}

function handleRebootCall(endpoints: { method: string; endpoint: string; data: { mac: string } }[], devices: DevmanDeviceStatus[]) {
  devices.forEach((device: DevmanDeviceStatus) => {
    device.custom_status = 'rebooting'
  })
  return axios
    .bulk(endpoints)
    .then(() => {
      message.success($t('Devices reboot started successfully'))
    })
    .catch(() => {
      message.error($t('Failed to reboot device'))
    })
}

function handleReboot(devices: DevmanDeviceStatus[]) {
  const endpoints = devices.map((device: DevmanDeviceStatus) => ({
    method: 'POST',
    endpoint: '/api/site_manager/devices/actions/reboot',
    data: { mac: device.mac }
  }))
  prompt.show({
    title: $t('Reboot devices?'),
    content: $t('Are you sure that you want to reboot selected devices?'),
    okText: $t('Proceed'),
    cancelText: $t('Cancel'),
    onOk: () => handleRebootCall(endpoints, devices)
  })
}

function handleAction(devices: DevmanDeviceStatus[], action: string) {
  const unpairedDevices = devices.filter((device: DevmanDeviceStatus) => !device.paired)
  const pairedDevices = devices.filter((device: DevmanDeviceStatus) => device.paired)
  if (action === 'unpair') {
    devicesForUnpairing.value = pairedDevices
    unpairOpen.value = true
  }
  if (action === 'pair') {
    handlePair(unpairedDevices)
  }
  if (action === 'reboot') {
    handleReboot(pairedDevices)
  }
  if (action === 'troubleshoot') {
    pairedDevices.forEach((device: DevmanDeviceStatus) => downloadTroubleshoot(device))
  }
}

function getActionHandle(action: string) {
  return (devices: string[]) => {
    const devValues = formData.value.devices.filter((device: DevmanDeviceStatus) => devices.includes(device.id))
    handleAction(devValues, action)
  }
}

function getGroupNames(groupName: string | undefined): string {
  return groupName || '-'
}

function saveConfig() {
  store.spin($t('Enabling site manager'))
  return axios
    .put('/api/site_manager/global', { data: { enabled: '1' } })
    .then(() => {
      message.success($t('Site manager enabled'))
      generalSettings.value.enabled = 'enabled'
    })
    .catch(() => {
      message.error($t('Failed to enable site manager'))
    })
    .finally(() => {
      store.spin(false)
    })
}

function convertedGroups(s?: DevmanDeviceStatus): { key: string; value: string }[] {
  let availableGroups: { key: string; value: string }[] = []
  if (s) {
    const devicePlatform = s.device_type?.includes('TSW') || s.device_type?.includes('SWM') ? 'switch' : 'default'
    availableGroups = groups.value.filter((groupValue: DevmanGroupConfig) => groupValue.platform === devicePlatform).map((group: DevmanGroupConfig) => ({ key: group.id, value: group.name }))
    if (s.group_id === 'none') {
      availableGroups.push({ key: 'none', value: $t('None') })
    }
  } else {
    availableGroups = groups.value.map((group: DevmanGroupConfig) => ({
      key: group.id,
      value: group.name
    }))
  }
  return availableGroups
}

function downloadTroubleshoot(device: DevmanDeviceStatus) {
  device.custom_status = 'downloading'
  return utils
    .downloadFileApi('/api/site_manager/devices/actions/download', 'application/x-tar', 'POST', {
      type: 'troubleshoot',
      id: device.id
    })
    .then(() => {
      message.success($t('Troubleshoot download for "%s" device was successful').format(device.custom_name || device.device_type))
    })
    .catch(err => {
      if (err?.response?.data?.errors[0]?.code === 17) {
        message.error($t('Device does not support troubleshoot download. To enable this feature, please update the firmware of the device.'))
      } else {
        message.error($t('Failed to download troubleshoot file for "%s" device').format(device.custom_name || device.device_type))
      }
    })
    .finally(() => {
      device.custom_status = 'online'
    })
}

function loadData() {
  const endpoints = [
    '/api/site_manager/devices/config',
    '/api/site_manager/interfaces/config',
    '/api/site_manager/wireless/devices/config',
    '/api/site_manager/switch/interfaces/config',
    '/api/site_manager/ports_settings/config',
    '/api/site_manager/switch/vlan/config',
    '/api/site_manager/groups/config',
    '/api/site_manager/global'
  ]

  return loadStatusesWithFwStatus()
    .then(() => {
      loadStatusTimer.start(loadStatuses)
      return axios.bulkGet(endpoints)
    })
    .then(([deviceData, interfaces, wireless, switchInterfaces, portsSettings, switchVlan, group, settings]) => {
      if (!deviceData.success) {
        message.error($t('Failed to load device data'))
      } else {
        deviceData.data.forEach((device: DevmanDeviceStatus) => {
          setStatusesToDevice(statusUpdateKeys, device)
          if (device.duplicated) {
            message.error($t('Duplicate device found'))
          }
        })
        deviceStatuses.value = deviceData.data.map((device: DevmanDeviceStatus) => {
          // Preserve existing custom_status if device exists
          const existingDevice = formData.value.devices.find(d => d.mac === device.mac)
          return {
            ...device,
            custom_status: existingDevice?.custom_status || 'offline'
          }
        })
        updateDeviceStatuses(deviceStatuses.value)
      }

      if (!interfaces.success) message.error($t('Failed to load interfaces data'))
      if (!switchInterfaces.success) message.error($t('Failed to load switch interfaces data'))
      if (!switchVlan.success) message.error($t('Failed to load switch VLAN data'))
      if (!portsSettings.success) message.error($t('Failed to load ports settings data'))
      if (!wireless.success) message.error($t('Failed to load wireless device data'))
      if (!group.success) message.error($t('Failed to load Site manager groups data'))
      if (!settings.success) message.error($t('Failed to load general settings data'))

      groups.value = group.success ? group.data : []
      generalSettings.value = settings.success ? settings.data : {}

      if (settings.data.enabled === '0') {
        showGlobalEnable.value = true
        prompt.show({
          title: $t('Site manager is disabled'),
          content: $t('Enable site manager to use the functionality. It might take a while to turn on.'),
          okText: $t('Enable'),
          cancelText: $t('Cancel'),
          onOk: () => saveConfig()
        })
      }

      const pairedDevices = deviceData.success ? deviceData.data : []
      pairedDevices.forEach((device: DevmanDeviceStatus) => {
        device.original_group = device.group_id
      })

      // Merge existing formData devices with new paired devices
      formData.value.devices = formData.value.devices.map(device => {
        const updatedDevice = pairedDevices.find(p => p.mac === device.mac)
        return updatedDevice ? { ...device, ...updatedDevice } : device
      })

      // Add any new devices not already in formData
      const newDevices = pairedDevices.filter(p => !formData.value.devices.some(d => d.mac === p.mac))
      formData.value.devices.push(...newDevices)

      groupValues.value = pairedDevices.map((device: DevmanDeviceStatus) => ({
        id: device.id,
        group: device.group_name
      }))

      const unpairedDevices = deviceStatuses.value.filter((device: DevmanDeviceStatus) => 'paired' in device && !device.paired)
      if (settings.success && settings.data.password === 'unset' && pairedDevices.length > 1) {
        showAlert()
      }

      loaded.value = true
      formRef?.value?.updateUciData(formData.value)

      return {
        devices: settings.data.enabled === '1' ? formData.value.devices : [],
        interfaces: interfaces.success ? interfaces.data : [],
        wifiDevices: wireless.success ? wireless.data : [],
        switchInterfaces: switchInterfaces.success ? switchInterfaces.data : [],
        portsSettings: portsSettings.success ? portsSettings.data : [],
        bridge_vlan: switchVlan.success ? switchVlan.data : [],
        groups: group.value,
        interfaceOptions: interfaceOptions.value
      }
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

function updateGroup(val: string, s: DevmanDeviceStatus) {
  const originalStatus = s.custom_status
  s.updateGroup = true
  groupUpdating.value = true
  s.custom_status = 'updating'
  if (s.original_group !== 'none') {
    if (!val || !s || !loaded.value || !s.paired || !s.group_name) {
      s.updateGroup = false
      groupUpdating.value = false
      s.custom_status = originalStatus
      return
    }
  }
  const group = groups.value.find(group => group.id === val)
  const devices = group.devices ? [...new Set([...group.devices, s.id])] : [s.id]
  if (group?.name !== s.group_name) {
    return axios
      .put(`/api/site_manager/groups/config/${val}`, { data: { devices } })
      .then(() => {
        group.devices = devices
        const oldGroup = groups.value.find(group => group.name === s.group_name)
        message.success($t('Group updated successfully'))
        formData.value.devices.forEach(device => {
          if (device.id === s.id) {
            device.group_name = group.name
          }
        })
        if (s.original_group !== 'none') {
          const oldDevices = oldGroup.devices ? oldGroup.devices.filter(dev => dev !== s.id) : []
          oldGroup.devices = oldDevices
        } else {
          s.original_group = null
        }
      })
      .catch(() => {
        message.error($t('Failed to update group'))
      })
      .finally(() => {
        s.custom_status = originalStatus
        groupUpdating.value = false
        s.updateGroup = false
      })
  } else {
    groupUpdating.value = false
    s.custom_status = originalStatus
    s.updateGroup = false
  }
}

function loadStatusesWithFwStatus() {
  if ((modalOpen.value && !pairSuccessful.value) || generalSettings.value.enabled === '0') return true
  return axios
    .get('/api/site_manager/devices/status')
    .then(({ data }) => {
      if (ignoreStatus.value) {
        ignoreStatus.value = false
        return
      }
      if (generalSettings.value.enabled === '0') {
        deviceStatuses.value = []
      } else {
        if (generalSettings.value.enabled === 'enabled') {
          generalSettings.value.enabled = '1'
        }
        data = handleStatusData(data)
        firstStatusLoad.value = data
        deviceStatuses.value = data
        // questionable merge remove if something breaks redo all of this logic
        mergeData()
        formData.value.devices.forEach(device => setStatusesToDevice(statusUpdateKeys, device))
        setFirstStatusFw()
        formRef?.value?.updateUciData(formData.value)
      }
    })
    .catch(() => {
      message.error($t('Failed to load device statuses'))
    })
}

function loadStatuses() {
  if ((modalOpen.value && !pairSuccessful.value) || generalSettings.value.enabled === '0') return true
  return axios
    .get(`/api/site_manager/devices/status/?exclude_firmware_status=1`)
    .then(({ data }) => {
      if (ignoreStatus.value) {
        ignoreStatus.value = false
        return
      }
      if (generalSettings.value.enabled === '0') {
        deviceStatuses.value = []
      } else {
        if (generalSettings.value.enabled === 'enabled') {
          generalSettings.value.enabled = '1'
          firstStatusLoad.value = data
        }
        data = handleStatusData(data)
        if (formData.value.devices.length !== data.length) mergeData()
        deviceStatuses.value = data
        formData.value.devices.forEach(device => setStatusesToDevice(statusUpdateKeys, device))
        setFirstStatusFw()
        formRef?.value?.updateUciData(formData.value)
      }
    })
    .catch(() => {
      message.error($t('Failed to load device statuses'))
    })
}

function displayName(val: string | undefined, section: DevmanDeviceStatus): string {
  return val || section.hostname || '-'
}

function unpairClosed() {
  unpairOpen.value = false
}

function mergeData() {
  const unpairedDevices = deviceStatuses.value.filter(device => 'paired' in device && !device.paired)
  const pairedDevices = firstStatusLoad.value.filter(device => device.paired && device.id)
  Object.assign(formData.value, { devices: [...pairedDevices, ...unpairedDevices] })
  formData.value.devices.forEach(device => setStatusesToDevice(statusUpdateKeys, device))
  nextTick(() => {
    formRef?.value?.updateUciData(formData.value)
  })
}

function handleEsc(event: KeyboardEvent) {
  if (opened.value && (event.key === 'Escape' || event.keyCode === 27)) {
    handleWidget()
  }
}

function openEdit(id: string) {
  opened.value = false
  sectionRef?.value?._openEdit(id)
}

function handleWidget(s?: DevmanDeviceStatus) {
  if (!s) {
    opened.value = false
    loadStatusTimer.start()
    return
  }
  if (buttonClicked.value) {
    buttonClicked.value = false
    return
  }
  if (s && (!s.paired || !s.online)) return

  if (s.id === openedWidgetId.value) {
    opened.value = !opened.value
    if (!opened.value) {
      openedWidgetId.value = null
    }
  } else {
    openedWidgetId.value = s.id
    opened.value = true
  }

  document.body.style.overflow = opened.value ? 'hidden' : 'auto'
  if (opened.value) {
    axios.cancelRequests('navigation')
    deviceSection.value = s || null
    nextTick(() => {})
  } else {
    loadStatusTimer.start()
  }
}

function handleUpgrade(s: DevmanDeviceStatus) {
  buttonClicked.value = true
  ignoreStatus.value = true
  store.spin(true)
  return axios
    .post('/api/site_manager/devices/actions/upgrade_fota', {
      data: { mac: [s.mac] }
    })
    .then(() => {
      firstStatusLoad.value.find(device => device.mac === s.mac).firmware_status = '3'
      formData.value.devices.find(device => device.mac === s.mac).isUpdating = true
      nextTick(() => {
        formRef?.value?.updateUciData(formData.value)
      })
      message.success($t('Device firmware update started successfully'))
    })
    .catch(() => {
      message.error($t('Failed to start device firmware update'))
    })
    .finally(() => {
      store.spin(false)
    })
}

function afterHandle(data: any, action: string) {
  const unpairData = data
  pairSuccessful.value = true
  return loadData()
    .then(data => {
      Object.assign(formData.value, {
        interfaces: data.interfaces,
        wifiDevices: data.wifiDevices,
        portsSettings: data.portsSettings,
        bridge_vlan: data.bridge_vlan,
        switchInterfaces: data.switchInterfaces
      })
      mainCheckbox.value = false
      if (action === 'paired') {
        const successfulPairs = Array.isArray(unpairData) ? unpairData.filter(d => d.success) : []
        if (successfulPairs.length > 0) {
          message.success(successfulPairs.length === 1 ? $t('Device paired successfully') : $t('Devices paired successfully'))
        }
      }
      if (action === 'unpaired') {
        selected.value = []
        if (unpairData?.mac) cancelPairing(unpairData.mac)
        formData.value.devices = formData.value.devices.filter(device => device.mac !== unpairData?.mac)
        message.success($t('Device unpaired successfully'))
      }
      if (action === 'unpairedselected') {
        selected.value = []
        const unpairedDevices = unpairData.map(section => section.data.mac)
        unpairedDevices.forEach(mac => cancelPairing(mac))
        formData.value.devices = formData.value.devices.filter(device => !unpairedDevices.includes(device.mac))
        if (!formData.value.devices.some(dev => dev.paired)) singleMode.value = true
        message.success($t('Selected devices unpaired successfully'))
      }
    })
    .finally(() => {
      pairSuccessful.value = false
      // Update form data for single device updates (not for paired/unpaired actions)
      if (data && !Array.isArray(data) && data.mac) {
        formData.value.devices.forEach((device, index) => {
          if (device.mac === data.mac) {
            const updatedDevice = { ...device, ...data }
            formData.value.devices[index] = updatedDevice
          }
        })
      }
      nextTick(() => {
        formRef?.value?.updateUciData(formData.value)
      })
    })
}

function getDeviceStatus(id: string): DevmanDeviceStatus | undefined {
  return deviceStatuses.value.find(dev => dev.id === id)
}

function getWarningCount(s: DevmanDeviceStatus): number {
  return s?.errors?.filter(error => typeof error !== 'string').length || 0
}

function getFirstStatus(id: string): Partial<DevmanDeviceStatus> {
  return firstStatusLoad.value.find(device => device.id === id) || {}
}

function getDeviceNames(data: DevmanDeviceStatus[]): string[] {
  return data?.map(device => formData.value?.devices?.find(d => d.mac === device.device_mac)?.custom_name) || []
}

function getStatusLogs(s: DevmanDeviceStatus): string | undefined {
  const lastSectionErrors = s?.errors?.slice(-3)
  if (!lastSectionErrors || lastSectionErrors.length === 0 || typeof lastSectionErrors[0] === 'string') return
  const formattedErrors = lastSectionErrors.map(error => {
    if (error.source) return `[${error.section}]:\n${error.error}\n`
    return `[${localDate(error.timestamp)}]:\n${logErrorTranslates[error.name] || logErrorTranslates.default}\n`
  })
  return formattedErrors.join('\n')
}

function getFwStatusHint(s: DevmanDeviceStatus): string {
  return $t('Current device firmware version:\n %s').format(s.firmware_version)
}

function getUpdateButtonHint(s: DevmanDeviceStatus): string {
  return getFwStatusHint(s) + '\n' + $t('Latest available device firmware version:\n %s').format(getFirstStatus(s.id).latest_available_firmware)
}

function setStatusesToDevice(statusFields: (keyof DevmanDeviceStatus)[], section: DevmanDeviceStatus): DevmanDeviceStatus {
  const deviceStatus = deviceStatuses.value.find(device => device.mac === section.mac) || {}
  statusFields
    .filter(val => deviceStatus[val] || deviceStatus[val] === false)
    .forEach(value => {
      section[value] = deviceStatus[value]
    })
  return section
}

function setFirstStatusFw() {
  deviceStatuses.value.forEach(device => {
    const formDataSection = formData.value.devices.find(formDevice => formDevice.id === device.id)
    if (formDataSection && (!Number(device?.firmware_status) || Number(device.firmware_status) !== 3) && formDataSection.isUpdating) {
      formDataSection.isUpdating = false
      return loadStatusesWithFwStatus().then(() => {
        const updatedStatusDevice = deviceStatuses.value.find(updatedDevice => updatedDevice.mac === device.mac)
        const firstStatus = getFirstStatus(device.id)
        if (updatedStatusDevice && firstStatus) {
          firstStatus.firmware_status = updatedStatusDevice.firmware_status
        }
      })
    }
    if (!Number(device.firmware_status)) return
    const firstStatus = getFirstStatus(device.id)
    if (firstStatus) {
      firstStatus.firmware_status = device.firmware_status
    }
  })
}

function showAlert() {
  alert.info({
    title: $t('Global device password is not set yet'),
    text: $t('You can set global device password in General Settings page. It will help you to transfer your devices to other controllers'),
    action: {
      text: $t('Go to general settings page'),
      onClick: () => router.push({ path: '/site_manager/devices/settings' })
    },
    important: true,
    id: 'devman_general_password'
  })
}

function displayFwStatus(val: string, s: DevmanDeviceStatus): string {
  if (s && !s.paired) return '-'
  const fwStatus = getFirstStatus(s.id)?.firmware_status
  return fwStatusTranslate[fwStatus] || '-'
}

function isActionDisabled(s: DevmanDeviceStatus): boolean {
  // Temp changing stuff might fully delete in the future
  return !s.online || !s.paired
}
</script>

<style scoped>
.side-widget {
  --widget-width: 22rem;
  --widget-top: calc(var(--header-height) + 1rem);
  --widget-height: calc(100dvh - var(--widget-top) * 2);
  --side-btn-width: 2.25rem;
  --side-btn-height: 3rem;

  position: fixed;
  right: 0px;
  top: var(--widget-top);
  z-index: 10;
  overflow-x: hidden;
  overflow-y: auto;
  /* pointer-events removed to allow scrolling */
  max-width: calc(var(--widget-width) + var(--side-btn-width));
  width: 100%;
  transform: translateX(calc(100% - var(--side-btn-width)));
  transition: transform 500ms;
}
.side-widget.opened {
  transform: translateX(0px);
}

.side-widget-box {
  box-shadow:
    0px 10px 20px rgba(0, 0, 0, 0.2),
    0px 5px 10px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--color-theme-border-base);
  padding-top: 0 !important; /* Override the inherited padding */
  background: var(--color-theme-bg-page);
  border-top-left-radius: 15px; /* Rounded top-left corner */
  border-bottom-left-radius: 15px; /* Rounded bottom-left corner */
}

.icon-item-container {
  display: flex;
  align-items: center;
  gap: 8px;
}
.side-container-wrapper {
  height: 100%;
  overflow-y: auto;
}
.side-container {
  height: 100%;
  overflow-y: auto;
}
.above-original-side-widget {
  overflow-x: hidden !important;
  overflow-y: auto !important;
  position: fixed;
  right: 0;
  top: 10%;
  height: 80%;
  z-index: 25;
}
.transform-closed {
  transform: translateX(100%) !important;
}

.hover:hover {
  cursor: pointer;
}

.menu {
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  flex-direction: initial;
}
.menu .expand-btn {
  cursor: pointer;
}
.menu .dropdown-outer {
  position: relative;
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  flex-direction: column-reverse;
}
.menu .dropdown-menu {
  width: 6rem;
  padding: 0.375rem 1rem;
}

@media (max-width: 1300px) {
  .menu .dropdown-menu {
    width: 19.25rem !important;
  }
}

:deep(.device-name-button) {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
