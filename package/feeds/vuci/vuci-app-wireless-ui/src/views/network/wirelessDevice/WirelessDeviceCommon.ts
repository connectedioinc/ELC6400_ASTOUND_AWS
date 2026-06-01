import type { InjectionKey, Ref } from 'vue'
import type { WifiDevice, WifiDeviceStatus, WifiDeviceOptions, WifiDeviceGlobal, WifiInterface } from '@/types/wirelessTypes'

export interface FormOptions {
  deviceStatus: Ref<WifiDeviceStatus[]>
  deviceOptions: Ref<WifiDeviceOptions[]>
  wifiInterfaces: Ref<WifiInterface[]>
}

export interface FormData {
  wifiDevice: WifiDevice[]
  wifiGlobal: WifiDeviceGlobal[]
}

export const FormOptionKey = Symbol('WirelessFormOptions') as InjectionKey<FormOptions>
