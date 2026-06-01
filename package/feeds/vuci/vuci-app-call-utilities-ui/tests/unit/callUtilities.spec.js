import { ref } from 'vue'
import createWrapper from '@tests/unit/mockFactory'
import CallUtilitiesEdit from '../../src/views/services/CallUtilitiesEdit.vue'

vi.mock('@/composables/useMobileUtilities', () => ({
  useMobileUtilitiesUtils: vi.fn(() => ({
    gpios: ref([]),
    relays: ref([{ id: 'rtest', name_with_pins: 'RTEST' }])
  }))
}))

describe('CallUtilitiesEdit.vue', () => {
  it.each`
    action     | returns
    ${'relay'} | ${{ label: 'Relay', help: 'The relay which will be changed.', options: [['rtest', 'RTEST']] }}
    ${'test'}  | ${{ label: 'Output', help: 'The output which will be changed.', options: [] }}
  `('returns relay pin props', ({ action, returns }) => {
    const wrapper = createWrapper(CallUtilitiesEdit, {
      global: {
        provide: {
          providedOptions: () => ref({})
        }
      },
      props: {
        section: { id: 'test', action }
      }
    })
    expect(wrapper.vm.pinProps).toEqual(returns)
  })
})
