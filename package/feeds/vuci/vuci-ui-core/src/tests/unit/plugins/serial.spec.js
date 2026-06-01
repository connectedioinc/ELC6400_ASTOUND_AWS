import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { serial } from '@/plugins/serial'
import i18n from '@ui-core/plugins/i18n'
import '@ui-core/utils/string-format'

describe('serial plugin tests', () => {
  beforeEach(() => {
    const app = { config: { globalProperties: {} } }
    setActivePinia(createTestingPinia())
    i18n.install(app)
  })
  it.each([
    ['OverIP', '/services/serial_utilities/overip'],
    ['has external devices', 'Service path is missing']
  ])('returns redirect path when service is %s', (service, resp) => {
    const val = serial.returnPath(service)
    expect(val).toEqual(resp)
  })
  it.each([
    [true, '/dev/test555', 'test555'],
    [true, '/dev/rsconsole', 'Console'],
    [false, '/dev/rsconsole', 'rsconsole'],
    [false, undefined, 'undefined']
  ])('returns correct device display value', (pretty, value, resp) => {
    const val = serial.deviceDisplayValue(value, pretty)
    expect(val).toEqual(resp)
  })
  it.each([
    ['has devices', [{ devices: ['rs232'] }], [['/dev/rs232', 'rs232']]],
    ['has external devices', [{ external_devices: ['test'] }], [['/dev/test', 'test']]]
  ])('returns filtered device list when %s', (text, data, resp) => {
    const val = serial.listDeviceNameTuples(data)
    expect(val).toEqual(resp)
  })
  it.each([
    [{ payload: [{ errors: [{ code: 2 }] }] }, 'Selected device is disconnected, it can not be enabled.'],
    [{ payload: [{ errors: [{ code: 1 }] }] }, 'Device is enabled in another serial service'],
    [{ payload: [{ errors: [{ code: 4 }] }] }, 'An unexpected error occurred'],
    [{ data: { errors: [{ code: 2 }] } }, 'Selected device is disconnected, it can not be enabled.'],
    [{ data: { errors: [{ code: 1 }] } }, 'Device is enabled in another serial service'],
    [{ data: { errors: [{ code: 4 }] } }, 'An unexpected error occurred']
  ])('returns translated error message', (error, message) => {
    const val = serial.handleExternalDeviceErrors(error)
    expect(val).toEqual(message)
  })
  it.each([
    [[{ name: 'test', is_used: '1', service: 'test' }], [{ enabled: '1', device: 'test' }], 'test2', { message: 'Device is enabled in another serial service', isValid: false }],
    [
      [{ name: 'test', is_used: '0', service: 'test' }],
      [
        { enabled: '1', device: 'test' },
        { enabled: '1', device: 'test' }
      ],
      'test2',
      { message: 'Instance with the test serial device is already enabled', isValid: false }
    ],
    [
      [{ name: 'test', is_used: '0', service: 'test' }],
      [
        { enabled: '1', device: 'test' },
        { enabled: '0', device: 'test' }
      ],
      'test2',
      { isValid: true, message: null }
    ]
  ])('returns validation error', (statusData, data, service, resp) => {
    const val = serial.validateBeforeSave(statusData, data, service, false)
    expect(val).toEqual(resp)
  })
  it.each([
    [[{ devices: ['rs232'], stop_bits: ['test'] }], '/dev/rs232', ['test']],
    [[{ devices: ['rs22'], stop_bits: ['test'] }, { external_devices: ['usb_serial_AAA'] }], '/dev/usb_serial_AAA', ['1', '2']],
    [[{ devices: ['rs22'], stop_bits: ['test'] }], '/dev/rs232', []]
  ])('returns filtered stop bits', (serialData, name, resp) => {
    const val = serial.filterStopBits(serialData, name)
    expect(val).toEqual(resp)
  })
  it.each([
    [[{ devices: ['rs232'], bauds: ['test'] }], '/dev/rs232', ['test']],
    [
      [{ devices: ['rs22'], bauds: ['test'] }, { external_devices: ['usb_serial_AAA'] }],
      '/dev/usb_serial_AAA',
      [
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
    ],
    [[{ devices: ['rs22'], bauds: ['test'] }], '/dev/rs232', []]
  ])('returns filtered baudrates', (serialData, name, resp) => {
    const val = serial.filterBaudRate(serialData, name)
    expect(val).toEqual(resp)
  })
  it.each([
    [[{ devices: ['rs232'], data_bits: ['test'] }], '/dev/rs232', ['test']],
    [[{ devices: ['rs22'], data_bits: ['test'] }, { external_devices: ['usb_serial_AAA'] }], '/dev/usb_serial_AAA', ['5', '6', '7', '8']],
    [[{ devices: ['rs22'], data_bits: ['test'] }], '/dev/rs232', []]
  ])('returns filtered data bits', (serialData, name, resp) => {
    const val = serial.filterDataBits(serialData, name)
    expect(val).toEqual(resp)
  })
  it.each([
    [[{ devices: ['rs232'], parity_types: ['odd'] }], '/dev/rs232', [['odd', 'Odd']]],
    [
      [{ devices: ['rs22'], parity_types: ['test'] }, { external_devices: ['usb_serial_AAA'] }],
      '/dev/usb_serial_AAA',
      [
        ['none', 'None'],
        ['odd', 'Odd'],
        ['even', 'Even']
      ]
    ],
    [[{ devices: ['rs22'], parity_types: ['test'] }], '/dev/rs232', []]
  ])('returns filtered parity types', (serialData, name, resp) => {
    const val = serial.filterParity(serialData, name)
    expect(val).toEqual(resp)
  })
  it.each([
    [
      [{ devices: ['rs232'], flow_control: ['none', 'xon/xoff'] }],
      { full_duplex_enabled: '1' },
      '/dev/rs232',
      [
        ['none', 'None'],
        ['xon/xoff', 'Xon/Xoff']
      ]
    ],
    [[{ devices: ['rs485'], flow_control: ['none', 'xon/xoff'] }], { full_duplex_enabled: '0' }, '/dev/rs485', [['none', 'None']]],
    [[{ devices: ['rs22'], flow_control: ['test'] }], {}, '/dev/rs232', []]
  ])('returns filtered flowcontrol options', (serialData, section, name, resp) => {
    const val = serial.filterFlowControl(serialData, name, section)
    expect(val).toEqual(resp)
  })
  it('filters serial options', () => {
    const serialDevices = [
      {
        devices: ['test'],
        path: '/tty/ttyTest',
        bauds: ['1'],
        data_bits: ['1'],
        stop_bits: ['1'],
        parity_types: ['odd'],
        flow_control: ['none'],
        duplex: ['half']
      }
    ]
    const val = serial.filterOptions(serialDevices, '/dev/test', {}, 'test')
    expect(val).toEqual({
      stopBits: ['1'],
      baudRate: ['1'],
      dataBits: ['1'],
      parity: [['odd', 'Odd']],
      flowControl: [['none', 'None']],
      duplex: ['half']
    })
  })
})
