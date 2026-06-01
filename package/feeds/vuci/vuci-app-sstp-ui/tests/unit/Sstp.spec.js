import Sstp from '../../src/views/services/Sstp.vue'
import createWrapper from '@tests/unit/mockFactory'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { useMessages } from '@/stores/messages'
import i18n from '@ui-core/plugins/i18n'
import { axios } from '@ui-core/plugins/axios'

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

describe('Sstp.vue', () => {
  const certificates = [
    {
      type: 'cert',
      name: 'testsign',
      cert_type: 'ca',
      timestamp: 1639095511,
      key_size: '2048',
      fullname: 'testsign.cert.pem'
    }
  ]

  const successfulRequest = {
    success: true,
    data: {
      certificates
    }
  }
  beforeEach(() => {
    vi.restoreAllMocks()
    const app = { config: { globalProperties: {} } }
    setActivePinia(createTestingPinia())
    i18n.install(app)
  })
  it('displays error when request fails', async () => {
    const wrapper = createWrapper(Sstp)
    const message = useMessages()
    axios.get = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('Failed to load certificate data')
  })
  it("returns certificates when request doesn't throw error", async () => {
    const wrapper = createWrapper(Sstp)
    axios.get = vi.fn().mockResolvedValueOnce(successfulRequest)
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.certificates).toEqual(certificates)
  })
})
