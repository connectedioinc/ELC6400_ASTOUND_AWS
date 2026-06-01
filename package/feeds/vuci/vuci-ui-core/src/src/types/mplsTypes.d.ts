export interface LdpConfig {
  enabled: '0' | '1'
  router_id: string
  ifname: string[]
  transport_address: string
}

export interface LdpNeighborStatus {
  state: 'NON EXISTENT' | 'INITIALIZED' | 'OPENREC' | 'OPENSENT' | 'OPERATIONAL'
  upTime: string
  transport_address: string
  addressFamily: 'ipv4'
  neighbor_id: string
}

export interface LdpDeviceStatus {
  state: 'ACTIVE' | 'DOWN' | 'UNKNOW'
  name: string
  adjacencies: string
  uptime: string
  family: 'ipv4'
}
export interface LdpStatus {
  enabled: '0' | '1'
  neighbors: LdpNeighborStatus[]
  interfaces: LdpDeviceStatus[]
}
