import DynamicDNS from '../../src/views/services/DynamicDNS.vue'
import DynamicDNSEdit from '../../src/views/services/DynamicDNSEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

const successBulk = [
  {
    success: true,
    data: [{ id: 'test1' }, { id: 'test2' }]
  },
  {
    success: true,
    data: {
      env_info: { has_ssl: true },
      service_providers: {
        test1: 'test1',
        test2: 'test2'
      },
      service_providers_ipv6: {
        test1: 'test1',
        test2: 'test2'
      }
    }
  },
  {
    success: true,
    data: [
      { id: 'inst1', type: 'client', name: 'c1' },
      { id: 'inst2', type: 'server', name: 'c2' }
    ]
  },
  {
    success: true,
    data: [{ rebind_protection: '0' }]
  }
]

const failedBulk = [
  { success: false, errors: [] },
  { success: false, errors: [] },
  { success: false, errors: [] },
  { success: false, errors: [] }
]

const successDataInfo = {
  success: true,
  data: [{ section: 'test1', pid: 0 }]
}

const fullForm = {
  interfaceData: [{ id: 'test1' }, { id: 'test2' }],
  hasSsl: true,
  providerData: { test1: 'test1', test2: 'test2' },
  providerDataIPv6: { test1: 'test1', test2: 'test2' },
  openVpnData: [
    { id: 'inst1', type: 'client', name: 'c1' },
    { id: 'inst2', type: 'server', name: 'c2' }
  ],
  rebindProtection: false
}

const emptyForm = {
  interfaceData: [],
  hasSsl: false,
  providerData: {},
  providerDataIPv6: {},
  openVpnData: [],
  rebindProtection: false
}

const existantStatuses = {
  test: { datenext: '_never_' }
}

const existantStatusesNum = {
  test: { datenext: 1111 }
}

const errorResponsePayload = {
  payload: [
    {
      errors: [
        {
          section: 'test_DNS_section'
        },
        {
          section: 'test_DNS_section_2'
        }
      ]
    }
  ]
}
const item = {
  id: 'ddns1',
  host: 'yourhost.example.com'
}

