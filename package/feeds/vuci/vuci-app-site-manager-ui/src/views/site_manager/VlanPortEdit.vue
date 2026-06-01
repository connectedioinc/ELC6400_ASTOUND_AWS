<template>
  <vuci-form
    ref="vlanForm"
    v-model="formData"
    editing
    config="siteman_vlan"
    :before-save="handleBeforeSave"
  >
    <template #default="{ uciData }">
      <devman-apply-to-section
        :section="section"
        :mapped-groups="unref(group)"
        :mapped-devices="unref(device)"
        section-name="vlan"
      />
      <vuci-named-section
        v-slot="{ s }"
        :title="$t('%s configuration').format(section.id)"
        :name="section.id"
        :endpoints="[{ endpoint: 'site_manager/switch/vlan/config' }]"
        :uci-data="uciData"
        data-key="bridge_vlan"
        :exception-options="exceptionOptions"
      >
        <div class="grid sm:grid-cols-[40%_max-content] grid-cols-1 items-center mb-1 gap-y-1">
          <tlt-hint
            class="mr-4 md:justify-self-end self-center"
            :hoverable="true"
            :hints="[
              {
                info: $t('Unique VLAN section identifier. Transmitted and received as IEEE 802.1Q tag in an Ethernet frame.')
              }
            ]"
          >
            {{ $t('VLAN ID') }}
          </tlt-hint>
          <vuci-form-item-input
            :uci-section="s"
            name="vlan"
            required
            placeholder="1"
            rules="irange(1,4094)"
            :readonly="props.section.vlan === '1'"
            class="!mb-0 min-w-[300px] sm:mb-0"
          />

          <tlt-hint
            class="mr-4 md:justify-self-end self-center mt-3"
            :hoverable="true"
            :hints="[
              {
                info: $t('Tagged port passes traffic for multiple VLANs. Untagged port accepts traffic for only a single VLAN.')
              }
            ]"
          >
            {{ $t('Mark selected ports (%s) as').format(selectedPorts.length) }}
          </tlt-hint>
          <div class="flex items-end justify-between sm:mt-3">
            <div class="flex flex-wrap gap-x-4 gap-y-1">
              <tlt-hint
                v-for="{ key, value, class: bgClass } in inputOptions"
                :key="key"
                :hints="key === 'off' && disableOffText ? [{ info: disableOffText }] : []"
              >
                <tlt-button
                  :button-id="`button-${key}`"
                  :readonly="noSelectedPorts || (key === 'off' && !!disableOffText)"
                  @click="setPortsAction(key)"
                >
                  <div
                    class="w-2 h-2 rounded-full duration-200"
                    :class="noSelectedPorts ? 'bg-theme-bg-secondary-subtle' : bgClass"
                  />
                  {{ value }}
                </tlt-button>
              </tlt-hint>
            </div>
          </div>
        </div>
        <ports
          v-model="selectedPorts"
          :get-port-data="getPortData"
          selectable
          multiple
          :custom-ports="returnPorts()"
        />
        <tlt-inline-message
          v-show="message"
          id="config-change"
          :message="message"
          type="warning"
        />
      </vuci-named-section>
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
import { ref, computed, inject, unref } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import DevmanApplyToSection from './SitemanApplyToSection.vue'
import Ports from '@ui-core/tlt-design/customComponents/network/Ports.vue'
import TltInlineMessage from '@ui-core/tlt-design/form/core/TltInlineMessage.vue'
import { portBgColors } from '@/plugins/ports'
import { useGroupDeviceContext } from './SitemanCommon'
import { axios } from '@ui-core/plugins/axios'
import { isArray } from '@ui-core/utils/inspect'

const $t = useTranslate()

// props
const props = defineProps({
  section: { type: Object, required: true }
})

const exceptionOptions = [...Array.from({ length: 24 }, (_, i) => `port${i + 1}`), ...Array.from({ length: 4 }, (_, i) => `sfp${i + 1}`), 'dm_device_id', 'dm_group_id']

