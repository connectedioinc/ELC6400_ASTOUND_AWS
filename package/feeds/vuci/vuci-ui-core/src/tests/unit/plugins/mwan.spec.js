/* eslint-disable camelcase */
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { mwan } from '@/plugins/mwan'

describe('multiwanCommon.ts', () => {
  beforeEach(() => {
    setActivePinia(createTestingPinia())
  })

  it.each`
    mode         | result
    ${'mwan'}    | ${'Failover'}
    ${'balance'} | ${'Load Balancing'}
  `('displays $result when mode is $mode', ({ mode, result }) => {
    expect(mwan.getPrettyMode(mode)).toBe(result)
  })

  it.each`
    status          | expectedResult
    ${'-'}          | ${{ info: '-', style: '' }}
    ${'starting'}   | ${{ info: 'Starting', style: 'text-theme-text-warning' }}
    ${'notracking'} | ${{ info: 'Disabled', style: '' }}
    ${'online'}     | ${{ info: 'Online', style: 'success' }}
  `('returns mwan status when $status', ({ status, expectedResult }) => {
    expect(mwan.parseStatus(status)).toEqual(expectedResult)
  })

  it.each`
    ifaceA                                            | ifaceB                                             | result
    ${{ name: 'wan', metric: '1' }}                   | ${{ name: 'wan1', metric: '2' }}                   | ${-1}
    ${{ name: 'wan', metric: '1', load_balance: 70 }} | ${{ name: 'wan1', metric: '1', load_balance: 30 }} | ${-40}
    ${{ name: 'wan', status: 'online' }}              | ${{ name: 'wan1', status: 'standby' }}             | ${-1}
    ${{ name: 'wan', status: 'offline' }}             | ${{ name: 'wan1', status: 'standby' }}             | ${2}
    ${{ name: 'wan', status: 'standby' }}             | ${{ name: 'wan1', status: 'starting' }}            | ${-1}
    ${{ name: 'wan', status: 'notracking' }}          | ${{ name: 'wan1', status: 'online' }}              | ${5}
  `('compares $ifaceA and $ifaceB and returns $result', ({ ifaceA, ifaceB, result }) => {
    expect(mwan.statusComparator(ifaceA, ifaceB)).toEqual(result)
  })
})
