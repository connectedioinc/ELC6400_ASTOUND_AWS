import { i18n } from '@ui-core/plugins/i18n'
import { type App } from 'vue'

export type DataBits = '5' | '6' | '7' | '8'
export type StopBits = '1' | '2'
export type Parity = 'none' | 'even' | 'odd'
export type FlowControl = 'none' | 'xon/xoff' | 'rts/cts'

interface SerialStatusNotUsed {
  is_used: '0'
  name: string
}

interface SerialStatusUsed {
  is_used: '1'
  name: string
  service: string
  configuration: string
}

export type SerialStatus = SerialStatusNotUsed | SerialStatusUsed

export interface InternalSerialDevice {
  devices: string[]
  path: string

  bauds: string[]
  data_bits: DataBits[]
  stop_bits: StopBits[]
  parity_types: Parity[]
  flow_control: FlowControl[]
  duplex: string[]
}

export interface ExternalSerialDevice {
  external_devices: string[]
}

export type SerialDevice = InternalSerialDevice | ExternalSerialDevice

function returnPath(service: string) {
  const paths: Record<string, string> = {
    OverIP: '/services/serial_utilities/overip',
    NTrip: '/services/ntrip',
    'RS Modem': '/services/serial_utilities/modem_control',
    'Modbus TCP over Serial Gateway': '/services/modbus/tcp_over_serial',
    Console: '/services/serial_utilities/console',
    'MQTT Modbus Serial Gateway': '/services/modbus/modbus_gateway',
    'DNP3 Serial Outstation': '/services/dnp3/dnp_serial_outstation',
    'DNP3 Serial Client': '/services/dnp3/serial_client',
    'Modbus Serial Client': '/services/modbus/modbus_serial_client',
    'Modbus Serial Server': '/services/modbus/modbus_serial_server',
    DLMS: '/services/dlms',
    BACnet: '/services/bacnet',
    Mbus: '/services/mbus/client',
    'Mbus Gateway': '/services/mbus/gateway',
    'NMEA Serial Port': '/services/gps/nmea/forwarding',
    'IEC 60870-5 Client': '/services/iec60870_client',
    'IEC 60870-5 Server': '/services/iec60870_server'
  }
  if (paths[service]) return paths[service]
  return i18n.t('Service path is missing')
}

function listInternalDeviceNames(serialDevices: SerialDevice[]) {
  return serialDevices
    .filter(serialDevice => 'devices' in serialDevice)
    .flatMap(serialDevice => serialDevice.devices)
    .map(device => `/dev/${device}`)
}

function findInternalDevice(serialDevices: SerialDevice[], name: string) {
  return serialDevices.filter(serialDevice => 'devices' in serialDevice).find(serialDevice => serialDevice.devices.some(dev => `/dev/${dev}` === name))
}

function listExternalDeviceNames(serialDevices: SerialDevice[]) {
  return serialDevices
    .filter(serialDevice => 'external_devices' in serialDevice)
    .flatMap(serialDevice => serialDevice.external_devices)
    .map(device => `/dev/${device}`)
}

function listDeviceNames(serialDevices: SerialDevice[]) {
  return [...listInternalDeviceNames(serialDevices), ...listExternalDeviceNames(serialDevices)]
}

function listDeviceNameTuples(serialDevices: SerialDevice[]) {
  return listDeviceNames(serialDevices).map(name => [name, deviceDisplayValue(name)])
}

interface ApiErrorsPayload {
  payload: {
    errors: {
      code: number
    }[]
  }[]
}

interface ApiErrorsData {
  data: {
    errors: {
      code: number
    }[]
  }
}

type ApiErrors = ApiErrorsData | ApiErrorsPayload

function handleExternalDeviceErrors(errors: ApiErrors) {
  const disconnected = 'payload' in errors ? errors.payload.some(errors => errors.errors.some(error => error.code === 2)) : errors.data.errors.some(error => error.code === 2)
  if (disconnected) return i18n.t('Selected device is disconnected, it can not be enabled.')

  const enabledElsewhere = 'payload' in errors ? errors.payload.some(errors => errors.errors.some(error => error.code === 1)) : errors.data.errors.some(error => error.code === 1)
  if (enabledElsewhere) return i18n.t('Device is enabled in another serial service')

  return i18n.t('An unexpected error occurred')
}

interface InstanceWithDevice {
  enabled?: string
  device?: string
}

