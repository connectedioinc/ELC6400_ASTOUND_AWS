import CertRootCa from '../../src/views/system/CertRootCa.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'

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

describe('CertRootCa.vue', () => {
  let wrapper
  beforeEach(() => {
    axios.get = vi.fn().mockResolvedValue({ data: { certificates: [] } })
    wrapper = createWrapper(CertRootCa)
  })
  it('sets certificates and caFileOpts when getCaFiles API call is successful', async () => {
    const mockData = {
      certificates: [
        {
          fullname: 'test.crt',
          path: '/etc/certificates/'
        }
      ]
    }
    axios.get = vi.fn().mockResolvedValueOnce({ data: mockData })
    await wrapper.vm.getCaFiles()
    expect(wrapper.vm.certificates).toEqual(mockData.certificates)
    expect(wrapper.vm.caFileOpts).toEqual([
      {
        key: '/etc/certificates/',
        value: 'test.crt'
      }
    ])
  })
  it('displays error message when getCaFiles API call fails', async () => {
    const message = useMessages()
    axios.get = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.getCaFiles()
    expect(spy).toHaveBeenCalledWith(wrapper.vm.$t('Failed to get certificates'))
    spy.mockClear()
  })
  it('returns susscess message onUpload', () => {
    const message = useMessages()
    const spy = vi.spyOn(message, 'success')
    wrapper.vm.onUpload()
    expect(spy).toHaveBeenCalledWith('File uploaded successfully')
  })
  it('return error message when post fails resetCa', async () => {
    const message = useMessages()
    axios.post = vi.fn().mockRejectedValueOnce({ response: { data: { errors: [{ code: 151 }] } } })
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.resetCa()
    expect(spy).toHaveBeenCalledWith('The maximum allowed file size is 10.00 KB.')
  })
  it('return error message when post fails resetCa', async () => {
    const message = useMessages()
    axios.post = vi.fn().mockRejectedValueOnce({ response: { data: { errors: [{ code: 42 }] } } })
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.resetCa()
    expect(spy).toHaveBeenCalledWith('Failed to save Root CA.')
  })
  it('display error message when rootCaDevice API call is not successful', async () => {
    const message = useMessages()
    axios.post = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(message, 'error')
    wrapper.vm.deviceCA = true
    await wrapper.vm.rootCaDevice()
    expect(spy).toHaveBeenCalledWith('Failed to save Root CA')
    spy.mockClear()
  })
  it('display success message when rootCaDevice API call is successfull', async () => {
    const message = useMessages()
    axios.post = vi.fn().mockResolvedValueOnce({ success: true, data: {} })
    const spy = vi.spyOn(message, 'success')
    await wrapper.vm.rootCaDevice()
    expect(spy).toHaveBeenCalledWith('Configuration has been applied')
    spy.mockClear()
  })
})
