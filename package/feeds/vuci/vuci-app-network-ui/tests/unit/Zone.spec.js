import Zone from '../../src/views/network/interfaces/Zone.vue'
import createWrapper, { combineDeep } from '@tests/unit/mockFactory'

describe('Zone.vue', () => {
  const wrapperOptions = {
    global: {
      provide: {
        initialForm() {
          return {
            interfaces: [{ fwzone: '' }]
          }
        }
      }
    },
    props: {
      uciSection: { fwzone: '' },
      protocol: 'none',
      zones: []
    }
  }
  it.each([
    ['lan', 'static', 'lan', 'lan'],
    ['', 'static', 'lan', 'lan'],
    ['', 'dhcp', 'wan', 'wan'],
    ['', 'none', 'lan', '']
  ])('emits to update interface fwzone option when value is %s', (value1, value2, value3, response) => {
    const wrapper = createWrapper(
      Zone,
      combineDeep(wrapperOptions, {
        props: {
          uciSection: { fwzone: value1 },
          protocol: value2
        },
        computed: {
          ...Zone.computed,
          zoneOptions() {
            return [value3]
          }
        }
      })
    )
    wrapper.vm.setupZone()
    expect(wrapper.emitted().updateZone[0]).toEqual([response])
  })
  it('returns empty fw zone when initialForm is not loaded', async () => {
    const wrapper = createWrapper(
      Zone,
      combineDeep(wrapperOptions, {
        computed: {
          zoneOptions() {
            return ['lan', 'wan']
          }
        }
      })
    )
    await wrapper.vm.setupZone()
    expect(wrapper.vm.uciSection.fwzone).toEqual('')
  })
})
