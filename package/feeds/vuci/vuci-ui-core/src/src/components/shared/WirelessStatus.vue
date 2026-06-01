<template>
  <basic-status :status="parsedStatus">
    <template
      v-if="parsedStatus.help || parsedStatus.error"
      #help
    >
      <div class="flex flex-col gap-2">
        <template v-if="parsedStatus.help">
          {{ parsedStatus.help }}
          <tlt-button
            v-if="parsedStatus.button"
            button-id="action-button"
            :loading="parsedStatus.button.condition"
            :disabled="parsedStatus.button.condition || parsedStatus.button.disabled"
            @click="parsedStatus.button.action"
          >
            {{ parsedStatus.button.text }}
          </tlt-button>
        </template>
        <div
          v-if="parsedStatus.error"
          class="flex flex-col gap-1"
        >
          <h3
            v-if="parsedStatus.error.title"
            class="font-bold mb-1"
          >
            {{ parsedStatus.error?.title }}
          </h3>
          <div v-if="parsedStatus.error.explanation">{{ parsedStatus.error.explanation }}</div>
          <div>
            {{ parsedStatus.error.type }}
            {{ parsedStatus.error.code }}:
            {{ parsedStatus.error.name }}
            <template v-if="parsedStatus.error.isLocal">({{ $t('Local') }})</template>
          </div>
        </div>
      </div>
    </template>
  </basic-status>
</template>

<script lang="ts" setup>
import { useMainStore } from '@/stores/main'
import { useMessages } from '@/stores/messages'
import type { WifiInterface, WifiInterfaceStatus } from '@/types/wirelessTypes'
import { useTranslate } from '@ui-core/composables/useI18n'
import { computed } from 'vue'
import { session } from '@ui-core/plugins/session'
import { axios } from '@ui-core/plugins/axios'
import type { InterfaceStatus } from '@/types/networkTypes'
import BasicStatus, { type StatusObject } from './BasicStatus.vue'

export interface ErrorHint {
  title: string
  code: number
  name: string
  explanation: string
  prettyName: string
  isLocal: boolean
  type: string
}
export interface Hint extends StatusObject {
  error?: ErrorHint
  button?: { text: string; condition: boolean; action: () => void; disabled: boolean }
}

export interface Props {
  status?: Partial<WifiInterfaceStatus>
  config: WifiInterface
  networkStatus: Partial<InterfaceStatus> | undefined
}

const props = withDefaults(defineProps<Props>(), { status: undefined })

const $t = useTranslate()
const message = useMessages()
const store = useMainStore()

const scanNoFails = $t(
  'If this is seen for a long time it means that the specified access point was not found. Perform a scan to check if it exists, and if it does verify that BSSID and encryption type are correct.'
)
const scanWithFails = $t(
  'An access point was found but connection or authentication failed. The client will try to establish the connection again. If this occurs during authentication first check the password.'
)
const noErrorHint: Array<WifiInterfaceStatus['wpa_state'] & string> = ['COMPLETED', 'INTERFACE_DISABLED', 'INACTIVE']

