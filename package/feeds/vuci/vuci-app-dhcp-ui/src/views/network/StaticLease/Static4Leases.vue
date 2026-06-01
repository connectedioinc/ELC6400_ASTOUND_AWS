<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="dhcp"
    :after-load="afterLoad"
  >
    <vuci-typed-section
      type="host"
      :title="$t('Static lease')"
      :help="$t('A list of IP addresses that are assigned to specified devices by their MAC address.')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'dhcp/static_leases/ipv4/config' }]"
      data-key="staticLeases"
      :columns="cols"
      :table-actions="['column-list', 'search']"
    >
      <template #mac="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="mac"
          :rules="[validateWildcardMac, (v: string) => $utils.validateNoDuplicates(formData.staticLeases, 'mac', v, 'MAC', true)]"
          :options="$network.getMacOptions(options.mac_hints, ['', $t('-- Please choose --')])"
          allow-create
          required
          @change="setIp(s)"
        />
      </template>
      <template #mac-help>
        <hint-helper
          :main-hint="$t('A unique identifier used by DHCPv4 to identify devices.')"
          :hints="v => [v.macaddr(), { name: $t('Wildcard'), example: '01:23:45:56:*:*' }]"
        />
      </template>
      <template #ip="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="ip"
          placeholder="192.168.0.1"
          :rules="[checkIpErrors, (v: string) => $utils.validateNoDuplicates(formData.staticLeases, 'ip', v, 'IP', true)]"
          required
          :warnings="checkIpSubnetRange"
        >
          <template
            v-if="getDynamicLease(s)"
            #after
          >
            <tlt-button
              :id="`btnRefresh-${s.id}`"
              type="icon"
              color="tertiary"
              icon="refresh"
              size="md"
              :disabled="getDynamicLease(s)?.ipaddr === s.ip"
              class="p-0!"
              @click="setIp(s, true)"
            />
            <tlt-popover
              :target="`#btnRefresh-${s.id}`"
              placement="right"
              :fallback-placements="['bottom-start', 'bottom-end', 'top-start', 'top-end']"
              :content="$t('Set IP to currently leased one')"
              triggers="hover"
            />
          </template>
        </vuci-form-item-input>
      </template>
      <template #name="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="name"
          placeholder="example"
          rules="hostname"
          maxlength="512"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script lang="ts" setup>
import type { LeaseIpv4Config, LeaseIpv4Status } from '@/types/leaseTypes'
import type { DhcpV4Config } from '@/types/dhcpTypes'
import type { GenericInterface as Interface, Interface as RutInterface, InterfaceStatus } from '@/types/networkTypes'
type DhcpInterface = Interface & { dhcp: DhcpV4Config }
import { ipv4Utils } from '@/utils/ipUtils'
import { rules, type ValidationResult } from '@/validation-rules'
import { computed, ref } from 'vue'
import HintHelper from '@/components/shared/HintHelper.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'
import { useMainStore } from '@/stores/main'
import { network } from '@/plugins/network'
import { isNonNullable } from '@ui-core/utils/inspect'

const $t = useTranslate()
const message = useMessages()
const store = useMainStore()

interface FormModel {
  staticLeases: LeaseIpv4Config[]
}

const formData = ref<FormModel>({ staticLeases: [] })

const ifaceDhcpConfig = ref<DhcpInterface[]>([])

const leaseStatus = ref<LeaseIpv4Status[]>([])

const options = ref<{ ipv4_hints: [string, string][]; mac_hints: [string, string][] }>({
  ipv4_hints: [],
  mac_hints: []
})
const cols = [
  {
    name: 'mac',
    label: 'MAC'
  },
  { name: 'ip', label: 'IP', help: $t('IP address that will be leased statically.') },
  { name: 'name', label: $t('Hostname') }
]

