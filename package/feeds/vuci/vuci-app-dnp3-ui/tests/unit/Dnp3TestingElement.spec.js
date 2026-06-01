import createWrapper from '@tests/unit/mockFactory'
import Dnp3TestingElement from '../../src/views/services/Dnp3TestingElement'

vi.mock('@/composables/useUniversalGatewayUtils', () => ({
  useUniversalGatewayUtils: vi.fn(() => ({
    getTagSize: vi.fn()
  }))
}))

const formOptions = {
  sourcedObjects: []
}

describe('Dnp3TestingElement.vue', () => {
  describe('testRequest()', () => {
    const computed = {
      requestOptions: () => [['1', '1']]
    }
    const formRef = { validate: vi.fn().mockResolvedValue(true) }
    it('calls with correct tcp info', async () => {
      const wrapper = createWrapper(Dnp3TestingElement, {
        global: {
          provide: {
            formOptions: () => formOptions
          }
        },
        props: {
          section: {
            enabled: '0',
            local_addr: '10',
            timeout: '10',
            ip: '1.1.1.1',
            remote_addr: '10',
            save_to_flash: '0',
            id: '1',
            '.type': 'tcp_client',
            port: '20',
            integrity_period: '10',
            name: 'ccc4'
          },
          tcpClient: true,
          formData: {
            dnp3: {},
            1: [
              {
                id: 'dssdsds',
                data_type: '3',
                index: '2',
                count: '10'
              }
            ]
          },
          formRef
        },
        data() {
          return {
            testForm: {
              currentTest: 'dssdsds'
            }
          }
        }
      })
      const spy = vi.spyOn(wrapper.vm.$axios, 'post')
      await wrapper.vm.testRequest()
      expect(spy).toBeCalledWith('/api/dnp3/tcp/actions/test_request', {
        data: expect.objectContaining({
          count: '10',
          data_type: '3',
          index: '2',
          ip: '1.1.1.1',
          local_addr: '10',
          port: '20',
          remote_addr: '10',
          timeout: '10'
        })
      })
    })
    it('calls with correct serial info', async () => {
      const wrapper = createWrapper(Dnp3TestingElement, {
        global: {
          provide: {
            formOptions: () => formOptions
          }
        },
        props: {
          section: {
            id: '2',
            local_addr: '1',
            databits: '8',
            stopbits: '1',
            remote_addr: '10',
            baudrate: '300',
            time_duration: '1',
            parity: '0',
            '.type': 'serial_client',
            timeout: '10',
            enabled: '1',
            device: '/dev/rs485',
            flowcontrol: '0',
            integrity_period: '60',
            save_to_flash: '0'
          },
          tcpClient: false,
          formData: {
            dnp3: {}
          },
          formRef
        },
        computed: {
          ...computed,
          selectedTest: () => ({
            id: 'dssdsds',
            data_type: '3',
            index: '2',
            count: '10'
          })
        }
      })
      const spy = vi.spyOn(wrapper.vm.$axios, 'post').mockResolvedValue({})
      await wrapper.vm.testRequest()
      expect(spy).toBeCalledWith('/api/dnp3/serial/actions/test_request', {
        data: expect.objectContaining({
          baudrate: '300',
          count: '10',
          databits: '8',
          data_type: '3',
          flowcontrol: '0',
          index: '2',
          local_addr: '1',
          parity: '0',
          remote_addr: '10',
          device: '/dev/rs485',
          stopbits: '1',
          time_duration: '1',
          timeout: '10'
        })
      })
    })
    it('set testResponse on success', async () => {
      const wrapper = createWrapper(Dnp3TestingElement, {
        global: {
          provide: {
            formOptions: () => formOptions
          }
        },
        props: {
          section: { id: '1' },
          tcpClient: false,
          formData: {
            dnp3: {},
            1: [
              {
                id: 'dssdsds',
                data_type: '3',
                index: '2',
                count: '10'
              }
            ]
          },
          formRef
        }
      })
      vi.spyOn(wrapper.vm.$axios, 'post').mockResolvedValue({ data: { data: ['test', 'test'] } })
      await wrapper.vm.testRequest()
      expect(wrapper.vm.testResponse).toEqual('test test')
    })
    it('set testResponse on error', async () => {
      const wrapper = createWrapper(Dnp3TestingElement, {
        global: {
          provide: {
            formOptions: () => formOptions
          }
        },
        props: {
          section: { id: '1' },
          tcpClient: false,
          formData: {
            dnp3: {},
            1: [
              {
                id: 'dssdsds',
                data_type: '3',
                index: '2',
                count: '10'
              }
            ]
          },
          formRef
        },
        data() {
          return {
            testForm: {
              currentTest: 'dssdsds'
            }
          }
        }
      })
      vi.spyOn(wrapper.vm.$axios, 'post').mockResolvedValue({ data: { response: 'Tests failed' } })
      await wrapper.vm.testRequest()
      expect(wrapper.vm.testResponse).toEqual('Test failed')
    })
    it('set testResponse on error when there is no request to test', async () => {
      const wrapper = createWrapper(Dnp3TestingElement, {
        global: {
          provide: {
            formOptions: () => formOptions
          }
        },
        computed: {
          requestOptions: () => []
        },
        props: {
          section: {},
          tcpClient: false,
          formData: {
            dnp3: {}
          },
          formRef
        }
      })
      vi.spyOn(wrapper.vm.$axios, 'post').mockResolvedValue({ data: { response: 'Tests failed' } })
      await wrapper.vm.testRequest()
      expect(wrapper.vm.testResponse).toEqual('Test failed - There was no request to test')
    })
    it('set testResponse on error when some fields are invalid', async () => {
      const wrapper = createWrapper(Dnp3TestingElement, {
        global: {
          provide: {
            formOptions: () => formOptions
          }
        },
        computed,
        props: {
          section: {},
          tcpClient: false,
          formData: {
            dnp3: {}
          },
          formRef: {
            validate: vi.fn().mockResolvedValue(false)
          }
        }
      })
      vi.spyOn(wrapper.vm.$axios, 'post').mockResolvedValue({ data: { response: 'Tests failed' } })
      await wrapper.vm.testRequest()
      expect(wrapper.vm.testResponse).toEqual('Test failed - Some fields are invalid')
    })
  })
  it('returns request options', () => {
    const wrapper = createWrapper(Dnp3TestingElement, {
      global: {
        provide: {
          formOptions: () => formOptions
        }
      },
      props: {
        section: { id: 'f4324234fffs' },
        tcpClient: false,
        formData: {
          f4324234fffs: [{ id: 'dddwe322', name: 'test' }]
        }
      }
    })
    expect(wrapper.vm.requestOptions).toEqual([['dddwe322', 'test']])
  })
  it('returns selected request', () => {
    const formData = {
      f4324234fffs: [{ id: 'dddwe322', name: 'test' }]
    }
    const wrapper = createWrapper(Dnp3TestingElement, {
      global: {
        provide: {
          formOptions: () => formOptions
        }
      },
      props: {
        section: { id: 'f4324234fffs' },
        tcpClient: false,
        formData
      }
    })
    wrapper.vm.testForm.currentTest = 'dddwe322'
    expect(wrapper.vm.selectedTest).toEqual(formData.f4324234fffs[0])
  })
  it('returns empty object when there is no selected request', () => {
    const formData = {
      f4324234fffs: [{ id: 'dddwe322', name: 'test' }]
    }
    const wrapper = createWrapper(Dnp3TestingElement, {
      global: {
        provide: {
          formOptions: () => formOptions
        }
      },
      props: {
        section: { id: 'f4324234fffs' },
        tcpClient: false,
        formData
      }
    })
    wrapper.vm.testForm.currentTest = ''
    expect(wrapper.vm.selectedTest).toEqual({})
  })
})
