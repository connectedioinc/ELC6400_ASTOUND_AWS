import { i18n } from '@ui-core/plugins/i18n'
export const ipv4Utils = {
  /** parses ip to array of its parts */
  parse(ip: string): number[] {
    return ip.split('.').map(part => Number(part))
  },
  /** compares two IPs */
  compare(ipA: string, ipB: string): number {
    if (ipA === ipB) return 0
    return ipv4Utils.ip2int(ipA) - ipv4Utils.ip2int(ipB)
  },
  /** converts integer to ipv4 */
  int2ip(ipInt: number): string {
    return (ipInt >>> 24) + '.' + ((ipInt >> 16) & 255) + '.' + ((ipInt >> 8) & 255) + '.' + (ipInt & 255)
  },
  /** converts ipv4 to integer */
  ip2int(ip: string): number {
    return ip.split('.').reduce((ipInt, octet) => (ipInt << 8) + parseInt(octet, 10), 0) >>> 0
  },

  // https://stackoverflow.com/questions/13683436/retrieve-max-min-ips-from-cidr-range/20004699
  /**
   * converts ipv4 cidr to range
   * @param cidr - cidr notation e.g 192.168.1.0/24
   */
  cidrToRange(cidr: string): [string, string] {
    const [ip, rawMask] = cidr.split('/') ?? []
    const netmask = parseInt(rawMask)
    const from = ipv4Utils.ip2int(ip) & (-1 << (32 - netmask))
    const to = from + Math.pow(2, 32 - netmask) - 1
    return [ipv4Utils.int2ip(from), ipv4Utils.int2ip(to)]
  },
  /**
   * converts full netmask to integer
   * @param mask - full mask e.g 255.255.255.0
   * @returns cidr notation netmask e.g 24
   */
  netmaskToNumber(mask: string): number {
    const maskNodes = mask.match(/(\d+)/g) ?? []
    let cidr = 0
    for (const maskNode of maskNodes) {
      cidr += (parseInt(maskNode).toString(2).match(/1/g) || []).length
    }
    return cidr
  },
  /**
   * converts full netmask to integer
   * @param cidr  - cidr notation netmask e.g 24
   * @returns full mask e.g 255.255.255.0
   */
  numberToMask(cidr: number): string {
    if (!cidr) return '-'
    /** @type {number[]} */
    const mask = []
    for (let i = 0; i < 4; i++) {
      const n = Math.min(cidr, 8)
      mask.push(256 - Math.pow(2, 8 - n))
      cidr -= n
    }
    return mask.join('.')
  },

  /**
   * converts  ip and full netmask to ipv4 range
   * @param ip - ipv4 ip address
   * @param netmask - full mask e.g 255.255.255.0
   */
  getIPRange(ip: string, netmask?: string): [string, string] {
    if (!netmask) {
      return ipv4Utils.cidrToRange(ip)
    } else {
      const mask = ipv4Utils.netmaskToNumber(netmask)
      const ipWithMask = `${ip}/${mask}`
      return ipv4Utils.cidrToRange(ipWithMask)
    }
  },

  /**
   * checks if ipv4 address is in range
   * @param inclusive - can ip be same as min and max (default: false)
   **/
  checkIfInRange(ip: string, min: string, max: string, inclusive = false): boolean {
    const parsedMin = ipv4Utils.ip2int(min)
    const parsedMax = ipv4Utils.ip2int(max)
    const parsedIp = ipv4Utils.ip2int(ip)
    if (inclusive) return parsedMin <= parsedIp && parsedMax >= parsedIp
    return parsedMin < parsedIp && parsedMax > parsedIp
  },

  /**
   * calculates the subnet id (the first address in the network).
   * Network address and the subnet mask is required for calculation
   * @param ip - network IP address
   * @param mask - network subnet mask
   * @returns first address in the network
   */
  subnetID(ip: number[], mask: number[]): number[] {
    const a = [0, 0, 0, 0]
    for (let i = 0; i < 4; i++) {
      a[i] = ip[i] & mask[i]
    }
    return a
  },

  /**
   * Calculates networks broadcast address
   * @param ip - first IP address of the network
   * @param wildcardMask - network wildcard mask
   * @returns networks broadcast address
   */
  broadcast(ip: number[], wildcardMask: number[]): number[] {
    // work around int32
    const a = [0, 0, 0, 0]
    for (let i = 0; i < 4; i++) {
      a[i] = ip[i] | wildcardMask[i]
    }
    return a
  },

  /**
   * Calculates wildcard mask of the network
   * @param mask - network subnet mask
   * @returns wildcard mask
   */
  wildcardMask(mask: number[]): number[] {
    const a = [0, 0, 0, 0]
    for (let i = 0; i < 4; i++) {
      a[i] = 255 - mask[i]
    }
    return a
  },
  areSubnetsOverlapping(subnet1: string, subnet2: string): boolean {
    const [ip1, mask1 = '32'] = subnet1.split('/')
    const [ip2, mask2 = '32'] = subnet2.split('/')

    // Find the minimum of both subnet mask lengths
    const minMask = ipv4Utils.parse(ipv4Utils.numberToMask(Math.min(parseInt(mask1), parseInt(mask2))))

    // Compare the network addresses up to the minimum mask length
    const networkID1 = ipv4Utils.subnetID(ipv4Utils.parse(ip1), minMask)
    const networkID2 = ipv4Utils.subnetID(ipv4Utils.parse(ip2), minMask)
    return networkID1.join('.') === networkID2.join('.')
  },
  getIpType: getIpTypeFunction('ipv4'),
  /**
   * applies subnet mask to incorrect subnet ip. Used when you want to use display config as status.
   * @param ipv4cdir
   * @returns ipv4 subnet cdir
   */
  getSubnet(cdir: string): string {
    const [addr, subnet = '32'] = cdir.split('/')
    const nums = this.parse(addr)
    const broadcast = this.subnetID(nums, this.parse(this.numberToMask(Number(subnet))))
    return `${broadcast.join('.')}/${subnet}`
  }
}

