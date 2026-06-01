import { useMainStore, type SwitchPort, type SwitchDevice } from '@/stores/main'
import { useTranslate } from '@ui-core/composables/useI18n'
import type { PortStatus, RutPortStatus, PortConfig, TswPortStatus, StaticPortInfo, TswPortConfig } from '@/types/portTypes'
import { log } from '@ui-core/plugins/log'
import type { App } from 'vue'
import * as Ports from './ports'
import { isNumber, isString } from '@ui-core/utils/inspect'
import type { StpBridgeConfig } from '@/types/stpTypes'

export type PoeState = 'active' | 'enabled' | 'disabled' | 'none'

export function getPoeState(status: PortStatus | null | undefined): PoeState {
  if (!status) return 'none'
  if (status.power === '1') return 'active'
  else if (useMainStore().isPoe(status.id)) {
    return status.poe_enable === '1' ? 'enabled' : 'disabled'
  }
  return 'none'
}

export const portBgColors = {
  up: 'bg-lime-300',
  down: 'bg-gray-500',
  enabled: 'bg-blue-700',
  disabled: 'bg-gray-300',
  aggregated: 'bg-blue-300',
  tagged: 'bg-blue-600',
  untagged: 'bg-purple-200',
  error: 'bg-red-700'
} as const satisfies Record<string, `bg-${string}`>

export const portIconColors = {
  up: 'fill-lime-300',
  down: 'fill-gray-500',
  enabled: 'fill-blue-700',
  disabled: 'fill-gray-300',
  aggregated: 'fill-blue-300',
  tagged: 'fill-blue-600',
  untagged: 'fill-purple-200',
  error: 'fill-red-700'
} as const satisfies Record<string, `fill-${string}`>

const darkColorKeys = ['up', 'enabled', 'untagged', 'tagged', 'error'] as const

export const darkColors = darkColorKeys.flatMap(key => [portBgColors[key], portIconColors[key]])

export const poeIconColors = {
  disabled: 'text-gray-200', // Disabled poe
  active: 'text-yellow-300', // Active poe
  enabled: 'text-blue-700', // Enabled poe
  // @ts-ignore none is exception
  none: ''
} as const satisfies Record<PoeState, `text-${string}`>

export function getPortSpeed(status: PortStatus | null | undefined | Partial<PortStatus> | number | string) {
  const portSpeed: Record<number | string | 'default', string> = {
    10: 'E',
    100: 'FE',
    1000: 'GbE',
    default: '-'
  }
  const speed = isString(status) || isNumber(status) ? status : status?.speed
  // This happens on x86 when simulated port has no speed limit
  if (Number(speed) === -1) return useTranslate()('Unknown')
  return speed ? (portSpeed[speed] ?? `${Number(speed) / 1000}GbE`) : portSpeed.default
}

/**
 * Convers rutos port info from board.json to be more similar to tsw
 */
export function getRutosBoardPorts(): StaticPortInfo[] {
  const store = useMainStore()
  const isDSA = store.board!.hwinfo.dsa
  type PartialPortInfo = { name: string; custom: string; num: string }
  const portsTemplate = (ports: PartialPortInfo[]) => ports.map<StaticPortInfo>(port => ({ ...port, block: 'eth', type: 'eth', position: 'up' }))
  // Parse all ports if device has `DSA` support
  if (isDSA) {
    return portsTemplate([
      ...store.lanPortDevices.map((port, index) => ({ name: `_${port}`, custom: port.toUpperCase(), num: (index + 1).toString() })),
      ...store.wanPortDevices.map((port, index) => ({ name: `_${port}`, custom: port.toUpperCase(), num: (store.lanPortDevices.length + index + 1).toString() }))
    ])
  }
  // Parse all ports for devices with no `DSA` support
  if (store.board!.switch) {
    return portsTemplate(
      store
        .board!.switch.switch0.ports.filter((port): port is SwitchPort => port.role === 'lan' || port.role === 'wan')
        .map(port => ({ name: `_${port.role}${port.num}`, custom: `${port.role.toUpperCase()}${getPrettyPortNumberFromBoardSwitch(port) ?? ''}`, num: port.num.toString() }))
        .sort((a, b) => (a.custom > b.custom ? 1 : -1))
    )
  }
  // By default returns a single lan and/or wan port depending on their existence
  return portsTemplate([...(store.board?.network?.lan ? [{ name: '_lan1', custom: 'LAN', num: '1' }] : []), ...(store.board?.network?.wan ? [{ name: '_wan0', custom: 'WAN', num: '2' }] : [])])
}

