import { Action } from './firewallTypes'

export type Table = 'nat' | 'filter' | 'raw' | 'mangle'

export interface IptablesTable {
  table: Table
  chains: IptablesChain[]
}

export interface IptablesChain {
  bytes: string
  rules: IptablesRule[]
  chain: string
  pkts: string
  policy: Action
}

export interface IptablesRule {
  bytes: string
  source: string
  prot: string
  pkts: string
  in: string
  out: string
  target: string
  destination: string
  comment: string
  options: string
}
