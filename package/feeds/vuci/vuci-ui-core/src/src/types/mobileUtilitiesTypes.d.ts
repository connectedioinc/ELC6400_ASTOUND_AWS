import type { UCISection } from '@ui-core/types'
import type { Io } from '@/types/ioTypes'
import type { ModemInfo } from '@/types/mobileTypes'

export type AuthorizationOptions = 'no' | 'serial' | 'password' | 'local'
export type PhoneOptions = 'all' | 'group' | 'single'
export type UtilitiesAction =
  | 'reboot'
  | 'send_status'
  | 'vpnstatus'
  | 'mobile'
  | 'change_mobile_settings'
  | 'reset_conn'
  | 'list_of_profile'
  | 'vpn'
  | 'change_profile'
  | 'ssh_access'
  | 'web_access'
  | 'ip_unblock'
  | 'firstboot'
  | 'userdefaults'
  | 'fw_upgrade'
  | 'monitoring_status'
  | 'uci'
  | 'rms_status'
  | 'rms_action'
  | 'rms_connect'
  | 'more'
  | 'exec'
  | 'config_reload'
  | 'api'
  | 'iostatus'
  | 'io_set'
  | 'dout'
  | 'relay'
  | 'switch_sim'
  | 'gps'
  | 'gps_coordinates'
  | 'wol'
  | 'data_usage_reset'
  | 'data_limit'
  | 'wifi'
  | 'esim_list'
  | 'esim_change'
  | 'esim_install'

export interface MobileUtilitiesOptions {
  actions: UtilitiesAction[]
  parameters: UtilitiesParameter[]
  userGroups: UserGroup[]
  schedulerInfo: UCISection[]
  mobileModems: ModemInfo[]
  ios: Io[]
}

export interface UtilitiesParameter {
  id: string
  type: string
  description: string
}

export interface UserGroup {
  id: string
  name: string
  tel: string[]
}

export type UciDataMap = {
  sms_utilities: SmsFormData['sms_utilities']
  call_utilities: CallFormData['call_utilities']
}

export interface SmsFormData {
  sms_utilities: SmsUtilitiesSection[]
}
export interface SmsUtilitiesSection extends BaseUtilitiesSection, FullAuthorization {
  smstext: string
}

export interface CallFormData {
  call_utilities: SmsUtilitiesSection[]
}
export interface CallUtilitiesSection extends BaseUtilitiesSection, BaseAuthorization {}

interface BaseUtilitiesSection extends UCISection {
  enabled: '1' | '0'
  action: UtilitiesAction
  io?: string
  pin?: string
}

export interface FullAuthorization extends BaseAuthorization {
  authorization: AuthorizationOptions
  password?: string
  isPasswordSet?: boolean
}

export interface BaseAuthorization {
  allowed_phone: PhoneOptions
  tel?: string
  group?: string
}
