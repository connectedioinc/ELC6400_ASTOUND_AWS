import ModemFullControlMessage from '@/components/shared/ModemFullControlMessage'
import createWrapper from '@tests/unit/mockFactory'

describe('ModemFullControlMessage.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('returns modem control serial device in full control mode', async () => {
    const wrapper = createWrapper(ModemFullControlMessage)

    wrapper.vm.$store.board.hwinfo.usb = true
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({
      success: true,
      data: [{ enabled: '1', ctl_mode: 'full' }]
    })
    const spy = vi.spyOn(wrapper.vm.$notification, 'info')
    await wrapper.vm.getModemControlMode()
    expect(spy).toHaveBeenCalledTimes(1)
  })
  it('invokes modem loading error', async () => {
    const wrapper = createWrapper(ModemFullControlMessage)
    wrapper.vm.$axios.get = vi.fn().mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getModemControlMode()
    expect(spy).toHaveBeenCalledWith('Failed to load modem data')
  })
})
