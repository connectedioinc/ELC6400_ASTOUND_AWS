import { ref } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMainStore } from '@/stores/main'
import type { Io } from '@/types/ioTypes'

const $t = useTranslate()
const mainStore = useMainStore()

export const maxPinCount = 8
export const maxInstances = 20

export interface InformationObject {
  name: string
  title: string
}

type EnabledString = '1' | '0'
type ConnectionType = 'iec101' | 'iec104'

export interface GlobalConfiguration {
  enabled?: EnabledString
}

export interface InstanceConfiguration {
  id: string
  name?: string
  enabled?: EnabledString
  common_address?: string
  spontaneous_enabled?: EnabledString
  spontaneous_information_objects?: string[]
  cyclic_enabled?: EnabledString
  cyclic_period?: string
  cyclic_information_objects?: string[]
  configure_pins?: EnabledString
  pins?: string[]

  connection_type?: ConnectionType

  // TCP
  port?: string

  // Serial
  balanced?: string
  link_layer_address?: string
  baudrate?: string
  databits?: string
  stopbits?: string
  parity?: string
  flowcontrol?: string
  full_duplex_enabled?: string
}

export interface FormData {
  global: GlobalConfiguration
  instances: InstanceConfiguration[]
}

export interface InstanceStatus {
  id: string
  connection_type: string
  connected_clients?: string
  link_layer_state?: string
  error?: string
}

export interface IoPin {
  id: string
  io: Io
  field: string
}

export function refFormData() {
  return ref<FormData>({
    global: {},
    instances: []
  })
}

export function getInitialName(sections: InstanceConfiguration[], namePrefix: string) {
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

function createInformationObject(name: string, title: string): InformationObject {
  return { name, title }
}

export const linkLayerStateLookup = {
  '0': $t('Idle'),
  '1': $t('Error'),
  '2': $t('Busy'),
  '3': $t('Available')
}

export const instanceErrorLookup = {
  '1': $t('Unknown'),
  '2': $t('Address already in use'),
  '3': $t('Failed to open serial port')
}

function logWarning(...args: any[]) {
  if (import.meta.env.DEV) {
    console.warn(...args)
  }
}

export function listAvailableInformationObjects(ioStatus: Io[], configuredPins: string[]) {
  const objects = []

  objects.push(createInformationObject('uptime', $t('Uptime')))
  objects.push(createInformationObject('unix_timestamp', $t('Unix timestamp')))
  objects.push(createInformationObject('serial_number', $t('Serial number')))

  if (mainStore.board?.hwinfo?.mobile) {
    objects.push(
      createInformationObject('modem_number', $t('Selected modem index')),
      createInformationObject('sim_number', $t('Selected SIM number')),
      createInformationObject('signal_strength', $t('Signal strength')),
      createInformationObject('temperature', $t('Temperature')),
      createInformationObject('sim_stats_this_day', $t('SIM statistics for this day')),
      createInformationObject('sim_stats_last_day', $t('SIM statistics for last 24 hours')),
      createInformationObject('sim_stats_this_week', $t('SIM statistics for this week')),
      createInformationObject('sim_stats_last_week', $t('SIM statistics for last 7 days')),
      createInformationObject('sim_stats_this_month', $t('SIM statistics for this month')),
      createInformationObject('sim_stats_last_month', $t('SIM statistics for last 30 days')),
      createInformationObject('imsi', 'IMSI')
    )
  }

  if (mainStore.board?.hwinfo?.gps) {
    objects.push(
      createInformationObject('gps_timestamp', $t('GPS UTC timestamp')),
      createInformationObject('gps_longitude', $t('GPS longitude')),
      createInformationObject('gps_latitude', $t('GPS latitude')),
      createInformationObject('gps_altitude', $t('GPS altitude')),
      createInformationObject('gps_angle', $t('GPS angle')),
      createInformationObject('gps_speed', $t('GPS speed')),
      createInformationObject('gps_accuracy', $t('GPS accuracy')),
      createInformationObject('gps_satellites', $t('GPS satellites'))
    )
  }

  if (mainStore.board?.hwinfo?.ios) {
    if (configuredPins.length > maxPinCount) {
      logWarning('listAvailableInformationObjects() Too many pins provided')
    }

    const pins = listAvailablePins(ioStatus)
    for (let i = 0; i < configuredPins.length; i++) {
      const pinId = configuredPins[i]
      const pin = pins.find(pin => pin.id === pinId)
      if (!pin) {
        logWarning('Invalid pin id: ', pinId)
        continue
      }

      const io_name = $t('I/O pin %s: %s').format(i + 1, getPinName(pin))
      objects.push(createInformationObject(`io_pin${i}`, io_name))
    }
  }

  return objects
}

export function listIOFields(io: Io): string[] {
  if (io.type === 'gpio') {
    return io.bi_dir === '1' ? ['high', 'input'] : ['high']
  }

  const fieldsByType: Record<string, string[]> = {
    relay: ['closed'],
    adc: ['value'],
    acl: ['current', 'active'],
    dwi: ['high', 'dry']
  }

  return fieldsByType[io.type] || []
}

const fieldNameLookup: Record<string, string> = {
  high: $t('High'),
  input: $t('Direction'),
  closed: $t('Closed'),
  value: $t('Value'),
  current: $t('Current'),
  active: $t('Activity'),
  dry: $t('Dry')
}

function sortPins(pins: IoPin[]) {
  // It's important to keep this ordering deterministic!
  // Because this describes the default pins that the application uses if "Configure I/O pins" is disabled.
  const typeOrdering = ['gpio', 'adc', 'acl', 'relay', 'dwi']
  pins.sort((a, b) => {
    const aTypeOrder = typeOrdering.indexOf(a.io.type)
    const bTypeOrder = typeOrdering.indexOf(b.io.type)
    if (aTypeOrder != bTypeOrder) {
      return aTypeOrder > bTypeOrder ? 1 : -1
    }

    if (a.io.id !== b.io.id) {
      return a.io.id > b.io.id ? 1 : -1
    }

    return a.field > b.field ? 1 : -1
  })
}

export function listAvailablePins(ioStatus: Io[]) {
  const pins = ioStatus.flatMap(io => {
    return listIOFields(io).map(field => ({
      id: `${io.id}.${field}`,
      io,
      field
    }))
  })

  sortPins(pins)

  return pins
}

export function listDefaultPins(ioStatus: Io[]) {
  const defaultFieldByType: Record<string, string> = {
    relay: 'closed',
    adc: 'value',
    acl: 'current',
    dwi: 'high',
    gpio: 'high'
  }

  const pins = ioStatus
    .map(io => {
      const field = defaultFieldByType[io.type]
      if (!field) {
        return
      }

      return {
        id: `${io.id}.${field}`,
        io,
        field
      }
    })
    .filter(pin => pin !== undefined)

  sortPins(pins)

  return pins.map(pin => pin.id).splice(0, maxPinCount)
}

export function getPinName(pin: IoPin) {
  let name = pin.io.io_name
  if (listIOFields(pin.io).length > 1) {
    name = name + ` - ${fieldNameLookup[pin.field] || pin.field}`
  }

  return name
}