function validateBeforeSave(statusData: SerialStatus[], instances: InstanceWithDevice[], service: string, promise = true) {
  let err = null
  for (const instance of instances) {
    if (instance.enabled !== '1' || !instance.device) {
      continue
    }

    const enabledElsewhere = statusData.some(status => instance.device === status.name && status.is_used === '1' && status.service !== service)
    if (enabledElsewhere) {
      err = i18n.t('Device is enabled in another serial service')
      break
    }

    const deviceIsEnabled = instances.some(otherInstance => instance.device === otherInstance.device && otherInstance.enabled === '1' && otherInstance !== instance)
    if (deviceIsEnabled) {
      err = i18n.t('Instance with the %s serial device is already enabled').format(deviceDisplayValue(instance.device))
      break
    }
  }

  if (promise) {
    if (err) return Promise.reject(err)
    return Promise.resolve()
  }
  return { isValid: !err, message: err }
}

function deviceDisplayValue(device?: string, prettify = true) {
  if (prettify) {
    if (device === '/dev/rsconsole') return i18n.t('Console')
    if (device === '/dev/mbus') return i18n.t('M-Bus')
  }

  return device ? device.split('/dev/').pop() : 'undefined'
}

function filterStopBits(serialDevices: SerialDevice[], deviceName: string) {
  if (listExternalDeviceNames(serialDevices).includes(deviceName)) {
    return ['1', '2']
  }

  return findInternalDevice(serialDevices, deviceName)?.stop_bits || []
}

function filterBaudRate(serialDevices: SerialDevice[], deviceName: string) {
  if (listExternalDeviceNames(serialDevices).includes(deviceName)) {
    return [
      '300',
      '600',
      '1200',
      '1800',
      '2400',
      '4800',
      '9600',
      '19200',
      '38400',
      '57600',
      '115200',
      '230400',
      '460800',
      '500000',
      '576000',
      '921600',
      '1000000',
      '1152000',
      '1500000',
      '2000000',
      '2500000',
      '3000000',
      '3500000',
      '4000000'
    ]
  }

  return findInternalDevice(serialDevices, deviceName)?.bauds || []
}

function filterDataBits(serialDevices: SerialDevice[], deviceName: string) {
  if (listExternalDeviceNames(serialDevices).includes(deviceName)) {
    return ['5', '6', '7', '8']
  }

  return findInternalDevice(serialDevices, deviceName)?.data_bits || []
}

function filterParity(serialDevices: SerialDevice[], deviceName: string) {
  const parity = {
    none: i18n.t('None'),
    odd: i18n.t('Odd'),
    even: i18n.t('Even'),
    mark: i18n.t('Mark'),
    space: i18n.t('Space')
  }

  if (listExternalDeviceNames(serialDevices).includes(deviceName)) {
    return [
      ['none', parity.none],
      ['odd', parity.odd],
      ['even', parity.even]
    ]
  }

  const serialDevice = findInternalDevice(serialDevices, deviceName)
  if (!serialDevice) {
    return []
  }

  return serialDevice.parity_types.map(option => [option, parity[option]])
}

interface SectionWithFullDuplex {
  full_duplex_enabled?: string
}

function filterFlowControl(serialDevices: SerialDevice[], deviceName: string, section: SectionWithFullDuplex) {
  const flowControl = {
    none: i18n.t('None'),
    'rts/cts': i18n.t('RTS/CTS'),
    'xon/xoff': i18n.t('Xon/Xoff')
  }

  if (listExternalDeviceNames(serialDevices).includes(deviceName)) {
    return [
      ['none', flowControl.none],
      ['rts/cts', flowControl['rts/cts']],
      ['xon/xoff', flowControl['xon/xoff']]
    ]
  }

  const serialDevice = findInternalDevice(serialDevices, deviceName)
  if (!serialDevice) {
    return []
  }

  let flowControlOptions = serialDevice.flow_control
  if (deviceName === '/dev/rs485' && section.full_duplex_enabled !== '1') {
    flowControlOptions = flowControlOptions.filter(option => option !== 'xon/xoff')
  }

  return flowControlOptions.map(option => [option, flowControl[option]])
}

function filterDuplex(serialDevices: SerialDevice[], deviceName: string) {
  const serialDevice = findInternalDevice(serialDevices, deviceName)
  return serialDevice?.duplex || []
}

