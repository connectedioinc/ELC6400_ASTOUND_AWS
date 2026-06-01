import type { TswPort } from '@/stores/main'

export interface TswPortStatus {
  rx_bytes: string
  tx_bytes: string
  link: string
  id: string
  dot1x: string
  full_duplex: string
  tx_rate: string
  speed: string
  budget: string
  rx_rate: string
  power: string
  description?: string
  poe_enable?: string
  enabled: string
  bond_name?: string
  bond_index?: string
  bond_id?: string
  vendor?: string
  serial?: string
  part_number?: string
  voltage?: string
  current?: string
  temperature?: string
  output_power?: string
}

export interface TswPortConfig {
  id: string
  description?: string
  enabled: string
  autoneg: string
  advert: string
  speed: string
  duplex: string
  poe_enable?: string
  eee_enable: string
  qos_pri_group: string
  qos_pri_inner: string
  storm_uni_rate: string
  ingr_rate: string
  storm_broad_rate: string
  storm_mult_rate: string
  egr_rate: string
  stp_edge: '1' | '0'
  bond_name?: undefined
}

export interface RutPortStatus {
  id: string
  state: string
  num: string
  name: string
  position: string
  duplex: string
  power?: string
  speed?: number
  budget?: string
  poe_enable?: string
  description: undefined
  enabled: string
  link_supported?: string[]
  force_autoneg?: boolean
  bond_name?: undefined
}

export interface RutPortConfig {
  id: string
  autoneg: string
  duplex: string
  enabled: string
  poe_enable?: string
  advert: string[]
  description: undefined

  bond_name?: undefined
}

export type PortConfig = TswPortConfig | RutPortConfig
export type PortStatus = TswPortStatus | RutPortStatus

export interface StaticPortInfo extends TswPort {
  /** Not avail from board */
  custom?: string
}
