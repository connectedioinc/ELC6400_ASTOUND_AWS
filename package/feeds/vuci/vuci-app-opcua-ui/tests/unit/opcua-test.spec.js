import createWrapper from '@tests/unit/mockFactory'
import OpcuaTest from '../../src/views/services/OpcuaTest.vue'

describe('OpcuaTest.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(OpcuaTest, {
      props: {
        getData: vi.fn(),
        endpoint: '',
        uciSection: {}
      }
    })
  })

  it.each`
    code  | errorMessage
    ${1}  | ${'An unexpected error occurred'}
    ${2}  | ${'Test failed'}
    ${69} | ${'An unexpected error occurred'}
  `('fails to send value group test request with code $code', async ({ code, errorMessage }) => {
    const response = { response: { data: { errors: [{ code }] } } }
    wrapper.vm.$axios.post = vi.fn().mockRejectedValueOnce(response)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.test(self)
    expect(spy).toHaveBeenCalledWith(errorMessage)
  })

  it('displays success message when sending test request', async () => {
    wrapper.vm.$axios.post = vi.fn().mockResolvedValueOnce({ success: true, data: { response: '.' } })
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    await wrapper.vm.test(self)
    expect(spy).toHaveBeenCalledWith('Test is successful')
  })
})