const availableAddresses = computed(() => {
  return (
    ifaceDhcpConfig.value
      .map(iface => {
        if (!iface.ipaddr || !iface.netmask) return
        const [ipaddrArr, netmaskArr] = [ipv4Utils.parse(iface.ipaddr), ipv4Utils.parse(iface.netmask)]
        const networkArr = ipv4Utils.subnetID(ipaddrArr, netmaskArr)
        const broadcastArr = ipv4Utils.broadcast(networkArr, ipv4Utils.wildcardMask(netmaskArr))
        const network = networkArr.join('.')
        const broadcast = broadcastArr.join('.')
        networkArr[networkArr.length - 1]++
        broadcastArr[broadcastArr.length - 1]--
        return {
          netmask: iface.netmask,
          network,
          broadcast,
          startIp: networkArr.join('.'),
          endIp: broadcastArr.join('.')
        }
      })
      .filter(isNonNullable)
      // Filter dublicate networks
      .filter((network, index, arr) => index === arr.findIndex(otherNetwork => otherNetwork.network === network.network && otherNetwork.netmask === network.netmask))
  )
})

const ifaceStatus = ref<InterfaceStatus[]>([])
function afterLoad() {
  return axios
    .bulkGet(['/api/dhcp/servers/ipv4/config', '/api/interfaces/config', '/api/dhcp/leases/ipv4/status', '/api/routes/status', '/api/interfaces/basic/status'])
    .then(([dhcp, interfaces, leaseStatusRes, optionsRes, ifaceStatusRes]) => {
      let interfacesConfig: Interface[] = []
      let dhcpConfig: DhcpV4Config[] = []
      if (dhcp.success) dhcpConfig = dhcp.data
      else message.error($t('Failed to load DHCP servers config'))
      if (interfaces.success) interfacesConfig = interfaces.data
      else message.error($t('Failed to load interfaces config'))
      ifaceDhcpConfig.value = interfacesConfig
        .filter(iface => ((iface as unknown as RutInterface).area_type === 'lan' || store.isSwitch) && iface.proto === 'static')
        .map(iface => {
          return {
            ...iface,
            dhcp: dhcpConfig.find(server => network.getName(iface) === server.interface)
          }
        })
        .filter((iface): iface is DhcpInterface => iface.dhcp !== undefined)
      if (leaseStatusRes.success) leaseStatus.value = leaseStatusRes.data
      else message.error($t('Failed to load lease status'))
      if (optionsRes.success) options.value = optionsRes.data
      else message.error($t('Failed to load routes status'))
      if (ifaceStatusRes.success) ifaceStatus.value = ifaceStatusRes.data
      else message.error($t('Failed to load interface status'))
    })
}

function checkIpErrors(val: string): ValidationResult {
  const res = rules.ip4addr(val)
  if (!res.isValid) return { isValid: false, message: res.message }
  if (network.isMobileBridgeIp(ifaceStatus.value, val)) return { isValid: false, message: $t('This IP address is currently assigned to a mobile bridge and cannot be reserved.') }
  const networkUsed = availableAddresses.value.some(addr => val === addr.network)
  const broadcastUsed = availableAddresses.value.some(addr => val === addr.broadcast)
  if (networkUsed) return { isValid: false, message: $t('A network address cannot be specified as a lease IP address.') }
  if (broadcastUsed) return { isValid: false, message: $t('A broadcast address cannot be specified as a lease IP address.') }
  return { isValid: true }
}

function checkIpSubnetRange(val: string) {
  const { isValid } = rules.ip4addr(val)
  if (!isValid) return
  const messageNoDhcpServer = $t('The lease will be inoperable due to no DHCPv4 servers existing on the device.')
  if (availableAddresses.value.length === 0) return messageNoDhcpServer
  const messageWrongSubnet = $t('The lease will be inoperable due to the provided IP being outside of the subnet range. Available addresses: %s').format(
    availableAddresses.value.map(addr => `${addr.startIp} - ${addr.endIp}`).join(', ')
  )
  const ipInRange = availableAddresses.value.some(addr => {
    const intVal = ipv4Utils.ip2int(val)
    return intVal >= ipv4Utils.ip2int(addr.startIp) && intVal <= ipv4Utils.ip2int(addr.endIp)
  })
  if (!ipInRange) return messageWrongSubnet
}

function validateWildcardMac(val: string) {
  return rules.macaddr(val.replaceAll('*', '00'))
}

function setIp(section: LeaseIpv4Config, force?: boolean) {
  if (section.ip && !force) return // do not change mac if it already exists
  const lease = getDynamicLease(section)
  section.ip = lease?.ipaddr
}

function getDynamicLease(section: LeaseIpv4Config) {
  return leaseStatus.value.find(lease => lease.macaddr?.toLowerCase() === section.mac?.toLowerCase())
}
</script>
