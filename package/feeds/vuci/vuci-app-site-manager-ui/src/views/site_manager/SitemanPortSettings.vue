<template>
  <div>
    <tlt-card :title="$t('Port Settings')">
      <ports
        v-model="selectedPorts"
        :get-port-data="getPortData"
        :custom-ports="returnPorts"
        selectable
        no-blocks
        multiple
      />
      <div class="flex justify-end mb-2">
        <tlt-button
          :readonly="selectedPorts.length === 0"
          @click="openModal"
        >
          {{ $t('Edit %d ports').format(selectedPorts.length) }}
        </tlt-button>
      </div>
      <devman-port-edit
        ref="modal"
        v-model:show-modal="showModal"
        :model-value="currentDevicePorts"
        :selected-ports="selectedPorts"
        :poe-ports="poePorts"
        :poe="isPoe()"
        @update:model-value="updatePortsSettings"
      />
    </tlt-card>
    <vuci-typed-section
      v-model:selected="selectedPorts"
      :title="$t('Port Status')"
      :columns="portsCols"
      :uci-data="formData"
      id-key="_id"
      :endpoints="[
        {
          endpoint: 'site_manager/ports_settings/config',
          sectionFilter: sections => sections.dm_device_id === section.id
        }
      ]"
      data-key="portsSettings"
      type="port"
      :form-methods="['get', 'edit']"
    >
      <template #description="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="description"
          :placeholder="getPrettyPortId(s._id)"
          :placeholder-prefix="false"
          :rules="['string', v => $utils.validateNoDuplicates(formData.portsSettings, 'description', v, $t('Port name'))]"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :show-text="false"
        />
      </template>
      <template #poe_enable="{ s }">
        <vuci-form-item-switch
          :depend="!s._id.includes('sfp') && s.poe_enable !== undefined"
          :uci-section="s"
          name="poe_enable"
          :show-text="false"
        />
      </template>
      <template #eee_enable="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="eee_enable"
          :show-text="false"
        />
      </template>
    </vuci-typed-section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import DevmanPortEdit from './SitemanPortSettingsEdit.vue'
import { useTranslate } from '@ui-core/composables/useI18n'

const $t = useTranslate()

const props = defineProps({
  uciData: {
    type: Object,
    required: true
  },
  section: {
    type: Object,
    required: true
  },
  currentTab: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update-ports-settings'])

const formData = ref({ portsSettings: [] })
const selectedPorts = ref([])
const showModal = ref(false)

const portsCols = computed(() =>
  [
    {
      name: 'description',
      label: $t('Port name'),
      help: $t('Name of the port. This is only used for easier management purposes.'),
      displayFn: (_, dataRow) => dataRow.id,
      actions: { sort: true }
    },
    {
      name: 'enabled',
      label: $t('Enabled')
    },
    {
      name: 'poe_enable',
      label: $t('PoE'),
      help: $t('State of port Power over Ethernet.'),
      show: isPoe()
    },
    {
      name: 'eee_enable',
      label: $t('EEE'),
      help: $t('State of port Energy-Efficient Ethernet.')
    }
  ].filter(col => col.show !== false)
)

const returnPorts = computed(() => {
  const ports = formData.value?.portsSettings || []
  return ports
    .filter(port_data => port_data.dm_device_id === props.section.id)
    .map((port, idx) => {
      const isSfp = port._id.toLowerCase().startsWith('sfp')
      return {
        name: port._id,
        type: isSfp ? 'sfp' : 'eth',
        num: port._id.replace(/[^\\d]/g, ''),
        position: isSfp ? (idx % 2 === 0 ? 'down' : 'up') : idx % 2 === 0 ? 'up' : 'down',
        block: isSfp ? 'sfp' : 'eth'
      }
    })
})

const poePorts = computed(() => {
  const ports = props.uciData?.portsSettings || []
  return ports.filter(port_data => port_data.dm_device_id === props.section.id && port_data.poe_enable !== undefined).map(port => port._id)
})

const currentDevicePorts = computed(() => {
  const ports = props.uciData?.portsSettings || []
  return ports.filter(port_data => port_data.dm_device_id === props.section.id)
})

function getPrettyPortId(portId) {
  const number = portId.match(/\d+/)?.[0] || ''
  const spacedNumber = number.split('').join('')
  const firstWord = portId.replace(/\d+/g, '').trim()
  const capitalizedWord = firstWord.charAt(0).toUpperCase() + firstWord.slice(1)
  return `${capitalizedWord} ${spacedNumber}`
}

function isPoe() {
  if (!poePorts.value.length) return false
  return true
}

function getPortData(portName) {
  const status = formData.value?.portsSettings?.find(port => port._id === portName && port.dm_device_id === props.section.id)
  return {
    type: status?.enabled === '1' ? 'enabled' : 'disabled'
  }
}

function openModal() {
  showModal.value = true
}

function updatePortsSettings(updatedSettings) {
  // Update the ports in formData - the vuci-typed-section will handle syncing
  const otherDevicesPorts = formData.value.portsSettings.filter(port => port.dm_device_id !== props.section.id)
  formData.value.portsSettings = [...otherDevicesPorts, ...updatedSettings]
}

onMounted(() => {
  formData.value = props.uciData || { portsSettings: [] }
})

watch(
  () => props.uciData,
  newValue => {
    formData.value = newValue || { portsSettings: [] }
  },
  { deep: true }
)

watch(
  () => props.section.id,
  () => {
    // Clear selected ports when switching devices
    selectedPorts.value = []
  }
)
</script>
