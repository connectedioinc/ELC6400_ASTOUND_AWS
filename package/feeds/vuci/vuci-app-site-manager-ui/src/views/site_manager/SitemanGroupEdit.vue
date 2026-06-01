<template>
  <vuci-form
    ref="form"
    v-model="formData"
    config="siteman_groups"
    :after-load="afterLoad"
    bulk-request
    editing
  >
    <template #default="{ uciData }">
      <vuci-named-section
        v-slot="{ s }"
        :uci-data="uciData"
        :title="$t('General')"
        name="group"
        :exception-options="['devices']"
        :endpoints="[
          {
            endpoint: 'site_manager/groups/config',
            sectionFilter: s => s.find(s => s.id === section.id)
          }
        ]"
        :after-save="onAfterSave"
        data-key="groups"
        :error-handlers="{ edit: handleEditErrors }"
      >
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Group name')"
          name="name"
          required
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Default group')"
          name="default"
          :description="$t('Enable to set the group as default, default group cannot be deleted.')"
        />
        <vuci-form-item-dummy
          :uci-section="s"
          :label="$t('Platform')"
          name="platform"
          :display-value="displayPlatform"
        />
      </vuci-named-section>
      <vuci-typed-section
        :title="$t('Paired devices')"
        :uci-data="uciData"
        :endpoints="[
          {
            endpoint: 'site_manager/devices/config',
            sectionFilter: s => pairedDeviceIds.includes(s.id) && filterBasedOnPlatform(s.id)
          }
        ]"
        data-key="devices"
        type="device"
        :form-methods="['get']"
        :columns="deviceColumns"
        search
        pagination
      >
        <template #check-all>
          <tlt-check-box
            :model-value="hasAllDevicesInGroup()"
            @input="setCheckboxValue(true)"
            @update:model-value="() => hasAllDevicesInGroup()"
          />
        </template>
        <template #checkbox="{ s }">
          <tlt-check-box
            :model-value="hasDeviceInGroup(s.id)"
            @input="setCheckboxValue(false, s)"
            @update:model-value="val => hasDeviceInGroup(val)"
          />
        </template>
        <template #image="{ s }">
          <img
            :src="getDeviceImage(s)"
            :style="getDeviceImageStyle(s)"
          />
        </template>
        <template #custom_name="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            name="custom_name"
            :display-value="displayName"
          />
        </template>
        <template #group="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            name="group_name"
            :display-value="returnName"
          />
        </template>
        <template #mac="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            name="mac"
          />
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

<script lang="ts" setup>
import { ref, onBeforeUnmount, useTemplateRef } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useDevmanCommonFunction, usePairedContext } from './SitemanCommon'
import { $bus } from '@ui-core/plugins/event-bus'
import type { DevmanGroupConfig, DevmanDeviceConfig, DevmanDeviceStatus } from './SitemanTypes'

const { editableSectionErrors, editErrors, syncErrors, removeDuplicateObjects, getDeviceImage, getDeviceImageStyle } = useDevmanCommonFunction()

const $t = useTranslate()

interface Props {
  section: DevmanGroupConfig
  displayPlatform: (platform: string) => string
}
interface formModel {
  groups: DevmanGroupConfig[]
  devices: DevmanDeviceConfig[]
}

const { pairedDeviceIds: _pairedDeviceIds, deviceStatuses: _deviceStatuses } = usePairedContext()
const pairedDeviceIds = _pairedDeviceIds.value
const deviceStatuses = _deviceStatuses.value

const props = defineProps<Props>()

const formData = ref<formModel>({ groups: [], devices: [] })
const deviceColumns = ref([
  { name: 'checkbox', scopedSlots: { customHeader: 'check-all' } },
  { name: 'image' },
  { name: 'custom_name', label: $t('Name') },
  { name: 'group', label: $t('Group') },
  { name: 'mac', label: $t('MAC address') }
])
const baseDevices = ref<DevmanDeviceConfig[]>([])

const form = useTemplateRef('form')

onBeforeUnmount(() => {
  if (syncErrors.value?.length === 0) return
  $bus.emit('show-edit-error', syncErrors.value)
})

