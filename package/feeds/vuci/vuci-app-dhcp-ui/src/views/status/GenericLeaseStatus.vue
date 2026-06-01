<template>
  <tlt-card
    v-if="$store.isRouter"
    :title="$t('LAN information')"
  >
    <div class="grid grid-cols-fill-52 md:grid-cols-fill-96 gap-6">
      <tlt-overview-card-type
        v-for="iface in lanStatus"
        :key="iface.name"
        selectable
        :selected="checkSelected(iface.name)"
        :widget="iface"
        :item="iface"
        @click="(_, item) => selectInterface(item)"
      />
    </div>
  </tlt-card>
  <tlt-table
    id="dhcp_info"
    :columns="isIpv4() ? leaseIpv4Cols : leaseIpv6Cols"
    :data-source="filteredLeaseStatus"
    :data-key="null"
    :title="$t('DHCP leases')"
    :table-actions="['selected-interfaces', 'column-list', 'search']"
  >
    <template #selected-interfaces>
      <div
        v-if="selectedInterfaces.length > 0"
        class="flex flex-wrap gap-y-1 md:items-center"
      >
        <tlt-badge
          v-for="(iface, idx) in selectedInterfaces"
          :key="idx"
          class="cursor-pointer mx-1"
          type="primary"
          @click="selectedInterfaces.splice(getSelectedIndex(iface), 1)"
        >
          {{ iface.name }}
        </tlt-badge>
        <div class="mx-1 text-body-secondary">
          <tlt-button
            button-id="clearAll"
            type="text"
            color="primary"
            size="md"
            :disabled="false"
            @click="selectedInterfaces = []"
          >
            {{ $t('Clear all filters') }}
          </tlt-button>
        </div>
      </div>
    </template>
    <template #interfaces="{ record }">
      <array-popover
        :title="$t(`Device '%s' is also being shared between these interfaces:`).format(record.device)"
        :content="record.interfaces"
        exclude-first
      />
    </template>
    <template #ipv6addr="{ record }">
      <array-popover :content="record.ipv6addr" />
    </template>
    <template #ipv6prefix="{ record }">
      <array-popover :content="record.ipv6prefix?.map(ipLease => `${ipLease.address}/${ipLease.prefix_length}`)?.join(', ') ?? '-'" />
    </template>
    <template #lease="{ record }">
      <tlt-button
        :id="`btnLease-${getId(record)}`"
        button-id="lease"
        type="text"
        :disabled="isMacReserved(record) || isIpReserved(record) || network.isMobileBridgeIp(ifaceStatus, record.ipaddr) || record.ipv6addr?.length === 0 || !hasWriteAccess"
        @click="leaseDevice(record)"
      >
        {{ $t('Create static') }}
      </tlt-button>
      <tlt-popover
        :target="`#btnLease-${getId(record)}`"
        placement="left"
        :fallback-placements="['bottom-end', 'bottom', 'left']"
        triggers="hover"
      >
        <template v-if="!hasWriteAccess">
          {{ $t(`No '%s' write access`).format(`${$t('Network')} > DHCP > ${$t('Static Leases')}`) }}
        </template>
        <template v-else-if="isMacReserved(record)">
          {{ $t('This device already has a static IP address. It can be edited') }}
        </template>
        <template v-else-if="isIpReserved(record)">
          {{ $t('This IP address is already statically leased to different device. It can be seen') }}
        </template>
        <template v-else-if="network.isMobileBridgeIp(ifaceStatus, record.ipaddr)">
          {{ $t('This IP address is currently assigned to a mobile bridge and cannot be reserved') }}
        </template>
        <template v-else>
          {{ $t('This action will reserve the currently assigned IP address for the device. After that, it can be edited') }}
        </template>
        <router-link
          v-if="hasWriteAccess && !network.isMobileBridgeIp(ifaceStatus, record.ipaddr)"
          class="ml-1"
          :to="`/network/dhcp_servers/static_leases/${$store.isRouter ? ipv : ''}`"
          >{{ $t('here') }}</router-link
        >.
      </tlt-popover>
    </template>
  </tlt-table>
</template>

