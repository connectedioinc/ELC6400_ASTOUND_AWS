export type Action = 'ACCEPT' | 'REJECT' | 'NOTRACK' | 'DROP'
export type Zone = {
  id: string
  name: string
  input: Action
  output: Action
  forward: Action
  network?: string[]
  out?: string[]
  in?: string[]
}
export type ZoneGlobal = {
  drop_invalid: '1' | '0'
  auto_helper: '1' | '0'
  input: Action
  output: Action
  forward: Action
}
export type TimeRestrictions = {
  weekdays: string[]
  monthdays: string[]
  start_date: string
  start_time: string
  stop_date: string
  stop_time: string
  utc_time: string
}
export type CoreNat = {
  id: string
  name: string
  enabled: '1' | '0'
  proto: string[]
  priority: string
  target: string
  src: string
  src_ip: string[]
  src_port: string[]
  src_dip: string
  src_dport: string
  dest: string
  dest_ip: string
  dest_port: string
  extra: string
}
export type Nat = CoreNat & TimeRestrictions
export type CoreRule = {
  id: string
  name: string
  enabled: '1' | '0'
  dscp: string
  match: string
  proto: string[]
  icmp_type: string[]
  family: string
  target: string
  priority: string
  src: string
  src_ip: string[]
  src_port: string[]
  src_mac: string[]
  dest: string
  dest_ip: string[]
  dest_port: string[]
  extra: string
  limit: string
  limit_burst: string
  owner_id?: string
  owner_type?: 'ulog' | 'overip' | 'modbusgwd' | 'iec60870_server'
}
export type Rule = CoreRule & TimeRestrictions
export type PortForward = {
  id: string
  name: string
  priority: string
  enabled: '1' | '0'
  proto: string[]
  icmp_type: string[]
  reflection: string
  src: string
  src_ip: string[]
  src_port: string[]
  src_mac: string[]
  src_dip: string
  src_dport: string
  dest: string
  dest_ip: string
  dest_port: string
  extra: string
}

export type ConnectionStatus = {
  layer3: 'ipv4' | 'ipv6'
  timeout: number
  zone: string
  dst: string
  dst_hostname: string
  layer4: 'tcp' | 'udp' | string
  src: string
  sport: string
  mark: string
  packets: number
  dport: string
  bytes: number
  use: string
}
