import { ref } from 'vue'
import { createContext } from '@ui-core/utils/create-context'
import { useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import type { SerialDevice, SerialStatus } from '@/plugins/serial'

const message = useMessages()
const $t = useTranslate()

// All of these limits are arbritrary, if there is a need they can be increased.
export const maxInstances = 20
export const maxInformationObjectsPerInstance = 250
export const maxCommonAddresses = 16

export interface GlobalConfiguration {
  enabled: string
}

export interface InstanceStatus {
  id: string
  state: string
}

export interface ServiceStatus {
  uptime: string
  instances: InstanceStatus[]
}

export interface SerialDeviceConfiguration {
  enabled?: string

  balanced?: string
  device?: string
  baudrate?: string
  databits?: string
  stopbits?: string
  parity?: string
  flowcontrol?: string
  full_duplex_enabled?: string

  // TODO: Update interface when serial support is added
}

export interface InformationObjectError {
  common_address: number
  cause_of_transmission: string
  data_type: string
}

export interface InstanceConfiguration {
  name?: string
  enabled?: string
  connection_type?: string
  information_objects?: string[]

  // TCP
  address?: string
  port?: string

  // Serial
  serial_device_id?: string
  link_layer_address?: string
}

export interface FormData {
  global: GlobalConfiguration
  instances: InstanceConfiguration[]
}

export function refFormData() {
  return ref<FormData>({
    global: {},
    instances: []
  })
}

export function getInitialName(sections, namePrefix) {
  if (!sections?.length) {
    return `${namePrefix} 1`
  }

  for (let i = 0; i < sections.length + 1; i++) {
    const possibleName = `${namePrefix} ${i + 1}`
    if (!sections.some(device => device.name === possibleName)) {
      return possibleName
    }
  }

  return '' // This return should never be reached
}

function isUnknownCommonAddressError(error: InformationObjectError): boolean {
  return error.cause_of_transmission === 'UNKNOWN_COMMON_ADDRESS_OF_ASDU' && error.data_type === 'C_IC_NA_1'
}

export function showInformationObjectErrors(errors: InformationObjectError[]) {
  let hasUnknownErrorType = false

  for (const error of errors) {
    if (isUnknownCommonAddressError(error)) {
      // TODO: Maybe error message should be deduplicated if an multiple errors occur for the same common address?
      // But I'm not sure if that is even possible, needs more research.
      message.error($t('Unknown common address: %s').format(error.common_address))
    } else {
      hasUnknownErrorType = true
    }
  }

  if (hasUnknownErrorType) {
    message.error($t('Unknown error occured when reading information objects'))
  }
}

export const [provideSerialDevices, useSerialDevices] = createContext<SerialDevice[]>('serialDevices')
export const [provideSerialStatus, useSerialStatus] = createContext<SerialStatus[]>('serialStatus')
export const [provideSerialDeviceConfigurations, useSerialDeviceConfigurations] = createContext<SerialDeviceConfiguration[]>('serialDeviceConfigurations')
