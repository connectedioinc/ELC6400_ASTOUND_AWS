import VuciFormItemMixin from '@ui-core/vuci-form/src/VuciFormItemMixin.vue'
import createWrapper from '../mockFactory'
import tltCardStub from '../stubs/tltCardStub'

const component = {
  render() {},
  mixins: [VuciFormItemMixin]
}

const stubs = {
  'vuci-form-item-template': tltCardStub,
  'tlt-depend-mixin-api': tltCardStub,
  'tlt-validation-mixin': tltCardStub
}

const data = {
  id: 'cfg0310a4',
  '.type': 'reboot_instance',
  enable: '0',
  action: '1',
  period: 'week',
  days: ['mon'],
  time: ['12:00']
}

const provide = {
  vuciSection: {
    sectionId: 'testSection'
  },
  vuciForm: {
    editing: true
  },
  noValidate: () => false
}

describe('VuciFormItemMixin.vue', () => {
  let wrapper
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each`
    method
    ${'modelWatcher'}
    ${'emitChange'}
    ${'initializeItem'}
    ${'registerInput'}
    ${'convertUciValue'}
    ${'reset'}
    ${'_save'}
    ${'validate'}
  `('Mixin contains $method method', async ({ method }) => {
    wrapper = createWrapper(component, {
      global: { stubs }
    })
    const methods = Object.keys(wrapper.vm)
    expect(methods.includes(method)).toBeTruthy()
    expect(typeof wrapper.vm[method]).toBe('function')
  })

  it('computes sectionTarget from uciSection', () => {
    const result = {
      id: 'test'
    }
    wrapper = createWrapper(component, {
      global: { stubs, provide },
      props: {
        uciSection: {
          testSection: result
        }
      }
    })
    expect(wrapper.vm.sectionTarget).toEqual(result)
  })

  it.each`
    edit
    ${false}
    ${true}
  `('computes isEdit when form visibility is set to $edit', async ({ edit }) => {
    wrapper = createWrapper(component, {
      global: {
        stubs,
        provide: {
          vuciForm: {
            editing: edit
          }
        }
      }
    })
    expect(wrapper.vm.isEdit).toEqual(edit)
  })

  it('computes VuciFormItemTemplateProps data', () => {
    wrapper = createWrapper(component, {
      global: { stubs },
      props: {
        label: 'test label',
        help: 'help description.',
        rawhtml: false
      },
      computed: {
        prop() {
          return 'section'
        }
      }
    })
    wrapper.setData({
      validationMessages: [],
      valid: true
    })
    expect(wrapper.vm.VuciFormItemTemplateProps).not.toBeUndefined()
  })

  it.each`
    readonly | readOnlyPage | result
    ${false} | ${false}     | ${false}
    ${false} | ${true}      | ${true}
    ${true}  | ${true}      | ${true}
  `('computes readOnly state when readonly prop is set to $readonly and store contains $readOnlyPage', ({ readonly, readOnlyPage, result }) => {
    wrapper = createWrapper(component, {
      props: {
        readonly
      },
      global: {
        stubs,
        mocks: {
          $store: {
            readOnlyPage
          }
        }
      }
    })
    expect(wrapper.vm.readOnly).toBe(result)
  })

  it.each`
    edit     | result
    ${true}  | ${'edit.testSection_test'}
    ${false} | ${'testSection_test'}
  `('computes prop string when edit is $edit', ({ edit, result }) => {
    const name = 'test'
    wrapper = createWrapper(component, {
      global: { stubs },
      props: {
        name
      },
      computed: {
        isEdit() {
          return edit
        },
        sectionTarget() {
          return 'testSection'
        }
      }
    })
    expect(wrapper.vm.prop).toBe(result)
  })

  it.each`
    name                 | result
    ${'test'}            | ${'data'}
    ${'nonexistingname'} | ${''}
  `('computes model value with name $name', ({ name, result }) => {
    wrapper = createWrapper(component, {
      global: { stubs },
      props: {
        name,
        uciSection: {
          test: 'data'
        }
      }
    })
    expect(wrapper.vm.model).toBe(result)
  })

  it.each`
    name       | value
    ${'name1'} | ${'value1'}
    ${'name2'} | ${'value2'}
  `('sets model value with name $name and value $value', ({ name, value }) => {
    wrapper = createWrapper(component, {
      global: { stubs },
      props: {
        name
      }
    })
    wrapper.vm.model = value
    expect(wrapper.vm.uciSection[name]).toBe(value)
  })

  it.each`
    model     | result
    ${null}   | ${true}
    ${'test'} | ${false}
  `('computes availableModel when model is $model', ({ model, result }) => {
    wrapper = createWrapper(component, {
      global: { stubs }
    })
    wrapper.vm.model = model
    expect(wrapper.vm.availableModel).toBe(result)
  })

  it('method modelWatcher. Checks whether model has changed when model and initial value are the same', () => {
    const model = 'test'
    const initialValue = 'test'
    wrapper = createWrapper(component, {
      global: { stubs },
      computed: {
        model() {
          return model
        }
      }
    })
    wrapper.setData({ initialValue })
    wrapper.vm.modelWatcher(model, initialValue)
    expect(wrapper.vm.changed).toBeFalsy()
  })

  it('method modelWatcher. Checks whether model has changed when model and initial value differ', () => {
    const model = 'test'
    const initialValue = ''
    wrapper = createWrapper(component, {
      global: { stubs },
      computed: {
        model() {
          return model
        }
      }
    })
    const spy = vi.spyOn(wrapper.vm, 'emitChange')
    wrapper.setData({ initialValue })
    wrapper.vm.modelWatcher(model, initialValue)
    expect(wrapper.vm.changed).toBeTruthy()
    expect(spy).toHaveBeenCalledWith(model, initialValue)
  })

  it('method emitChange. Emits changed values', async () => {
    const newVal = 'test'
    const oldVal = ''
    wrapper = createWrapper(component, {
      global: {
        stubs,
        provide
      }
    })
    const spy = vi.spyOn(wrapper.vm, 'validate')
    wrapper.vm.changed = true
    wrapper.vm.emitChange(newVal, oldVal)
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('change')).toBeTruthy()
    expect(spy).toHaveBeenCalled()
  })

  it('method initializeItem. Item is not visible', () => {
    wrapper = createWrapper(component, {
      global: { stubs },
      computed: {
        visible() {
          return false
        }
      }
    })
    const result = wrapper.vm.initializeItem()
    expect(result).toBeUndefined()
  })

  it.each`
    model
    ${undefined}
    ${null}
    ${0}
  `('method initializeItem. Item is visible and model is $model', ({ model }) => {
    const initial = 'test'
    wrapper = createWrapper(component, {
      global: { stubs },
      props: {
        initial
      },
      computed: {
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

  it('method registerInput. Vuci section registers input', () => {
    wrapper = createWrapper(component, {
      global: { stubs }
    })
    const spy = vi.spyOn(wrapper.vm, 'registerInput')
    expect(spy)
  })

  it('method convertUciValue. Returns converted value', () => {
    wrapper = createWrapper(component, {
      global: { stubs }
    })
    const value = 'testValue'
    const result = wrapper.vm.convertUciValue(value)
    expect(result).toBe(value)
  })

  it('method reset. Resets model to initial value', () => {
    const initialValue = 'initialTest'
    wrapper = createWrapper(component, {
      global: { stubs }
    })
    wrapper.setData({ initialValue })
    wrapper.vm.reset()
    expect(wrapper.vm.model).toEqual(initialValue)
  })

  it('method _save. Saves data when function is provided', async () => {
    const model = 'testModel'
    wrapper = createWrapper(component, {
      global: { stubs },
      props: {
        save: (_, data) => new Promise(resolve => resolve(data))
      }
    })
    // const spy = vi.spyOn(wrapper.vm, 'save')
    wrapper.vm.model = model
    const result = await wrapper.vm._save(data)
    // expect(spy).toHaveBeenCalledWith(wrapper.vm, data)
    expect(wrapper.vm.initialValue).toBe(model)
    expect(wrapper.vm.tempValue).toBe(model)
    expect(result).toEqual(data)
  })

  it('method _save. Saves data when value is provided', () => {
    const model = 'testModel'
    wrapper = createWrapper(component, {
      global: { stubs },
      props: {
        save: 'test'
      }
    })
    wrapper.vm.model = model
    const result = wrapper.vm._save()
    expect(wrapper.vm.initialValue).toBe(model)
    expect(wrapper.vm.tempValue).toBe(model)
    expect(result).toEqual('test')
  })
  describe('Method: validate', () => {
    it('Returns true if item is not visible', async () => {
      wrapper = createWrapper(component, {
        global: { stubs },
        computed: {
          visible() {
            return false
          }
        }
      })
      const result = await wrapper.vm.validate()
      expect(result).toBeTruthy()
    })
    it.each`
      model
      ${null}
      ${[]}
    `('Returns false if item is visible, required and model is $model', async ({ model }) => {
      wrapper = createWrapper(component, {
        global: { stubs },
        props: {
          required: true
        },
        computed: {
          visible() {
            return true
          }
        }
      })
      wrapper.vm.model = model
      const result = await wrapper.vm.validate()
      expect(result).toBeFalsy()
    })
    it.each`
      model                  | min     | max
      ${'test'}              | ${'5'}  | ${'10'}
      ${'verylongtestvalue'} | ${'5'}  | ${'10'}
      ${'verylongtestvalue'} | ${'10'} | ${'10'}
    `('Returns false if item is visible, model: $model, minlenght: $min, maxlength: $max', async ({ model, min, max }) => {
      wrapper = createWrapper(component, {
        global: {
          mocks: {
            $t: msg => msg
          },
          stubs
        },
        props: {
          minlength: min,
          maxlength: max
        },
        computed: {
          visible() {
            return true
          }
        }
      })
      wrapper.vm.model = model
      const result = await wrapper.vm.validate()
      expect(result).toBeFalsy()
    })
    it.each`
      model                  | isValid  | ruleData
      ${'test'}              | ${false} | ${{ isValid: false, message: 'invalid' }}
      ${'verylongtestvalue'} | ${true}  | ${{ isValid: true }}
    `('Contains rules with model $model, rule validity of $isValid and data $ruleData', async ({ model, isValid, ruleData }) => {
      const rule = () => ruleData
      wrapper = createWrapper(component, {
        global: { stubs },
        props: {
          rules: [rule]
        },
        computed: {
          visible() {
            return true
          },
          convertedRules() {
            return {
              flat: () => [rule]
            }
          }
        }
      })
      wrapper.vm.model = model
      const result = await wrapper.vm.validate()
      expect(result).toBe(isValid)
    })
  })
  it.each([
    [undefined, true],
    [null, true],
    ['', true],
    ['0', false],
    ['1', false],
    [[], true],
    [[''], true],
    [['', ''], true],
    [['', 'test'], false]
  ])('checks if value is empty when value is %o', (value, expected) => {
    wrapper = createWrapper(component, {
      global: { stubs }
    })
    expect(wrapper.vm.isEmpty(value)).toBe(expected)
  })
  it('saves value and clears input after hiding it', async () => {
    wrapper = createWrapper(component, {
      global: { stubs },
      props: {
        initial: 'test'
      }
    })
    wrapper.vm.isEmpty = vi.fn().mockReturnValue(true)
    wrapper.vm.$options.watch.showOption.call(wrapper.vm, false)
    expect(wrapper.vm.tempValue).toBe('test')
  })
  it('restores value after showing it', async () => {
    wrapper = createWrapper(component, {
      global: { stubs },
      props: {
        initial: 'test'
      }
    })
    const spy = vi.spyOn(wrapper.vm, 'registerInput')
    wrapper.vm.isEmpty = vi.fn().mockReturnValue(true)
    wrapper.vm.$options.watch.showOption.call(wrapper.vm, true)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.model).toBe('test')
    expect(spy).toHaveBeenCalled()
  })

  describe('Check form item requirements:', () => {
    it('sets model to initial value when item is visible', () => {
      wrapper = createWrapper(component, {
        props: {
          name: 'input',
          uciSection: {
            input: ''
          },
          initial: 'test',
          depend: true
        }
      })
      expect(wrapper.vm.model).toBe('test')
    })
    it('does not set model to initial value when item is not visible', () => {
      wrapper = createWrapper(component, {
        props: {
          name: 'input',
          uciSection: {
            input: ''
          },
          initial: 'test',
          depend: false
        }
      })
      expect(wrapper.vm.model).toBe('')
    })
    it('does not change model when initial value changes', async () => {
      wrapper = createWrapper(component, {
        props: {
          name: 'input',
          uciSection: {
            input: ''
          },
          initial: 'asdf'
        }
      })
      expect(wrapper.vm.model).toBe('asdf')
      await wrapper.setProps({ initial: 'fdsa' })
      expect(wrapper.vm.model).toBe('asdf')
    })
  })
})
