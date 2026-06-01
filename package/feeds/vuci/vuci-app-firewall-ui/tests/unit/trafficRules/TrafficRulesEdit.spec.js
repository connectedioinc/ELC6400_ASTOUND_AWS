import TrafficRuleEdit from '../../../src/views/network/trafficRules/TrafficRuleEdit.vue'
import { FormOptionKey } from '../../../src/views/network/trafficRules/trafficRuleCommon'
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
  it('returns src zone options', () => {
    expect(wrapper.vm.srcZones).toEqual([['', 'Device (output)'], ['*', 'Any zone (forward)'], 'lan'])
  })
  it('returns out zone options', () => {
    expect(wrapper.vm.outZones).toEqual([['', 'Unspecified'], ['*', 'Any zone'], 'lan'])
  })
  it('returns dest zone options', () => {
    expect(wrapper.vm.destZones).toEqual([['', 'Device (input)'], ['*', 'Any zone (forward)'], 'lan'])
  })
})
