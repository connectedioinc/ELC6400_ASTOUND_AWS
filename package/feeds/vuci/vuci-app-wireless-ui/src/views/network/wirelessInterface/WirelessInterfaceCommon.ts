import type { Interface, InterfaceStatus, TapInterface } from '@/types/networkTypes'
import type { BridgeConfig, DeviceStatus } from '@/types/networkDeviceTypes'
import type { WifiInterface, WifiAp, WifiDevice, WifiDeviceStatus, WifiInterfaceStatus, WifiDeviceOptions, WifiVlan, WifiStation, WifiPpskGroup } from '@/types/wirelessTypes'
import type { GeneratedCert } from '@/types/certTypes'
import type { InjectionKey, Ref } from 'vue'

export interface FormOptions {
  macAddresses: Ref<[string, string][]>
  deviceOptions: Ref<WifiDeviceOptions[]>
  deviceStatus: Ref<WifiDeviceStatus[]>
  wifiInterfaceStatus: Ref<WifiInterfaceStatus[]>
  certData: Ref<GeneratedCert[]>
  interfaceConfigs: Ref<Array<Interface | TapInterface>>
  interfaceStatus: Ref<Array<InterfaceStatus>>
  bridgeConfigs: Ref<BridgeConfig[]>
  deviceConfigs: Ref<WifiDevice[]>
  networkDeviceStatus: Ref<DeviceStatus[]>
  wifiPpskGroups: Ref<WifiPpskGroup[]>
  updateInterfaces: () => Promise<void>
}

export interface FormModel {
  wifiInterfaces: WifiInterface[]
  multiAccessPoints: WifiAp[]
  wifiVlans: WifiVlan[]
}

export const FormOptionKey = Symbol('WirelessFormOptions') as InjectionKey<FormOptions>
export const FormDataKey = Symbol('WirelessFormData') as InjectionKey<Ref<FormModel>>
