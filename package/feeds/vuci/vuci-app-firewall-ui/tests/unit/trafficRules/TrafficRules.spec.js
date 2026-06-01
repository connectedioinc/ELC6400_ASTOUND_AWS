import TrafficRules from '../../../src/views/network/trafficRules/TrafficRules.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'

const routeStatus = {
  mac_hints: [
    ['aaaa', 'bbbb'],
    ['cccc', 'dddd']
  ],
  ipv4_hints: [
    ['123', 'bbbb'],
    ['456', 'dddd']
  ]
}

describe('TrafficRules.vue', () => {
  let wrapper
  let wrapperOptions
  beforeEach(() => {
    wrapperOptions = {}
    wrapper = createWrapper(TrafficRules, wrapperOptions)
  })

  it('afterLoad load and set hints data', () => {
    wrapper.vm.afterLoad().then(() => {
      expect(wrapper.vm.hints).toEqual(routeStatus)
    })
  })

  it('checks if afterLoad return error message if routes status request fail', async () => {
    vi.spyOn(axios, 'bulkGet').mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('Failed to load routes data')
  })
  it.each`
    type         | zones                | expectedResult
    ${'port'}    | ${[{ name: 'wan' }]} | ${'wan'}
    ${'port'}    | ${[{ name: 'lan' }]} | ${undefined}
    ${'forward'} | ${[{ name: 'wan' }]} | ${undefined}
  `('changes src to $expectedResult whem type: $type, zones: $zones', ({ type, zones, expectedResult }) => {
    wrapper.vm.zones = zones
    const form = {
      type
    }
    wrapper.vm.onAdd(form)
    expect(form.type).toBeUndefined()
    expect(form.src).toEqual(expectedResult)
  })

  it.each`
    section                                    | expectedResult
    ${{ owner_type: 'rando service' }}         | ${'Managed by rando service'}
    ${{ owner_type: 'overip', owner_id: '2' }} | ${'Managed by [](/services/serial_utilities/overip?edit=2)'}
    ${{ owner_type: 'ulog' }}                  | ${'Managed by [](/services/logging)'}
  `('returns formated owner string', ({ section, expectedResult }) => {
    expect(wrapper.vm.getManagedString(section)).toEqual(expectedResult)
  })
})
