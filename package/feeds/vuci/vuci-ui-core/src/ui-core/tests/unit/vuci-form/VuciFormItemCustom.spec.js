import VuciFormItemCustom from '@ui-core/vuci-form/src/VuciFormItemCustom.vue'
import createWrapper from '../mockFactory'
import { disableAutoUnmount } from '@vue/test-utils'

describe('VuciFormItemCustom.vue', () => {
  const tltFormItemStub = {
    template: '<div/>',
    methods: {
      validate() {
        return Promise.resolve({ valid: true })
      },
      template() {
        return { validate: () => true }
      }
    }
  }
  const wrapper = createWrapper(VuciFormItemCustom, {
    global: {
      stubs: {
        'tlt-form-model': tltFormItemStub
      }
    },
    props: {
      allowCreate: false,
      inputProps: [
        {
          prop: 'input',
          rules: 'integer',
          initial: 'input_value'
        },
        {
          prop: 'select',
          options: [
            ['seconds', 'Seconds'],
            ['minutes', 'Minutes'],
            ['hours', 'Hours']
          ],
          initial: 'minutes'
        }
      ],
      inputs: 'input,select'
    }
  })

  vi.spyOn(wrapper.vm, 'validate').mockResolvedValueOnce(true)

  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    disableAutoUnmount()
  })

  it('method _unitChange. Event is emmited.', async () => {
    const unit = '123,test'
    wrapper.vm._unitChange(unit)
    expect(wrapper.emitted().changedUnit).toBeTruthy()
    expect(wrapper.emitted().changedUnit).toEqual([[unit]])
  })

  it('method _addField. New fields are added.', () => {
    const values = [
      ['input_value', 'minutes'],
      ['input_value', 'minutes']
    ]
    wrapper.vm._addField()
    expect(wrapper.vm.modelValues).toEqual(values)
  })

  it('method _removeField. Fields are removed.', async () => {
    await wrapper.setData({
      modelValues: [
        ['', ''],
        ['', '']
      ]
    })
    wrapper.vm._removeField()
    expect(wrapper.vm.modelValues).toEqual([['', '']])
  })

  it('method validate. Validates fields.', async () => {
    const result = await wrapper.vm.validate()
    expect(result).toBe(true)
  })

  it.each`
    result                          | model | allowCreate
    ${['input_value', 'minutes']}   | ${''} | ${false}
    ${[['input_value', 'minutes']]} | ${[]} | ${true}
  `('method _loadValues. Loads initial values when model is empty, allow-create: $allowCreate, result: $result', async ({ allowCreate, result }) => {
    wrapper.vm.model = ''
    await wrapper.vm.$nextTick()
    await wrapper.setProps({ allowCreate })
    const loadedValues = wrapper.vm._loadValues()
    expect(loadedValues).toEqual(result)
  })

  it.each`
    result                          | model                         | allowCreate
    ${['input_value', 'minutes']}   | ${'input_value,minutes'}      | ${false}
    ${['input_value', 'minutes']}   | ${['input_value', 'minutes']} | ${false}
    ${[['input_value', 'minutes']]} | ${['input_value,minutes']}    | ${true}
  `('method _loadValues. Loads values when model: $model, allow-create: $allowCreate result: $result.', async ({ model, allowCreate, result }) => {
    await wrapper.setProps({ allowCreate })
    wrapper.vm.model = ''
    await wrapper.vm.$nextTick()
    const loadedValues = wrapper.vm._loadValues()
    expect(wrapper.props().loadParse(model)).toEqual(model)
    expect(loadedValues).toEqual(result)
  })
})
