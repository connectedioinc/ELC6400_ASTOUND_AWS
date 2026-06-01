import type { PortForward, Zone, ZoneGlobal } from '@/types/firewallTypes'
import type { InjectionKey, Ref } from 'vue'

export interface FormOptions {
  hints: Ref<{ ipv4_hints: [string, string][]; mac_hints: [string, string][] }>
  zones: Ref<Zone[]>
  zonesGlobal: Ref<ZoneGlobal | null>
}

export interface FormModel {
  forwards: PortForward[]
}

export const FormOptionKey = Symbol('PortForwardCommonFormOptions') as InjectionKey<FormOptions>
