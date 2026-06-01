import SimCardUnblock from '@/components/package_components/components/vuci-app-mobile-ui/SimCardUnblock.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('SimCardUnblock.vue', () => {
  const props = {
    id: 'cfg01aa0e',
    showModal: 'true',
    type: 2
  }
  it('returns error message when validation fail', async () => {
    const wrapper = createWrapper(SimCardUnblock, {
      props
    })
    wrapper.vm.$refs.tltForm.validate = vi.fn().mockResolvedValue({ valid: false })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.save()
    expect(spy).toHaveBeenCalledWith('Some fields are invalid')
  })
  it.each([
    [1, 'An unexpected error occurred'],
    [2, 'An unexpected error occurred']
  ])('returns error message when request fail when type is %s', async (type, message) => {
    const wrapper = createWrapper(SimCardUnblock, {
      props: {
        ...props,
        type
      }
    })
    wrapper.vm.$refs.tltForm.validate = vi.fn().mockResolvedValue({ valid: true })
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce()
    wrapper.vm.$refs.tltModal.closeModal = vi.fn()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$prompt.show.mockImplementation(({ onOk }) => onOk())
    await wrapper.vm.save()
    expect(spy).toHaveBeenCalledWith(message)
  })
  it.each([
    [1, 'SIM card unlocked'],
    [2, 'SIM card unblocked']
  ])('returns message when request success when type is %s', async (type, message) => {
    props.type = type
    const wrapper = createWrapper(SimCardUnblock, {
      props
    })
    wrapper.vm.$refs.tltForm.validate = vi.fn().mockResolvedValue({ valid: true })
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce()
    wrapper.vm.$refs.tltModal.closeModal = vi.fn()
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    wrapper.vm.$prompt.show.mockImplementation(({ onOk }) => onOk())
    await wrapper.vm.save()
    expect(spy).toHaveBeenCalledWith(message)
  })
  it.each([
    [1, 'Recheck whether the entered PIN is correct because after 3 incorrect attempts, your SIM card will be blocked.'],
    [2, 'Recheck whether the entered PUK is correct because after 10 incorrect attempts, your SIM card will be permanently blocked.']
  ])('returns informative message when when type is %s', async (type, res) => {
    const wrapper = createWrapper(SimCardUnblock, {
      props: {
        id: 'cfg01aa0e',
        showModal: 'true',
        type
      }
    })
    expect(wrapper.vm.message).toEqual(res)
  })
  it('checks if form values reset when closeModal called', () => {
    const wrapper = createWrapper(SimCardUnblock, {
      props
    })
    wrapper.vm.form = { pincode: '1234', pukcode: '12345678' }
    wrapper.vm.closeModal()
    expect(wrapper.vm.form).toEqual({ pincode: '', pukcode: '' })
    expect(wrapper.emitted().close).toBeTruthy()
  })
})
