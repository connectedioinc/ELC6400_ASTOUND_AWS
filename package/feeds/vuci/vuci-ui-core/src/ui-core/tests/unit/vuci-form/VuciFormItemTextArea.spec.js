import VuciFormItemTextArea from '@ui-core/vuci-form/src/VuciFormItemTextArea'
import createWrapper from '../mockFactory'

describe('VuciFormItemTextArea.vue', () => {
  it('checks if component exists', () => {
    const wrapper = createWrapper(VuciFormItemTextArea)
    expect(wrapper.exists()).toBeTruthy()
  })
})
