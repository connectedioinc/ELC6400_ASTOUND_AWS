export interface MwanTrackIp {
  status: 'up' | 'down' | 'skipped'
  ip: string
}

export interface MwanStatusInterface {
  status: 'online' | 'offline' | 'standby' | 'notracking' | 'disabled' | 'starting'
  type: 'wired' | 'wireless' | 'mobile' | '-'
  uptime: number
  load_balance: number
  interval: number
  track_ip: MwanTrackIp[]
}

export interface MwanStatus {
  [key: string]: MwanStatusInterface
}

export interface MwanGlobals {
  id: string
  mode: string
}

export interface MwanInterface {
  id: string
  enabled: '0' | '1'
  track_method: 'ping' | 'wget'
  track_ip: string[]
  up: string
  reliability: string
  name: string
  count: string
  interval: string
  down: string
  family: 'ipv4' | 'ipv6'
  network_type: 'wired' | 'wireless' | 'mobile' | '-'
}

export interface MwanMember {
  id: string
  name: string
  weight?: string
  metric: string
  group: 'mwan' | 'balance'
  interface?: string
}

export interface MwanPolicy {
  id: string
  name: string
  use_member?: string[]
  last_resort: string
}

export interface MwanRule {
  id: string
  name: string
  proto: 'all' | 'tcp' | 'udp' | 'icmp' | 'esp'
  use_policy: string
  priority: string
  sticky: '0' | '1'
  dest_ip?: string[]
  src_ip?: string[]
  dest_port?: string
  src_port?: string
}
