import VuciFormItemUpload from '@ui-core/vuci-form/src/VuciFormItemUpload.vue'
import createWrapper from '../mockFactory'
import tltCardStub from '../stubs/tltCardStub'

const stubs = {
  'tlt-upload': tltCardStub
}

const defaultVuciSection = {
  sectionId: 'cfg1123',
  name: 'point',
  uciData: {
    id: 'certificate'
  },
  dataKey: 'id',
  getEndpoint: () => 'test',
  registerInput: () => {}
}

describe('VuciFormItemUpload.vue', () => {
  let wrapper = createWrapper(VuciFormItemUpload, {
    global: {
      stubs,
      provide: {
        vuciSection: defaultVuciSection
      }
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each`
    endpoint                       | vuciSection                                                                                                     | uciSection       | result
    ${null}                        | ${{ name: 'point', uciData: { id: 'certificate' }, dataKey: 'id', sectionId: 'id', getEndpoint: () => 'test' }} | ${{ id: '123' }} | ${'/api/test/123'}
    ${null}                        | ${{ type: 'point', uciData: { id: 'certificate' }, dataKey: 'id', sectionId: 'id', getEndpoint: () => 'test' }} | ${{ id: '123' }} | ${'/api/test/123'}
    ${'/api/config/some/endpoint'} | ${{ uciData: { id: 'certificate' }, dataKey: 'id', sectionId: 'id', getEndpoint: () => {} }}                    | ${{ id: '123' }} | ${'/api/config/some/endpoint'}
  `('computes action when endpoint is $endpoint and vuci section is $vuciSection', ({ endpoint, vuciSection, uciSection, result }) => {
    wrapper = createWrapper(VuciFormItemUpload, {
      global: {
        stubs,
        provide: { vuciSection }
      },
      props: {
        uciSection,
        endpoint
      }
    })
    expect(wrapper.vm.action).toBe(result)
  })

  it('computes file object from input value', () => {
    const inputValue = {
      name: 'file'
    }
    wrapper = createWrapper(VuciFormItemUpload, {
      global: {
        stubs,
        provide: {
          vuciSection: defaultVuciSection
        }
      }
    })
    const spy = vi.spyOn(wrapper.vm, '_normalizeFileName')
    wrapper.setData({ inputValue })
    expect(wrapper.vm.file.name).toBe(inputValue.name)
    expect(spy).toHaveBeenCalledWith(inputValue.name)
  })

  it('computes file size', () => {
    const fileSize = 55
    wrapper = createWrapper(VuciFormItemUpload, {
      global: {
        stubs,
        provide: {
          vuciSection: defaultVuciSection
        }
      },
      props: {
        name: 'testFile',
        uciSection: {
          'testFile:file_size': fileSize
        }
      }
    })
    expect(wrapper.vm.fileSize).toBe(fileSize)
  })

  it.each`
    customAction | instant | result
    ${null} | ${false} | ${{
  action: '/api/config/test',
  fileSize: 50,
  maxSize: 100,
  name: 'testFile',
  option: 'upload',
  readonly: false,
  ref: 'tlt-upload',
  vuciUpload: true,
  valid: true
}}
    ${'/api/upload/test'} | ${false} | ${{
  action: '/api/upload/test',
  fileSize: 50,
  maxSize: 100,
  name: 'testFile',
  option: 'upload',
  readonly: false,
  ref: 'tlt-upload',
  vuciUpload: true,
  valid: true
}}
    ${'/api/upload/test'} | ${true} | ${{
  action: '/api/upload/test',
  beforeUpload: wrapper.vm.beforeUpload,
  customRemove: wrapper.vm.customRemove,
  fileSize: 50,
  instant: true,
  maxSize: 100,
  name: 'testFile',
  option: 'upload',
  readonly: false,
  path: '',
  ref: 'tlt-upload',
  vuciUpload: true,
  valid: true
}}
  `('computes upload props when custom action is $customAction and instant is $instant', ({ customAction, instant, result }) => {
    wrapper = createWrapper(VuciFormItemUpload, {
      global: {
        stubs,
        provide: {
          vuciSection: defaultVuciSection
        }
      },
      props: {
        name: 'testFile',
        maxSize: 100,
        option: 'upload',
        customAction,
        instant
      },
      computed: {
        ...VuciFormItemUpload.computed,
        fileSize() {
          return 50
        },
        action() {
          return '/api/config/test'
        }
      }
    })
    expect(wrapper.vm.uploadProps).toEqual(result)
  })

  it('computes instant upload props', () => {
    const parsedPath = '/upload/path'
    const result = {
      beforeUpload: wrapper.vm.beforeUpload,
      customRemove: wrapper.vm.customRemove,
      instant: true,
      path: '/upload/path'
    }
    wrapper = createWrapper(VuciFormItemUpload, {
      global: {
        stubs,
        provide: {
          vuciSection: defaultVuciSection
        }
      }
    })
    wrapper.setData({ parsedPath })
    expect(wrapper.vm.instantUploadProps).toEqual(result)
  })

  it.each`
    instant
    ${false}
    ${true}
  `('computes upload events when instant is $instant', ({ instant }) => {
    wrapper = createWrapper(VuciFormItemUpload, {
      global: {
        stubs,
        provide: {
          vuciSection: defaultVuciSection
        }
      },
      props: {
        instant
      }
    })
    expect(wrapper.vm.uploadEvents.uploaded).toEqual(expect.any(Function))
    expect(wrapper.vm.uploadEvents.input).toEqual(expect.any(Function))
  })
  it.each([
    {
      value: '/etc/vuci-uploads/cbid.test.optiontest.option',
      name: 'test.option',
      path: '/etc/vuci-uploads/cbid.',
      fullPath: '/etc/vuci-uploads/cbid.test.optiontest.option'
    },
    { value: 'test.option', path: '', fullPath: 'test.option', name: '' }
  ])('getPathInfo', ({ value, name, path, fullPath }) => {
    vi.spyOn(wrapper.vm, 'getSeparator').mockReturnValue('test.option')
    expect(wrapper.vm.getPathInfo(value)).toEqual({
      path,
      separator: 'test.option',
      fullPath,
      name
    })
  })

  it('sets model on component create when file is empty', () => {
    const model = 'testModel'
    const fileSize = 0
    const result = ''
    wrapper = createWrapper(VuciFormItemUpload, {
      global: {
        stubs,
        provide: {
          vuciSection: defaultVuciSection
        }
      },
      computed: {
        ...VuciFormItemUpload.computed,
        fileSize() {
          return fileSize
        }
      }
    })
    wrapper.vm.model = model
    wrapper.vm.$options.created.forEach(hook => hook.call(wrapper.vm))
    expect(wrapper.vm.model).toBe(result)
  })

  it('sets input value on component create when file contains data', () => {
    const model = 'testModel'
    const fileSize = 578
    wrapper = createWrapper(VuciFormItemUpload, {
      global: {
        stubs,
        provide: {
          vuciSection: defaultVuciSection
        }
      },
      computed: {
        ...VuciFormItemUpload.computed,
        fileSize() {
          return fileSize
        }
      }
    })
    const spy = vi.spyOn(wrapper.vm, 'setInputValue')
    wrapper.vm.model = model
    wrapper.vm.$options.created.forEach(hook => hook.call(wrapper.vm))
    expect(spy).toHaveBeenCalledWith(wrapper.vm.model)
  })

  it('method registerInput. Registers input in vuci section', () => {
    const name = 'testFile'
    const uciSection = {
      cfg1123: {
        id: 'testId'
      }
    }
    wrapper = createWrapper(VuciFormItemUpload, {
      global: {
        stubs,
        provide: {
          vuciSection: defaultVuciSection
        }
      },
      props: {
        name,
        uciSection
      }
    })
    const spy = vi.spyOn(wrapper.vm.vuciSection, 'registerInput')
    wrapper.vm.registerInput()
    expect(spy).toHaveBeenCalledWith(uciSection[defaultVuciSection.sectionId], wrapper.vm)
  })

  it('returns vuciSection.type.name if vuciSection.name is falsy', () => {
    wrapper = createWrapper(VuciFormItemUpload, {
      props: {
        name: 'name'
      },
      global: {
        stubs,
        provide: {
          vuciSection: {
            sectionId: 'cfg1123',
            type: 'sectionType',
            uciData: {
              id: 'certificate'
            },
            dataKey: 'id',
            getEndpoint: () => 'test',
            registerInput: () => {}
          }
        }
      }
    })
    expect(wrapper.vm.getSeparator('sectionType')).toBe('sectionType.name')
  })
  it('returns vuciSection.name.name if vuciSection.name is truthy', () => {
    wrapper = createWrapper(VuciFormItemUpload, {
      props: {
        name: 'name'
      },
      global: {
        stubs,
        provide: {
          vuciSection: defaultVuciSection
        }
      }
    })
    expect(wrapper.vm.getSeparator('point')).toBe('point.name')
  })
  it('method initializeItem. Initializes an invisible item', () => {
    const model = 'testModel'
    wrapper = createWrapper(VuciFormItemUpload, {
      global: {
        stubs,
        provide: {
          vuciSection: defaultVuciSection
        }
      },
      computed: {
        ...VuciFormItemUpload.computed,
        visible() {
          return false
        }
      }
    })
    wrapper.vm.model = model
    wrapper.vm.initializeItem()
    expect(wrapper.vm.model).toBe(model)
  })

  it('method initializeItem. Initializes an visible item when model is undefined', () => {
    const model = undefined
    const initial = 'testInitial'
    wrapper = createWrapper(VuciFormItemUpload, {
      global: {
        stubs,
        provide: {
          vuciSection: defaultVuciSection
        }
      },
      props: {
        initial
      },
      computed: {
        ...VuciFormItemUpload.computed,
        visible() {
          return true
        }
      }
    })
    wrapper.vm.model = model
    const spy = vi.spyOn(wrapper.vm, 'registerInput')
    wrapper.vm.initializeItem()
    expect(wrapper.vm.model).toBe(initial)
    expect(spy).toHaveBeenCalled()
  })

  it('method uploadFile. Returns undefined when instant prop is true', () => {
    wrapper = createWrapper(VuciFormItemUpload, {
      global: {
        stubs,
        provide: {
          vuciSection: defaultVuciSection
        }
      },
      props: {
        instant: true
      }
    })
    const res = wrapper.vm.uploadFile()
    expect(res).toBeUndefined()
  })

  it('method uploadFile. Resolves with success when file is empty', async () => {
    const response = { success: true, name: '' }
    wrapper = createWrapper(VuciFormItemUpload, {
      global: {
        stubs,
        provide: {
          vuciSection: defaultVuciSection
        }
      },
      props: {
        instant: false
      },
      computed: {
        ...VuciFormItemUpload.computed,
        file() {
          return new File([], '')
        }
      }
    })
    const res = await wrapper.vm.uploadFile()
    expect(res).toEqual(response)
  })

  it('method uploadFile. Posts file and resolves with success response', async () => {
    const file = new File([], 'testFile')
    Object.defineProperty(file, 'size', { value: 1000 })
    const successResp = { success: true, name: file.name }
    const response = { ...successResp, name: file.name, data: { path: '/etc/vuci-uploads' } }
    const result = {
      name: 'testFile',
      result: { data: { path: '/etc/vuci-uploads' }, name: 'testFile', success: true },
      success: true
    }
    wrapper = createWrapper(VuciFormItemUpload, {
      global: {
        stubs,
        provide: {
          vuciSection: defaultVuciSection
        }
      },
      props: {
        instant: false,
        name: 'test'
      },
      computed: {
        ...VuciFormItemUpload.computed,
        file() {
          return file
        }
      }
    })
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce(response)
    const res = await wrapper.vm.uploadFile()
    expect(wrapper.vm.uciSection['test:file_size']).toEqual(1000)
    expect(wrapper.vm.model).toEqual(response.data.path)
    expect(res).toEqual(result)
  })

  it.each`
    errorHandler | uploadRes | result
    ${null} | ${{ response: { data: { errors: [{ code: 2 }] } } }} | ${{
  handler: 'Incorrect file uploaded',
  name: 'testFile',
  success: false
}}
    ${{ 151: 'custom message' }} | ${{ response: { data: { errors: [{ code: 151 }] } } }} | ${{
  handler: 'custom message',
  name: 'testFile',
  success: false
}}
    ${{
  default: e => {
    return `Code ${e.response.data.errors[0].code}`
  }
}} | ${{ response: { data: { errors: [{ code: 999 }] } } }} | ${{
  handler: 'Code 999',
  name: 'testFile',
  success: false
}}
  `('method uploadFile. Posts file and fails with handler $errorHandler', async ({ errorHandler, result, uploadRes }) => {
    const file = new File([], 'testFile')
    Object.defineProperty(file, 'size', { value: 1000 })
    wrapper = createWrapper(VuciFormItemUpload, {
      global: {
        stubs,
        provide: {
          vuciSection: defaultVuciSection
        }
      },
      props: {
        instant: false,
        errorHandler
      },
      computed: {
        ...VuciFormItemUpload.computed,
        file() {
          return file
        }
      }
    })
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce(uploadRes)
    const res = await wrapper.vm.uploadFile()
    expect(res).toEqual(result)
  })

  it.each`
    value                                 | result
    ${'NormalFileName'}                   | ${'NormalFileName'}
    ${'Name with empty spaces'}           | ${'Name_with_empty_spaces'}
    ${'Name-with-inv@l1d-!#char@ct3r&s_'} | ${'Name_with_inv_l1d___char_ct3r_s_'}
  `('method _normalizeFileName. Replaces all non-alphanumeric characters with underscores when value is $value', ({ value, result }) => {
    wrapper = createWrapper(VuciFormItemUpload, {
      global: {
        stubs,
        provide: {
          vuciSection: defaultVuciSection
        }
      }
    })
    const res = wrapper.vm._normalizeFileName(value)
    expect(res).toBe(result)
  })
})
