export type PortVLANType = 'u' | 't' | 'off'

export type PortVLAN = { id: string; vid: string } & Record<string, PortVLANType>

// Yes tsw has different prop for vlan id
export type TSWPortVLAN = { id: string; vlan: string; name: string } & Record<string, PortVLANType>

export type InterfaceVLAN = {
  type: '8021q' | '8021ad'
} & InterfaceQQVLAN

export type InterfaceQQVLAN = {
  id: string
  vid: string
  ifname: string
  name: string
}
