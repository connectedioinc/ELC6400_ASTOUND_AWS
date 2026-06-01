import { ipv4Utils, ipv6Utils, ipUtilsFactory } from '@/utils/ipUtils'
import '@ui-core/utils/string-format'

describe('ipUtils.js', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })
  describe('ipv4', () => {
    it.each`
      cidr                | from             | to
      ${'192.168.1.5/24'} | ${'192.168.1.0'} | ${'192.168.1.255'}
      ${'100.10.10.5/3'}  | ${'96.0.0.0'}    | ${'127.255.255.255'}
    `('returns ipv4 range from cidr #%#', ({ cidr, from, to }) => {
      const res = ipv4Utils.cidrToRange(cidr)
      expect(res).toEqual([from, to])
    })
    it.each`
      ip               | mask               | from             | to
      ${'192.168.1.5'} | ${'255.255.255.0'} | ${'192.168.1.0'} | ${'192.168.1.255'}
      ${'100.10.10.5'} | ${'224.0.0.0'}     | ${'96.0.0.0'}    | ${'127.255.255.255'}
    `('returns ipv4 range from ip and mask #%#', ({ ip, mask, from, to }) => {
      const res = ipv4Utils.getIPRange(ip, mask)
      expect(res).toEqual([from, to])
    })
    it.each`
      ip               | min               | max                | inclusive    | res
      ${'192.168.1.5'} | ${'192.168.1.0'}  | ${'192.168.1.255'} | ${undefined} | ${true}
      ${'192.168.1.5'} | ${'192.168.1.10'} | ${'192.168.1.255'} | ${undefined} | ${false}
      ${'192.168.1.0'} | ${'192.168.1.0'}  | ${'192.168.1.255'} | ${false}     | ${false}
      ${'192.168.1.0'} | ${'192.168.1.0'}  | ${'192.168.1.255'} | ${true}      | ${true}
    `('returns if ip is in range #%#', ({ ip, min, max, inclusive, res }) => {
      expect(res).toEqual(ipv4Utils.checkIfInRange(ip, min, max, inclusive))
    })
    it.each`
      number        | result
      ${1610612736} | ${'96.0.0.0'}
      ${2147483647} | ${'127.255.255.255'}
    `('returns ipv4 address converted from int #%#', ({ number, result }) => {
      expect(ipv4Utils.int2ip(number)).toEqual(result)
    })
    it.each`
      ipv4                 | result
      ${'96.0.0.0'}        | ${1610612736}
      ${'127.255.255.255'} | ${2147483647}
    `('returns int from ipv4 address  #%#', ({ ipv4, result }) => {
      expect(ipv4Utils.ip2int(ipv4)).toEqual(result)
    })
    it.each`
      netmask            | result
      ${'255.255.255.0'} | ${24}
      ${'255.192.0.0'}   | ${10}
      ${'224.0.0.0'}     | ${3}
    `('returns int from ipv4 mask #%#', ({ netmask, result }) => {
      expect(ipv4Utils.netmaskToNumber(netmask)).toEqual(result)
    })
    it.each`
      cdir  | netmask
      ${1}  | ${'128.0.0.0'}
      ${22} | ${'255.255.252.0'}
      ${32} | ${'255.255.255.255'}
    `('converts CIDR prefix to dotted netmask #%#', ({ cdir, netmask }) => {
      expect(ipv4Utils.numberToMask(cdir)).toEqual(netmask)
    })
    it('check if wildcardMask method return correct value', () => {
      expect(ipv4Utils.wildcardMask(['255', '255', '255', '0'])).toEqual([0, 0, 0, 255])
    })
    it('check if broadcast method return correct value', () => {
      expect(ipv4Utils.broadcast([192, 168, 1, 0], [0, 0, 0, 255])).toEqual([192, 168, 1, 255])
    })
    it('check if subnetID method return correct value', () => {
      expect(ipv4Utils.subnetID(['192', '168', '1', '1'], ['255', '255', '255', '0'])).toEqual([192, 168, 1, 0])
    })
    it.each`
      subnet1              | subnet2                | result
      ${'192.168.1.1/24'}  | ${'192.168.2.1/24'}    | ${false}
      ${'192.168.1.1/32'}  | ${'192.168.1.2/32'}    | ${false}
      ${'192.168.1.10/30'} | ${'192.168.1.16/29'}   | ${false}
      ${'192.168.1.10/30'} | ${'192.168.1.7/29'}    | ${false}
      ${'192.168.1.1'}     | ${'192.168.1.2'}       | ${false}
      ${'192.168.2.50/22'} | ${'192.168.1.50'}      | ${true}
      ${'0.0.0.0/0'}       | ${'255.255.255.255/0'} | ${true}
      ${'192.168.1.1/24'}  | ${'192.168.1.1/24'}    | ${true}
      ${'192.168.1.1'}     | ${'192.168.1.1'}       | ${true}
    `('checks if subnets are overlapping #%#', ({ subnet1, subnet2, result }) => {
      expect(ipv4Utils.areSubnetsOverlapping(subnet1, subnet2)).toEqual(result)
    })
  })

  describe('ipv6', () => {
    it.each`
      cidr                                       | from                    | to
      ${'123:1::1:5:6:0/64'}                     | ${'123:1::'}            | ${'123:1::ffff:ffff:ffff:ffff'}
      ${'ff:1234:123:ffca:1234:123:1123:123/64'} | ${'ff:1234:123:ffca::'} | ${'ff:1234:123:ffca:ffff:ffff:ffff:ffff'}
      ${'ff:1234:123:ffca:1234::/32'}            | ${'ff:1234::'}          | ${'ff:1234:ffff:ffff:ffff:ffff:ffff:ffff'}
    `('returns ipv6 range #%#', ({ cidr, from, to }) => {
      const res = ipv6Utils.cidrToRange(cidr)
      expect(res).toEqual([from, to])
    })
    it.each`
      ipv6                 | result
      ${'123:1::'}         | ${'123:1:0000:0000:0000:0000:0000:0000'}
      ${'ffff:ffff::ffff'} | ${'ffff:ffff:0000:0000:0000:0000:0000:ffff'}
      ${'::ff:ffff'}       | ${'0000:0000:0000:0000:0000:0000:ff:ffff'}
    `('returns expanded ipv6 address #%#', ({ ipv6, result }) => {
      expect(ipv6Utils.expandIpv6(ipv6)).toEqual(result)
    })
    it.each`
      ipv6                                         | result
      ${'123:1:0000:0000:0000:0000:0000:0000'}     | ${'123:1::'}
      ${'ffff:ffff:0000:0000:0000:0000:0000:ffff'} | ${'ffff:ffff::ffff'}
      ${'0000:0000:0000:0000:0000:0000:00ff:ffff'} | ${'::ff:ffff'}
      ${'ffff:ffff::ffff'}                         | ${'ffff:ffff::ffff'}
      ${'0000:0000:0000:0000:0000:0000:0000:0000'} | ${'::'}
      ${'00ff:1234:0123:ffca:1234:0123:1123:0123'} | ${'ff:1234:123:ffca:1234:123:1123:123'}
    `('returns compressed ipv6 address #%#', ({ ipv6, result }) => {
      expect(ipv6Utils.compressIpv6(ipv6)).toEqual(result)
    })
    it.each`
      ipv6                                         | result
      ${'123:1::'}                                 | ${'0'}
      ${'ffff:ffff::ffff'}                         | ${'ffff'}
      ${'0000:0000:0000:0000:0000:0000:ff:ffff'}   | ${'ffffff'}
      ${'ff:1234:123:ffca:1234:123:1123:123'}      | ${'1234012311230123'}
      ${'123:1::1:5:6:0'}                          | ${'1000500060000'}
      ${'2252:3e2a:d84e:ad85:1056:8f3e:1d46:40f1'} | ${'10568f3e1d4640f1'}
      ${'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff'} | ${'ffffffffffffffff'}
    `('returns host id #%#', ({ ipv6, result }) => {
      expect(ipv6Utils.getHostId(ipv6)).toEqual(result)
    })
    it.each`
      ip                                         | min                     | max                                        | inclusive    | result
      ${'ff:1234:123:ffca:1234:123:1123:123'}    | ${'ff:1234:123:ffca::'} | ${'ff:1235:123:ffca:ffff:ffff:ffff:ffff'}  | ${undefined} | ${true}
      ${'ff:1232:ffff:ffff:ffff:ffff:ffff:fffe'} | ${'ff:1231::'}          | ${'ff:1232:ffff:ffff:ffff:ffff:ffff:ffff'} | ${undefined} | ${true}
      ${'123:1::1'}                              | ${'123:1::'}            | ${'123:1::ffff:ffff:ffff:ffff'}            | ${undefined} | ${true}
      ${'123:1::'}                               | ${'123:1::'}            | ${'123:1::ffff:ffff:ffff:ffff'}            | ${true}      | ${true}
      ${'123:1::ffff:ffff:ffff:ffff'}            | ${'123:1::'}            | ${'123:1::ffff:ffff:ffff:ffff'}            | ${false}     | ${false}
      ${'123:1::ffff:ffff:ffff:ffff'}            | ${'123:1::'}            | ${'123:1::ffff:ffff:ffff:ffff'}            | ${true}      | ${true}
    `('returns if ipv6 is in range #%#', ({ ip, min, max, inclusive, result }) => {
      expect(ipv6Utils.checkIfInRange(ip, min, max, inclusive)).toEqual(result)
    })
    it.each`
      ipv6                                         | result
      ${'123:1::'}                                 | ${1510958465061797354166712025346998272n}
      ${'ffff:ffff::ffff'}                         | ${340282366841710300949110269838224326655n}
      ${'0000:0000:0000:0000:0000:0000:ff:ffff'}   | ${16777215n}
      ${'ff:1234:123:ffca:1234:123:1123:123'}      | ${1324404902516702861603428859052753187n}
      ${'123:1::1:5:6:0'}                          | ${1510958465061797354166993521798938624n}
      ${'2252:3e2a:d84e:ad85:1056:8f3e:1d46:40f1'} | ${45620781103009125306273664428671385841n}
    `('returns number from ip #%#', ({ ipv6, result }) => {
      expect(ipv6Utils.ip2int(ipv6)).toEqual(result)
    })
    it.each`
      number                                      | result
      ${1510958465061797354166712025346998272n}   | ${'123:1::'}
      ${340282366841710300949110269838224326655n} | ${'ffff:ffff::ffff'}
      ${16777215n}                                | ${'::ff:ffff'}
      ${1324404902516702861603428859052753187n}   | ${'ff:1234:123:ffca:1234:123:1123:123'}
      ${1510958465061797354166993521798938624n}   | ${'123:1::1:5:6:0'}
      ${45620781103009125306273664428671385841n}  | ${'2252:3e2a:d84e:ad85:1056:8f3e:1d46:40f1'}
    `('returns ip from number #%#', ({ number, result }) => {
      expect(ipv6Utils.int2ip(number)).toEqual(result)
    })
    it.each`
      ipv6                                            | result
      ${'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff/64'} | ${'ffff:ffff:ffff:ffff::'}
      ${'ff:1234:123:ffca:1234:123:1123:123/128'}     | ${'ff:1234:123:ffca:1234:123:1123:123'}
    `('returns subnet id #%#', ({ ipv6, result }) => {
      expect(ipv6Utils.subnetID(ipv6)).toEqual(result)
    })
  })

  it.each`
    input             | res
    ${true}           | ${ipv6Utils}
    ${false}          | ${ipv4Utils}
    ${'ffff:fffff::'} | ${ipv6Utils}
    ${'192.168.1.1'}  | ${ipv4Utils}
  `('returns correct ip math lib #%#', ({ input, res }) => {
    expect(ipUtilsFactory(input) === res).toBeTruthy()
  })
})
