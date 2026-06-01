import createWrapper from '@tests/unit/mockFactory'
import PPSKProfileEdit from '../../../src/views/network/ppskProfiles/PPSKProfileEdit.vue'

describe('PPSKProfileEdit.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(PPSKProfileEdit, {
      props: {
        section: {
          id: 'test'
        }
      }
    })
  })

  it.each`
    isRouter | expectedResult
    ${true}  | ${[{ width: 'sm', name: 'network', label: 'Network', help: 'Network that this station will be assigned to.' }]}
    ${false} | ${[{ width: 'xs', name: 'vid', label: 'VLAN ID', help: 'VLAN ID that this station will be assigned to.' }]}
  `('computes station cols when isRouter $isRoutere', ({ isRouter, expectedResult }) => {
    const cols = [
      { name: 'username', label: 'User name', help: 'User name of the authenticating station. Used for easier identification.' },
      { width: 'base', name: 'mac', label: 'MAC Address', help: 'MAC address to match authenticating stations against (defaults to any station using this key).' },
      { width: 'base', name: 'key', label: 'Password', help: 'PSK to match authenticating stations against.' },
      ...expectedResult
    ]
    wrapper.vm.store.isRouter = isRouter
    expect(wrapper.vm.stationCols).toEqual(cols)
  })
})
