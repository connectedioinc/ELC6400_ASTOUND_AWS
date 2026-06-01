import { useNatOffloadingAlert } from '@/composables/useNatOffloadingAlert'
import { useMessages } from '@/stores/messages'
import { setActivePinia, createPinia } from 'pinia'
import { ref, reactive } from 'vue'

const route = reactive({ path: '' })

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: vi.fn(() => route)
}))

describe('useNatOffloadingAlert', () => {
  let store
  beforeEach(() => {
    route.path = ''
    store = setActivePinia(createPinia())
  })

  it.each`
    hwNat    | flowOffloading | show
    ${true}  | ${'0'}         | ${false}
    ${false} | ${'0'}         | ${false}
    ${true}  | ${'1'}         | ${true}
    ${false} | ${'1'}         | ${false}
  `('show warning: $show when hwNat: $hwNat, flowOffloading: $flowOffloading', async (hwNat, flowOffloading, show) => {
    store.board = { hwinfo: { hw_nat: hwNat } }
    const offloadingConfig = ref({})
    const alert = useMessages()
    useNatOffloadingAlert(offloadingConfig, 'QOS')
    const spy = vi.spyOn(alert, 'error')
    offloadingConfig.value.flow_offloading = flowOffloading
    expect(spy).toBeCalledTimes(show ? 1 : 0)
  })
})
