import StaticRoutes from '../../src/views/network/StaticRoutes.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Static routes tests', () => {
  const mocks = {
    $store: {
      deviceInfo: {
        features: {
          ipv6: true
        }
      }
    }
  }

  it('returns mapped interface options', () => {
    const wrapper = createWrapper(StaticRoutes, { global: { mocks } })
    wrapper.vm.interfaces = [
      { id: 'test', name: 'test', proto: 'wireguard' },
      { id: 'test2', name: 'test2', proto: 'wireguard' },
      { id: 'test3', name: 'test3', proto: 'wireguard' }
    ]
    const val = wrapper.vm.interfaceOptions
    expect(val).toEqual([
      ['test', 'test'],
      ['test2', 'test2'],
      ['test3', 'test3']
    ])
  })
})
