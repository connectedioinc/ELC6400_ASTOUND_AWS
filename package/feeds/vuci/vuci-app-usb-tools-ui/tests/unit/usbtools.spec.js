import UsbGeneral from '../../src/views/services/UsbGeneral.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('UsbGeneral.vue', () => {
  const mountedDevice = {
    available: '7.8G',
    blocks: '',
    fs: '/dev/sda1',
    in_use: '-',
    mountpoint: '/mnt/sda1',
    percent: '1%',
    used: '40.7M'
  }
  const sections = [
    {
      '.index': 0,
      id: 'cfg013fd6',
      '.type': 'global'
    },
    {
      '.index': 1,
      id: 'cfgtest00',
      '.type': 'notglobal'
    }
  ]
  it('gets mounted devices', async () => {
    const wrapper = createWrapper(UsbGeneral)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce({ data: [mountedDevice] })
    await wrapper.vm.loadMounts()
    const deviceData = wrapper.vm.deviceData
    expect(deviceData).toEqual([mountedDevice])
  })
  it('displays error while load mounted devices fails', async () => {
    const wrapper = createWrapper(UsbGeneral)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadMounts()
    expect(spy).toHaveBeenCalledWith('Error while loading data')
  })
  it('unmounts device', async () => {
    const wrapper = createWrapper(UsbGeneral)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce({ success: true })
    await wrapper.vm.unmount(mountedDevice, true)
  })
  it('gets filtered section', () => {
    const wrapper = createWrapper(UsbGeneral)
    const value = wrapper.vm.filterSections(sections)
    expect(value).toEqual(sections[0])
  })
  it('displays success message after device format', async () => {
    const wrapper = createWrapper(UsbGeneral)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce({
      success: true,
      data: 0
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    await wrapper.vm.format(mountedDevice)
    expect(spy).toHaveBeenCalledWith('Successfully formatted')
  })
  it('displays error message after device format', async () => {
    const wrapper = createWrapper(UsbGeneral)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce({
      success: true,
      data: []
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.format(mountedDevice)
    expect(spy).toHaveBeenCalledWith('Formatting unsuccessful or no MSD detected')
  })
  it('displays side message warning on apply', () => {
    const wrapper = createWrapper(UsbGeneral)
    const spy = vi.spyOn(wrapper.vm.$notification, 'info')
    wrapper.vm.onApply()
    expect(spy).toHaveBeenCalledWith('In order for USB mount setting changes to take effect, re-add the flash devices.')
  })
  it('gets mounted devices after unmount', async () => {
    const wrapper = createWrapper(UsbGeneral)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce({ success: true })
    wrapper.vm.loadMounts = vi.fn().mockResolvedValueOnce()
    const spy = vi.spyOn(wrapper.vm, 'loadMounts')
    await wrapper.vm.unmount(mountedDevice, false)
    expect(spy).toHaveBeenCalledTimes(1)
  })
  it('displays reboot message when device unmounts', async () => {
    const wrapper = createWrapper(UsbGeneral)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce({ success: true })
    wrapper.vm.callReboot = vi.fn().mockResolvedValueOnce()
    const spy = vi.spyOn(wrapper.vm, 'callReboot')
    await wrapper.vm.unmount(mountedDevice, true)
    expect(spy).toHaveBeenCalledTimes(1)
  })
  it('displays error message when device unmount fails', async () => {
    const wrapper = createWrapper(UsbGeneral)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.unmount(mountedDevice, true)
    expect(spy).toHaveBeenCalledWith('Safe remove unsuccessful')
  })
  it('launches reconnect', async () => {
    const wrapper = createWrapper(UsbGeneral)
    wrapper.vm.$axios.post = vi.fn().mockResolvedValueOnce()
    wrapper.vm.$reconnect = vi.fn().mockResolvedValueOnce()
    const spyReconnect = vi.spyOn(wrapper.vm, '$reconnect')
    await wrapper.vm.callReboot()
    expect(spyReconnect).toHaveBeenCalledWith('Rebooting')
  })
  it('displays error message when reboot fails', async () => {
    const wrapper = createWrapper(UsbGeneral)
    wrapper.vm.$axios.post = vi.fn().mockResolvedValueOnce()
    wrapper.vm.$reconnect = vi.fn().mockResolvedValueOnce()
    const spyReconnect = vi.spyOn(wrapper.vm, '$reconnect')
    await wrapper.vm.callReboot()
    expect(spyReconnect).toHaveBeenCalledWith('Rebooting')
  })
  it.each`
    tilte                   | content                                                                                                                         | deviceInUse
    ${'Unmount USB drive?'} | ${'This USB drive is currently in use by "%s" service.'.format(mountedDevice.in_use.toUpperCase())}                             | ${'samba'}
    ${'Reboot router?'}     | ${'Router memory expansion will be deactivated and configuration restored to the state before memory expansion was performed.'} | ${'memexp'}
    ${'Unmount USB drive?'} | ${'This USB drive will be safely removed.'}                                                                                     | ${'-'}
    ${'Unmount USB drive?'} | ${'This USB drive is currently in use.'}                                                                                        | ${'default'}
  `('displays prompt when device is in use by $deviceInUse', ({ title, content, deviceInUse }) => {
    const wrapper = createWrapper(UsbGeneral, {
      $prompt: {
        title,
        content,
        okText: 'Unmount',
        cancelText: 'Cancel',
        onOk: () => {}
      }
    })
    const device = mountedDevice
    device.in_use = deviceInUse
    const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
    wrapper.vm.unmountPrompt(device)
    expect(spy).toHaveBeenCalled()
  })
})
