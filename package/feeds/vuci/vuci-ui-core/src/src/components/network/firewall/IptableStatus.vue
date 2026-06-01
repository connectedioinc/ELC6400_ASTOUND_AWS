<template>
  <div class="flex flex-wrap gap-2">
    <basic-status
      :status="status"
      class="max-w-max"
    >
      <template
        v-if="statuses?.length && statuses.length > 1 && type === 'counter'"
        #help
      >
        <div class="flex flex-col gap-2">
          <div
            v-if="differentValues.length > 0"
            class="flex flex-col gap-y-2 gap-x-1 max-h-[300px] overflow-x-scroll"
          >
            <div
              v-for="differentValue in differentValues"
              :key="differentValue.key"
            >
              <div class="font-semibold">{{ translate(differentValue.key)?.[0] }}</div>
              <div class="flex flex-col gap-x-1">
                <div
                  v-for="value in differentValue.values"
                  :key="value[0]"
                >
                  <span class="wrap-anywhere">{{ translate(differentValue.key, value[0])?.[1] }}</span> <span class="whitespace-nowrap">- {{ displayCounter(value[1], false) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </basic-status>
    <div class="flex gap-2 flex-wrap">
      <tlt-hint
        v-if="firstIpv4 && type === 'state'"
        :hints="[{ info: $t('Open rule in %s firewall status page.').format('IPv4') }]"
      >
        <LinkToPage
          :path="parseStatusLink(firstIpv4)"
          :custom-name="noPageName ? '' : 'IPv4'"
        />
      </tlt-hint>
      <tlt-hint
        v-if="firstIpv6 && type === 'state'"
        :hints="[{ info: $t('Open rule in %s firewall status page.').format('IPv6') }]"
      >
        <LinkToPage
          :path="parseStatusLink(firstIpv6)"
          :custom-name="noPageName ? '' : 'IPv6'"
        />
      </tlt-hint>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IptablesRule, Table } from '@/types/iptablesTypes'
import BasicStatus, { type Status } from '@/components/shared/BasicStatus.vue'
import { computed } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import LinkToPage from '@/components/shared/LinkToPage.vue'
import { useFirewallCommon } from './firewallCommon'
import { useIptableStatusCommon, type ParsedIptablesRule } from './IptableStatusCommon'
import { formatLink } from '@/components/shared/StringWithLinks.vue'
import { network } from '@/plugins/network'

export interface Props {
  hints?: { ipv4_hints?: [string, string][]; mac_hints?: [string, string][]; ipv6_hints?: [string, string][] }
  statuses: ParsedIptablesRule[] | undefined
  enabled: '1' | '0'
  reverseDirection?: boolean
  noPageName?: boolean
  type: 'state' | 'counter'
}

const props = defineProps<Props>()
const $t = useTranslate()
const { translateIcmp } = useFirewallCommon()
const { reduceUsage } = useIptableStatusCommon()

function displayCounter(counter: { bytes: number; pkts: number }, overview: boolean) {
  if ((['mangle', 'raw'] as Table[]).includes(props.statuses?.[0]?.table ?? 'filter')) return $t('%MB (%m pkts.)').format(counter.bytes, counter.pkts)
  return (overview ? $t('%m packets') : $t('%m pkts.')).format(counter.pkts)
}

const firstIpv4 = computed(() => props.statuses?.find(e => e.ipv === 'ipv4'))
const firstIpv6 = computed(() => props.statuses?.find(e => e.ipv === 'ipv6'))

const destTranslation = computed(() => (props.reverseDirection ? $t('Source') : $t('Destination')))
const sourceTranslation = computed(() => (props.reverseDirection ? $t('Destination') : $t('Source')))

const translations = computed<Record<string, string | ((value?: string) => string | [string, string] | [string] | [string, undefined])>>(() => {
  const portTranslation = Object.fromEntries(network.getPortOptions())
  const macTranslation = props.hints?.mac_hints ? Object.fromEntries(network.getMacOptions(props.hints.mac_hints)) : {}
  const ipTranslation = Object.fromEntries(network.getIpOptions([...(props.hints?.ipv4_hints ?? []), ...(props.hints?.ipv6_hints ?? [])]))
  return {
    table: $t('Table'),
    chain: $t('Chain'),
    prot: (value?: string) => [$t('Protocol'), value?.toUpperCase()],
    in: $t('Inbound device'),
    out: $t('Outbound device'),
    source: value => stdTranslate(sourceTranslation.value, ipTranslation)(simplifySubnet(value)),
    destination: value => stdTranslate(destTranslation.value, ipTranslation)(simplifySubnet(value)),
    ipv: stdTranslate('IPv', { ipv4: 'IPv4', ipv6: 'IPv6' }),
    // Option translation:
    helper: $t('Helper'),
    // https://linux.die.net/man/8/iptables#:~:text=iptables%20can%20use%20extended
    // seems like -m can be auto or set. Mb show only when differs from proto
    '--icmpv6-type': value => [$t('ICMPv6 type'), translateIcmp(value, 'ipv6')],
    '--icmp-type': value => [$t('ICMPv4 type'), translateIcmp(value, 'ipv4')],
    '--sport': stdTranslate($t('%s port').format(sourceTranslation.value), portTranslation),
    '--dport': stdTranslate($t('%s port').format(destTranslation.value), portTranslation),
    '--mac-source': value => stdTranslate($t('%s mac').format(sourceTranslation.value), macTranslation)(value?.toUpperCase()),
    '--mac-dest': value => stdTranslate($t('%s mac').format(destTranslation.value), macTranslation)(value?.toUpperCase())
  }
})

function translate(key: string, value?: string) {
  const translation = translations.value[key]
  if (typeof translation === 'function') return translation(value)
  return [translation ?? key.replace(/^-+/, ''), value]
}

function stdTranslate(keyTranslation: string, valueTranslations?: Record<string, string>) {
  return (value?: string) => {
    if (!value) return [keyTranslation] satisfies [string]
    const translatedValue = valueTranslations?.[value] ?? value
    return [keyTranslation, translatedValue] satisfies [string, string]
  }
}

function simplifySubnet(subnet?: string) {
  if (!subnet) return
  const [ip, mask] = subnet.split('/')
  return mask === (ip.includes('.') ? '32' : '128') ? ip : subnet
}

const keys = ['ipv', 'table', 'chain', 'prot', 'in', 'out', 'source', 'destination'] as const satisfies (keyof ParsedIptablesRule)[]
// Hard to list all. Only needed if seperate ipv4 and ipv6 keys excists.
const skipUndefinedValuesFromKeys = ['--icmp-type', '--icmpv6-type']
// skip user unfriendly option keys
const skipOptionKeys = [
  // In our firewall '-m' always dublicates with rule protocol
  '-m'
]
// Mapping is needed when ipv4 and ipv6 has different matchers even though they are 1:1 representation
const normalizationMapping: Record<string, Record<string, string>> = {
  prot: {
    'ipv6-icmp': 'icmp'
  }
}
function normalizeValue(original: string | number, key: string): string {
  const normalized = normalizationMapping[key]?.[original]
  return normalized ?? original
}

/** Keys with different values between rules */
const differentKeys = computed(() => {
  // Single value per key as we only need to find if any of them are different
  const existingValues: Record<string, string> = {}
  const res: string[] = []
  if (!props.statuses) return []
  for (const ruleStatus of props.statuses) {
    for (const statusKey of keys) {
      const statusValue = normalizeValue(ruleStatus[statusKey], statusKey)
      if (!existingValues[statusKey]) existingValues[statusKey] = statusValue
      else if (existingValues[statusKey] !== statusValue && !res.includes(statusKey)) res.push(statusKey)
    }
    const options = parseOptions(ruleStatus.options)
    for (const optionKey in options) {
      if (skipOptionKeys.includes(optionKey)) continue
      const optionValue = normalizeValue(options[optionKey], optionKey)
      if (!existingValues[optionKey]) existingValues[optionKey] = optionValue
      else if (existingValues[optionKey] !== optionValue && !res.includes(optionKey)) res.push(optionKey)
    }
  }

  return res.sort((a, b) => (keys.includes(a as any) ? keys.indexOf(a as any) : Infinity) - (keys.includes(b as any) ? keys.indexOf(b as any) : Infinity))
})

/** Different values between rules for the same key */
const differentValues = computed(() => {
  return differentKeys.value.map(key => {
    if (!props.statuses)
      return {
        key,
        values: []
      }
    const values = Object.entries(
      props.statuses.reduce<Record<string, IptablesRule[]>>((acc, curr) => {
        const otherOptions = parseOptions(curr.options)
        const value = curr[key as keyof ParsedIptablesRule] ?? otherOptions[key] ?? (skipUndefinedValuesFromKeys.includes(key) ? undefined : $t('not set'))
        if (!value) return acc
        const normalizedValue = normalizeValue(value, key)
        if (acc[normalizedValue]) acc[normalizedValue].push(curr)
        else acc[normalizedValue] = [curr]
        return acc
      }, {})
    )
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
      .map(e => [e[0], reduceUsage(e[1])] as const)

    return {
      key,
      values
    }
  })
})

function parseOptions(options: ParsedIptablesRule['options']) {
  // iptables does not seem to use standart CLI params so there is some weirdness:
  // - multiple flags can exists and position is revelant. This is incorrectly handeled thus do not use -m flag
  // In teory this can effect other flags if there are dependant on trailing -m;
  // - multi word params can be unquated. Both quated (if --comment ever leaks it will not break parsing) and unquated are handeled correctly.
  const splotOptions = [...(options.matchAll(/(-+\S+)(?: "([^"]*)"| ([^-]*[^-\s]))?/g) ?? [])]
  return Object.fromEntries(splotOptions.map(e => [e[1], e[2] ?? e[3] ?? $t('set')]))
}

function parseStatusLink(rule: ParsedIptablesRule) {
  return `/status/network/firewall/${rule.ipv}#table=${rule.table}&chain=${rule.chain}&rule=${rule.index}` as const
}

const status = computed<Status>(() => {
  if (props.type === 'counter') {
    if (!props.statuses?.length) return '-'
    const sum = reduceUsage(props.statuses)
    return { helpTitle: props.statuses.length > 1 ? $t('Counters by match type') : undefined, status: displayCounter(sum, true) }
  }
  if (!props.statuses) return '-'
  const warningHelp = $t('If this is seen for a long time this rule encountered an error (%s "fw3 restart" might return more information).').format(
    formatLink('/system/maintenance/cli', $t('CLI command'))
  )
  if (props.enabled === '0') {
    if (props.statuses.length === 0) return $t('Disabled')
    return {
      type: 'warning',
      status: $t('Disabling'),
      helpTitle: $t('Rule is not disabled yet'),
      help: warningHelp
    }
  }
  if (props.statuses.length === 0)
    return {
      type: 'warning',
      status: $t('Starting'),
      helpTitle: $t('Rule is not created yet'),
      help: warningHelp
    }
  return { status: $t('Active'), type: 'success' }
})
</script>