// refs
const formData = ref({})
const selectedPorts = ref([])
const vlanForm = ref(null)

// injections
const groupDeviceContext = useGroupDeviceContext()
const group = groupDeviceContext?.groups || ref([])
const device = groupDeviceContext?.devices || ref([])
const deviceStatus = inject('deviceStatus', ref([]))

// UI constants
const inputOptions = [
  { key: 't', value: $t('Tagged'), class: portBgColors.tagged },
  { key: 'u', value: $t('Untagged'), class: portBgColors.untagged },
  { key: 'off', value: $t('Off'), class: 'bg-theme-bg-secondary-subtle' }
]

// derived state
const portsToOff = computed(() => {
  if (!formData.value.bridge_vlan) return []
  const sectionIndex = formData.value.bridge_vlan.findIndex(s => s.id === props.section.id)
  if (sectionIndex === -1) return []
  return formData.value.bridge_vlan
    .map(section => ({
      sectionId: section.id,
      ports: Object.entries(section)
        .filter(([key, value]) => formData.value.bridge_vlan[sectionIndex][key] === 'u' && value === 'u')
        .map(([key]) => key)
    }))
    .filter(s => s.ports.length !== 0 && s.sectionId !== props.section.id)
})

const message = computed(() => {
  if (!portsToOff.value.length) return ''
  const ports = portsToOff.value.flatMap(s =>
    s.ports.map(p => {
      const num = p?.match(/[a-zA-Z]+|[0-9]+/g)[1]
      return p.includes('sfp') ? 'SFP ' + num : num
    })
  )
  const affectedVlans = portsToOff.value.map(s => s.sectionId).join(', ')
  return $t('Port must remain untagged in exactly one VLAN. While saving configuration ports: %s will be turned off in VLANs: %s.').format(ports.sort().join(', '), affectedVlans)
})

const noSelectedPorts = computed(() => selectedPorts.value.length === 0)

const disableOffText = computed(() => {
  if (!formData.value.bridge_vlan) return
  if (props.section.vlan !== '1') return
  const nonFirstVlans = formData.value.bridge_vlan.filter(s => s.vlan !== '1')
  const noOffPortsSelected = selectedPorts.value.filter(port => nonFirstVlans.every(vlan => vlan[port] === 'off'))
  if (!noOffPortsSelected.length) return
  const prettyPorts = noOffPortsSelected
    .map(port => {
      const num = port?.match(/[a-zA-Z]+|[0-9]+/g)[1]
      return port.includes('sfp') ? 'SFP ' + num : num
    })
    .sort()
    .join(', ')
  return $t('Ports: %s can not be turned off because they are not turned on in other vlans').format(prettyPorts)
})

// functions
function returnPorts() {
  const ports = []

  // Define 28 regular ports with consistent block value '0'
  for (let i = 1; i <= 24; i++) {
    ports.push({
      name: `port${i}`,
      type: 'eth',
      num: `${i}`,
      position: i % 2 === 0 ? 'down' : 'up',
      block: '0' // Consistent block value for Ethernet ports
    })
  }

  // Define 4 SFP ports with consistent block value '1'
  for (let i = 1; i <= 4; i++) {
    ports.push({
      name: `sfp${i}`,
      type: 'sfp',
      num: `${i}`,
      position: i % 2 === 0 ? 'up' : 'down',
      block: '1' // Consistent block value for SFP ports
    })
  }

  return ports
}

function setPortsAction(value) {
  if (!formData.value.bridge_vlan) return
  const sectionIndex = formData.value.bridge_vlan.findIndex(s => s.id === props.section.id)
  if (sectionIndex === -1) return
  selectedPorts.value.forEach(port => {
    formData.value.bridge_vlan[sectionIndex][port] = value
  })
  selectedPorts.value = []
}

function getPortData(portName) {
  return { type: props.section[portName] }
}

