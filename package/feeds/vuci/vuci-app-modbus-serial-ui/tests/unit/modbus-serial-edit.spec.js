import ModbusSerialEdit from '../../src/views/services/ModbusSerialEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

vi.mock('@/composables/useUniversalGatewayUtils', () => ({
  useUniversalGatewayUtils: vi.fn(() => ({
    getTagSize: vi.fn()
  }))
}))

describe('ModbusSerial edit tests', () => {
  const baseProps = {
    section: {
      id: 'test',
      name: 'new',
      enabled: '1',
      rtu_device: '1'
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
  const createProps = () => ({
    section: { ...baseProps.section }
  })

  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(ModbusSerialEdit, {
      props: createProps(),
      global: { provide: { formOptions: () => formOptions } }
    })
  })
  it.each([
    ['there are created requests', { test_request: [{ name: 'new' }] }, ['new']],
    ['there are no requests', { test_request1: [{ name: 'new' }] }, []]
  ])('returns request options when %s', (text, value, response) => {
    wrapper.vm.formData = value
    const val = wrapper.vm.requestList
    expect(val).toEqual(response)
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
  it('calls validate function', () => {
    const self = { vuciSection: { validate: vi.fn() } }
    wrapper.vm.validate(self)
    expect(self.vuciSection.validate).toHaveBeenCalled()
  })
  it('returns rtu devices', () => {
    wrapper.vm.formData = { modbusSerialClient: [{ id: '1' }, { id: '2', name: 'test2' }] }
    expect(wrapper.vm.rtuDevices).toEqual([
      ['1', '1'],
      ['2', 'test2']
    ])
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
  it.each([
    ['format is incorrect', '45:12', { isValid: false, message: 'Time of format hh:mm:ss is accepted.' }],
    ['format is incorrect', '1:2:3', { isValid: false, message: 'Time of format hh:mm:ss is accepted.' }],
    ['format is correct', '*:24:34', { isValid: true }]
  ])('returns schedule validation results when %s', (text, value, response) => {
    wrapper.vm.$VuciValidator.timehhmmss = vi.fn()
    wrapper.vm.$VuciValidator.timehhmmss.mockReturnValue(response)
    expect(wrapper.vm.validateSchedule(value)).toEqual(response)
  })
  const fullSection = {
    section: {
      id: 'test',
      name: 'new',
      enabled: '1',
      rtu_device: '1',
      timeout: '10',
      server_id: '5'
    }
  }

  const testRequestFormData = {
    test_request: [{ ...baseRequest }],
    modbusSerialClient: [{ id: '1', parity: 'none', stopbits: '5', baudrate: '10', databits: '5', device: '/dev/rs485', flowcontrol: 'none' }]
  }
  it.each([
    {
      description: 'serial client details are missing',
      section: fullSection,
      formData: { test_request: [{ ...baseRequest }], modbusSerialClient: [{ id: '1' }] },
      requestPayload: { ...baseRequest },
      expectedReturn: null,
      expectedTestResponse: '',
      expectedErrorMessages: ['Some values are missing (client section parity,client section stopbits,client section baudrate,client section databits,client section device,client flow control)'],
      axiosResponse: undefined,
      expectedPostCalls: 0
    },
    {
      description: 'backend returns error payload',
      section: fullSection,
      formData: testRequestFormData,
      requestPayload: { ...baseRequest },
      expectedReturn: 'Request failed, result: test',
      expectedTestResponse: 'Request failed, result: test',
      expectedErrorMessages: [],
      axiosResponse: { data: { result: 'test' } },
      expectedPostCalls: 1
    },
    {
      description: 'backend returns success payload',
      section: fullSection,
      formData: testRequestFormData,
      requestPayload: { ...baseRequest },
      expectedReturn: 'Request successful, result: test',
      expectedTestResponse: 'Request successful, result: test',
      expectedErrorMessages: [],
      axiosResponse: { data: { error: 0, result: 'test' } },
      expectedPostCalls: 1
    },
    {
      description: 'daemon is down',
      section: fullSection,
      formData: testRequestFormData,
      requestPayload: { ...baseRequest },
      expectedReturn: 'Failed to send test request, daemon is down',
      expectedTestResponse: 'Failed to send test request, daemon is down',
      expectedErrorMessages: [],
      axiosResponse: { data: [] },
      expectedPostCalls: 1
    }
  ])('tests request testing when $description', async scenario => {
    const localWrapper = createWrapper(ModbusSerialEdit, {
      props: { section: { ...scenario.section.section } },
      global: { provide: { formOptions: () => formOptions } }
    })
    localWrapper.vm.$refs.server_id.validate = vi.fn().mockResolvedValue(true)
    localWrapper.vm.$refs.timeout.validate = vi.fn().mockResolvedValue(true)
    localWrapper.vm.formData = JSON.parse(JSON.stringify(scenario.formData))

    const errorSpy = vi.spyOn(localWrapper.vm.$message, 'error')
    const postMock = vi.fn()
    localWrapper.vm.$axios.post = postMock
    if (scenario.axiosResponse !== undefined) {
      postMock.mockResolvedValueOnce(scenario.axiosResponse)
    }

    const result = await localWrapper.vm.testRequest(scenario.requestPayload)

    expect(postMock).toHaveBeenCalledTimes(scenario.expectedPostCalls)
    if (scenario.expectedErrorMessages.length) {
      expect(errorSpy).toHaveBeenCalledTimes(scenario.expectedErrorMessages.length)
      scenario.expectedErrorMessages.forEach((message, index) => {
        expect(errorSpy).toHaveBeenNthCalledWith(index + 1, message)
      })
    } else {
      expect(errorSpy).not.toHaveBeenCalled()
    }

    expect(localWrapper.vm.testResponse).toEqual(scenario.expectedTestResponse)
    expect(result).toEqual(scenario.expectedReturn)
    expect(localWrapper.vm.testDisabled).toBe(false)
  })
  it.each([
    [{ response: { data: { errors: [{ code: 2 }] } } }, 'Test request timed out'],
    [{}, 'Failed to test request, check your configuration']
  ])('invokes error message when test request fails', async (resp, message) => {
    await wrapper.setProps({ section: { ...fullSection.section } })
    wrapper.vm.formData = JSON.parse(JSON.stringify(testRequestFormData))
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
  it('invokes error message when test request payload is missing values', async () => {
    await wrapper.setProps({ section: { ...fullSection.section } })
    wrapper.vm.formData = JSON.parse(JSON.stringify(testRequestFormData))
    wrapper.vm.$refs.server_id.validate = vi.fn().mockResolvedValue(true)
    wrapper.vm.$refs.timeout.validate = vi.fn().mockResolvedValue(true)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.post = vi.fn()
    const result = await wrapper.vm.testRequest({})
    expect(result).toBeNull()
    expect(wrapper.vm.$axios.post).not.toHaveBeenCalled()
    expect(wrapper.vm.testResponse).toEqual('')
    expect(spy).toHaveBeenCalledWith('Some values are missing (first register number,function,register count,data type)')
    expect(wrapper.vm.testDisabled).toBe(false)
  })
  it('invokes error message when serial request data is incomplete', async () => {
    wrapper.vm.formData = {
      test_request: [{ ...baseRequest }],
      modbusSerialClient: [{ id: '1', parity: 'none' }]
    }
    await wrapper.setProps({ section: { ...fullSection.section } })
    wrapper.vm.$refs.server_id.validate = vi.fn().mockResolvedValue(true)
    wrapper.vm.$refs.timeout.validate = vi.fn().mockResolvedValue(true)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.post = vi.fn()
    const result = await wrapper.vm.testRequest({ ...baseRequest })
    expect(result).toBeNull()
    expect(wrapper.vm.$axios.post).not.toHaveBeenCalled()
    expect(wrapper.vm.testResponse).toEqual('')
    expect(spy).toHaveBeenCalledWith('Some values are missing (client section stopbits,client section baudrate,client section databits,client section device,client flow control)')
    expect(wrapper.vm.testDisabled).toBe(false)
  })
  it('invokes error message when values are invalid', async () => {
    await wrapper.setProps({ section: { ...fullSection.section } })
    wrapper.vm.$refs.server_id.validate = vi.fn().mockResolvedValue(false)
    wrapper.vm.$refs.timeout.validate = vi.fn().mockResolvedValue(false)
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
    ['1', 'bool', { isValid: true }],
    ['5', 'bool', { isValid: false, message: 'Only bool values are accepted' }],
    ['fasd', '8bit_int', { isValid: false, message: 'integer' }],
    ['50', '8bit_int', { isValid: true }],
    ['129', '8bit_int', { isValid: false, message: 'out of range' }],
    ['25000', '16bit_int_hi_first', { isValid: true }],
    ['40000', '16bit_int_hi_first', { isValid: false, message: 'out of range' }],
    ['2000000', '32bit_int1234', { isValid: true }],
    ['3000000000000000', '32bit_int1234', { isValid: false, message: 'out of range' }],
    ['fasd', '8bit_uint', { isValid: false, message: 'integer' }],
    ['50', '8bit_uint', { isValid: true }],
    ['129', '8bit_uint', { isValid: true }],
    ['25000', '16bit_uint_hi_first', { isValid: true }],
    ['40000', '16bit_uint_hi_first', { isValid: true }],
    ['2000000', '32bit_uint1234', { isValid: true }],
    ['3000000000000000', '32bit_uint1234', { isValid: false, message: 'out of range' }],
    ['17e+37', '32bit_float1234', { isValid: true }],
    ['0xA9', 'hex', { isValid: false, message: 'A hexadecimal string of symbols: a-f, A-F and 0-9 is accepted.' }],
    ['0XA9', 'hex', { isValid: false, message: 'A hexadecimal string of symbols: a-f, A-F and 0-9 is accepted.' }],
    ['A9', 'hex', { isValid: true }],
    [
      'u00ADzxchvgasdjhfcgasdjkhcfbasdjhvbalsjhbfaljsdhfbajhbvaljsfvjxhcbvljahsdblajhfbvljafbvjlafdsfajdhfvajshdvajshdbajshdbvajlhfdbvajlhsdalhdfasdjkfhasdjkhvgbasjkhdfvgasjdkhfvbasdhjvbasjkdhbcasdjhbcasjdhbcjakshbfajshdbasjdasdljhasdljhasdjhbasljhfasljhdalshbajldajhdb',
      'ascii',
      { isValid: false, message: 'Only 250 characters are allowed' }
    ],
    ['u00ADzxchvgasdjhfcgasdjkhcfbasdjhvbalsjhbfaljsdhfbajhbvaljsfvjxhcbvljahsdblajhfbvljafbvjlafdsfajdhf', 'ascii', { isValid: true }]
  ])('returns validation results', (val, dataType, result) => {
    wrapper.vm.$VuciValidator.irange = vi.fn().mockReturnValueOnce(result)
    wrapper.vm.$VuciValidator.range = vi.fn().mockReturnValueOnce(result)
    wrapper.vm.$VuciValidator.integer = vi.fn().mockReturnValueOnce(result)
    wrapper.vm.$VuciValidator.uinteger = vi.fn().mockReturnValueOnce(result)
    wrapper.vm.boolValidation = vi.fn().mockReturnValueOnce(result.isValid)
    wrapper.vm.$VuciValidator.hexstring = vi.fn().mockReturnValueOnce(result)
    const value = wrapper.vm.validateWriteSingleValue(val, dataType)
    if (result.isValid) {
      expect(value.isValid).toBeTruthy()
    } else {
      expect(value.isValid).toBeFalsy()
      expect(value.message).toBeTypeOf('string')
    }
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
  const smallString =
    '1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0'
  const bigString =
    '1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0' +
    ' 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1' +
    ' 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0 0 1 1 0 0 1 0 1 0 1 1 1 0 1 1 1 0 1 1 1 0 1 0 0 0 1 1 1 0 1 0 1 1 0 0 1 0'
  const invalidString = '1 0 1 0 1 0'
  it.each([
    [smallString, 'hex', { isValid: false, message: 'Only 250 values are allowed' }],
    [smallString, '16bit', { isValid: false, message: 'Only 125 values are allowed' }],
    [smallString, '32bit', { isValid: false, message: 'Only 62 values are allowed' }],
    [bigString, 'bool', { isValid: false, message: 'Only 2000 values are allowed' }],
    [invalidString, 'bool', { isValid: false, message: 'fail' }],
    [invalidString, 'bool', { isValid: true }]
  ])('returns multi value validation results', (val, dataType, ret) => {
    wrapper.vm.validateWriteMultipleValue = vi.fn().mockReturnValue(ret)
    expect(wrapper.vm.validateModbusValue(val, '16', dataType)).toEqual(ret)
  })
})