function returnName(name: string) {
  return name.length > 20 ? name.slice(0, 20) + '...' : name
}

function onAfterSave(_, { data }: { data: DevmanGroupConfig }) {
  formData.value.groups.forEach((group: DevmanGroupConfig) => {
    if (data.default === '1' && group.id !== props.section.id && props.section.platform === group.platform) {
      group.default = '0'
    }
    if (data.devices && group.devices && group.id !== props.section.id) {
      group.devices = group.devices.filter((dev: string) => !data.devices.includes(dev))
    }
  })
  if (form.value?.initialForm) {
    form.value.initialForm = formData.value
  }
  emitToParent()
}

function afterLoad(form: { groups: DevmanGroupConfig[]; devices: DevmanDeviceConfig[] }) {
  baseDevices.value = props.section.devices
  form.devices = form?.devices?.map(device => {
    const filteredStatus = deviceStatuses.find(status => status.mac === device.mac)
    if (!filteredStatus.group_name) filteredStatus.group_name = ''
    return {
      ...device,
      ...filteredStatus
    }
  })
  return form
}

function filterBasedOnPlatform(id: string) {
  const device = deviceStatuses.find((dev: DevmanDeviceStatus) => dev.id === id)
  const devicePlatform = device.platform.includes('TSW') || device.platform.includes('SWM') ? 'switch' : 'default'
  return props.section.platform === devicePlatform
}

function hasDeviceInGroup(id: string) {
  return props.section?.devices?.includes(id)
}

function hasAllDevicesInGroup() {
  if (pairedDeviceIds.length === 0) return false
  return pairedDeviceIds.every((pairedId: string) => hasDeviceInGroup(pairedId))
}

function setCheckboxValue(setAllCheckboxes: boolean, s: DevmanDeviceConfig = {}) {
  const isDeviceInGroup = setAllCheckboxes ? hasAllDevicesInGroup() : hasDeviceInGroup(s.id)
  let filteredDeviceIds = props.section?.devices || []
  let checkboxValue = false
  if (isDeviceInGroup) {
    filteredDeviceIds = setAllCheckboxes ? [] : filteredDeviceIds.filter((id: string) => id !== s.id)
  } else {
    setAllCheckboxes
      ? (filteredDeviceIds = filteredDeviceIds.concat(pairedDeviceIds.filter((value: string) => filterBasedOnPlatform(value) && !filteredDeviceIds.includes(value))))
      : filteredDeviceIds.push(s.id)
    checkboxValue = true
  }
  const currentGroup = formData.value.groups.find((group: DevmanGroupConfig) => group.id === props.section.id)
  currentGroup.devices = filteredDeviceIds
  form.value?.initialForm.groups.forEach((group: DevmanGroupConfig) => {
    if (group.id === props.section.id) {
      group.devices = filteredDeviceIds
    }
  })
  return checkboxValue
}

function handleEditErrors(res: { payload: { errors: { code: number; value: any[] }[] } }) {
  const errors = res.payload.errors
  if (errors.length > 0) {
    const errorCode = errors[0].code
    if (errorCode === 21) {
      syncErrors.value = removeDuplicateObjects(errors[0].value, 'id')
    }
    if (editableSectionErrors.includes(errorCode)) {
      formData.value.groups.forEach((group: DevmanGroupConfig) => {
        if (group.id !== props.section.id && group.devices) {
          group.devices = group.devices.filter((device: string) => !props.section.devices.includes(device))
        }
      })
    } else if (!editableSectionErrors.includes(errorCode)) {
      formData.value.groups = form.value?.initialForm.groups
    } else {
      const sectionGroup = formData.value.groups.find((group: DevmanGroupConfig) => group.id === props.section.id)
      const initialDevices = form.value?.initialForm.groups.find((group: DevmanGroupConfig) => group.id === props.section.id)?.devices
      if (sectionGroup && initialDevices) {
        sectionGroup.devices = initialDevices
      }
    }
    emitToParent()
    return editErrors[errorCode] || editErrors.default
  }
  return editErrors.default
}

function displayName(val: string, s: DevmanDeviceConfig) {
  return val || s.uciSection.hostname
}

function emitToParent() {
  $bus.emit('reload-data', true)
}
</script>
