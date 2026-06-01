import tltFormItemInput from '@ui-core/tlt-design/form/tltFormItemInput.vue'
import tltFormItemTemplate from '@ui-core/tlt-design/form/tltFormItemTemplate.vue'
import TltFormModelItem from '@ui-core/tlt-design/form/TltFormModelItem.vue'
import tltInput from '@ui-core/tlt-design/form/core/tltInput.vue'
import TltHint from '@ui-core/tlt-design/widgets/TltHint.vue'

import createWrapper from '../../mockFactory'

describe('tltFormItemInput.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(tltFormItemInput, {
      props: { prop: '' },
      global: { stubs: { tltFormItemTemplate, tltInput, TltFormModelItem, TltHint } }
    })
  })
  it('check if tltFormItemInput.vue component exists', () => {
    expect(wrapper.findComponent(tltFormItemInput).exists()).toBe(true)
  })
  it('inputValue is empty string by default', () => {
    expect(wrapper.vm.inputValue).toBe('')
  })
})
