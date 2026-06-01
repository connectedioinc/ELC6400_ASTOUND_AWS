import type { InjectionKey, Ref } from 'vue'
import type { WifiInterfaceStatus } from '@/types/wirelessTypes'
import type { DeviceStatus } from '@/types/networkDeviceTypes'
import type { Interface, InterfaceStatus } from '@/types/networkTypes'

export interface SqmConfig {
  id: string
  enabled: '0' | '1'
  interface: string
  download: string
  upload: string
  qdisc: 'cake' | 'fq_codel'
  script: string
}

export interface FormOptions {
  deviceData: Ref<DeviceStatus[]>
  wirelessData: Ref<WifiInterfaceStatus[]>
  interfacesConfig: Ref<Interface[]>
  interfaceStatus: Ref<InterfaceStatus[]>
  fqCodel: Ref<string[]>
  cake: Ref<string[]>
  ipv4Hints: Ref<[string, string][]>
}

export interface FormData {
  sqm: SqmConfig[]
}

export const FormOptionKey = Symbol('SqmFormOptions') as InjectionKey<FormOptions>
