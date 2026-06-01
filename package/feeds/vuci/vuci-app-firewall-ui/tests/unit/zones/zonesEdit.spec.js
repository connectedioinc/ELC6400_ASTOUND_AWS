import ZoneEdit from '../../../src/views/network/zones/ZoneEdit.vue'
import { FormOptionKey } from '../../../src/views/network/zones/ZonesCommon'
import { ref } from 'vue'
import createWrapper, { combineDeep } from '@tests/unit/mockFactory'

describe('ZoneEdit.vue', () => {
  let wrapper
  let wrapperOptions
  beforeEach(() => {
    wrapperOptions = {
      props: { section: { id: 'test' } },
      global: {
        provide: {
          [FormOptionKey]: {
            networks: ref([]),
            refreshZones: () => {},
            zoneGlobalConfig: ref({}),
            interfaceStatus: ref([])
          }
        }
      }
    }
    wrapper = createWrapper(ZoneEdit, wrapperOptions)
  })
  it.each`
    zones                                                                                  | result
    ${[{ id: 'mainZone', name: 'Main Zone', network: ['testNetwork', 'testNetwork1'] }]}   | ${{ isValid: true }}
    ${[{ id: 'mainZone', name: 'Main Zone', network: ['testNetwork2'] }]}                  | ${{ isValid: true }}
    ${[{ id: 'otherZone', name: 'Other Zone', network: ['testNetwork', 'testNetwork1'] }]} | ${{ isValid: false, message: 'Network "testNetwork" is already used in "Other Zone" zone' }}
  `('checks if validateNetwork validates networks', async ({ zones, result }) => {
    wrapper.vm.zones = zones
    wrapper = createWrapper(
      ZoneEdit,
      combineDeep(wrapperOptions, {
        props: {
          section: { id: 'mainZone' }
        }
      })
    )
    wrapper.vm.formData.zones = zones
    expect(wrapper.vm.validateNetwork(['testNetwork', 'testNetwork1'])).toEqual(result)
  })
})
