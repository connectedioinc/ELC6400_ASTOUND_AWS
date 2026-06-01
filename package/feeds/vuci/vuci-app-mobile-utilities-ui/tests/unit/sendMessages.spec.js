import createWrapper from '@tests/unit/mockFactory'
import SendMessages from '../../src/views/services/SendMessages.vue'

const fullModems = [
  { id: '3-1', name: 'Internal' },
  { id: '3-2', name: 'External' }
]

describe('SendMessages.vue', () => {
  const mocks = {
    $mobile: {
      modemOffline: () => false
    }
  }
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(SendMessages, { global: { mocks } })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
  })
  it('loads modems correctly', async () => {
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({
      success: true,
      data: fullModems
    })
    wrapper.vm.$mobile.modemsOptions = vi.fn().mockReturnValue([
      ['3-1', 'Internal'],
      ['3-2', 'External']
    ])
    await wrapper.vm.loadModems()
    expect(wrapper.vm.modems).toEqual([
      ['3-1', 'Internal'],
      ['3-2', 'External']
    ])
  })
  it('invokes modem loading error', async () => {
    wrapper.vm.$axios.get = vi.fn().mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadModems()
    expect(spy).toHaveBeenCalledWith('Failed to load modem data')
    expect(wrapper.vm.modems).toEqual([])
  })
  it('resets number, message, smsHint variables correctly', async () => {
    wrapper.vm.$refs.tltForm.setValid = vi.fn().mockResolvedValue()
    wrapper.vm.form.number = '+37069696969'
    wrapper.vm.form.message = 'test'
    wrapper.vm.resetMessage()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.form.number).toBe('')
    expect(wrapper.vm.form.message).toBe('')
    expect(wrapper.vm.$refs.tltForm.setValid).toBeCalledTimes(1)
  })
  it('does not send message when not valid', async () => {
    wrapper.vm.$refs.tltForm.validate = vi.fn().mockResolvedValue({ valid: false })
    const spy1 = vi.spyOn(wrapper.vm, '$spin')
    await wrapper.vm.sendMessage()
    expect(spy1).not.toHaveBeenCalledWith('Sending message(s)...')
  })
  it('succesfully sends a message with two modems', async () => {
    wrapper.vm.$axios.post = vi.fn().mockResolvedValueOnce({})
    wrapper.vm.$refs.tltForm.validate = vi.fn().mockResolvedValue({ valid: true })
    wrapper.vm.$refs.tltForm.setValid = vi.fn().mockResolvedValue()
    wrapper.vm.form.number = '+37069696969'
    wrapper.vm.form.message = 'test'
    wrapper.vm.modems = [
      ['3-1', 'Internal'],
      ['3-2', 'External']
    ]
    wrapper.vm.form.modem = '3-2'
    const spy1 = await vi.spyOn(wrapper.vm.$message, 'success')
    await wrapper.vm.sendMessage()
    expect(wrapper.vm.form.message).toBe('')
    expect(spy1).toHaveBeenCalledWith('Message was sent successfully')
    expect(wrapper.vm.$axios.post).toBeCalledWith(expect.any(String), { data: { modem: '3-2', number: '+37069696969', message: 'test' } })
    expect(wrapper.vm.$refs.tltForm.setValid).toBeCalledTimes(1)
  })
  it('succesfully sends a message after 20s', async () => {
    wrapper.vm.$axios.post = () => new Promise(resolve => setTimeout(() => resolve({ status: 0 }), 25000))
    wrapper.vm.$refs.tltForm.validate = vi.fn().mockResolvedValue({ valid: true })
    wrapper.vm.$refs.tltForm.setValid = vi.fn().mockResolvedValue()
    vi.useFakeTimers()
    const spy = vi.spyOn(wrapper.vm, '$spin')
    wrapper.vm.modems = [['3-1', 'Internal']]
    wrapper.vm.sendMessage()
    // timer, promise with vi weardness: https://stackoverflow.com/a/52196951
    for (let i = 0; i < 8; i++) {
      vi.runAllTimers()
      await Promise.resolve() // allow any pending jobs in the PromiseJobs queue to run
    }
    expect(spy).toHaveBeenCalledWith('Waiting for response from the modem...')
    expect(wrapper.vm.$refs.tltForm.setValid).toBeCalledTimes(1)
  })
  it('succesfully sends a message when 1 modem exists', async () => {
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({
      success: true,
      data: fullModems
    })
    wrapper.vm.$axios.post = vi.fn().mockResolvedValueOnce({})
    wrapper.vm.$refs.tltForm.validate = vi.fn().mockResolvedValue({ valid: true })
    wrapper.vm.$refs.tltForm.setValid = vi.fn().mockResolvedValue()
    wrapper.vm.form.number = '+37069696969'
    wrapper.vm.form.message = 'test'
    wrapper.vm.modems = [['3-1', 'Internal']]
    await wrapper.vm.sendMessage()
    expect(wrapper.vm.$axios.post).toBeCalledWith(expect.any(String), { data: { modem: '3-1', number: '+37069696969', message: 'test' } })
    expect(wrapper.vm.$refs.tltForm.setValid).toBeCalledTimes(1)
  })
  it.each`
    errorCode | errorMessage
    ${1}      | ${"Messages might not be visible on recipient's device"}
    ${2}      | ${'Failed to send message'}
    ${6}      | ${'Failed to send message, because SMS limit was reached'}
    ${7}      | ${'Failed to send message. SIM card is not inserted'}
    ${1000}   | ${'An unexpected error occurred'}
  `('fails to send a message with error message $errorCode', async ({ errorCode, errorMessage }) => {
    wrapper.vm.$axios.post = vi.fn().mockRejectedValueOnce({
      response: {
        data: {
          errors: [{ code: errorCode }]
        }
      }
    })
    wrapper.vm.$refs.tltForm.validate = vi.fn().mockResolvedValue({ valid: true })
    wrapper.vm.$refs.tltForm.setValid = vi.fn().mockResolvedValue()
    wrapper.vm.modems = [['3-1', 'Internal']]
    const spy1 = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.sendMessage()
    expect(spy1).toHaveBeenCalledWith(errorMessage)
    expect(wrapper.vm.$refs.tltForm.setValid).toBeCalledTimes(1)
  })
})
