import SimCardLock from '../../src/components/network/SimCardLock.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('SimCardLock.vue', () => {
  const props = {
    showModal: true,
    modal: {},
    modem: '3-1',
    pinLock: true
  }
  it('returns error message when validation fail', async () => {
    const wrapper = createWrapper(SimCardLock, {
      props
    })
    wrapper.vm.$refs.lockForm.validate = vi.fn().mockResolvedValue({ valid: false })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.save()
    expect(spy).toHaveBeenCalledWith('Some fields are invalid')
  })
  it.each([
    [1, 'Failed to set SIM card lock'],
    [2, 'Failed to set SIM card lock. PIN code might be wrong. 3 PIN attempts left.']
  ])('returns error message when request fail #%s', async (code, message) => {
    const wrapper = createWrapper(SimCardLock, {
      props
    })
    wrapper.vm.$refs.lockForm.validate = vi.fn().mockResolvedValue({ valid: true })
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce({ response: { data: { errors: [{ code, error: 'Failed to set PIN lock. PIN code might be wrong. 3 PIN attempts left.' }] } } })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$prompt.show.mockImplementation(({ onOk }) => onOk())
    await wrapper.vm.save()
    expect(spy).toHaveBeenCalledWith(message)
  })
  it.each([
    [true, 'SIM card lock disabled'],
    [false, 'SIM card lock enabled']
  ])('returns message when request success when lock is %s', async (lock, message) => {
    const wrapper = createWrapper(SimCardLock, {
      props: {
        ...props,
        pinLock: lock
      }
    })
    wrapper.vm.$refs.lockForm.validate = vi.fn().mockResolvedValue({ valid: true })
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    wrapper.vm.$prompt.show.mockImplementation(({ onOk }) => onOk())
    await wrapper.vm.save()
    expect(spy).toHaveBeenCalledWith(message)
  })
})
