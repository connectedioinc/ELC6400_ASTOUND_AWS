interface Intervals {
  receive_interval?: string
  transmit_interval?: string
}

export interface BFDPeerConfig extends Intervals {
  id: string
  enabled?: '0' | '1'
  passive_mode?: '0' | '1'
  multihop?: string
  ip?: string
  detect_multiplier?: string
  profile?: string
}

export interface BFDProfileConfig extends Intervals {
  id: string
  name: string
}

export interface BFDStatus extends Intervals {
  peer?: string
  status?: string
  diagnostic?: string
  uptime?: number
  downtime?: number
  detect_multiplier?: number
  session_up?: number
  session_down?: number
  remote_transmit_interval?: number
  remote_receive_interval?: number
}