<script lang="ts" setup>
import { ipv6Utils, ipv4Utils } from '@/utils/ipUtils'
import ArrayPopover from '@/components/shared/ArrayPopover.vue'
import type { LeaseIpv6Config, LeaseIpv6Status, LeaseIpv4Config, LeaseIpv4Status } from '@/types/leaseTypes'
import type { InterfaceStatus } from '@/types/networkTypes'
import { computed, ref } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMainStore } from '@/stores/main'
import { useMessages } from '@/stores/messages'
import { utils } from '@/plugins/utils'
import { session } from '@ui-core/plugins/session'
import { rules } from '@/validation-rules'
import { axios } from '@ui-core/plugins/axios'
import { network } from '@/plugins/network'
import { useTimer } from '@ui-core/composables/useTimer'
import type { TableColumn } from '@ui-core/components/table/types'
type InterfaceStatusDisplay = { name: string; type: string; title: string; content: { title: string; info?: string | string[]; name: string }[] }

const $t = useTranslate()
const store = useMainStore()
const message = useMessages()

const props = defineProps<{ ipv: 'ipv4' | 'ipv6' }>()

const uniqueFilter = { sort: true, filter: { type: 'uniqueValues' } } as const
const commonCols: TableColumn[] = [
  { dataIndex: 'interface', title: $t('Interface'), displayFn: utils.valueOrBlank, actions: store.isRouter ? undefined : uniqueFilter },
  { dataIndex: 'hostname', title: $t('Hostname'), displayFn: utils.valueOrBlank },
  {
    dataIndex: 'expires',
    title: $t('Leasetime Remaining'),
    help: $t('Remaining time on the lease.'),
    actions: { sort: true },
    displayFn: (value: string) => (value ? '%t'.format(value) : '-')
  },
  { dataIndex: 'lease', title: $t('Actions') }
]

const ifaceStatus = ref<InterfaceStatus[]>([])
const leaseStatus = ref<LeaseIpv4Status[] | LeaseIpv6Status[]>([])
const leaseConfig = ref<LeaseIpv4Config[] | LeaseIpv6Config[]>([])
const selectedInterfaces = ref<InterfaceStatusDisplay[]>([])

const leaseIpv4Cols: TableColumn[] = [
  commonCols[0],
  commonCols[1],
  { dataIndex: 'ipaddr', title: $t('Address'), help: $t('Leased IP address.') },
  { dataIndex: 'macaddr', title: 'MAC', help: $t('A unique identifier used by DHCPv4 to identify devices.') },
  commonCols[2],
  commonCols[3]
]
const leaseIpv6Cols: TableColumn[] = [
  commonCols[0],
  commonCols[1],
  {
    dataIndex: 'ipv6addr',
    title: $t('Address'),
    help: $t('Leased IP address.')
  },
  {
    dataIndex: 'ipv6prefix',
    title: $t('Delegated Prefix'),
    help: $t('The delegated prefix is a smaller subnet given to a device to lease IPv6 addresses for its own DHCPv6 clients.'),
    actions: { sort: true },
    displayFn: (value: LeaseIpv6Status['ipv6prefix']) => value?.map(ipLease => `${ipLease.address}/${ipLease.prefix_length}`)?.join(', ') ?? '-'
  },
  {
    dataIndex: 'duid',
    title: $t('DUID'),
    help: $t('DHCP unique identifier is used by DHCPv6 to identify device. Similar to MAC that is used by DHCPv4.'),
    displayFn: utils.valueOrBlank
  },
  commonCols[2],
  commonCols[3]
]

const lanStatus = computed<InterfaceStatusDisplay[]>(() => {
  return ifaceStatus.value
    .filter(iface => iface.area_type === 'lan' && iface.id !== 'loopback')
    .map(iface => ({
      name: iface.name,
      type: 'interfaceStatus',
      title: network.getName(iface) || '-',
      servicesPath: `/network/lan?edit=${iface.id}`,
      status: iface,
      config: {},
      content: [
        { title: $t('Address'), name: 'address', ipDetails: props.ipv },
        {
          title: $t('Netmask'),
          info: utils.displayWrap(iface['ipv4-address']?.[0]?.mask, ipv4Utils.numberToMask),
          name: 'mask',
          show: isIpv4()
        },
        {
          title: $t('Delegated Prefix'),
          name: 'ipv6-pd',
          ipDetails: 'ipv6-pd',
          show: !isIpv4()
        }
      ].filter(content => content.show !== false)
    }))
})
const filteredLeaseStatus = computed(() => {
  return leaseStatus.value.filter(lease => (selectedInterfaces.value.length === 0 ? true : checkSelected(lease.interface)))
})

