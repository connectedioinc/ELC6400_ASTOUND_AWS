import type { IptablesChain, IptablesRule, IptablesTable } from '@/types/iptablesTypes'
import type { TableColumn } from '@ui-core/components/table/types'
import { useTranslate } from '@ui-core/composables/useI18n'
import { capitalize } from '@ui-core/plugins/helper'
import type { InjectionKey, Ref } from 'vue'

export interface ParsedIptablesTable extends IptablesTable {
  chains: ParsedIptablesChain[]
}

export interface ParsedReference {
  chain: string
  count: number
}

export interface ParsedIptablesChain extends IptablesChain {
  table: string
  rules: ParsedIptablesRule[]
  ruleCount: number
  references: ParsedReference[]
  referenceCount: number
  target?: never
}

export interface ParsedIptablesRule extends IptablesRule {
  linkToConfig: string
  table: string
  chain: string
}

export interface FormOptions {
  firewallStatus: Ref<ParsedIptablesTable[]>
}

export const FormOptionKey = Symbol('IptablesOptions') as InjectionKey<FormOptions>

export function tableTableColumns(search = false): TableColumn[] {
  const $t = useTranslate()
  return [
    ...(search ? [{ dataIndex: 'table', title: $t('Table'), displayFn: capitalize, actions: { sort: true, filter: { type: 'uniqueValues' as const } } }] : []),
    { dataIndex: 'chain', title: $t('Name'), help: $t('Name of the chain.'), width: 'w-42', actions: { sort: true, filter: { type: 'uniqueValues' } } },
    { dataIndex: 'bytes', title: $t('Traffic'), help: $t('Size of traffic that was matched to the chain.'), actions: { sort: true } },
    { dataIndex: 'pkts', title: $t('Packets'), help: $t('Count of packets that were matched to the chain.'), actions: { sort: true } },
    { dataIndex: 'policy', title: $t('Policy'), actions: { sort: true, filter: { type: 'uniqueValues' } } },
    { dataIndex: 'ruleCount', title: $t('Rules'), help: $t('Count of rules the chain has.'), actions: { sort: true } },
    { dataIndex: 'referenceCount', title: $t('References'), help: $t('Count of times the chain was referenced in other chains.'), actions: { sort: true } }
  ]
}

export function chainTableColumns(search = false): TableColumn[] {
  const $t = useTranslate()
  return [
    ...(search ? [{ dataIndex: 'table', title: $t('Table'), displayFn: capitalize, actions: { sort: true, filter: { type: 'uniqueValues' as const } } }] : []),
    ...(search ? [{ dataIndex: 'chain', title: $t('Chain'), width: 'w-42', actions: { sort: true, filter: { type: 'uniqueValues' as const } } }] : []),
    { dataIndex: 'comment', title: $t('Name'), actions: { sort: true, filter: { type: 'uniqueValues' } }, width: 'md' },
    { dataIndex: 'bytes', title: $t('Traffic'), help: $t('Size of traffic that was matched to the rule.'), actions: { sort: true } },
    { dataIndex: 'pkts', title: $t('Packets'), help: $t('Count of packets that were matched to the rule.'), actions: { sort: true } },
    {
      dataIndex: 'target',
      title: $t('Target'),
      help: $t('Name of the rule (if highlighted you can click it to open modal to it).'),
      width: 'w-42',
      actions: { sort: true, filter: { type: 'uniqueValues' } }
    },
    { dataIndex: 'prot', title: $t('Protocol'), help: $t('Filters by Internet protocol.'), actions: { sort: true, filter: { type: 'uniqueValues' } } },
    { dataIndex: 'in', title: $t('In'), help: $t('Filters by inbound interface.'), actions: { sort: true, filter: { type: 'uniqueValues' } } },
    { dataIndex: 'out', title: $t('Out'), help: $t('Filters by outbound interface.'), actions: { sort: true, filter: { type: 'uniqueValues' } } },
    { dataIndex: 'source', title: $t('Source'), help: $t('Filters by source address.'), actions: { sort: true, filter: { type: 'uniqueValues' } } },
    { dataIndex: 'destination', title: $t('Destination'), help: $t('Filters by destination address.'), actions: { sort: true, filter: { type: 'uniqueValues' } } },
    { dataIndex: 'options', title: $t('Options'), help: $t('Additional iptables options.'), actions: { sort: true, filter: { type: 'uniqueValues' } }, width: 'lg' }
  ]
}