const parsedStatus = computed<Hint>(() => {
  const status = props.status
  if (!status || !status.mode || Object.keys(status).length === 0) return activityStatuses.default
  if (status.devices && !status.devices.some(dev => dev.up)) return activityStatuses.devDisabled
  if (status.status === '0') return activityStatuses.disabled
  if (!['sta', 'multi_ap'].includes(status.mode)) {
    const dfsCacActive = status.devices?.find(dev => dev.dfs?.cac_active)
    if (dfsCacActive) {
      const status = dfsCacActive.dfs!.cac_seconds_left !== undefined ? `DFS CAC (${$t('%ss left').format(Math.max(0, dfsCacActive.dfs!.cac_seconds_left || 0))})` : 'DFS CAC'
      return { ...activityStatuses.dfsCac, status }
    } else if (status.up) return activityStatuses.running
    return activityStatuses.starting
  }
  // Client errors
  if (!status.up) return activityStatuses.starting
  if (status.wpa_state === undefined) return { ...activityStatuses.starting, hintTitle: $t('Interface is running but WPA supplicant has not yet started') }
  if (status.wpa_state === 'COMPLETED' && ['dhcp', 'dhcpv6'].includes(props.networkStatus?.proto ?? '') && props.networkStatus?.pending) return activityStatuses.obtainingIP
  if (noErrorHint.includes(status.wpa_state)) return wpaStates[status.wpa_state]

  let errorHint: ErrorHint | undefined
  if (status.disconnect_reason) {
    const error = parseDeauthReason(status.disconnect_reason)
    // if error has pretty name then show it as full blown error otherwise it is "behind the scenes" error
    if (error.prettyName) return { ...activityStatuses.error, error }
    errorHint = {
      ...error
    }
  } else if (status.auth_status) {
    return { ...activityStatuses.error, error: parseAuthError(status.auth_status) }
  }
  if (['SCANNING', 'DISCONNECTED'].includes(status.wpa_state)) {
    const help = status.disconnect_reason ? scanWithFails : scanNoFails
    const state = wpaStates[status.wpa_state]
    if (props.config?.auto_reconnect === '0' && status.wpa_state === 'DISCONNECTED') {
      return {
        ...activityStatuses.reconnectRequired,
        error: errorHint,
        button: { text: $t('Reconnect'), action: staReconnect, condition: !status.up, disabled: !session.hasAccess('network/wireless/ssids', 'write') }
      }
    }
    return { ...state, error: errorHint, help }
  }
  return wpaStates.other
})
const activityStatuses: Record<string, Hint> = {
  running: {
    status: $t('Running'),
    type: 'success'
  },
  starting: {
    status: $t('Starting'),
    type: 'warning',
    help: $t('If this is seen for a long time check system logs for wireless errors.'),
    helpTitle: $t('The wireless interface is not running yet')
  },
  devDisabled: {
    status: $t('Radio disabled')
  },
  error: {
    status: $t('Error'),
    type: 'error'
  },
  disabled: {
    status: $t('Disabled')
  },
  dfsCac: {
    status: 'DFS CAC',
    type: 'warning',
    help: $t('The wireless interface is waiting for the DFS channel availability check (CAC) to finish.'),
    helpTitle: $t('DFS scan (CAC) in progress')
  },
  obtainingIP: {
    status: $t('Obtaining IP'),
    type: 'warning',
    help: $t("If this is seen for a long time check this device's and %s server logs.").format('DHCP'),
    helpTitle: $t('Trying to find %s server').format('DHCP')
  },
  reconnectRequired: {
    status: $t('Reconnect required'),
    type: 'warning',
    help: $t('Auto-reconnect is disabled for this interface, requiring manual connection establishment.'),
    helpTitle: $t('Manual reconnection to the access point is required')
  },
  default: {
    status: '-'
  }
}
const wpaStates: Record<string, Hint> = {
  COMPLETED: {
    status: $t('Connected'),
    type: 'success'
  },
  // never saw INTERFACE_DISABLED, INACTIVE but still adding for full state support
  INTERFACE_DISABLED: {
    status: $t('Network disabled')
  },
  INACTIVE: {
    status: $t('Network disabled')
  },
  DISCONNECTED: {
    status: $t('Idle'),
    type: 'warning',
    helpTitle: $t('Currently not looking for the access point')
  },
  SCANNING: {
    status: $t('Scanning'),
    type: 'warning',
    helpTitle: $t('Trying to find the access point')
  },
  other: {
    status: $t('Connecting'),
    type: 'warning',
    help: $t('The station was found and authentication is in progress.'),
    helpTitle: $t('Connecting')
  }
}

