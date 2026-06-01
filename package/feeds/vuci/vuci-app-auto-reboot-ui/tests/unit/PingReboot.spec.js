import createWrapper from '@tests/unit/mockFactory'
import PingReboot from '../../src/views/services/PingReboot.vue'
import PingRebootEdit from '../../src/views/services/PingRebootEdit.vue'

const modems = [
  { id: '1-1', name: 'primary', builtin: true, sim_count: 2 },
  { id: '1-2', name: 'external', builtin: false, sim_count: 1 },
  { id: '1-3', name: 'external', builtin: false, sim_count: 1 }
]
const portList = [
  { state: 'up', name: 'CPU/WiFi', position: 0, num: 0 },
  { state: 'down', name: 'LAN', position: 1, num: 2 },
  { state: 'down', name: 'WAN', position: 5, num: 5 }
]

const pingRebootResponse = [
  {
    status: 0,
    data: [
      {
        id: 'cfg01c21d',
        '.anonymous': true,
        action: '1',
        enable: '0',
        type: 'ping',
        packet_size: '56',
        '.type': 'ping_reboot',
        host: '8.8.8.8',
        '.index': 0,
        time: '5',
        interface: '1',
        stop_action: '0',
        fail_counter: '0',
        retry: '2',
        time_out: '5'
      }
    ]
  }
]

