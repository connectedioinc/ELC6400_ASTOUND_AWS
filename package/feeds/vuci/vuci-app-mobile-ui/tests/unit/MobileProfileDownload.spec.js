import MobileProfileDownload from '../../src/components/network/MobileProfileDownload.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('MobileProfileDownload.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MobileProfileDownload, {
      props: {
        profiles,
        downloadBtn: { text: '', hint: '', disabled: false, loading: false },
        modemId: '1-1'
      }
    })
  })
  const profiles = [
    { id: '1', name: 'test', modem: '1-1', profile_set: '1', enabled: '1' },
    { id: '2', name: 'test2', modem: '3-1', profile_set: '1', enabled: '1' }
  ]

  it.each([
    ['same name already exists', 'test', { isValid: false, message: "Profile with name 'test' already exists" }],
    ['same name already exists 2', 'test', { isValid: false, message: "Profile with name 'test' already exists" }],
    ['name is unique', 'test123', { isValid: true }]
  ])('validates profile name when %s', (text, val, res) => {
    expect(wrapper.vm.validateName(val)).toEqual(res)
  })
  it.each([
    ['code valid', 'LPA:1$operator.com$ABCDE12345', { isValid: true }],
    ['code valid 2', '1$operator.com$ABCDE12345', { isValid: true }],
    ['code is empty', '', { isValid: false, message: 'Activation code must follow this format: LPA:1$operator.com$code123' }],
    ['code invalid', '1$$ABC', { isValid: false, message: 'Activation code must follow this format: LPA:1$operator.com$code123' }],
    ['code invalid 2', 'ABC$ABC$ABC', { isValid: false, message: 'Activation code must follow this format: LPA:1$operator.com$code123' }]
  ])('validates activation code when %s', (text, val, res) => {
    expect(wrapper.vm.validateCode(val)).toEqual(res)
  })
  it('check if QR code error message is shown when trying to upload not image file', async () => {
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    wrapper.vm.validCode = { value: true }
    await wrapper.vm.decodeQrCode({ name: 'test.txt', type: 'text/plain' })
    expect(spy).toHaveBeenCalledWith('Only image files allowed')
    expect(wrapper.vm.validCode).toEqual(false)
  })
  it.each([
    [800, { width: 1000, height: 1000 }, { newWidth: 800, newHeight: 800 }],
    [600, { width: 600, height: 600 }, { newWidth: 600, newHeight: 600 }],
    [400, { width: 200, height: 200 }, { newWidth: 200, newHeight: 200 }]
  ])('returns calculated new dimensions when resize size is %s', (resizeTo, sourceDim, newDim) => {
    expect(wrapper.vm.resizeDimensions(sourceDim.width, sourceDim.height, resizeTo)).toEqual(newDim)
  })
})
