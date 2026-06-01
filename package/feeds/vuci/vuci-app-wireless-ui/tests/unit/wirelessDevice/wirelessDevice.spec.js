import createWrapper from '@tests/unit/mockFactory'
import WirelessDevice from '../../../src/views/network/wirelessDevice/WirelessDevice.vue'

describe('WirelessDevice.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(WirelessDevice, { shallow: true })
  })
  it('retuns status when exists', () => {
    const data = [{ id: 'radio0' }, { id: 'radio1' }]
    wrapper.vm.deviceStatus = data
    expect(wrapper.vm.getStatus('radio1')).toEqual(data[1])
  })
  it('retuns undefined when status do not exist', () => {
    const data = [{ id: 'radio0' }]
    wrapper.vm.deviceStatus = data
    expect(wrapper.vm.getStatus('radio1')).toEqual(undefined)
  })
  it.each`
    countrylist                         | expectedResult
    ${null}                             | ${[]}
    ${undefined}                        | ${[]}
    ${[{ alpha2: 'LT', name: 'Lith' }]} | ${[['LT', 'LT - Lith']]}
  `('returns $expectedResult when countrylist: $countrylist', async ({ countrylist, expectedResult }) => {
    wrapper.vm.deviceOptions = [{ id: 'radio0', options: { countrylist } }]
    expect(wrapper.vm.countryOptions).toEqual(expectedResult)
  })

  it.each`
    dBm   | expectedResult
    ${0}  | ${1}
    ${3}  | ${1}
    ${14} | ${25}
    ${20} | ${100}
  `('returns mWatt from dBm #%#', async ({ dBm, expectedResult }) => {
    expect(wrapper.vm.dbmTomWatt(dBm)).toEqual(expectedResult)
  })
})