/**
 * @param port - from switch object in board
 * @returns either port number or undefined if you should not use number
 */
function getPrettyPortNumberFromBoardSwitch(port: SwitchPort | SwitchDevice): number | undefined {
  const store = useMainStore()
  const switchPorts = store.board?.switch?.switch0.ports ?? []
  if (!switchPorts || switchPorts.filter(e => e.role === port.role).length === 1) return undefined
  return port.index ?? switchPorts.filter(e => e.role === port.role).indexOf(port) + 1
}

/**
 * Common function to parse port if to type and displayable number
 * @param id - port id
 */
function parsePort(id: string | null | undefined) {
  if (!id) return
  const res = id.match(/[a-zA-Z]+|[0-9]+/g)
  if (!res || res.length === 0 || res.length > 2) {
    log(`Failed to parse port id "${id}"`, true)
    return
  }

  const store = useMainStore()
  const isDSA = store.board?.hwinfo.dsa
  const isSwitch = store.isSwitch

  const switchPorts = store.board?.switch?.switch0?.ports
  const rawPortName = res[0] as 'sfp' | 'port' | 'eth' | 'wan' | 'lan'
  const rawPortNumber = Number(res[1])
  let portNumber: number | undefined

  if (isSwitch) {
    const port = store.board?.network.static?.ports?.find(port => port.name === id)
    if (!port) {
      log(`Failed to get port "${id}" from board static network`, true)
      return
    } else portNumber = Number(port.num)
  } else if (isDSA && ['lan', 'eth'].includes(rawPortName)) portNumber = rawPortNumber
  else if (switchPorts) {
    const port = switchPorts.find(e => e.num === rawPortNumber)
    if (!port) {
      log(`Failed to get port "${id}" from board switch`, true)
      return
    } else portNumber = getPrettyPortNumberFromBoardSwitch(port)
  }
  return {
    type: rawPortName,
    number: portNumber
  }
}

/**
 * Returns human readable port id: e.g: Port 1, LAN 1. This should be used when short port name is needed
 * @param id - port id
 * @param formatWithSpace - when true adds space between name and number
 */
export function getPrettyPortId(id: string | null | undefined, formatWithSpace: boolean = true): string {
  const portData = parsePort(id)
  if (!portData) return '-'
  const $t = useTranslate()
  const portName = portData.type === 'port' ? $t('Port') : portData.type.toUpperCase()
  const space = formatWithSpace ? ' ' : ''
  return `${portName}${portData.number || portName === 'ETH' ? `${space}${portData.number}` : ''}`
}

/**
 * Returns human readable port id: e.g: 1, 2, 3, SFP 2 . This can only be used on TSW as it has a lot of ports.
 * @param id - port id
 * @param portStatus - status to get bond information
 */
export function getShortPrettyId(id: string | null | undefined, portStatus: TswPortStatus[]) {
  if (!id) return '-'
  const status = portStatus.find(e => e.id === id)
  if (!status) return '-'
  const $t = useTranslate()
  if (status?.bond_index) return `${$t('Bond')} ${status.bond_index}`
  const portData = parsePort(id)
  if (!portData) return '-'
  return portData.type === 'sfp' ? 'SFP ' + portData.number : (portData.number ?? 0)?.toString()
}

/**
 * Returns user set port name or human readable port id. This should be used when long port name can be shown
 */
