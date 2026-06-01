export interface GenericInterface {
  id: string
  enabled: '0' | '1'
  proto: 'none' | 'static' | 'dhcp' | 'dhcpv6' | 'pppoe' | 'wwan' | 'connm'
  ipaddr?: string
  netmask?: '255.255.255.0' | '255.255.0.0' | '255.0.0.0' | string
  gateway?: string
  ip6addr?: string
  ip6gw?: string
  dns?: string[]
  metric?: string
  name?: never
}

export interface TswInterface extends GenericInterface {
  vlan_id: string
}
export interface Interface extends GenericInterface {
  name: string
  area_type?: 'lan' | 'wan'
  wan_as_lan?: string
  broadcast?: string
  broadcast_dhcp?: '0' | '1'
  auth?: 'none' | 'pap' | 'chap'
  username?: string
  password?: string
  'password:set'?: '1' | '0'
  ac?: string
  service?: string
  reqaddress?: 'try' | 'force' | 'none'
  reqprefix?: 'auto' | 'no' | '48' | '52' | '56' | '60' | '64'
  hostname?: string
  method?: 'nat' | 'bridge' | 'passthrough'
  pdptype?: 'ip' | 'ipv6' | 'ipv4v6'
  modem?: string
  sim?: string
  esim_profile?: string
  auto_apn?: '0' | '1'
  apn?: string
  passthrough_mode?: '1' | '0'
  leasetime?: string
  delegate?: '0' | '1'
  force_link?: '0' | '1'
  ipv6?: 'auto' | '0' | '1'
  defaultroute?: '0' | '1'
  ip6prefix?: string
  clientid?: string
  vendorid?: string
  keepalive_failure?: string
  keepalive_interval?: string
  host_uniq?: string
  demand?: string
  mac?: string
  macaddr?: string
  mtu?: string
  ip4table?: string
  ip6table?: string
  ip6assign?: string
  ip6hint?: string
  ip6ifaceid?: string
  bridge?: '0' | '1'
  stp?: '0' | '1'
  igmp_snooping?: '0' | '1'
  device?: string
  ifname?: string[] | string
  fiber_priority?: string
  tag?: string
  priority?: string
  fwzone?: string
  mob_limit_enabled?: '0' | '1'
  data_limit?: string
  due_reset_time?: string
  period?: 'day' | 'week' | 'month'
  reset_day?: string
  reset_hour?: string
  reset_weekday?: string
  enable_warning?: '0' | '1'
  warning_limit?: string
  warning_num?: string
  p2p?: '0' | '1'
  man_vlan?: string
  force_apn?: '0' | '1' | '-1'
}

export interface TapInterface {
  id: string
  device: string
  mode: string
  gateway: string
  ipaddr: string
  netmask: string
  ip6addr: string
  ip6gw: string
  dns: string[]
  man_vlan: string
  fallback: string
  fallbackip?: string
}

export interface InterfaceStatus {
  interface: string
  id: string
  name: string
  // only available on vpn interfaces via "?include=vpn"
  description?: string
  ifname: string
  area_type: 'lan' | 'wan'
  proto?: string
  network_type: 'mobile' | 'wired' | 'bridge' | 'wireless' | '-'
  // for both ipv4 and ipv6
  'dns-server'?: string[]

  enabled: boolean
  is_up: boolean
  up: boolean
  uptime?: number
  device?: string
  subdevices?: string[]
  macaddr?: string
  errors?: { code: string; subsystem: string }[]
  data: { bridge_ipaddr: string; method: string; leasetime?: number }
  mwan_enabled?: '1' | '0'
  main?: '0' | '1'
  rx_bytes?: number
  tx_bytes?: number

  pending: boolean

  ipaddrs?: string[]
  'ipv4-address'?: InterfaceAddrStatus[]
  gwaddr?: string
  'ipv6-prefix'?: InterfaceAddrStatus[]
  'ipv6-prefix-assignment'?: InterfaceAddrStatus[]

  gw6addr?: string
  ip6addrs?: string[]
  ip6prefix?: string
  apn?: string
  force_apn?: string
  auto_apn?: string
  bringup?: boolean
  modem?: string
  sim?: string
  modem_id?: string
}

interface InterfaceAddrStatus {
  address: string
  mask: number
}

interface AvailableInterfaces {
  ifname: string
  parent?: string
  service?: string
  ports?: string[]
  interfaces?: []
  child?: string
}