function filterOptions(serialDevices: SerialDevice[], deviceName: string, section: SectionWithFullDuplex) {
  return {
    stopBits: filterStopBits(serialDevices, deviceName),
    baudRate: filterBaudRate(serialDevices, deviceName),
    dataBits: filterDataBits(serialDevices, deviceName),
    parity: filterParity(serialDevices, deviceName),
    flowControl: filterFlowControl(serialDevices, deviceName, section),
    duplex: filterDuplex(serialDevices, deviceName)
  }
}

interface SerialMessageOptions {
  serialDevices?: SerialDevice[]
  initialDevice?: string
  device?: string
  serialStatus: SerialStatus[]
  service: string
  ignoreMbusScan?: boolean
  mbusScanStatus?: {
    status?: string
  }
}

function canDeviceBeUsed(opts: SerialMessageOptions) {
  if (getDeviceMessage(opts) === undefined) {
    return true
  }

  // If a message being shown because a USB serial device was removed,
  // then if the current device does not have any problems, allow to use it.
  if (opts.initialDevice) {
    const initialDevice = opts.initialDevice
    opts.initialDevice = undefined
    const isMessageStillShown = getDeviceMessage(opts) !== undefined
    opts.initialDevice = initialDevice

    if (!isMessageStillShown) {
      return true
    }
  }

  return false
}

function getDeviceMessage(opts: SerialMessageOptions) {
  if (opts.serialDevices) {
    const deviceNames = listDeviceNames(opts.serialDevices)
    if (opts.initialDevice && deviceNames.length && !deviceNames.includes(opts.initialDevice)) {
      return [
        i18n
          .t(
            'Serial device %s is currently unavailable. If you proceed with saving the configuration, it will overwrite the existing device. If you wish to preserve the current configuration, please discard the changes in the edit window and reconnect the device.'
          )
          .format(opts.initialDevice),
        'warning'
      ]
    }

    if (deviceNames.length === 0) {
      return [i18n.t('No serial devices found. Please insert a USB serial adapter.'), 'error']
    }

    if (!opts.device || !deviceNames.includes(opts.device)) {
      return [i18n.t('Unable to modify the configuration, device not found.'), 'error']
    }
  }
  const deviceSerialStatus = opts.serialStatus.find(dev => dev.name === opts.device && dev.is_used === '1') as SerialStatusUsed | undefined

  if (!opts.ignoreMbusScan) {
    // If 'mbusScanStatus' is provided, use that because it will be more accurate. Because it is periodically updated.
    // Otherwise fallback to using 'deviceSerialStatus'
    let showMbusScanError = false
    if (opts.mbusScanStatus) {
      showMbusScanError = opts.mbusScanStatus.status === 'running'
    } else {
      showMbusScanError = deviceSerialStatus?.service === 'MBus' && deviceSerialStatus?.configuration === 'scan'
    }

    if (showMbusScanError) {
      if (opts.service === 'Mbus') {
        // TODO: Related issue: #18243
        // For now, if you are already in the M-Bus page, don't show a link "stop it here".
        // Because we don't currently have a way link to a custom modal on a page.
        return [i18n.t('M-Bus scan is in progress'), 'warning']
      } else {
        const mbusPath = returnPath('Mbus')
        return [i18n.t('M-Bus scan is in progress, stop it %s here %s').format(`<a href='${mbusPath}'>`, '</a>'), 'warning']
      }
    }
  }

  if (deviceSerialStatus && deviceSerialStatus.service !== opts.service) {
    let service = deviceSerialStatus.service
    if (deviceSerialStatus.name === '/dev/mbus' && deviceSerialStatus.service === 'OverIP') {
      service = 'Mbus Gateway'
    }

    if (service === 'Mbus') {
      return [i18n.t('Device is already enabled in %s service, disable all groups %s here %s').format(service, `<a href='${returnPath(service)}'>`, '</a>'), 'warning']
    } else {
      return [i18n.t('Device is already enabled in %s service, disable it %s here %s').format(service, `<a href='${returnPath(service)}'>`, '</a>'), 'warning']
    }
  }
}

export const serial = {
  returnPath,
  listInternalDeviceNames,
  findInternalDevice,
  listExternalDeviceNames,
  listDeviceNames,
  listDeviceNameTuples,
  deviceDisplayValue,
  validateBeforeSave,
  handleExternalDeviceErrors,
  filterStopBits,
  filterBaudRate,
  filterDataBits,
  filterParity,
  filterFlowControl,
  filterDuplex,
  filterOptions,
  canDeviceBeUsed,
  getDeviceMessage
}

export default {
  install(app: App) {
    app.config.globalProperties.$serial = serial
  }
}