export function getPortName(port: PortStatus | PortConfig | null | undefined) {
  if (!port) return '-'
  return port.description ?? getPrettyPortId(port.id)
}
/**
 * Returns bond name if port is bond else returns port name.
 */
export function getBondName(portStatus: PortStatus | null | undefined, portId?: undefined, includePortName?: boolean): string
export function getBondName(portStatus: PortStatus[], portId: string, includePortName?: boolean): string
export function getBondName(portStatus: PortStatus | null | undefined | PortStatus[], portId?: string, includePortName = true): string {
  const port = Array.isArray(portStatus) ? portStatus.find(e => e.id === portId) : portStatus
  return port?.bond_name ? `${port?.bond_name}${includePortName ? ` / ${getPrettyPortId(port.id)}` : ''}` : getPortName(port)
}

export function getRutPortHint(status: RutPortStatus | null | undefined) {
  if (!status) return []
  const store = useMainStore()
  const $t = useTranslate()
  const isUp = status.state === 'up'
  return [
    { title: getPortName(status), info: '' },
    { title: $t('Status'), info: status.enabled === '1' ? (isUp ? $t('Connected') : $t('Disconnected')) : $t('Disabled') },
    { title: $t('Speed'), info: getPortSpeed(status), show: isUp },
    { title: $t('Duplex'), info: status.duplex === 'true' ? $t('Full-Duplex') : $t('Half-Duplex'), show: isUp },
    {
      show: !!store.isPoe(status.id),
      title: $t('PoE'),
      info: status.poe_enable === '1' ? (status.power === '1' ? '%mW'.format(Number(status.budget ?? 0) / 1000) : $t('Innactive')) : $t('Disabled')
    }
  ]
    .filter(col => col.show !== false)
    .map(col => ({ title: col.title, info: col.info }))
}

export function getTswPortHint(status: TswPortStatus | null | undefined) {
  if (!status) return []
  const store = useMainStore()
  const $t = useTranslate()
  const isUp = status.link === '1'
  const isSfp = store.isSfp(status.id)
  return [
    { title: getBondName(status), info: '' },
    { title: $t('Status'), info: status.enabled === '1' ? (isUp ? $t('Connected') : $t('Disconnected')) : $t('Disabled') },
    { title: $t('Speed'), info: getPortSpeed(status), show: isUp },
    { title: $t('Duplex'), info: status.full_duplex === '1' ? $t('Full-Duplex') : $t('Half-Duplex'), show: isUp },
    {
      title: $t('PoE'),
      info: status.poe_enable === '1' ? (status.power === '1' ? '%mW'.format(Number(status.budget ?? 0) / 1000) : $t('Inactive')) : $t('Disabled'),
      show: !!store.isPoe(status.id)
    },
    { title: $t('TX SUM'), info: '%MB'.format(status.tx_bytes), show: isUp },
    { title: $t('RX SUM'), info: '%MB'.format(status.rx_bytes), show: isUp },
    { title: $t('TX RATE'), info: '%Mbps'.format(status.tx_rate), show: isUp },
    { title: $t('RX RATE'), info: '%Mbps'.format(status.rx_rate), show: isUp },
    { title: $t('Vendor'), info: status.vendor || '-', show: isUp && isSfp },
    { title: $t('Serial'), info: status.serial || '-', show: isUp && isSfp },
    { title: $t('Part number'), info: status.part_number || '-', show: isUp && isSfp },
    { title: $t('Voltage'), info: '%s V'.format(status.voltage || '-'), show: isUp && isSfp },
    { title: $t('Current'), info: '%s mA'.format(status.current || '-'), show: isUp && isSfp },
    { title: $t('Output power'), info: '%s mW'.format(status.output_power || '-'), show: isUp && isSfp },
    { title: $t('Temperature'), info: '%s °C'.format(status.temperature || '-'), show: isUp && isSfp }
  ]
    .filter(col => col.show !== false)
    .map(col => ({ title: col.title, info: col.info }))
}

export function getPortSpeedIcon(status: PortStatus | null | undefined) {
  if (!status?.speed || status.enabled !== '1') return undefined
  return String(status.speed)
}

