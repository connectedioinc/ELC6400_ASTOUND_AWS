import type { Zone, Nat } from '@/types/firewallTypes'
import type { InjectionKey, Ref } from 'vue'

export interface FormOptions {
  ipv4Hints: Ref<[string, string][]>
  zones: Ref<Zone[]>
  zoneOptions: Ref<string[]>
}

export interface FormModel {
  natRules: Nat[]
}

export const FormOptionKey = Symbol('NatRulesCommonFormOptions') as InjectionKey<FormOptions>
