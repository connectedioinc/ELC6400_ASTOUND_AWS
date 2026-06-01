<template>
  <tlt-card
    v-if="!singlePort"
    :title="$t('Port status')"
  >
    <ports-view
      v-model="selectedPorts"
      :get-port-data="getPortData"
      :custom-ports="store.isSwitch ? null : ports.getRutosBoardPorts()"
      selectable
      multiple
    >
      <template #multi-action="{ fireMultiAction }">
        <tlt-button
          type="text"
          class="ml-auto"
          :disabled="dsa && !selectedPorts.length"
          @click="dsa ? fireMultiActionCustom() : fireMultiAction()"
        >
          <template v-if="dsa">{{ sameTypeAllPortsSelected && selectedPorts.length ? $t('Deselect all') : $t('Select all') }} {{ selectedPortType }}</template>
          <template v-else>{{ selectedPorts.length ? $t('Deselect all') : $t('Select all') }}</template>
        </tlt-button>
      </template>
    </ports-view>
    <div class="flex justify-end">
      <tlt-button
        :disabled="selectedPorts.length === 0"
        @click="showModal = true"
      >
        {{ $store.readOnlyPage ? $t('View %d ports').format(selectedPorts.length) : $t('Edit %d ports').format(selectedPorts.length) }}
      </tlt-button>
    </div>
  </tlt-card>
  <dot1x-edit-modal
    v-model:show-modal="showModal"
    v-model:selected-ports="selectedPorts"
    v-model:model-value="formData.dot1x"
    :board-ports="ports.getRutosBoardPorts()"
  />
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="tswconfig"
    :after-load="afterLoad"
    :before-save="beforeSave"
  >
    <vuci-typed-section
      v-model:selected="selectedPorts"
      :title="$t('802.1X status')"
      :columns="computedPortsCols"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'dot1x/ports/config' }]"
      data-key="dot1x"
      type="port"
      :row-actions="singlePort ? [{ id: 'edit_port', label: $t('Edit'), callback: () => (showModal = true) }] : undefined"
      :form-methods="['get', 'edit']"
      :after-save="onAfterSave"
    >
      <template
        v-if="!allSelectable"
        #__bulk-actions-header
        ><div></div
      ></template>
      <template #__bulk-actions-checkbox="{ s }">
        <tlt-hint :hints="checkboxStatus(s.id).hint">
          <tlt-check-box
            :readonly="!!checkboxStatus(s.id).hint.length"
            :model-value="selectedPorts.includes(s.id)"
            type="checkbox"
            @update:model-value="val => onSelectClick(s.id, val)"
          />
        </tlt-hint>
      </template>
      <template #id="{ s }">
        <tlt-dummy-value :value="portName(s)" />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :show-text="false"
          :readonly="enableReadonly(s) || portDisabled(s)"
          :hints="
            enableReadonly(s)
              ? [{ info: $t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values.') }]
              : portDisabled(s)
                ? [{ info: $t('Cannot enable instance because the corresponding port is disabled in the port settings.') }]
                : []
          "
        />
      </template>
      <template #role="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="role"
          :display-value="() => $capitalize(s.role)"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import { ref, computed, provide } from 'vue'
import { useMainStore } from '@/stores/main'
import { useTimer } from '@ui-core/composables/useTimer'
import { useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios, type ApiResponse } from '@ui-core/plugins/axios'
import { session } from '@ui-core/plugins/session'
import * as ports from '@/plugins/ports'
import { useNotifications } from '@/stores/messages'
import type { PortStatus } from '@/types/portTypes'
import type { PortData } from '@ui-core/tlt-design/form/core/TltPort.vue'
import PortsView from '@ui-core/tlt-design/customComponents/network/Ports.vue'
import { type FormModel, type Dot1xConfig, type Dot1xPortStatus, type RadiusOption, type VlanOption, type VlanMessage, FormOptionKey } from './Dot1xCommon'
import Dot1xEditModal from './Dot1xEdit.vue'

const $t = useTranslate()
const message = useMessages()
const store = useMainStore()
const notification = useNotifications()

const timer = useTimer({
  method: afterLoad,
  time: 10000,
  autostart: false,
  immediate: false
})

const radiusOptions = ref<RadiusOption[]>([])
const vlanOptions = ref<VlanOption[]>([])

const portStatus = ref<PortStatus[]>([])
const dot1xPortStatus = ref<Dot1xPortStatus[]>([])
const selectedPorts = ref<string[]>([])

const showModal = ref(false)

const formData = ref<FormModel>({ dot1x: [] })

const firstLoad = ref(true)

const enableReadonlyDepends = {
  md5: ['identity', 'password'],
  tls: ['identity', 'client_cert', 'private_key'],
  pwd: ['identity', 'password'],
  ttls: ['anonymous_identity', 'inner_authentication', 'identity', 'password'],
  peap: ['anonymous_identity', 'peap_version', 'inner_authentication', 'identity', 'password']
} as const

const statusErrors = ref<Record<number | 'default', string>>({
  1: $t('Disabled'),
  2: $t('Port down'),
  3: $t('Authentication failed'),
  4: $t('Authorized'),
  5: $t('Authenticating'),
  7: $t('No device'),
  8: $t('Device used'),
  9: $t('Unauthorized'),
  default: '-'
})

const maxVlans = computed(() => store.board?.network_options?.vlans)
const dsa = computed(() => store.board?.hwinfo?.dsa && store.device !== 'x86_64')
const singlePort = computed(() => store?.board?.port_security?.isolation_method === 'single_port')

const portsCols = [
  { name: 'id', label: $t('Port') },
  {
    name: 'enabled',
    label: $t('Enabled'),
    actions: { sort: true, filter: { type: 'uniqueValues' } },
    help: $t('Enables port security on this port.')
  },
  {
    name: 'dotx1',
    label: $t('Status'),
    actions: { sort: true, filter: { type: 'uniqueValues' } },
    displayFn: (_: never, s: Dot1xConfig) => {
      const statusCode = getPortStatusCode(s)
      return statusErrors.value[statusCode !== undefined ? statusCode : 'default'] || statusErrors.value.default
    }
  },
  { name: 'role', label: $t('Role') }
]

const allSelectable = computed(() => !(dsa.value && store.board?.network?.lan && store.board?.network?.wan))

const computedPortsCols = computed(() => (allSelectable.value ? portsCols : [{ name: 'selected', scopedSlots: { customHeader: 'selectedHeader' } }].concat(portsCols)))

const selectedPortType = computed(() => (selectedPorts.value?.[0]?.includes('lan') ? 'LAN' : selectedPorts.value?.[0]?.includes('wan') ? 'WAN' : ''))

const sameTypeAllPortsSelected = computed(() => {
  if (!selectedPorts.value.length) return false
  return portStatus.value.filter(port => 'name' in port && port.name === selectedPortType.value && !checkboxStatus(port.id)?.hint?.length).every(port => selectedPorts.value.includes(port.id))
})

function checkboxStatus(portName: string) {
  if (dsa.value && portCheckboxDisabled(portName)) return { hint: [{ info: $t('Port types of LAN and WAN differ in configuration options and cannot be edited at the same time.') }] }
  if (setPropertiesDiffer(portName)) return { hint: [{ info: $t('Port sensitive data differ in configuration options and cannot be edited at the same time.') }] }
  return { hint: [] }
}

function portName(s: Dot1xConfig): string {
  return portStatus.value.find(x => x.id === s.id)?.description || ports.getPrettyPortId(s.id)
}

function setPropertiesDiffer(id: string): boolean {
  const selected = formData.value.dot1x.find(port => port.id === selectedPorts.value[0])
  const currentPort = formData.value.dot1x.find(port => port.id === id)
  if (!selected || !currentPort) return false
  const selectedSetKeys = Object.keys(selected).filter(key => key.includes(':set')) as Array<`${string}:set`>
  return selectedSetKeys.some(key => currentPort[key] !== selected[key])
}

function portCheckboxDisabled(id: string): boolean {
  const type = id.includes('lan') ? 'lan' : 'wan'
  return !!selectedPorts.value.find(port => !port.includes(type))
}

function getPortStatusCode(config: { id: string }) {
  return dot1xPortStatus.value.find(port => port.port === config?.id)?.code
}

function getPortData(portName: string): PortData {
  const settings = portStatus.value.find(s => s.id === portName)
  const status = dot1xPortStatus.value.find(s => s.port === portName)
  const error = getPortStatusCode(settings!)
  return {
    type: status && status?.code !== 1 ? 'enabled' : 'disabled',
    poe: ports.getPoeState(settings),
    readonly: !!checkboxStatus(portName)?.hint?.length,
    error: [3, 9].includes(error!) ? statusErrors.value[error!] : undefined,
    speed: ports.getPortSpeedIcon(settings),
    ...checkboxStatus(portName)
  }
}

function portAggregationWarning() {
  if (portStatus.value.some(p => 'bond_index' in p && p.bond_index)) {
    store.readOnlyPage = true
    notification.warning({
      id: 'port-aggregation-warning',
      title: $t('Port Aggregation Enabled'),
      text: $t('802.1X configuration cannot be modified because Port Aggregation is enabled.'),
      action: {
        text: $t('Go to Port Aggregation'),
        to: '/network/ports/port_aggregation'
      }
    })
  }
}

function radiusOptionsParse(data: { id: string; name: string }[]): [string, string][] {
  return data.map(option => [option.id, option.name])
}

function afterLoad() {
  const requests = [
    { endpoint: '/api/ports_settings/status', condition: store.hasPackages(['ports-settings-api', 'ports-settings-tsw-api'], false) },
    {
      endpoint: '/api/dot1x/radius/config',
      condition: firstLoad.value && store.hasPackages(['dsa-dot1x-server.control', 'dot1x-server.control'], false)
    },
    {
      endpoint: '/api/port_based_vlan/config',
      condition: firstLoad.value && (!!store?.board?.hwinfo?.dsa || !!store?.board?.switch?.switch0?.ports || !!store.isSwitch) && store.device !== 'x86_64'
    },
    '/api/dot1x/ports/status'
  ]
  axios
    .bulkGet(requests)
    .then(([portStatusData, radiusesData, vlanData, dot1xPortStatusData]) => {
      if (firstLoad.value) {
        if (radiusesData.success) radiusOptions.value = radiusOptionsParse(radiusesData.data)
        else message.error($t('Failed to load radius server list'))
        if (vlanData.success) vlanOptions.value = vlanData.data
        else message.error($t('Failed to load VLAN data'))
      }
      if (portStatusData.success) {
        portStatus.value = portStatusData.data
        portAggregationWarning()
      } else message.error($t('Failed to load port settings data'))
      if (dot1xPortStatusData.success) dot1xPortStatus.value = dot1xPortStatusData.data
      else message.error($t('Failed to load port status data'))
    })
    .catch(() => message.error($t('An unexpected error occurred')))
    .finally(() => {
      if (firstLoad.value) {
        firstLoad.value = false
        timer.start()
      }
    })
}

function vlanError(messages: VlanMessage[]): void {
  if (!messages?.length) return
  const portIds = messages
    .filter(msg => msg.code === 1)
    .map(msg => ports.getPrettyPortId(msg.source))
    .join(', ')
  message.info(
    $t('802.1X Server is no longer modifying the VLAN configuration for ports %s. Please review the VLAN configuration manually to ensure the ports are not left in an unintended state').format(
      portIds
    )
  )
}

function beforeSave(): Promise<void> {
  if (maxVlans.value === undefined) return Promise.resolve()
  const vlansInUse = formData.value.dot1x.filter(x => x.enabled === '1').length + vlanOptions.value.length - maxVlans.value
  if (vlansInUse > 0) return Promise.reject($t('Too many VLANs used to enable 802.1X server on these ports. Please remove %s VLAN(s) to use this feature.').format(vlansInUse))
  return Promise.resolve()
}

function fireMultiActionCustom() {
  if (sameTypeAllPortsSelected.value) {
    selectedPorts.value = []
  } else selectedPorts.value = portStatus.value.filter(port => 'name' in port && port.name === selectedPortType.value && !checkboxStatus(port.id)?.hint?.length).map(port => port.id)
}

function onSelectClick(port: string, isEnabled: boolean) {
  selectedPorts.value = isEnabled ? [...selectedPorts.value, port] : selectedPorts.value.filter(p => p !== port)
}

function onAfterSave(_: unknown, res: Array<ApiResponse<any> & { messages?: VlanMessage[] }>) {
  vlanError(res[0]?.messages || [])
}

function portDisabled(s: Dot1xConfig): boolean {
  const port = portStatus.value.find(x => x.id === s.id)
  return port?.enabled === '0'
}

function enableReadonly(s: Dot1xConfig): boolean {
  if (s.role === 'server') return false
  if (!s.auth_type) return true
  const required = enableReadonlyDepends[s.auth_type]
  return required.some(field => {
    if (!session.hideSensitive()) return !s[field as keyof Dot1xConfig]
    return `${field}:set` in s ? s[`${field}:set`] === '0' : !s[field]
  })
}

provide(FormOptionKey, {
  portStatus,
  radiusOptions,
  vlanOptions,
  vlanError
})
</script>