/**
 * Usefull if config needs to be controlled via first bond port and other bond ports needs to be disabled
 * @returns string - if port is not a first in port in a bond returns first port id, undefined - if port is first in a bond or not in a bond
 **/
export function getBondParent(statuses: TswPortStatus[], port: string | TswPortStatus | TswPortConfig | undefined): string | undefined {
  const portId = typeof port === 'string' ? port : port?.id
  const portStatus = statuses.find(status => status.id === portId)
  if (portStatus === undefined || portStatus.bond_index === undefined) return
  // .find() finds first element. If first element is not our port that means it is slave
  const firstBondPort = statuses.find(status => status.bond_index === portStatus.bond_index)
  return firstBondPort === portStatus ? undefined : firstBondPort?.bond_index
}

export function getVlanHints() {
  const $t = useTranslate()
  return {
    tagged: $t('Port exposes this VLAN in tagged mode, meaning that connected device needs to be configured to accept traffic from this VLAN.'),
    untagged: $t('Port exposes this VLAN in untagged mode, meaning that connected device will accept traffic from this VLAN by default.'),
    off: $t('Port does not accept traffic for this vlan.')
  } as const
}

function getBondPortCount(portStatus: TswPortStatus[], portId: string) {
  const port = portStatus.find(e => e.id === portId)
  if (!port?.bond_index) return undefined
  return portStatus.filter(e => e.bond_index === port.bond_index).length
}

/**
 * Usefull if you want make select options display "{option} * X (ports)"
 */
export function getBondOptionDisplay(portStatus: TswPortStatus[], portId: string, option: { key: string; value: string }, excludeOption?: string[]) {
  const count = getBondPortCount(portStatus, portId)
  if (!count || excludeOption?.includes(option.key)) return option.value
  const $t = useTranslate()
  return `${option.value} * ${count} (${$t('ports')})`
}
/**
 * @param selectedPorts - Array of port IDs selected for configuration comparison.
 * @param modelValue - Array of ports configuration objects.
 * @param configSettings - List of keys to compare by.
 *
 * @returns {{
 *   differs: boolean; // true if configuration differences are found between selected ports
 *   initialForm: Partial<T>; // merged form containing common configuration values for selected ports.
 * }}
 */
export function getPortsConfig<T extends { id: string; [key: string]: any }>(selectedPorts: string[], modelValue: T[], configSettings: readonly (keyof T)[]) {
  const form: Partial<T> = {}
  const portConfigs = selectedPorts.map(port => modelValue.find(section => section.id === port))
  const combinedConfig = portConfigs.reduce<Partial<T>>((acc, config) => ({ ...config, ...acc }), {})
  configSettings.forEach(key => (form[key] = (combinedConfig ?? {})[key]))
  const differs = !modelValue
    .filter(section => selectedPorts.includes(section.id))
    .every(section => configSettings.every(setting => section[setting] === form[setting] || (Array.isArray(section[setting]) && JSON.stringify(section[setting]) === JSON.stringify(form[setting]))))
  return { differs, initialForm: form }
}

/**
 * Calculate how long it takes until ports are blocked after stp mode switch
 */
export function awaitAfterStpChange(changeTo: StpBridgeConfig['mode'] | 'mrp' | undefined) {
  if (!changeTo) return {}
  const portCount = useMainStore().allPortDevices.length
  return { timeout: 60000, startAfter: staticDelay[changeTo] + portCount * delayPerPort[changeTo] }
}
const staticDelay = {
  disabled: 10000,
  rstp: 5000,
  stp: 30000,
  // this is the case when mrp is saved withouth stp changes
  mrp: 10000
} as Record<StpBridgeConfig['mode'] | 'mrp', number>
const delayPerPort = {
  disabled: 500,
  rstp: 500,
  stp: 500,
  mrp: 500
} as Record<StpBridgeConfig['mode'] | 'mrp', number>

export default {
  install(app: App) {
    app.config.globalProperties.$ports = Ports
  }
}
