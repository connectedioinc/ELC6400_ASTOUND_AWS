<template>
  <basic-status :status="primaryStatus">
    <template
      v-if="primaryStatus.help"
      #help
    >
      <div class="flex flex-col gap-2">
        <string-with-links :text="primaryStatus.help" />
        <template
          v-for="otherStatus in secondaryStatus"
          :key="otherStatus.status"
        >
          <div class="font-bold">{{ otherStatus.helpTitle }}:</div>
          <string-with-links :text="otherStatus.help" />
        </template>
      </div>
    </template>
  </basic-status>
</template>

<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { computed } from 'vue'
import type { InterfaceStatus } from '@/types/networkTypes'
import { mobile } from '@/plugins/mobile'
import type { WifiInterface } from '@/types/wirelessTypes'
import { isArray } from '@ui-core/utils/inspect'
import StringWithLinks, { formatLink } from '@/components/shared/StringWithLinks.vue'
import type { StatusObject } from './BasicStatus.vue'
import BasicStatus from './BasicStatus.vue'
import type { DeviceStatus } from '@/types/networkDeviceTypes'

const $t = useTranslate()

export interface Props {
  status: InterfaceStatus | undefined
  modemList: any[]
  dataLimit: any[]
  simcards: any[]
  wirelessNetworks: WifiInterface[]
  deviceStatus: DeviceStatus[]
}

const props = defineProps<Props>()

const statusOrder = ['error', 'warning', undefined]
const sortedStatus = computed(() => (isArray(parsedStatus.value) ? [...parsedStatus.value].sort((a, b) => statusOrder.indexOf(a.type) - statusOrder.indexOf(b.type)) : [parsedStatus.value]))

const primaryStatus = computed(() => sortedStatus.value[0])

const secondaryStatus = computed(() => sortedStatus.value.slice(1).filter(e => e.helpTitle && e.help))

const excludeErrors = ['WRONG_SIM', 'WRONG_ESIM', 'USER_REQUEST']
const parsedStatus = computed<StatusObject[] | StatusObject>(() => {
  const status = props.status
  if (!status) return statuses.default
  if (!status.enabled) return status.is_up ? statuses.stopping : statuses.disabled

  const errors: { code: string }[] = []
  if (status.errors) errors.push(...status.errors.filter(error => !excludeErrors.includes(error.code)))
  const parsedErrors = errors.map(error => {
    if (pppoeErrors[error.code] && status.proto === 'pppoe') {
      const parsedError = pppoeErrors[error.code]
      return typeof parsedError === 'object' ? parsedError : $t('Unexpected PPPoE error: %s (code: %s)').format(error.code, parsedError)
    }
    if (error.code === 'NO_DEVICE') {
      return props.wirelessNetworks.find(e => e.network === status.name) ? statuses.disconnectedWireless : statuses.noDevice
    }
    return errorTranslations[error.code] || error.code
  })
  if (parsedErrors.length) return parsedErrors.map(e => (typeof e === 'string' ? { ...statuses.error, help: e } : e))

  if (status.network_type === 'mobile') {
    const warnings: { code: string }[] = []
    const modem = props.modemList.find(modem => modem.id === status.modem_id && modem.active_sim === Number(status.sim))
    const operatorState = modem?.operator_state
    const denyRoaming = props.simcards.find(sim => sim.modem === status.modem_id && sim.position === status.sim)?.deny_roaming
    if (denyRoaming === '1' && operatorState?.toLowerCase() === 'roaming') warnings.push({ code: 'roamingactive' })
    if (props.dataLimit.some(limit => status.id === limit.id && status.up && limit.data_used >= limit.data_limit)) warnings.push({ code: 'datalimit' })
    if (mobile.getGnssState(modem)) warnings.push({ code: 'gnssState' })
    if (status.bringup) warnings.push({ code: 'mobileoff' })

    if (warnings.length) return warnings.map(warning => ({ ...statuses.warningMobile, help: warningTranslations[warning.code] || warning.code }))
  }

  if (status.is_up) return statuses.up
  if (status.pending) {
    if (status.proto === 'pppoe') return statuses.connectingPPPoe
    if (status.proto === 'dhcp') return statuses.obtainingIPv4
    if (status.proto === 'dhcpv6') return statuses.obtainingIPv6
    // mobile proto can also have pending state but it needs more reserch to be added
    // as for now falling to next state i.e., interface innactive is good enough
  }
  const interfaceDevice = props.deviceStatus.find(dev => dev.name === status.device)
  if (interfaceDevice?.up && interfaceDevice?.carrier) return statuses.starting
  return status.network_type === 'mobile' ? statuses.disconnectedMobile : status.network_type === 'wireless' ? statuses.disconnectedWireless : statuses.disconnectedEth
})

