import type { App } from 'vue'
import * as NetworkDevices from './networkDevices'
import type { DeviceConfig, BridgeConfig, DeviceStatus, SwitchPorts, SwitchVlan } from '@/types/networkDeviceTypes'
import { i18n } from '@ui-core/plugins/i18n'
import { useMainStore } from '@/stores/main'
import type { InterfaceStatus } from '@/types/networkTypes'
import { network } from './network'

export function getDeviceTypes(): Record<string, string> {
  return {
    ethernet: i18n.t('Ethernet'),
    bridge: i18n.t('Bridge'),
    vxlan: 'VXLAN',
    wifi: 'Wi-Fi'
  }
}

export function getDeviceNames(): Record<string, string> {
  return {
    eth0: 'ethernet',
    eth1: 'ethernet',
    rndis0: 'usb0',
    ecm0: 'usb0'
  }
}

export function getDeviceTypeOptions(): [string, string][] {
  const store = useMainStore()
  const options: [string, string][] = []
  if (store.board.hwinfo.dsa) options.push(['bridge', i18n.t('Bridge')])
  if (store.hasPackages('vuci-app-vxlan-ui.control')) options.push(['vxlan', 'VXLAN'])
  return options
}

export function getName(device: DeviceConfig): string {
  return device.name || device.id
}

export function getPortName(device: DeviceConfig | { id: string }): string {
  const match = device.id?.match(/^([a-z0-9]+)_dev$/i)
  const match_dsa = device.id?.match(/^_([a-z0-9]+)_mtu$/i)
  return match?.[1] ?? match_dsa?.[1] ?? device.id
}

export function getBridgeMembers(section: BridgeConfig, status: DeviceStatus[]): string[] {
  if (section.type !== 'bridge') return []
  const sectionMembers = section?.ports ?? []
  const statusMembers = status.find(e => e.id === section.id)?.['bridge-members'] ?? []
  return [...new Set([...sectionMembers, ...statusMembers])].sort()
}

export function parseDeviceName(section: BridgeConfig, status: DeviceStatus[]): string {
  const bridgeMembers = getBridgeMembers(section, status)
  const device = status.find(dev => dev.id === section.id)
  if (section.type === 'bridge' && bridgeMembers.length > 0) return `${section.name} (${bridgeMembers.join(', ')})`
  if (['8021q', '8021ad'].includes(section.type) && device && device.parent && device.vid) return `${section.name} (${i18n.t('main')}: ${device.parent}; ${i18n.t('tag')}: ${device.vid})`
  return section.name
}

export function getPhysicalPorts(): string[] {
  const store = useMainStore()
  const lanPorts = (store.board.network?.lan?.ports ?? []) as string[]
  const defaultLanIfname = store.board.network?.lan?.device
  const defaultWanIfname = store.board.network?.wan?.device
  const switchPorts = store.board.switch?.switch0?.ports as SwitchPorts[]
  const defaultDevices = getDeviceNames()
  const switchDevPorts = switchPorts // TODO Re-check with non-DSA devices
    ?.filter(port => !port.device)
    ?.map(port => `${port.role}${port.index ?? ''}`)
    .sort()
  const regularPorts = lanPorts?.map(p => defaultDevices[p] ?? p) ?? [defaultDevices[defaultLanIfname] ?? defaultLanIfname]
  if (defaultWanIfname && !switchDevPorts?.includes('wan')) switchDevPorts?.push('wan')
  return store.board.hwinfo.dsa ? store.allPortDevices.sort() : (switchDevPorts ?? regularPorts)
}

export function getBridgePortsWarning(devStatus: DeviceStatus[], section: BridgeConfig, switchVlan: SwitchVlan[] = [], devices: BridgeConfig[]) {
  const store = useMainStore()
  const multiTag = store.board.hwinfo.multi_tag
  const dsa = store.board.hwinfo.dsa
  const checkPortUsage = (port: string, currentVlan?: SwitchVlan, vlans?: SwitchVlan[]) => {
    const vlanCheck = multiTag
      ? currentVlan?.[port] === 'u' && vlans?.some(vlan => vlan[port] === 'u')
      : ['u', 't'].includes(currentVlan?.[port]) && vlans?.some(vlan => ['u', 't'].includes(vlan[port]))
    return !dsa && currentVlan ? vlanCheck && section.ports?.includes(port) : section.ports?.includes(port)
  }
  const currentVlan = switchVlan.find(vlan => vlan?.device_name === section.id)
  const vlans = switchVlan.filter(vlan => vlan.device_name !== section.id)
  const usedBridgeNames = new Set<string>()
  const usedbridgePorts = new Set<string>()
  devices
    .filter(dev => dev.id !== section.id && dev.type === 'bridge')
    .forEach(bridge => {
      const bridgeMembers = getBridgeMembers(bridge, devStatus)
      bridgeMembers.forEach(p => {
        if (checkPortUsage(p, currentVlan, vlans)) {
          usedbridgePorts.add(p)
          usedBridgeNames.add(bridge.name)
        }
      })
    })
  const bridgeMsg = i18n
    .t('Selected port(s) "%s" are being used by the bridge(s) "%s". Saving the form will remove them from the bridge configuration(s).')
    .format([...usedbridgePorts], [...usedBridgeNames])
  return usedbridgePorts.size ? bridgeMsg : ''
}

export function getIfaceBridgeWarning(ifaces: InterfaceStatus[], section: BridgeConfig) {
  const usedDevicesIfaces = ifaces.filter(iface => section.ports?.includes(getPortName({ id: iface.device ?? '' })))
  const usedIfacesNames = usedDevicesIfaces.map(network.getName).join(', ')
  const usedPorts = [...new Set(usedDevicesIfaces.map(iface => getPortName({ id: iface.device ?? '' })))].join(', ')
  const ifaceMsg = i18n.t('Interface(s) "%s" will become inoperable after bridging "%s" port(s).').format(usedIfacesNames, usedPorts)
  return usedDevicesIfaces.length ? ifaceMsg : ''
}

export default {
  install(app: App) {
    app.config.globalProperties.$networkDevices = NetworkDevices
  }
}
