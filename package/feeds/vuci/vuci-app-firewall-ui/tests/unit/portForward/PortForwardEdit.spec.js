import TrafficRuleEdit from '../../../src/views/network/portForward/PortForwardEdit.vue'
import { FormOptionKey } from '../../../src/views/network/portForward/portForwardCommon'
import { ref } from 'vue'
import createWrapper from '@tests/unit/mockFactory'

describe('TrafficRuleEdit.vue', () => {
  let wrapper
  let wrapperOptions
  beforeEach(() => {
    wrapperOptions = {
      props: { section: { id: 'test' } },
      global: {
        provide: {
          [FormOptionKey]: {
            hints: ref({
              mac_hints: [],
              ipv4_hints: []
            }),
            zones: ref([{ name: 'lan' }])
          }
        }
      }
    }
    wrapper = createWrapper(TrafficRuleEdit, wrapperOptions)
  })

  it('returns zone options with unspecified option', () => {
    wrapper.vm.zones = []
    expect(wrapper.vm.zoneOptions).toEqual([['', 'Unspecified']])
  })
  it('returns false when proto is non existant', () => {
    const res = wrapper.vm.portDepends({ proto: '' })
    expect(res).toBe(false)
  })
})
