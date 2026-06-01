import type { GenericHint, OptionHint } from '@/components/shared/HintHelper.vue'
import type { ValidationResult } from '@/validation-rules'
import { useTranslate } from '@ui-core/composables/useI18n'

export function useFirewallCommon() {
  const $t = useTranslate()

  const icmpv4Translations: Record<string, string> = {
    0: 'echo-reply',
    3: 'destination-unreachable',
    '3/0': 'network-unreachable',
    '3/1': 'host-unreachable',
    '3/2': 'protocol-unreachable',
    '3/3': 'port-unreachable',
    '3/4': 'fragmentation-needed',
    '3/5': 'source-route-failed',
    '3/6': 'network-unknown',
    '3/7': 'host-unknown',
    '3/9': 'network-prohibited',
    '3/10': 'host-prohibited',
    '3/11': 'TOS-network-unreachable',
    '3/12': 'TOS-host-unreachable',
    '3/13': 'communication-prohibited',
    '3/14': 'host-precedence-violation',
    '3/15': 'precedence-cutoff',
    4: 'source-quench',
    5: 'redirect',
    '5/0': 'network-redirect',
    '5/1': 'host-redirect',
    '5/2': 'TOS-network-redirect',
    '5/3': 'TOS-host-redirect',
    8: 'echo-request',
    9: 'router-advertisement',
    10: 'router-solicitation',
    11: 'time-exceeded',
    '11/0': 'ttl-zero-during-transit',
    '11/1': 'ttl-zero-during-reassembly',
    12: 'parameter-problem',
    '12/0': 'ip-header-bad',
    '12/1': 'required-option-missing',
    13: 'timestamp-request',
    14: 'timestamp-reply',
    17: 'address-mask-request',
    18: 'address-mask-reply'
  }

  const icmpv6Translations: Record<string, string> = {
    1: 'destination-unreachable',
    '1/0': 'no-route',
    '1/1': 'communication-prohibited',
    '1/2': 'beyond-scope',
    '1/3': 'address-unreachable',
    '1/4': 'port-unreachable',
    '1/5': 'failed-policy',
    '1/6': 'reject-route',
    2: 'packet-too-big',
    3: 'time-exceeded',
    '3/0': 'ttl-zero-during-transit',
    '3/1': 'ttl-zero-during-reassembly',
    4: 'parameter-problem',
    '4/0': 'bad-header',
    '4/1': 'unknown-header-type',
    '4/2': 'unknown-option',
    128: 'echo-request',
    129: 'echo-reply',
    '130/0': 'Multicast Listener Query (130/0)',
    '131/0': 'Multicast Listener Report (131/0)',
    '132/0': 'Multicast Listener Done (132/0)',
    133: 'router-solicitation',
    134: 'router-advertisement',
    135: 'neighbour-solicitation',
    136: 'neighbour-advertisement',
    137: 'redirect',
    '143/0': 'Version 2 Multicast Listener Report (143/0)'
  }

  function translateIcmp(value?: string, ipv?: 'ipv4' | 'ipv6') {
    if (!value) return
    const subIpv4 = icmpv4Translations[value]
    const subIpv6 = icmpv6Translations[value]
    const subTypeTranslation = ipv === 'ipv4' ? subIpv4 : ipv === 'ipv6' ? subIpv6 : (subIpv4 ?? subIpv6)
    if (subTypeTranslation) return subTypeTranslation
    const [type, subtype] = value.split('/')
    const ipv4 = icmpv4Translations[type] ?? type
    const ipv6 = icmpv6Translations[type] ?? type
    const typeTranslation = ipv === 'ipv4' ? ipv4 : ipv === 'ipv6' ? ipv6 : (ipv4 ?? ipv6)
    if (subtype) return `%s (option %s)`.format(typeTranslation, subtype)
    return typeTranslation
  }

  const actions = [
    ['REJECT', $t('Reject')],
    ['DROP', $t('Drop')],
    ['ACCEPT', $t('Accept')]
  ]
  function getActionHint(full = false) {
    const actionHints = [
      { hint: $t('packet gets to continue to the next chain.'), option: $t('ACCEPT') },
      { hint: $t('packet is stopped and deleted.'), option: $t('DROP') },
      {
        hint: $t('packet is stopped, deleted and, differently from Drop, an ICMP packet containing a message of rejection is sent to the source from which the dropped packet came.'),
        option: $t('REJECT')
      },
      {
        hint: $t('packet is marked with specified DiffServ Code Point value.'),
        option: $t('Change DSCP')
      },
      { hint: $t('packet gets excluded from connection tracking (conntrack).'), option: $t('Do not track') },
      { hint: $t('packet is marked with specified firewall mark.'), option: $t('MARK') },
      { hint: $t("packet's TTL value is adjusted based on the selected action."), option: $t('Change TTL') },
      { hint: $t("packet's MSS will be clamped to improve compatability with other networks. Only available if protocol is TCP."), option: $t('Clamp MSS') }
    ] satisfies OptionHint[]
    if (full) return actionHints
    else return actionHints.slice(0, 3)
  }

  const protoHints = [
    { hint: $t('used by most applications (e.g., web browsing, file downloads, games).'), option: 'TCP' },
    { hint: $t('used by real-time applications that can accept packet loss (e.g., voice calls, video streaming).'), option: 'UDP' },
    {
      hint: $t('used for diagnostic, control and error transfers in networks (e.g., ping).'),
      option: 'ICMP'
    },
    {
      hint: $t('Accept all protocols'),
      option: $t('All')
    },
    { name: $t('Custom protocol'), example: 'sctp' }
  ] satisfies GenericHint[]

  const families = [
    ['', $t('IPv4 and IPv6')],
    ['ipv4', $t('IPv4 only')],
    ['ipv6', $t('IPv6 only')]
  ]

  const weekdays = [
    ['Mon', $t('Monday')],
    ['Tue', $t('Tuesday')],
    ['Wed', $t('Wednesday')],
    ['Thu', $t('Thursday')],
    ['Fri', $t('Friday')],
    ['Sat', $t('Saturday')],
    ['Sun', $t('Sunday')]
  ]

  const monthdays = Array.from({ length: 31 }, (_, i) => String(++i))

  function portDepends(s: { proto?: string[] }) {
    return !!s.proto?.length && s.proto?.every(proto => ['tcp', 'udp'].includes(proto))
  }

  function checkDates(s: { start_date: string; stop_date: string }): ValidationResult {
    const startDate = Date.parse(s.start_date) || 0
    const stopDate = Date.parse(s.stop_date) || Number.MAX_VALUE
    return { isValid: startDate <= stopDate, message: $t('Start date cannot be higher than stop date.') }
  }

  const helpers = [
    ['amanda', $t('Amanda backup and archiving proto (AMANDA)')],
    ['ftp', $t('FTP passive connection tracking (FTP)')],
    ['RAS', $t('RAS proto tracking (RAS)')],
    ['Q.931', $t('Q.931 proto tracking (Q.931)')],
    ['irc', $t('IRC DCC connection tracking (IRC)')],
    ['pptp', $t('PPTP VPN connection tracking (PPTP)')],
    ['sip', $t('SIP VoIP connection tracking (SIP)')],
    ['snmp', $t('SNMP monitoring connection tracking (SNMP)')],
    ['tftp', $t('TFTP connection tracking (TFTP)')]
  ]

  return { actions, portDepends, weekdays, families, monthdays, checkDates, getActionHint, protoHints, helpers, translateIcmp }
}
