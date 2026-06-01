import type { DeviceStatus } from '@/types/networkDeviceTypes'
import { createContext } from '@ui-core/utils/create-context'
import type { Ref } from 'vue'

export interface Vrf {
  id: string
  enabled: '0' | '1'
  name: string
  table: string
  link: string[]
}

export interface VrfGlobal {
  tcp_l3mdev: '0' | '1'
  udp_l3mdev: '0' | '1'
}

export interface FormModel {
  vrf: Vrf[]
  global: Partial<VrfGlobal>
}

export interface FormOptions {
  devices: Ref<DeviceStatus[]>
  getLinkNames: (value?: string[]) => string
}

export const [provideContext, useContext, contextId] = createContext<FormOptions>('VrfFormOptions')
