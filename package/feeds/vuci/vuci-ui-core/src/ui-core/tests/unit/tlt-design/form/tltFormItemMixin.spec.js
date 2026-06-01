import tltFormItemMixin from '@ui-core/tlt-design/form/tltFormItemMixin.vue'
import createWrapper from '../../mockFactory'

describe('tltFormItemMixin.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(tltFormItemMixin, {
      template: '<div ref="template"></div>',
      props: { prop: '' },
      computed: {
        readOnly() {
          return wrapper.vm.$store.readOnlyPage
        }
      },
      global: {
        mocks: {
          $store: {
            readOnlyPage: false
          }
        }
      }
    })
  })
  it('check if tltFormItemMixin.vue component exists', () => {
    expect(wrapper.findComponent(tltFormItemMixin).exists()).toBe(true)
  })
  it.each`
    propName        | propValue
    ${'depend'}     | ${false}
    ${'width'}      | ${''}
    ${'labelWidth'} | ${''}
    ${'readonly'}   | ${false}
    ${'maxlength'}  | ${'1000'}
    ${'rawhtml'}    | ${false}
  `('check if $propName prop is passed', ({ propName, propValue }) => {
    wrapper = createWrapper(tltFormItemMixin, {
      render() {},
      props: { [propName]: propValue, prop: '' }
    })
    expect(wrapper.props()[propName]).toBe(propValue)
  })
  it('emits change event on _valueWatcher', async () => {
    wrapper.vm.$emit('change')
    wrapper.vm._valueWatcher()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('change')).toBeDefined()
  })
  it('emits input event on method onInput', () => {
    wrapper.vm.onInput()
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })
  it.each`
    store    | result
    ${true}  | ${true}
    ${false} | ${false}
  `('when store state readOnlyPage is $store computed readOnly returns $result', async ({ store, result }) => {
    wrapper.vm.$store.readOnlyPage = store
    expect(wrapper.vm.readOnly).toBe(result)
  })
})