const statuses = {
  up: {
    status: $t('Running'),
    type: 'success'
  },
  disconnectedMobile: {
    status: $t('Inactive'),
    helpTitle: $t('%s interface is inactive').format($t('Mobile')),
    help: $t('Check %s page for more details.').format(formatLink('/status/network/mobile', $t('Mobile status')))
  },
  warningMobile: {
    status: $t('Inactive'),
    helpTitle: $t('%s interface is inactive').format($t('Mobile')),
    type: 'warning'
  },
  disconnectedEth: {
    status: $t('Inactive'),
    helpTitle: $t('Network device is down'),
    help: $t('Interface is starting or ethernet cable is not detected as plugged in. Check if port LEDs are lit.')
  },
  disconnectedWireless: {
    status: $t('Inactive'),
    helpTitle: $t('%s interface is inactive').format($t('Wireless')),
    help: $t('Check %s page for more details.').format(formatLink('/network/wireless/ssids'))
  },
  obtainingIPv4: {
    status: $t('Obtaining IP'),
    helpTitle: $t('Trying to find %s server').format('DHCPv4'),
    help: $t("If this is seen for a long time check this device's and %s server logs.").format('DHCPv4'),
    type: 'warning'
  },
  obtainingIPv6: {
    status: $t('Obtaining IP'),
    helpTitle: $t('Trying to find %s server').format('DHCPv6'),
    help: $t("If this is seen for a long time check this device's and %s server logs.").format('DHCPv6'),
    type: 'warning'
  },
  connectingPPPoe: {
    status: $t('Connecting'),
    helpTitle: $t('Trying to find server'),
    help: $t('If this is seen for a long time check system logs.'),
    type: 'warning'
  },
  noDevice: {
    status: $t('No device assigned'),
    helpTitle: $t('Network device is not present'),
    help: $t('Either assign the device or this interface to the wireless network.'),
    type: 'error'
  },
  starting: {
    status: $t('Starting'),
    helpTitle: $t('Interface is starting'),
    help: $t('If this is seen for a long time check system logs.'),
    type: 'warning'
  },
  stopping: {
    status: $t('Disabling'),
    helpTitle: $t('Interface is being disabled'),
    help: $t('If this is seen for a long time check system logs.'),
    type: 'warning'
  },
  error: {
    status: $t('Error'),
    helpTitle: $t('Error'),
    type: 'error'
  },
  disabled: {
    status: $t('Disabled')
  },
  default: {
    status: '-'
  }
} as const satisfies Record<string, StatusObject>

const errorTranslations: Record<string, string> = {
  INVALID_ADDRESS: $t('IP address is invalid'),
  INVALID_NETMASK: $t('Netmask address is invalid'),
  INVALID_GATEWAY: $t('Gateway address is invalid'),
  INVALID_LOCAL_ADDRESS: $t('Local IP address is invalid'),
  MISSING_ADDRESS: $t('IP address is missing'),
  MISSING_PEER_ADDRESS: $t('Peer address is missing'),
  NO_DEVICE: $t('Network device is not present'),
  NO_IFACE: $t('Unable to determine device name'),
  NO_IFNAME: $t('Unable to determine device name'),
  NO_WAN_ADDRESS: $t('Unable to determine external IP address'),
  NO_WAN_LINK: $t('Unable to determine upstream interface'),
  NO_WWAN_DEVICE: $t('Wireless device is not present'),
  PEER_RESOLVE_FAIL: $t('Unable to resolve peer host name'),
  PIN_FAILED: $t('PIN code rejected'),
  NO_NETWORK: $t('No network'),
  'QMI call error, reason type CM: "Offline"\n"Call failed"': $t('QMI call error, reason type CM: "Offline" "Call failed"'),
  'QMI call error, reason type INTERNAL: "PDN IPv4 call disallowed"\n"Call failed"': $t('QMI call error, reason type INTERNAL: "PDN IPv4 call disallowed" "Call failed"'),
  'QMI call error, reason type INTERNAL: "PDN IPv6 call disallowed"\n"Call failed"': $t('QMI call error, reason type INTERNAL: "PDN IPv6 call disallowed" "Call failed"')
}

const warningTranslations: Record<string, string> = {
  mobileoff: $t('Mobile data is turned off by an external application'),
  roamingactive: $t('Mobile data is not allowed when roaming'),
  datalimit: $t('Mobile data limit reached'),
  gnssState: $t('Mobile data is not working because the GPS is on')
}

// These are only common errors. number means error code and that it is unusual error
// Full errors except 20 and 21 can be faund here: https://man.archlinux.org/man/pppd.8.en#EXIT_STATUS
// code to string mapping: https://git.teltonika.lt/teltonika/rutx_open/-/blame/develop/package/network/services/ppp/files/ppp.sh#L41
const pppoeErrors: Record<string, number | string | StatusObject> = {
  // OK: 0,
  FATAL_ERROR: 1,
  OPTION_ERROR: 2,
  NOT_ROOT: 3,
  NO_KERNEL_SUPPORT: 4,
  USER_REQUEST: 5,
  LOCK_FAILED: 6,
  OPEN_FAILED: 7,
  CONNECT_FAILED: {
    status: $t('Failed to find server'),
    helpTitle: $t('Failed to find server'),
    help: $t('If set, verify the "Service name" and "Access concentrator name" fields. Then, check the PPPoE server config and logs for any issues.'),
    type: 'error'
  },
  PTYCMD_FAILED: 9,
  NEGOTIATION_FAILED: {
    status: $t('Connection Failed'),
    helpTitle: $t('Server found but connection failed'),
    help: $t('This may occur if a username and password were required by the PPPoE server but were not provided, or if the PPPoE server or client is misconfigured.'),
    type: 'error'
  },
  PEER_AUTH_FAILED: 11,
  IDLE_TIMEOUT: 12,
  CONNECT_TIME: 13,
  CALLBACK: 14,
  PEER_DEAD: 15,
  HANGUP: 16,
  LOOPBACK: 17,
  INIT_FAILED: 18,
  AUTH_TOPEER_FAILED: {
    status: $t('Authentication failed'),
    helpTitle: $t('Authentication failed'),
    help: $t('Check username and password.'),
    type: 'error'
  },
  TRAFFIC_LIMIT: 20,
  CNID_AUTH_FAILED: 21
}
</script>
