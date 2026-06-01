import type { DataBits, FlowControl, Parity, StopBits } from '@/plugins/serial'
import type { InjectionKey, Ref } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import type { Dnp3TagGroup } from '@/types/tagTypes'

export interface Dnp3OutstationConfig {
  id: string
  enabled: '1' | '0'
  local_addr: string
  remote_addr: string
  unsolicited_enabled: '1' | '0'
  protocol: 'tcp' | 'udp'
  port: string
  udp_response_port?: string
  udp_response_ip?: string
  allow_ra?: string
  '.type': 'dnp3_outstation'
}

export interface Dnp3SerialOutstationConfig {
  id: string
  enabled?: '1' | '0'
  name?: string
  baudrate?: string
  databits?: DataBits
  stopbits?: StopBits
  parity?: Parity
  flowcontrol?: FlowControl
  local_addr?: string
  remote_addr?: string
  unsolicited_enabled?: '1' | '0'
  device: string
  '.type': 'dnp3_serial_outstation'
}

export interface FormOptions {
  dnp3Outstations: Dnp3OutstationConfig[]
  dnp3SerialOutstations: Dnp3SerialOutstationConfig[]
  isTcp: boolean
}

export const FormOptionKey = Symbol('Dnp3OutstationDataSourceFormOptions') as InjectionKey<Ref<FormOptions>>

export function useOutstationCommon() {
  const $t = useTranslate()
  const dnp3GroupNames: Record<Dnp3TagGroup, string> = {
    '1': $t('Binary'),
    '3': $t('Double Binary'),
    '20': $t('Counter'),
    '30': $t('Analog'),
    '110': $t('Octet String'),
    '40': $t('Analog Output'),
    '10': $t('Binary Output')
  }
  const anyVariation: [string, string][] = [['0', $t('Any value (0)')]]
  const dnp3VariationsByGroup: Record<Dnp3TagGroup, [string, string][]> = {
    '1': anyVariation,
    '3': anyVariation,
    '20': anyVariation,
    '30': [
      ['1', $t('32-bit signed integer value (1)')],
      ['2', $t('16-bit signed integer value (2)')],
      ['3', $t('32-bit signed integer value without flag (3)')],
      ['4', $t('16-bit signed integer value without flag (4)')],
      ['5', $t('32-bit floating point value (5)')],
      ['6', $t('64-bit floating point value (6)')]
    ],
    '110': anyVariation,
    '40': [
      ['1', $t('32-bit signed integer value (1)')],
      ['2', $t('16-bit signed integer value (2)')],
      ['3', $t('32-bit floating point value (3)')],
      ['4', $t('64-bit floating point value (4)')]
    ],
    '10': anyVariation
  }
  return { dnp3GroupNames, dnp3VariationsByGroup }
}