// Get all devices and groups affected by a VLAN section
function getAffectedDevicesAndGroups(section) {
  const devices = new Set()
  const groups = new Set()

  // Add directly assigned devices
  if (section.dm_device_id) {
    const deviceIds = isArray(section.dm_device_id) ? section.dm_device_id : [section.dm_device_id]
    deviceIds.forEach(id => devices.add(id))
  }

  // Add assigned groups and their devices
  if (section.dm_group_id) {
    const groupIds = isArray(section.dm_group_id) ? section.dm_group_id : [section.dm_group_id]
    groupIds.forEach(groupId => {
      groups.add(groupId)
      // Find the group in deviceStatus
      const groupDevices = deviceStatus.value.filter(dev => dev.group_id === groupId)
      groupDevices.forEach(dev => devices.add(dev.id))
    })
  }

  return { devices: Array.from(devices), groups: Array.from(groups) }
}

// Detect untagged port conflicts across VLANs for the same devices or groups
function detectUntaggedConflicts() {
  if (!formData.value.bridge_vlan) return null

  const currentSectionIndex = formData.value.bridge_vlan.findIndex(s => s.id === props.section.id)
  if (currentSectionIndex === -1) return null

  const currentSection = formData.value.bridge_vlan[currentSectionIndex]
  const currentAffected = getAffectedDevicesAndGroups(currentSection)

  // Get all untagged ports in current section
  const currentUntaggedPorts = Object.entries(currentSection)
    .filter(([key, value]) => (key.includes('port') || key.includes('sfp')) && value === 'u')
    .map(([key]) => key)

  if (currentUntaggedPorts.length === 0) return null

  // Check for conflicts in other VLANs
  const conflicts = []

  for (const otherSection of formData.value.bridge_vlan) {
    if (otherSection.id === props.section.id) continue

    const otherAffected = getAffectedDevicesAndGroups(otherSection)

    // Check if there are common devices OR common groups
    const commonDevices = currentAffected.devices.filter(dev => otherAffected.devices.includes(dev))
    const commonGroups = currentAffected.groups.filter(grp => otherAffected.groups.includes(grp))

    // No overlap in devices or groups - no conflict possible
    if (commonDevices.length === 0 && commonGroups.length === 0) continue

    // Check for untagged port conflicts
    const conflictingPorts = currentUntaggedPorts.filter(port => otherSection[port] === 'u')

    if (conflictingPorts.length > 0) {
      conflicts.push({
        vlanSection: otherSection,
        ports: conflictingPorts,
        devices: commonDevices,
        groups: commonGroups
      })
    }
  }

  return conflicts.length > 0 ? conflicts : null
}

// Clean VLAN section data - remove display-only fields
function cleanVlanSection(section) {
  const { taggedPorts, untaggedPorts, ...cleanData } = section // eslint-disable-line @typescript-eslint/no-unused-vars
  return cleanData
}

// Handle before save - automatically fix conflicts
function handleBeforeSave() {
  const conflicts = detectUntaggedConflicts()

  if (!conflicts) {
    return true // No conflicts, proceed with normal save
  }

  // Build bulk requests to turn off conflicting ports
  const requests = conflicts.map(conflict => {
    const conflictSection = { ...conflict.vlanSection }

    // Turn off the conflicting ports
    conflict.ports.forEach(port => {
      conflictSection[port] = 'off'
    })

    return {
      method: 'PUT',
      endpoint: '/api/site_manager/switch/vlan/config',
      data: [cleanVlanSection(conflictSection)]
    }
  })

  if (requests.length === 0) return Promise.resolve()

  return axios
    .bulk(requests)
    .then(results => {
      const allSucceeded = results.every(r => r.success)
      if (!allSucceeded) throw $t('Failed to turn off conflicting ports')

      // Update formData with the saved values
      results.forEach(result => {
        if (result.success && result.data?.[0]) {
          const savedSection = result.data[0]
          const section = formData.value.bridge_vlan.find(s => s.id === savedSection.id)
          if (section) {
            Object.assign(section, savedSection)
          }
        }
      })
    })
    .catch(() => {
      throw $t('Failed to turn off conflicting ports')
    })
}
</script>
