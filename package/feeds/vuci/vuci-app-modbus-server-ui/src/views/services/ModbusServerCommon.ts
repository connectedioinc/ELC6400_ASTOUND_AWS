import type { DataBits, FlowControl, Parity, StopBits } from '@/plugins/serial'
import type { InjectionKey, Ref } from 'vue'

export interface ModbusTcpServerConfig {
  id: string
  enabled?: '1' | '0'
  port: string
  device_id: string
  allow_ra: '1' | '0'
  keepconn?: '1' | '0'
  timeout: string
  clientregs?: '1' | '0'
  regfile?: string
  regfilestart?: string
  regfilesize?: string
  md_data_type?: string
  '.type': 'modbus'
}

export interface ModbusSerialServerConfig {
  id: string
  enabled?: '1' | '0'
  name: string
  device_id: string
  baudrate?: string
  databits?: DataBits
  stopbits?: StopBits
  parity?: Parity
  flowcontrol?: FlowControl
  clientregs?: '1' | '0'
  regfile?: string
  regfilestart?: string
  regfilesize?: string
  device: string
  full_duplex_enabled?: '1' | '0'
  md_data_type?: string
  '.type': 'rtu_device'
}

export interface FormOptions {
  serialServers: ModbusSerialServerConfig[]
  tcpServers: ModbusTcpServerConfig[]
  isTcp: boolean
}

export const FormOptionKey = Symbol('ModbusServerDataSourceFormOptions') as InjectionKey<Ref<FormOptions>>
