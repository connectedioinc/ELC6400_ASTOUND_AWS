import ModbusEdit from '../../src/views/services/ModbusEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

vi.mock('@/composables/useUniversalGatewayUtils', () => ({
  useUniversalGatewayUtils: vi.fn(() => ({
    getTagSize: vi.fn()
  }))
}))

describe('ModbusSerial edit tests', () => {
  const props = {
    section: {
      id: 'test',
      name: 'new',
      enabled: '1',
      device: 'test',
      server_id: '1',
      timeout: '1',
      dev_ipaddr: '1',
      port: '1',
      delay: '1'
    }
  }
  const badProps = {
    section: {
      id: 'test'
    }
  }
  const formOptions = {
    sourcedRegisters: []
  }
  const baseRequest = {
    id: 'request_id',
    name: 'testRequest',
    first_reg: '10',
    function: '1',
    reg_count: '5',
    data_type: '16bit_int_hi_first',
    no_brackets: '0',
    broadcast: '0'
  }
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(ModbusEdit, {
      props,
      global: { provide: { formOptions: () => formOptions } }
    })
  })
  it('calls validate function', () => {
    const self = { vuciSection: { validate: vi.fn() } }
    wrapper.vm.validate(self)
    expect(self.vuciSection.validate).toHaveBeenCalled()
  })
  it.each([
    ['there are created requests', { test_request: [{ name: 'new' }] }, ['new']],
    ['there are no requests', { test_request1: [{ name: 'new' }] }, []]
  ])('returns request options when %s', (text, value, response) => {
    wrapper.vm.formData = value
    const val = wrapper.vm.requestList
    expect(val).toEqual(response)
  })
  it.each([
    ['exists', 'test', 'test'],
    ['doesnt exist', '', 'N/A']
  ])('returns generic display value when value %s', (text, value, response) => {
    expect(wrapper.vm.displayGeneric(value)).toEqual(response)
  })
  it.each([
    ['exists', 0, 'SMS'],
    ['doesnt exist', 6, 'N/A']
  ])('returns action display value when value %s', (text, value, response) => {
    // const wrapper = createWrapper(ModbusEdit, { props })
    expect(wrapper.vm.displayAction(value)).toEqual(response)
  })
  it.each([
    ['exists', 1, 'Read Coil Status (1)'],
    ['doesnt exist', 5, 'N/A']
  ])('returns function display value when value %s', (text, value, response) => {
    expect(wrapper.vm.displayFunction(value)).toEqual(response)
  })
  it.each([
    ['exists', 1, 'More than'],
    ['doesnt exist', 5, 'N/A']
  ])('returns condition display value when value %s', (text, value, response) => {
    expect(wrapper.vm.displayCondition(value)).toEqual(response)
  })
  it.each([[{ test_alarm: [{ enabled: '0' }] }], [{ test_alarm: [{ enabled: '1', action: '0', register: '1', telnum: '+3700', msg: 'test' }] }]])(
    'resolves when validation succeeds',
    async formData => {
      wrapper.vm.formData = formData
      await expect(wrapper.vm.validateBeforeSave()).resolves.toEqual()
    }
  )
  it.each([
    [{ test_alarm: [{ enabled: '1' }] }, 'Missing global required options'],
    [{ test_alarm: [{ enabled: '1', action: '0', register: '1' }] }, 'Missing sms action required options'],
    [{ test_alarm: [{ enabled: '1', action: '2', register: '1' }] }, 'Missing modbus action required options']
  ])('rejects when validation fails', async (formData, msg) => {
    wrapper.vm.formData = formData
    await expect(wrapper.vm.validateBeforeSave()).rejects.toEqual(msg)
  })
  it.each([
    ['format is incorrect', '45:12', { isValid: false, message: 'Time format of hh:mm:ss is accepted.' }],
    ['format is incorrect', '1:2:3', { isValid: false, message: 'Time format of hh:mm:ss is accepted.' }],
    ['format is correct', '*:24:34', { isValid: true }]
  ])('returns schedule validation results when %s', (text, value, response) => {
    wrapper.vm.$VuciValidator.timehhmmss = vi.fn()
    wrapper.vm.$VuciValidator.timehhmmss.mockReturnValue(response)
    expect(wrapper.vm.validateSchedule(value)).toEqual(response)
  })
  it.each([
    {
      description: 'section is missing required values',
      sectionOverride: badProps.section,
      requestPayload: { ...baseRequest },
      axiosResponse: undefined,
      expectedReturn: null,
      expectedTestResponse: '',
      expectedErrorMessages: ['Some values are missing (timeout,server id,IP address,port,delay)'],
      expectedPostCalls: 0
    },
    {
      description: 'backend returns error payload',
      requestPayload: { ...baseRequest },
      axiosResponse: { data: { result: 'test' } },
      expectedReturn: 'Request failed, result: test',
      expectedTestResponse: 'Request failed, result: test',
      expectedErrorMessages: [],
      expectedPostCalls: 1
    },
    {
      description: 'backend returns success payload',
      requestPayload: { ...baseRequest },
      axiosResponse: { data: { error: 0, result: 'test' } },
      expectedReturn: 'Request successful, result: test',
      expectedTestResponse: 'Request successful, result: test',
      expectedErrorMessages: [],
      expectedPostCalls: 1
    },
    {
      description: 'daemon is down',
      requestPayload: { ...baseRequest },
      axiosResponse: { data: [] },
      expectedReturn: 'Failed to send test request, daemon is down',
      expectedTestResponse: 'Failed to send test request, daemon is down',
      expectedErrorMessages: [],
      expectedPostCalls: 1
    }
  ])('tests request testing when $description', async scenario => {
    wrapper.vm.$refs.dev_ipaddr.validate = vi.fn().mockResolvedValue(true)
    wrapper.vm.$refs.delay.validate = vi.fn().mockResolvedValue(true)
    wrapper.vm.$refs.port.validate = vi.fn().mockResolvedValue(true)
    wrapper.vm.$refs.server_id.validate = vi.fn().mockResolvedValue(true)
    wrapper.vm.$refs.timeout.validate = vi.fn().mockResolvedValue(true)

    if (scenario.sectionOverride) {
      await wrapper.setProps({ section: { ...scenario.sectionOverride } })
    }

    const errorSpy = vi.spyOn(wrapper.vm.$message, 'error')
    const postMock = vi.fn()
    wrapper.vm.$axios.post = postMock
    if (scenario.axiosResponse !== undefined) {
      postMock.mockResolvedValueOnce(scenario.axiosResponse)
    }

    const result = await wrapper.vm.testRequest(scenario.requestPayload)

    expect(postMock).toHaveBeenCalledTimes(scenario.expectedPostCalls)
    if (scenario.expectedErrorMessages.length) {
      expect(errorSpy).toHaveBeenCalledTimes(scenario.expectedErrorMessages.length)
      scenario.expectedErrorMessages.forEach((message, index) => {
        expect(errorSpy).toHaveBeenNthCalledWith(index + 1, message)
      })
    } else {
      expect(errorSpy).not.toHaveBeenCalled()
    }
    expect(wrapper.vm.testResponse).toEqual(scenario.expectedTestResponse)
    expect(result).toEqual(scenario.expectedReturn)
    expect(wrapper.vm.testDisabled).toBe(false)
  })
  it.each([
    [{ response: { data: { errors: [{ code: 2 }] } } }, 'Test request timed out'],
    [{}, 'Failed to test request, check your configuration']
  ])('invokes error message when test request fails', async (resp, message) => {
    wrapper.vm.$refs.dev_ipaddr.validate = vi.fn().mockResolvedValue(true)
    wrapper.vm.$refs.delay.validate = vi.fn().mockResolvedValue(true)
    wrapper.vm.$refs.port.validate = vi.fn().mockResolvedValue(true)
    wrapper.vm.$refs.server_id.validate = vi.fn().mockResolvedValue(true)
    wrapper.vm.$refs.timeout.validate = vi.fn().mockResolvedValue(true)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce(resp)
    const result = await wrapper.vm.testRequest({ ...baseRequest })
    expect(result).toBeNull()
    expect(spy).toHaveBeenCalledWith(message)
    expect(wrapper.vm.testResponse).toEqual('')
    expect(wrapper.vm.testDisabled).toBe(false)
  })
  it('invokes error message when request payload is missing values', async () => {
    wrapper.vm.$refs.dev_ipaddr.validate = vi.fn().mockResolvedValue(true)
    wrapper.vm.$refs.delay.validate = vi.fn().mockResolvedValue(true)
    wrapper.vm.$refs.port.validate = vi.fn().mockResolvedValue(true)
    wrapper.vm.$refs.server_id.validate = vi.fn().mockResolvedValue(true)
    wrapper.vm.$refs.timeout.validate = vi.fn().mockResolvedValue(true)
    wrapper.vm.formData = { modbusSerialClient: [{ '.name': '1', parity: 'none', stopbits: '5', baudrate: '10', databits: '5', device: '/dev/rs485' }] }
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.post = vi.fn()
    const result = await wrapper.vm.testRequest({})
    expect(result).toBeNull()
    expect(wrapper.vm.$axios.post).not.toHaveBeenCalled()
    expect(wrapper.vm.testResponse).toEqual('')
    expect(spy).toHaveBeenCalledWith('Some values are missing (first register number,function,register count,data type)')
    expect(wrapper.vm.testDisabled).toBe(false)
  })
  it('invokes error message when values are invalid', async () => {
    wrapper.vm.$refs.dev_ipaddr.validate = vi.fn().mockResolvedValue(false)
    wrapper.vm.$refs.delay.validate = vi.fn().mockResolvedValue(false)
    wrapper.vm.$refs.port.validate = vi.fn().mockResolvedValue(true)
    wrapper.vm.$refs.server_id.validate = vi.fn().mockResolvedValue(true)
    wrapper.vm.$refs.timeout.validate = vi.fn().mockResolvedValue(true)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.post = vi.fn()
    const result = await wrapper.vm.testRequest({ ...baseRequest })
    expect(result).toBeNull()
    expect(wrapper.vm.$axios.post).not.toHaveBeenCalled()
    expect(spy).toHaveBeenCalledWith('Values used for testing are invalid')
    expect(wrapper.vm.testResponse).toEqual('')
    expect(wrapper.vm.testDisabled).toBe(false)
  })
  it.each([
    ['5', true],
    ['70', false]
  ])('returns true when value read only', (func, resp) => {
    expect(wrapper.vm.isModbusWriteFunction(func)).toEqual(resp)
  })
  it.each([
    ['1', true],
    ['15', false]
  ])('returns true when value read only', (func, resp) => {
    const result = wrapper.vm.validateWriteSingleValue(func, 'bool')
    expect(result.isValid).toEqual(resp)
  })
  it.each([
    ['1', 'bool', true],
    ['5', 'bool', false],
    ['fasd', '8bit_int', false],
    ['50', '8bit_int', true],
    ['129', '8bit_int', false],
    ['25000', '16bit_int_hi_first', true],
    ['40000', '16bit_int_hi_first', false],
    ['2000000', '32bit_int1234', true],
    ['3000000000000000', '32bit_int1234', false],
    ['fasd', '8bit_uint', false],
    ['50', '8bit_uint', true],
    ['129', '8bit_uint', true],
    ['25000', '16bit_uint_hi_first', true],
    ['40000', '16bit_uint_hi_first', true],
    ['2000000', '32bit_uint1234', true],
    ['3000000000000000', '32bit_uint1234', false],
    ['17e+37', '32bit_float1234', true],
    ['0xA9', 'hex', false],
    ['0xA9', 'hex', false],
    ['A9', 'hex', true]
  ])('returns validation results', (val, dataType, isValid) => {
    wrapper.vm.$VuciValidator.range = vi.fn().mockReturnValueOnce({ isValid })
    wrapper.vm.$VuciValidator.irange = vi.fn().mockReturnValueOnce({ isValid })
    wrapper.vm.$VuciValidator.integer = vi.fn().mockReturnValueOnce({ isValid })
    wrapper.vm.$VuciValidator.uinteger = vi.fn().mockReturnValueOnce({ isValid })
    wrapper.vm.$VuciValidator.hexstring = vi.fn().mockReturnValueOnce({ isValid })
    const value = wrapper.vm.validateWriteSingleValue(val, dataType)
    if (isValid) {
      expect(value.isValid).toBeTruthy()
    } else {
      expect(value.isValid).toBeFalsy()
      expect(value.message).toBeTypeOf('string')
    }
  })

  describe('validateBigIntRange', () => {
    it.each([
      ['0', true],
      ['-100', true],
      ['10.5', false],
      ['-9223372036854775808', true],
      ['-9223372036854775809', false],
      ['9223372036854775807', true],
      ['9223372036854775808', false]
    ])('check signed', (input_value, expected) => {
      const minInt64 = BigInt.asIntN(64, 2n ** 63n)
      const maxInt64 = BigInt.asIntN(64, 2n ** (64n - 1n) - 1n)
      const result = wrapper.vm.validateBigIntRange(input_value, minInt64, maxInt64)
      expect(result.isValid).toEqual(expected)
    })

    it.each([
      ['0', true],
      ['-100', false],
      ['10.5', false],
      ['18446744073709551615', true],
      ['18446744073709551616', false]
    ])('check unsigned', (input_value, expected) => {
      const minUint64 = BigInt.asUintN(64, 0n)
      const maxUint64 = BigInt.asUintN(64, 2n ** 64n - 1n)
      const result = wrapper.vm.validateBigIntRange(input_value, minUint64, maxUint64)
      expect(result.isValid).toEqual(expected)
    })
  })
})
