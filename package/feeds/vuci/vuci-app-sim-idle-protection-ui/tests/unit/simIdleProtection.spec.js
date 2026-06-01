import SimIdleProtection from '../../src/views/network/SimIdleProtection.vue'
import createWrapper from '@tests/unit/mockFactory'
import { mobile } from '@/plugins/mobile'

describe('SimIdleProtection.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(SimIdleProtection, {
      global: {
        mocks: {
          $route: { path: '/network/mobile/sim_idle_protection/3-1' }
        }
      }
    })
  })

  it.each([
    [{ position: '1' }, 'SIM1'],
    [{ position: '2' }, 'SIM2']
  ])('returns parsed SIM #%#', (val, res) => {
    mobile.getSimLabel = vi.fn().mockReturnValueOnce(val.position)
    expect(wrapper.vm.displaySimSlot(val)).toEqual(res)
  })

  it.each([
    ['ipv4', 'IPv4'],
    ['ipv6', 'IPv6']
  ])('returns parsed IP type when %s', (val, res) => {
    expect(wrapper.vm.displayIpType(val)).toEqual(res)
  })

  it.each([
    ['month', 'Month'],
    ['week', 'Week']
  ])('returns parsed period when %s', (val, res) => {
    expect(wrapper.vm.displayPeriod(val)).toEqual(res)
  })

  it.each([
    [{ period: 'week', weekday: '1' }, 'Monday'],
    [{ period: 'week', weekday: '0' }, 'Sunday'],
    [{ period: 'month', day: '10' }, '10']
  ])('returns parsed day #%#', (val, res) => {
    expect(wrapper.vm.displayDay(val)).toEqual(res)
  })
})
