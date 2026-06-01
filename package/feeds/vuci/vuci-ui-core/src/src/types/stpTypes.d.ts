export interface StpBridgeConfig {
  mode: 'disabled' | 'stp' | 'rstp'
  priority: string
  max_age: string
  fwd_delay: string
  hello_time: string
  hold_count: string
  max_hops: string
}

export interface StpPortStatus {
  state: 'forwarding' | 'learning' | 'disabled' | 'blocking' | 'listening'
  cost: '4'
  priority: '32'
  port: 'port1'
}

export interface RstpPortStatus {
  port: string
  enabled: boolean
  mode: 'rstp' | 'stp' | 'unknown'
  role: 'designated' | 'root' | 'disabled' | 'backup' | 'alternate'
  state: 'forwarding' | 'learning' | 'disabled' | 'blocking' | 'listening' | 'discarding'
  cost: string
  internal_cost: string
  priority: string
}
