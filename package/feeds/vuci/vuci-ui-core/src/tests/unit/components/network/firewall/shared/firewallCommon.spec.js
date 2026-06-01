import { useFirewallCommon } from '@/components/network/firewall/firewallCommon'
import { createComposableWrapper } from '@tests/unit/mockFactory'

describe('useChartCards.ts', () => {
  let wrapper

  beforeEach(() => {
    ;[wrapper] = createComposableWrapper(() => useFirewallCommon())
  })
  it('checks that monthdays has all numbers from 1 to 31', () => {
    expect(wrapper.monthdays).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
      '19',
      '20',
      '21',
      '22',
      '23',
      '24',
      '25',
      '26',
      '27',
      '28',
      '29',
      '30',
      '31'
    ])
  })
  it.each`
    proto              | expectResult
    ${[]}              | ${false}
    ${['randomProto']} | ${false}
    ${['icmp']}        | ${false}
    ${['icmp', 'all']} | ${false}
    ${['icmp', 'udp']} | ${false}
    ${['tcp', 'all']}  | ${false}
    ${['tcp', 'udp']}  | ${true}
    ${['tcp']}         | ${true}
    ${['udp']}         | ${true}
  `('returns if port field should be shown #%#', ({ proto, expectResult }) => {
    expect(wrapper.portDepends({ proto })).toEqual(expectResult)
  })
  it.each`
    section                                                  | res
    ${{ start_date: '9999-09-09', stop_date: '1999-09-09' }} | ${{ isValid: false, message: 'Start date cannot be higher than stop date.' }}
    ${{ start_date: '2023-03-02', stop_date: '2023-03-01' }} | ${{ isValid: false, message: 'Start date cannot be higher than stop date.' }}
    ${{ start_date: '1999-09-09' }}                          | ${{ isValid: true, message: 'Start date cannot be higher than stop date.' }}
    ${{ stop_date: '1999-09-09' }}                           | ${{ isValid: true, message: 'Start date cannot be higher than stop date.' }}
    ${{ start_date: '2023-03-01', stop_date: '2023-03-01' }} | ${{ isValid: true, message: 'Start date cannot be higher than stop date.' }}
    ${{ start_date: '2023-03-01', stop_date: '2023-03-02' }} | ${{ isValid: true, message: 'Start date cannot be higher than stop date.' }}
    ${{ start_date: '1999-09-09', stop_date: '9999-12-12' }} | ${{ isValid: true, message: 'Start date cannot be higher than stop date.' }}
  `('check start and stop date intervals when section is $section', ({ section, res }) => {
    const result = wrapper.checkDates(section)
    expect(result).toEqual(res)
  })
})
