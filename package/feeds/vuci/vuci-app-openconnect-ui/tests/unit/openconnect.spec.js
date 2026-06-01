import OpenConnect from '../../src/views/services/OpenConnect.vue'
import OpenConnectEdit from '../../src/views/services/OpenConnectEdit.vue'
import createWrapper from '@tests/unit/mockFactory'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { useMessages } from '@/stores/messages'
import i18n from '@ui-core/plugins/i18n'
import { ref } from 'vue'

vi.mock('vue-router', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ path: 'test' })),
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn()
    })
  }
})

describe('OpenConnect overview tests', () => {
  beforeEach(() => {
    const app = { config: { globalProperties: {} } }
    setActivePinia(createTestingPinia())
    i18n.install(app)
  })
  it.each([
    ['with missing server', 'Server address is required', { enabled: '1', vpn_protocol: 'tcp', server: '', port: '1194', username: 'user', password: 'pass' }],
    ['with missing port', 'Port address is required', { enabled: '1', vpn_protocol: 'tcp', server: 'example.com', port: '', username: 'user', password: 'pass' }]
  ])('returns error message when %s', (text, messageText, sectionValues) => {
    const wrapper = createWrapper(OpenConnect)
    const message = useMessages()
    const spy = vi.spyOn(message, 'error')
    const data = {
      uciSection: sectionValues
    }
    wrapper.vm.validateEnable(data)
    expect(spy).toHaveBeenCalledWith(messageText)
  })
})

