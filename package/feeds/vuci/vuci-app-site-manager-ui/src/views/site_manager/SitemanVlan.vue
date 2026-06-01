<template>
  <vuci-form
    v-model="formData"
    config="siteman_vlan"
    :after-load="afterLoad"
  >
    <template #default="{ uciData }">
      <vuci-typed-section
        :title="$t('VLAN configuration')"
        type="bridge-vlan"
        :columns="deviceColumns"
        :uci-data="uciData"
        :endpoints="[
          {
            endpoint: 'site_manager/switch/vlan/config'
          }
        ]"
        data-key="bridge_vlan"
        :edit-form="EditForm"
        :form-methods="['get', 'create', 'edit', 'delete']"
        :row-actions="getRowActions"
      >
        <template #name="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            name="id"
            :display-value="() => getID(s)"
          />
        </template>
        <template #vlan="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            name="vlan"
          />
        </template>
        <template #group="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            :display-value="displayDevMan"
            name="dm_group_id"
          />
        </template>
        <template #uPorts="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            name="untaggedPorts"
            :display-value="() => getPorts(s, 'u')"
          />
        </template>
        <template #tPorts="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            name="taggedPorts"
            :display-value="() => getPorts(s, 't')"
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

<script setup>
import { ref, provide } from 'vue'
import EditForm from './VlanPortEdit.vue'
import { useDevmanCommonFunction, provideGroupDeviceContext } from './SitemanCommon'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'

const t = useTranslate()
const formData = ref({})

const deviceColumns = [
  { name: 'name', label: t('Name'), help: t('VLAN configuration name') },
  { name: 'vlan', label: 'VLAN ID', help: t('VLAN Identification number') },
  { name: 'group', label: t('Groups/Devices') },
  { name: 'uPorts', label: t('Untagged Ports'), help: t('VLAN untagged ports') },
  { name: 'tPorts', label: t('Tagged Ports'), help: t('VLAN tagged ports') }
]

const { mappedGroups, mappedDevices, groups, deviceStatus, displayDevMan } = useDevmanCommonFunction()

function afterLoad() {
  return axios.bulkGet(['/api/site_manager/devices/status?exclude_firmware_status=1', '/api/site_manager/groups/config']).then(([devs, group]) => {
    if (group.success) {
      groups.value = group.data.filter(grp => grp.platform === 'switch')
    }
    if (devs.success) {
      deviceStatus.value = devs.data.filter(dev => !dev.device_type.toLowerCase().includes('tap'))
    }
  })
}

provideGroupDeviceContext({
  groups: mappedGroups,
  devices: mappedDevices
})
provide('deviceStatus', deviceStatus)

function getID(s) {
  return s.name || s.id
}

function getPorts(section, type) {
  const ports = Object.entries(section)
    .filter(([key, value]) => (key.includes('port') || key.includes('sfp')) && value === type)
    .map(([key]) => {
      const port = key.match(/[a-zA-Z]+|[0-9]+/g)
      return {
        name: key.includes('sfp') ? `SFP ${port[1]}` : port[1]
      }
    })
    .sort((a, b) => {
      const getSortNumber = port => (port.name.includes('SFP') ? 1000 + parseInt(port.name.split(' ')[1], 10) : parseInt(port.name, 10))
      return getSortNumber(a) - getSortNumber(b)
    })
    .map(port => port.name)

  return ports.length > 0 ? ports : t('None')
}

// Helper to extract active ports from a section
function getActivePorts(section) {
  return Object.entries(section)
    .filter(([key, value]) => (key.includes('port') || key.includes('sfp')) && (value === 't' || value === 'u'))
    .map(([key]) => key)
}

// Helper to get other VLANs in the same device and group
function getOtherVlans(section) {
  if (!formData.value.bridge_vlan) return []

  const { id, device, group } = section
  return formData.value.bridge_vlan.filter(v => v.id !== id && v.device === device && v.group === group)
}

// Helper to find orphaned ports
function findOrphanedPorts(activePorts, otherVlans) {
  return activePorts.filter(port => !otherVlans.some(vlan => vlan[port] === 't' || vlan[port] === 'u'))
}

// Helper to format port names for display
function formatPortNames(ports) {
  return ports
    .map(port => {
      const num = port.match(/[a-zA-Z]+|[0-9]+/g)?.[1]
      return port.includes('sfp') ? `SFP ${num}` : num
    })
    .sort((a, b) => {
      const getNum = p => parseInt(p.replace(/[^0-9]/g, ''), 10)
      return getNum(a) - getNum(b)
    })
}

// Combined validation logic
function getVlanDeletionState(section) {
  // VLAN ID 1 cannot be deleted
  if (section.vlan === '1') {
    return {
      canDelete: false,
      hint: { info: t('Default VLAN cannot be deleted') }
    }
  }

  const activePorts = getActivePorts(section)

  // No active ports means safe to delete
  if (activePorts.length === 0) {
    return { canDelete: true, hint: null }
  }

  const otherVlans = getOtherVlans(section)
  const orphanedPorts = findOrphanedPorts(activePorts, otherVlans)

  // Check if there are orphaned ports
  if (orphanedPorts.length > 0) {
    const portNames = formatPortNames(orphanedPorts)
    return {
      canDelete: false,
      hint: {
        info: t('Cannot delete VLAN. Ports must be tagged or untagged in at least one VLAN. The following ports would be left without any VLAN assignment: %s').format(portNames.join(', '))
      }
    }
  }

  return { canDelete: true, hint: null }
}

function getRowActions(record) {
  const { canDelete, hint } = getVlanDeletionState(record)

  return [
    'edit',
    {
      id: 'delete',
      label: t('Delete'),
      buttonProps: {
        color: 'error',
        disabled: !canDelete
      },
      hints: hint ? [hint] : []
    }
  ]
}
</script>
