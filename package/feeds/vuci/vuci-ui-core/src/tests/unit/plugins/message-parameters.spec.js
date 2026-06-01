import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { getGeneralParameters, getIoParameters, getAllParameters, getMessages } from '@/utils/message-parameters'
import i18n from '@ui-core/plugins/i18n'

const paramResponse = [
  {
    id: 'et',
    type: 'event',
    description: 'Event type'
  },
  {
    id: 'ex',
    type: 'event',
    description: 'Event text'
  },
  {
    id: 'ts',
    type: 'other',
    description: 'Local time'
  },
  {
    id: 'ut',
    type: 'other',
    description: 'Unix time'
  },
  {
    id: 'nl',
    type: 'other',
    description: 'New line'
  },
  {
    id: 'ms',
    type: 'other',
    description: 'Monitoring status'
  },
  {
    id: 'fs',
    type: 'other',
    description: 'Firmare on server'
  },
  {
    id: 'er',
    type: 'other',
    description: 'RMS error message'
  },
  {
    id: 'it',
    type: 'other',
    description: 'UTC time in ISO'
  },
  {
    id: 'rn',
    type: 'device',
    description: 'Router name'
  },
  {
    id: 'sn',
    type: 'device',
    description: 'Serial number'
  },
  {
    id: 'fc',
    type: 'device',
    description: 'Current FW version'
  },
  {
    id: 'pc',
    type: 'device',
    description: 'Device name'
  },
  {
    id: 'li',
    type: 'network',
    description: 'LAN IP address'
  },
  {
    id: 'wi',
    type: 'network',
    description: 'Wired WAN IPv4 addresses'
  },
  {
    id: 'ws',
    type: 'network',
    description: 'Wired WAN IPv6 addresses'
  },
  {
    id: 'wm',
    type: 'network',
    description: 'WAN MAC address'
  },
  {
    id: 'lm',
    type: 'network',
    description: 'LAN MAC address'
  },
  {
    id: 'gs',
    type: 'gps',
    description: 'GPS info'
  },
  {
    id: 'mi',
    type: 'mobile',
    description: 'Mobile IP addresses'
  },
  {
    id: 'ss',
    type: 'mobile',
    description: 'Signal strength'
  },
  {
    id: 'on',
    type: 'mobile',
    description: 'Operator name'
  },
  {
    id: 'ct',
    type: 'mobile',
    description: 'Network type'
  },
  {
    id: 'cs',
    type: 'mobile',
    description: 'Data connection state'
  },
  {
    id: 'ns',
    type: 'mobile',
    description: 'Network state'
  },
  {
    id: 'im',
    type: 'mobile',
    description: 'IMSI'
  },
  {
    id: 'ie',
    type: 'mobile',
    description: 'IMEI'
  },
  {
    id: 'md',
    type: 'mobile',
    description: 'Modem model'
  },
  {
    id: 'is',
    type: 'mobile',
    description: 'Modem serial number'
  },
  {
    id: 'ps',
    type: 'mobile',
    description: 'SIM pin state'
  },
  {
    id: 'st',
    type: 'mobile',
    description: 'SIM state'
  },
  {
    id: 'cp',
    type: 'mobile',
    description: 'RSCP'
  },
  {
    id: 'ec',
    type: 'mobile',
    description: 'ECIO'
  },
  {
    id: 'ic',
    type: 'mobile',
    description: 'ICCID'
  },
  {
    id: 'ci',
    type: 'mobile',
    description: 'CELLID'
  },
  {
    id: 'sv',
    type: 'mobile',
    description: 'Network serving'
  },
  {
    id: 'su',
    type: 'mobile',
    description: 'SIM slot in use'
  },
  {
    id: 'rp',
    type: 'mobile',
    description: 'RSRP'
  },
  {
    id: 'sr',
    type: 'mobile',
    description: 'SINR'
  },
  {
    id: 'rq',
    type: 'mobile',
    description: 'RSRQ'
  },
  {
    id: 'nb',
    type: 'mobile',
    description: 'Neighbour cells'
  },
  {
    id: 'ni',
    type: 'mobile',
    description: 'Network info'
  },
  {
    id: 'in',
    type: 'event',
    description: 'Input name'
  },
  {
    id: 'si',
    type: 'event',
    description: 'Input state'
  },
  {
    type: 'io',
    description: 'Input (3)',
    io_name: 'Input',
    block_pins: [3],
    id: 'g0'
  },
  {
    type: 'io',
    description: 'Output (4)',
    io_name: 'Output',
    block_pins: [4],
    id: 'g1'
  }
]

