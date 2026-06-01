import SstpEdit from '../../src/views/services/SstpEdit.vue'
import createWrapper from '@tests/unit/mockFactory'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
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

const props = {
  section: {
    id: 'test'
  }
}

describe('SstpEdit.vue', () => {
  beforeEach(() => {
    const app = { config: { globalProperties: {} } }
    setActivePinia(createTestingPinia())
    i18n.install(app)
  })

  it('returns certificate and auth options', () => {
    const certificates = [
      {
        type: 'cert',
        name: 'testsign',
        timestamp: 1639095511,
        cert_type: 'ca',
        key_size: '2048',
        fullname: 'testsign.cert.pem',
        path: '/etc/certificates/testsign.cert.pem'
      },
      {
        type: 'cert',
        name: 'naujas',
        cert_type: 'ca',
        timestamp: 1637721324,
        key_size: '512',
        fullname: 'naujas.cert.pem',
        path: '/etc/certificates/naujas.cert.pem'
      }
    ]
    const wrapper = createWrapper(SstpEdit, {
      props,
      global: {
        provide: {
          certificates: ref(certificates)
        }
      }
    })
    const expectedResult = [
      ['/etc/certificates/testsign.cert.pem', 'testsign.cert.pem'],
      ['/etc/certificates/naujas.cert.pem', 'naujas.cert.pem']
    ]
    const resultCert = wrapper.vm.certificateOptions
    expect(resultCert).toEqual(expectedResult)
  })
  it.each([
    [
      [
        {
          message: `It's recommended to use a minimum RSA key length of 2048 bits for the certificate.`,
          source: 'asd:ca',
          code: 1
        }
      ],
      `It's recommended to use a minimum RSA key length of 2048 bits for the certificate.`
    ],
    [
      [
        {
          message: `It's recommended to use a minimum ECC key length of 256 bits for the certificate.`,
          source: 'asd:ca',
          code: 2
        }
      ],
      `It's recommended to use a minimum ECC key length of 256 bits for the certificate.`
    ],
    [
      [
        {
          message: `It's recommended to use a minimum key length of 2048 bits for the certificate.`,
          source: 'asd:ca',
          code: 3
        }
      ],
      `It's recommended to use a minimum key length of 2048 bits for the certificate.`
    ],
    [undefined, undefined]
  ])('should return uploaded certificates warning message', (warningMessages, res) => {
    const wrapper = createWrapper(SstpEdit, {
      props,
      global: {
        provide: {
          warningMessages: () => warningMessages,
          certificates: ref([])
        }
      }
    })
    wrapper.vm.formData = {
      sstp: [
        {
          ca: '/etc/vuci-uploads/cbid.network.asd.caca.crt',
          'ca:file_size': 745,
          id: 'asd'
        }
      ]
    }
    const resultCert = wrapper.vm.getUploadWarning('/etc/vuci-uploads/cbid.network.asd.caca.crt')
    expect(resultCert).toEqual(res)
  })
  it.each([
    {
      title: 'returns specific error message for code 152',
      errorCode: 152,
      expected: 'Uploaded certificate is not valid'
    },
    {
      title: 'returns default error message for unknown error code',
      errorCode: 103,
      expected: 'Failed to edit configuration'
    }
  ])('handleEditErrors $title', ({ errorCode, expected }) => {
    const wrapper = createWrapper(SstpEdit, {
      props,
      global: {
        provide: {
          certificates: ref([]),
          warningMessages: () => [],
          setWarningMessages: () => {}
        }
      }
    })
    const mockResponse = {
      data: {
        errors: [
          {
            code: errorCode
          }
        ]
      }
    }
    const result = wrapper.vm.handleEditErrors(mockResponse)
    expect(result).toEqual(expected)
  })
})
