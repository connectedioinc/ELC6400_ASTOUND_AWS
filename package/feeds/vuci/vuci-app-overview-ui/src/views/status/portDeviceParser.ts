import type { InterfaceQQVLAN, InterfaceVLAN, PortVLAN } from '@/types/vlanTypes'
import type { DeviceStatus } from '@/types/networkDeviceTypes'
import { useMainStore, type Network } from '@/stores/main'
import type { WifiInterfaceStatus } from '@/types/wirelessTypes'
import { useTranslate } from '@ui-core/composables/useI18n'

function getVlanDevices(vlanData: Record<string, string> | undefined, invert = false): string[] | undefined {
  if (!vlanData) return
  return Object.entries(vlanData)
    .filter(([, value]) => (invert ? value === '' : ['u', 't'].includes(value)))
    .map(([key]) => key)
}
function parsePortBased(iface: string, portBased: PortVLAN[]): string[] | undefined {
  const store = useMainStore()
  // For DSA these VLANs are done thru parseBridge
  if (!store.board!.hwinfo.dsa && iface.startsWith('eth')) {
    // Default vlan interface is eth0, eth1 ... ethX-1, created - eth0.1, eth0.2 ... eth0.X when X is vid
    const createdVlan = iface.match(/^eth0\.(\d+)$/)?.[1]
    const defaultVlan = iface.match(/^eth(\d+)$/)?.[1]
    const vlanId = createdVlan ?? (defaultVlan === undefined ? undefined : (parseInt(defaultVlan) + 1).toString())
    return vlanId === undefined ? undefined : getVlanDevices(portBased.find(e => e.vid === vlanId))
  }
}
function parseBridge(iface: string, portBased: PortVLAN[], bridgeStatus: DeviceStatus[]): string[] | undefined {
  const store = useMainStore()
  const [, device, vlanId = '1'] = iface.match(/^([^.]*)(?:\.(\d+))?$/) ?? []
  const devicesFromBridge = bridgeStatus.find(bridge => bridge.name === device)?.['bridge-members']
  if (store.board!.hwinfo.dsa) {
    const devicesFromVlanBridge = portBased.find(e => e.device === device && e.vid === vlanId)
    if (vlanId === '1') {
      const offVlanDevices = getVlanDevices(devicesFromVlanBridge, true)
      return devicesFromBridge?.filter(e => !offVlanDevices || !offVlanDevices.includes(e))
    } else {
      const vlanDevices = getVlanDevices(devicesFromVlanBridge)
      return devicesFromBridge?.filter(e => !vlanDevices || vlanDevices.includes(e))
    }
  }
  return devicesFromBridge
}
// workaround till we get ports in board json for usb and for devices that doesn't have switch
function parseDefaultPort(ifname: string): string | undefined {
  const store = useMainStore()
  if (['ecm0', 'rndis0', 'usb0'].includes(ifname)) return 'usb'
  const getFromNetworkBoard = (networkName: 'lan' | 'wan') => {
    const network = store.board!.network[networkName] ?? ({} as Partial<(Network['lan'] | Network['wan']) & {}>)
    const devices = [network.device, ...(network.ports ?? [])]
    if (!devices.includes(ifname)) return undefined
    if (ifname.startsWith(networkName)) return ifname
    return networkName
  }
  return getFromNetworkBoard('lan') ?? getFromNetworkBoard('wan')
}
function translateIfaceBased(ifname: string, ifaceBasedConfig: InterfaceVLAN[], ifaceBasedDevices: InterfaceQQVLAN[]) {
  const qqdevice = ifaceBasedDevices.find(device => device.name === ifname)
  if (qqdevice) return ifaceBasedConfig.find(device => device.name === qqdevice.ifname)?.ifname ?? null
  const device = ifaceBasedConfig.find(device => device.name === ifname)
  if (device) return device.ifname
  return null
}

function getWireless(ifname: string, wirelessStatus: WifiInterfaceStatus[]) {
  return wirelessStatus.find(e => e.devices.some(dev => dev.ifname === ifname))?.ssid
}

function getMaybePortDevices(
  ifname: string,
  ifaceBasedConfig: InterfaceVLAN[],
  ifaceBasedDevices: InterfaceQQVLAN[],
  portBasedConfig: PortVLAN[],
  bridgeStatus: DeviceStatus[],
  wirelessStatus: WifiInterfaceStatus[]
): { name: string; type: 'port' | 'wireless' }[] | undefined {
  const wireless = getWireless(ifname, wirelessStatus)
  if (wireless) return [{ name: wireless, type: 'wireless' }]
  const ifaceBased = translateIfaceBased(ifname, ifaceBasedConfig, ifaceBasedDevices)
  if (ifaceBased) return getMaybePortDevices(ifaceBased, ifaceBasedConfig, ifaceBasedDevices, portBasedConfig, bridgeStatus, wirelessStatus)
  const bridge = parseBridge(ifname, portBasedConfig, bridgeStatus)
  if (bridge) return bridge.flatMap(bridgeMember => getMaybePortDevices(bridgeMember, ifaceBasedConfig, ifaceBasedDevices, portBasedConfig, bridgeStatus, wirelessStatus)).filter(e => !!e)
  const portBased = parsePortBased(ifname, portBasedConfig)
  if (portBased) return portBased.map(port => ({ name: port, type: 'port' }))
  const defaultPort = parseDefaultPort(ifname)
  if (defaultPort) return [{ name: defaultPort, type: 'port' }]
}

export function parse(
  ifname: string | undefined,
  ifaceBasedConfig: InterfaceVLAN[],
  ifaceBasedDevices: InterfaceQQVLAN[],
  portBasedConfig: PortVLAN[],
  bridgeStatus: DeviceStatus[],
  wirelessStatus: WifiInterfaceStatus[]
): string {
  const $t = useTranslate()
  if (!ifname) return ''
  const devices = getMaybePortDevices(ifname, ifaceBasedConfig, ifaceBasedDevices, portBasedConfig, bridgeStatus, wirelessStatus)
  if (!devices) return ''
  const noDublicateDevices = devices.filter((devA, i) => devices.findIndex(devB => devA.name === devB.name && devA.type === devB.type) === i)
  const ports = noDublicateDevices
    .filter(e => e.type === 'port')
    .map(e => e.name.toUpperCase())
    .sort()
  const wireless = noDublicateDevices.filter(e => e.type === 'wireless').map(e => e.name)
  if (wireless.length) ports.push(`${$t('Wireless')} (${wireless.join(', ')})`)
  return ports.join(', ')
}