function parseDeauthReason(code: number): ErrorHint {
  // locally generated error numbers get minus
  const normCode = Math.abs(code)
  // raw error code from https://git.teltonika.lt/teltonika/opensource/hostapd/-/blob/main/src/common/ieee802_11_defs.h?ref_type=heads#L225
  return {
    code: normCode,
    explanation: reasonExplanations[code],
    prettyName: reasonPrettyNames[normCode],
    name: reasonName[normCode],
    isLocal: code < 0,
    type: $t('Reason code'),
    title: [15, 23].includes(code) ? $t('Authentication failed') : $t('Last disconnection reason')
  }
}
/** Parses wireless error code to error name or full explanation */
const reasonName: Record<number, string> = {
  1: 'UNSPECIFIED',
  2: 'PREV_AUTH_NOT_VALID',
  3: 'DEAUTH_LEAVING',
  4: 'DISASSOC_DUE_TO_INACTIVITY', // DISASSOC_DUE_TO_INACTIVITY
  5: 'DISASSOC_AP_BUSY',
  6: 'CLASS2_FRAME_FROM_NONAUTH_STA',
  7: 'CLASS3_FRAME_FROM_NONASSOC_STA',
  8: 'DISASSOC_STA_HAS_LEFT',
  9: 'STA_REQ_ASSOC_WITHOUT_AUTH',
  // 802.11h
  10: 'DISASSOC_BAD_POWER',
  11: 'DISASSOC_BAD_SUPP_CHAN',
  // 802.11i
  13: 'INVALID_IE',
  14: 'MIC_FAILURE',
  15: '4WAY_HANDSHAKE_TIMEOUT',
  16: 'GROUP_KEY_HANDSHAKE_TIMEOUT',
  17: 'IE_DIFFERENT',
  18: 'INVALID_GROUP_CIPHER',
  19: 'INVALID_PAIRWISE_CIPHER',
  20: 'INVALID_AKMP',
  21: 'UNSUPP_RSN_VERSION',
  22: 'INVALID_RSN_IE_CAP',
  23: 'IEEE8021X_FAILED',
  24: 'CIPHER_SUITE_REJECTED',
  // TDLS (802.11z)
  25: 'TDLS_TEARDOWN_UNREACHABLE',
  26: 'TDLS_TEARDOWN_UNSPECIFIED',
  // 802.11e
  32: 'DISASSOC_UNSPECIFIED_QOS',
  33: 'DISASSOC_QAP_NO_BANDWIDTH',
  34: 'DISASSOC_LOW_ACK',
  35: 'DISASSOC_QAP_EXCEED_TXOP',
  36: 'QSTA_LEAVE_QBSS',
  37: 'QSTA_NOT_USE',
  38: 'QSTA_REQUIRE_SETUP',
  39: 'QSTA_TIMEOUT',
  45: 'QSTA_CIPHER_NOT_SUPP',
  /* 802.11s */
  52: 'MESH_PEER_CANCELED',
  53: 'MESH_MAX_PEERS',
  54: 'MESH_CONFIG',
  55: 'MESH_CLOSE',
  56: 'MESH_MAX_RETRIES',
  57: 'MESH_CONFIRM_TIMEOUT',
  58: 'MESH_INVALID_GTK',
  59: 'MESH_INCONSISTENT_PARAM',
  60: 'MESH_INVALID_SECURITY',
  61: 'MESH_PATH_ERROR',
  62: 'MESH_PATH_NOFORWARD',
  63: 'MESH_PATH_DEST_UNREACHABLE',
  64: 'MAC_EXISTS_IN_MBSS',
  65: 'MESH_CHAN_REGULATORY',
  66: 'MESH_CHAN'
}
const reasonExplanations: Record<number, string> = {
  '-4': $t('Most likely disconnected because the signal was lost.'),
  15: $t('Check password.'),
  23: $t('Check enterprise authentication settings.')
}

const reasonPrettyNames: Record<number, string> = {
  15: $t('Bad password'),
  23: $t('Bad credentials')
}

/**
 * Parses auth error generated by wpa3-sae
 * @param code - wpa_state
 */
function parseAuthError(code: number): ErrorHint {
  // raw error code from https://git.teltonika.lt/teltonika/opensource/hostapd/-/blob/main/src/common/ieee802_11_defs.h?ref_type=heads#L110
  return {
    code,
    explanation: errorExplanations[code],
    prettyName: errorPrettyNames[code] ?? $t('Auth failed'),
    name: errorNames[code],
    isLocal: false,
    type: $t('Status code'),
    title: $t('Authentication failed')
  }
}
const errorNames: Record<number, string> = {
  1: 'UNSPECIFIED_FAILURE',
  13: 'NOT_SUPPORTED_AUTH_ALG',
  14: 'UNKNOWN_AUTH_TRANSACTION',
  15: 'CHALLENGE_FAIL'
}

const errorExplanations: Record<number, string> = {
  1: $t('The exact reason is not specified by the access point. First, check the password.'),
  15: $t('Check password.')
}

const errorPrettyNames: Record<number, string> = {
  15: $t('Bad password')
}

function staReconnect() {
  store.spin()
  return axios
    .post('/api/wireless/actions/reconnect', { data: { sta_id: props.config.id } })
    .then(res => {
      if (res.success) message.success($t('Reconnecting to the access point'))
    })
    .catch(() => {
      message.error($t('Failed to reconnect to the access point'))
    })
    .finally(() => {
      store.spin(false)
    })
}
</script>