const ipTypeTranslations = () =>
  ({
    public: i18n.t('public network'),
    private: i18n.t('private network'),
    shared: i18n.t('shared network'),
    currentNetwork: i18n.t('current network'),
    reserved: i18n.t('reserved network'),
    loopback: i18n.t('loopback network'),
    linkLocal: i18n.t('link-local network'),
    example: i18n.t('example network'),
    multicast: i18n.t('multicast'),
    broadcast: i18n.t('broadcast'),
    badMask: i18n.t('non-standard network (mask too small)')
  }) as const
type IpType = keyof ReturnType<typeof ipTypeTranslations>
const ipv4Blocks = {
  '0.0.0.0/8': 'currentNetwork',
  '10.0.0.0/8': 'private',
  '100.64.0.0/10': 'shared',
  '127.0.0.0/8': 'loopback',
  '169.254.0.0/16': 'linkLocal',
  '172.16.0.0/12': 'private',
  // Reserved for IETF Protocol Assignments
  '192.0.0.0/24': 'reserved',
  '192.0.2.0/24': 'example',
  // Deprecated. Was used for 6to4
  '192.88.99.0/24': 'reserved',
  '192.168.0.0/16': 'private',
  // Reserved for benchmarks
  '198.18.0.0/15': 'reserved',
  '198.51.100.0/24': 'example',
  '203.0.113.0/24': 'example',
  '224.0.0.0/4': 'multicast',
  '233.252.0.0/24': 'example',
  // Reserved for user use
  '240.0.0.0/4': 'reserved',
  '255.255.255.255/32': 'broadcast'
} as const
const ipv6Blocks = {
  '::/128': 'currentNetwork',
  '::1/128': 'loopback',
  '::ffff:0:0/96': 'reserved',
  '::ffff:0:0:0/96': 'reserved',
  '64:ff9b::/96': 'reserved',
  '64:ff9b:1::/48': 'reserved',
  '100::/64': 'reserved',
  '2001::/32': 'reserved',
  '2001:2::/48': 'reserved',
  '2001:20::/28': 'reserved',
  '2001:db8::/32': 'example',
  '2002::/16': 'reserved',
  '5f00::/16': 'reserved',
  'fc00::/7': 'private',
  'fe80::/10': 'linkLocal',
  'ff00::/8': 'multicast'
} as const

function getIpTypeFunction(ipv: 'ipv4' | 'ipv6') {
  function getIpType(ip: string, narrow: false, translate: false): 'reserved' | 'public' | 'private' | 'shared' | 'link-local' | 'badMask'
  function getIpType(ip: string, narrow: true, translate: false): IpType | 'badMask'
  function getIpType(ip: string, narrow: boolean, translate: true): string
  function getIpType(ip: string, narrow: boolean, translate: boolean): string {
    const addressCDIR = ipv === 'ipv4' ? 32 : 128
    const ipBlocks = ipv === 'ipv4' ? ipv4Blocks : ipv6Blocks
    const ipvUtils = ipv === 'ipv4' ? ipv4Utils : ipv6Utils
    const t = (e: IpType): string => (translate ? ipTypeTranslations()[e] : e)
    const subnet = ip.includes('/') ? ip : `${ip}/${addressCDIR}`

    const type = Object.entries(ipBlocks).find(entry => ipvUtils.areSubnetsOverlapping(entry[0], subnet))
    if (type) {
      if (parseInt(subnet.split('/')[1]) < parseInt(type[0].split('/')[1])) return t('badMask')
      return narrow || ['public', 'private', 'shared', 'link-local'].includes(type[1]) ? t(type[1]) : t('reserved')
    }
    return t('public')
  }
  return getIpType
}

