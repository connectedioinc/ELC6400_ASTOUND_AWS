import { i18n } from '@ui-core/plugins/i18n'
import { useMessages, useNotifications } from '@/stores/messages'
import type { AvailableInterfaces, Interface, InterfaceStatus, GenericInterface, TswInterface } from '@/types/networkTypes'
import type { DhcpV4Config, DhcpV6Config } from '@/types/dhcpTypes'
import type { DeviceStatus } from '@/types/networkDeviceTypes'
import { computed, type App, type Ref } from 'vue'
import { useMainStore } from '@/stores/main'
import { useOptions } from '@/composables/useOptions'
import type { Props as HintHelperProps } from '@/components/shared/HintHelper.vue'
import { createContext } from '@ui-core/utils/create-context'

type StringTuple = [string, string]

const statusContextArr = createContext<Ref<InterfaceStatus[]>>('interfaceStatus')
const statusContext = { provider: statusContextArr[0], injector: statusContextArr[1], contextId: statusContextArr[2] }

export const network = {
  dynamicRoutes() {
    return {
      xl2tp_server: i18n.t('L2TP Server'),
      l2tp: i18n.t('L2TP Client'),
      l2tpv3: i18n.t('L2TPv3'),
      pptp: i18n.t('PPTP Client'),
      pptp_server: i18n.t('PPTP Server'),
      gre: i18n.t('GRE'),
      sstp: i18n.t('SSTP'),
      eoip: i18n.t('EoIP'),
      opc: i18n.t('OpenConnect'),
      zerotier: i18n.t('ZeroTier'),
      wireguard: i18n.t('WireGuard'),
      xfrm: i18n.t('IPSec'),
      tailscale: i18n.t('Tailscale')
    }
  },

  getDynamicRoute(service: string | undefined) {
    const dynamicRoutes = this.dynamicRoutes() as Record<string, string>
    return (Object.keys(dynamicRoutes) as string[]).includes(service as string) ? '(%s)'.format(dynamicRoutes[service as keyof typeof dynamicRoutes]) : `(${service})`
  },

  getStandartPorts(): Record<string, string> {
    return {
      20: 'FTP data',
      21: 'FTP cmd',
      22: 'SSH',
      25: '%s SMTP'.format(i18n.t('Old')),
      53: 'DNS',
      67: 'DHCPv4 %s'.format(i18n.t('server')),
      68: 'DHCPv4 %s'.format(i18n.t('client')),
      80: 'HTTP',
      123: 'NTP',
      179: 'BGP',
      443: 'HTTPS',
      500: 'ISAKMP',
      546: 'DHCPv6 %s'.format(i18n.t('client')),
      547: 'DHCPv6 %s'.format(i18n.t('server')),
      587: '%s SMTP'.format(i18n.t('Modern')),
      3389: 'RDP'
    }
  },
  getPortOptions(...additional: StringTuple[]): StringTuple[] {
    const standartOptions = Object.entries(this.getStandartPorts()).map<StringTuple>(([port, name]) => [port, `${name} (${port})`])
    return additional.concat(standartOptions)
  },
  getProtoOptions(): StringTuple[] {
    return [
      ['tcp', 'TCP'],
      ['udp', 'UDP'],
      ['icmp', 'ICMP'],
      ['all', i18n.t('All')]
    ]
  },
  /**
   * parses info from API and returns options that can be used in form
   * @param data - data from /routes/status/ipv4_hints
   */
  getIpOptions(data: StringTuple[] | { ipv4_hints: StringTuple[] }, ...additional: StringTuple[]): StringTuple[] {
    const normalizedData = Array.isArray(data) ? data : data.ipv4_hints
    return [...additional, ...normalizedData.map<StringTuple>(([ip, hostname]) => [ip, `${ip} (${hostname})`])]
  },
  /**
   * parses info from API and returns options that can be used in form
   * @param data - data from /routes/status/mac_hints
   */
  getMacOptions(data: StringTuple[] | { mac_hints: StringTuple[] }, ...additional: StringTuple[]): StringTuple[] {
    const normalizedData = Array.isArray(data) ? data : data.mac_hints
    return [...additional, ...normalizedData.map<StringTuple>(([mac, hostname]) => [mac, `${mac} (${hostname})`])]
  },

  /**
   * parses interfaces options that can be used in form
   */
  interfaceOptions(interfaces: InterfaceStatus[]): StringTuple[] {
    const ifacesWithDevice = interfaces.filter((iface): iface is InterfaceStatus & { device: string } => iface.device !== undefined)
    const ifacesWithmergedDevices = ifacesWithDevice.map(iface => ({
      name: iface.interface,
      prettyName: this.getName(iface),
      devices: [...(iface.subdevices ?? []), iface.device]
    }))
    const ifacesWithoutLo = ifacesWithmergedDevices.filter(iface => iface.name !== 'loopback')
    const availDevices = ifacesWithoutLo.map(iface => iface.devices).flat()
    const availDevicesNoDublicates = [...new Set(availDevices)]
    const sortedDevices = availDevicesNoDublicates.sort()
    const devicesWithIfaces = sortedDevices.map(device => {
      const interfaces = ifacesWithoutLo.filter(iface => iface.devices.includes(device))
      const interfaceNames = interfaces.map(iface => iface.prettyName)
      return { name: device, interfaces: interfaceNames }
    })
    const options: StringTuple[] = []
    devicesWithIfaces.forEach(device => {
      const deviceName = typeof device.name === 'object' && 'name' in device.name ? device.name.name : device.name
      if (options.some(option => option[0] === deviceName)) return
      options.push([deviceName, `${deviceName} (${device.interfaces.join(', ')})`])
    })
    return options
  },

  dynamicRoutesInterfaces(availableInterfaces: AvailableInterfaces[]): StringTuple[] {
    // excluding xfrm since it's vpn service
    const options: StringTuple[] = []
    availableInterfaces.forEach(x => {
      const dynamicRoutes = this.dynamicRoutes() as Record<string, string>
      const prettyIfname = !Object.keys(dynamicRoutes).includes(x.service as string) && x.service !== 'openvpn' ? x.ifname : ''
      // ifname of openvpn starts with tun_s (for server) or tun_c (for client)
      if (x.service === 'openvpn') options.push([x.ifname, [prettyIfname, x.parent ?? '', x.ifname.startsWith('tun_s') ? i18n.t('(OpenVPN Server)') : i18n.t('(OpenVPN Client)')].join(' ')])
      else {
        options.push([
          x.ifname,
          [
            prettyIfname,
            x.parent,
            x.child ? x.child : '',
            x.service ? this.getDynamicRoute(x.service) : '',
            x.interfaces ? `(${x.interfaces?.join(', ')})` : '',
            x.ports ? `(${x.ports?.join(', ')})` : ''
          ].join(' ')
        ])
      }
    })
    return options
  },

  /**
   * Creates tunnel interface options for dropdowns/selects
   * @param interfaces - Array of interface objects
   * @param options - Configuration options
   * @param options.addSuffix - Whether to add '_4' or '_6' suffix
   * @param options.includeAll - Whether to include all interfaces
   */
  createTunnelOptions(
    interfaces: Interface[],
    options?: Partial<{
      addSuffix: 'ipv4' | 'ipv6'
      includeAll: boolean
      ipv6Suffix: boolean
    }>
  ): StringTuple[] {
    const { addSuffix = false, includeAll = false } = options || {}
    return interfaces.reduce<StringTuple[]>((acc, iface) => {
      if (iface.ifname === 'lo') return acc
      const name = this.getName(iface)
      if (includeAll) return [...acc, iface.proto === 'wwan' || iface.proto === 'connm' ? [name, name.toUpperCase()] : [name, `${name.toUpperCase()} (${iface.ifname})`]]
      const ifName = iface.ifname ?? i18n.t('No physical interface')
      if (['pppoe', 'static', 'dhcp', 'dhcpv6'].includes(iface.proto)) return [...acc, [iface.id, `${name.toUpperCase()} (${ifName})`]]
      if (['wwan', 'connm'].includes(iface.proto)) {
        const suffixes = {
          ipv4: '_4',
          ipv6: '_6'
        }
        const suffix = addSuffix ? suffixes[addSuffix] : ''
        return [...acc, [iface.id + suffix, name.toUpperCase()]]
      }
      return acc
    }, [])
  },

  /**
   * parses internet status
   * @param data - internet status data
   */
  parseInternetStatus(data: { ipv4_status: string; ipv6_status: string; dns_status: string }): { title: string; slotName: string; info: string; style?: string }[] {
    const statusCodesDns: Record<string, { info: string; style?: string }> = {
      Online: {
        info: i18n.t('Available'),
        style: 'success'
      },
      Offline: {
        info: i18n.t('Unavailable'),
        style: 'error'
      },
      Untracked: {
        info: i18n.t('Untracked')
      }
    }
    const statusCodes: Record<string, { info: string; style?: string }> = {
      Online: {
        info: i18n.t('Online'),
        style: 'success'
      },
      Offline: {
        info: i18n.t('Offline'),
        style: 'error'
      },
      Untracked: {
        info: i18n.t('Untracked')
      }
    }
    return [
      {
        title: i18n.t('IPv4 status'),
        slotName: 'ipv4_status',
        ...(statusCodes[data.ipv4_status] ?? { info: '-' })
      },
      {
        title: i18n.t('IPv6 status'),
        slotName: 'ipv6_status',
        ...(statusCodes[data.ipv6_status] ?? { info: '-' })
      },
      {
        title: i18n.t('DNS status'),
        slotName: 'dns_status',
        ...(statusCodesDns[data.dns_status] ?? { info: '-' })
      }
    ]
  },

  /**
   * translates network type
   * networkType - raw network type name
   * @returns translated network type name
   */
  parseNetworkType(networkType: string | undefined): string {
    if (!networkType) return '-'
    const networkTypes: Record<string, string> = {
      wired: i18n.t('Wired'),
      mobile: i18n.t('Mobile'),
      wireless: i18n.t('Wireless'),
      bridge: i18n.t('Bridge')
    }
    return networkTypes[networkType] ?? '-'
  },

  /**
   * @param area_type - interface area type. Needed only for inputOptions generation.
   * @param hasMobile - does device has mobile. Needed only for inputOptions generation.
   */
  getInterfaceProtocols(area_type?: Interface['area_type'], hasMobile = false) {
    const store = useMainStore()
    const mobileVal = store!.board!.custom_proto ?? 'wwan'
    const isSwitch = store.isSwitch
    return useOptions(
      computed(() => [
        { value: 'none', name: i18n.t('None'), help: i18n.t('Unspecified protocol.'), depend: !isSwitch },
        { value: 'static', name: i18n.t('Static'), help: i18n.t('Interface is manually configured by user.') },
        {
          value: 'dhcp',
          name: i18n.t('%s client').format('DHCPv4'),
          help: i18n.t('%s only interface is automatically configured by %s server.').format('IPv4', 'DHCPv4'),
          depend: isSwitch || area_type === 'wan'
        },
        {
          value: 'dhcpv6',
          name: i18n.t('%s client').format('DHCPv6'),
          help: i18n.t('%s only interface is automatically configured by %s server.').format('IPv6', 'DHCPv6'),
          depend: isSwitch || area_type === 'wan'
        },
        {
          value: 'pppoe',
          name: i18n.t('%s client').format('PPPoE'),
          help: i18n.t('Interface is automatically configured by PPPoE server. Most frequently used to establish DSL connection.'),
          depend: !isSwitch && area_type === 'wan'
        },
        { value: mobileVal, name: i18n.t('Mobile'), help: i18n.t('Used to establish mobile connection.'), depend: !isSwitch && area_type === 'wan' && hasMobile }
      ])
    )
  },

  isStdProto(status: InterfaceStatus) {
    return ['static', 'dhcp', 'dhcpv6', 'pppoe', 'none'].includes(status.proto ?? 'none')
  },
  isMobileProto(status: InterfaceStatus) {
    return ['wwan', 'connm'].includes(status.proto ?? 'none')
  },
  isVpnProto(status: InterfaceStatus) {
    return !network.isStdProto(status) && !network.isMobileProto(status)
  },
  isMobileBridgeIp(status: InterfaceStatus[], ip: string) {
    return status.some(s => network.isMobileProto(s) && ['bridge', 'passtrough'].includes(s.data.method) && s.data.bridge_ipaddr === ip)
  },

  getName,

  validateDhcpV6Enable(section: DhcpV6Config, external = false) {
    const message = useMessages()
    const notification = useNotifications()
    const id = `dhcpv6-disabled-${section.id}`
    if (section.enable_dhcpv6 === '0') return
    if (!section.ra && !section.dhcpv6 && !section.ndp) {
      const error = i18n.t('At least one DHCPv6 server service must be enabled.')
      section.enable_dhcpv6 = '0'
      if (external) {
        notification.remove(id)
        notification.error({
          id,
          title: i18n.t('Cannot enable DHCPv6 server'),
          text: error,
          important: true,
          action: { text: i18n.t('Go to DHCPv6 server settings'), to: `/network/dhcp_servers/general/ipv6?edit=${section.id}` }
        })
      } else {
        message.error(error)
      }
    }
  },

  zoneNames() {
    return {
      actions: {
        ACCEPT: i18n.t('Accept'),
        REJECT: i18n.t('Reject'),
        DROP: i18n.t('Drop')
      },
      extraActions: {
        DSCP: i18n.t('Change DSCP'),
        MARK: i18n.t('Mark'),
        NOTRACK: i18n.t('Do not track'),
        TTL: i18n.t('Change TTL'),
        TCPMSS: i18n.t('Clamp MSS')
      },
      other: {
        device: i18n.t('Device'),
        unspecified: i18n.t('Unspecified'),
        any: i18n.t('Any zone')
      }
    }
  },
  parseInterfaceAndVpnOptions(interfaces: InterfaceStatus[], parseOptions?: { useInterfaceId: boolean }): [string, string][] {
    return interfaces.map(iface => {
      const posfix = iface.proto === 'gre' ? '_static' : ''
      const id = `${iface.id}${posfix}`
      const idname = `${iface.name}${posfix}`
      return [parseOptions?.useInterfaceId ? id : idname || id, iface?.description || iface?.name || id]
    })
  },
  getInterfaceAndVpnName,
  statusContext,
  checkRutDhcpConflicts(interfaceConfig: Interface[], dhcpv4Config: DhcpV4Config[], dhcpSection: DhcpV4Config, message: string, networkDevices: DeviceStatus[]): string {
    const getDevId = (ifname?: string) => {
      if (!ifname) return []
      const devStatus = networkDevices.find(dev => [dev.name, dev.id].includes(ifname)) || ({} as Partial<DeviceStatus>)
      const id = devStatus.id || devStatus.name || ifname
      const name = devStatus.description || devStatus.name || ifname
      return [id, name]
    }
    const currentIface = interfaceConfig.find(iface => iface.id === dhcpSection.id)
    if (!currentIface) return ''
    const ifname = currentIface.bridge === '1' ? `br_${currentIface.id}` : currentIface.ifname?.toString()
    if (!ifname) return ''
    const [devId, devName] = getDevId(ifname)
    const conflictingInterfaces = interfaceConfig.filter(iface => iface.id !== currentIface.id && devId === (iface.bridge === '1' ? `br_${iface.id}` : getDevId(iface.ifname?.toString())[0]))
    const hasConflictingDhcp = conflictingInterfaces.some(iface => dhcpv4Config.some(dhcp => dhcp.id === iface.id && dhcp.enable_dhcpv4 === '1'))
    return hasConflictingDhcp && dhcpSection.enable_dhcpv4 === '1' ? message.format(devName) : ''
  },
  checkSwitchDhcpConflicts(interfaceConfig: TswInterface[], dhcpv4Config: DhcpV4Config[], dhcpSection: DhcpV4Config, message: string): string {
    const conflictingInterfaces = interfaceConfig.filter(iface => interfaceConfig.some(i => i.id !== iface.id && i.vlan_id && iface.vlan_id && i.vlan_id === iface.vlan_id))
    const enabledDhcps = conflictingInterfaces.filter(iface => dhcpv4Config.some(dhcp => dhcp.id === iface.id && dhcp.enable_dhcpv4 === '1'))
    const currentDhcp = conflictingInterfaces.find(iface => dhcpSection.id === iface.id && dhcpSection.enable_dhcpv4 === '1')
    return enabledDhcps.length > 1 && currentDhcp ? message.format(`VLAN${currentDhcp.vlan_id}`) : ''
  },
  getMultiDeviceDhcpMsg(interfaceConfig: GenericInterface[], dhcpv4Config: DhcpV4Config[], dhcpSection: DhcpV4Config, networkDevices?: DeviceStatus[]): string {
    const message = i18n.t('Interfaces that share the same device (%s) and have DHCPv4 enabled will cause server conflicts.')
    const store = useMainStore()
    return store.isSwitch
      ? this.checkSwitchDhcpConflicts(interfaceConfig as TswInterface[], dhcpv4Config, dhcpSection, message)
      : this.checkRutDhcpConflicts(interfaceConfig as unknown as Interface[], dhcpv4Config, dhcpSection, message, networkDevices || [])
  },
  commonHints: {
    dhcpv4mode(): HintHelperProps {
      return {
        mainHint: i18n.t('Specifies DHCPv4 mode.'),
        hints: [
          {
            hint: i18n.t('This device will be used to handle IP assigning.'),
            option: i18n.t('Server')
          },
          {
            hint: i18n.t('Specified server will be used to handle IP assigning.'),
            option: i18n.t('Relay')
          }
        ]
      }
    }
  }
}

/**
 * gets pretty name of an interface
 * @returns interface's pretty name
 */
function getName(iface: GenericInterface | Interface): string
function getName(iface: InterfaceStatus): string
function getName(iface: Partial<InterfaceStatus>): string | undefined
function getName(iface: GenericInterface | Interface | Partial<InterfaceStatus>): string | undefined {
  return iface.name || iface.id
}

function getInterfaceAndVpnName(interfaces: InterfaceStatus[], id: string[], key: 'id' | 'name', fallback?: string): string[]
function getInterfaceAndVpnName(interfaces: InterfaceStatus[], id: string, key: 'id' | 'name', fallback?: string): string
function getInterfaceAndVpnName(interfaces: InterfaceStatus[], id: string | string[], key: 'id' | 'name', fallback?: string): string | string[] | undefined {
  if (Array.isArray(id)) return id.map(singleID => getInterfaceAndVpnName(interfaces, singleID, key))
  const iface = interfaces.find(iface => `${iface[key]}${iface.proto === 'gre' ? '_static' : ''}` === id)
  if (!iface) return fallback ?? id
  return iface.description || iface.name || iface.id
}

export default {
  install(app: App) {
    app.config.globalProperties.$network = network
  }
}
