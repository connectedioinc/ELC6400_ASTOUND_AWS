import { formatLink } from '@/components/shared/StringWithLinks.vue'
import type { Nat, PortForward, Rule } from '@/types/firewallTypes'
import type { IptablesRule, IptablesTable, Table } from '@/types/iptablesTypes'
import type { JoolConfig } from '@/types/joolTypes'
import { useTranslate } from '@ui-core/composables/useI18n'
export interface ParsedIptablesRule extends IptablesRule {
  id?: string
  table: Table
  chain: string
  ipv: 'ipv4' | 'ipv6'
  index: number
}

export type FirewallConfig = { type: 'nat' | 'jool' | 'forward' | 'rule'; id: string }

export const PosfixRegex = /(.*) (\(.*\))/

export function useIptableStatusCommon() {
  const $t = useTranslate()

  function getLinkFromStatusToConfig(
    table: Table,
    ruleStatus: IptablesRule,
    rules: Rule[],
    portForwards: PortForward[],
    natRules: Nat[],
    joolConfigs: JoolConfig[],
    returnConfig: false
  ): string | undefined
  function getLinkFromStatusToConfig(
    table: Table,
    ruleStatus: IptablesRule,
    rules: Rule[],
    portForwards: PortForward[],
    natRules: Nat[],
    joolConfigs: JoolConfig[],
    returnConfig: true
  ): FirewallConfig | undefined
  function getLinkFromStatusToConfig(
    table: Table,
    ruleStatus: IptablesRule,
    rules: Rule[],
    portForwards: PortForward[],
    natRules: Nat[],
    joolConfigs: JoolConfig[],
    returnConfig: boolean
  ): FirewallConfig | string | undefined {
    const configTypes = [
      {
        filter: () => table === 'nat',
        type: 'nat' as const,
        regex: /@nat\[(\d+)\]/,
        pageLink: '/network/firewall/nat_rules' as const,
        configs: natRules,
        name: $t('Unnamed NAT rule')
      },
      {
        filter: (status: IptablesRule) => table === 'nat' || (table === 'raw' && status.target === 'CT'),
        type: 'forward' as const,
        regex: /@redirect\[(\d+)\]/,
        pageLink: '/network/firewall/forwards' as const,
        configs: portForwards,
        name: $t('Unnamed port forward rule')
      },
      {
        filter: (status: IptablesRule) => status.target === 'JOOL',
        type: 'jool' as const,
        regex: /@mangle\[(\d+)\]/,
        pageLink: '/network/jool' as const,
        configs: joolConfigs,
        name: $t('Unnamed NAT64 config')
      },
      {
        filter: () => table === 'mangle' || table === 'filter',
        type: 'rule' as const,
        regex: /@rule\[(\d+)\]/,
        pageLink: '/network/firewall/rules' as const,
        configs: rules,
        name: $t('Unnamed traffic rule')
      }
    ]

    let parsedComment = ruleStatus.comment
    let format = '%s'
    const unwrap = PosfixRegex.exec(ruleStatus.comment)
    if (unwrap) {
      format = `%s ${unwrap[2]}`
      parsedComment = unwrap[1]
    }

    for (const configType of configTypes) {
      const index = Number(configType.regex.exec(parsedComment)?.[1])
      const parsedIndex = configType.type === 'jool' ? Math.floor(index / 2) : index
      // for iptables quark - it indexes only enabled configs
      const enabledConfigs = configType.configs.filter(e => e.enabled === '1')
      const config = configType.configs.find(config => (config.name && config.name === parsedComment) || enabledConfigs.findIndex(e => e.id === config.id) === parsedIndex)
      if (!config) continue
      if (configType.filter?.(ruleStatus) === false) continue
      if (returnConfig) return { id: config.id, type: configType.type }
      return format.format(
        formatLink(
          `${configType.pageLink}?edit=${config.id}`,
          config.name || `${configType.name} #${configType.configs.indexOf(config as Rule & PortForward & Nat & JoolConfig /** Loops too hard for TS */) + 1}`
        )
      )
    }
    return undefined
  }
  function flattenIptableStatus(ipv4Status: IptablesTable[] | undefined, ipv6Status: IptablesTable[] | undefined, initialConfigs: JoolConfig[], type: 'jool'): ParsedIptablesRule[] | undefined
  function flattenIptableStatus(ipv4Status: IptablesTable[] | undefined, ipv6Status: IptablesTable[] | undefined, initialConfigs: Nat[], type: 'nat'): ParsedIptablesRule[] | undefined
  function flattenIptableStatus(ipv4Status: IptablesTable[] | undefined, ipv6Status: IptablesTable[] | undefined, initialConfigs: PortForward[], type: 'forward'): ParsedIptablesRule[] | undefined
  function flattenIptableStatus(ipv4Status: IptablesTable[] | undefined, ipv6Status: IptablesTable[] | undefined, initialConfigs: Rule[], type: 'rule'): ParsedIptablesRule[] | undefined
  function flattenIptableStatus(
    ipv4Status: IptablesTable[] | undefined,
    ipv6Status: IptablesTable[] | undefined,
    initialConfigs: any[],
    type: FirewallConfig['type']
  ): ParsedIptablesRule[] | undefined {
    if (!ipv4Status || !ipv6Status) return undefined
    return [...ipv4Status.map(e => ({ ...e, ipv: 'ipv4' as const })), ...ipv6Status.map(e => ({ ...e, ipv: 'ipv6' as const }))].flatMap(table =>
      table.chains.flatMap(chain =>
        chain.rules.map<ParsedIptablesRule>((rule, i) => ({
          ...rule,
          id: getLinkFromStatusToConfig(
            table.table,
            rule,
            type === 'rule' ? initialConfigs : [],
            type === 'forward' ? initialConfigs : [],
            type === 'nat' ? initialConfigs : [],
            type === 'jool' ? initialConfigs : [],
            true
          )?.id,
          table: table.table,
          chain: chain.chain,
          ipv: table.ipv,
          index: i
        }))
      )
    )
  }

  function reduceUsage(ruleStatuses: IptablesRule[]) {
    return ruleStatuses.reduce((prev, current) => ({ bytes: prev.bytes + Number(current.bytes), pkts: prev.pkts + Number(current.pkts) }), { bytes: 0, pkts: 0 })
  }

  function displayStatus(s: { id: string }, parsedStatus: ParsedIptablesRule[] | undefined, initialSections: { id: string; enabled: '0' | '1' }[] | undefined) {
    if (!parsedStatus) return '-'
    const statuses = parsedStatus.filter(status => status.id === s.id)
    const enable = initialSections?.find(e => e.id === s.id)?.enabled
    if (enable !== '1') return $t('Disabled')
    if (statuses.length) return $t('Active')
    return $t('Starting')
  }
  function displayCounter(s: { id: string }, parsedStatus: ParsedIptablesRule[] | undefined) {
    if (!parsedStatus) return '-'
    const statuses = parsedStatus.filter(status => status.id === s.id)
    if (!statuses.length) return -1
    return reduceUsage(statuses).pkts
  }

  return { getLinkFromStatusToConfig, flattenIptableStatus, reduceUsage, displayStatus, displayCounter }
}
