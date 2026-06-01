import type { InjectionKey, Ref } from 'vue'
import type { PortStatus } from '@/types/portTypes'

export interface Dot1xConfig {
  id: string
  enabled: '1' | '0'
  role: 'client' | 'server'
  use_vlans?: '1' | '0'
  auth_type?: 'md5' | 'ttls' | 'peap' | 'pwd' | 'tls'
  identity?: string
  password?: string
  inner_authentication?: string
  peap_version?: '0' | '1'
  anonymous_identity?: string
  ca_cert?: string
  client_cert?: string
  private_key?: string
  private_key_pass?: string
  radius?: string
  guest_vlan?: string
  fallback_vlan?: string
  authenticated_vlan?: string
  accept_vlan?: string
  eap_retrans_timeout: string
  eap_retrans_count?: string
  [key: `${string}:set`]: any
}

export interface FormModel {
  dot1x: Dot1xConfig[]
}

export interface VlanOption {
  [key: string]: string
}

export interface RadiusOption {
  [key: number]: string
}

export interface Dot1xPortStatus {
  port: string
  code: number
}

export interface VlanMessage {
  code: number
  source: string
  [key: string]: any
}

export interface FormOptions {
  portStatus: Ref<PortStatus[]>
  radiusOptions: Ref<RadiusOption[]>
  vlanOptions: Ref<VlanOption[]>
  vlanError: (messages: VlanMessage[]) => void
}

export const FormOptionKey = Symbol('PortSecurityFormOptions') as InjectionKey<FormOptions>
