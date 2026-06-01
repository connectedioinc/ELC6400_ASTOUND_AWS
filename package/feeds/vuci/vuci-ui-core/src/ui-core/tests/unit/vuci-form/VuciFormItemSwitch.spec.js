import VuciFormItemSwitch from '@ui-core/vuci-form/src/VuciFormItemSwitch'
import createWrapper from '../mockFactory'

const defaultVuciSection = {
  sectionId: 'cfg1123',
  name: 'point',
  uciData: {
    id: 'certificate'
  },
  dataKey: 'id',
  getEndpoint: () => 'test',
  registerInput: () => {},
  dependForm: {}
}

describe('VuciFormItemSwitch.vue', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('component contains initializeItem method', () => {
    const method = 'initializeItem'
    wrapper = createWrapper(VuciFormItemSwitch)
    const methods = Object.keys(wrapper.vm)
    expect(methods.includes(method)).toBeTruthy()
    expect(typeof wrapper.vm[method]).toBe('function')
  })

  it.each`
    radio    | checkbox | result
    ${false} | ${false} | ${'tlt-switch'}
    ${true}  | ${false} | ${'tlt-check-box'}
    ${false} | ${true}  | ${'tlt-check-box'}
    ${true}  | ${true}  | ${'tlt-check-box'}
  `('computes component name when radio is $radio and checkbox is $checkbox', ({ radio, checkbox, result }) => {
    wrapper = createWrapper(VuciFormItemSwitch, {
      props: {
        radio,
        checkbox
      }
    })
    expect(wrapper.vm.isComponent).toBe(result)
  })

  it.each`
    radio    | checkbox | result
    ${false} | ${false} | ${''}
    ${true}  | ${false} | ${'radio'}
    ${false} | ${true}  | ${'checkbox'}
    ${true}  | ${true}  | ${'radio'}
  `('computes component type when radio is $radio and checkbox is $checkbox', ({ radio, checkbox, result }) => {
    wrapper = createWrapper(VuciFormItemSwitch, {
      props: {
        radio,
        checkbox
      }
    })
    expect(wrapper.vm.isType).toBe(result)
  })

  it('computes switch props', () => {
    const result = { readonly: true, type: 'radio', showText: false, name: 'test' }
    wrapper = createWrapper(VuciFormItemSwitch, {
      props: {
        readonly: true,
        radio: true,
        checkbox: false,
        showText: false,
        name: 'test'
      }
    })
    expect(wrapper.vm.VuciFormItemSwitchProps).toEqual(result)
  })

  it.each`
    model    | trueValue | result
    ${false} | ${false}  | ${false}
    ${true}  | ${true}   | ${true}
    ${false} | ${true}   | ${false}
    ${true}  | ${false}  | ${false}
  `('computes input value when model is $model and true value is $trueValue', ({ model, trueValue, result }) => {
    wrapper = createWrapper(VuciFormItemSwitch, {
      props: {
        trueValue
      }
    })
    wrapper.vm.model = model
    expect(wrapper.vm.inputValue).toBe(result)
  })

  it.each`
    value    | result
    ${0}     | ${'0'}
    ${1}     | ${'1'}
    ${false} | ${'0'}
    ${true}  | ${'1'}
  `('computes input value when input is set to $value', ({ value, result }) => {
    wrapper = createWrapper(VuciFormItemSwitch)
    wrapper.vm.inputValue = value
    expect(wrapper.vm.model).toBe(result)
  })

  it.each`
    model          | tempValue      | result
    ${'testModel'} | ${'testModel'} | ${false}
    ${'testModel'} | ${''}          | ${true}
  `('computes availableModel when model is $model and tempValue is $tempValue', ({ model, tempValue, result }) => {
    wrapper = createWrapper(VuciFormItemSwitch, {
      computed: {
        ...VuciFormItemSwitch.computed,
        model() {
          return model
        }
      }
    })
    wrapper.setData({ tempValue })
    expect(wrapper.vm.availableModel).toBe(result)
  })

  it('method initializeItem. Returns when item is invisible', () => {
    wrapper = createWrapper(VuciFormItemSwitch, {
      computed: {
        ...VuciFormItemSwitch.computed,
        visible() {
          return false
        }
      }
    })
    const res = wrapper.vm.initializeItem()
    expect(res).toBeUndefined()
  })

  it.each`
    model        | initial
    ${''}        | ${'0'}
    ${null}      | ${'1'}
    ${undefined} | ${'1'}
  `('method initializeItem. Initializes item when model is $model and initial is $initial', ({ model, initial }) => {
    const name = 'testSwitch'
    const uciSection = {
      cfg1123: {}
    }
    wrapper = createWrapper(VuciFormItemSwitch, {
      global: {
        provide: {
          vuciSection: defaultVuciSection
        }
      },
      props: {
        initial,
        name,
        uciSection
      }
    })
    const spy = vi.spyOn(wrapper.vm.vuciSection, 'registerInput')
    wrapper.vm.model = model
    wrapper.vm.initializeItem()
    expect(wrapper.vm.model).toBe(initial)
    expect(spy).toHaveBeenCalledWith(uciSection[defaultVuciSection.sectionId], wrapper.vm)
    expect(wrapper.vm.uciSection.testSwitch).toBe(initial)
  })
})
