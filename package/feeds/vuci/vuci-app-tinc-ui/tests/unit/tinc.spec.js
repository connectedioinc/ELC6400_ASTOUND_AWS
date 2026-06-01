import Tinc from '../../src/views/services/Tinc.vue'
import TincEdit from '../../src/views/services/TincEdit.vue'
import TincHostEdit from '../../src/views/services/TincHostEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

let tincData = [
  {
    id: 'test1',
    '.type': 'test1'
  },
  {
    id: 'test2',
    '.type': 'test2'
  }
]
let interfaceData = [
  {
    id: 'test1'
  },
  {
    id: 'test2'
  }
]

describe('Tinc.vue', () => {
  it.each([{ iface: { success: false, data: [] } }, { iface: { success: true, data: interfaceData } }, { iface: { success: true, data: [] } }])(
    'loads data about all gre instance routes',
    async ({ iface }) => {
      const wrapper = createWrapper(Tinc)
      wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([iface, { data: [] }])
      const result = await wrapper.vm.loadHosts({ tinc: [{ id: 'test' }] })
      expect(result).toEqual({ tinc_hosts: [] })
    }
  )
  it.each([0, 1, -1])('removes corresponding hosts when tinc interface is deleted (using index %i)', indexOffset => {
    const wrapper = createWrapper(Tinc)
    const tincIfaces = tincData
    const uciData = {
      tinc_hosts: []
    }
    tincIfaces.forEach((iface, index) => {
      uciData.tinc_hosts.push({
        '.type': `tinc-host_${iface.id}`,
        id: `cfg${1000 + index}`
      })
    })
    const deletedIndex = (tincIfaces.length + indexOffset) % tincIfaces.length
    const deletedSection = tincIfaces[deletedIndex]
    wrapper.vm.deleteHosts(deletedSection, uciData)
    const hostsExist = uciData.tinc_hosts.some(host => host['.type'] === `tinc_${deletedSection.id}`)
    expect(hostsExist).toEqual(false)
  })
  it.each`
    title             | length | result
    ${'passes for 4'} | ${1}   | ${{ valid: true }}
    ${'passes for 5'} | ${4}   | ${{ valid: true }}
    ${'throws error'} | ${5}   | ${{ valid: false, message: 'Cannot create more instances. Only 5 instances are allowed.' }}
  `('tests if validation $title', ({ length, result }) => {
    const wrapper = createWrapper(Tinc)
    const dataSource = Array.from({ length }, (_, index) => ({ id: 'test' + index }))
    expect(wrapper.vm.onAdd('', dataSource)).toEqual(result)
  })
  it.each([
    ['missing private key', 'Missing required option: Private key', { enabled: '1', publickeyfile: 'public.key' }],
    ['missing public key', 'Missing required option: Public key', { enabled: '1', privatekeyfile: 'private.key' }],
    ['missing both keys', 'Missing required options: Private key, Public key', { enabled: '1' }]
  ])('validates enable when %s', (scenario, expectedError, sectionValues) => {
    const wrapper = createWrapper(Tinc)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const data = {
      uciSection: sectionValues
    }
    wrapper.vm.validateEnable(data)
    expect(spy).toHaveBeenCalledWith(expectedError)
  })
})

