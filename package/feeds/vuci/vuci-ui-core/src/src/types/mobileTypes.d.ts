export interface ModemInfo {
  id: string
  num: string
  builtin: boolean
  simcount: 1 | 2
  primary?: boolean
  active_sim: number
  esim_profile?: string
  name: string
  revision: string
  modem_func_id: 0 | 1 | 2 | 3
  multi_apn: boolean
  operator_scan: boolean
  dhcp_filter: boolean
  dynamic_mtu: boolean
  ipv6: boolean
  volte: boolean
  csd: boolean
  wwan_gnss_conflict: boolean
  framed_routing: boolean
  low_signal_reconnect: boolean
  auto_5g_mode: boolean
  band_list: string[]
  pinstate: string
  simstate: string
  vendor: string
  product: string
  red_cap?: boolean
  gps?: string
  gps_out?: boolean
  region?: string
  cmd_port?: string
  data_port?: string
  operator?: string
  provider?: string
  operator_state?: string
  operators_scan: boolean
  stop_bits: string
  boudrate: string
  type: string
  desc: string
  control: string
  version: string
  mode: 0 | 1 | 2 | 3
}

export interface SimcardConfig {
  id: string
  modem: string
  position: string
  primary: '0' | '1'
  esim_profile?: string
  deny_roaming?: '0' | '1'
  volte?: 'auto' | 'on' | 'off'
  service?: string
  category_lte?: 'm1_nb' | 'm1' | 'nb'
  nr5g_mode?: 'auto' | 'nsa' | 'sa'
  pincode?: string
  pukcode?: string
  band?: 'auto' | 'manual'
  gsm?: string[]
  umts?: string[]
  lte?: string[]
  lte_nb?: string[]
  nr5g?: string[]
  nr5g_sa?: string[]
  signal_reset_enabled?: '0' | '1'
  signal_reset_threshold?: string
  signal_reset_timeout?: string
  operlist?: string
  opermode?: string
  operator_mode?: string
  operlist_name?: string
  fallback?: '0' | '1'
  enable_sms_limit?: '0' | '1'
  sms_limit_num?: string
  sms_limit?: 'day' | 'week' | 'month'
  period?: string
  operator?: 'auto' | 'manual' | 'manual-auto'
  opernum?: string
}

export interface EsimConfig {
  id: string
  enabled: '0' | '1'
  profile_set: '0' | '1'
  name: string
  sim: string
  modem: string
  provider: string
  bootstrap: '0' | '1'
}

export interface OperatorListConfig {
  id: string
  name: string
  mcc_mnc?: string[]
  priority?: '0' | '1'
}

export interface OperatorScanList {
  num_name: string
  op_name: string
  short_name: string
  country: string
  net_access_type: string
  status: 'Unknown' | 'Available' | 'Forbidden'
  status_code: '0' | '1' | '2' | '3'
}

export interface ParsedOperatorScan {
  status: { value: string; color: string }
  opName: string
  shortName: string
  numName: string
  country: string
  netAccessType: string
}

export interface ApnDbConfig {
  id: string
  apn: string
  pdptype: '0' | '1' | '2'
  authtype: '0' | '1' | '2'
  carrier: string
  country: string
  mcc: string
  mnc: string
  username?: string
  password?: string
}

export interface SimIdleProtectionConfig {
  id: string
  modem: string
  position: string
  esim_profile?: string
  enable: '0' | '1'
  period: 'week' | 'month'
  day: string
  weekday: '1' | '2' | '3' | '4' | '5' | '6' | '0'
  time: string
  ip_type: 'ipv4' | 'ipv6'
  host: string
  packet_size: string
  count: string
}
