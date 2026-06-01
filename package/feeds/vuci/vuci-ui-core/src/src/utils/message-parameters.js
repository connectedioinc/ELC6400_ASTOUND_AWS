import { i18n } from '@ui-core/plugins/i18n'

function getGeneralParameters(parameters) {
  const eventParameters = [
    ['ex', i18n.t('Event text')],
    ['et', i18n.t('Events log type')]
  ]
  const generalParameters = [
    ['nl', i18n.t('New line')],
    ['ts', i18n.t('Time stamp')],
    ['ut', i18n.t('UNIX time')],
    ['it', i18n.t('UTC time in ISO')],
    ['pc', i18n.t('Product code')],
    ['rn', i18n.t('Router name')],
    ['sn', i18n.t('Serial number')],
    ['fc', i18n.t('Current FW version')],
    ['fs', i18n.t('Firmware on server')],
    ['li', i18n.t('%s address').format('LAN IP')],
    ['lm', i18n.t('%s address').format('LAN MAC')],
    ['wi', i18n.t('%s address').format('WAN IPv4')],
    ['ws', i18n.t('%s address').format('WAN IPv6')],
    ['wm', i18n.t('%s address').format('WAN MAC')],
    ['in', i18n.t('Input name')],
    ['si', i18n.t('Input state change trigger')],
    ['er', i18n.t('RMS error message')],
    ['ms', i18n.t('Monitoring status')],
    ['gs', i18n.t('GPS info')]
  ]

  const modemParameters = [
    ['mi', i18n.t('Mobile IP addresses')],
    ['ss', i18n.t('Signal strength')],
    ['on', i18n.t('Operator name')],
    ['ct', i18n.t('Network type')],
    ['cs', i18n.t('Data connection state')],
    ['ns', i18n.t('Network state')],
    ['im', i18n.t('IMSI')],
    ['ie', i18n.t('IMEI')],
    ['md', i18n.t('Modem model')],
    ['is', i18n.t('Modem serial number')],
    ['ps', i18n.t('SIM pin state')],
    ['st', i18n.t('SIM state')],
    ['cp', i18n.t('RSCP')],
    ['ec', i18n.t('ECIO')],
    ['ic', i18n.t('ICCID')],
    ['ci', i18n.t('CELLID')],
    ['sv', i18n.t('Network serving')],
    ['su', i18n.t('SIM slot in use')],
    ['rp', i18n.t('RSRP')],
    ['sr', i18n.t('SINR')],
    ['rq', i18n.t('RSRQ')],
    ['nb', i18n.t('Neighbour cells')],
    ['ni', i18n.t('Network info')]
  ]

  const allParams = generalParameters.concat(modemParameters).concat(eventParameters)
  return allParams.filter(([key]) => parameters.some(({ id }) => id === key))
}

function getIoParameters(parameters) {
  const ioTranslations = {
    Output: i18n.t('Output'),
    'Isolated Output': i18n.t('Isolated Output'),
    Input: i18n.t('Input'),
    'Isolated Input': i18n.t('Isolated Input'),
    'Digital Input': i18n.t('Digital Input'),
    Relay: i18n.t('Relay'),
    'Latching Relay': i18n.t('Latching Relay'),
    'Passive/Active input (Dry/Wet)': i18n.t('Passive/Active input (Dry/Wet)'),
    'Configurable Input/Output': i18n.t('Configurable Input/Output'),
    'Analog Input': i18n.t('Analog Input'),
    'Analog Current Loop': i18n.t('Analog Current Loop'),
    'Power Voltage': i18n.t('Power Voltage'),
    default: i18n.t('Unknown')
  }

  return parameters
    .filter(({ type }) => type === 'io')
    .map(p => {
      const name = ioTranslations[p.io_name] || ioTranslations.default
      const pins = p.block_pins.join(', ')
      return [p.id, `${name} (${pins})`]
    })
}

function getAllParameters(parameters) {
  return getGeneralParameters(parameters).concat(getIoParameters(parameters))
}

function getMessages(parameterOptions) {
  return parameterOptions.map(([k, v]) => `${v} - %${k}`)
}

export { getGeneralParameters, getIoParameters, getAllParameters, getMessages }
