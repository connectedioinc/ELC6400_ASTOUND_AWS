export interface JoolGlobal {
  enabled: '0' | '1'
  interface: string
}

export interface JoolConfig {
  id: string
  enabled: '0' | '1'
  name?: string
  proto?: ('tcp' | 'udp' | 'icmp' | 'icmp6' | 'all')[]
  src?: string
  dest_ipv4?: string[]
  src_ipv6?: string[]
  src_port?: string[]
  dest_ipv6?: string[]
  dest_port?: string[]
}
