import type { Rule, Zone } from '@/types/firewallTypes'
import type { InjectionKey, Ref } from 'vue'

export interface FormOptions {
  hints: Ref<{ ipv4_hints: [string, string][]; mac_hints: [string, string][] }>
  zones: Ref<Zone[]>
}

export interface FormModel {
  rules: Rule[]
}

export const FormOptionKey = Symbol('TrafficRuleCommonFormOptions') as InjectionKey<FormOptions>
