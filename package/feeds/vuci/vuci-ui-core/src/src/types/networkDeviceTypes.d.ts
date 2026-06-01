export interface DeviceStatus {
  id: string
  name: string
  description?: string
  up: boolean
  carrier: boolean
  type: 'VLAN' | 'Network device' | '8021ad' | '8021q' | 'bridge' | 'vxlan' | 'wifi' | 'DSA CPU' | 'ethernet' | 'vrf'
  'bridge-members': string[]
  macaddr: string
  parent?: string
  vid?: string
  tx_bytes: number
  rx_bytes: number
}

export interface SwitchPorts {
  num?: number
  index?: number
  role?: string
  device?: string
  need_untag?: boolean
  want_untag?: boolean
}

export interface SwitchVlan {
  device_name: string
  [key: string]: any
}

export interface GeneralDeviceConfig {
  type: 'VLAN' | 'Network device' | '8021ad' | '8021q' | 'bridge' | 'vxlan'
  id: string
  name: string
  macaddr?: string
  mtu?: string
}

export interface BridgeConfig extends GeneralDeviceConfig {
  type: 'bridge'
  ports?: string[]
}

export type DeviceConfig = BridgeConfig | GeneralDeviceConfig // add other configs with |
