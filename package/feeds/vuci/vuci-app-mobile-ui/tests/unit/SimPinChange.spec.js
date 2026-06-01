import SimPinChange from '../../src/components/network/SimPinChange.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('SimPinChange.vue', () => {
  const props = {
    showModal: true,
    modem: '3-1',
    sim: 1,
    currentPin: '1234'
  }
  it('returns error message when validation fail', async () => {
    const wrapper = createWrapper(SimPinChange, {
      props
    })
    wrapper.vm.$refs.tltForm.validate = vi.fn().mockResolvedValue({ valid: false })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.save()
    expect(spy).toHaveBeenCalledWith('Some fields are invalid')
  })
  it.each([
    [1, 'Failed to set new PIN, SIM card lock is not enabled.'],
    [2, 'Failed to change SIM PIN code. Current PIN code might be wrong. 3 PIN attempts left.'],
    [3, 'Failed to change SIM card PIN']
  ])('returns error message when request fail #%s', async (code, message) => {
    const wrapper = createWrapper(SimPinChange, {
      props
    })
    wrapper.vm.$refs.tltForm.validate = vi.fn().mockResolvedValue({ valid: true })
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce({ response: { data: { errors: [{ code, error: 'Failed to change SIM PIN code. Current PIN code might be wrong. 3 PIN attempts left.' }] } } })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$prompt.show.mockImplementation(({ onOk }) => onOk())
    await wrapper.vm.save()
    expect(spy).toHaveBeenCalledWith(message)
  })
  it('returns success message when request success', async () => {
    const wrapper = createWrapper(SimPinChange, {
      props
    })
    wrapper.vm.$refs.tltForm.validate = vi.fn().mockResolvedValue({ valid: true })
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    wrapper.vm.$prompt.show.mockImplementation(({ onOk }) => onOk())
    await wrapper.vm.save()
    expect(spy).toHaveBeenCalledWith('SIM card PIN changed')
  })
  it('resets form data on modal close', async () => {
    const wrapper = createWrapper(SimPinChange, {
      props
    })
    await wrapper.vm.closeModal()
    expect(wrapper.vm.form).toEqual({ pin: '', newPin: '', newPin2: '' })
    expect(wrapper.emitted('close')).toBeDefined()
  })
  it.each([
    ['new PIN and confirmation PIN are same', { pin: '1234', newPin: '4321', newPin2: '4321' }, { isValid: true, message: 'The confirmation PIN must match the new PIN' }],
    ['new PIN and confirmation PIN are different', { pin: '1234', newPin: '4321', newPin2: '1234' }, { isValid: false, message: 'The confirmation PIN must match the new PIN' }]
  ])('returns validation result when %s', (text, data, res) => {
    const wrapper = createWrapper(SimPinChange, {
      props
    })
    wrapper.vm.form = data
    expect(wrapper.vm.isMatchingPins()).toEqual(res)
  })
})
