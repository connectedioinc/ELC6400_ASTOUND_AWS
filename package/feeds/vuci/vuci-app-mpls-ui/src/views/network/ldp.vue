<template>
  <vuci-form
    v-slot="{ uciData }"
    config="mpls"
    :after-load="() => afterLoad().then(() => timer.start())"
  >
    <tlt-card :title="$t('Status')">
      <tlt-value-list
        id="status"
        :data-source="[
          { title: $t('Status'), slotName: 'status', value: '' },
          { title: $t('Devices'), slotName: 'devices', value: '' },
          { title: $t('Neighbors'), slotName: 'neighbors', value: '' }
        ]"
        class="w-80 max-md:w-full m-auto"
      >
        <template #status_value>
          <basic-status :status="globalState" />
        </template>
        <template #devices_value>
          <template v-if="!ldpStatus || !ldpStatus.interfaces.length">-</template>
          <div
            v-else
            class="flex gap-2"
          >
            {{ ldpStatus.interfaces.length }}
            <tlt-button
              type="text"
              @click="modal = 'devices'"
            >
              {{ $t('View status') }}
            </tlt-button>
          </div>
        </template>
        <template #neighbors_value>
          <template v-if="!ldpStatus || !ldpStatus.interfaces.length">-</template>
          <div
            v-else
            class="flex gap-2"
          >
            {{ ldpStatus.neighbors.length }}
            <tlt-button
              type="text"
              @click="modal = 'neighbors'"
            >
              {{ $t('View status') }}
            </tlt-button>
          </div>
        </template>
      </tlt-value-list>
    </tlt-card>
    <vuci-named-section
      v-slot="{ s }"
      :title="$t('LDP configuration')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'mpls/ldp/global' }]"
      data-key="ldp"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        name="enabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="router_id"
        :label="$t('Router ID')"
        rules="ip4addr"
        :required="s.enabled === '1'"
      >
        <template #help>
          <hint-helper
            :main-hint="$t('LDP router ID.')"
            :hints="e => [e.ip4addr()]"
          />
        </template>
      </vuci-form-item-input>
      <vuci-form-item-select
        :uci-section="s"
        name="ifname"
        :label="$t('Devices')"
        :help="$t('Devices on which LDP will run.')"
        :options="deviceOptions"
        multiple
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="transport_address"
        :label="$t('Transport address')"
        rules="ip4addr"
        :required="s.enabled === '1'"
      >
        <template #help>
          <hint-helper
            :main-hint="$t('IP address used to establish LDP session.')"
            :hints="e => [e.ip4addr()]"
          />
        </template>
      </vuci-form-item-input>
    </vuci-named-section>
    <tlt-modal
      :open="!!modal"
      @close="modal = undefined"
    >
      <tlt-table
        v-if="modal === 'devices'"
        id="ldp_device_Status"
        :title="$t(`LDP device status`)"
        :columns="deviceCollumns"
        :data-source="ldpStatus?.interfaces ?? []"
        @refresh="forceUpdateStatus"
      >
        <template #state="{ record }">
          <basic-status :status="parseLdpDeviceState(record)" />
        </template>
      </tlt-table>
      <tlt-table
        v-if="modal === 'neighbors'"
        id="ldp_neighbor_Status"
        :title="$t(`LDP neighbor status`)"
        :columns="neighborCollumns"
        :data-source="ldpStatus?.neighbors ?? []"
        pagination
        @refresh="forceUpdateStatus"
      >
        <template #state="{ record }">
          <basic-status :status="parseLdpNeighborState(record)" />
        </template>
      </tlt-table>
    </tlt-modal>
  </vuci-form>
</template>

<script setup lang="ts">
import BasicStatus, { type Status } from '@/components/shared/BasicStatus.vue'
import HintHelper from '@/components/shared/HintHelper.vue'
import { formatLink } from '@/components/shared/StringWithLinks.vue'
import { useMainStore } from '@/stores/main'
import { useMessages } from '@/stores/messages'
import type { LdpDeviceStatus, LdpNeighborStatus, LdpStatus } from '@/types/mplsTypes'
import type { DeviceStatus } from '@/types/networkDeviceTypes'
import type { InterfaceStatus } from '@/types/networkTypes'
import type { TableColumn } from '@ui-core/components/table/types'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useTimer } from '@ui-core/composables/useTimer'
import { axios } from '@ui-core/plugins/axios'
import { computed, ref } from 'vue'

const message = useMessages()
const $t = useTranslate()
const store = useMainStore()

const modal = ref<'neighbors' | 'devices' | undefined>(undefined)

const deviceCollumns = [
  { dataIndex: 'name', title: $t('Name') },
  { dataIndex: 'state', title: $t('Status') },
  { dataIndex: 'adjacencies', title: $t('Neighbors') },
  { dataIndex: 'uptime', title: $t('Uptime') }
] satisfies TableColumn<LdpDeviceStatus>[]

const neighborCollumns = [
  { dataIndex: 'neighbor_id', title: $t('Neighbor ID') },
  { dataIndex: 'transport_address', title: $t('Transport Address') },
  { dataIndex: 'state', title: $t('Status') },
  { dataIndex: 'uptime', title: $t('Uptime') }
] satisfies TableColumn<LdpNeighborStatus>[]

