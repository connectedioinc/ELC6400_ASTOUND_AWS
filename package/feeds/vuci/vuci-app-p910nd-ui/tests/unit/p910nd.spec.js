import P910ND from '../../src/views/services/P910nd.vue'
import createWrapper from '@tests/unit/mockFactory'

const deviceData = {
  success: true,
  data: ['/dev/usb/test2', '/dev/usb/test1', '/dev/usb/lp0']
}

describe('P910ND.vue', () => {
  it('check if afterLoad loads printer files', async () => {
    const wrapper = createWrapper(P910ND)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce(deviceData)
    await wrapper.vm.loadDevices()
    expect(wrapper.vm.devicesOptions).toEqual(['/dev/usb/lp0', '/dev/usb/test2', '/dev/usb/test1'])
  })
  it.each([
    { value: 'string', result: { isValid: false, message: 'Location must be prefixed with "/dev/usb/"' } },
    { value: '/dev/usb/', result: { isValid: false, message: 'Specify file name' } },
    { value: '/dev/usb/../', result: { isValid: false, message: 'File path traversal is forbidden' } },
    { value: '/dev/usb/aa', result: { isValid: true } }
  ])('checks location validation rule', ({ value, result }) => {
    const wrapper = createWrapper(P910ND)
    expect(wrapper.vm.validateLocation(value)).toEqual(result)
  })
})
