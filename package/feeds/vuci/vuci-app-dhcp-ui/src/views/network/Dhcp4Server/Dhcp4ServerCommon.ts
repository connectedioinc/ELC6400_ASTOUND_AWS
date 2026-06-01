import type { DhcpV4Config } from '@/types/dhcpTypes'
import type { GenericInterface as Interface } from '@/types/networkTypes'
import type { InjectionKey, Ref } from 'vue'

export interface FormOptions {
  interfaceData: Ref<Interface[]>
}

export interface FormModel {
  dhcpv4: DhcpV4Config[]
}

export const FormOptionKey = Symbol('DhcpServerV4FormOptions') as InjectionKey<FormOptions>
