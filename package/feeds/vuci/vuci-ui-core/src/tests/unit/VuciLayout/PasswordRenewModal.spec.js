import PasswordRenewModal from '@/components/VuciLayout/src/PasswordRenewModal.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('PasswordRenewModal.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(PasswordRenewModal)
  })
  it('Returns error message if some fields are invalid', async () => {
    wrapper.vm.$refs.passwordForm.validate = vi.fn().mockResolvedValueOnce({ valid: false })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.setPassword()
    expect(spy).toHaveBeenCalledWith({ text: 'Some fields are invalid', forceShow: true })
  })
  it('Returns error message if password confirmation did not match', async () => {
    wrapper.vm.$refs.passwordForm.validate = vi.fn().mockResolvedValueOnce({ valid: true })
    wrapper.vm.passwordForm.password = 'test1'
    wrapper.vm.passwordForm.password_confirm = 'test2'
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.setPassword()
    expect(spy).toHaveBeenCalledWith({ text: 'Given password confirmation did not match, password not changed', forceShow: true })
  })
  it('Returns success message if login succeeded', async () => {
    wrapper.vm.$refs.passwordForm.validate = vi.fn().mockResolvedValueOnce({ valid: true })
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce({ data: { password: 'test', password_confirm: 'test' } })
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    await wrapper.vm.setPassword()
    expect(spy).toHaveBeenCalledWith('Password changed successfully')
  })
  it('Returns error message if set password failed', async () => {
    wrapper.vm.$refs.passwordForm.validate = vi.fn().mockResolvedValueOnce({ valid: true })
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.setPassword()
    expect(spy).toHaveBeenCalledWith({ text: 'An unexpected error occurred', forceShow: true })
  })
  it.each`
    props                    | res
    ${{ firstLogin: true }}  | ${true}
    ${{ firstLogin: false }} | ${false}
  `('checks firstLogin prop', async ({ props, res }) => {
    const wrapper = createWrapper(PasswordRenewModal, {
      props: props
    })
    wrapper.vm.$refs.passwordForm.validate = vi.fn().mockResolvedValueOnce({ valid: true })
    wrapper.vm.readonlyState = true
    wrapper.vm.$store.readOnlyPage = false
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce({ data: { password: 'test', password_confirm: 'test' } })
    await wrapper.vm.setPassword()
    expect(wrapper.vm.$store.readOnlyPage).toEqual(res)
  })
})
