<template>
  <basic-status :status="status">
    <template #help>
      <div class="flex flex-col gap-2">
        <div v-if="hintText">{{ hintText }}</div>
        <div class="flex flex-col">
          <div>{{ $t('Leases:') }}</div>
          <router-link
            :to="$store.isSwitch ? '/network/dhcp_servers/static_leases' : '/network/dhcp_servers/static_leases/ipv4'"
            class="flex gap-2 no-underline visited:text-[unset] text-[unset] items-center"
          >
            {{ $t('static: %s').format(fromConfigs.length) }}
            <tlt-icon
              icon="external-link"
              class="text-theme-text-primary size-5"
            />
          </router-link>
          <router-link
            :to="$store.isSwitch ? '/status/network/dhcp_leases' : '/status/network/lan/ipv4'"
            class="flex gap-2 no-underline visited:text-[unset] text-[unset] items-center"
          >
            {{ $t('dynamic: %s').format(fromStatus.length - overlap) }}
            <tlt-icon
              icon="external-link"
              class="text-theme-text-primary size-5"
            />
          </router-link>
          <div v-if="fromStaticInterfaces.length">{{ $t('reserved by this device: %s.').format(fromStaticInterfaces.length) }}</div>
          <div v-if="excluded">{{ $t('excluded for compatibility (KB281579): %s.').format(excluded) }}</div>
        </div>
      </div>
    </template>
  </basic-status>
</template>

<script lang="ts" setup>
import BasicStatus, { type Status } from '@/components/shared/BasicStatus.vue'
import { useMainStore } from '@/stores/main'
import type { DhcpV4Config } from '@/types/dhcpTypes'
import type { LeaseIpv4Config, LeaseIpv4Status } from '@/types/leaseTypes'
import type { GenericInterface, Interface, TswInterface } from '@/types/networkTypes'
import { ipv4Utils } from '@/utils/ipUtils'
import { useTranslate } from '@ui-core/composables/useI18n'
import { computed } from 'vue'

export interface Props {
  dhcpConfig: DhcpV4Config
  interfaceConfig: GenericInterface
  interfaceConfigs: GenericInterface[]
  leaseStatus: LeaseIpv4Status[]
  leaseConfigs: LeaseIpv4Config[]
}

const props = defineProps<Props>()
const $t = useTranslate()
const store = useMainStore()

/** Static interfaces that are on same device and in dhcp range. Most commonly it will be parent interface but it can have and other ones. */
const fromStaticInterfaces = computed(() =>
  props.interfaceConfigs.filter(
    iface =>
      (store.isSwitch
        ? (iface as unknown as TswInterface).vlan_id === (props.interfaceConfig as unknown as TswInterface).vlan_id
        : (iface as unknown as Interface).device === (props.interfaceConfig as unknown as Interface).device) &&
      iface.enabled === '1' &&
      iface.proto === 'static' &&
      iface.ipaddr &&
      ipv4Utils.checkIfInRange(iface.ipaddr, props.dhcpConfig.start_ip, props.dhcpConfig.end_ip, true)
  )
)
/** Static leases that are in dhcp range */
const fromConfigsInsidePool = computed(() => props.leaseConfigs.filter(e => e.ip && ipv4Utils.checkIfInRange(e.ip, props.dhcpConfig.start_ip, props.dhcpConfig.end_ip, true)))
/** Static leases that are not in dhcp range but in the same subnet */
const fromConfigOutsidePool = computed(() =>
  props.leaseConfigs.filter(
    e =>
      e.ip &&
      props.interfaceConfig.ipaddr &&
      props.interfaceConfig.netmask &&
      !ipv4Utils.checkIfInRange(e.ip, props.dhcpConfig.start_ip, props.dhcpConfig.end_ip, true) &&
      ipv4Utils.checkIfInRange(e.ip, ...ipv4Utils.getIPRange(props.interfaceConfig.ipaddr, props.interfaceConfig.netmask), true)
  )
)
/** All static leases in the same subnet */
const fromConfigs = computed(() => fromConfigsInsidePool.value.concat(fromConfigOutsidePool.value))
/** Dinamic leases that are in this dhcp range */
const fromStatus = computed(() => props.leaseStatus.filter(e => e.ipaddr && ipv4Utils.checkIfInRange(e.ipaddr, props.dhcpConfig.start_ip, props.dhcpConfig.end_ip, true)))
/** Static leases that are leased so they are in both places. But they need to be counted only once. */
const overlap = computed(() => fromConfigsInsidePool.value.filter(config => fromStatus.value.some(status => status.ipaddr === config.ip)).length)
const used = computed(() => fromConfigs.value.length + fromStatus.value.length - overlap.value + fromStaticInterfaces.value.length)
const total = computed(() => ipv4Utils.compare(props.dhcpConfig.end_ip, props.dhcpConfig.start_ip) + 1 + fromConfigOutsidePool.value.length - excluded.value)
const left = computed(() => total.value - used.value)

// https://mskb.pkisolutions.com/kb/281579
// https://thekelleys.org.uk/dnsmasq/CHANGELOG#:~:text=Don't%20dynamically%20allocate%20DHCP%20addresses%20which%20may%20break
const excluded = computed(() => {
  if (!props.interfaceConfig.netmask) return 0
  // Even though they are not normally leased, they still can be static leases
  const excludedStaticLeases = fromConfigsInsidePool.value.filter(e => {
    const subnet24posfix = e.ip?.split('.')[3]
    return subnet24posfix === '0' || subnet24posfix === '255'
  })
  let extraFromSides = 0
  if (props.dhcpConfig.start_ip.split('.')[3] === '0') extraFromSides++
  if (props.dhcpConfig.end_ip.split('.')[3] === '255') extraFromSides++

  const subnet24Count = (ipv4Utils.ip2int(props.dhcpConfig.end_ip) >>> 8) - (ipv4Utils.ip2int(props.dhcpConfig.start_ip) >>> 8)
  return extraFromSides + subnet24Count * 2 - excludedStaticLeases.length
})

const state = computed(() => {
  if (used.value >= total.value) return 'error'
  if (left.value <= Math.max(10, total.value * 0.1)) return 'warning'
  return 'info'
})

const hintTitles = {
  error: $t('DHCP server has run out of IPs to lease'),
  warning: $t('DHCP server is running out of IPs to lease'),
  info: ''
} as const
const hintTitle = computed(() => hintTitles[state.value])

const hintTexts = {
  error: $t('New dynamic lease requests will be ignored. Renewal and static lease requests will work as usual.'),
  warning: $t('Only %s IPs are left to lease.'),
  info: ''
} as const

const hintText = computed(() => hintTexts[state.value].format(left.value))

const status = computed<Status>(() => ({
  status: `${used.value}/${total.value}`,
  type: state.value,
  helpTitle: hintTitle.value
}))
</script>
