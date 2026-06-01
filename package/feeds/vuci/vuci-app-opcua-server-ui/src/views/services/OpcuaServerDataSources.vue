<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="opcua_server"
    :before-save="beforeSave"
    :after-load="afterLoad"
  >
    <vuci-typed-section
      :uci-data="uciData"
      :title="$t('Nodes')"
      :table-actions="['column-list', 'search']"
      data-key="server_nodes"
      type="server_node"
      :endpoints="[{ endpoint: 'opcua/destination_server/nodes/config' }]"
      :columns="columns"
      :edit-form="markRaw(OpcuaServerDataSourceEdit)"
      :form-methods="['get', 'create', 'edit', 'delete']"
      pagination
      :initial-per-page="25"
    >
      <template #name="{ s }">
        <div class="flex flex-row items-center gap-2">
          <vuci-form-item-dummy
            :uci-section="s"
            name="name"
          />
          <tlt-hint
            v-if="s.enabled === '1' && isUsedTagMissing(s)"
            :hints="[{ info: $t('Referenced source value is missing') }]"
          >
            <tlt-icon
              icon="error"
              class="text-theme-text-danger size-5"
            />
          </tlt-hint>
        </div>
      </template>
      <template #node_id="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="node_id"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :readonly="!canToggleEnable(s)"
        >
          <template
            v-if="!canToggleEnable(s)"
            #after-content="{ controlRef }"
          >
            <tlt-popover
              :target="() => controlRef"
              placement="bottom-start"
              fallback-placements="top-start"
            >
              <template v-if="isRequiredValuesMissing(s)">
                {{ $t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values') }}
              </template>
              <template v-else-if="isUsedTagMissing(s)">
                {{ $t('Referenced source value is missing') }}
              </template>
              <template v-else-if="isDefaultNodesConflicting(s)">
                {{ $t('To use string ID type, default nodes must be disabled. Disable it') }}
                <router-link to="/services/opcua/opcua_server/general"> {{ $t('here') }} </router-link>
              </template>
            </tlt-popover>
          </template>
        </vuci-form-item-switch>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script setup lang="ts">
import { ref, markRaw, provide, computed } from 'vue'
import { useUniversalGatewayUtils } from '@/composables/useUniversalGatewayUtils'
import OpcuaServerDataSourceEdit from './OpcuaServerDataSourceEdit.vue'
import type { Tag, TagType } from '@/types/tagTypes'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import { useMainStore } from '@/stores/main'
import { useMessages } from '@/stores/messages'
import useOpcuaServerUtils from './useOpcuaServerUtils'
import { io } from '@/plugins/io'
import type { Io } from '@/types/ioTypes'
import type { ServerNodeConfig } from './OpcuaServerCommon'

const $t = useTranslate()
const mainStore = useMainStore()
const message = useMessages()
const formData = ref({})
const { findTag, sourceNameTranslations } = useUniversalGatewayUtils()
const { ioTypeDisplayNames, nodeIdTypeDisplayNames } = useOpcuaServerUtils()

function createBuiltinTag(id: string, pretty_name: string, type: TagType, isValueCountUnknown: boolean = false): Tag {
  return {
    id,
    pretty_name,
    type,
    value_count: isValueCountUnknown ? undefined : 1,
    source: 'opcua_server',
    permissions: 'r'
  }
}

const opcuaServerGeneral = ref([])
provide('opcuaServerGeneral', opcuaServerGeneral)
const externalTags = ref<Tag[]>([])
const builtinTags = computed<Tag[]>(() => {
  const tags = []

  // Available on all devices
  tags.push(
    createBuiltinTag('uptime', $t('Uptime'), 'uint32'),
    createBuiltinTag('serial', $t('Device serial number'), 'string'),
    createBuiltinTag('device_name', $t('Device name'), 'string'),
    createBuiltinTag('device_code', $t('Device code'), 'string'),
    createBuiltinTag('version', $t('Firmware version'), 'string'),
    createBuiltinTag('hostname', $t('Hostname'), 'string'),
    createBuiltinTag('lan_ip', $t('LAN IP address'), 'string'),
    createBuiltinTag('lan_mask', $t('LAN subnet mask'), 'string'),
    createBuiltinTag('lan_gateway', $t('LAN gateway'), 'string', true),
    createBuiltinTag('lan_dns', $t('LAN DNS servers'), 'string', true),
    createBuiltinTag('lan_mac', $t('LAN MAC address'), 'string')
  )

  const platform = mainStore.deviceInfo?.board.model.platform
  const isSwitchPlatform = platform === 'TSW2' || platform === 'SWM2'

  if (isSwitchPlatform) {
    tags.push(
      createBuiltinTag('port_label', $t('Port label'), 'string', true),
      createBuiltinTag('port_mac', $t('Port MAC'), 'string', true),
      createBuiltinTag('port_link', $t('Port link status'), 'bool', true),
      createBuiltinTag('port_rx', $t('Port RX'), 'uint64', true),
      createBuiltinTag('port_tx', $t('Port TX'), 'uint64', true),
      createBuiltinTag('port_speed', $t('Port speed'), 'uint32', true),
      createBuiltinTag('port_full_duplex', $t('Port full duplex'), 'bool', true),
      createBuiltinTag('port_rstp_state', $t('Port RSTP state'), 'string', true)
    )
  }

  if (mainStore.deviceInfo?.board.hwinfo.gps) {
    tags.push(
      createBuiltinTag('gps_fix_status', $t('GPS fix status'), 'uint32'),
      createBuiltinTag('gps_timestamp', $t('GPS timestamp'), 'uint64'),
      createBuiltinTag('gps_longitude', $t('GPS longitude'), 'float64'),
      createBuiltinTag('gps_latitude', $t('GPS latitude'), 'float64'),
      createBuiltinTag('gps_altitude', $t('GPS altitude'), 'float64'),
      createBuiltinTag('gps_angle', $t('GPS angle'), 'float64'),
      createBuiltinTag('gps_speed', $t('GPS speed'), 'float64'),
      createBuiltinTag('gps_accuracy', $t('GPS accuracy'), 'float64'),
      createBuiltinTag('gps_satellite_count', $t('GPS satellite count'), 'uint32')
    )
  }

  if (mainStore.deviceInfo?.board.hwinfo.mobile) {
    tags.push(
      createBuiltinTag('modem_count', $t('Modem count'), 'uint32'),
      createBuiltinTag('modem_imei', $t('Modem IMEI'), 'string', true),
      createBuiltinTag('modem_serial', $t('Modem serial number'), 'string', true),
      createBuiltinTag('modem_manufacturer', $t('Modem manufacturer name'), 'string', true),
      createBuiltinTag('modem_model', $t('Modem model name'), 'string', true),
      createBuiltinTag('modem_firmware', $t('Modem firmware version'), 'string', true),
      createBuiltinTag('modem_temperature', $t('Modem temperature'), 'float32', true),
      createBuiltinTag('modem_sim_count', $t('Modem SIM count'), 'uint32', true),
      createBuiltinTag('modem_sim', $t('Modem active SIM slot'), 'uint32', true),
      createBuiltinTag('modem_sim_state', $t('Modem SIM state'), 'string', true),
      createBuiltinTag('modem_sim_iccid', $t('Modem SIM ICCID'), 'string', true),
      createBuiltinTag('modem_sim_rssi', $t('Modem SIM RSSI'), 'int32', true),
      createBuiltinTag('modem_connection_type', $t('Modem connection type'), 'string', true),
      createBuiltinTag('modem_connection_state', $t('Modem connection state'), 'string', true),
      createBuiltinTag('modem_network_state', $t('Modem network state'), 'string', true),
      createBuiltinTag('modem_operator', $t('Modem operator name'), 'string', true)
    )
  }

  if (!isSwitchPlatform) {
    tags.push(createBuiltinTag('wan_ip', $t('WAN IP address'), 'string'), createBuiltinTag('wan_type', $t('WAN type'), 'string'))
  }

  if (mainStore.deviceInfo?.board.hwinfo.ios && availableIOTypes.value.length > 0) {
    tags.push(createBuiltinTag('io', $t('I/O'), 'uint32', true))
  }

  return tags
})

const availableTags = computed(() => [...builtinTags.value, ...externalTags.value])
provide('availableTags', availableTags)

const ioStatus = ref<Io[]>([])

const availableIOTypes = computed(() => {
  return Object.keys(ioTypeDisplayNames).filter(ioType => ioStatus.value.some(io => io.id.startsWith(ioType)))
})
provide('availableIOTypes', availableIOTypes)

const defaultNodesEnabled = computed(() => {
  return opcuaServerGeneral.value[0].default_nodes_enabled !== '0'
})

const columns = [
  {
    name: 'name',
    label: $t('Name'),
    help: $t('Name of the server node.')
  },
  {
    name: 'node_id',
    label: $t('Node ID'),
    help: $t('Unique identifier for node.')
  },
  {
    name: 'node_id_type',
    label: $t('Node ID type'),
    help: $t('Type of unique node identifier.'),
    displayFn: (node_id_type: string) => nodeIdTypeDisplayNames[node_id_type] || '-'
  },
  {
    name: 'source',
    label: $t('Source'),
    help: $t('Client service which will be sending requests.'),
    displayFn: (v: string) => sourceNameTranslations[v] || '-',
    actions: { filter: { type: 'uniqueValues' } }
  },
  {
    name: 'enabled',
    label: $t('Enabled')
  }
]

function isUsedTagMissing(serverNode: ServerNodeConfig) {
  if (serverNode.source_value_id) {
    const tag = findTag(availableTags.value, serverNode.source, serverNode.source_value_id)
    return tag === undefined
  } else {
    return false
  }
}

function isRequiredValuesMissing(section: ServerNodeConfig) {
  return ![section.node_id_type, section.node_id, section.source, section.source_value_id].every(Boolean)
}
function isDefaultNodesConflicting(section: ServerNodeConfig) {
  return section.node_id_type === 'string' && defaultNodesEnabled.value
}
function canToggleEnable(section: ServerNodeConfig) {
  return section.enabled === '1' || !(isRequiredValuesMissing(section) || isUsedTagMissing(section) || isDefaultNodesConflicting(section))
}

function beforeSave() {
  const hasInvalidNode = formData.value.server_nodes.some(node => node.enabled === '1' && isUsedTagMissing(node))
  if (hasInvalidNode) {
    return Promise.reject($t('Cannot save enabled nodes with missing source'))
  }
  return Promise.resolve()
}

function afterLoad() {
  return axios
    .bulkGet([
      '/api/opcua/destination_server/config',
      '/api/universal_gateway/options',
      {
        endpoint: '/api/io/status',
        condition: mainStore.board?.hwinfo?.ios
      }
    ])
    .then(([opcuaConfig, tagOptions, ioStatusResponse]) => {
      if (opcuaConfig.success) {
        opcuaServerGeneral.value = opcuaConfig.data
      } else {
        message.error($t('Failed to load OPC UA server nodes data'))
      }

      if (tagOptions.success) {
        externalTags.value = tagOptions.data.tags
      } else {
        message.error($t('Failed to load universal gateway options'))
      }

      if (ioStatusResponse.success) {
        ioStatus.value = io.getFilteredPinsInfo(ioStatusResponse.data || [])
      } else {
        message.error($t('Failed to load I/O status'))
      }
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}
</script>