function checkSelected(name: string) {
  return selectedInterfaces.value.some(iface => name === iface.name)
}

const hasWriteAccess = computed(() => {
  return session.hasAccess('network/dhcp_servers/static_leases', 'write')
})

function isIpv4(
  obj?: LeaseIpv4Status[] | LeaseIpv6Status[] | LeaseIpv4Config[] | LeaseIpv6Config | LeaseIpv4Status | LeaseIpv6Status | LeaseIpv4Config | LeaseIpv6Config
): obj is LeaseIpv4Status[] | LeaseIpv4Config[] | LeaseIpv4Status | LeaseIpv4Config {
  return props.ipv === 'ipv4'
}

const timer = useTimer({ method: getStatusData, time: 2000, autostart: false, immediate: false })
function getStatusData() {
  const endpoints = [{ endpoint: '/api/interfaces/basic/status', condition: store.isRouter }, `/api/dhcp/leases/${props.ipv}/status`, `/api/dhcp/static_leases/${props.ipv}/config`]
  return axios
    .bulkGet(endpoints)
    .then(([interfaces, dhcp, staticLeases]) => {
      if (interfaces.success) ifaceStatus.value = interfaces.data
      else message.error($t('Failed to load interfaces status'))
      if (dhcp.success) leaseStatus.value = dhcp.data
      else message.error($t('Failed to load DHCP servers status'))
      if (staticLeases.success) leaseConfig.value = staticLeases.data
      else message.error($t('Failed to load static leases'))
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

store.spin()
getStatusData().finally(() => {
  timer.start()
  store.spin(false)
})

function leaseDevice(s: LeaseIpv4Status | LeaseIpv6Status) {
  store.spin()

  const { isValid } = rules.hostname(s.hostname ?? '')

  let data
  if (isIpv4(s)) {
    data = {
      mac: s.macaddr,
      ip: s.ipaddr,
      name: isValid ? s.hostname : ''
    }
  } else {
    data = {
      duid: s.duid,
      hostid: ipv6Utils.getHostId(s.ipv6addr[0]),
      name: isValid ? s.hostname : ''
    }
  }
  return axios
    .post(`/api/dhcp/static_leases/${props.ipv}/config`, {
      data
    })
    .then(res => {
      message.success('Device leased successfully!')
      leaseConfig.value.push(res.data)
    })
    .catch(() => {
      message.error($t('Error occurred while leasing the device'))
    })
    .finally(() => {
      store.spin(false)
    })
}

function isMacReserved(device: LeaseIpv6Status | LeaseIpv4Status) {
  // types are suffed because https://github.com/microsoft/TypeScript/issues/26916
  if (isIpv4()) {
    return (leaseConfig.value as LeaseIpv4Config[]).some(lease => isWilcardMacEqual(lease.mac, (device as LeaseIpv4Status).macaddr))
  } else {
    return (leaseConfig.value as LeaseIpv6Config[]).some(lease => lease.duid?.toUpperCase() === (device as LeaseIpv6Status).duid.toUpperCase())
  }
}

function isWilcardMacEqual(a: string | undefined, b: string | undefined) {
  if (!a || !b) return false
  const aParts = a.split(':')
  const bParts = b.split(':')
  return aParts.every((aPart, index) => aPart.toUpperCase() === bParts[index]?.toUpperCase() || aPart === '*' || bParts[index] === '*')
}

function isIpReserved(device: LeaseIpv6Status | LeaseIpv4Status) {
  if (isIpv4()) {
    return (leaseConfig.value as LeaseIpv4Config[]).some(lease => lease.ip === (device as LeaseIpv4Status).ipaddr)
  } else {
    return (leaseConfig.value as LeaseIpv6Config[]).some(lease => lease.hostid?.toUpperCase() === ipv6Utils.getHostId((device as LeaseIpv6Status).ipv6addr[0]).toUpperCase())
  }
}

function getSelectedIndex(iface: InterfaceStatusDisplay) {
  return selectedInterfaces.value.findIndex(x => x.name === iface.name)
}

function selectInterface(iface: InterfaceStatusDisplay) {
  const ifaceIdx = getSelectedIndex(iface)
  if (ifaceIdx !== -1) return selectedInterfaces.value.splice(ifaceIdx, 1)
  selectedInterfaces.value.push(iface)
}

function getId(s: LeaseIpv4Status | LeaseIpv6Status) {
  return isIpv4(s) ? s.macaddr : s.duid
}
</script>
