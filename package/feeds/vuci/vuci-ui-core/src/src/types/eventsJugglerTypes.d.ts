import type { Io } from '@/types/ioTypes'
import type { UCISection } from '@ui-core/types'
import type { ModemInfo } from '@/types/mobileTypes'

export type SectionName = 'events' | 'actions' | 'conditions'
export interface EventsJugglerOptions {
  ioData: Io[]
  profileOptions: BaseOption[]
  phoneGroupOptions: BaseOption[]
  emailGroupOptions: BaseOption[]
  eventsReportingOptions: EventsReportingOptions
  quotaLimitOptions: BaseOption[]
  interfaceOptions: BaseOption[]
  eventOptions: Plugin[]
  modules: MappedModules
  modemOptions: string[][]
  simCount: number
  modemData: ModemInfo[]
  limitData: LimitData
  isPhoneSettingsEnabled: boolean
}
export interface BaseOption {
  id: string
  name?: string
}
export interface EventsReportingOptions {
  params: Parameter[]
  events: Record<string, string[]>
}
export interface Parameter {
  id: string
  type: string
  description: string
}
export interface Plugin {
  name: string
  description: string
  params: Record<string, string>
}
export interface LimitData {
  event: number
  action: number
  condition: number
}
export interface ModuleOptions {
  events: { plugins: Plugin[]; params: Record<string, string[]>; log_events: Record<string, string[]> }
  actions: { plugins: Plugin[] }
  conditions: { plugins: Plugin[] }
}
export type ModuleComponents = Record<string, Vue.Component>
export interface MappedModules {
  events: ModuleComponents
  actions: ModuleComponents
  conditions: ModuleComponents
}
export interface FormData {
  events: EventSection[]
  actions: ActionSection[]
  conditions: ConditionSection[]
}
export interface BaseJugglerSection extends UCISection {
  name?: string
  plugin?: string
}
export interface EventSection extends BaseJugglerSection {
  actions: string[]
  available_conditions?: string[]
}
export interface ActionSection extends BaseJugglerSection {
  conditions?: string[]
}
export type ConditionSection = BaseJugglerSection

export type ModuleComponentRef = Record<string, { moduleBeforeSave: () => Promise<boolean> }>
