<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    async-load
    config="dhcp"
    :extra-load="extraLoad"
    :after-load="
      () =>
        updateStatus().then(() => {
          statusLoaded = true
          timer.start()
        })
    "
  >
    <vuci-typed-section
      type="dhcp"
      :title="$t('DHCPv4 servers')"
      :help="$t('A list of DHCP servers that manage IP address leasing.')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'dhcp/servers/ipv4/config' }]"
      data-key="dhcpv4"
      :columns="cols"
      :edit-form="markRaw(EditForm)"
      :form-methods="$store.isRouter ? ['get', 'edit'] : undefined"
      :table-actions="['reset', 'refresh', 'column-list', 'search']"
    >
      <template #reset>
        <tlt-button
          v-show="resetNeeded"
          id="resetBtn"
          ref="resetBtn"
          color="tertiary"
          button-id="button-resetDHCP"
          :loading="dhcpRestarting"
          @click="restartDhcp"
        >
          {{ $t('Recheck error') }}
        </tlt-button>
        <tlt-tooltip
          target="#resetBtn"
          placement="bottom-end"
          fallback-placements="left"
        >
          {{ $t('Make DHCPv4 servers recheck if there is still other DHCPv4 server online in the same network') }}
        </tlt-tooltip>
      </template>
      <template #enable_dhcpv4="{ s }">
        <vuci-form-item-switch
          class="min-w-0!"
          :uci-section="s"
          name="enable_dhcpv4"
        />
        <basic-status
          :status="{
            status: '',
            type: 'warning',
            help: network.getMultiDeviceDhcpMsg(interfaceData, formData.dhcpv4, s, networkDevices)
          }"
        />
      </template>
      <template #mode="{ s }">
        {{ modes[s.mode] }}
      </template>
      <template #mode-help>
        <hint-helper v-bind="network.commonHints.dhcpv4mode()" />
      </template>
      <template #status="{ s }">
        <dhcp-server-status :status-code="getDhcpStatus(s, dhcpStatus)" />
      </template>
      <template #_pool_status="{ s }">
        <dhcp4-pool-status
          v-if="statusLoaded && s.mode === 'server'"
          :dhcp-config="s"
          :lease-configs="leaseConfigs"
          :lease-status="leaseStatus"
          :interface-config="interfaceData.find(iface => iface.id === s.id)!"
          :interface-configs="interfaceData"
        />
        <div v-else>-</div>
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-select
          v-model="addModel.id"
          :label="$t('Interface')"
          :help="$t('Interface that dhcp server will lease address for. DHCP server can only work on static type interface and only one per interface.')"
          prop="id"
          :placeholder="$t('No available interfaces')"
          :options="interfaceOptions"
          required
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script lang="ts" setup>
import type { DhcpStatus, DhcpV4Config } from '@/types/dhcpTypes'
import type { LeaseIpv4Status, LeaseIpv4Config } from '@/types/leaseTypes'
import type { GenericInterface as Interface } from '@/types/networkTypes'
import type { DeviceStatus } from '@/types/networkDeviceTypes'
import { computed, markRaw, provide, ref } from 'vue'
import { getDhcpStatus } from '../DhcpServerFunctions'
import EditForm from './Dhcp4ServerEdit.vue'
import DhcpServerStatus from '../DhcpServerStatus.vue'
import Dhcp4PoolStatus from './Dhcp4PoolStatus.vue'
import { FormOptionKey, type FormModel } from './Dhcp4ServerCommon'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { useTimer } from '@ui-core/composables/useTimer'
import { axios } from '@ui-core/plugins/axios'
import { utils } from '@/plugins/utils'
import { network } from '@/plugins/network'
import { useMainStore } from '@/stores/main'
import BasicStatus from '@/components/shared/BasicStatus.vue'
import HintHelper from '@/components/shared/HintHelper.vue'

const $t = useTranslate()
const message = useMessages()
const store = useMainStore()

const dhcpRestarting = ref(false)
const formData = ref<FormModel>({ dhcpv4: [] })

const cols = [
  { name: 'interface', label: $t('Interface'), help: $t('Network interface to which this server is associated.') },
  { name: 'mode', label: $t('Mode'), displayFn: utils.valueOrBlank },
  { name: '_range', label: $t('Range'), displayFn: (_: unknown, row: DhcpV4Config) => (row.start_ip && row.end_ip ? `${row.start_ip} - ${row.end_ip}` : '-'), width: 'sm' },
  { name: '_pool_status', label: $t('Leased IPs') },
  { name: 'status', label: $t('Status'), displayFn: (_: unknown, row: DhcpV4Config) => getDhcpStatus(row, dhcpStatus.value) },
  { name: 'enable_dhcpv4', label: $t('Enabled') }
]
const modes = {
  server: $t('Server'),
  relay: $t('Relay')
}

const resetNeeded = computed(() => {
  return dhcpStatus.value.find(dhcp => dhcp.errors?.find(error => error.error === 5))
})
const interfaceOptions = computed(() => {
  return interfaceData.value.filter(iface => iface.proto === 'static' && !formData.value.dhcpv4.some(dhcp => dhcp.id === iface.id)).map(iface => iface.id)
})

const timer = useTimer({ method: updateStatus, time: 5000, autostart: false, immediate: false })

const interfaceData = ref<Interface[]>([])
provide(FormOptionKey, { interfaceData })
function extraLoad() {
  return axios
    .get('/api/interfaces/config')
    .then(({ data }) => {
      interfaceData.value = data
    })
    .catch(() => {
      message.error($t('Failed to load interface data'))
    })
}

const dhcpStatus = ref<DhcpStatus[]>([])
const leaseConfigs = ref<LeaseIpv4Config[]>([])
const leaseStatus = ref<LeaseIpv4Status[]>([])
const networkDevices = ref<DeviceStatus[]>([])
const statusLoaded = ref(false)
function updateStatus() {
  return axios
    .bulkGet(['/api/dhcp/servers/ipv4/status', '/api/dhcp/leases/ipv4/status', '/api/dhcp/static_leases/ipv4/config', { endpoint: '/api/basic/network/devices/status', condition: store.isRouter }])
    .then(([dhcpData, leaseStatusData, leaseConfigData, devicesStatusData]) => {
      if (dhcpData.success) dhcpStatus.value = dhcpData.data
      else message.error($t('Failed to load DHCP status'))

      if (leaseStatusData.success) leaseStatus.value = leaseStatusData.data
      else message.error($t('Failed to load lease status'))

      if (leaseConfigData.success) leaseConfigs.value = leaseConfigData.data
      else message.error($t('Failed to load lease data'))

      if (devicesStatusData.success) networkDevices.value = devicesStatusData.data
      else message.error($t('Failed to load network devices status'))
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}
function restartDhcp() {
  dhcpRestarting.value = true
  timer.stop()
  return axios
    .post('/api/dhcp/servers/ipv4/actions/restart')
    .then(() => {
      message.success($t('Successfully restarted DHCP servers'))
    })
    .catch(() => {
      message.error($t('Failed to restart DHCP servers'))
    })
    .finally(() => {
      dhcpRestarting.value = false
      timer.start()
    })
}
</script>
