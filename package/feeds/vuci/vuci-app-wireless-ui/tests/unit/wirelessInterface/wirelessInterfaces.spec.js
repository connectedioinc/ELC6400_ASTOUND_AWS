import createWrapper from '@tests/unit/mockFactory'
import Wireless from '../../../src/views/network/wirelessInterface/WirelessInterface.vue'

vi.mock('vue-router', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ path: 'test' })),
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn()
    })
  }
})

describe('WirelessInterface.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(Wireless)
  })

  it('returns empty object when status not found', () => {
    const status = { id: 'myWifi' }
    wrapper.vm.ifaceStatus = [status]
    expect(wrapper.vm.getStatus({ id: 'otherWifi' })).toEqual({})
  })
  it('returns empty object when there is no status', () => {
    expect(wrapper.vm.getStatus({ id: 'myWifi' })).toEqual({})
  })

  it.each`
    s                                                                             | expectedResult
    ${{ mode: 'ap', encryption: 'psk', ssid: 'test_2g', key: 'password' }}        | ${false}
    ${{ mode: 'ap', encryption: 'none', ssid: 'test_2g' }}                        | ${false}
    ${{ mode: 'ap', encryption: undefined, ssid: 'test_2g' }}                     | ${true}
    ${{ mode: 'ap', encryption: 'psk', ssid: 'test_2g' }}                         | ${true}
    ${{ mode: 'ap', encryption: 'psk', key: 'password' }}                         | ${true}
    ${{ mode: 'ap', ssid: 'test_2g', encryption: 'owe' }}                         | ${false}
    ${{ mode: 'ap', ssid: 'test_2g', encryption: 'wpa' }}                         | ${false}
    ${{ mode: 'ap', ssid: 'test_2g', encryption: 'wpa2' }}                        | ${false}
    ${{ mode: 'ap', ssid: 'test_2g', encryption: 'wpa3' }}                        | ${false}
    ${{ mode: 'sta', encryption: 'psk', ssid: 'test_2g', key: 'password' }}       | ${false}
    ${{ mode: 'sta', encryption: 'psk', key: 'password' }}                        | ${true}
    ${{ mode: 'mesh', mesh_id: 'mesherino', encryption: 'psk', key: 'password' }} | ${false}
    ${{ mode: 'mesh', encryption: 'psk', key: 'password' }}                       | ${true}
    ${{ mode: 'multi_ap' }}                                                       | ${false}
  `('checks if wireless interface is readonly for enable #%#', ({ s, expectedResult }) => {
    expect(wrapper.vm.isIfaceReadonly(s)).toEqual(expectedResult)
  })
})