const ioParamsTranslated = [
  ['g0', 'Input (3)'],
  ['g1', 'Output (4)']
]

const generalParamsTranslated = [
  ['nl', 'New line'],
  ['ts', 'Time stamp'],
  ['ut', 'UNIX time'],
  ['it', 'UTC time in ISO'],
  ['pc', 'Product code'],
  ['rn', 'Router name'],
  ['sn', 'Serial number'],
  ['fc', 'Current FW version'],
  ['fs', 'Firmware on server'],
  ['li', 'LAN IP address'],
  ['lm', 'LAN MAC address'],
  ['wi', 'WAN IPv4 address'],
  ['ws', 'WAN IPv6 address'],
  ['wm', 'WAN MAC address'],
  ['in', 'Input name'],
  ['si', 'Input state change trigger'],
  ['er', 'RMS error message'],
  ['ms', 'Monitoring status'],
  ['gs', 'GPS info'],
  ['mi', 'Mobile IP addresses'],
  ['ss', 'Signal strength'],
  ['on', 'Operator name'],
  ['ct', 'Network type'],
  ['cs', 'Data connection state'],
  ['ns', 'Network state'],
  ['im', 'IMSI'],
  ['ie', 'IMEI'],
  ['md', 'Modem model'],
  ['is', 'Modem serial number'],
  ['ps', 'SIM pin state'],
  ['st', 'SIM state'],
  ['cp', 'RSCP'],
  ['ec', 'ECIO'],
  ['ic', 'ICCID'],
  ['ci', 'CELLID'],
  ['sv', 'Network serving'],
  ['su', 'SIM slot in use'],
  ['rp', 'RSRP'],
  ['sr', 'SINR'],
  ['rq', 'RSRQ'],
  ['nb', 'Neighbour cells'],
  ['ni', 'Network info'],
  ['ex', 'Event text'],
  ['et', 'Events log type']
]

const allParamsTranslated = [...generalParamsTranslated, ...ioParamsTranslated]

const messages = [
  'New line - %nl',
  'Time stamp - %ts',
  'UNIX time - %ut',
  'UTC time in ISO - %it',
  'Product code - %pc',
  'Router name - %rn',
  'Serial number - %sn',
  'Current FW version - %fc',
  'Firmware on server - %fs',
  'LAN IP address - %li',
  'LAN MAC address - %lm',
  'WAN IPv4 address - %wi',
  'WAN IPv6 address - %ws',
  'WAN MAC address - %wm',
  'Input name - %in',
  'Input state change trigger - %si',
  'RMS error message - %er',
  'Monitoring status - %ms',
  'GPS info - %gs',
  'Mobile IP addresses - %mi',
  'Signal strength - %ss',
  'Operator name - %on',
  'Network type - %ct',
  'Data connection state - %cs',
  'Network state - %ns',
  'IMSI - %im',
  'IMEI - %ie',
  'Modem model - %md',
  'Modem serial number - %is',
  'SIM pin state - %ps',
  'SIM state - %st',
  'RSCP - %cp',
  'ECIO - %ec',
  'ICCID - %ic',
  'CELLID - %ci',
  'Network serving - %sv',
  'SIM slot in use - %su',
  'RSRP - %rp',
  'SINR - %sr',
  'RSRQ - %rq',
  'Neighbour cells - %nb',
  'Network info - %ni',
  'Event text - %ex',
  'Events log type - %et',
  'Input (3) - %g0',
  'Output (4) - %g1'
]

describe('message-parameters.js', () => {
  beforeEach(() => {
    const app = { config: { globalProperties: {} } }
    setActivePinia(createTestingPinia())
    i18n.install(app)
  })
  it('returns all parameters', () => {
    const result = getAllParameters(paramResponse)
    expect(result).toEqual(allParamsTranslated)
  })

  it('returns I/O parameters', () => {
    const result = getIoParameters(paramResponse)
    expect(result).toEqual(ioParamsTranslated)
  })

  it('returns general parameters', () => {
    const result = getGeneralParameters(paramResponse)
    expect(result).toEqual(generalParamsTranslated)
  })

  it('returns messages', () => {
    const result = getMessages(allParamsTranslated)
    expect(result).toEqual(messages)
  })
})
