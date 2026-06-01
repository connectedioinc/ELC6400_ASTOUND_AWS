import WifiQrCode from '@/components/network/WifiQrCode.vue'
import createWrapper, { mergeDeep } from '../../mockFactory'
import { session } from '@ui-core/plugins/session'
vi.spyOn(session, 'hasAccess').mockReturnValue(true)
const stubs = {
  'qrcode-vue': { template: '<div/>' }
}

const content = {
  encryption: 'psk',
  ssid: '111',
  key: '111',
  hidden: '0'
}

const props = {
  content,
  hintModal: true
}

const defaultMocks = {
  global: { stubs },
  props
}

describe('WifiQrCode.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(WifiQrCode, {
      ...defaultMocks
    })
  })
  it('toggles showModal if there is no disabling message and calls generateQrCode', async () => {
    wrapper.vm.showModal = false
    wrapper.vm.toggle()
    expect(wrapper.vm.showModal).toEqual(true)
  })
  it('do not toggle showModal if there is disabling message and does not call generateQrCode', async () => {
    wrapper.vm.showModal = false
    await wrapper.setProps({ content: { mode: 'sta' } })
    wrapper.vm.toggle()
    expect(wrapper.vm.showModal).toEqual(false)
  })
  it.each`
    content                                                    | message
    ${{ encryption: 'psk', mode: 'ap', ssid: 'RUTX11' }}       | ${false}
    ${{ encryption: 'psk', mode: 'ap' }}                       | ${'SSID is required for QR code generation.'}
    ${{ encryption: 'wpa3-mixed', mode: 'ap' }}                | ${'QR code generation is not supported with enterprise encryption.'}
    ${{ encryption: 'wpa', mode: 'ap' }}                       | ${'QR code generation is not supported with enterprise encryption.'}
    ${{ mode: 'mesh' }}                                        | ${'QR code generation is only supported for Access Points.'}
    ${{ encryption: 'psk', mode: 'sta' }}                      | ${'QR code generation is only supported for Access Points.'}
    ${{ encryption: 'wpa', mode: 'sta' }}                      | ${'QR code generation is only supported for Access Points.'}
    ${{ encryption: 'ppsk2', radius_ppsk: '1', ssid: 'test' }} | ${'QR code generation is not supported with RADIUS PPSK mode.'}
  `('returns $message when content: $content', async ({ content, message }) => {
    await wrapper.setProps({ content })
    expect(wrapper.vm.disableMessage).toEqual(message)
  })

  it('returns hint modal component config', () => {
    wrapper = createWrapper(
      WifiQrCode,
      mergeDeep(defaultMocks, {
        props: {
          hintModal: true
        }
      })
    )
    expect(wrapper.vm.hintComponent).toEqual({
      is: 'tltHintModal',
      bind: {
        open: wrapper.vm.showModal
      },
      close: wrapper.vm.close
    })
  })
  it('returns normal modal component config', () => {
    wrapper = createWrapper(
      WifiQrCode,
      mergeDeep(defaultMocks, {
        props: {
          hintModal: false
        }
      })
    )
    expect(wrapper.vm.hintComponent).toEqual({
      is: 'tltModal',
      bind: {
        containerClass: 'qr__modal-container',
        size: 'small',
        open: false
      },
      close: wrapper.vm.close
    })
  })
  it.each`
    ssid        | key          | encryption  | hidden | expectedResult
    ${'mySSID'} | ${'myKey'}   | ${'WPA'}    | ${'1'} | ${'WIFI:S:mySSID;T:WPA;P:myKey;H:true;;'}
    ${'mySSID'} | ${'myKey'}   | ${'WPA'}    | ${'0'} | ${'WIFI:S:mySSID;T:WPA;P:myKey;;'}
    ${'mySSID'} | ${undefined} | ${'nopass'} | ${'1'} | ${'WIFI:S:mySSID;H:true;;'}
    ${'mySSID'} | ${undefined} | ${'nopass'} | ${'0'} | ${'WIFI:S:mySSID;;'}
  `('return $expectedResult when ssid: $ssid, key: $key, encryption: $encryption, hidden: $hidden,', async ({ ssid, key, hidden, expectedResult }) => {
    const content = {
      hidden,
      encryption: 'this should be mocked',
      ssid,
      key
    }
    await wrapper.setProps({ content })
    expect(wrapper.vm.wifiUrl).toEqual(expectedResult)
  })
})
