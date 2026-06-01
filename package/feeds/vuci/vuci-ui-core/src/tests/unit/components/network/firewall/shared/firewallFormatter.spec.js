import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { formatter } from '@/components/network/firewall/firewallFormatter'
import '@ui-core/utils/string-format'
import i18n from '@ui-core/plugins/i18n'

describe('firewall.js', () => {
  beforeEach(() => {
    setActivePinia(createTestingPinia())
    i18n.install({ config: { globalProperties: {} } })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  describe('formater', () => {
    it.each`
      input             | rest             | negetionPrefix
      ${'!192.168.1.1'} | ${'192.168.1.1'} | ${'not'}
      ${'192.168.1.1'}  | ${'192.168.1.1'} | ${undefined}
    `('returns rest of input and negation prefix #%#', ({ input, rest, negetionPrefix }) => {
      const res = formatter._fmtNeg(input)
      expect(res).toEqual([rest, negetionPrefix])
    })
    it.each`
      input                             | mark         | res
      ${[]}                             | ${undefined} | ${false}
      ${['192.168.1.1']}                | ${'/'}       | ${false}
      ${['192.168.1.1', '192.168.1.2']} | ${'/'}       | ${true}
      ${['192.168.1.1/24']}             | ${'/'}       | ${true}
      ${['80-100']}                     | ${'-'}       | ${true}
      ${['80']}                         | ${'-'}       | ${false}
    `('returns does input contain many values or one #%#', ({ input, mark, res }) => {
      expect(formatter._fmtMany(input, mark)).toEqual(res)
    })
    it('returns simple value', () => {
      const res = {
        values: [{ value: '123', hint: undefined, prefix: undefined }],
        name: undefined
      }
      expect(formatter.fmtSimpleValue(res.values[0].value)).toEqual(res)
    })
    it('returns formated IPs when there is many mixed ips', () => {
      const res = {
        name: 'IPs',
        values: [
          { prefix: undefined, value: '192.168.1.1', hint: 'myPc.lan' },
          { prefix: 'not', value: 'ffff::', hint: undefined },
          { prefix: undefined, value: '192.168.1.1/24', hint: '192.168.1.0 - 192.168.1.255' }
        ]
      }
      const ips = ['192.168.1.1', '!ffff::', '192.168.1.1/24']
      const hints = [['192.168.1.1', 'myPc.lan']]
      expect(formatter.fmtIP(ips, hints)).toEqual(res)
    })
    it('returns formated ports when there is many mixed ports', () => {
      const res = {
        name: 'ports',
        values: [
          { prefix: undefined, value: '80', hint: 'HTTP' },
          { prefix: 'not', value: '100', hint: undefined },
          { prefix: undefined, value: '150-200', hint: undefined }
        ]
      }
      const ports = ['80', '!100', '150-200']
      expect(formatter.fmtPort(ports)).toEqual(res)
    })
    it('returns formated macs when there is many mixed ports', () => {
      const res = {
        name: 'MACs',
        forceCollapse: true,
        andSeperator: true,
        values: [
          { prefix: undefined, value: 'DC-3B-5A-0B-DC-4E' },
          { prefix: 'not', value: 'DC-3B-5A-0B-DC-4E' }
        ]
      }
      const macs = ['DC-3B-5A-0B-DC-4E', '!DC-3B-5A-0B-DC-4E']
      expect(formatter.fmtMac(macs)).toEqual(res)
    })
    it.each`
      zone         | res
      ${undefined} | ${'Device'}
      ${'*'}       | ${'Any zone'}
      ${'lan'}     | ${'lan'}
    `('returns formated zone #%#', ({ zone, res }) => {
      expect(formatter.fmtZone(zone)).toEqual(res)
    })
    it('returns formated protocols when there is many mixed ports', () => {
      const res = {
        name: 'IPv4',
        values: [
          { prefix: undefined, value: 'TCP' },
          { prefix: 'not', value: 'TCP' },
          { prefix: undefined, value: 'ICMP', hint: ['echo-request', 'echo-reply'] }
        ]
      }
      const protos = ['tcp', '!tcp', 'icmp']
      const icmpTypes = ['echo-request', 'echo-reply']
      expect(formatter.fmtProto(protos, icmpTypes, 'ipv4')).toEqual(res)
    })
    it.each`
      action       | src      | dest     | res
      ${'ACCEPT'}  | ${'lan'} | ${''}    | ${'Accept input'}
      ${'ACCEPT'}  | ${'lan'} | ${'wan'} | ${'Accept forward'}
      ${'DROP'}    | ${''}    | ${'lan'} | ${'Drop output'}
      ${'NOTRACK'} | ${'wan'} | ${'lan'} | ${'Do not track'}
      ${'TTL'}     | ${'wan'} | ${'lan'} | ${'Change TTL'}
    `('returns formated zone #%#', ({ action, src, dest, res }) => {
      expect(formatter.fmtTarget(action, src, dest)).toEqual(res)
    })
  })
})
