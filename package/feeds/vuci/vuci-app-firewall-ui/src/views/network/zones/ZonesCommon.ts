import type { Zone, ZoneGlobal } from '@/types/firewallTypes'
import type { InterfaceStatus } from '@ui-core/tlt-design/form/core/TltZoneSelect.vue'
import type { InjectionKey, Ref } from 'vue'

export interface FormOptions {
  interfaceStatus: Ref<InterfaceStatus[]>
  refreshZones: (zone: Zone) => Promise<void>
  zoneGlobalConfig: Ref<ZoneGlobal | null>
}

export interface FormModel {
  zones: Zone[]
}

export const FormOptionKey = Symbol('ZoneFormOptions') as InjectionKey<FormOptions>
