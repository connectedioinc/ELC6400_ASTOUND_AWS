import TltFormItemTextArea from '@ui-core/tlt-design/form/TltFormItemTextArea.vue'
import TltFormModelItem from '@ui-core/tlt-design/form/TltFormModelItem.vue'
import tltFormItemTemplate from '@ui-core/tlt-design/form/tltFormItemTemplate.vue'
import tltTextArea from '@ui-core/tlt-design/form/core/tltTextArea.vue'
import TltHint from '@ui-core/tlt-design/widgets/TltHint.vue'
import createWrapper from '../../mockFactory'

const tltTextAreaStub = {
  template: '<textarea @input="(e) => $emit(`update:modelValue`, e.target.value)"></textarea>',
  props: tltTextArea.props,
  emits: tltTextArea.emits
}

describe('TltFormItemTextArea.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(TltFormItemTextArea, {
      props: { prop: '' },
      global: {
        stubs: {
          tltFormItemTemplate,
          TltFormModelItem,
          tltTextArea: tltTextAreaStub,
          TltHint
        }
      }
    })
  })

  it('check if TltFormItemTextArea.vue component exists', () => {
    expect(wrapper.findComponent(TltFormItemTextArea).exists()).toBe(true)
  })
  it.each`
    propName         | propValue
    ${'label'}       | ${'test'}
    ${'help'}        | ${'Test'}
    ${'modelValue'}  | ${''}
    ${'disabled'}    | ${false}
    ${'rows'}        | ${'6'}
    ${'placeholder'} | ${''}
    ${'resize'}      | ${true}
    ${'copyButton'}  | ${true}
  `('check if $propName prop is passed', ({ propName, propValue }) => {
    wrapper = createWrapper(TltFormItemTextArea, {
      props: { [propName]: propValue, prop: '' },
      global: {
        stubs: {
          tltFormItemTemplate,
          TltFormModelItem,
          tltTextArea: tltTextAreaStub,
          TltHint
        }
      }
    })
    expect(wrapper.props()[propName]).toBe(propValue)
  })
  it('inputValue is empty string by default', () => {
    expect(wrapper.vm.inputValue).toBe('')
  })
  it('updates inputValue when textarea value is changed', async () => {
    const newValue = 'dsfsfsfdsfdsfsf'
    const textarea = wrapper.find('textarea')
    await textarea.setValue(newValue)
    expect(wrapper.vm.inputValue).toBe(newValue)
  })
})
