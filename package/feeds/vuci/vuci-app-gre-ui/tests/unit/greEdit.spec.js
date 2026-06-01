import GREEdit from '../../src/views/services/GREEdit'
import createWrapper from '@tests/unit/mockFactory'
import { ipv4Utils } from '@/utils/ipUtils'

vi.mock('@/utils/ipUtils')

const networkConfigData = [
  {
    id: 'test1',
    ifname: 'test1',
    proto: 'pppoe'
  },
  {
    id: 'test2',
    ifname: 'lo',
    proto: 'pppoe'
  },
  {
    id: 'test3',
    ifname: 'test3',
    proto: 'static'
  },
  {
    id: 'test4',
    ifname: 'test4',
    proto: 'dhcp'
  },
  {
    id: 'test5',
    ifname: 'test5',
    proto: 'wwan'
  },
  {
    id: 'test6',
    ifname: 'test6',
    proto: 'connm'
  },
  {
    id: 'test7',
    ifname: 'test7',
    proto: 'test'
  }
]
const networkConfigResult = [
  ['test1', 'TEST1 (test1)'],
  ['test3', 'TEST3 (test3)'],
  ['test4', 'TEST4 (test4)'],
  ['test5_4', 'TEST5'],
  ['test6_4', 'TEST6']
]
const self = {
  name: 'target',
  uciSection: {
    target: '192.168.1.1',
    netmask: '255.255.255.255'
  }
}
const self2 = {
  name: 'target',
  uciSection: {
    target: '192.168.1.1',
    netmask: '255.255.0.0'
  }
}
const self3 = {
  name: 'target',
  uciSection: {
    target: '192.168',
    netmask: '255.255.0.0'
  }
}
const self4 = {
  name: 'netmask',
  uciSection: {
    target: '192.168',
    netmask: '255.255.0.0'
  }
}
const provide = {
  formOptions: () => {
    return {
      interfaceData: []
    }
  }
}

describe('GREEdit.vue', () => {
  it('filter network config by proto', async () => {
    const props = { section: { id: 'gre' } }
    const wrapper = createWrapper(GREEdit, {
      props,
      global: {
        provide: {
          formOptions: () => {
            return {
              interfaceData: networkConfigData
            }
          }
        }
      }
    })
    const result = await wrapper.vm.tunnelOptions
    expect(result).toEqual(networkConfigResult)
  })
  it('checks if function calling validator', () => {
    const self = { vuciSection: { validate: vi.fn() } }
    const props = { section: { id: 'gre' } }
    const wrapper = createWrapper(GREEdit, { props, global: { provide } })
    wrapper.vm.updateValidations(self)
    expect(self.vuciSection.validate).toHaveBeenCalled()
  })
  it.each([
    { value: 'test', ucinameValid: true, ip4addrValid: false, ip6addrValid: false, expectedResult: { isValid: true } },
    { value: 'aaaa', ucinameValid: true, ip4addrValid: false, ip6addrValid: false, expectedResult: { isValid: true } },
    { value: '192.168.1.1', ucinameValid: true, ip4addrValid: true, ip6addrValid: false, expectedResult: { isValid: true } },
    { value: '192.168.1.1.1', ucinameValid: true, ip4addrValid: false, ip6addrValid: false, expectedResult: { isValid: true } },
    {
      value: '192.168.1.1.1$',
      ucinameValid: false,
      ip4addrValid: false,
      ip6addrValid: false,
      expectedResult: { isValid: false, message: 'A string of a-Z, 0-9 and _ characters (maximum length of 16), IPv4 or IPv6 addresses are accepted (e.g., 192.168.1.1, ::0000:8a2e:0370:7334).' }
    },
    {
      value: '!@#$%^&*()_-',
      ucinameValid: false,
      ip4addrValid: false,
      ip6addrValid: false,
      expectedResult: { isValid: false, message: 'A string of a-Z, 0-9 and _ characters (maximum length of 16), IPv4 or IPv6 addresses are accepted (e.g., 192.168.1.1, ::0000:8a2e:0370:7334).' }
    },
    {
      value: '2001:db8:85a3::8a2e:370:7334',
      ucinameValid: false,
      ip4addrValid: false,
      ip6addrValid: true,
      expectedResult: { isValid: true }
    }
  ])('should return if tunnel is valid', ({ value, ucinameValid, ip4addrValid, ip6addrValid, expectedResult }) => {
    const props = { section: { id: 'gre' } }
    const wrapper = createWrapper(GREEdit, {
      props,
      computed: {
        tunnelOptions() {
          return [['test', 'test']]
        }
      },
      provide
    })
    wrapper.vm.$VuciValidator.ip4addr = vi.fn().mockReturnValueOnce({ isValid: ip4addrValid })
    wrapper.vm.$VuciValidator.ip6addr = vi.fn().mockReturnValueOnce({ isValid: ip6addrValid })
    wrapper.vm.$VuciValidator.uciname = vi.fn().mockReturnValueOnce({ isValid: ucinameValid })
    expect(wrapper.vm.tunnelValidation(value)).toEqual(expectedResult)
  })
  it.each([
    [
      self,
      true,
      true,
      '192.168.1.0',
      false,
      {
        isValid: false,
        message: 'To match specified netmask, "Remote subnet IP address" should be %s'.format('192.168.1.0')
      }
    ],
    [
      self,
      true,
      true,
      '192.168.1.1',
      true,
      {
        isValid: false,
        message: 'Remote subnet IP address includes router LAN.'
      }
    ],
    [self, true, true, '192.168.1.1', false, { isValid: true }],
    [self3, true, true, '192.168.1.1', false, { isValid: true }],
    [self2, false, true, '192.168.1.1', false, { isValid: false }],
    [self4, true, false, '192.168.1.1', false, { isValid: false }],
    [self4, true, true, '192.168.1.1', false, { isValid: true }]
  ])('When sections is %p, it should return %p', (self, ipValid, netmaskValid, target, inRange, result) => {
    const props = { section: { id: 'gre' } }
    const wrapper = createWrapper(GREEdit, {
      props,
      global: {
        provide: {
          formOptions: () => {
            return {
              interfaceData: [{ id: 'lan', ipaddr: '192.168.1.1' }]
            }
          }
        }
      }
    })
    wrapper.vm.$VuciValidator.ip4addr = vi.fn().mockReturnValueOnce({ isValid: ipValid })
    wrapper.vm.$VuciValidator.netmask = vi.fn().mockReturnValueOnce({ isValid: netmaskValid })
    ipv4Utils.getIPRange.mockReturnValueOnce([target, ''])
    ipv4Utils.checkIfInRange.mockReturnValueOnce(inRange)
    expect(wrapper.vm.netmaskValidation(self.uciSection.target, self)).toEqual(result)
  })
})