describe('PingReboot.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(PingReboot, {
      global: {
        mocks: {
          $axios: {
            bulkGet: urls => {
              const response = []
              urls.forEach(url => {
                if (url === 'services/auto_reboot/ping_wget') {
                  response.push({ data: pingRebootResponse })
                } else {
                  response.push({ data: [] })
                }
              })
              return Promise.resolve(response)
            }
          },
          $mobile: {
            loadModems: () => Promise.resolve(modems)
          }
        }
      }
    })
  })

  it.each([
    [null, '-'],
    ['ping', 'Ping']
  ])("check if displayValue returns correct value when input is '%s'", (value, expected) => {
    expect(wrapper.vm.displayValue(value)).toEqual(wrapper.vm.$t(expected))
  })

  it.each([
    [{ type: 'ping', host: '8.8.8.8', host1: null, host2: null }, '8.8.8.8', 2],
    [{ type: 'ping' }, '-', 2],
    [{ type: 'ping', host1: '8.8.8.8', host2: '8.8.8.1' }, '8.8.8.8, 8.8.8.1', 2],
    [{ type: 'ping', host2: '8.8.8.1' }, '-, 8.8.8.1', 2],
    [{ type: 'ping', host1: '8.8.8.8' }, '8.8.8.8, -', 2],
    [{ type: 'ping' }, '-', 1],
    [{ type: 'ping', host: null, host1: '1.1.1.1', host2: '2.2.2.2' }, '1.1.1.1, 2.2.2.2', 2],
    [{ type: 'ping', host: null, host1: '1.1.1.1', host2: '2.2.2.2' }, '1.1.1.1', 1],
    [{ type: 'wget', url: 'http://www.example.com' }, 'http://www.example.com', 1],
    [{ type: 'wget', url: null }, '-', 1],
    [{ type: 'port', ping_port_type: 'ping_ip', host: 'host1' }, 'host1', 1],
    [{ type: 'port', ping_port_type: 'ping_ip' }, '-', 1],
    [{ type: 'port', ping_port_type: 'ping_port', port_host: ['port1=5', 'port2=5'] }, 'Port 1 = 5, Port 2 = 5', 1],
    [{}, '-', 1]
  ])('check if displayHost returns correct value', (value, expected, simCount) => {
    const wrapper = createWrapper(PingReboot, {
      computed: { simCount: () => simCount }
    })
    expect(wrapper.vm.displayHost(value)).toEqual(expected)
  })

  it.each([
    [
      ['port1=100', 'port2=200'],
      [
        ['port1=100', 'Port 1'],
        ['port2=200', 'Port 2']
      ],
      ['Port 1 = 100', 'Port 2 = 200'],
      'Standard Ports'
    ],
    [[], [], [], 'Empty `portHost` Array'],
    [['invalid1', 'invalid2'], [], ['-', '-'], 'Invalid Format in `portHost`']
  ])('%s', (input, renamedPortList, expectedOutput) => {
    wrapper.vm.renamePortList = vi.fn().mockReturnValueOnce(renamedPortList)
    const output = wrapper.vm.getPortValue(input)
    expect(output).toEqual(expectedOutput)
  })

  it('returns 0 when modemList is empty', () => {
    expect(wrapper.vm.simCount).toBe(0)
  })

  it('returns sim_count of the only modem when modemList has one modem', () => {
    wrapper.vm.modemList = [{ sim_count: 3 }]
    expect(wrapper.vm.simCount).toBe(3)
  })

  it('returns the highest sim_count when modemList has multiple modems', () => {
    wrapper.vm.modemList = [{ sim_count: 2 }, { sim_count: 5 }, { sim_count: 3 }]
    expect(wrapper.vm.simCount).toBe(5)
  })

  it('checks if afterLoad load modem data', async () => {
    const wrapper = createWrapper(PingReboot)
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      {
        success: true,
        data: modems
      },
      { success: true, data: portList }
    ])

    await wrapper.vm.afterLoad()
    expect(wrapper.vm.modemList).toEqual(modems)
  })
  it('checks if after load shows error', async () => {
    const wrapper = createWrapper(PingReboot)
    wrapper.vm.$axios.get = vi.fn().mockRejectedValue({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalled()
  })
  it('checks if afterLoad load modem data', async () => {
    const wrapper = createWrapper(PingReboot)
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      {
        success: false
      },
      {
        success: false
      }
    ])
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalled()
  })
  it.each`
    title             | length | result
    ${'passes'}       | ${1}   | ${{ valid: true }}
    ${'throws error'} | ${30}  | ${{ valid: false, message: "Can't create more instances. Only 30 instances are allowed" }}
  `('tests if validation $title', ({ length, result }) => {
    const wrapper = createWrapper(PingReboot)
    const dataSource = Array.from({ length }, (_, index) => ({ id: 'test' + index }))
    expect(wrapper.vm.onAdd('', dataSource)).toEqual(result)
  })
  it('passes before save validation', async () => {
    const self = {
      model: '1',
      uciSection: {
        enable: '1',
        type: 'wget',
        url: 'url',
        action: 'action',
        time: 'time',
        retry: 'retry',
        time_out: 'time_out'
      }
    }
    expect(wrapper.vm.validateEnable(self)).toEqual(undefined)
    expect(self.model).toBe('1')
  })
  it('rejects before save validation', async () => {
    const self = {
      model: '1',
      uciSection: {
        enable: '1',
        type: '',
        action: '',
        time: '',
        retry: '',
        time_out: ''
      }
    }
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.validateEnable(self)
    expect(spy).toHaveBeenCalledWith('Missing required options: Action, Type, Interval, Interval count, Timeout')
  })
  it.each([
    [
      'with empty action, type, retry and time_out options',
      'Missing required options: Action, Type, Interval, Interval count, Timeout',
      { id: 'test1', enable: '1', action: '', type: '', time: '', retry: '', time_out: '' }
    ],
    [
      'with empty host option, when type is wget',
      'Missing required option: URL',
      { id: 'test1', enable: '1', action: 'action', type: 'wget', time: 'time', retry: 'retry', time_out: 'time_out', host: '' }
    ],
    [
      'with empty packet_size option, when type is ping',
      'Missing required option: Packet size',
      { id: 'test1', enable: '1', action: 'action', type: 'ping', time: 'time', retry: 'retry', time_out: 'time_out', packet_size: '' }
    ],
    [
      'with empty host option, when type is ping and inteface is equal 1',
      'Missing required option: Host to ping',
      { id: 'test1', enable: '1', action: 'action', type: 'ping', time: 'time', retry: 'retry', time_out: 'time_out', interface: '1', packet_size: '1', host: '' }
    ],
    [
      'with empty host1 and host2 options, when type is ping and inteface is equal 2',
      'Missing required options: Host to ping from SIM 1, Host to ping from SIM 2',
      { id: 'test1', enable: '1', action: 'action', type: 'ping', time: 'time', retry: 'retry', time_out: 'time_out', interface: '2', packet_size: '1', host1: '', host2: '' }
    ],
    [
      'with empty number option, when action is equal 6',
      'Missing required option: Phone number',
      { id: 'test1', enable: '1', action: '6', retry: 'retry', time: 'time', time_out: 'time_out', type: 'type', number: '', message: 'message' }
    ],
    [
      'with empty message option, when action is equal 6',
      'Missing required option: Message text',
      { id: 'test1', enable: '1', action: '6', retry: 'retry', time: 'time', time_out: 'time_out', type: 'type', number: ['3706', '845'], message: '' }
    ],
    [
      'with empty ip_type option, when ping_port_type is equal ping_ip',
      'Missing required option: IP type',
      { id: 'test1', enable: '1', action: 'action', retry: 'retry', time: 'time', time_out: 'time_out', type: 'port', ping_port_type: 'ping_ip', host: 'host' }
    ],
    [
      'with empty ip_type and host option, when ping_port_type is equal ping_ip',
      'Missing required options: IP type, Host to ping',
      { id: 'test1', enable: '1', action: 'action', retry: 'retry', time: 'time', time_out: 'time_out', type: 'port', ping_port_type: 'ping_ip' }
    ],
    [
      'with empty ping_port when type is equal port',
      'Missing required option: Ping by',
      { id: 'test1', enable: '1', action: 'action', retry: 'retry', time: 'time', time_out: 'time_out', type: 'port' }
    ],
    [
      'with empty port_host when ping_port_type is equal ping_port',
      'Missing required option: Port to ping',
      { id: 'test1', enable: '1', action: 'action', retry: 'retry', time: 'time', time_out: 'time_out', type: 'port', ping_port_type: 'ping_port' }
    ]
  ])('returns error message when %s', (text, message, sectionValues) => {
    const wrapper = createWrapper(PingReboot, {
      computed: { simCount: () => 2 }
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const data = {
      uciSection: sectionValues
    }
    wrapper.vm.validateEnable(data)
    expect(spy).toHaveBeenCalledWith(message)
  })
  it.each([
    [
      ['port1=100', 'port2=200'],
      [
        ['port1=100', 'Port 1'],
        ['port2=200', 'Port 2']
      ],
      'Basic Renaming'
    ],
    [['abc', 'def'], [], 'No Matching Types'],
    [[], [], 'Empty Array']
  ])('%s', (input, expectedOutput, _description, fromCustom = false) => {
    const output = wrapper.vm.renamePortList(input, fromCustom)
    expect(output).toEqual(expectedOutput)
  })

  it.each([
    [
      ['port1=100', 'port2=200'],
      [
        ['port1=100', 'Port 1'],
        ['port2=200', 'Port 2']
      ],
      ['Port 1 = 100', 'Port 2 = 200'],
      'Standard Ports'
    ],
    [[], [], [], 'Empty `portHost` Array'],
    [['invalid1', 'invalid2'], [], ['-', '-'], 'Invalid Format in `portHost`']
  ])('%s', (input, renamedPortList, expectedOutput) => {
    wrapper.vm.renamePortList = vi.fn().mockReturnValueOnce(renamedPortList)
    const output = wrapper.vm.getPortValue(input)
    expect(output).toEqual(expectedOutput)
  })

  it('returns 0 when modemList is empty', () => {
    expect(wrapper.vm.simCount).toBe(0)
  })

  it('returns sim_count of the only modem when modemList has one modem', () => {
    wrapper.vm.modemList = [{ sim_count: 3 }]
    expect(wrapper.vm.simCount).toBe(3)
  })

  it('returns the highest sim_count when modemList has multiple modems', () => {
    wrapper.vm.modemList = [{ sim_count: 2 }, { sim_count: 5 }, { sim_count: 3 }]
    expect(wrapper.vm.simCount).toBe(5)
  })
})

