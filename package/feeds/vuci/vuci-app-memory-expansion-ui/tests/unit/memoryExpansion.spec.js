import createWrapper from '@tests/unit/mockFactory'
import MemoryExpansion from '../../src/views/services/MemoryExpansion.vue'

describe('MemoryExpansion.vue', () => {
  const apiResponse = [
    { success: true, data: { expansion_job_status: true, expansion_enabled: true } },
    { success: true, data: [{ dev: '/dev/sda1', type: 'sd', label: 'RUTOS_overlay', description: 'Device 3000' }] }
  ]
  it('loadDevices gets data on success', async () => {
    const wrapper = createWrapper(MemoryExpansion)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(apiResponse)
    await wrapper.vm.loadDevices()
    const value = wrapper.vm.memexpStatus
    const expansion = wrapper.vm.expansionOptions
    expect(value).toEqual(true)
    expect(expansion[0][1]).toEqual(`SD - Device 3000`)
  })
  it('loadDevices sets data false when API not successful', async () => {
    const wrapper = createWrapper(MemoryExpansion)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: false, data: [] },
      { success: false, data: [] }
    ])
    await wrapper.vm.loadDevices()
    const value = wrapper.vm.memexpStatus
    expect(value).toEqual(false)
    expect(spy).toHaveBeenCalledTimes(3)
  })
  it('loadDevices displays error when API fails', async () => {
    const wrapper = createWrapper(MemoryExpansion)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    await wrapper.vm.loadDevices()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('displays reconnect message in startExpansion', async () => {
    const wrapper = createWrapper(MemoryExpansion)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce(apiResponse)
    const spyReconnect = vi.spyOn(wrapper.vm, '$reconnect')
    await wrapper.vm.startExpansion()
    wrapper.vm.$axios.post.mockResolvedValueOnce(apiResponse)
    expect(spyReconnect).toHaveBeenCalledWith('Rebooting')
  })
  it('displays error message in startExpansion', async () => {
    const wrapper = createWrapper(MemoryExpansion)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce(apiResponse)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.startExpansion()
    wrapper.vm.$axios.post.mockResolvedValueOnce(apiResponse)
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it.each`
    device   | status
    ${'sd'}  | ${'present'}
    ${'usb'} | ${'present'}
    ${'sd'}  | ${'not_present'}
    ${'usb'} | ${'not_present'}
  `('returns true when $device is $status', async ({ device, status }) => {
    const wrapper = createWrapper(MemoryExpansion)
    wrapper.vm.form.storage = device
    wrapper.vm.mmcStatus = status
    wrapper.vm.mmcStatus = status
    const value = await wrapper.vm.readOnly
    expect(value).toEqual(true)
  })
  it('start memory expansion on ok', async () => {
    const wrapper = createWrapper(MemoryExpansion)
    const spyTimer = vi.spyOn(wrapper.vm, 'startExpansion')
    await wrapper.vm.onOk()
    expect(spyTimer).toHaveBeenCalledTimes(1)
  })
  it('pops prompt', async () => {
    const wrapper = createWrapper(MemoryExpansion)
    const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
    wrapper.vm.invokePrompt()
    expect(spy).toHaveBeenCalled()
  })
  it('kill error message', () => {
    const wrapper = createWrapper(MemoryExpansion)
    wrapper.vm.$notification.remove = vi.fn()
    const spy = vi.spyOn(wrapper.vm.$notification, 'remove')
    wrapper.vm.removeMessage('test')
    expect(spy).toHaveBeenCalledWith('test')
  })
  it.each`
    sd       | id   | message
    ${false} | ${0} | ${'No suitable storage device detected.'}
    ${false} | ${1} | ${'The target USB device is used by Samba service.'}
    ${true}  | ${1} | ${'The target SD card is used by Samba service.'}
  `('returns correct error message based on provided sd status and id', ({ sd, id, message }) => {
    const wrapper = createWrapper(MemoryExpansion)
    expect(wrapper.vm.returnMessage(sd, id)).toEqual(message)
  })
  it.each([
    [[], 1],
    [[{ fs: '/dev/sda1', type: 'sd', in_use: 'samba' }], 1],
    [[{ fs: '/dev/sda1', type: 'sd', in_use: 'dlna' }], 1]
  ])('returns invokes side messages', (devices, called) => {
    const wrapper = createWrapper(MemoryExpansion)
    wrapper.vm.devices = devices
    const spy = vi.spyOn(wrapper.vm.$notification, 'error')
    wrapper.vm.invokeMessages('/dev/sda1')
    expect(spy).toBeCalledTimes(called)
  })
})