describe('TincEdit.vue', () => {
  it('validates if a host with same name does not already exist', () => {
    const props = { section: interfaceData[0] }
    const wrapper = createWrapper(TincEdit, { props })
    wrapper.setData({ formData: { tinc_hosts: tincData } })
    expect(wrapper.vm.validateHostName(tincData[0].id)).toEqual({
      isValid: false,
      message: 'Tinc host with same name already exists.'
    })
    expect(wrapper.vm.validateHostName('tinc_host_new')).toEqual({
      isValid: true
    })
  })
  it.each([
    ['passes', { isValid: true }, { isValid: false }, '192.168.1.0/24', { isValid: true }],
    ['passes', { isValid: false }, { isValid: true }, '00:1a:2b:3c:4b:5c', { isValid: true }],
    [
      'passes',
      { isValid: false },
      { isValid: false },
      'testas',
      { isValid: false, message: 'One of the following: IPv4, IPv6 or MAC addresses are accepted (e.g., 192.168.1.0/24, 00:1a:2b:3c:4b:5c).' }
    ]
  ])('return validation result for passthrough validation %s', async (text, ipmaskValidation, macaddrValidation, form, resolve) => {
    const props = { section: tincData[0] }
    const wrapper = createWrapper(TincEdit, { props })
    wrapper.vm.$VuciValidator.ipmask = vi.fn()
    wrapper.vm.$VuciValidator.ipmask.mockReturnValueOnce(ipmaskValidation)
    wrapper.vm.$VuciValidator.macaddr = vi.fn()
    wrapper.vm.$VuciValidator.macaddr.mockReturnValueOnce(macaddrValidation)
    const val = wrapper.vm.validateSubnet(form)
    expect(val).toEqual(resolve)
  })
  it.each`
    title                          | length | result
    ${'allows adding when < 20'}   | ${19}  | ${{ valid: true }}
    ${'allows adding when = 0'}    | ${0}   | ${{ valid: true }}
    ${'prevents adding when = 20'} | ${20}  | ${{ valid: false, message: 'Cannot create more instances. Only 20 instances are allowed.' }}
    ${'prevents adding when > 20'} | ${21}  | ${{ valid: false, message: 'Cannot create more instances. Only 20 instances are allowed.' }}
  `('tests if validation $title', ({ length, result }) => {
    const props = { section: tincData[0] }
    const wrapper = createWrapper(TincEdit, { props })
    const dataSource = Array.from({ length }, (_, index) => ({ id: 'test' + index }))
    expect(wrapper.vm.onAdd('', dataSource)).toEqual(result)
  })
  it.each`
    title                          | initialConnectTo      | deletedId  | expected
    ${'removes existing host'}     | ${['host1', 'host2']} | ${'host2'} | ${['host1']}
    ${'ignores non-existent host'} | ${['host1', 'host2']} | ${'host3'} | ${['host1', 'host2']}
  `('$title', ({ initialConnectTo, deletedId, expected }) => {
    const props = { section: tincData[0] }
    const wrapper = createWrapper(TincEdit, { props })
    const uciData = {
      tinc: [{ connectto: [...initialConnectTo] }]
    }
    const deletedSection = { id: deletedId }
    wrapper.vm.deleteHosts(deletedSection, uciData)
    expect(uciData.tinc[0].connectto).toEqual(expected)
  })
  it.each`
    title                                       | sectionId | tinc_hosts                                                      | expected
    ${'returns matching hosts for the section'} | ${'net1'} | ${[{ id: 'host1', net: 'net1' }, { id: 'host2', net: 'net1' }]} | ${[['host1', 'host1'], ['host2', 'host2']]}
    ${'filters out non-matching hosts'}         | ${'net1'} | ${[{ id: 'host1', net: 'net1' }, { id: 'host2', net: 'net2' }]} | ${[['host1', 'host1']]}
    ${'returns empty array for no matches'}     | ${'net3'} | ${[{ id: 'host1', net: 'net1' }, { id: 'host2', net: 'net2' }]} | ${[]}
    ${'handles empty tinc_hosts'}               | ${'net1'} | ${[]}                                                           | ${[]}
    ${'handles undefined tinc_hosts'}           | ${'net1'} | ${undefined}                                                    | ${[]}
  `('$title', ({ sectionId, tinc_hosts, expected }) => {
    const wrapper = createWrapper(TincEdit, {
      props: {
        section: { id: sectionId }
      },
      data() {
        return {
          formData: {
            tinc_hosts: tinc_hosts
          }
        }
      }
    })
    expect(wrapper.vm.hostOptions).toEqual(expected)
  })
  it.each`
    title                               | formData                                                      | portToValidate | expected
    ${'valid when port is unique'}      | ${{ tinc: [{ port: 1000 }, { port: 2000 }] }}                 | ${3000}        | ${{ isValid: true, message: 'Port number must be unique' }}
    ${'valid when port exists once'}    | ${{ tinc: [{ port: 1000 }, { port: 2000 }] }}                 | ${1000}        | ${{ isValid: true, message: 'Port number must be unique' }}
    ${'invalid when port exists twice'} | ${{ tinc: [{ port: 1000 }, { port: 1000 }, { port: 2000 }] }} | ${1000}        | ${{ isValid: false, message: 'Port number must be unique' }}
    ${'valid when tinc array is empty'} | ${{ tinc: [] }}                                               | ${1000}        | ${{ isValid: true, message: 'Port number must be unique' }}
  `('$title', ({ formData, portToValidate, expected }) => {
    const wrapper = createWrapper(TincEdit, {
      props: {
        section: [
          { id: 'section1', name: 'Section 1' },
          { id: 'section2', name: 'Section 2' }
        ]
      },
      data() {
        return { formData }
      }
    })
    const result = wrapper.vm.validateDuplicatePort(portToValidate)
    expect(result).toEqual(expected)
  })
  it('validates enable by checking if publickeyfile exists', () => {
    const wrapper = createWrapper(TincEdit, {
      props: {
        section: [{ section: tincData[0] }]
      }
    })
    const self = {
      uciSection: {
        publickeyfile: '',
        enabled: '1'
      }
    }
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.validateEnable(self)
    expect(spy).toHaveBeenCalled()
  })

  describe('TincHostEdit.vue', () => {
    it.each([
      ['valid IP', '192.168.1.1', { isValid: true }, { isValid: true }, { isValid: false }, { isValid: true }],
      ['valid IPv6', '::0000:8a2e:0370:7334', { isValid: false }, { isValid: true }, { isValid: false }, { isValid: true }],
      ['valid domain', 'example.com', { isValid: true }, { isValid: false }, { isValid: false }, { isValid: true }],
      ['valid IP with port', '192.168.1.1:8080', { isValid: false }, { isValid: false }, { isValid: true }, { isValid: true }],
      ['valid IPv6 with port', '[::0000:8a2e:0370]:7334', { isValid: false }, { isValid: false }, { isValid: true }, { isValid: true }],
      ['valid domain with port', 'example.com:8080', { isValid: false }, { isValid: false }, { isValid: true }, { isValid: true }],
      [
        'invalid address',
        'invalid_address',
        { isValid: false },
        { isValid: false },
        { isValid: false },
        {
          isValid: false,
          message: 'Domain names or IP addresses with an optional port number accepted (e.g., 192.168.1.1, [::0000:8a2e:0370]:7334, example.com).'
        }
      ]
    ])('addressValidation %s', async (testName, input, hostValidation, ip6Validation, hostIpPortValidation, expected) => {
      const props = {
        section: {
          address: ['domain.com:8080', '192.168.1.1', 'domain.com', '192.168.1.1:80', '::0000:8a2e:0370:7334', '123asd,']
        }
      }
      const wrapper = createWrapper(TincHostEdit, { props })
      wrapper.vm.$VuciValidator.host = vi.fn().mockReturnValue(hostValidation)
      wrapper.vm.$VuciValidator.ip6addr = vi.fn().mockReturnValue(ip6Validation)
      wrapper.vm.$VuciValidator.hostipport = vi.fn().mockReturnValue(hostIpPortValidation)
      wrapper.vm.$t = vi.fn().mockImplementation(key => key)
      const result = wrapper.vm.addressValidation(input)
      expect(result).toEqual(expected)
      expect(wrapper.vm.$VuciValidator.value).toBe(input)
    })
    it.each([
      {
        title: 'returns specific error message for code 152',
        errorCode: 152,
        expected: 'Uploaded certificate is not valid'
      },
      {
        title: 'returns default error message for unknown error code',
        errorCode: 103,
        expected: 'Failed to edit configuration'
      }
    ])('handleEditErrors $title', ({ errorCode, expected }) => {
      const props = { section: tincData[0] }
      const wrapper = createWrapper(TincEdit, { props })
      const mockResponse = {
        data: {
          errors: [
            {
              code: errorCode
            }
          ]
        }
      }
      const result = wrapper.vm.handleEditErrors(mockResponse)
      expect(result).toEqual(expected)
    })
  })
})