describe('PingRebootEdit.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(PingRebootEdit, {
      global: {
        provide: { modemsList: () => modems, simCount: () => 0, ports: () => [] }
      },
      props: { section: {} }
    })
  })

  it.each([
    [[], 0],
    [modems, 1]
  ])("check if computed builtInModemsCount returns correct data when input is '%s'", (modems, expected) => {
    wrapper = createWrapper(PingRebootEdit, {
      global: {
        provide: { modemsList: () => modems, simCount: () => 0, ports: () => [] }
      },
      props: { section: {} }
    })
    expect(wrapper.vm.builtInModemsCount).toBe(expected)
  })

  it("check if computed modemsList returns correct data when modems are 'undefined'", () => {
    wrapper = createWrapper(PingRebootEdit, {
      global: {
        provide: { modemsList: () => [], simCount: () => 0, ports: () => [] }
      },
      props: { section: {} }
    })
    expect(wrapper.vm.modemsList()).toEqual([])
  })

  it('check if computed actions returns correct data', async () => {
    const modems = await wrapper.vm.modemsList()
    expect(wrapper.vm.actions).toHaveLength(modems.length > 0 ? 6 : 2)
  })

  it('check if computed actions returns correct data when modemList length > 0', async () => {
    wrapper = createWrapper(PingRebootEdit, {
      global: {
        provide: { modemsList: () => [{}], simCount: () => 0, ports: () => [] }
      },
      props: { section: {} }
    })
    const modems = await wrapper.vm.modemsList()
    expect(wrapper.vm.actions).toHaveLength(modems.length > 0 ? 6 : 2)
  })

  it('check if computed interfaces returns correct data', async () => {
    const modems = await wrapper.vm.modemsList()
    expect(wrapper.vm.interfaces).toHaveLength(modems.length > 0 ? 2 : 1)
  })

  it.each([
    [
      '3',
      [
        ['1', '1 min'],
        ['2', '2 mins'],
        ['3', '3 mins'],
        ['4', '4 mins'],
        ['5', '5 mins'],
        ['15', '15 mins'],
        ['30', '30 mins'],
        ['60', '1 hour'],
        ['120', '2 hours']
      ]
    ],
    [
      '1',
      [
        ['5', '5 mins'],
        ['15', '15 mins'],
        ['30', '30 mins'],
        ['60', '1 hour'],
        ['120', '2 hours']
      ]
    ]
  ])("check if intervals returns correct data when action is '%s'", (action, expected) => {
    wrapper = createWrapper(PingRebootEdit, {
      global: {
        provide: { modemsList: () => modems, simCount: () => 0, ports: () => [] }
      },
      props: {
        section: {
          action
        }
      }
    })
    expect(wrapper.vm.intervals).toEqual(expected)
  })

  it('check if displayType returns and sets correct value', () => {
    wrapper.setData({ pingType: 'ping' })
    expect(wrapper.vm.displayType({ uciSection: { type: 'ping' } })).toEqual(wrapper.vm.pingType)
  })

  it('check if setType update data value', () => {
    wrapper.vm.setType({}, 'wget')
    expect(wrapper.vm.pingType).toEqual('wget')
  })

  it('check if revalidates all section fields', () => {
    const self = {
      vuciSection: {
        validate: vi.fn()
      }
    }
    wrapper.vm.updateValidations(self)
    expect(self.vuciSection.validate).toHaveBeenCalled()
  })

  it('method _unitChange. Event is emmited.', async () => {
    const unit = '123,test'
    wrapper.vm._unitChange(unit)
    expect(wrapper.emitted().changedUnit).toBeTruthy()
    expect(wrapper.emitted().changedUnit).toEqual([[unit]])
  })

  it('returns empty string when params is null', () => {
    expect(wrapper.vm.saveParameters(null)).toBe('')
  })

  it('returns empty string when params is an empty array', () => {
    expect(wrapper.vm.saveParameters([])).toBe('')
  })

  it('joins multiple parameters with "="', () => {
    expect(wrapper.vm.saveParameters(['param1', 'param2'])).toBe('param1=param2')
  })

  it('filters and renames port list', () => {
    wrapper.vm.ports = vi.fn().mockReturnValue(['1', '2', '3', '4'])
    wrapper.vm.renamePortList = vi.fn().mockImplementation(list => list.map(port => `renamed-${port}`))
    const result = wrapper.vm.portList([['2'], ['3']], '3')
    expect(result).toEqual(['renamed-1', 'renamed-3', 'renamed-4'])
    expect(wrapper.vm.renamePortList).toHaveBeenCalledWith(['1', '3', '4'], true)
  })

  it('returns correctly structured selectProps and inputProps', () => {
    expect(wrapper.vm.parameterInputProps).toHaveLength(2)
    expect(wrapper.vm.parameterInputProps[0]).toEqual({
      prop: 'ParamSelect',
      options: []
    })
    expect(wrapper.vm.parameterInputProps[1]).toEqual({
      prop: 'ParamInput',
      rules: ['min(1)', 'uinteger'],
      required: true,
      initial: '1'
    })
  })

  it('returns mapped modems to options', () => {
    wrapper = createWrapper(PingRebootEdit, {
      global: {
        provide: {
          modemsList: () => [
            { id: '3-1', name: 'Internal' },
            { id: '3-10', name: 'External' }
          ],
          simCount: () => 0,
          ports: () => []
        },
        mocks: {
          $mobile: {
            modemsOptions: vi.fn().mockReturnValueOnce([
              ['3-1', 'Internal'],
              ['3-10', 'External']
            ])
          }
        }
      },
      props: {
        section: {}
      }
    })
    expect(wrapper.vm.modemOptions).toEqual([
      ['3-1', 'Internal'],
      ['3-10', 'External']
    ])
  })

  it('returns default types when ports array is empty', () => {
    wrapper = createWrapper(PingRebootEdit, {
      global: {
        provide: {
          modemsList: () => [],
          simCount: () => 0,
          ports: () => []
        }
      },
      props: {
        section: {}
      }
    })
    wrapper.vm.ports = vi.fn().mockReturnValue([])
    expect(wrapper.vm.types).toEqual([
      ['ping', 'Ping'],
      ['wget', 'Wget']
    ])
  })

  it('includes port type when ports array is not empty', () => {
    wrapper = createWrapper(PingRebootEdit, {
      global: {
        provide: {
          modemsList: () => [],
          simCount: () => 0,
          ports: () => ['port1']
        }
      },
      props: {
        section: {}
      }
    })
    expect(wrapper.vm.types).toEqual([
      ['ping', 'Ping'],
      ['wget', 'Wget'],
      ['port', 'Port']
    ])
  })

  it('returns default action when section type is not port', () => {
    wrapper.vm.modemsList = vi.fn().mockReturnValue([])
    wrapper.vm.section.type = 'not-port'
    expect(wrapper.vm.actions).toEqual([
      ['3', 'None'],
      ['1', 'Device reboot']
    ])
  })

  it('includes modem and mobile connection actions when modemsList is not empty and section type is not port', () => {
    wrapper.vm.modemsList = vi.fn().mockReturnValue(['modem1'])
    wrapper.vm.section.type = 'not-port'
    expect(wrapper.vm.actions).toEqual([
      ['3', 'None'],
      ['1', 'Device reboot'],
      ['2', 'Modem reboot'],
      ['4', '(Re)register'],
      ['5', 'Restart mobile connection'],
      ['6', 'Send SMS']
    ])
  })

  it('includes restart port action when section type is port', () => {
    wrapper.vm.modemsList = vi.fn().mockReturnValue([])
    wrapper.vm.section.type = 'port'
    expect(wrapper.vm.actions).toEqual([
      ['3', 'None'],
      ['7', 'Restart port']
    ])
  })

  it('returns default types when ports array is empty', () => {
    wrapper.vm.ports = vi.fn().mockReturnValue([])
    expect(wrapper.vm.types).toEqual([
      ['ping', 'Ping'],
      ['wget', 'Wget']
    ])
  })

  it('includes port type when ports array is not empty', () => {
    wrapper = createWrapper(PingRebootEdit, {
      global: {
        provide: {
          modemsList: () => [],
          simCount: () => 0,
          ports: () => ['port1']
        }
      },
      props: {
        section: {}
      }
    })
    expect(wrapper.vm.types).toEqual([
      ['ping', 'Ping'],
      ['wget', 'Wget'],
      ['port', 'Port']
    ])
  })

  it('returns empty string when params is null', () => {
    expect(wrapper.vm.saveParameters(null)).toBe('')
  })

  it('returns empty string when params is an empty array', () => {
    expect(wrapper.vm.saveParameters([])).toBe('')
  })

  it('joins multiple parameters with "="', () => {
    expect(wrapper.vm.saveParameters(['param1', 'param2'])).toBe('param1=param2')
  })

  it('filters and renames port list', () => {
    wrapper.vm.ports = vi.fn().mockReturnValue(['1', '2', '3', '4'])
    wrapper.vm.renamePortList = vi.fn().mockImplementation(list => list.map(port => `renamed-${port}`))
    const result = wrapper.vm.portList([['2'], ['3']], '3')
    expect(result).toEqual(['renamed-1', 'renamed-3', 'renamed-4'])
    expect(wrapper.vm.renamePortList).toHaveBeenCalledWith(['1', '3', '4'], true)
  })

  it('method _unitChange. Event is emmited.', async () => {
    const unit = '123,test'
    wrapper.vm._unitChange(unit)
    expect(wrapper.emitted().changedUnit).toBeTruthy()
    expect(wrapper.emitted().changedUnit).toEqual([[unit]])
  })

  it('returns correctly structured selectProps and inputProps', () => {
    expect(wrapper.vm.parameterInputProps).toHaveLength(2)
    expect(wrapper.vm.parameterInputProps[0]).toEqual({
      prop: 'ParamSelect',
      options: []
    })
    expect(wrapper.vm.parameterInputProps[1]).toEqual({
      prop: 'ParamInput',
      rules: ['min(1)', 'uinteger'],
      required: true,
      initial: '1'
    })
  })

  it('returns default action when section type is not port', () => {
    wrapper.vm.modemsList = vi.fn().mockReturnValue([])
    wrapper.vm.section.type = 'not-port'
    expect(wrapper.vm.actions).toEqual([
      ['3', 'None'],
      ['1', 'Device reboot']
    ])
  })

  it('includes modem and mobile connection actions when modemsList is not empty and section type is not port', () => {
    wrapper.vm.modemsList = vi.fn().mockReturnValue(['modem1'])
    wrapper.vm.section.type = 'not-port'
    expect(wrapper.vm.actions).toEqual([
      ['3', 'None'],
      ['1', 'Device reboot'],
      ['2', 'Modem reboot'],
      ['4', '(Re)register'],
      ['5', 'Restart mobile connection'],
      ['6', 'Send SMS']
    ])
  })

  it('includes restart port action when section type is port', () => {
    wrapper.vm.modemsList = vi.fn().mockReturnValue([])
    wrapper.vm.section.type = 'port'
    expect(wrapper.vm.actions).toEqual([
      ['3', 'None'],
      ['7', 'Restart port']
    ])
  })
})
