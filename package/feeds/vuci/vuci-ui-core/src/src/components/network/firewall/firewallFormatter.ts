import { i18n } from '@ui-core/plugins/i18n'
import { ipUtilsFactory } from '@/utils/ipUtils'
import { network } from '@/plugins/network'
import type { FwRuleValue } from '@/components/network/firewall/FwRuleValue.vue'

export const formatter = {
  /** returns whats left after negation and result of negation */
  _fmtNeg(input: string | string[]): [string, string | undefined] {
    if (typeof input === 'string') {
      const rest = input?.replaceAll(/^ *! */g, '')
      if (input !== rest) {
        return [rest, i18n.t('not')]
      } else {
        return [rest, undefined]
      }
    }
    return [Array.isArray(input) ? input.join('') : input, '']
  },

  /**
   * checks if it's one value or many values including range
   * @param rangeMark - mark that will show if value is range
   */
  _fmtMany(strings: string[], rangeMark?: '-' | '/'): boolean {
    if (strings.length > 1) return true
    if (strings.length === 0) return false
    if (!rangeMark) return false
    // "-" - for port ranges, "/" for ip subnets
    return rangeMark ? strings[0].includes(rangeMark) : false
  },

  fmtSimpleValue(value: string | undefined): FwRuleValue | undefined {
    if (!value) return
    return {
      values: [{ value, hint: undefined, prefix: undefined }],
      name: undefined
    }
  },

  /** formats ip addresses to HTML enhanced human readable format */
  fmtIP(ipaddr: string[] | string | undefined, ipv4Hints: [string, string][]): FwRuleValue | undefined {
    if (!ipaddr?.length) return
    const ipaddrs = Array.isArray(ipaddr) ? ipaddr : [ipaddr]
    const formatedIps = ipaddrs.map(ip => {
      const [rest, negation] = this._fmtNeg(ip)
      const isIP6 = rest.includes(':')
      if (isIP6 ? parseInt(rest.split('/')[1]) < 128 : parseInt(rest.split('/')[1]) < 32) {
        const [from, to] = ipUtilsFactory(isIP6).cidrToRange(rest)
        return { prefix: negation, value: rest, hint: `${from} - ${to}` }
      } else {
        return { prefix: negation, value: rest, hint: ipv4Hints.find(e => e[0] === ip)?.[1] }
      }
    })
    const name = this._fmtMany(ipaddrs, '/') ? i18n.t('IPs') : i18n.t('IP')
    return {
      name,
      values: formatedIps
    }
  },

  /** formats ports to HTML enhanced human readable format */
  fmtPort(port?: string[] | string): FwRuleValue | undefined {
    if (!port?.length) return
    const standartPorts = network.getStandartPorts()
    const ports = Array.isArray(port) ? port : [port]
    const formatedPorts = ports.map(port => {
      const [rest, negation] = this._fmtNeg(port)
      const hint = standartPorts[rest]
      return { prefix: negation, value: rest, hint }
    })
    const name = this._fmtMany(ports, '-') ? i18n.t('ports') : i18n.t('port')
    return {
      name,
      values: formatedPorts
    }
  },

  /** formats macs to HTML enhanced human readable format */
  fmtMac(macs?: string[] | string): FwRuleValue | undefined {
    if (!macs?.length) return
    const macsArr = Array.isArray(macs) ? macs : [macs]
    const formatedMacs = macsArr.map(mac => {
      const [rest, negation] = this._fmtNeg(mac)
      return { prefix: negation, value: rest }
    })
    const name = formatedMacs.length > 1 ? i18n.t('MACs') : i18n.t('MAC')
    return {
      name,
      values: formatedMacs,
      forceCollapse: true,
      andSeperator: true
    }
  },

  /** formats zone to HTML enhanced human readable format */
  fmtZone(zone: string | undefined, fallback?: string): string | undefined {
    if (!zone) return fallback ?? network.zoneNames().other.device
    if (zone === '*') return network.zoneNames().other.any
    return zone
  },

  /** formats ip protocols to HTML enhanced human readable format */
  fmtProto(protos: string[] | string | undefined, icmpTypes: string[] | string | undefined, ipvProto: string): FwRuleValue | undefined {
    const ipvs: Record<string, string> = {
      ipv4: 'IPv4',
      ipv6: 'IPv6',
      default: 'IPv4&6'
    }
    const name = ipvs[ipvProto] ?? ipvs.default
    if (!protos) return
    const protosArr = Array.isArray(protos) ? protos : [protos]
    if (protosArr.length === 1 && protosArr[0] === 'all') return { name, values: [] }

    const formatedProtos = protosArr.map(port => {
      const [rest, negation] = this._fmtNeg(port)

      if (rest === 'icmp') {
        return { prefix: negation, value: rest.toUpperCase(), hint: icmpTypes }
      }
      return { prefix: negation, value: rest.toUpperCase() }
    })
    return {
      name,
      values: formatedProtos
    }
  },

  fmtAction(action: string, extra = false): string {
    const names = network.zoneNames() as Record<string, Record<string, string>>
    return names.actions[action] ?? (extra ? names.extraActions[action] : action)
  },

  /** formats targets to HTML enhanced human readable format */
  fmtTarget(action: string, src: string, dest: string): string {
    let location
    if (!(network.zoneNames().extraActions as Record<string, string>)[action]) {
      if (!src) location = i18n.t('output')
      else if (dest) location = i18n.t('forward')
      else location = i18n.t('input')
    }
    const actionText = action ? this.fmtAction(action, true) : this.fmtAction('DROP')
    return `${actionText}${location ? ` ${location}` : ''}`
  }
}
