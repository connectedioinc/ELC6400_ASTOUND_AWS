import { useTranslate } from '@ui-core/composables/useI18n'
import { useMainStore } from '@/stores/main'
import { pinColors } from './ioConstants'
import type { Io } from '@/types/ioTypes'

export function useIoPinData() {
  const $t = useTranslate()
  const store = useMainStore()

  const isRUTM55 = store.device.startsWith('RUTM55')

  const ioPinData = {
    dwi0: { color: pinColors.yellow, name: (io: Io) => getDwiName(io) },
    dwi1: { color: pinColors.orange, name: (io: Io) => getDwiName(io) },
    relay0: { color: pinColors['light-green'], name: () => $t('Relay') },
    relay1: { color: pinColors.blue, name: () => $t('Latching relay') },
    iio: { color: pinColors.green, name: () => $t('Isolated input') },
    acl0: { color: pinColors['light-blue'], name: () => $t('Analog current loop') },
    adc0: { color: pinColors['light-blue'], name: () => $t('Analog input') },
    dio0: { color: pinColors.green, name: (io: Io) => getDioName(io) },
    dio1: { color: pinColors.yellow, name: (io: Io) => getDioName(io) },
    dio2: { color: pinColors.blue, name: (io: Io) => getDioName(io) },
    din1: { color: isRUTM55 ? pinColors.blue : pinColors.green, name: () => $t('Input') },
    din2: { color: pinColors.blue, name: () => $t('Digital input') },
    dout1: { color: pinColors.yellow, name: () => $t('Output') },
    dout2: { color: pinColors.orange, name: () => $t('Isolated output') },
    pwr0: { color: pinColors.red, name: () => $t('Power') },
    pow0: { color: pinColors.red, name: () => $t('Power input 1') },
    pow1: { color: pinColors.red, name: () => $t('Power input 2') },
    ign: { color: pinColors.green, name: () => $t('Ignition') },
    bat: { color: pinColors.yellow, name: () => $t('Low battery') }
  }

  function getDwiName(io: Io) {
    return io.state === 'dry' ? $t('Passive (dry) input') : $t('Active (wet) input')
  }

  function getDioName(io: Io) {
    if (io.bi_dir === '0') return io.direction === 'in' ? $t('Input') : $t('Output')
    return io.direction === 'in' ? $t('Configurable input') : $t('Configurable output')
  }

  function getStateHint(io: Io) {
    const value = io?.custom_value
    if (typeof value === 'string' && value.includes('inf')) {
      return $t('Device is unable to perform calculations with values entered in the formula.')
    }
    return ''
  }

  const customTranslate: { [key: string]: string } = {
    inf: 'Inf',
    '-inf': '-Inf'
  }

  function customFormat(io: Io) {
    if (!(typeof io.custom_value === 'number' && io.custom_unit)) return customTranslate[io?.custom_value || ('' as keyof typeof customTranslate)] || '-'
    return `${io.custom_value.toFixed(2)}${io.custom_unit}${io.percent ? ` (${io.percent}%)` : ''}`
  }

  function formatAcl(io: Io) {
    return customFormat(io) || `${io?.current ? parseFloat(io.current).toFixed(2) : '-'} mA (${io.percent || '-'}%)`
  }

  function formatAdc(io: Io) {
    return customFormat(io) || (!io.value ? '0V' : Number(io.value).toFixed(2) + 'V')
  }

  const ioHrStateTranslates = {
    'High level': $t('High level'),
    'Low level': $t('Low level'),
    open: $t('Open'),
    closed: $t('Closed'),
    Shorted: $t('Shorted'),
    On: $t('On'),
    Off: $t('Off'),
    Active: $t('Active'),
    Inactive: $t('Inactive')
  }

  function getIoState(io: Io) {
    const stateByType = {
      adc: formatAdc(io),
      acl: formatAcl(io)
    }
    return stateByType[io.type as keyof typeof stateByType] || (ioHrStateTranslates[io.hr_state as keyof typeof ioHrStateTranslates] ?? io.hr_state) || '-'
  }

  return {
    ioPinData,
    getDwiName,
    getDioName,
    customFormat,
    formatAcl,
    formatAdc,
    getIoState,
    getStateHint
  }
}