describe('DynamicDNS.vue', () => {
  it.each`
    expectedTranslation | sectionName | statusObj              | dateStat
    ${'Never'}          | ${'test'}   | ${existantStatuses}    | ${'existant'}
    ${'-'}              | ${null}     | ${{}}                  | ${'non-existant'}
    ${1111}             | ${'test'}   | ${existantStatusesNum} | ${'existant number'}
  `('returns $dateStat date translation', ({ expectedTranslation, sectionName, statusObj }) => {
    const wrapper = createWrapper(DynamicDNS)
    wrapper.vm.statuses = statusObj
    const eTranslation = wrapper.vm.getDateTranslation(sectionName, 'datenext')
    expect(eTranslation).toBe(expectedTranslation)
  })
  it.each`
    expectedStatus | section             | status
    ${'Up'}        | ${{ is_up: true }}  | ${true}
    ${'Down'}      | ${{ is_up: false }} | ${false}
    ${'Down'}      | ${undefined}        | ${undefined}
  `('returns $expectedStatus when section is_up is $status', ({ expectedStatus, section }) => {
    const wrapper = createWrapper(DynamicDNS)
    const eStatus = wrapper.vm.getStatus(section)
    expect(eStatus).toBe(expectedStatus)
  })
  it.each`
    responseData   | expectedForm | successString
    ${successBulk} | ${fullForm}  | ${'succesful'}
    ${failedBulk}  | ${emptyForm} | ${'unsuccesful'}
  `('returns loadData with $successString response', async ({ responseData, expectedForm }) => {
    const wrapper = createWrapper(DynamicDNS)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce(successDataInfo)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(responseData)
    expect(wrapper.vm.statuses).toEqual({})
    await wrapper.vm.loadData()
    expect(wrapper.vm.formOptions).toEqual(expectedForm)
  })
  it.each`
    existantVal | givenVal   | valid        | exists              | expectedObj
    ${'test1'}  | ${'test1'} | ${'invalid'} | ${'exists'}         | ${{ isValid: false, message: "Instance 'test1' already exists" }}
    ${'test2'}  | ${'test1'} | ${'valid'}   | ${'does not exist'} | ${{ isValid: true }}
  `('returns $valid object when instance $exists', ({ existantVal, givenVal, expectedObj }) => {
    const wrapper = createWrapper(DynamicDNS)
    wrapper.vm.ddns.service = [{ id: existantVal }]
    const invalidReturn = wrapper.vm.instanceExists(givenVal)
    expect(invalidReturn).toEqual(expectedObj)
  })
  it('sets ddns statuses with succesful response', async () => {
    const wrapper = createWrapper(DynamicDNS)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce(successDataInfo)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(successBulk)
    expect(wrapper.vm.statuses).toEqual({})
    await wrapper.vm.getDdnsStatuses()
    expect(wrapper.vm.statuses).toEqual({ test1: { section: 'test1', pid: 0 } })
  })
  it('exists ddns statuses when failed response', async () => {
    const wrapper = createWrapper(DynamicDNS)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce({})
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(successBulk)
    expect(wrapper.vm.statuses).toEqual({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getDdnsStatuses()
    expect(wrapper.vm.statuses).toEqual({})
    expect(spy).toHaveBeenCalled()
    vi.clearAllMocks()
  })
  it('sets formOptions correctly', async () => {
    const wrapper = createWrapper(DynamicDNS)
    const eRes = wrapper.vm.getFormOptions()
    expect(eRes).toEqual({
      interfaceData: [],
      hasSsl: false,
      providerData: {},
      providerDataIPv6: {},
      openVpnData: [],
      rebindProtection: false
    })
  })
  it('invoke error message', () => {
    const wrapper = createWrapper(DynamicDNS)
    const errorMessage = wrapper.vm.handleEditErrors(errorResponsePayload)
    expect(errorMessage).toBe("Saving failed: DDNS instance 'test_DNS_section' cannot be enabled due to invalid configuration")
    vi.clearAllMocks()
  })
  it.each`
    status                                                                                           | result
    ${{ ddns1: { is_up: true, lookup: 'test.host', reg_ip: '1.1.1.1', check: '300', force: '10' } }} | ${{ columns: [[{ class: 'success', label: 'Status', value: 'Up' }, { label: 'Hostname', value: 'test.host' }, { label: 'IP', value: '1.1.1.1' }], [{ label: 'Last Update', value: undefined }, { label: 'Next Update', value: undefined }], [{ label: 'Check Interval', value: '300' }, { label: 'Force Interval', value: '10' }]], item: { host: 'yourhost.example.com', id: 'ddns1' } }}
    ${{ ddns1: { is_up: false } }}                                                                   | ${{ columns: [[{ class: 'error', label: 'Status', value: 'Down' }, { label: 'Hostname', value: '-' }, { label: 'IP', value: '-' }], [{ label: 'Last Update', value: undefined }, { label: 'Next Update', value: undefined }], [{ label: 'Check Interval', value: '-' }, { label: 'Force Interval', value: '-' }]], item: { host: 'yourhost.example.com', id: 'ddns1' } }}
  `('returns overviewColumns when item is provided and status is $status', ({ status, result }) => {
    const wrapper = createWrapper(DynamicDNS)
    const spy1 = vi.spyOn(wrapper.vm, 'getStatus')
    const spy2 = vi.spyOn(wrapper.vm, 'getDateTranslation')
    wrapper.vm.statuses = status
    const eRes = wrapper.vm.overviewColumns(item)
    expect(spy1).toHaveBeenCalled()
    expect(spy2).toHaveBeenCalledWith(item.id, 'datelast')
    expect(spy2).toHaveBeenCalledWith(item.id, 'datenext')
    expect(eRes).toEqual(result)
  })
})

const options = {
  interfaceData: [{ id: 'test1' }, { id: 'test2' }, { id: 'loopback' }],
  hasSsl: true,
  providerData: {
    test1: 'test1',
    test2: 'test2'
  },
  providerDataIPv6: {
    test1: 'test1',
    test2: 'test2'
  }
}

const defaultWrapper = createWrapper(DynamicDNSEdit, {
  global: { provide: { formOptions: () => options } },
  props: { section: { id: 'tester', check_interval: '5,minutes', force_interval: '5,minutes' } }
})

describe('DynamicDNSEdit.vue', () => {
  it('invokes field validation', () => {
    const validateSpy = vi.fn()
    const self = {
      uciSection: { id: 'test' },
      vuciSection: { forms: { test: [{ validate: validateSpy }] } }
    }
    const wrapper = defaultWrapper
    wrapper.vm.validateField(self, 'test')
    expect(validateSpy).toHaveBeenCalled()
    vi.clearAllMocks()
  })
  it('returns an existant rule', () => {
    const wrapper = defaultWrapper
    const testRules = { minutes: 'range(5,600000)' }
    const eRule = wrapper.vm.getRule('minutes', testRules)
    expect(eRule).toBe('range(5,600000)')
  })
  it('returns default rule', () => {
    const wrapper = defaultWrapper
    const testRules = { default: 'range(0,600000)' }
    const eRule = wrapper.vm.getRule('day', testRules)
    expect(eRule).toBe('range(0,600000)')
  })
  it.each`
    givenVal | givenUnit        | expectedVal
    ${'10'}  | ${'days'}        | ${864000}
    ${'10'}  | ${'hours'}       | ${36000}
    ${'10'}  | ${'minutes'}     | ${600}
    ${'10'}  | ${'seconds'}     | ${10}
    ${'10'}  | ${'miliseconds'} | ${null}
  `('returns $givenUnit to seconds calculation', ({ givenVal, givenUnit, expectedVal }) => {
    const wrapper = defaultWrapper
    const eSeconds = wrapper.vm.calculateSeconds(givenVal, givenUnit)
    expect(eSeconds).toBe(expectedVal)
  })
  it('sets a positive ssl flag', () => {
    const wrapper = defaultWrapper
    expect(wrapper.vm.hasSSL).toBe(true)
  })
  it('sets an array of service providers', () => {
    const wrapper = defaultWrapper
    expect(wrapper.vm.serviceProviders).toEqual([['', '-- Custom --'], 'test1', 'test2'])
  })
  it('sets filtered names of interfaces', () => {
    const wrapper = defaultWrapper
    expect(wrapper.vm.interfaces).toEqual(['test1', 'test2'])
  })
  it('sets minutes force interval rule', () => {
    const wrapper = defaultWrapper
    expect(wrapper.vm.forceRule).toBe('range(5,600000)')
  })
  it('returns checkTime validation with negative isValid when field is not a number', () => {
    const wrapper = createWrapper(DynamicDNSEdit, {
      global: { provide: { formOptions: () => options } },
      props: { section: { id: 'tester', check_interval: '5,minutes', force_interval: '5,minutes' } }
    })
    wrapper.vm.$VuciValidator.uinteger = vi.fn()
    wrapper.vm.$VuciValidator.uinteger.mockReturnValueOnce({ isValid: false, message: 'not a number' })
    const eRes = wrapper.vm.checkTime('test')
    expect(eRes).toEqual({ isValid: false, message: 'not a number' })
  })
  it('returns checkTime validation with negative isValid when field is not in range', () => {
    const wrapper = createWrapper(DynamicDNSEdit, {
      global: { provide: { formOptions: () => options } },
      props: { section: { id: 'tester', check_interval: '5,minutes', force_interval: '5,minutes' } }
    })
    wrapper.vm.$VuciValidator.uinteger = vi.fn()
    wrapper.vm.$VuciValidator.uinteger.mockReturnValueOnce({ isValid: true })
    wrapper.vm.$VuciValidator.compile = vi.fn()
    wrapper.vm.$VuciValidator.compile.mockReturnValueOnce(() => ({ isValid: false, message: 'not in range' }))
    const eRes = wrapper.vm.checkTime('0')
    expect(eRes).toEqual({ isValid: false, message: 'not in range' })
  })
  it('returns checkTime validation with negative isValid when force is less than check', () => {
    const wrapper = createWrapper(DynamicDNSEdit, {
      global: { provide: { formOptions: () => options } },
      props: { section: { id: 'tester', check_interval: '10,minutes', force_interval: '5,minutes' } }
    })
    wrapper.vm.$VuciValidator.uinteger = vi.fn()
    wrapper.vm.$VuciValidator.uinteger.mockReturnValueOnce({ isValid: true })
    wrapper.vm.$VuciValidator.compile = vi.fn()
    wrapper.vm.$VuciValidator.compile.mockReturnValueOnce(() => ({ isValid: true }))
    const eRes = wrapper.vm.checkTime('0')
    expect(eRes).toEqual({ isValid: false, message: 'Force interval value must be greater than or equal to check interval' })
  })
  it('returns checkTime validation with positive isValid when force is more than check', () => {
    const wrapper = createWrapper(DynamicDNSEdit, {
      global: { provide: { formOptions: () => options } },
      props: { section: { id: 'tester', check_interval: '5,minutes', force_interval: '10,minutes' } }
    })
    wrapper.vm.$VuciValidator.uinteger = vi.fn()
    wrapper.vm.$VuciValidator.uinteger.mockReturnValueOnce({ isValid: true })
    wrapper.vm.$VuciValidator.compile = vi.fn()
    wrapper.vm.$VuciValidator.compile.mockReturnValueOnce(() => ({ isValid: true }))
    const eRes = wrapper.vm.checkTime('0')
    expect(eRes).toEqual({ isValid: true })
  })
  it('returns default inputCheckProps when check_interval does not exist', () => {
    const wrapper = createWrapper(DynamicDNSEdit, {
      global: { provide: { formOptions: () => options } },
      props: { section: { id: 'tester', check_interval: null, force_interval: '5,minutes' } }
    })
    expect(wrapper.vm.inputCheckProps).toEqual({
      prop: 'dyndns_check_interval_input',
      placeholder: '10',
      initial: '10',
      rules: ['uinteger', 'range(5,600000)'],
      required: true
    })
  })
  it('returns default inputCheckProps when check_interval value is a string', () => {
    const wrapper = createWrapper(DynamicDNSEdit, {
      global: { provide: { formOptions: () => options } },
      props: { section: { id: 'tester', check_interval: '5,minutes', force_interval: '5,minutes' } }
    })
    expect(wrapper.vm.inputCheckProps).toEqual({
      prop: 'dyndns_check_interval_input',
      placeholder: '10',
      initial: '10',
      rules: ['uinteger', 'range(5,600000)'],
      required: true
    })
  })
  it.each([
    ['passes', 'a', { isValid: true }],
    ['passes', 'z', { isValid: true }],
    ['passes', 'A', { isValid: true }],
    ['passes', 'Z', { isValid: true }],
    ['passes', '0', { isValid: true }],
    ['passes', '!', { isValid: true }],
    ['passes', '@', { isValid: true }],
    ['passes', '#', { isValid: true }],
    ['passes', '$', { isValid: true }],
    ['passes', '%', { isValid: true }],
    ['passes', '&', { isValid: true }],
    ['passes', '*', { isValid: true }],
    ['passes', '+', { isValid: true }],
    ['passes', '-', { isValid: true }],
    ['passes', '/', { isValid: true }],
    ['passes', '=', { isValid: true }],
    ['passes', '?', { isValid: true }],
    ['passes', '^', { isValid: true }],
    ['passes', '_', { isValid: true }],
    ['passes', '`', { isValid: true }],
    ['passes', '{', { isValid: true }],
    ['passes', '}', { isValid: true }],
    ['passes', '~', { isValid: true }],
    ['passes', '.', { isValid: true }],
    ['passes', '[', { isValid: true }],
    ['passes', ']', { isValid: true }],
    ['passes', ':', { isValid: true }],
    ['fails', ' ', { isValid: false, message: 'Following characters are accepted: a-zA-Z0-9!@#$%&*+-/=?^_`{|}~:.[]' }],
    ['fails', ',', { isValid: false, message: 'Following characters are accepted: a-zA-Z0-9!@#$%&*+-/=?^_`{|}~:.[]' }]
  ])('validateCustomUpdateUrl %s', async (text, val, resolve) => {
    const wrapper = createWrapper(DynamicDNSEdit, {
      global: { provide: { formOptions: () => options } },
      props: { section: {} }
    })
    const result = wrapper.vm.validateCustomUpdateUrl(val)
    expect(result).toEqual(resolve)
  })
  it.each`
    serviceName            | authenticationType | res
    ${'cloudflare.com-v4'} | ${'emailAPI'}      | ${'API token'}
    ${'cloudflare.com-v4'} | ${'bearer'}        | ${'Bearer token'}
    ${''}                  | ${''}              | ${'Password'}
  `('returns password label', async ({ serviceName, authenticationType, res }) => {
    const wrapper = createWrapper(DynamicDNSEdit, {
      global: { provide: { formOptions: () => options } },
      props: { section: { service_name: serviceName, cloudflare_authentication_type: authenticationType } }
    })
    const result = wrapper.vm.passwordLabel
    expect(result).toEqual(res)
  })
  it.each`
    use_ipv6 | expectedURL
    ${'1'}   | ${'http://checkipv6.dyndns.com'}
    ${'0'}   | ${'http://checkip.dyndns.com'}
  `('sets ip_url to $expectedURL when use_ipv6 is $use_ipv6', ({ use_ipv6, expectedURL }) => {
    const section = { id: 'test', use_ipv6, ip_url: 'http://checkip.dyndns.com' }
    const wrapper = createWrapper(DynamicDNSEdit, {
      global: { provide: { formOptions: () => options } },
      props: { section }
    })
    wrapper.vm.urlToDetect(section)
    expect(section.ip_url).toEqual(expectedURL)
  })
})
