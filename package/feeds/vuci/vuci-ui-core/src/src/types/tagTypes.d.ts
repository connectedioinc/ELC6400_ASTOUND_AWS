import type { Dnp3Group } from '@/types/dnp3Types'
import type { ModbusReadFunctionType } from '@/types/modbusTypes'

export type TagType = 'bool' | 'int8' | 'uint8' | 'int16' | 'uint16' | 'int32' | 'uint32' | 'int64' | 'uint64' | 'float32' | 'float64' | 'string' | 'binary' | 'unknown'
export type TagConfigType = Exclude<TagType, 'unknown'>
export type FixedSizeTagType = Exclude<TagConfigType, 'string' | 'binary'>
export type TagPermissions = 'r' | 'w' | 'rw'
export type Dnp3TagGroup = Exclude<Dnp3Group, '21'>
// tag_range combines tag_start and tag_count
export type DynamicTagConfigOption = 'tag_range' | 'tag_type' | 'tag_permissions'
export type TagConsumer = 'dnp3_outstation' | 'dnp3_serial_outstation' | 'modbus_server' | 'modbus_serial_server' | 'snmp' | 'opcua_server'

export interface Tag {
  id: string
  pretty_name: string
  source: string
  type: TagType
  permissions: TagPermissions

  // If `value_count` is undefined, it means that it's value isn't known at configure-time
  // The `value_count` can only be known after reading it and it's not guarenteed that
  // it won't change over time.
  //
  // This will be common for protocols which support reading a variable length array, that means
  // it's not possible to know the size of that array up front.
  //
  // In such a case the user should be allowed to configured the maximum size of that array if the
  // data source requires a configure-time known array length. For example in Modbus Server it's required
  // to know the size of an array up front.
  value_count?: number
}

interface BaseTagConfig {
  id: string
  enabled?: '1' | '0'
  tag_name?: string
  tag_id?: string
  tag_source?: string
  tag_start?: string
  tag_count?: string
  tag_type?: TagConfigType
  tag_size?: string
  tag_permissions?: TagPermissions
  '.type': 'tag'
}

export interface ModbusServerTagConfig extends BaseTagConfig {
  modbus_dev_config?: string
  modbus_type?: ModbusReadFunctionType
  modbus_reg_num?: string
}

export interface Dnp3OutstationTagConfig extends BaseTagConfig {
  outstation_dev_id?: string
  dnp3_index?: string
  dnp3_group?: Dnp3TagGroup
  dnp3_variation?: string
}

export interface SnmpTagConfig extends BaseTagConfig {
  snmp_tag_oid?: string
}

export type TagConfig = ModbusServerTagConfig | Dnp3OutstationTagConfig | SnmpTagConfig // add other configs with |

export interface TagFormData {
  tags: TagConfig[]
  [key: string]: any
}
