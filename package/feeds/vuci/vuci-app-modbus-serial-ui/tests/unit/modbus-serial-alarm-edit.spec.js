import ModbusSerialAlarmEdit from '../../src/views/services/ModbusSerialAlarmEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

vi.mock('@/composables/useUniversalGatewayUtils', () => ({
  useUniversalGatewayUtils: vi.fn(() => ({
    getTagSize: vi.fn()
  }))
}))

describe('ModbusSerialAlarm edit tests', () => {
  const ioData = [
    { id: 'test', direction: 'out', name_with_pins: 'prettyBoy' },
    { id: 'test2', direction: 'in', type: 'relay', name_with_pins: 'beauty' }
  ]
  let props = {
    validate: vi.fn(),
    dataOptions: () => [],
    section: {
      id: 'test',
      name: 'new',
      '.type': 'alarm_test',
      enabled: '1',
      device: 'test',
      server_id: '1',
      timeout: '1',
      value: 'test',
      modbus_function: '',
      modbus_data_type: ''
    }
  }
  const formOptions = {
    serial: [],
    status: [],
    deviceList: [],
    mobile: [],
    io: [],
    phoneGroups: [],
    emailUsers: []
  }
  it.each([
    ['when there are keys', [{ type: 'key', fullname: 'test' }], [['/etc/certificates/test', 'test']]],
    ['when there are no keys', [{ type: 'cert', fullname: 'test' }], []]
  ])('filters key options %s', (text, data, response) => {
    formOptions.certificates = data
    const wrapper = createWrapper(ModbusSerialAlarmEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    const value = wrapper.vm.keyOptions
    expect(value).toEqual(response)
  })
  it.each([
    [[{ cert_type: 'root_ca', type: 'cert', fullname: 'rootcert' }], [['/etc/ssl/certs/rootcert', 'rootcert']]],
    [
      [
        { cert_type: 'root_ca', type: 'cert', fullname: 'rootcert' },
        { cert_type: 'client', type: 'cert', fullname: 'certclient' },
        { cert_type: 'server', type: 'cert', fullname: 'certserver' }
      ],
      [
        ['/etc/ssl/certs/rootcert', 'rootcert'],
        ['/etc/certificates/certclient', 'certclient'],
        ['/etc/certificates/certserver', 'certserver']
      ]
    ]
  ])('tests certOptions', (certsData, res) => {
    formOptions.certificates = certsData
    const wrapper = createWrapper(ModbusSerialAlarmEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    const value = wrapper.vm.certOptions
    expect(value).toEqual(res)
  })
  it.each([
    [
      [
        { cert_type: 'ca', type: 'cert', fullname: 'cert' },
        { cert_type: 'root_ca', type: 'cert', fullname: 'rootcert' }
      ],
      [
        ['/etc/certificates/cert', 'cert'],
        ['/etc/ssl/certs/rootcert', 'rootcert']
      ]
    ],
    [
      [
        { cert_type: 'ca', type: 'cert', fullname: 'cert' },
        { cert_type: 'root_ca', type: 'cert', fullname: 'rootcert' },
        { cert_type: 'client', type: 'notcert', fullname: 'certclient' },
        { cert_type: 'server', type: 'notcert', fullname: 'certserver' }
      ],
      [
        ['/etc/certificates/cert', 'cert'],
        ['/etc/ssl/certs/rootcert', 'rootcert']
      ]
    ]
  ])('tests caOptions', (certsData, res) => {
    formOptions.certificates = certsData
    const wrapper = createWrapper(ModbusSerialAlarmEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    const value = wrapper.vm.caOptions
    expect(value).toEqual(res)
  })
  it('calls validate function', () => {
    const wrapper = createWrapper(ModbusSerialAlarmEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    const self = { vuciSection: { validate: vi.fn() } }
    wrapper.vm.validateRefresh(self)
    expect(self.vuciSection.validate).toHaveBeenCalled()
  })
  it('returns formatted section type', () => {
    const wrapper = createWrapper(ModbusSerialAlarmEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    expect(wrapper.vm.type).toEqual('test_alarm')
  })
  it('returns formatted section parent name', () => {
    const wrapper = createWrapper(ModbusSerialAlarmEdit, { props, global: { provide: { formOptions: () => formOptions } } })
    expect(wrapper.vm.parent).toEqual('test')
  })
  it.each([
    [
      '1',
      { id: 'test', output: 'test2', '.type': 'test_alarm' },
      [
        ['1', 'Close'],
        ['0', 'Open'],
        ['2', 'Invert']
      ]
    ],
    [
      '0',
      { id: 'test', output: 'test1', '.type': 'test_alarm' },
      [
        ['1', 'Turn On'],
        ['0', 'Turn Off'],
        ['2', 'Invert']
      ]
    ]
  ])('returns action option list when output is %s', (text, data, response) => {
    formOptions.io = ioData
    const test = {
      section: data,
      dataOptions: () => [],
      validate: () => {}
    }
    const wrapper = createWrapper(ModbusSerialAlarmEdit, { props: test, global: { provide: { formOptions: () => formOptions } } })
    expect(wrapper.vm.ioActionsOptions).toEqual(response)
  })
  it('returns output options', () => {
    const wrapper = createWrapper(ModbusSerialAlarmEdit, {
      props,
      global: {
        provide: { formOptions: () => formOptions },
        mocks: {
          $io: {
            getFilteredPinsInfo: vi.fn().mockReturnValue(ioData)
          }
        }
      }
    })
    expect(wrapper.vm.outputOptions).toEqual([
      ['test', 'prettyBoy'],
      ['test2', 'beauty']
    ])
  })
  it.each([
    [
      'full action options',
      true,
      true,
      [
        ['2', 'Modbus Write Request'],
        ['3', 'MQTT message'],
        ['4', 'Ubus event'],
        ['5', 'Email'],
        ['1', 'Trigger output'],
        ['0', 'SMS']
      ]
    ],
    [
      'only modbus action option',
      false,
      false,
      [
        ['2', 'Modbus Write Request'],
        ['3', 'MQTT message'],
        ['4', 'Ubus event'],
        ['5', 'Email']
      ]
    ]
  ])('returns %s', (text, mobile, ios, response) => {
    formOptions.mobile = mobile
    const wrapper = createWrapper(ModbusSerialAlarmEdit, {
      props,
      data: () => ({
        board: {
          hwinfo: {
            mobile,
            ios
          },
          modems: []
        }
      }),
      global: {
        provide: { formOptions: () => formOptions },
        mocks: {
          $io: {
            getFilteredPinsInfo: vi.fn().mockReturnValue(ioData)
          }
        }
      }
    })
    const val = wrapper.vm.actionOptions
    expect(val).toEqual(response)
  })
})
