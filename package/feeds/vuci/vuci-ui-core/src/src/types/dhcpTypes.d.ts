export interface DhcpV4Config {
  interface: string
  id: string
  enable_dhcpv4: '0' | '1'
  mode: 'server' | 'relay'
  server_relay: string
  start_ip: string
  end_ip: string
  leasetime: string
  dynamicdhcp: string
  force: string
  netmask: string
  force_options: string
  dhcp_option: string[]
  enable_option_82: '0' | '1'
  circuit_id: string
  remote_id: string
}

export interface DhcpV6Config {
  enable_dhcpv6: '0' | '1'
  interface: string
  id: string
  leasetime: string
  dynamicdhcp: string
  force: string
  ra: string
  dhcpv6: string
  ndp: string
  ra_management: string
  ra_default: string
  dns: string[]
  domain: string[]
}

export interface DhcpStatus {
  interface: string
  id: string
  running: boolean
  errors: { error: number; error_message: string }[]
}