describe('OpenConnectEdit - generateServerFingerprint', () => {
  let wrapper
  const props = {
    section: {
      id: 'test'
    }
  }
  const certificates = [
    { fullname: 'client', cert_type: 'client', type: 'key', path: '/path/to/client.key' },
    { fullname: 'server', cert_type: 'server', type: 'key', path: '/path/to/server.key' },
    { fullname: 'client', cert_type: 'client', type: 'cert', path: '/path/to/client.cert' },
    { fullname: 'server', cert_type: 'server', type: 'cert', path: '/path/to/server.cert' },
    { fullname: 'ca', cert_type: 'ca', type: 'cert', path: '/path/to/ca.cert' },
    { fullname: 'dh', cert_type: 'dh', type: 'dh', path: '/path/to/dh.pem' }
  ]
  beforeEach(() => {
    const app = { config: { globalProperties: {} } }
    setActivePinia(createTestingPinia())
    i18n.install(app)
    wrapper = createWrapper(OpenConnectEdit, {
      props
    })
    wrapper.vm.$axios.post = vi.fn()
  })
  it.each([
    {
      name: 'missing port',
      record: { server: 'test.com', port: '' },
      expectedError: 'Port is required to check fingerprint'
    },
    {
      name: 'missing server',
      record: { port: '443', server: '' },
      expectedError: 'Server is required to check fingerprint'
    }
  ])('should return error when $name', async ({ record, expectedError }) => {
    const wrapper = createWrapper(OpenConnectEdit, {
      props: {
        section: { ...record }
      }
    })
    const message = useMessages()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.generateServerFingerprint(record)
    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledWith(expectedError)
  })
  it.each([
    {
      name: 'error code 122',
      errorCode: 122
    },
    {
      name: 'unknown error code',
      errorCode: 999
    }
  ])('should handle API error when $name', async ({ errorCode }) => {
    const wrapper = createWrapper(OpenConnectEdit, {
      props
    })
    const message = useMessages()
    const record = { server: 'test.com', port: '443' }
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce({
      response: {
        data: {
          errors: [{ code: errorCode }]
        }
      }
    })
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.generateServerFingerprint(record)
    expect(spy).toHaveBeenCalled()
  })
  it.each([
    {
      name: 'invalid prefix',
      input: 'invalid:1234567890abcdef',
      expected: {
        isValid: false,
        message: 'Accepted formats are sha1:, sha256:, or pin-sha256:'
      }
    },
    {
      name: 'valid sha1',
      input: 'sha1:1234567890abcdef1234567890abcdef12345678',
      expected: { isValid: true }
    },
    {
      name: 'valid short sha1',
      input: 'sha1:1234567890',
      expected: { isValid: true }
    },
    {
      name: 'valid sha256',
      input: 'sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      expected: { isValid: true }
    },
    {
      name: 'valid short sha256',
      input: 'sha256:1234567890',
      expected: { isValid: true }
    },
    {
      name: 'valid pin-sha256',
      input: 'pin-sha256:swgyOMLsTnswN0aTp75HhDfYTOeo1QpCWJefd6B95tY=',
      expected: { isValid: true }
    },
    {
      name: 'invalid characters in sha1',
      input: 'sha1:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1234',
      expected: {
        isValid: false,
        message: 'Invalid SHA-1 hash. Must contain only hexadecimal characters after sha1:'
      }
    },
    {
      name: 'invalid characters in sha256',
      input: 'sha256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1234',
      expected: {
        isValid: false,
        message: 'Invalid SHA-256 hash. Must contain only hexadecimal characters after sha256:'
      }
    },
    {
      name: 'invalid characters in pin-sha256',
      input: 'pin-sha256:!@#$%^&*()',
      expected: {
        isValid: false,
        message: 'Invalid PIN-SHA-256 hash. Must contain only base64 characters after pin-sha256: and end with ='
      }
    }
  ])('should validate hash string when $name', ({ input, expected }) => {
    const wrapper = createWrapper(OpenConnectEdit, {
      props
    })
    wrapper.vm.$t = msg => msg

    const result = wrapper.vm.validateHashString(input)
    expect(result).toEqual(expected)
  })
  it.each`
    device_files | expected
    ${'1'}       | ${false}
    ${'0'}       | ${true}
  `('extractPort($input) should return $expected', ({ device_files, expected }) => {
    const wrapper = createWrapper(OpenConnectEdit, {
      props: {
        section: { device_files }
      }
    })
    const result = wrapper.vm.isDeviceFilesDisabled
    expect(result).toEqual(expected)
  })
  it('returns filtered ca certs', () => {
    const wrapper = createWrapper(OpenConnectEdit, { props, global: { provide: { certificates: ref(certificates) } } })
    const value = wrapper.vm.caCertOptions
    expect(value).toEqual([['/path/to/ca.cert', 'ca']])
  })
  it('returns filtered keys options', () => {
    const wrapper = createWrapper(OpenConnectEdit, { props, global: { provide: { certificates: ref(certificates) } } })
    const value = wrapper.vm.keyOptions
    expect(value).toEqual([
      ['/path/to/client.key', 'client'],
      ['/path/to/server.key', 'server']
    ])
  })
  it('returns filtered certificate options', () => {
    const wrapper = createWrapper(OpenConnectEdit, {
      props,
      global: {
        provide: { certificates: ref(certificates) }
      }
    })
    const value = wrapper.vm.certOptions
    expect(value).toEqual([
      ['/path/to/client.cert', 'client'],
      ['/path/to/server.cert', 'server']
    ])
  })
  it('displays TPM storage full message when response code is 5', () => {
    const wrapper = createWrapper(OpenConnectEdit, {
      props,
      global: {
        provide: { certificates: ref(certificates) }
      }
    })
    const message = useMessages()
    const messageSpy = vi.spyOn(message, 'info')
    wrapper.vm.uploadHandler({ messages: [{ code: 5 }] })
    wrapper.vm.afterSave(null, { success: true, messages: [] })
    expect(messageSpy).toHaveBeenCalledWith('TPM2 storage is full. The uploaded key could not be moved to TPM2 storage.')
  })
  it('does not display TPM storage message when response code is not 5', () => {
    const wrapper = createWrapper(OpenConnectEdit, {
      props,
      global: {
        provide: { certificates: ref(certificates) }
      }
    })
    const message = useMessages()
    const messageSpy = vi.spyOn(message, 'info')
    wrapper.vm.uploadHandler({ messages: [{ code: 1 }] })
    wrapper.vm.afterSave(null, { messages: [] })
    expect(messageSpy).not.toHaveBeenCalledWith('TPM2 storage is full. The uploaded key could not be moved to TPM2 storage.')
  })
})