const ldpStatus = ref<LdpStatus | null>(null)
const devicesStatus = ref<DeviceStatus[]>([])
const interfaceStatus = ref<InterfaceStatus[]>([])
const timer = useTimer({ method: afterLoad, time: 5000, autostart: false, immediate: false })
function afterLoad() {
  return axios
    .bulkGet(['/api/mpls/ldp/status', '/api/basic/network/devices/status', '/api/interfaces/basic/status'])
    .then(([_ldpStatus, _devicesStatus, _interfaceStatus]) => {
      if (_ldpStatus.success) ldpStatus.value = _ldpStatus.data
      else message.error($t('Failed to load ldp status'))
      if (_devicesStatus.success) devicesStatus.value = _devicesStatus.data
      else message.error($t('Failed to load network devices status'))
      if (_interfaceStatus.success) interfaceStatus.value = _interfaceStatus.data
      else message.error($t('Failed to load interface status'))
    })
    .catch(() => message.error($t('An unexpected error occurred')))
}
function forceUpdateStatus() {
  store.spin()
  return afterLoad().then(() => store.spin(false))
}

function getDeviceName(device: DeviceStatus) {
  const iface = interfaceStatus.value.filter(iface => iface.device === (device.description ?? device.name))
  const posfix = iface.length ? ` (${iface.map(e => e.name).join(', ')})` : ''
  return `${device.description ?? device.name}${posfix}`
}

const deviceOptions = computed(() =>
  devicesStatus.value
    .filter(
      device =>
        !devicesStatus.value.some(bridge => bridge.type === 'bridge' && bridge['bridge-members']?.includes(device.name)) &&
        (['8021ad', '8021q', 'VLAN', 'ethernet', 'bridge'] as DeviceStatus['type'][]).includes(device.type)
    )
    .map<[string, string]>(e => [e.name, getDeviceName(e)])
    .sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true }))
)

const ldpGlobalStates = {
  running: {
    type: 'success',
    status: $t('Running')
  },
  starting: {
    type: 'warning',
    status: $t('Starting'),
    help: $t('If this is seen for a long time check system logs.')
  },
  stopping: {
    type: 'warning',
    status: $t('Stopping'),
    help: $t('If this is seen for a long time check system logs.')
  },
  innactive: {
    status: $t('Innactive'),
    helpTitle: $t('Innactive'),
    help: $t('Every device is innactive.')
  },
  noNeighbors: {
    status: $t('Looking for neighbors'),
    helpTitle: $t('Looking for neighbors'),
    help: $t('Trying to establish connection with other neighbors.'),
    type: 'warning'
  },
  disabled: {
    status: $t('Disabled')
  }
} as const satisfies Record<string, Status>

const globalState = computed(() => {
  if (!ldpStatus.value) return '-'
  const running = ldpStatus.value.interfaces.some(e => e.state === 'ACTIVE')
  if (ldpStatus.value.enabled === '0') {
    if (running) return ldpGlobalStates.stopping
    return ldpGlobalStates.disabled
  }
  if (running) {
    if (!ldpStatus.value.neighbors.length) return ldpGlobalStates.noNeighbors
    return ldpGlobalStates.running
  }
  if (ldpStatus.value.interfaces.every(dev => parseLdpDeviceState(dev).innactive)) return ldpGlobalStates.innactive
  return ldpGlobalStates.starting
})

const ldpDeviceStates = {
  up: {
    type: 'success',
    status: $t('Running'),
    innactive: false
  },
  starting: {
    type: 'warning',
    status: $t('Starting'),
    helpTitle: $t('Starting'),
    help: $t('If this is seen for a long time check system logs.'),
    innactive: false
  },
  noNeighbors: {
    status: $t('Looking for neighbors'),
    helpTitle: $t('Looking for neighbors'),
    help: $t('Trying to establish connection with other neighbors.'),
    type: 'warning',
    innactive: false
  },
  ifaceInnactive: {
    status: $t('Innactive'),
    helpTitle: $t('Innactive'),
    help: $t('Network interface controlling device is down. Checked %s page.').format(formatLink('/network/lan')),
    innactive: true
  },
  devInnactive: {
    status: $t('Innactive'),
    helpTitle: $t('Innactive'),
    help: $t('Network device is down. Checked %s page.').format(formatLink('/network/devices')),
    innactive: true
  }
} as const satisfies Record<string, Status & { innactive?: boolean }>

function parseLdpDeviceState(ldpDeviceStatus: LdpDeviceStatus) {
  const devStatus = devicesStatus.value.find(e => e.name === ldpDeviceStatus.name)
  const ifaceStatus = devStatus ? interfaceStatus.value.find(iface => iface.device === (devStatus.description ?? devStatus.name)) : undefined
  if (ldpDeviceStatus.state === 'ACTIVE') {
    if (ldpDeviceStatus.adjacencies !== '0') return ldpDeviceStates.up
    return ldpDeviceStates.noNeighbors
  }
  if (!devStatus?.carrier) return ldpDeviceStates.devInnactive
  if (!ifaceStatus?.up) return ldpDeviceStates.ifaceInnactive
  return ldpDeviceStates.starting
}
const ldpNeighborStates = {
  'NON EXISTENT': {
    type: 'error',
    status: $t('Disconnected')
  },
  INITIALIZED: {
    type: 'warning',
    status: $t('Initialized'),
    help: $t('TCP connection is established.')
  },
  OPENREC: {
    type: 'warning',
    status: $t('Message received'),
    help: $t('Initialization message was received.')
  },
  OPENSENT: {
    type: 'warning',
    status: $t('Message sent'),
    help: $t('Initialization message was sent.')
  },
  OPERATIONAL: {
    type: 'success',
    status: $t('Connected')
  }
} as const satisfies Record<string, Status>
function parseLdpNeighborState(ldpDeviceStatus: LdpNeighborStatus) {
  return ldpNeighborStates[ldpDeviceStatus.state] ?? '-'
}
</script>