export const ipv6Utils = {
  /**
   * converts ipv6 cidr to range
   * @param {string} cidr - cidr notation e.g 123:1::1:5:6:0/64
   * @returns {[string, string]}
   */
  cidrToRange(cidr: string): [string, string] {
    const [ip, rawMask] = cidr.split('/') ?? []
    const netmask = BigInt(rawMask)
    const from = ipv6Utils.ip2int(ip) & (-1n << (128n - netmask))
    const to = from + (2n ** (128n - netmask) - 1n)
    return [ipv6Utils.int2ip(from), ipv6Utils.int2ip(to)]
  },
  /** expands ipv6 address by adding zero filled sections between :: */
  expandIpv6(ipv6: string): string {
    if (!ipv6.includes('::')) return ipv6
    const segments = ipv6.match(/[^:]+/g) ?? []
    const missingSegmentCount = 8 - segments.length
    const missingZeros = Array.from({ length: missingSegmentCount }, () => '0000').join(':')
    return ipv6.replace('::', `:${missingZeros}:`).replaceAll(/^:|:$/g, '')
  },
  /**
   * conpress largest zero section to ::
   * @param ipv6 - ipv6 address without ::
   * @returns ipv6 address with :: if it's possible to insert
   */
  compressIpv6(ipv6: string): string {
    // Fix error when trying to compress potentially/partially compressed IP
    const expanedIpv6 = ipv6.includes('::') ? ipv6Utils.expandIpv6(ipv6) : ipv6
    const segments = expanedIpv6
      .match(/[^:]+/g)
      // Remove leading zeros
      ?.map(segment => parseInt(segment, 16).toString(16))
    if (!segments || segments.length < 8) throw new Error('Incorrect ipv6 address')
    const zeroFlags = segments.map(segment => parseInt(segment, 16) === 0)

    let counter = 0
    let maxFound = 0
    let maxIndex = 0
    zeroFlags.forEach((flag, index) => {
      if (flag && ++counter >= maxFound) {
        maxFound = counter
        maxIndex = index
      } else counter = 0
    })
    if (maxFound === 0) return segments.join(':')
    if (maxFound === 8) return '::'
    segments.splice(maxIndex - maxFound + 1, maxFound, ':')
    return segments.join(':').replace(':::', '::')
  },
  /**
   * remove prefix and retrieve host
   * @param ipv6addr - ipv6 address
   * @returns hostid for ipv6 lease config
   */
  getHostId(ipv6addr: string): string {
    // host id is always 64 bits. It does not depend on prefix length.
    return (ipv6Utils.ip2int(ipv6addr) & 0xffffffffffffffffn).toString(16)
  },
  checkIfInRange(ip: string, min: string, max: string, inclusive = false): boolean {
    const numberIp = ipv6Utils.ip2int(ip)
    const numberMin = ipv6Utils.ip2int(min)
    const numberMax = ipv6Utils.ip2int(max)
    if (inclusive) return numberIp >= numberMin && numberIp <= numberMax
    return numberIp > numberMin && numberIp < numberMax
  },
  ip2int(ip: string): bigint {
    const hex = ipv6Utils
      .expandIpv6(ip)
      .split(':')
      .map(section => section.padStart(4, '0'))
      .join('')
    return BigInt(`0x${hex}`)
  },
  int2ip(ip: bigint): string {
    const hex = ip.toString(16).padStart(32, '0')
    return ipv6Utils.compressIpv6([...hex.matchAll(/.{4}/g)].flat().join(':'))
  },
  subnetID(cdir: string) {
    const [ip, mask = '128'] = cdir.split('/')
    const ipNumber = ipv6Utils.ip2int(ip)
    const invertedMask = 128n - BigInt(mask)
    return ipv6Utils.int2ip((ipNumber >> invertedMask) << invertedMask)
  },
  getSubnet(cdir: string): string {
    const [, ipv6subnet = '128'] = cdir.split('/')
    return `${ipv6Utils.compressIpv6(ipv6Utils.subnetID(cdir))}/${ipv6subnet}`
  },
  areSubnetsOverlapping(subnet1: string, subnet2: string): boolean {
    const [ip1, mask1 = '128'] = subnet1.split('/')
    const [ip2, mask2 = '128'] = subnet2.split('/')

    // Find the minimum of both subnet mask lengths
    const minMask = Math.min(parseInt(mask1), parseInt(mask2))

    // Compare the network addresses up to the minimum mask length
    const networkID1 = ipv6Utils.subnetID(`${ip1}/${minMask}`)
    const networkID2 = ipv6Utils.subnetID(`${ip2}/${minMask}`)
    return networkID1 === networkID2
  },
  getIpType: getIpTypeFunction('ipv6')
}

export const ipUtils = {
  /**
   * Merges address and mask to CIRD notation.
   * @param addrObj - this kind of object frequintly returned by ip status
   */
  composeCIDR(addrObj?: { address: string; mask: number }): string | undefined {
    if (addrObj) return `${addrObj.address}/${addrObj.mask}`
  }
}

/**
 * Select correct lib (usefull only for common funtions between two libs)
 * @param identifier - ipaddr to  or boolean (true - ipv6, false - ipv4)
 */
export function ipUtilsFactory(identifier: string | boolean): typeof ipv6Utils | typeof ipv4Utils {
  if (typeof identifier === 'string') {
    return identifier.includes('.') ? ipv4Utils : ipv6Utils
  }
  return identifier ? ipv6Utils : ipv4Utils
}
