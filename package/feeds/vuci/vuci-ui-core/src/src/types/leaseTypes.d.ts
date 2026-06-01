export interface LeaseIpv4Config {
  id: string
  mac?: string
  name?: string
  ip?: string
}

export interface LeaseIpv4Status {
  interface: string
  expires: number
  ipaddr: string
  macaddr: string
  hostname?: string
}

export interface LeaseIpv6Config {
  hostid?: string
  duid?: string
  name?: string
}

export interface LeaseIpv6Status {
  duid: string
  ipv6addr: string[]
  ipv6prefix: {
    address: string
    prefix_length: number
  }[]
  interface: string
  expires: string
  hostname?: string
}
