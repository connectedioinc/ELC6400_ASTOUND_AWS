export interface DevmanDeviceConfig {
  id: string
  enabled?: '1' | '0'
  mac: string
  '.type': 'device'
  group_name?: string
  group_id?: string
  custom_name?: string
  devicename?: string
  device_type?: string
  hostname?: string
  sync_ntp?: '1' | '0'
}

export interface DevmanGlobalConfig {
  id: string
  enabled?: '1' | '0' | 'enabled'
  password?: string
  password_config?: string
}

export interface DevmanGroupConfig {
  id: string
  default: '1' | '0'
  name: string
  platform?: 'default' | 'switch'
  devices?: string[]
  '.type': 'group'
}

export interface DevmanDeviceError {
  name: number
  message: string
  timestamp: string
}

export interface DevmanDeviceStatus {
  syncing: boolean
  platform: string
  group_name?: string
  id: string
  api_version: string
  group_id: string
  firmware_version: number
  online: boolean
  mac: string
  hostname?: string
  device_type: string
  paired: boolean
  devicename?: string
  sync_next_retry: string
  pair_status: number
  firmware_status: string
  duplicated: boolean
  ip: string
  expanded: boolean
  original_group: string | null
  custom_name?: string
  custom_status: string
  isUpdating: boolean
  latest_available_firmware?: string
  device_mac?: string
  updateGroup?: boolean
  errors?: DevmanDeviceError[]
  statusTime?: {
    time: string
    formatedTime: string
  }
}

export interface DevmanFormData {
  devices: DevmanDeviceStatus[]
  interfaces?: any[]
  wireless_devices?: any[]
  portsSettings?: any[]
  bridge_vlan?: any[]
  switchInterfaces?: any[]
}
